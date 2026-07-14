import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, sep, extname } from "node:path";
import { loadAiConfig, getPublicAiConfig } from "./config/aiConfig.js";
import { analyzeListing } from "./services/listingAiService.js";
import { generateNegotiationAiReply } from "./services/negotiationAiService.js";
import { generateComparisonAiDecision } from "./services/comparisonAiService.js";
import { assertRateLimit } from "./middleware/rateLimit.js";
import { ApiError, toErrorResponse } from "./utils/httpErrors.js";
import { validateAiRequest } from "./utils/validateAiRequest.js";

const config = loadAiConfig();

function sendJson(response, status, body) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Request-Id",
  };
  if (config.corsOrigin) {
    headers["Access-Control-Allow-Origin"] = config.corsOrigin;
  }
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

function readJsonBody(request) {
  const contentType = request.headers["content-type"]?.toString().toLowerCase() || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "AI 接口只接受 application/json 请求。");
  }

  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > config.maxRequestBodyMb * 1024 * 1024) {
        reject(new ApiError(413, "payload_too_large", "请求内容过大，请减少输入后重试。"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new ApiError(400, "invalid_json", "请求 JSON 格式不正确。"));
      }
    });
    request.on("error", reject);
  });
}

function getClientIp(request) {
  if (config.trustProxy) {
    return request.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || request.socket.remoteAddress || "unknown";
  }
  return request.socket.remoteAddress || "unknown";
}

const DIST_DIR = resolve(process.cwd(), "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getContentType(ext) {
  return MIME_TYPES[ext] || "application/octet-stream";
}

function sendStatic(response, status, filePath, cacheControl) {
  const data = readFileSync(filePath);
  response.writeHead(status, {
    "Content-Type": getContentType(extname(filePath)),
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  response.end(data);
}

function serveStatic(response, pathname) {
  if (!existsSync(DIST_DIR)) {
    return false;
  }

  const cleanPath = pathname.replace(/^\/+$/, "/index.html");
  const filePath = resolve(DIST_DIR, `.${cleanPath}`);

  if (filePath !== DIST_DIR && !filePath.startsWith(`${DIST_DIR}${sep}`)) {
    return false;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath);
    const cacheControl = ext === ".html" ? "no-store" : "public, max-age=3600";
    sendStatic(response, 200, filePath, cacheControl);
    return true;
  }

  const fallback = resolve(DIST_DIR, "index.html");
  if (existsSync(fallback) && statSync(fallback).isFile()) {
    sendStatic(response, 200, fallback, "no-store");
    return true;
  }

  return false;
}

async function handleRequest(request, response) {
  const requestId = request.headers["x-request-id"]?.toString() || randomUUID();
  response.setHeader("X-Request-Id", requestId);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

    if (request.method === "GET" && url.pathname === "/api/ai/health") {
      sendJson(response, 200, {
        ok: true,
        requestId,
        service: "renting-radar-ai",
        ...getPublicAiConfig(config),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ai/listing-analysis") {
      assertRateLimit(getClientIp(request), config);
      const body = await readJsonBody(request);
      validateAiRequest(url.pathname, body, config);
      const result = await analyzeListing({ body, config, requestId });
      sendJson(response, 200, { ok: true, result });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ai/negotiation-reply") {
      assertRateLimit(getClientIp(request), config);
      const body = await readJsonBody(request);
      validateAiRequest(url.pathname, body, config);
      const result = await generateNegotiationAiReply({ body, config, requestId });
      sendJson(response, 200, { ok: true, result });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ai/comparison-explanation") {
      assertRateLimit(getClientIp(request), config);
      const body = await readJsonBody(request);
      validateAiRequest(url.pathname, body, config);
      const result = await generateComparisonAiDecision({ body, config, requestId });
      sendJson(response, 200, { ok: true, result });
      return;
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/ai/")) {
      throw new ApiError(501, "not_implemented", "该 AI 功能的服务端基础设施已预留，当前只开放房源文字风险分析。");
    }

    // 静态文件托管（生产模式统一托管前端 dist 产物）
    if (request.method === "GET" && !url.pathname.startsWith("/api/")) {
      const served = serveStatic(response, url.pathname);
      if (served) return;
    }

    throw new ApiError(404, "not_found", "接口不存在。");
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    sendJson(response, mapped.status, mapped.body);
  }
}

const server = createServer((request, response) => {
  handleRequest(request, response);
});

server.listen(config.port, config.host, () => {
  console.log(`Renting Radar AI server listening on http://${config.host}:${config.port}`);
});
