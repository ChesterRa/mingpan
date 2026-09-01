/**
 * MCP 服務器工廠
 *
 * 構建並註冊全部術數工具（八字/紫微/六爻/梅花/大六壬/奇門）。
 * 入口（index.ts）連接 stdio 傳輸；測試可連接 InMemoryTransport。
 */

import { McpServer } from "@modelcontextprotocol/server";
import { registerBaziTools } from "./tools/baziTools";
import { registerZiweiTools } from "./tools/ziweiTools";
import { registerDivinationTools } from "./tools/divinationTools";
import { registerQimenTools } from "./tools/qimenTools";
import { registerCalendarTools } from "./tools/calendarTools";

export const SERVER_NAME = "mingpan";
export const SERVER_VERSION = "0.1.7";

export interface MingpanServerOptions {
  /**
   * stdio 可复用同一进程内的排盘缓存；远程 Worker 必须关闭，避免出生资料
   * 在 isolate 生命周期内跨请求保留。
   */
  enableCalculationCache?: boolean;
}

export function createMingpanServer(options: MingpanServerOptions = {}): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerBaziTools(server, {
    enableCaching: options.enableCalculationCache ?? true,
  });
  registerZiweiTools(server);
  registerDivinationTools(server);
  registerQimenTools(server);
  registerCalendarTools(server);

  return server;
}
