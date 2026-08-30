/**
 * 历法原语 MCP 工具
 *
 * 定位：中华历法确定性计算引擎的公共地基。
 * 节气时刻与农历互转是 AI 幻觉率最高的历法量——
 * 节气是天文事件（每年时刻漂移，AI 记不住也推不出），
 * 农历闰月分配是历表查询（AI 经常猜错）。
 * 两者完全满足输出准入三条件（确定/权威/AI 不易获知）。
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Lunar, Solar } from 'lunar-javascript';
import { textResult } from './schemas';
import { BEIJING_TZ } from '../utils/timeNormalization';

export function registerCalendarTools(server: McpServer): void {
  // ============= 节气精确时刻查询 =============

  server.registerTool('jieqi_query', {
    title: '節氣精確時刻查詢',
    description: `查詢指定年份二十四節氣的精確時刻（精確到秒，北京時間）。

節氣是天文事件，每年時刻不同且無簡單規律——AI 無法可靠推算
（如 2025 年立春是 2 月 3 日 22:10:13，而非 2 月 4 日）。
本工具返回權威曆表的精確數據。

輸出：二十四節氣按時間排序，含名稱、精確時刻、對應公曆日期。
用於排盤驗證、擇時分析、曆法考證。`,
    inputSchema: {
      year: z.number().int().min(1900).max(2100).describe('查詢年份（1900-2100）'),
    },
  }, async (args) => textResult('jieqi_query', () => {
    const lines: string[] = [];
    lines.push(`## ${args.year} 年二十四節氣`);
    lines.push('');
    lines.push('（時刻為北京時間，精確到秒）');
    lines.push('');
    lines.push('| 節氣 | 精確時刻 |');
    lines.push('|:----:|:---------|');

    // 用冬至所在公历年组织（中国传统节气年从立春起，但 lunar 以公历年组织）
    // JieQi 表以参考日期为轴前后各跨半年；合并年中与年末两个参考点
    // 以确保冬至（12 月下旬）不遗漏
    // JieQi 表的值直接是 Solar 对象；以年中（6月）为主、年末（12月）补冬至
    // 注意不能用 spread 合并——年末表的其它节气是次年的值，会覆盖主表
    const terms: Array<{ name: string; solar: any }> = [];
    const seen = new Set<string>();
    for (const ref of [Lunar.fromYmdHms(args.year, 6, 1, 12, 0, 0), Lunar.fromYmdHms(args.year, 12, 15, 12, 0, 0)]) {
      for (const [name, solar] of Object.entries(ref.getJieQiTable())) {
        const s = solar as any;
        if (!seen.has(name) && s && typeof s.getYear === 'function'
            && /^[\u4e00-\u9fa5]+$/.test(name) && s.getYear() === args.year) {
          terms.push({ name, solar: s });
          seen.add(name);
        }
      }
    }
    // 按时间排序
    terms.sort((a, b) => {
      const sa = a.solar, sb = b.solar;
      return sa.getYear() - sb.getYear()
        || sa.getMonth() - sb.getMonth()
        || sa.getDay() - sb.getDay()
        || sa.getHour() - sb.getHour()
        || sa.getMinute() - sb.getMinute();
    });

    for (const t of terms) {
      const s = t.solar;
      const pad = (n: number) => String(n).padStart(2, '0');
      lines.push(`| ${t.name} | ${s.getYear()}-${pad(s.getMonth())}-${pad(s.getDay())} ${pad(s.getHour())}:${pad(s.getMinute())}:${pad(s.getSecond())} |`);
    }
    lines.push('');
    return lines.join('\n');
  }));

  // ============= 农历公历互转 =============

  server.registerTool('calendar_convert', {
    title: '農曆公曆互轉',
    description: `農曆與公曆日期互轉（含閏月處理、干支年月日、生肖）。

農曆閏月分配無簡單規律（哪年閏幾月由天文計算決定），AI 經常猜錯。
本工具返回權威曆表數據。

支持兩個方向：
- solar → lunar：輸入公曆日期，返回農曆日期（含是否閏月）
- lunar → solar：輸入農曆日期（isLeapMonth 標記閏月），返回公曆日期`,
    inputSchema: {
      direction: z.enum(['solar2lunar', 'lunar2solar']).describe('轉換方向'),
      year: z.number().int().min(1900).max(2100).describe('年份'),
      month: z.number().int().min(1).max(12).describe('月份（1-12）'),
      day: z.number().int().min(1).max(31).describe('日期'),
      isLeapMonth: z.boolean().optional().describe('農曆輸入時是否為閏月（lunar2solar 方向）'),
    },
  }, async (args) => textResult('calendar_convert', () => {
    const lines: string[] = [];

    if (args.direction === 'solar2lunar') {
      const solar = Solar.fromYmd(args.year, args.month, args.day);
      const lunar = solar.getLunar();
      const isLeap = lunar.getMonth() < 0;
      lines.push(`## 公曆 → 農曆`);
      lines.push('');
      lines.push(`**公曆**：${args.year} 年 ${args.month} 月 ${args.day} 日`);
      lines.push(`**農曆**：${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}日`); // getMonthInChinese 闰月自带「闰」前缀
      lines.push('');
      lines.push(`**干支**：${lunar.getYearInGanZhiByLiChun()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`);
      lines.push(`**生肖**：${lunar.getYearShengXiao()}`);
    } else {
      const monthArg = args.isLeapMonth ? -args.month : args.month;
      const lunar = Lunar.fromYmd(args.year, monthArg, args.day);
      const solar = lunar.getSolar();
      lines.push(`## 農曆 → 公曆`);
      lines.push('');
      lines.push(`**農曆**：${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}日`);
      lines.push(`**公曆**：${solar.getYear()} 年 ${solar.getMonth()} 月 ${solar.getDay()} 日`);
      lines.push('');
      lines.push(`**干支**：${lunar.getYearInGanZhiByLiChun()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`);
      lines.push(`**生肖**：${lunar.getYearShengXiao()}`);
    }
    lines.push('');
    return lines.join('\n');
  }));
}
