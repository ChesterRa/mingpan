/**
 * MCP 工具共享 Schema 與輔助函數
 *
 * 各領域工具模組（bazi/ziwei/liuyao/meihua/daliuren/qimen）復用此處的
 * 字段級 Zod schema 與出生信息歸一化邏輯。
 *
 * 設計說明：
 * - registerTool 的 inputSchema 為 ZodRawShape（字段名 → Zod schema），
 *   因此此處導出字段級 schema 而非 z.object
 * - 時間歸一化（農曆轉公曆、時區換算）統一在入口層完成，
 *   服務層只消費北京時間規範分量
 */

import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { normalizeBirthDateTime } from '../utils/timeNormalization';

// ============================================
// 共享字段 Schema
// ============================================

export const yearField = z.number().int().min(1900).max(2100).describe('公曆年 1900-2100');
export const monthField = z.number().int().min(1).max(12).describe('月 1-12');
export const dayField = z.number().int().min(1).max(31).describe('日 1-31');
export const hourField = z.number().int().min(0).max(23).describe('時 0-23');
export const minuteField = z.number().int().min(0).max(59).optional().default(0).describe('分 0-59，默認 0');
export const genderField = z.enum(['male', 'female']).describe('性別（影響大運順逆）');
export const longitudeField = z.number().min(-180).max(180).optional().describe('出生地經度（真太陽時校正，可選）');
export const nameField = z.string().optional().describe('命主姓名（可選）');

export const isLunarField = z.boolean().optional().default(false).describe('輸入日期是否為農曆，默認公曆');

export const timezoneField = z.string().optional().describe(
  'IANA 時區名（如 America/New_York）。默認北京時間；設置後輸入時間按此時區換算為北京時間排盤。農曆輸入時忽略'
);

/** 出生/起卦時間字段（公曆或農曆，含可選時區） */
export const birthTimeFields = {
  year: yearField,
  month: monthField,
  day: dayField,
  hour: hourField,
  minute: minuteField,
  isLunar: isLunarField,
  timezone: timezoneField,
};

/** 完整出生信息字段（含性別與可選經度/姓名） */
export const baseBirthInfoFields = {
  ...birthTimeFields,
  gender: genderField,
  longitude: longitudeField,
  name: nameField,
};

// ============================================
// 出生信息歸一化
// ============================================

export interface NormalizableBirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  isLunar?: boolean;
  timezone?: string;
}

export interface NormalizedBirthInfo<T> {
  normalized: T;
  /** 原始輸入是否為農曆 */
  isLunarInput: boolean;
  /** 發生時區換算時的來源時區 */
  sourceTimezone?: string;
}

/**
 * 歸一化出生信息：農曆→公曆、時區→北京時間
 * 每個工具 handler 開頭調用，得到統一的北京時間分量
 */
export function normalizeBirthInfo<T extends NormalizableBirthInfo>(input: T): NormalizedBirthInfo<T> {
  const normalized = normalizeBirthDateTime({
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    isLunar: input.isLunar,
    timezone: input.timezone,
  });

  return {
    normalized: {
      ...input,
      year: normalized.year,
      month: normalized.month,
      day: normalized.day,
      hour: normalized.hour,
      minute: normalized.minute,
      isLunar: false, // 歸一化後一律為公曆（北京時間）
      timezone: undefined,
    },
    isLunarInput: normalized.isLunarInput,
    sourceTimezone: normalized.sourceTimezone,
  };
}

// ============================================
// 結果輔助
// ============================================

import { Logger } from '../shared/logger';

const logger = new Logger('mingpan');

/**
 * 包裝工具回調：成功返回文本結果，異常返回 isError 結果
 * （與協議錯誤區分，便於 LLM 看到可讀的失敗原因並自行修正參數）
 */
export async function textResult(
  toolName: string,
  fn: () => Promise<string> | string
): Promise<CallToolResult> {
  try {
    const text = await fn();
    return { content: [{ type: 'text', text }] };
  } catch (error) {
    logger.error(`Tool ${toolName} failed`, error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
}

/** 時區換算提示（僅當發生換算時輸出，避免 Agent 對出生時間產生困惑） */
export function timezoneNote(sourceTimezone?: string, isLunarInput?: boolean): string {
  if (!sourceTimezone) return '';
  return `> 注：輸入時間（${sourceTimezone}）已換算為北京時間後排盤。\n\n`;
}

// ============================================
// 干支輔助（列表工具用）
// ============================================

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
const MONTH_BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'] as const;

/** 由公曆年推年干支（以 1984 甲子年為基準） */
export function getYearStemBranch(year: number): { stem: string; branch: string } {
  const yearDiff = year - 1984;
  return {
    stem: STEMS[((yearDiff % 10) + 10) % 10],
    branch: BRANCHES[((yearDiff % 12) + 12) % 12],
  };
}

/** 解析干支年輸入（"乙巳" 或公曆年數字） */
export function parseGanzhiYear(input: string | number): { year: number; ganzhi: string } {
  if (typeof input === 'number') {
    const { stem, branch } = getYearStemBranch(input);
    return { year: input, ganzhi: stem + branch };
  }
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 60; y <= currentYear + 60; y++) {
    const { stem, branch } = getYearStemBranch(y);
    if (stem + branch === input) {
      return { year: y, ganzhi: input };
    }
  }
  const { stem, branch } = getYearStemBranch(currentYear);
  return { year: currentYear, ganzhi: stem + branch };
}

/** 解析干支月輸入（"丙寅" 或月序數字 1-12，1=寅月） */
export function parseGanzhiMonth(input: string | number): number {
  if (typeof input === 'number') {
    return input;
  }
  const branch = input.substring(1, 2);
  const idx = MONTH_BRANCHES.indexOf(branch as (typeof MONTH_BRANCHES)[number]);
  return idx >= 0 ? idx + 1 : 1;
}

/** 五虎遁年起月：由公曆年與月序（1=寅月）推月干支 */
export function getMonthStemBranch(year: number, monthNum: number): { stem: string; branch: string } {
  const branch = MONTH_BRANCHES[(monthNum - 1) % 12];
  const { stem: yearStem } = getYearStemBranch(year);
  const firstMonthStemMap: Record<number, number> = {
    0: 2, 1: 4, 2: 6, 3: 8, 4: 0, 5: 2, 6: 4, 7: 6, 8: 8, 9: 0,
  };
  const monthStemIndex = (firstMonthStemMap[STEMS.indexOf(yearStem as (typeof STEMS)[number])] + monthNum - 1) % 10;
  return { stem: STEMS[monthStemIndex], branch };
}
