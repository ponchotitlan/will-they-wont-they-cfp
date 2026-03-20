// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import http from "http";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const PORT = 3001;

// ─── Provider factory ─────────────────────────────────────────────────────────

function getModel(provider, apiKey, modelId) {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    default: // anthropic
      return createAnthropic({ apiKey })(modelId);
  }
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-user-api-key",
    });
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/chat") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Not found" } }));
    return;
  }

  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", async () => {
    const apiKey = req.headers["x-user-api-key"];
    if (!apiKey) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "No API key provided. Set one in the Settings panel." } }));
      return;
    }

    let provider, model, system, messages, max_tokens;
    try {
      ({ provider, model, system, messages, max_tokens } = JSON.parse(raw));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Invalid JSON body." } }));
      return;
    }

    try {
      const { text } = await generateText({
        model: getModel(provider, apiKey, model),
        system,
        messages,
        maxTokens: max_tokens || 1000,
      });
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ text }));
    } catch (err) {
      const status = err.status || 502;
      res.writeHead(status >= 400 && status < 600 ? status : 502, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: { message: err.message || String(err) } }));
    }
  });
});

server.listen(PORT, () => console.log(`Multi-LLM proxy listening on :${PORT}`));
