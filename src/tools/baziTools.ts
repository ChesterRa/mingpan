/**
 * 八字命理 MCP 工具
 *
 * 工具列表：
 * - bazi_basic      基礎排盤（四柱、藏干、十神、五行力量）
 * - bazi_dayun      大運列表
 * - bazi_liunian    流年列表
 * - bazi_liuyue     流月列表（節氣月）
 * - bazi_liuri      流日列表
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BaziService } from '../services/bazi/BaziService';
import { LiuNianCalculator } from '../services/bazi/calculators/LiuNianCalculator';
import { DaYunCalculator } from '../services/bazi/calculators/DaYunCalculator';
import { LuckCycleCalculator } from '../services/bazi/calculators/LuckCycleCalculator';
import { LiuYueCalculator } from '../services/bazi/calculators/LiuYueCalculator';
import { LiuRiCalculator } from '../services/bazi/calculators/LiuRiCalculator';
import { renderBaziText } from '../output/fortuneTextRenderer';
import {
  renderBaziDaYunList,
  renderBaziLiuNianList,
  renderBaziLiuYueList,
  renderBaziLiuRiList,
  BaziListOptions,
} from '../output/listTextRenderer';
import {
  baseBirthInfoFields,
  normalizeBirthInfo,
  textResult,
  timezoneNote,
  parseGanzhiYear,
  parseGanzhiMonth,
  getYearStemBranch,
  getMonthStemBranch,
} from './schemas';

const baziService = new BaziService({ debug: false });

const countField = z.number().int().min(1).max(12).optional().default(10).describe('Number of periods to display (default 10)');
const ganzhiYearField = z.union([
  z.string().describe("GanZhi year like '乙巳'"),
  z.number().int().min(1900).max(2100).describe('Gregorian year like 2025'),
]);

export function registerBaziTools(server: McpServer): void {
  server.registerTool('bazi_basic', {
    title: '八字基礎排盤',
    description: `計算八字四柱（基礎排盤）。

輸入出生時間，返回由節氣與曆法精確推算的確定性結果：
- 年柱、月柱、日柱、時柱干支（含節氣月邊界、晚子時處理）及六十甲子納音
- 天干十神與藏干十神（各支藏干逐個標注，※為本氣）
- 十二長生（自坐）
- 命宮（三命通會子平起法）、胎元（月干進一支進三）
- 日柱旬空
- 公曆/農曆出生日期對照

時區說明：默認按北京時間排盤；海外出生者請提供 timezone 參數，
系統將換算為北京時間後計算；可提供 longitude 做真太陽時校正。

定位說明：本工具只負責確定性排盤（干支、藏干、十神）。
五行強弱、格局、用神、神煞等屬解讀層，無權威統一口徑，
請由 AI 依據四柱自行分析。

大運/流年/流月/流日請使用對應列表工具。`,
    inputSchema: {
      ...baseBirthInfoFields,
    },
  }, async (args) => textResult('bazi_basic', async () => {
    const { normalized, sourceTimezone } = normalizeBirthInfo(args);

    const result = await baziService.calculate({
      year: normalized.year,
      month: normalized.month,
      day: normalized.day,
      hour: normalized.hour,
      minute: normalized.minute,
      gender: normalized.gender,
      longitude: normalized.longitude,
    });

    const birthDate = new Date(normalized.year, normalized.month - 1, normalized.day, normalized.hour, normalized.minute);
    const trueSolarTime = (result.birthInfo as any)?.trueSolarTime instanceof Date
      ? (result.birthInfo as any).trueSolarTime
      : undefined;
    const text = renderBaziText(
      { bazi: result, gender: normalized.gender, birthDate, trueSolarTime },
      { includePersonal: false, includeLocation: !!normalized.longitude }
    );

    return timezoneNote(sourceTimezone) + text;
  }));

  server.registerTool('bazi_dayun', {
    title: '八字大運列表',
    description: `八字大運列表。

返回命主一生的大運週期（十年一運）：
- 大運干支
- 起止虛歲
- 對應公曆年份
- 起運方向（順行/逆行）
- 起運年齡

用於了解人生各階段的運勢大框架。`,
    inputSchema: {
      ...baseBirthInfoFields,
      count: countField,
    },
  }, async (args) => textResult('bazi_dayun', async () => {
    const { normalized } = normalizeBirthInfo(args);

    const result = await baziService.calculate({
      year: normalized.year, month: normalized.month, day: normalized.day,
      hour: normalized.hour, minute: normalized.minute,
      gender: normalized.gender, longitude: normalized.longitude,
    });
    if (!result.chart || !result.birthInfo) {
      throw new Error('Failed to calculate BaZi chart');
    }

    const daYunList = DaYunCalculator.calculate(
      result.chart, result.birthInfo, normalized.gender,
      { startYear: normalized.year, endYear: normalized.year + 100 }
    );

    const direction = LuckCycleCalculator.calLuckySequence(normalized.gender, result.chart.year.stem) === 'forward' ? '顺行' : '逆行';
    const startAge = daYunList.length > 0 ? daYunList[0].startAge : 1;
    const startYear = normalized.year + startAge - 1;

    const options: BaziListOptions & { direction: '顺行' | '逆行'; startAge: number; startYear: number } = {
      name: normalized.name,
      birthYear: normalized.year,
      birthMonth: normalized.month,
      birthDay: normalized.day,
      birthHour: normalized.hour,
      birthMinute: normalized.minute,
      gender: normalized.gender,
      dayMaster: result.chart.day.stem,
      yearPillar: { stem: result.chart.year.stem, branch: result.chart.year.branch },
      monthPillar: { stem: result.chart.month.stem, branch: result.chart.month.branch },
      dayPillar: { stem: result.chart.day.stem, branch: result.chart.day.branch },
      hourPillar: { stem: result.chart.hour.stem, branch: result.chart.hour.branch },
      direction,
      startAge,
      startYear,
    };

    return renderBaziDaYunList(daYunList.slice(0, args.count), options);
  }));

  server.registerTool('bazi_liunian', {
    title: '八字流年列表',
    description: `八字流年列表。

返回指定年份範圍內的流年信息：
- 公曆年份
- 干支年
- 虛歲
- 所屬大運

用於分析多年運勢趨勢。`,
    inputSchema: {
      ...baseBirthInfoFields,
      startYear: z.number().int().min(1900).max(2100).describe('Start year for the range'),
      endYear: z.number().int().min(1900).max(2100).describe('End year for the range'),
    },
  }, async (args) => textResult('bazi_liunian', async () => {
    const { normalized } = normalizeBirthInfo(args);

    const result = await baziService.calculate({
      year: normalized.year, month: normalized.month, day: normalized.day,
      hour: normalized.hour, minute: normalized.minute,
      gender: normalized.gender, longitude: normalized.longitude,
    });
    if (!result.chart || !result.birthInfo) {
      throw new Error('Failed to calculate BaZi chart');
    }

    const daYunList = DaYunCalculator.calculate(
      result.chart, result.birthInfo, normalized.gender,
      { startYear: normalized.year, endYear: normalized.year + 100 }
    );

    const liuNianList = LiuNianCalculator.calculate(
      result.chart, normalized.year, args.startYear, args.endYear
    );

    const options = {
      name: normalized.name,
      birthYear: normalized.year,
      birthMonth: normalized.month,
      birthDay: normalized.day,
      birthHour: normalized.hour,
      birthMinute: normalized.minute,
      gender: normalized.gender,
      dayMaster: result.chart.day.stem,
      yearPillar: { stem: result.chart.year.stem, branch: result.chart.year.branch },
      monthPillar: { stem: result.chart.month.stem, branch: result.chart.month.branch },
      dayPillar: { stem: result.chart.day.stem, branch: result.chart.day.branch },
      hourPillar: { stem: result.chart.hour.stem, branch: result.chart.hour.branch },
      startYear: args.startYear,
      endYear: args.endYear,
      daYunList,
    };

    return renderBaziLiuNianList(liuNianList, options);
  }));

  server.registerTool('bazi_liuyue', {
    title: '八字流月列表',
    description: `八字流月列表。

重要：八字流月使用【節氣月】，非農曆月！
- 以節氣為邊界（立春起算）
- 寅月（正月）從立春開始，約2月4日
- 丑月（臘月）跨越公曆年界

返回指定年份的12個月運勢：
- 干支月
- 節氣起止
- 公曆日期範圍

用於規劃年度活動時機。`,
    inputSchema: {
      ...baseBirthInfoFields,
      ganzhiYear: ganzhiYearField.describe("The year to query (either GanZhi string like '乙巳' or Gregorian year like 2025)"),
    },
  }, async (args) => textResult('bazi_liuyue', async () => {
    const { normalized } = normalizeBirthInfo(args);
    const { year: gregorianYear, ganzhi: ganzhiYear } = parseGanzhiYear(args.ganzhiYear);

    const result = await baziService.calculate({
      year: normalized.year, month: normalized.month, day: normalized.day,
      hour: normalized.hour, minute: normalized.minute,
      gender: normalized.gender, longitude: normalized.longitude,
    });
    if (!result.chart || !result.birthInfo) {
      throw new Error('Failed to calculate BaZi chart');
    }

    const { stem: yearStem, branch: yearBranch } = getYearStemBranch(gregorianYear);

    const daYunList = DaYunCalculator.calculate(
      result.chart, result.birthInfo, normalized.gender,
      { startYear: normalized.year, endYear: normalized.year + 100 }
    );

    const targetAge = gregorianYear - normalized.year + 1;

    let currentDaYun: { stem: string; branch: string; startAge: number; endAge: number } | undefined;
    const matchedDaYun = daYunList.find(dy => targetAge >= dy.startAge && targetAge <= dy.endAge);
    if (matchedDaYun) {
      currentDaYun = {
        stem: matchedDaYun.stem,
        branch: matchedDaYun.branch,
        startAge: matchedDaYun.startAge,
        endAge: matchedDaYun.endAge,
      };
    }

    const liuNianList = LiuNianCalculator.calculate(
      result.chart, normalized.year, gregorianYear, gregorianYear
    );
    let currentLiuNian: { stem: string; branch: string; age: number } | undefined;
    if (liuNianList.length > 0) {
      const ln = liuNianList[0];
      currentLiuNian = { stem: ln.stem, branch: ln.branch, age: ln.age };
    }

    const calculator = new LiuYueCalculator();
    const liuYueList = calculator.calculateLiuYue(
      yearStem as any,
      yearBranch as any,
      (result.basic?.dayMasterElement || '木') as any,
      (result.traditional?.yongShen?.yongShen || []) as any,
      {
        year: normalized.year,
        month: normalized.month,
        day: normalized.day,
        hour: normalized.hour,
        minute: normalized.minute,
      },
      gregorianYear
    );

    const options = {
      name: normalized.name,
      birthYear: normalized.year,
      birthMonth: normalized.month,
      birthDay: normalized.day,
      birthHour: normalized.hour,
      birthMinute: normalized.minute,
      gender: normalized.gender,
      dayMaster: result.chart.day.stem,
      yearPillar: { stem: result.chart.year.stem, branch: result.chart.year.branch },
      monthPillar: { stem: result.chart.month.stem, branch: result.chart.month.branch },
      dayPillar: { stem: result.chart.day.stem, branch: result.chart.day.branch },
      hourPillar: { stem: result.chart.hour.stem, branch: result.chart.hour.branch },
      ganzhiYear,
      gregorianYear,
      currentDaYun,
      currentLiuNian,
    };

    return renderBaziLiuYueList(liuYueList, options);
  }));

  server.registerTool('bazi_liuri', {
    title: '八字流日列表',
    description: `八字流日列表。

返回指定月份內的每日運勢（含上下文）：
- 當前大運、流年、流月資訊
- 公曆日期
- 干支日

用於精細的日期選擇。`,
    inputSchema: {
      ...baseBirthInfoFields,
      ganzhiYear: ganzhiYearField.describe("The year of the month (GanZhi string or Gregorian year)"),
      ganzhiMonth: z.union([
        z.string().describe("GanZhi month like '丙寅' (month 1 = 寅月)"),
        z.number().int().min(1).max(12).describe('Month number (1=寅月, 2=卯月, ..., 12=丑月)'),
      ]).describe('The month to query (either GanZhi string or month number 1-12)'),
    },
  }, async (args) => textResult('bazi_liuri', async () => {
    const { normalized } = normalizeBirthInfo(args);
    const { year: gregorianYear, ganzhi: ganzhiYear } = parseGanzhiYear(args.ganzhiYear);
    const monthNum = parseGanzhiMonth(args.ganzhiMonth);

    const result = await baziService.calculate({
      year: normalized.year, month: normalized.month, day: normalized.day,
      hour: normalized.hour, minute: normalized.minute,
      gender: normalized.gender, longitude: normalized.longitude,
    });
    if (!result.chart || !result.birthInfo) {
      throw new Error('Failed to calculate BaZi chart');
    }

    const { stem: yearStem, branch: yearBranch } = getYearStemBranch(gregorianYear);
    const { stem: monthStem, branch: monthBranch } = getMonthStemBranch(gregorianYear, monthNum);

    const daYunList = DaYunCalculator.calculate(
      result.chart, result.birthInfo, normalized.gender,
      { startYear: normalized.year, endYear: normalized.year + 100 }
    );

    const targetAge = gregorianYear - normalized.year + 1;

    let currentDaYun: { stem: string; branch: string; startAge: number; endAge: number } | undefined;
    const matchedDaYun = daYunList.find(dy => targetAge >= dy.startAge && targetAge <= dy.endAge);
    if (matchedDaYun) {
      currentDaYun = {
        stem: matchedDaYun.stem,
        branch: matchedDaYun.branch,
        startAge: matchedDaYun.startAge,
        endAge: matchedDaYun.endAge,
      };
    }

    const liuNianList = LiuNianCalculator.calculate(
      result.chart, normalized.year, gregorianYear, gregorianYear
    );
    let currentLiuNian: { stem: string; branch: string; age: number } | undefined;
    if (liuNianList.length > 0) {
      const ln = liuNianList[0];
      currentLiuNian = { stem: ln.stem, branch: ln.branch, age: ln.age };
    }

    const currentLiuYue = {
      stem: monthStem,
      branch: monthBranch,
      month: monthNum,
    };

    // Calculate LiuRi
    const liuRiCalc = new LiuRiCalculator();
    const liuRiList = liuRiCalc.calculateLiuRi(
      monthStem as any,
      monthBranch as any,
      yearStem as any,
      yearBranch as any,
      (result.basic?.dayMasterElement || '木') as any,
      (result.traditional?.yongShen?.yongShen || []) as any,
      gregorianYear,
      monthNum
    );

    // Get the first and last date from the calculated list
    const startDate = liuRiList.length > 0 ? liuRiList[0].date : new Date();
    const endDate = liuRiList.length > 0 ? liuRiList[liuRiList.length - 1].date : new Date();

    const options = {
      name: normalized.name,
      birthYear: normalized.year,
      birthMonth: normalized.month,
      birthDay: normalized.day,
      birthHour: normalized.hour,
      birthMinute: normalized.minute,
      gender: normalized.gender,
      dayMaster: result.chart.day.stem,
      yearPillar: { stem: result.chart.year.stem, branch: result.chart.year.branch },
      monthPillar: { stem: result.chart.month.stem, branch: result.chart.month.branch },
      dayPillar: { stem: result.chart.day.stem, branch: result.chart.day.branch },
      hourPillar: { stem: result.chart.hour.stem, branch: result.chart.hour.branch },
      ganzhiMonth: monthStem + monthBranch,
      ganzhiYear,
      gregorianYear,
      startDate,
      endDate,
      currentDaYun,
      currentLiuNian,
      currentLiuYue,
    };

    return renderBaziLiuRiList(liuRiList, options);
  }));
}
