import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const args = process.argv.slice(2);
const compareTimezones = args.includes("--compare-timezones");
const [rootArg, binArg] = args.filter((argument) => argument !== "--compare-timezones");
const rootDir = rootArg
  ? path.resolve(rootArg)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const bin = binArg ? path.resolve(binArg) : path.join(rootDir, manifest.bin.mingpan);
const birth = { year: 1992, month: 4, day: 12, hour: 7, minute: 30, gender: "male" };
const taiYin = { year: 2001, month: 3, day: 15, hour: 10, minute: 20, gender: "male" };
const castingTime = { year: 2025, month: 11, day: 3, hour: 14, minute: 20 };

const goldens = [
  { name: "bazi_basic", args: birth, expected: /年柱：壬申/u },
  {
    name: "bazi_basic",
    // 合成例：1990 立秋（北京標準時 08-08 02:45:32）後約 5 分，夏令時牆鐘 03:50
    args: {
      year: 1990, month: 8, day: 8, hour: 3, minute: 50,
      gender: "female", timezone: "Asia/Shanghai", longitude: 106.55,
    },
    expected: /月柱：甲申/u,
  },
  { name: "ziwei_basic", args: taiYin, expected: /^.酉 本命[^\n]*太陰\(旺\)/mu },
  {
    name: "meihua_basic",
    args: { method: "number", upperNumber: 7, lowerNumber: 4, yaoNumber: 1 },
    expected: /\*\*本卦\*\*：山雷頤 → \*\*變卦\*\*：山地剝 \| \*\*互卦\*\*：坤為地/u,
  },
];
const calls = compareTimezones ? [
  ...goldens,
  { name: "bazi_basic", args: { ...birth, hour: 23 } },
  { name: "bazi_dayun", args: { ...birth, count: 3 } },
  { name: "bazi_liunian", args: { ...birth, startYear: 2025, endYear: 2026 } },
  { name: "bazi_liuyue", args: { ...birth, ganzhiYear: 2025 } },
  { name: "bazi_liuri", args: { ...birth, ganzhiYear: 2025, ganzhiMonth: 1 } },
  { name: "ziwei_daxian", args: { ...birth, count: 3 } },
  { name: "ziwei_xiaoxian", args: { ...birth, startAge: 20, endAge: 22 } },
  { name: "ziwei_liunian", args: { ...birth, startYear: 2025, endYear: 2026 } },
  {
    name: "ziwei_liuyue",
    args: { ...taiYin, lunarYear: 2030 },
    expected: /正月[^\n]*2030-02-03 ~ 2030-03-03/u,
  },
  { name: "ziwei_liuri", args: { ...birth, lunarYear: 2025, lunarMonth: 1 } },
  { name: "jieqi_query", args: { year: 2025 } },
  { name: "calendar_convert", args: { direction: "solar2lunar", year: 2025, month: 11, day: 3 } },
  {
    name: "calendar_convert",
    args: { direction: "lunar2solar", year: 2025, month: 6, day: 15, isLeapMonth: true },
  },
  { name: "liuyao_basic", args: { ...castingTime, yaoValues: [7, 8, 9, 6, 7, 8] } },
  {
    name: "meihua_basic",
    args: { method: "time", year: 2025, month: 11, day: 3, hour: 14, timezone: "America/New_York" },
  },
  { name: "daliuren_basic", args: castingTime },
  { name: "qimen_basic", args: castingTime },
  { name: "qimen_yongshen", args: { ...castingTime, shiLei: "求财" } },
] : goldens;

async function collect(timezone) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [bin],
    cwd: rootDir,
    env: timezone ? { TZ: timezone } : undefined,
    stderr: "pipe",
  });
  const client = new Client({ name: "mingpan-stdio-smoke", version: manifest.version });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const names = new Set(tools.map(({ name }) => name));
    assert.equal(tools.length, 18, "Expected all 18 tools");
    if (compareTimezones) {
      assert.deepEqual(new Set(calls.map(({ name }) => name)), names, "Time zone fixtures must cover every tool");
    }
    const outputs = [];
    for (const { name, args, expected } of calls) {
      const result = await client.callTool({ name, arguments: args });
      assert(!result.isError, `${name} returned a tool error under ${timezone ?? "the default TZ"}`);
      const text = result.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
      assert(text.length > 0, `${name} returned no text`);
      if (expected) assert.match(text, expected, `${name} returned an unexpected result under ${timezone ?? "the default TZ"}`);
      outputs.push(text);
    }
    return { tools, outputs };
  } finally {
    await client.close();
  }
}

if (compareTimezones) {
  const baseline = await collect("UTC");
  for (const timezone of ["Asia/Tokyo", "America/New_York"]) {
    const candidate = await collect(timezone);
    assert.deepEqual(candidate.tools, baseline.tools, `tools/list differs under ${timezone}`);
    for (const [index, { name }] of calls.entries()) {
      assert.equal(candidate.outputs[index], baseline.outputs[index], `${name} differs under ${timezone}`);
    }
  }
  console.log(`stdio time zone comparison passed: mingpan v${manifest.version}, ${calls.length} calls across 18 tools (UTC, Asia/Tokyo, America/New_York)`);
} else {
  const { tools } = await collect();
  console.log(`stdio smoke passed: mingpan v${manifest.version} (${tools.length} tools)`);
}
