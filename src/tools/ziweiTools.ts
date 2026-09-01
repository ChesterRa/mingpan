/**
 * 紫微斗数 MCP 工具
 *
 * 工具列表：
 * - ziwei_basic      基礎排盤（十二宮、主星、四化）
 * - ziwei_daxian     大限列表
 * - ziwei_xiaoxian   小限列表
 * - ziwei_liunian    流年列表
 * - ziwei_liuyue     流月列表（農曆月）
 * - ziwei_liuri      流日列表（農曆日）
 */

import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { Lunar } from 'lunar-javascript';
import { ZiweiService } from '../services/ziwei/ZiweiService';
import { YearlyCalculator } from '../services/ziwei/calculators/YearlyCalculator';
import { MutagenCore } from '../core/ziwei/MutagenCore';
import { renderZiweiText, FortuneTextOptions } from '../output/fortuneTextRenderer';
import {
  renderZiweiDaXianList,
  renderZiweiXiaoXianList,
  renderZiweiLiuNianList,
  renderZiweiLiuYueList,
  renderZiweiLiuRiList,
  ZiweiListOptions,
  ZiweiDailyInfo,
} from '../output/listTextRenderer';
import {
  baseBirthInfoFields,
  normalizeBirthInfo,
  textResult,
  timezoneNote,
  getYearStemBranch,
} from './schemas';
import { nowBeijingParts } from '../utils/wallTime';

const detailField = z.enum(['simple', 'standard', 'detailed']).optional().default('standard').describe('Output detail level');
const countField = z.number().int().min(1).max(12).optional().default(10).describe('Number of decade periods to display (default 10)');

/** 提取命宮主星（宮位名稱兼容繁簡） */
function findMingGong(result: Awaited<ReturnType<ZiweiService['calculate']>>) {
  return result.palaces?.find(p =>
    p.name === '命宮' || p.name === '命宫' || p.name === 'Life'
  );
}

function extractStars(palace: ReturnType<typeof findMingGong>): string[] {
  return palace?.majorStars?.map(s => (typeof s === 'string' ? s : s.name)) || [];
}

export function registerZiweiTools(server: McpServer): void {
  // ZiweiService owns a mutable adapter/currentGender pair. It must live no
  // longer than the server instance so concurrent Worker requests never share it.
  const ziweiService = new ZiweiService();

  server.registerTool('ziwei_basic', {
    title: '紫微基礎排盤',
    description: `計算紫微斗數命盤（基礎排盤）。

輸入出生時間，返回完整的紫微命盤信息：
- 十二宮位排布及干支
- 各宮主星及亮度（廟/旺/得/利/平/不/陷）
- 各宮輔星配置
- 命宮與身宮位置
- 五行局、命主、身主
- 本命四化（化祿/權/科/忌）

時區說明：默認按北京時間排盤；海外出生者請提供 timezone 參數。

輸出為結構化文本，便於 AI 分析解讀。`,
    inputSchema: {
      ...baseBirthInfoFields,
      detail: detailField,
      targetYear: z.number().int().optional().describe('Calculate yearly fortune for this specific year'),
      includeDecades: z.boolean().optional().default(true).describe('Include decade fortune (大限)'),
      includeMutagen: z.boolean().optional().default(true).describe('Include four mutagens (四化)'),
    },
  }, async (args) => textResult('ziwei_basic', async () => {
    const { normalized, sourceTimezone } = normalizeBirthInfo(args);

    const result = await ziweiService.calculate({
      year: normalized.year,
      month: normalized.month,
      day: normalized.day,
      hour: normalized.hour,
      gender: normalized.gender,
    });

    const options: FortuneTextOptions = {
      detail: args.detail,
      includePersonal: false,
    };

    const birthDate = new Date(Date.UTC(normalized.year, normalized.month - 1, normalized.day, normalized.hour, normalized.minute));
    return timezoneNote(sourceTimezone) + renderZiweiText(
      {
        ziwei: result,
        gender: normalized.gender,
        birthDate,
        mutagen: result.mutagenInfo,
      },
      options
    );
  }));

  server.registerTool('ziwei_daxian', {
    title: '紫微大限列表',
    description: `紫微大限列表。

返回命主一生的大限週期（十年一限）：
- 起止虛歲
- 對應公曆年份
- 大限宮位名稱
- 宮內主星配置
- 大限四化

用於了解人生各階段的運勢大框架。`,
    inputSchema: {
      ...baseBirthInfoFields,
      count: countField,
    },
  }, async (args) => textResult('ziwei_daxian', async () => {
    const { normalized } = normalizeBirthInfo(args);

    const result = await ziweiService.calculate({
      year: normalized.year, month: normalized.month, day: normalized.day,
      hour: normalized.hour, gender: normalized.gender,
    });

    if (!result.decades || result.decades.length === 0) {
      throw new Error('Failed to calculate ZiWei decades');
    }

    const yangStems = ['甲', '丙', '戊', '庚', '壬'];
    const yearStem = result.basicInfo?.fourPillars?.year?.stem || '';
    const isYang = yangStems.includes(yearStem);
    const isMale = normalized.gender === 'male';
    const direction = ((isYang && isMale) || (!isYang && !isMale)) ? '顺行' : '逆行';

    const mingGongPalace = findMingGong(result);
    const mingGongStars = extractStars(mingGongPalace);
    const shenGongPalace = result.palaces?.find(p => p.isBodyPalace);
    const shenGongStars = extractStars(shenGongPalace);

    const options: ZiweiListOptions & { direction: '顺行' | '逆行' } = {
      name: normalized.name,
      birthYear: normalized.year,
      birthMonth: normalized.month,
      birthDay: normalized.day,
      birthHour: normalized.hour,
      birthMinute: normalized.minute,
      gender: normalized.gender,
      mingGong: mingGongPalace?.name || '命宮',
      mingGongStars,
      shenGong: shenGongPalace?.name,
      shenGongStars,
      palaces: result.palaces,
      mutagenInfo: result.mutagenInfo,
      direction,
    };

    return renderZiweiDaXianList(result.decades.slice(0, args.count), options);
  }));

  server.registerTool('ziwei_xiaoxian', {
    title: '紫微小限列表',
    description: `紫微小限列表。

小限是紫微斗數中的年度運限單位，每年一宮：
- 虛歲（1歲起）
- 對應公曆年份
- 小限宮位（根據出生年支起宮，男順女逆）
- 宮內主星
- 所屬大限
- 小限四化

小限與流年並列但計算方式不同：
- 小限：以出生年支定起宮，逐年移宮
- 流年：以該年地支定宮位

層級順序：大限 > 小限 > 流年 > 流月 > 流日`,
    inputSchema: {
      ...baseBirthInfoFields,
      startAge: z.number().int().min(1).max(120).describe('Start age (nominal age) for the range'),
      endAge: z.number().int().min(1).max(120).describe('End age (nominal age) for the range'),
    },
  }, async (args) => textResult('ziwei_xiaoxian', async () => {
    const { normalized } = normalizeBirthInfo(args);

    const result = await ziweiService.calculate({
      year: normalized.year, month: normalized.month, day: normalized.day,
      hour: normalized.hour, gender: normalized.gender,
    });

    if (!result.palaces) {
      throw new Error('Failed to calculate ZiWei chart');
    }

    const minorLimitList = ziweiService.getMinorLimitRange(
      normalized.year, args.startAge, args.endAge
    );

    const mingGongPalace = findMingGong(result);
    const mingGongStars = extractStars(mingGongPalace);

    const currentYear = nowBeijingParts().year;
    const currentAge = currentYear - normalized.year + 1;
    let currentDecade: { palaceName: string; startAge: number; endAge: number } | undefined;
    if (result.decades && result.decades.length > 0) {
      const matchedDecade = result.decades.find(
        d => currentAge >= d.startAge && currentAge <= d.endAge
      );
      if (matchedDecade) {
        currentDecade = {
          palaceName: matchedDecade.palaceName || result.palaces?.[matchedDecade.palaceIndex]?.name || '未知',
          startAge: matchedDecade.startAge,
          endAge: matchedDecade.endAge,
        };
      }
    }

    const options = {
      name: normalized.name,
      birthYear: normalized.year,
      birthMonth: normalized.month,
      birthDay: normalized.day,
      birthHour: normalized.hour,
      birthMinute: normalized.minute,
      gender: normalized.gender,
      mingGong: mingGongPalace?.name || '命宮',
      mingGongStars,
      palaces: result.palaces,
      mutagenInfo: result.mutagenInfo,
      startAge: args.startAge,
      endAge: args.endAge,
      currentDecade,
      decades: result.decades,
    };

    return renderZiweiXiaoXianList(minorLimitList, options);
  }));

  server.registerTool('ziwei_liunian', {
    title: '紫微流年列表',
    description: `紫微流年列表。

返回指定年份範圍內的流年信息：
- 公曆年份
- 干支年
- 虛歲
- 流年宮位
- 宮內主星
- 所屬大限
- 流年四化

用於分析多年運勢趨勢。`,
    inputSchema: {
      ...baseBirthInfoFields,
      startYear: z.number().int().min(1900).max(2100).describe('Start year for the range'),
      endYear: z.number().int().min(1900).max(2100).describe('End year for the range'),
    },
  }, async (args) => textResult('ziwei_liunian', async () => {
    const { normalized } = normalizeBirthInfo(args);

    const result = await ziweiService.calculate({
      year: normalized.year, month: normalized.month, day: normalized.day,
      hour: normalized.hour, gender: normalized.gender,
    });

    if (!result.palaces) {
      throw new Error('Failed to calculate ZiWei chart');
    }

    const yearlyList = [];
    for (let year = args.startYear; year <= args.endYear; year++) {
      const yearly = YearlyCalculator.calculate(year, normalized.year, result.palaces);
      if (yearly) {
        yearlyList.push(yearly);
      }
    }

    const mingGongPalace = findMingGong(result);
    const mingGongStars = extractStars(mingGongPalace);

    const options = {
      name: normalized.name,
      birthYear: normalized.year,
      birthMonth: normalized.month,
      birthDay: normalized.day,
      birthHour: normalized.hour,
      birthMinute: normalized.minute,
      gender: normalized.gender,
      mingGong: mingGongPalace?.name || '命宮',
      mingGongStars,
      palaces: result.palaces,
      mutagenInfo: result.mutagenInfo,
      startYear: args.startYear,
      endYear: args.endYear,
      decades: result.decades,
    };

    return renderZiweiLiuNianList(yearlyList, options);
  }));

  server.registerTool('ziwei_liuyue', {
    title: '紫微流月列表',
    description: `紫微流月列表。

重要：紫微流月使用【農曆月】，非節氣月！
- 以農曆初一為邊界
- 正月從春節開始
- 閏月單獨顯示（如"閏六月"）

返回指定年份的流月運勢（含上下文）：
- 當前大限、小限、流年資訊
- 農曆月份及公曆日期範圍
- 流月宮位及宮內主星
- 完整四化系統（本命/大限/小限/流年/流月）

用於規劃年度活動時機。`,
    inputSchema: {
      ...baseBirthInfoFields,
      lunarYear: z.number().int().min(1900).max(2100).describe('The lunar year (Gregorian year) to query'),
    },
  }, async (args) => textResult('ziwei_liuyue', async () => {
    const { normalized } = normalizeBirthInfo(args);

    const result = await ziweiService.calculate({
      year: normalized.year, month: normalized.month, day: normalized.day,
      hour: normalized.hour, gender: normalized.gender,
    });

    const monthlyList = ziweiService.getYearlyMonths(args.lunarYear);

    const mingGongPalace = findMingGong(result);
    const mingGongStars = extractStars(mingGongPalace);

    const lunar = Lunar.fromYmd(args.lunarYear, 1, 1);
    const leapMonth = lunar.getYear() === args.lunarYear
      ? (Lunar.fromYmd(args.lunarYear, 6, 1) as any).getLeapMonth?.()
      : undefined;

    const targetAge = args.lunarYear - normalized.year + 1;

    let currentDecade: { palaceName: string; startAge: number; endAge: number } | undefined;
    if (result.decades && result.decades.length > 0) {
      const matchedDecade = result.decades.find(
        d => targetAge >= d.startAge && targetAge <= d.endAge
      );
      if (matchedDecade) {
        currentDecade = {
          palaceName: matchedDecade.palaceName || result.palaces?.[matchedDecade.palaceIndex]?.name || '未知',
          startAge: matchedDecade.startAge,
          endAge: matchedDecade.endAge,
        };
      }
    }

    const yearlyInfo = YearlyCalculator.calculate(args.lunarYear, normalized.year, result.palaces!);
    let currentYearly: { year: number; age: number; palaceName: string; heavenlyStem: string; earthlyBranch: string } | undefined;
    if (yearlyInfo) {
      const { stem: yearStem, branch: yearBranch } = getYearStemBranch(args.lunarYear);
      currentYearly = {
        year: args.lunarYear,
        age: targetAge,
        palaceName: result.palaces?.[yearlyInfo.palaceIndex]?.name || '未知',
        heavenlyStem: yearStem,
        earthlyBranch: yearBranch,
      };
    }

    const minorLimitInfo = ziweiService.getMinorLimitInfo(normalized.year, args.lunarYear);
    let currentMinorLimit: { age: number; palaceName: string; heavenlyStem: string; earthlyBranch: string } | undefined;
    if (minorLimitInfo) {
      currentMinorLimit = {
        age: minorLimitInfo.age,
        palaceName: result.palaces?.[minorLimitInfo.palaceIndex]?.name || '未知',
        heavenlyStem: minorLimitInfo.heavenlyStem,
        earthlyBranch: minorLimitInfo.earthlyBranch,
      };
    }

    const enhancedMutagenInfo = { ...result.mutagenInfo };
    if (minorLimitInfo?.heavenlyStem) {
      enhancedMutagenInfo.minorLimit = MutagenCore.getMutagen(minorLimitInfo.heavenlyStem) || undefined;
    }

    const options = {
      name: normalized.name,
      birthYear: normalized.year,
      birthMonth: normalized.month,
      birthDay: normalized.day,
      birthHour: normalized.hour,
      birthMinute: normalized.minute,
      gender: normalized.gender,
      mingGong: mingGongPalace?.name || '命宮',
      mingGongStars,
      palaces: result.palaces,
      mutagenInfo: enhancedMutagenInfo,
      lunarYear: args.lunarYear,
      gregorianYear: args.lunarYear,
      leapMonth: typeof leapMonth === 'number' ? leapMonth : undefined,
      currentDecade,
      currentMinorLimit,
      currentYearly,
    };

    return renderZiweiLiuYueList(monthlyList, options);
  }));

  server.registerTool('ziwei_liuri', {
    title: '紫微流日列表',
    description: `紫微流日列表。

返回指定農曆月內的每日運勢（含上下文）：
- 當前大限、流年、流月資訊
- 農曆日期與公曆日期對照
- 干支日及流日宮位
- 完整四化系統（本命/大限/小限/流年/流月/流日）

閏月使用負數表示（如 -6 表示閏六月）。

用於精細的日期選擇。`,
    inputSchema: {
      ...baseBirthInfoFields,
      lunarYear: z.number().int().min(1900).max(2100).describe('The lunar year (Gregorian year)'),
      lunarMonth: z.number().int().min(-12).max(12).describe('Lunar month (1-12, use negative for leap month, e.g. -6 for leap 6th month)'),
    },
  }, async (args) => textResult('ziwei_liuri', async () => {
    const { normalized } = normalizeBirthInfo(args);

    const result = await ziweiService.calculate({
      year: normalized.year, month: normalized.month, day: normalized.day,
      hour: normalized.hour, gender: normalized.gender,
    });

    const isLeapMonth = args.lunarMonth < 0;
    const actualMonth = Math.abs(args.lunarMonth);

    const monthParam = isLeapMonth ? -actualMonth : actualMonth;
    const lunarFirstDay = Lunar.fromYmd(args.lunarYear, monthParam, 1);

    let lastDayNum = 29;
    try {
      Lunar.fromYmd(args.lunarYear, monthParam, 30);
      lastDayNum = 30;
    } catch {
      // Month only has 29 days
    }
    const lunarLastDay = Lunar.fromYmd(args.lunarYear, monthParam, lastDayNum);

    const firstSolar = lunarFirstDay.getSolar();
    const lastSolar = lunarLastDay.getSolar();
    const startDate = new Date(Date.UTC(firstSolar.getYear(), firstSolar.getMonth() - 1, firstSolar.getDay()));
    const endDate = new Date(Date.UTC(lastSolar.getYear(), lastSolar.getMonth() - 1, lastSolar.getDay()));

    const dailyList: ZiweiDailyInfo[] = [];
    for (let day = 1; day <= lastDayNum; day++) {
      try {
        const lunarDay = Lunar.fromYmd(args.lunarYear, monthParam, day);
        const solarDay = lunarDay.getSolar();
        const solarDate = new Date(Date.UTC(solarDay.getYear(), solarDay.getMonth() - 1, solarDay.getDay()));

        const dailyInfo = ziweiService.getDailyInfo(
          solarDay.getYear(), solarDay.getMonth(), solarDay.getDay()
        );

        dailyList.push({
          lunarMonth: actualMonth,
          lunarDay: day,
          isLeapMonth,
          gregorianDate: solarDate,
          ganzhi: dailyInfo ? `${dailyInfo.heavenlyStem}${dailyInfo.earthlyBranch}` : '',
          palaceIndex: dailyInfo?.palaceIndex || 0,
        });
      } catch {
        // Skip invalid dates
      }
    }

    const mingGongPalace = findMingGong(result);
    const mingGongStars = extractStars(mingGongPalace);

    const monthlyInfo = ziweiService.getMonthlyInfo(
      args.lunarYear, actualMonth - 1, actualMonth, isLeapMonth
    );
    const monthlyPalace = monthlyInfo ? result.palaces?.[monthlyInfo.palaceIndex]?.name : undefined;

    const targetAge = args.lunarYear - normalized.year + 1;

    let currentDecade: { palaceName: string; startAge: number; endAge: number } | undefined;
    if (result.decades && result.decades.length > 0) {
      const matchedDecade = result.decades.find(
        d => targetAge >= d.startAge && targetAge <= d.endAge
      );
      if (matchedDecade) {
        currentDecade = {
          palaceName: matchedDecade.palaceName || result.palaces?.[matchedDecade.palaceIndex]?.name || '未知',
          startAge: matchedDecade.startAge,
          endAge: matchedDecade.endAge,
        };
      }
    }

    const yearlyInfo = YearlyCalculator.calculate(args.lunarYear, normalized.year, result.palaces!);
    let currentYearly: { year: number; age: number; palaceName: string; heavenlyStem: string; earthlyBranch: string } | undefined;
    if (yearlyInfo) {
      const { stem: yearStem, branch: yearBranch } = getYearStemBranch(args.lunarYear);
      currentYearly = {
        year: args.lunarYear,
        age: targetAge,
        palaceName: result.palaces?.[yearlyInfo.palaceIndex]?.name || '未知',
        heavenlyStem: yearStem,
        earthlyBranch: yearBranch,
      };
    }

    let currentMonthly: { month: number; palaceName: string; heavenlyStem?: string; earthlyBranch?: string } | undefined;
    if (monthlyInfo) {
      currentMonthly = {
        month: actualMonth,
        palaceName: result.palaces?.[monthlyInfo.palaceIndex]?.name || '未知',
        heavenlyStem: monthlyInfo.heavenlyStem,
        earthlyBranch: monthlyInfo.earthlyBranch,
      };
    }

    const minorLimitInfo = ziweiService.getMinorLimitInfo(normalized.year, args.lunarYear);
    let currentMinorLimit: { age: number; palaceName: string; heavenlyStem: string; earthlyBranch: string } | undefined;
    if (minorLimitInfo) {
      currentMinorLimit = {
        age: minorLimitInfo.age,
        palaceName: result.palaces?.[minorLimitInfo.palaceIndex]?.name || '未知',
        heavenlyStem: minorLimitInfo.heavenlyStem,
        earthlyBranch: minorLimitInfo.earthlyBranch,
      };
    }

    const enhancedMutagenInfo = { ...result.mutagenInfo };
    if (minorLimitInfo?.heavenlyStem) {
      enhancedMutagenInfo.minorLimit = MutagenCore.getMutagen(minorLimitInfo.heavenlyStem) || undefined;
    }
    if (monthlyInfo?.heavenlyStem) {
      enhancedMutagenInfo.monthly = MutagenCore.getMutagen(monthlyInfo.heavenlyStem) || undefined;
    }

    const options = {
      name: normalized.name,
      birthYear: normalized.year,
      birthMonth: normalized.month,
      birthDay: normalized.day,
      birthHour: normalized.hour,
      birthMinute: normalized.minute,
      gender: normalized.gender,
      mingGong: mingGongPalace?.name || '命宮',
      mingGongStars,
      palaces: result.palaces,
      mutagenInfo: enhancedMutagenInfo,
      lunarYear: args.lunarYear,
      lunarMonth: actualMonth,
      isLeapMonth,
      gregorianStartDate: startDate,
      gregorianEndDate: endDate,
      monthlyPalace,
      currentDecade,
      currentMinorLimit,
      currentYearly,
      currentMonthly,
    };

    return renderZiweiLiuRiList(dailyList, options);
  }));
}
