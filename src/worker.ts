/**
 * Cloudflare Workers 入口（远程 MCP，Streamable HTTP 无状态模式）
 *
 * 部署：`npx wrangler deploy`（wrangler 配置见 wrangler.toml）。
 * 客户端：Claude 网页版/桌面版「自定义连接器」直接填部署后的
 * `https://<worker域名>/mcp` 即可，无需任何本地安装。
 *
 * 说明：
 * - 无状态模式（sessionIdGenerator: undefined）：每个请求独立处理，
 *   正适合本项目无会话的纯计算特性，且无需 Durable Objects。
 * - 引擎与 stdio 形态共用 createMingpanServer()，输出逐字节一致。
 * - 代码已去本地时区化（Date.UTC 载体约定），Workers 恒 UTC 运行时下
 *   排盘结果与本地形态一致（三时区 CI 矩阵看守）。
 */

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMingpanServer } from "./server";

export interface Env {
  // 预留（如未来需要配置项）
}

/** 可测试的请求处理函数（Node 测试与 Workers 共用） */
export async function handleMcpRequest(request: Request, _env?: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname !== "/mcp") {
    return new Response("Not Found", { status: 404 });
  }

  if (request.method === "GET" || request.method === "DELETE") {
    // 无状态模式不支持 SSE 长连接与会话删除
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }

  // 无状态：每请求一组 server+transport
  const server = createMingpanServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  // Web 标准 transport：Request → Response，Workers/Node 通用
  return transport.handleRequest(request);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleMcpRequest(request, env);
  },
};
