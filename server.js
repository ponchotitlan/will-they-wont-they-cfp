import http from "http";
import https from "https";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const PORT = 3001;

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, anthropic-version, anthropic-beta, x-user-api-key",
    });
    res.end();
    return;
  }

  // Only accept POST /api/messages
  if (req.method !== "POST" || req.url !== "/api/messages") {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    // Require key supplied by the user in the request
    const apiKey = req.headers["x-user-api-key"];
    if (!apiKey) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "No API key provided. Set one in the Settings panel." } }));
      return;
    }

    const upstreamReq = https.request(
      ANTHROPIC_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": req.headers["anthropic-version"] || "2023-06-01",
          ...(req.headers["anthropic-beta"] && {
            "anthropic-beta": req.headers["anthropic-beta"],
          }),
        },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        upstreamRes.pipe(res);
      }
    );

    upstreamReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    });

    upstreamReq.write(body);
    upstreamReq.end();
  });
});

server.listen(PORT, () => console.log(`Anthropic proxy listening on :${PORT}`));
