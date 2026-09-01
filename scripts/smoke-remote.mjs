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
    arguments: {
      year: 1992,
      month: 12,
      day: 24,
      hour: 9,
      minute: 16,
      gender: "female",
    },
  });
  if (result.isError || !result.content.some((item) => item.type === "text" && item.text.includes("命宮"))) {
    throw new Error("ziwei_basic smoke call returned an invalid result");
  }

  console.log(`MCP v2 smoke passed: ${endpoint} (${tools.length} tools)`);
} finally {
  await client.close();
}
