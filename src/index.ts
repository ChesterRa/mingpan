#!/usr/bin/env node
/**
 * Mingpan MCP Server
 *
 * 中華傳統術數 MCP 服務：八字、紫微斗數、六爻、梅花易數、大六壬、奇門遁甲。
 * 為 AI 應用提供確定性排盤與占卜起卦的計算能力。
 *
 * 架構：
 * - src/tools/       MCP 工具註冊（按領域拆分，共享 schema 見 tools/schemas.ts）
 * - src/services/    業務計算服務
 * - src/core/        純計算核心（曆法、規則）
 * - src/output/      文本渲染
 *
 * 時間口徑：內部規範表示為北京時間（UTC+8）；
 * 入口層統一完成農曆轉換與時區換算（見 utils/timeNormalization.ts）。
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { BEIJING_TZ } from "./utils/timeNormalization";
import { Logger } from "./shared/logger";
import { createMingpanServer, SERVER_VERSION } from "./server";

const logger = new Logger("mingpan");

// Force deterministic timezone behavior (Beijing Time) across environments.
// This ensures Date-based code paths in services behave consistently
// regardless of the host machine's timezone setting.
process.env.TZ = BEIJING_TZ;

async function main() {
  const server = createMingpanServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`Mingpan MCP server started (v${SERVER_VERSION})`);
}

main().catch((error) => {
  logger.error("Server failed to start", error);
  process.exit(1);
});
