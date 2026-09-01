import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(rootDir, "dist", "index.js")],
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

  console.log(`stdio smoke passed: mingpan v${manifest.version} (${tools.length} tools)`);
} finally {
  await client.close();
}
