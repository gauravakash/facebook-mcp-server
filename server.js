#!/usr/bin/env node
/**
 * Facebook MCP Server — Streamable HTTP
 * Works with claude.ai via POST /mcp endpoint
 */
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const PORT    = process.env.PORT || 3000;
const TOKEN   = process.env.FB_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID;
const SECRET  = process.env.MCP_SECRET;

if (!TOKEN || !PAGE_ID) {
  console.error("[facebook-mcp] ERROR: FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID must be set.");
  process.exit(1);
}

const FB_BASE = "https://graph.facebook.com/v19.0";

async function fbGet(path, params = {}) {
  const url = new URL(`${FB_BASE}${path}`);
  url.searchParams.set("access_token", TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  return res.json();
}

async function fbPost(path, body = {}) {
  const res = await fetch(`${FB_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  });
  return res.json();
}

async function fbDelete(path) {
  const res = await fetch(`${FB_BASE}${path}?access_token=${TOKEN}`, { method: "DELETE" });
  return res.json();
}

function buildMcpServer() {
  const mcp = new McpServer({ name: "facebook-mcp", version: "1.0.0" });

  mcp.tool("post_to_page", "Publish a text post to the Facebook Page immediately", {
    message: z.string().describe("The text content of the post"),
    link: z.string().url().optional().describe("Optional URL to attach"),
  }, async ({ message, link }) => {
    const body = { message };
    if (link) body.link = link;
    const data = await fbPost(`/${PAGE_ID}/feed`, body);
    if (data.id) return ok(`Posted! Post ID: ${data.id}`);
    return err(data);
  });

  mcp.tool("schedule_post", "Schedule a Facebook post for a specific future date/time", {
    message: z.string().describe("The text content of the post"),
    scheduled_time: z.string().describe("ISO 8601 datetime, e.g. 2026-03-20T09:00:00+05:30"),
    link: z.string().url().optional().describe("Optional URL to attach"),
  }, async ({ message, scheduled_time, link }) => {
    const unix = Math.floor(new Date(scheduled_time).getTime() / 1000);
    const body = { message, published: false, scheduled_publish_time: unix };
    if (link) body.link = link;
    const data = await fbPost(`/${PAGE_ID}/feed`, body);
    if (data.id) return ok(`Scheduled! Post ID: ${data.id} for ${scheduled_time}`);
    return err(data);
  });

  mcp.tool("get_recent_posts", "Retrieve the most recent posts from the Facebook Page with engagement stats", {
    limit: z.number().int().min(1).max(25).default(5).describe("Number of posts to fetch")
  }, async ({ limit }) => {
    const data = await fbGet(`/${PAGE_ID}/feed`, {
      fields: "id,message,created_time,likes.summary(true),comments.summary(true),shares",
      limit,
    });
    if (data.error) return err(data);
    const posts = (data.data || []).map((p) => ({
      id: p.id,
      message: (p.message || "").slice(0, 120),
      created: p.created_time,
      likes: p.likes?.summary?.total_count ?? 0,
      comments: p.comments?.summary?.total_count ?? 0,
      shares: p.shares?.count ?? 0,
    }));
    return ok(JSON.stringify(posts, null, 2));
  });

  mcp.tool("get_page_insights", "Fetch reach and engagement analytics for the Facebook Page", {
    metric: z.enum(["page_impressions", "page_engaged_users", "page_post_engagements", "page_fans"]).default("page_engaged_users"),
    period: z.enum(["day", "week", "days_28"]).default("week"),
  }, async ({ metric, period }) => {
    const data = await fbGet(`/${PAGE_ID}/insights`, { metric, period, fields: "name,values" });
    if (data.error) return err(data);
    return ok(JSON.stringify(data.data, null, 2));
  });

  mcp.tool("delete_post", "Delete a post from the Facebook Page", {
    post_id: z.string().describe("Post ID to delete (format: pageId_postId)")
  }, async ({ post_id }) => {
    const data = await fbDelete(`/${post_id}`);
    if (data.success) return ok(`Deleted post ${post_id}`);
    return err(data);
  });

  mcp.tool("get_page_info", "Get name, fan count, category and other info about the Facebook Page", {},
    async () => {
      const data = await fbGet(`/${PAGE_ID}`, {
        fields: "name,fan_count,category,about,website,followers_count",
      });
      if (data.error) return err(data);
      return ok(JSON.stringify(data, null, 2));
    }
  );

  mcp.tool("post_photo", "Post a photo to the Facebook Page using a public image URL and caption", {
    image_url: z.string().url().describe("Publicly accessible URL of the image"),
    caption: z.string().describe("Caption text for the photo"),
  }, async ({ image_url, caption }) => {
    const data = await fbPost(`/${PAGE_ID}/photos`, { url: image_url, caption });
    if (data.id) return ok(`Photo posted! ID: ${data.id}`);
    return err(data);
  });

  return mcp;
}

const ok  = (text) => ({ content: [{ type: "text", text }] });
const err = (data) => ({ content: [{ type: "text", text: `Error: ${data?.error?.message || JSON.stringify(data)}` }] });

const app = express();
app.use(express.json());

function authMiddleware(req, res, next) {
  if (!SECRET) return next();
  const auth = req.headers.authorization || "";
  if (auth === `Bearer ${SECRET}`) return next();
  res.status(401).json({ error: "Unauthorized" });
}

app.get("/", (req, res) => {
  res.json({
    name: "facebook-mcp-server",
    version: "1.0.1",
    status: "ok",
    transport: "streamable-http",
    tools: 7,
    page_id: PAGE_ID,
  });
});

// Streamable HTTP endpoint for Claude.ai
app.post("/mcp", authMiddleware, async (req, res) => {
  console.log(`[MCP] Request from ${req.ip}`);
  const mcp = buildMcpServer();
  
  try {
    // Parse JSON-RPC request
    const request = req.body;
    if (!request || !request.method) {
      return res.status(400).json({ error: "Invalid JSON-RPC request" });
    }

    // Handle initialize
    if (request.method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "facebook-mcp",
            version: "1.0.1",
          },
        },
      });
    }

    // Handle tools/list
    if (request.method === "tools/list") {
      const tools = mcp._handlers.get("tools/list");
      if (tools) {
        const result = await tools({});
        return res.json({
          jsonrpc: "2.0",
          id: request.id,
          result,
        });
      }
    }

    // Handle tools/call
    if (request.method === "tools/call") {
      const handler = mcp._toolHandlers.get(request.params.name);
      if (handler) {
        const result = await handler(request.params.arguments || {});
        return res.json({
          jsonrpc: "2.0",
          id: request.id,
          result,
        });
      }
      return res.status(404).json({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32601, message: `Tool not found: ${request.params.name}` },
      });
    }

    // Handle notifications
    if (!request.id) {
      return res.status(204).send(); // Acknowledge notification
    }

    res.status(404).json({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: `Method not found: ${request.method}` },
    });
  } catch (error) {
    console.error("[MCP] Error:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body?.id,
      error: { code: -32603, message: error.message },
    });
  }
});

app.listen(PORT, () => {
  console.log(`[facebook-mcp] Streamable HTTP server on port ${PORT}`);
  console.log(`[facebook-mcp] Endpoint: POST /mcp`);
  if (SECRET) console.log("[facebook-mcp] Auth: Bearer token ENABLED");
  else console.log("[facebook-mcp] Auth: No secret set — endpoint is public");
});
