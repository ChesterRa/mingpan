/**
 * Cloudflare Workers 入口（MCP v2 · 2026-07-28 无状态协议）
 *
 * v2 SDK 的 createMcpHandler 是官方推荐的 HTTP 入口：
 * - 原生支持 2026-07-28 无状态协议（无需 initialize 握手 / session）
 * - 自动向后兼容 2025 Streamable HTTP 旧客户端（legacyStatelessFallback）
 * - 无需手动管理 transport——handler 即 Request → Response
 *
 * 部署：`npm run deploy:worker`
 */

import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMingpanServer } from "./server";

export interface Env {}

const handler = createMcpHandler(() => createMingpanServer());

export default {
  fetch(request: Request, _env: Env): Promise<Response> {
    return handler.fetch(request);
  },
};

/** 可测试的请求处理函数（Node 测试与 Workers 共用） */
export async function handleMcpRequest(request: Request, _env?: Env): Promise<Response> {
  return handler.fetch(request);
}
