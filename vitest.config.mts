import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // 紫微十二宫覆盖测试会穷举 180 个命盘；CI 冷机需要显式长时限。
    testTimeout: 60_000,
    env: {
      // 服务日志不参与断言，CI 默认只保留真正的错误，避免排盘信息刷屏。
      LOG_LEVEL: "error",
    },
  },
});
