# Facebook MCP Server

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.10.0-blueviolet)](https://github.com/modelcontextprotocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Deploy on Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?logo=railway)](https://railway.app)
[![Deploy to Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)](https://render.com)

A production-ready **Model Context Protocol (MCP) server** for the Facebook Graph API — deployable to Railway, Render, or Fly.io, and connectable to **Claude.ai** in seconds via Server-Sent Events (SSE).

Once connected, Claude can publish posts, schedule content, fetch page analytics, post photos, and manage your Facebook Page — all through natural language.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Available MCP Tools](#available-mcp-tools)
- [Deployment](#deployment)
  - [Railway](#deploy-to-railway)
  - [Render](#deploy-to-render)
- [Connecting to Claude.ai](#connecting-to-claudeai)
- [Security](#security)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Post to Page** — Publish text posts (with optional link) immediately
- **Schedule Posts** — Schedule posts for any future date/time using ISO 8601
- **Get Recent Posts** — Retrieve recent posts with likes, comments, and shares
- **Page Insights** — Fetch reach and engagement analytics by period
- **Post Photos** — Upload photos via public URL with a caption
- **Delete Posts** — Remove any post by ID
- **Get Page Info** — Retrieve fan count, category, website, and more
- **SSE Transport** — Works natively with Claude.ai's remote MCP connector
- **Bearer Token Auth** — Optional `MCP_SECRET` to lock down your endpoint
- **One-click deploy** — Ready for Railway and Render with config files included

---

## Architecture

```
Claude.ai (web)
    │
    │  SSE (GET /sse)
    ▼
facebook-mcp-server  (Node.js / Express)
    │
    │  POST /message  (tool calls)
    ▼
Facebook Graph API v19.0
    │
    ▼
Your Facebook Page
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js ≥ 18 | Uses native `fetch` and ES Modules |
| Facebook Developer App | [Create one](https://developers.facebook.com/apps/) |
| Facebook Page Access Token | Long-lived token with `pages_manage_posts`, `pages_read_engagement`, `pages_read_user_content`, `read_insights` permissions |
| Facebook Page ID | Found in your Page's About section |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/gauravakash/facebook-mcp-server.git
cd facebook-mcp-server

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in your FB_PAGE_ACCESS_TOKEN, FB_PAGE_ID, and optionally MCP_SECRET

# 4. Start the server
npm run dev    # development (loads .env automatically)
npm start      # production
```

The server starts on `http://localhost:3000` by default.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `FB_PAGE_ACCESS_TOKEN` | Yes | Facebook Page Access Token from Graph API Explorer |
| `FB_PAGE_ID` | Yes | Numeric ID of your Facebook Page |
| `MCP_SECRET` | No | Bearer token to protect your `/sse` and `/message` endpoints |
| `PORT` | No | HTTP port (default: `3000`; auto-set by Railway/Render) |
| `NODE_ENV` | No | Set to `production` in hosted environments |

> **Tip:** Generate a long-lived Page Access Token via the [Graph API Explorer](https://developers.facebook.com/tools/explorer/).

---

## Available MCP Tools

| Tool | Description | Key Parameters |
|---|---|---|
| `post_to_page` | Publish a text post immediately | `message`, `link?` |
| `schedule_post` | Schedule a post for a future time | `message`, `scheduled_time` (ISO 8601), `link?` |
| `get_recent_posts` | Retrieve recent posts with engagement stats | `limit` (1–25, default 5) |
| `get_page_insights` | Fetch page-level analytics | `metric`, `period` |
| `post_photo` | Post a photo using a public image URL | `image_url`, `caption` |
| `delete_post` | Delete a post by ID | `post_id` |
| `get_page_info` | Get page name, fans, category, website | — |

### Insights Metrics

| Metric | Description |
|---|---|
| `page_impressions` | Total number of times any content from your page was seen |
| `page_engaged_users` | Number of people who interacted with your page |
| `page_post_engagements` | Number of times people engaged with your posts |
| `page_fans` | Total number of people who have liked your page |

Periods: `day`, `week`, `days_28`

---

## Deployment

### Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Push this repo to GitHub (already done!)
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select `gauravakash/facebook-mcp-server`
4. Add environment variables in the Railway dashboard:
   - `FB_PAGE_ACCESS_TOKEN`
   - `FB_PAGE_ID`
   - `MCP_SECRET` (recommended)
5. Railway auto-detects `railway.toml` and deploys

### Deploy to Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Render auto-detects `render.yaml` configuration
4. Add your environment variables in the Render dashboard
5. Deploy

---

## Connecting to Claude.ai

1. Deploy the server and get your public URL (e.g., `https://your-app.railway.app`)
2. Open **Claude.ai** → **Settings** → **Connectors** → **Add MCP Server**
3. Enter your SSE URL:
   ```
   https://your-app.railway.app/sse
   ```
4. If you set `MCP_SECRET`, add the header:
   ```
   Authorization: Bearer <your-secret>
   ```
5. Save — Claude will now have access to all 7 Facebook tools

---

## Security

- **Always set `MCP_SECRET`** in production to prevent unauthorized access to your Facebook Page
- Never commit your `.env` file (it is already in `.gitignore`)
- Use a long-lived but regularly rotated Page Access Token
- The token is only sent server-side to the Facebook Graph API; it is never exposed to clients

---

## Development

```bash
# Install dependencies
npm install

# Start with auto-reload and .env loading
npm run dev

# Test the health endpoint
curl http://localhost:3000/

# Test the SSE endpoint (with optional secret)
curl -H "Authorization: Bearer your-secret" http://localhost:3000/sse
```

### Project Structure

```
facebook-mcp-server/
├── server.js          # Main server — MCP tools, SSE transport, Express app
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variable template
├── .gitignore         # Git ignore rules
├── railway.toml       # Railway deployment configuration
└── render.yaml        # Render deployment configuration
```

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

This project is licensed under the [MIT License](./LICENSE).
