# Will They Won't They — CFP Evaluator

A multi-agent conference abstract evaluator powered by [Anthropic Claude](https://www.anthropic.com/). Paste your session title, abstract, and the conference/CFP URLs, then watch four specialist AI agents score and critique your submission — followed by a master synthesis with a rewritten abstract.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Local Development](#local-development)
5. [Docker Deployment](#docker-deployment)
6. [Usage Guide](#usage-guide)
7. [Configuration](#configuration)
8. [Project Structure](#project-structure)

---

## What It Does

You submit a talk title, abstract, an event URL, and a CFP URL. Four Claude-powered agents evaluate your submission from different angles, sequentially. A final synthesiser merges their findings into one actionable report.

| Agent | Role |
|---|---|
| 🔍 **CFP Analyser** | Extracts themes, formats, requirements, and hidden signals from the Call for Papers |
| 📚 **Conference Researcher** | Studies the conference's history, past accepted sessions, and community DNA |
| 🎯 **Programme Committee Member** | Scores the abstract as a reviewer would — relevance, originality, clarity, credibility |
| 🙋 **Audience Member** | Rates the abstract from an attendee's perspective — interest, value, FOMO |
| ✨ **Synthesiser** | Combines all four analyses into scores, a reworked abstract, and ranked action items |

Results can be exported as a Markdown file.

---

## Architecture

```
                        ┌─────────────────────────────────────┐
                        │           User's Browser             │
                        │       React SPA (Vite build)         │
                        └──────────────┬──────────────────────┘
                                       │ HTTP :8081
                        ┌──────────────▼──────────────────────┐
                        │         Nginx  (port 80)             │
                        │  - Serves static assets              │
                        │  - SPA fallback (index.html)         │
                        │  - Proxies /api/* → proxy:3001       │
                        └──────────────┬──────────────────────┘
                                       │ HTTP /api/messages
                        ┌──────────────▼──────────────────────┐
                        │    Node.js Proxy  (port 3001)        │
                        │  - Injects x-api-key from request    │
                        │  - Forwards to Anthropic API         │
                        │  - Handles CORS                      │
                        └──────────────┬──────────────────────┘
                                       │ HTTPS
                        ┌──────────────▼──────────────────────┐
                        │         Anthropic API                │
                        │    api.anthropic.com/v1/messages     │
                        └─────────────────────────────────────┘
```

### Why a proxy?

Browsers cannot call the Anthropic API directly because it does not set CORS headers. The Node.js proxy acts as a pass-through: it receives the user's API key from the request header, attaches it as `x-api-key`, and forwards the call to Anthropic. The key is never stored server-side — it lives only in the user's browser `localStorage`.

### Docker Compose services

```
docker-compose.yml
│
├── will-they-wont-they-cfp-app      (Nginx, :8081→:80)
│     Serves the compiled React SPA
│     Proxies /api/* to the proxy service
│
└── will-they-wont-they-cfp-proxy    (Node.js, :3001)
      Forwards requests to api.anthropic.com
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20+ |
| npm | 9+ |
| Docker + Docker Compose | any recent version |
| Anthropic API key | [Get one here](https://console.anthropic.com/) |

---

## Local Development

Run the proxy and the Vite dev server separately.

**1. Install dependencies**

```bash
npm install
```

**2. Start the proxy**

```bash
node server.js
# Proxy listening on :3001
```

**3. Start the Vite dev server** (in a second terminal)

```bash
npm run dev
# App available at http://localhost:5173
```

> Vite's dev server expects `/api/messages` to be reachable at port `3001`. The proxy handles CORS so the browser call succeeds out of the box.

**4. Open the app and enter your Anthropic API key** in the ⚙️ Settings panel.

---

## Docker Deployment

The recommended way to run the app anywhere is Docker Compose. Everything is self-contained in two images.

**1. Build and start**

```bash
docker compose up --build
```

**2. Open the app**

```
http://localhost:8081
```

**3. Stop**

```bash
docker compose down
```

### What happens during the build

```
Docker build (app)
  └─ Stage 1 — node:20-alpine
       npm install + vite build  →  /app/dist
  └─ Stage 2 — nginx:alpine
       Copy /app/dist → /usr/share/nginx/html
       Copy nginx.conf

Docker build (proxy)
  └─ node:20-alpine
       node server.js  (plain Node, no extra deps)
```

Both services use `restart: unless-stopped`, so they come back up automatically after a reboot.

---

## Usage Guide

1. **Open the app** at `http://localhost:8081` (Docker) or `http://localhost:5173` (dev).

2. **Set your API key** — click the ⚙️ gear icon (top-right) and paste your Anthropic API key. This is saved to `localStorage` and sent with every request. It is never logged or stored by the proxy.

3. **Choose a model** in the Settings panel:
   - **Claude Haiku 4.5** — fastest, cheapest, good for quick checks
   - **Claude Sonnet 4.6** — balanced speed and quality (recommended)
   - **Claude Opus 4.6** — most powerful, best for important submissions

4. **Fill in the form:**
   - **Session Title** — your proposed talk title
   - **Abstract** — the full abstract text
   - **Event URL** — the conference homepage
   - **CFP URL** — the specific Call for Papers page

5. **Click Evaluate** — agents run one after another with a configurable delay between calls (default: 15 s) to stay within Anthropic rate limits. A live countdown is shown between agents.

6. **Review the results** — each agent's panel expands with its analysis. The final Synthesis panel includes:
   - Acceptance likelihood % and audience appeal %
   - Composite strengths and weaknesses
   - Two alternative title rewrites
   - A complete rewritten abstract
   - Top 5 ranked action items

7. **Export** — click **Export as Markdown** to download the full evaluation report.

> **CFP access fallback:** If Claude cannot retrieve the CFP page (paywalled, login-required, etc.), the app prompts you to paste the raw CFP text manually before continuing.

---

## Configuration

All settings are stored in `localStorage` under the key `slayer-config`.

| Setting | Default | Description |
|---|---|---|
| `apiKey` | `""` | Your Anthropic API key |
| `model` | `claude-sonnet-4-6` | Claude model to use |
| `agentDelay` | `15` seconds | Pause between sequential agent calls |

The minimum allowed delay is **10 seconds** to avoid hitting Anthropic rate limits.

---

## Project Structure

```
.
├── src/
│   ├── App.jsx          # Main UI — form, agent orchestration, results
│   ├── App.css          # Styles
│   ├── agents.js        # Agent definitions & synthesiser prompt
│   └── main.jsx         # React entry point
│
├── proxy/
│   ├── server.js        # Node.js Anthropic proxy (used in Docker)
│   ├── package.json
│   └── Dockerfile
│
├── server.js            # Same proxy — used during local development
├── vite.config.js       # Vite + React plugin config
├── nginx.conf           # Nginx config for the production container
├── Dockerfile           # Multi-stage build: Vite → Nginx
├── docker-compose.yml   # Orchestrates app + proxy services
└── index.html           # HTML entry point
```

---

## License

See [LICENSE](LICENSE).
