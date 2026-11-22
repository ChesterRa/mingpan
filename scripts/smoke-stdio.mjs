import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const rootDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [process.argv[3] ? path.resolve(process.argv[3]) : path.join(rootDir, manifest.bin.mingpan)],
  cwd: rootDir,
  stderr: "pipe",
});
const client = new Client({ name: "mingpan-stdio-smoke", version: manifest.version });

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  if (tools.length !== 18 || !tools.some((tool) => tool.name === "bazi_basic")) {
    throw new Error(`Unexpected stdio tools/list result: ${tools.length} tools`);
  }

  const result = await client.callTool({
    name: "bazi_basic",
    arguments: {
      year: 1992,
      month: 4,
      day: 12,
      hour: 7,
      minute: 30,
      gender: "male",
    },
  });
  if (result.isError || !result.content.some((item) => item.type === "text" && item.text.includes("年柱：壬申"))) {
    throw new Error("bazi_basic stdio smoke call returned an invalid result");
  }

  const meihua = await client.callTool({
    name: "meihua_basic",
    arguments: { method: "number", upperNumber: 7, lowerNumber: 4, yaoNumber: 1 },
  });
  if (meihua.isError || !meihua.content.some((item) => item.type === "text" &&
    item.text.includes("**本卦**：山雷頤 → **變卦**：山地剝 | **互卦**：坤為地"))) {
    throw new Error("meihua_basic stdio smoke returned incorrect changed/nuclear hexagrams (issue #2)");
  }

  const jie = await client.callTool({
    name: "bazi_basic",
    arguments: {
      // 合成例：1990 立秋（北京標準時 08-08 02:45:32）後約 5 分，夏令時牆鐘 03:50
      year: 1990, month: 8, day: 8, hour: 3, minute: 50,
      gender: "female", timezone: "Asia/Shanghai", longitude: 106.55,
    },
  });
  if (jie.isError || !jie.content.some((item) => item.type === "text" && item.text.includes("月柱：甲申"))) {
    throw new Error("bazi_basic smoke compared true solar time with the jie table (issue #3)");
  }

  console.log(`stdio smoke passed: mingpan v${manifest.version} (${tools.length} tools)`);
} finally {
  await client.close();
}
