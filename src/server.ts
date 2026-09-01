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
export const SERVER_VERSION = "0.1.6";

export function createMingpanServer(): McpServer {
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

  registerBaziTools(server);
  registerZiweiTools(server);
  registerDivinationTools(server);
  registerQimenTools(server);
  registerCalendarTools(server);

  return server;
}
