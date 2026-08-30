/**
 * 盘类型计算器
 * 处理年盘、月盘的特殊计算逻辑
 *
 * 年盘规则：
 * 1. 阴阳遁：冬至后到夏至前为阳遁，夏至后到冬至前为阴遁
 * 2. 三元：按年支确定 (子午卯酉→上元, 寅申巳亥→中元, 辰戌丑未→下元)
 * 3. 局数：(年干支序数 % 9) + 1
 * 4. 旬首：基于年干支
 * 5. 天盘旋转：值符飞到年干所在宫
 *
 * 月盘规则：
 * 1. 阴阳遁：按月建对应的节气确定
 * 2. 三元：按月支确定（规则同年盘）
 * 3. 局数：使用节气局数表
 * 4. 旬首：基于月干支
 * 5. 天盘旋转：值符飞到月干所在宫
 */

import type { DiZhi, JuShu, YinYangDun, YuanType } from '../types';
import { DI_ZHI, JIA_ZI_60, JIEQI_JU_MAP } from '../data/constants';

// ============= 常量定义 =============

/**
 * 月建对应的节气映射
 * 月建（地支）-> 对应的节气
 */
export const MONTH_JIEQI_MAP: Record<DiZhi, string> = {
  '寅': '立春',   // 正月
  '卯': '惊蛰',   // 二月
  '辰': '清明',   // 三月
  '巳': '立夏',   // 四月
  '午': '芒种',   // 五月
  '未': '小暑',   // 六月
  '申': '立秋',   // 七月
  '酉': '白露',   // 八月
  '戌': '寒露',   // 九月
  '亥': '立冬',   // 十月
  '子': '大雪',   // 十一月
  '丑': '小寒',   // 十二月
};

/**
 * 三元判定表：地支 -> 三元
 * 子午卯酉 → 上元
 * 寅申巳亥 → 中元
 * 辰戌丑未 → 下元
 */
export const DI_ZHI_YUAN_MAP: Record<DiZhi, YuanType> = {
  '子': '上元',
  '午': '上元',
  '卯': '上元',
  '酉': '上元',
  '寅': '中元',
  '申': '中元',
  '巳': '中元',
  '亥': '中元',
  '辰': '下元',
  '戌': '下元',
  '丑': '下元',
  '未': '下元',
};

/**
 * 阳遁节气列表（冬至到芒种）
 */
const YANG_DUN_JIEQI = [
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰',
  '春分', '清明', '谷雨', '立夏', '小满', '芒种'
];

/**
 * 阴遁节气列表（夏至到大雪）
 */
const YIN_DUN_JIEQI = [
  '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'
];

// ============= 年盘计算 =============

/**
 * 年盘阴阳遁判断
 *
 * 口径（2026-08-30 依典籍修正）：《遁甲演义》《奇门遁甲統宗》年奇门起例——
 * 年家奇门只用阴遁，无阳遁（上元阴一、中元阴四、下元阴七）。
 * 此前按节气判阴阳遁，与传统口径不符。
 */
export function getYearPanYinYangDun(_currentJieQi: string): YinYangDun {
  return '阴遁';
}

/**
 * 年盘三元判断
 *
 * 口径（2026-08-30 依典籍修正）：以一百八十年为一大周期，六十年一元——
 * 上元甲子 1864-1923、中元甲子 1924-1983、下元甲子 1984-2043，循环往复。
 * 此前按年支定元，与传统口径不符。
 * @param year 公历年
 */
export function getYearPanYuanByYear(year: number): YuanType {
  const offset = ((year - 1864) % 180 + 180) % 180;
  if (offset < 60) return '上元';
  if (offset < 120) return '中元';
  return '下元';
}

/**
 * 年盘局数
 *
 * 口径（2026-08-30 依典籍修正）：上元六十年阴遁一局、中元阴遁四局、下元阴遁七局
 * （《遁甲演义》「三元年遁」）。此前用 (年干支序数 % 9) + 1 的自造公式，无典籍出处。
 * @param year 公历年
 */
export function getYearPanJuShuByYear(year: number): JuShu {
  const yuan = getYearPanYuanByYear(year);
  return (yuan === '上元' ? 1 : yuan === '中元' ? 4 : 7) as JuShu;
}

// ============= 月盘计算 =============

/**
 * 月盘阴阳遁判断
 * 根据月建对应的节气确定
 * @param monthZhi 月支（月建）
 * @returns 阴阳遁
 */
export function getMonthPanYinYangDun(monthZhi: DiZhi): YinYangDun {
  const jieQi = MONTH_JIEQI_MAP[monthZhi];
  const jieQiInfo = JIEQI_JU_MAP[jieQi];
  if (!jieQiInfo) {
    throw new Error(`无法找到节气信息: ${jieQi}`);
  }
  return jieQiInfo.dun;
}

/**
 * 月盘三元判断
 * 根据月支确定三元（规则同年盘）
 * @param monthZhi 月支
 * @returns 三元
 */
export function getMonthPanYuan(monthZhi: DiZhi): YuanType {
  return DI_ZHI_YUAN_MAP[monthZhi];
}

/**
 * 月盘局数计算
 * 使用月建对应的节气，结合三元查找局数
 * @param monthZhi 月支（月建）
 * @returns 局数 (1-9)
 */
export function getMonthPanJuShu(monthZhi: DiZhi): JuShu {
  const jieQi = MONTH_JIEQI_MAP[monthZhi];
  const yuan = getMonthPanYuan(monthZhi);

  const jieQiInfo = JIEQI_JU_MAP[jieQi];
  if (!jieQiInfo) {
    throw new Error(`无法找到节气信息: ${jieQi}`);
  }

  const yuanIndex = getYuanIndex(yuan);
  return jieQiInfo.ju[yuanIndex];
}

// ============= 辅助函数 =============

/**
 * 获取元索引
 */
function getYuanIndex(yuan: YuanType): 0 | 1 | 2 {
  switch (yuan) {
    case '上元': return 0;
    case '中元': return 1;
    case '下元': return 2;
  }
}

/**
 * 从干支字符串提取地支
 * @param ganZhi 干支字符串（如 "甲子"）
 * @returns 地支
 */
export function extractZhi(ganZhi: string): DiZhi {
  if (ganZhi.length !== 2) {
    throw new Error(`无效的干支格式: ${ganZhi}`);
  }
  return ganZhi.charAt(1) as DiZhi;
}

/**
 * 验证干支是否有效
 * @param ganZhi 干支字符串
 * @returns 是否有效
 */
export function isValidGanZhi(ganZhi: string): boolean {
  return JIA_ZI_60.includes(ganZhi);
}

// ============= 盘类型计算器类 =============

export interface YearPanParams {
  yearGanZhi: string;
  currentJieQi: string;
  /** 公历年（三元按 180 年周期定位） */
  year?: number;
}

export interface MonthPanParams {
  monthGanZhi: string;
}

export interface PanTypeResult {
  yinYangDun: YinYangDun;
  yuan: YuanType;
  juShu: JuShu;
}

/**
 * 盘类型计算器
 * 统一处理年盘、月盘的阴阳遁、三元、局数计算
 */
export class PanTypeCalculator {
  /**
   * 计算年盘参数
   * @param params 年盘参数
   * @returns 阴阳遁、三元、局数
   */
  static calculateYearPan(params: YearPanParams): PanTypeResult {
    const { yearGanZhi, currentJieQi, year } = params;

    if (!isValidGanZhi(yearGanZhi)) {
      throw new Error(`无效的年干支: ${yearGanZhi}`);
    }
    if (year === undefined) {
      throw new Error('年盘计算需要公历年份（用于一百八十年三元定位）');
    }

    return {
      yinYangDun: getYearPanYinYangDun(currentJieQi),
      yuan: getYearPanYuanByYear(year),
      juShu: getYearPanJuShuByYear(year),
    };
  }

  /**
   * 计算月盘参数
   * @param params 月盘参数
   * @returns 阴阳遁、三元、局数
   */
  static calculateMonthPan(params: MonthPanParams): PanTypeResult {
    const { monthGanZhi } = params;

    if (!isValidGanZhi(monthGanZhi)) {
      throw new Error(`无效的月干支: ${monthGanZhi}`);
    }

    const monthZhi = extractZhi(monthGanZhi);

    return {
      yinYangDun: getMonthPanYinYangDun(monthZhi),
      yuan: getMonthPanYuan(monthZhi),
      juShu: getMonthPanJuShu(monthZhi),
    };
  }
}
