/**
 * Cloudflare Workers 入口（MCP v2 · 2026-07-28 无状态协议）
 *
 * 公网边界职责：
 * - 只在 /mcp 暴露 MCP handler；/healthz 提供轻量健康检查
 * - 在 SDK handler 前校验 Host / Origin，限制请求体和调用频率
 * - 每个 MCP 请求创建独立服务实例，并关闭出生资料缓存
 */

import {
  createMcpHandler,
  hostHeaderValidationResponse,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import {
  createMingpanServer,
  SERVER_NAME,
  SERVER_VERSION,
} from "./server";

const MCP_PATH = "/mcp";
const HEALTH_PATH = "/healthz";
const MAX_BODY_BYTES = 256 * 1024;

const DEFAULT_ALLOWED_HOSTS = [
  "mingpan.bzwai.com",
  "localhost",
  "127.0.0.1",
  "[::1]",
];

const DEFAULT_ALLOWED_ORIGINS = [
  "bzwai.com",
  "www.bzwai.com",
  "mingpan.bzwai.com",
  "localhost",
  "127.0.0.1",
  "[::1]",
];

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  RATE_LIMITER?: RateLimitBinding;
  /** 逗号分隔的额外 Host / Origin hostname，不含协议与端口。 */
  ALLOWED_HOSTS?: string;
  ALLOWED_ORIGINS?: string;
}

const handler = createMcpHandler(
  () => createMingpanServer({ enableCalculationCache: false }),
  {
    onerror: (error) => {
      // 只记录错误类型，不记录可能包含用户输入的 message/stack。
      console.error(`[MCP] ${error.name || "Error"}`);
    },
  }
);

function parseAllowlist(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getAllowedHosts(request: Request, env: Env): string[] {
  const hosts = new Set([
    ...DEFAULT_ALLOWED_HOSTS,
    ...parseAllowlist(env.ALLOWED_HOSTS),
  ]);

  // workers.dev 与版本预览域名均由 Cloudflare 控制；只接受包含本 Worker
  // 名称的主机，供维护者诊断正式部署，不把任意 workers.dev 加入白名单。
  const requestHostname = new URL(request.url).hostname.toLowerCase();
  if (
    requestHostname.endsWith(".workers.dev") &&
    requestHostname.includes("mingpan-mcp")
  ) {
    hosts.add(requestHostname);
  }

  return [...hosts];
}

function getAllowedOrigins(env: Env): string[] {
  return [
    ...new Set([
      ...DEFAULT_ALLOWED_ORIGINS,
      ...parseAllowlist(env.ALLOWED_ORIGINS),
    ]),
  ];
}

function withResponseHeaders(
  response: Response,
  request: Request,
  includeCors = true
): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");

  const origin = request.headers.get("origin");
  if (origin && includeCors) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set(
      "access-control-allow-headers",
      "Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name"
    );
    const vary = headers.get("vary");
    if (!vary?.split(",").some((value) => value.trim().toLowerCase() === "origin")) {
      headers.set("vary", vary ? `${vary}, Origin` : "Origin");
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function isBodyTooLarge(request: Request): Promise<boolean> {
  if (request.method !== "POST" || request.body === null) {
    return false;
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return true;
  }

  // Content-Length 可能缺失或不可信。读取 clone 可在不消耗原请求体的前提下
  // 对分块请求执行真实上限，并在越界时尽早停止。
  const reader = request.clone().body?.getReader();
  if (!reader) {
    return false;
  }

  let bytesRead = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return false;
    }
    bytesRead += value.byteLength;
    if (bytesRead > MAX_BODY_BYTES) {
      await reader.cancel();
      return true;
    }
  }
}

async function isRateLimited(request: Request, env: Env): Promise<boolean> {
  const clientIp = request.headers.get("cf-connecting-ip");
  if (!env.RATE_LIMITER || !clientIp) {
    return false;
  }

  try {
    const result = await env.RATE_LIMITER.limit({ key: `mcp:${clientIp}` });
    return !result.success;
  } catch {
    // 防滥用设施异常时保持计算服务可用；不输出请求或用户标识。
    console.error("[MCP] RateLimitUnavailable");
    return false;
  }
}

export async function handleWorkerRequest(
  request: Request,
  env: Env = {}
): Promise<Response> {
  const hostRejected = hostHeaderValidationResponse(
    request,
    getAllowedHosts(request, env)
  );
  if (hostRejected) {
    return withResponseHeaders(hostRejected, request, false);
  }

  const originRejected = originValidationResponse(
    request,
    getAllowedOrigins(env)
  );
  if (originRejected) {
    return withResponseHeaders(originRejected, request, false);
  }

  const url = new URL(request.url);

  if (url.pathname === HEALTH_PATH) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return withResponseHeaders(
        jsonResponse({ error: "Method not allowed" }, 405),
        request
      );
    }
    const response = jsonResponse({
      status: "ok",
      service: SERVER_NAME,
      version: SERVER_VERSION,
      protocol: "2026-07-28",
    });
    return withResponseHeaders(
      request.method === "HEAD"
        ? new Response(null, { status: response.status, headers: response.headers })
        : response,
      request
    );
  }

  if (url.pathname === "/") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return withResponseHeaders(
        jsonResponse({ error: "Method not allowed" }, 405),
        request
      );
    }
    const response = jsonResponse({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      mcpEndpoint: `${url.origin}${MCP_PATH}`,
      healthEndpoint: `${url.origin}${HEALTH_PATH}`,
      website: "https://mingpan.bzwai.com",
      source: "https://github.com/ChesterRa/mingpan",
      privacy: "Inputs are processed in memory and are not stored or logged.",
    });
    return withResponseHeaders(
      request.method === "HEAD"
        ? new Response(null, { status: response.status, headers: response.headers })
        : response,
      request
    );
  }

  if (url.pathname !== MCP_PATH) {
    return withResponseHeaders(jsonResponse({ error: "Not found" }, 404), request);
  }

  if (request.method === "OPTIONS") {
    return withResponseHeaders(new Response(null, { status: 204 }), request);
  }

  if (request.method === "POST") {
    if (await isRateLimited(request, env)) {
      const response = jsonResponse({ error: "Rate limit exceeded" }, 429);
      response.headers.set("retry-after", "60");
      return withResponseHeaders(response, request);
    }

    if (await isBodyTooLarge(request)) {
      return withResponseHeaders(
        jsonResponse({ error: "Request body too large" }, 413),
        request
      );
    }
  }

  return withResponseHeaders(await handler.fetch(request), request);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleWorkerRequest(request, env);
  },
};
