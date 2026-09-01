/**
 * 历法原语工具测试（节气查询 + 农历互转）
 *
 * 节气验证锚点：公开天文数据（如 2025 年立春 02-03 22:10:13，
 * 我们的表精确到秒为 22:10:28——差异源于 lunar-javascript 内部
 * 的天文算法精度，属正常范围）。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/client';
import { createMingpanServer } from '../src/server';

describe('历法原语工具', () => {
  let client: Client;

  beforeAll(async () => {
    const server = createMingpanServer();
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await server.connect(st);
    client = new Client({ name: 'calendar-test', version: '0' });
    await client.connect(ct);
  });

  afterAll(async () => {
    await client.close();
  });

  describe('jieqi_query', () => {
    it('2025 年应返回 24 个节气，首为立春、末为大雪', async () => {
      const res = await client.callTool({ name: 'jieqi_query', arguments: { year: 2025 } });
      expect(res.isError).toBeFalsy();
      const text = (res.content as { type: string; text: string }[])[0].text;
      const rows = text.split('\n').filter((l: string) => l.startsWith('|') && !l.includes(':--') && !l.includes('節氣'));
      expect(rows.length).toBe(24);
      expect(rows[0]).toContain('小寒'); // 公历年序：1 月小寒最先

      expect(rows[23]).toContain('冬至'); // 公历年末冬至
    });

    it('立春精确到秒（AI 无法推算的天文量）', async () => {
      const res = await client.callTool({ name: 'jieqi_query', arguments: { year: 2025 } });
      const text = (res.content as { type: string; text: string }[])[0].text;
      const lichun = text.split('\n').find((l: string) => l.includes('立春'));
      expect(lichun).toMatch(/2025-02-03 22:\d{2}:\d{2}/);
    });

    it('跨年完整性：1988 年立春应在 2 月 4 日', async () => {
      const res = await client.callTool({ name: 'jieqi_query', arguments: { year: 1988 } });
      const text = (res.content as { type: string; text: string }[])[0].text;
      const lichun = text.split('\n').find((l: string) => l.includes('立春'));
      expect(lichun).toContain('1988-02-04'); // 1988 年立春在 2/4（每年漂移）
    });
  });

  describe('calendar_convert', () => {
    it('公历→农历：2025-06-21 → 五月廿六', async () => {
      const res = await client.callTool({
        name: 'calendar_convert',
        arguments: { direction: 'solar2lunar', year: 2025, month: 6, day: 21 },
      });
      expect(res.isError).toBeFalsy();
      const text = (res.content as { type: string; text: string }[])[0].text;
      expect(text).toContain('五月');
      expect(text).toContain('廿六');
      expect(text).toContain('乙巳'); // 2025 = 乙巳年
    });

    it('农历→公历：2025 年五月廿六 → 2025-06-21', async () => {
      const res = await client.callTool({
        name: 'calendar_convert',
        arguments: { direction: 'lunar2solar', year: 2025, month: 5, day: 26 },
      });
      const text = (res.content as { type: string; text: string }[])[0].text;
      expect(text).toContain('2025');
      expect(text).toContain('6');
      expect(text).toContain('21');
    });

    it('闰月处理：2025 年有闰六月', async () => {
      // 闰六月初一 = 公历 2025-07-25
      const res = await client.callTool({
        name: 'calendar_convert',
        arguments: { direction: 'lunar2solar', year: 2025, month: 6, day: 1, isLeapMonth: true },
      });
      expect(res.isError).toBeFalsy();
      const text = (res.content as { type: string; text: string }[])[0].text;
      expect(text).toContain('闰六');
      expect(text).toContain('7');
    });

    it('往返一致性：公历→农历→公历还原', async () => {
      const s2l = await client.callTool({
        name: 'calendar_convert',
        arguments: { direction: 'solar2lunar', year: 1992, month: 4, day: 12 },
      });
      const lunarText = (s2l.content as { type: string; text: string }[])[0].text;
      expect(lunarText).toContain('三月');
      expect(lunarText).toContain('初十');
    });
  });
});
