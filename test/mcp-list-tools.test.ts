/**
 * 列表工具输出契约测试（MCP 协议层）
 *
 * 背景：bazi_dayun/liunian/liuyue/liuri 与 ziwei_daxian/xiaoxian/liunian/liuyue/liuri
 * 为 v0.1.0 继承代码，此前只有计算器级测试、从无输出级验证。
 * 本组测试兑现「每个工具必须有输出契约测试」的纪律（AGENTS.md）。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/client';
import { createMingpanServer } from '../src/server';

const BIRTH = { year: 1992, month: 4, day: 12, hour: 7, gender: 'male' as const };

describe('列表工具输出契约（MCP 层）', () => {
  let client: Client;

  beforeAll(async () => {
    const server = createMingpanServer();
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await server.connect(st);
    client = new Client({ name: 'list-contract-test', version: '0' });
    await client.connect(ct);
  });

  afterAll(async () => {
    await client.close();
  });

  async function call(name: string, args: Record<string, unknown>): Promise<string> {
    const res = await client.callTool({ name, arguments: args });
    expect(res.isError, `${name} 不应报错`).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text.length, `${name} 输出不应为空`).toBeGreaterThan(200);
    return text;
  }

  // ============= 八字列表 =============

  it('bazi_dayun：大运表（含起运信息与逐运干支）', async () => {
    const t = await call('bazi_dayun', BIRTH);
    expect(t).toContain('大運');
    expect(t).toContain('起運');
    expect(t).toMatch(/大運干支|序號/);
    expect(t).toMatch(/9-18歲|乙巳/); // 9 岁起运、首运乙巳（金样本已知）
  });

  it('bazi_liunian：流年表（含干支年与虚岁）', async () => {
    const t = await call('bazi_liunian', { ...BIRTH, startYear: 2024, endYear: 2026 });
    expect(t).toContain('2024');
    expect(t).toContain('甲辰'); // 2024 年干支
    expect(t).toContain('丙午'); // 2026 年干支
    expect(t).toContain('歲');
  });

  it('bazi_liuyue：流月表（12 个节气月，寅月起）', async () => {
    const t = await call('bazi_liuyue', { ...BIRTH, ganzhiYear: 2025 });
    expect(t).toContain('立春');
    expect(t).toContain('戊寅'); // 乙巳年正月戊寅（五虎遁：乙庚之岁戊为头）
    expect(t).toContain('己丑'); // 腊月己丑（跨公历年）
    // 12 个月完整性
    const monthCount = (t.match(/月/g) || []).length;
    expect(monthCount).toBeGreaterThanOrEqual(12);
  });

  it('bazi_liuri：流日表（含干支日与上下文）', async () => {
    const t = await call('bazi_liuri', { ...BIRTH, ganzhiYear: 2025, ganzhiMonth: 1 });
    expect(t).toContain('2025');
    expect(t).toMatch(/日/);
  });

  // ============= 紫微列表 =============

  it('ziwei_daxian：大限表（木三局 3 岁起，命宫始）', async () => {
    const t = await call('ziwei_daxian', BIRTH);
    expect(t).toContain('3-12'); // 木三局首限 3-12 岁（金样本已知）
    expect(t).toContain('12');
  });

  it('ziwei_xiaoxian：小限表（年龄区间）', async () => {
    const t = await call('ziwei_xiaoxian', { ...BIRTH, startAge: 30, endAge: 35 });
    expect(t).toContain('30');
    expect(t).toContain('35');
    expect(t).toMatch(/宮|宫/);
  });

  it('ziwei_liunian：流年表（含流年宫位）', async () => {
    const t = await call('ziwei_liunian', { ...BIRTH, startYear: 2024, endYear: 2026 });
    expect(t).toContain('甲辰');
    expect(t).toMatch(/流年|宮/);
  });

  it('ziwei_liuyue：流月表（农历月）', async () => {
    const t = await call('ziwei_liuyue', { ...BIRTH, lunarYear: 2025 });
    expect(t).toContain('正月');
    expect(t).toContain('臘月') || expect(t).toContain('腊月');
  });

  it('ziwei_liuri：流日表（农历日与干支日）', async () => {
    const t = await call('ziwei_liuri', { ...BIRTH, lunarYear: 2025, lunarMonth: 1 });
    expect(t).toContain('初一');
    expect(t).toContain('2025');
  });

  // ============= 跨工具确定性 =============

  it('流月工具确定性：同一输入两次调用输出一致', async () => {
    const a = await call('bazi_liuyue', { ...BIRTH, ganzhiYear: 2025 });
    const b = await call('bazi_liuyue', { ...BIRTH, ganzhiYear: 2025 });
    expect(a).toBe(b);
  });
});
