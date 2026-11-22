import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const endpoint = process.env.MCP_ENDPOINT;
if (!endpoint) {
  throw new Error("MCP_ENDPOINT is required");
}
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));

const client = new Client(
  { name: "mingpan-release-smoke", version: manifest.version },
  { versionNegotiation: { mode: { pin: "2026-07-28" } } }
);
const transport = new StreamableHTTPClientTransport(new URL(endpoint));

try {
  await client.connect(transport);
  if (client.getProtocolEra() !== "modern") {
    throw new Error(`Expected modern MCP protocol, got ${client.getProtocolEra()}`);
  }

  const { tools } = await client.listTools();
  if (tools.length !== 18 || !tools.some((tool) => tool.name === "ziwei_basic")) {
    throw new Error(`Unexpected tools/list result: ${tools.length} tools`);
  }

  const result = await client.callTool({
    name: "ziwei_basic",
    arguments: { year: 2001, month: 3, day: 15, hour: 10, minute: 20, gender: "male" },
  });
  if (result.isError || !result.content.some((item) =>
    item.type === "text" && /^.酉 本命[^\n]*太陰\(旺\)/mu.test(item.text))) {
    throw new Error("ziwei_basic smoke did not use the corrected You palace brightness");
  }

  const meihua = await client.callTool({
    name: "meihua_basic",
    arguments: { method: "number", upperNumber: 7, lowerNumber: 4, yaoNumber: 1 },
  });
  if (meihua.isError || !meihua.content.some((item) => item.type === "text" &&
    item.text.includes("**本卦**：山雷頤 → **變卦**：山地剝 | **互卦**：坤為地"))) {
    throw new Error("meihua_basic smoke returned incorrect changed/nuclear hexagrams (issue #2)");
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

  console.log(`MCP v2 smoke passed: ${endpoint} (${tools.length} tools)`);
} finally {
  await client.close();
}
