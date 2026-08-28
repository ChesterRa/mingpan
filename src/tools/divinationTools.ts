/**
 * 占卜類 MCP 工具：六爻、梅花易數、大六壬
 *
 * 設計原則：占卜工具的時間參數為「起卦/起課時間」，
 * 節氣、干支等曆法量一律由 MCP 自動推得（LLM 手推干支極易出錯）。
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { LiuyaoService } from '../services/liuyao/LiuyaoService';
import { renderLiuyaoText } from '../output/liuyaoTextRenderer';
import { MeihuaService } from '../services/meihua/MeihuaService';
import { renderMeihuaText } from '../output/meihuaTextRenderer';
import { DaliurenService } from '../services/daliuren/DaliurenService';
import { renderDaliurenText } from '../output/daliurenTextRenderer';
import {
  birthTimeFields,
  yearField,
  monthField,
  dayField,
  hourField,
  normalizeBirthInfo,
  textResult,
  timezoneNote,
} from './schemas';

const liuyaoService = new LiuyaoService();
const meihuaService = new MeihuaService();

const yaoValue = z.union([z.literal(6), z.literal(7), z.literal(8), z.literal(9)]);

export function registerDivinationTools(server: McpServer): void {
  // ============= 六爻 =============

  server.registerTool('liuyao_basic', {
    title: '六爻排盤',
    description: `六爻排盤（基礎排盤）。

輸入六個爻值和起卦時間，返回完整的六爻盤面：
- 本卦/變卦（含卦名、卦宮、五行）
- 六爻納甲（每爻地支及五行）
- 六親（父母/兄弟/子孫/妻財/官鬼）
- 六神（青龍/朱雀/勾陳/螣蛇/白虎/玄武）
- 世應位置
- 動爻標註
- 日干支、月建、旬空

爻值說明：
- 6 = 老陰（動爻，陰變陽）
- 7 = 少陽（靜爻，陽）
- 8 = 少陰（靜爻，陰）
- 9 = 老陽（動爻，陽變陰）

輸入順序：自下而上（初爻到上爻）
起卦時間默認北京時間，可提供 timezone 换算。

輸出為 Markdown 格式，便於 AI 分析解讀。`,
    inputSchema: {
      yaoValues: z.tuple([yaoValue, yaoValue, yaoValue, yaoValue, yaoValue, yaoValue])
        .describe('六個爻值（自下而上，初爻到上爻）。6=老陰(動), 7=少陽(靜), 8=少陰(靜), 9=老陽(動)'),
      ...birthTimeFields,
    },
  }, async (args) => textResult('liuyao_basic', async () => {
    const { normalized, sourceTimezone } = normalizeBirthInfo(args);

    const result = liuyaoService.calculate({
      yaoValues: args.yaoValues as [6 | 7 | 8 | 9, 6 | 7 | 8 | 9, 6 | 7 | 8 | 9, 6 | 7 | 8 | 9, 6 | 7 | 8 | 9, 6 | 7 | 8 | 9],
      year: normalized.year,
      month: normalized.month,
      day: normalized.day,
      hour: normalized.hour,
      isLunar: false,
    });

    return timezoneNote(sourceTimezone) + renderLiuyaoText(result);
  }));

  // ============= 梅花易數 =============

  server.registerTool('meihua_basic', {
    title: '梅花易數排盤',
    description: `梅花易數排盤（基礎排盤）。

支持兩種起卦方式：
1. 時間起卦（method='time'）：根據農曆年月日時起卦
2. 數字起卦（method='number'）：根據兩個數字起卦

返回完整的梅花盤面：
- 本卦/變卦/互卦
- 上卦/下卦（含卦象、五行）
- 動爻位置
- 體用分析（體卦、用卦、五行生剋關係）
- 起卦數據詳情

時間起卦算法（農曆）：
- 上卦 = (年支序數 + 月 + 日) % 8
- 下卦 = (年支序數 + 月 + 日 + 時辰序數) % 8
- 動爻 = (年支序數 + 月 + 日 + 時辰序數) % 6

輸出為 Markdown 格式，便於 AI 分析解讀。`,
    inputSchema: {
      method: z.enum(['time', 'number']).describe("起卦方式：time=時間起卦，number=數字起卦"),
      year: yearField.optional().describe('起卦年份（公曆，time 模式必填）'),
      month: monthField.optional().describe('起卦月份（1-12，time 模式必填）'),
      day: dayField.optional().describe('起卦日期（1-31，time 模式必填）'),
      hour: hourField.optional().describe('起卦時辰（0-23，time 模式必填）'),
      isLunar: z.boolean().optional().default(false).describe('輸入是否為農曆，默認 false'),
      timezone: z.string().optional().describe('IANA 時區名（time 模式，默認北京時間）'),
      upperNumber: z.number().int().min(1).optional().describe('上卦數（number 模式必填）'),
      lowerNumber: z.number().int().min(1).optional().describe('下卦數（number 模式必填）'),
      yaoNumber: z.number().int().min(1).optional().describe('動爻數（可選，默認用上下卦數之和）'),
    },
  }, async (args) => textResult('meihua_basic', async () => {
    let year = args.year;
    let month = args.month;
    let day = args.day;
    let hour = args.hour;
    let isLunar = args.isLunar;

    // 時間模式：入口層完成時區歸一化後再交給服務層
    if (args.method === 'time' && year !== undefined && month !== undefined && day !== undefined && hour !== undefined) {
      const { normalized } = normalizeBirthInfo({
        year, month, day, hour,
        isLunar,
        timezone: args.timezone,
      });
      year = normalized.year;
      month = normalized.month;
      day = normalized.day;
      hour = normalized.hour;
      isLunar = false;
    }

    const result = meihuaService.calculate({
      method: args.method,
      year,
      month,
      day,
      hour,
      isLunar,
      upperNumber: args.upperNumber,
      lowerNumber: args.lowerNumber,
      yaoNumber: args.yaoNumber,
    });

    return renderMeihuaText(result);
  }));

  // ============= 大六壬 =============

  server.registerTool('daliuren_basic', {
    title: '大六壬排盤',
    description: `大六壬排盤（基礎排盤）。

大六壬是中國古老三大占卜術之一，與奇門遁甲、太乙神數並稱三式。

【推薦用法】直接輸入公曆起課時間，系統自動推得節氣、月將、日干支、時干支：
- year/month/day/hour（+ 可選 minute、timezone、isLunar）

【專家模式】也可顯式指定曆法量（一般無需使用）：
- jieqi：節氣（如：立春、驚蟄，簡繁均可）
- dayGanZhi / hourGanZhi：完整干支（如：甲子、乙丑）

返回完整的六壬盤面：
- 天地盤（月將加時辰起盤）
- 四課（日干支推演）
- 三傳（九宗門推演：賊尅、比用、涉害、遙尅、昴星、別責、八專、伏吟、返吟）
- 十二天將（貴人、螣蛇、朱雀、六合、勾陳、青龍、天空、白虎、太常、玄武、太陰、天后）
- 格局判斷
- 神煞（日馬、月馬、丁馬、華蓋、閃電）

本工具只負責排盤，斷課解讀交給 Agent。

輸出為 Markdown 格式，便於 AI 分析解讀。`,
    inputSchema: {
      // 推薦：時間輸入
      year: yearField.optional().describe('起課年份（公曆，推薦用法）'),
      month: monthField.optional().describe('起課月份（1-12）'),
      day: dayField.optional().describe('起課日期（1-31）'),
      hour: hourField.optional().describe('起課時辰（0-23）'),
      minute: z.number().int().min(0).max(59).optional().describe('分鐘（0-59），默認 0'),
      isLunar: z.boolean().optional().default(false).describe('輸入是否為農曆，默認 false'),
      timezone: z.string().optional().describe('IANA 時區名（默認北京時間）'),
      // 專家模式：顯式曆法量
      jieqi: z.string().optional().describe('【專家模式】節氣（如：立春、驚蟄，簡繁均可）'),
      lunarMonth: z.number().int().min(1).max(12).optional().describe('【專家模式】農曆月份（1-12）'),
      dayGanZhi: z.string().optional().describe('【專家模式】日干支（如：甲子、乙丑）'),
      hourGanZhi: z.string().optional().describe('【專家模式】時干支（如：甲子、乙丑）'),
      guirenMethod: z.union([z.literal(0), z.literal(1)]).optional().default(0).describe('貴人起法：0=標準, 1=另一種'),
    },
  }, async (args) => textResult('daliuren_basic', async () => {
    const daliurenService = new DaliurenService();
    const guirenMethod = args.guirenMethod;

    // 推薦路徑：由時間自動推節氣/月將/干支
    const hasTime = args.year !== undefined && args.month !== undefined && args.day !== undefined && args.hour !== undefined;
    if (hasTime) {
      const { normalized, sourceTimezone } = normalizeBirthInfo({
        year: args.year!,
        month: args.month!,
        day: args.day!,
        hour: args.hour!,
        minute: args.minute,
        isLunar: args.isLunar,
        timezone: args.timezone,
      });

      const result = daliurenService.calculateFromTime({
        year: normalized.year,
        month: normalized.month,
        day: normalized.day,
        hour: normalized.hour,
        minute: normalized.minute,
        guirenMethod,
      });
      return timezoneNote(sourceTimezone) + renderDaliurenText(result);
    }

    // 專家模式：顯式曆法量
    if (args.jieqi && args.lunarMonth !== undefined && args.dayGanZhi && args.hourGanZhi) {
      const result = daliurenService.calculate({
        jieqi: args.jieqi,
        lunarMonth: args.lunarMonth,
        dayGanZhi: args.dayGanZhi,
        hourGanZhi: args.hourGanZhi,
        guirenMethod,
      });
      return renderDaliurenText(result);
    }

    throw new Error(
      '輸入不完整：請提供起課時間（year/month/day/hour），或完整專家參數（jieqi + lunarMonth + dayGanZhi + hourGanZhi）'
    );
  }));
}
