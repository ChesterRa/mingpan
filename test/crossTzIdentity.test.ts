/**
 * 跨时区输出一致性测试（子进程级 TZ 隔离）
 *
 * 背景：2026-08-30 审计发现单元测试全绿但「流月日期表/起运岁数」在
 * 不同宿主时区下差 1（本地 Date 构造逃过清扫、被 MCP 测试的 TZ 强制掩盖）。
 * 本测试以子进程方式真正切换宿主时区，对关键工具做逐字节比对——
 * 这是 Date 载体约定（Date.UTC 构造 + getUTC* 读取）的最高级看守。
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const DIST = resolve(__dirname, '../dist/index.js');

interface CallSpec { name: string; args: Record<string, unknown> }

const CALLS: CallSpec[] = [
  { name: 'bazi_basic', args: { year: 1992, month: 4, day: 12, hour: 7, minute: 30, gender: 'male' } },
  { name: 'bazi_basic', args: { year: 1988, month: 2, day: 15, hour: 23, minute: 30, gender: 'male' } }, // 子初換日案例
  { name: 'bazi_dayun', args: { year: 1992, month: 4, day: 12, hour: 7, gender: 'male' } },
  { name: 'bazi_liuyue', args: { year: 1992, month: 4, day: 12, hour: 7, gender: 'male', ganzhiYear: 2025 } },
  { name: 'ziwei_liuri', args: { year: 1992, month: 4, day: 12, hour: 8, gender: 'male', lunarYear: 2025, lunarMonth: 1 } },
  { name: 'daliuren_basic', args: { year: 2025, month: 12, day: 19, hour: 10 } },
  { name: 'jieqi_query', args: { year: 2025 } },
];

function runUnder(tz: string): string[] {
  const lines: string[] = [];
  for (const call of CALLS) {
    const input = [
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'crosstz', version: '0' } } }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: call }),
    ].join('\n') + '\n';
    const res = spawnSync('node', [DIST], { input, env: { ...process.env, TZ: tz }, timeout: 30_000 });
    const out = (res.stdout?.toString() || '').split('\n').filter(l => l.includes('"id":2'));
    lines.push(out[0] ?? `(empty for ${call.name})`);
  }
  return lines;
}

describe('跨时区输出逐字节一致性（子进程 TZ 隔离）', () => {
  it('上海 / UTC / 纽约：五个关键工具输出完全一致', () => {
    const shanghai = runUnder('Asia/Shanghai');
    const utc = runUnder('UTC');
    const ny = runUnder('America/New_York');
    for (let i = 0; i < CALLS.length; i++) {
      expect(utc[i], `${CALLS[i].name} UTC vs 上海`).toBe(shanghai[i]);
      expect(ny[i], `${CALLS[i].name} 纽约 vs 上海`).toBe(shanghai[i]);
    }
  }, 120_000);
});
