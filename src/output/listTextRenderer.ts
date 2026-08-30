/**
 * 運勢列表文本渲染器
 * 遵循 fortune-list-api-design.md v1.1.0 設計規範
 *
 * 核心區分：
 * - 八字流月 = 干支月（節氣月）：以節氣為邊界，寅月~丑月
 * - 紫微流月 = 農曆月：以農曆初一為邊界，正月~臘月
 *
 * 統一輸出頭設計原則（v1.3.0）：
 * - 所有工具首先輸出 === 命主資料 === 和 === 命盤 === 基礎資訊
 * - 命主資料包含公曆和農曆生日信息
 * - 每個工具根據時間層級（大運/大限 → 流年 → 流月 → 流日）分區塊輸出上層資訊
 * - 保持與 fortuneTextRenderer.ts 的格式一致性
 */

import { DaYun, LiuNian, LiuYueInfo, LiuRiInfo } from '../services/bazi/types';
import { DecadeInfo, YearlyInfo, MinorLimitInfo, PALACE_NAMES, MutagenInfo } from '../services/ziwei/types';
import { MonthlyInfo } from '../services/ziwei/calculators/MonthlyCalculator';
import { Lunar, Solar } from 'lunar-javascript';
import { MutagenCore } from '../core/ziwei/MutagenCore';

// ==================== 輔助函數 ====================

/**
 * 格式化日期為 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期時間（包含時分）
 */
function formatDateTime(date: Date): string {
  const dateStr = formatDate(date);
  const hour = date.getUTCHours().toString().padStart(2, '0');
  const minute = date.getUTCMinutes().toString().padStart(2, '0');
  return `${dateStr} ${hour}:${minute}`;
}

/**
 * 根據公曆年份計算干支年
 */
function getGanzhi(year: number): string {
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  // 1984年是甲子年
  const baseYear = 1984;
  const yearDiff = year - baseYear;

  const stemIndex = ((yearDiff % 10) + 10) % 10;
  const branchIndex = ((yearDiff % 12) + 12) % 12;

  return STEMS[stemIndex] + BRANCHES[branchIndex];
}

/**
 * 農曆月份名稱
 */
const LUNAR_MONTH_NAMES = [
  '', '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '臘月'
];

/**
 * 農曆日期名稱
 */
function getLunarDayName(day: number): string {
  const DAYS1 = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十'];
  const DAYS2 = ['十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  const DAYS3 = ['廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  if (day <= 10) return DAYS1[day - 1];
  if (day <= 20) return DAYS2[day - 11];
  return DAYS3[day - 21];
}

/**
 * 時辰名稱映射（小時 -> 時辰）
 */
const HOUR_TO_SHICHEN: Record<number, string> = {
  23: '子時', 0: '子時',
  1: '丑時', 2: '丑時',
  3: '寅時', 4: '寅時',
  5: '卯時', 6: '卯時',
  7: '辰時', 8: '辰時',
  9: '巳時', 10: '巳時',
  11: '午時', 12: '午時',
  13: '未時', 14: '未時',
  15: '申時', 16: '申時',
  17: '酉時', 18: '酉時',
  19: '戌時', 20: '戌時',
  21: '亥時', 22: '亥時'
};

/**
 * 獲取時辰名稱
 */
function getShichenName(hour: number): string {
  return HOUR_TO_SHICHEN[hour] || '未知時';
}

/**
 * 格式化農曆生日信息
 * 格式：干支年+農曆月+農曆日+時辰（如：乙丑年正月廿三午時）
 */
function formatLunarBirthday(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  birthHour: number
): string {
  try {
    const solar = Solar.fromYmd(birthYear, birthMonth, birthDay);
    const lunar = solar.getLunar();
    
    const yearGanzhi = lunar.getYearInGanZhi();
    const lunarMonth = lunar.getMonth();
    const lunarDay = lunar.getDay();
    const isLeapMonth = lunar.getMonth() < 0;
    
    const monthName = LUNAR_MONTH_NAMES[Math.abs(lunarMonth)] || `${Math.abs(lunarMonth)}月`;
    const leapPrefix = isLeapMonth ? '閏' : '';
    const dayName = getLunarDayName(lunarDay);
    const shichen = getShichenName(birthHour);
    
    return `${yearGanzhi}年${leapPrefix}${monthName}${dayName}${shichen}`;
  } catch (e) {
    return '';
  }
}

/**
 * 節氣起止資訊
 */
const SOLAR_TERM_MONTHS: { [key: number]: { term: string; nextTerm: string } } = {
  1: { term: '立春', nextTerm: '惊蛰' },
  2: { term: '惊蛰', nextTerm: '清明' },
  3: { term: '清明', nextTerm: '立夏' },
  4: { term: '立夏', nextTerm: '芒种' },
  5: { term: '芒种', nextTerm: '小暑' },
  6: { term: '小暑', nextTerm: '立秋' },
  7: { term: '立秋', nextTerm: '白露' },
  8: { term: '白露', nextTerm: '寒露' },
  9: { term: '寒露', nextTerm: '立冬' },
  10: { term: '立冬', nextTerm: '大雪' },
  11: { term: '大雪', nextTerm: '小寒' },
  12: { term: '小寒', nextTerm: '立春' }
};

// ==================== 統一頭部渲染函數 ====================

/**
 * 八字基礎頭部選項（擴展自 BaziListOptions）
 */
export interface BaziBaseHeaderOptions {
  name?: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  gender: 'male' | 'female';
  dayMaster: string;
  // 四柱資訊（用於頭部顯示）
  yearPillar?: { stem: string; branch: string };
  monthPillar?: { stem: string; branch: string };
  dayPillar?: { stem: string; branch: string };
  hourPillar?: { stem: string; branch: string };
}

/**
 * 紫微基礎頭部選項
 */
export interface ZiweiBaseHeaderOptions {
  name?: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  gender: 'male' | 'female';
  mingGong: string;
  mingGongStars: string[];
  mingGongHeavenlyStem?: string;
  mingGongEarthlyBranch?: string;
  shenGong?: string;
  shenGongStars?: string[];
  palaces?: any[];
  mutagenInfo?: any;
}

/**
 * 渲染八字統一頭部
 * 格式：=== 命主資料 === + === 八字命盤 ===
 */
function renderBaziBaseHeader(options: BaziBaseHeaderOptions): string[] {
  const lines: string[] = [];
  const genderText = options.gender === 'male' ? '男' : '女';

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateTimeStr = `${options.birthYear}-${pad(options.birthMonth)}-${pad(options.birthDay)} ${pad(options.birthHour)}:${pad(options.birthMinute || 0)}:00`;

  const lunarBirthday = formatLunarBirthday(options.birthYear, options.birthMonth, options.birthDay, options.birthHour);

  lines.push('=== 命主資料 ===');
  lines.push(`性別：${genderText}`);
  lines.push(`公曆：${dateTimeStr}`);
  if (lunarBirthday) {
    lines.push(`農曆：${lunarBirthday}`);
  }
  lines.push('');

  lines.push('=== 八字命盤 ===');
  if (options.yearPillar && options.monthPillar && options.dayPillar && options.hourPillar) {
    lines.push(`年柱：${options.yearPillar.stem}${options.yearPillar.branch} 月柱：${options.monthPillar.stem}${options.monthPillar.branch} 日柱：${options.dayPillar.stem}${options.dayPillar.branch} 時柱：${options.hourPillar.stem}${options.hourPillar.branch}`);
  }
  lines.push(`日主：${options.dayMaster}`);
  lines.push('');

  return lines;
}

/**
 * 渲染紫微統一頭部
 * 格式：=== 命主資料 === + === 紫微命盘 ===
 */
function renderZiweiBaseHeader(options: ZiweiBaseHeaderOptions): string[] {
  const lines: string[] = [];
  const genderText = options.gender === 'male' ? '男' : '女';

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateTimeStr = `${options.birthYear}-${pad(options.birthMonth)}-${pad(options.birthDay)} ${pad(options.birthHour)}:${pad(options.birthMinute || 0)}:00`;

  const lunarBirthday = formatLunarBirthday(options.birthYear, options.birthMonth, options.birthDay, options.birthHour);

  lines.push('=== 命主資料 ===');
  lines.push(`性別：${genderText}`);
  lines.push(`公曆：${dateTimeStr}`);
  if (lunarBirthday) {
    lines.push(`農曆：${lunarBirthday}`);
  }
  lines.push('');

  lines.push('=== 紫微命盘 ===');

  const hb = (options.mingGongHeavenlyStem && options.mingGongEarthlyBranch)
    ? ` ${options.mingGongHeavenlyStem}${options.mingGongEarthlyBranch}`
    : '';
  const starsText = options.mingGongStars.length > 0
    ? options.mingGongStars.join('、')
    : '無主星';
  lines.push(`本命命宮${hb}：${starsText}`);

  lines.push(`本命身宮：${options.shenGong || '命宮'}`);
  lines.push('');

  return lines;
}

/**
 * 格式化四化資訊為文本行（用於統一頭部）
 */
function formatMutagenLineForHeader(label: string, info?: any): string {
  if (!info) return '';
  const parts: string[] = [];
  if (info.lu) parts.push(`化祿-${info.lu}`);
  if (info.quan) parts.push(`化權-${info.quan}`);
  if (info.ke) parts.push(`化科-${info.ke}`);
  if (info.ji) parts.push(`化忌-${info.ji}`);
  return parts.length ? `${label}：${parts.join(' ')}` : '';
}

// ==================== 八字列表渲染器 ====================

export interface BaziListOptions {
  name?: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  gender: 'male' | 'female';
  dayMaster: string;
  // 擴展：四柱資訊用於統一頭部
  yearPillar?: { stem: string; branch: string };
  monthPillar?: { stem: string; branch: string };
  dayPillar?: { stem: string; branch: string };
  hourPillar?: { stem: string; branch: string };
}

/**
 * 渲染八字大運列表
 * 統一頭部格式：=== 命主資料 === + === 八字命盤 === + === 大運資訊 ===
 */
export function renderBaziDaYunList(
  daYunList: DaYun[],
  options: BaziListOptions & {
    direction: '顺行' | '逆行';
    startAge: number;
    startYear: number;
  }
): string {
  const lines: string[] = [];

  if (options.yearPillar && options.monthPillar && options.dayPillar && options.hourPillar) {
    lines.push(...renderBaziBaseHeader(options));
  } else {
    const genderText = options.gender === 'male' ? '男' : '女';
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateTimeStr = `${options.birthYear}-${pad(options.birthMonth)}-${pad(options.birthDay)} ${pad(options.birthHour)}:${pad(options.birthMinute || 0)}:00`;
    const lunarBirthday = formatLunarBirthday(options.birthYear, options.birthMonth, options.birthDay, options.birthHour);

    lines.push('=== 命主資料 ===');
    lines.push(`性別：${genderText}`);
    lines.push(`公曆：${dateTimeStr}`);
    if (lunarBirthday) {
      lines.push(`農曆：${lunarBirthday}`);
    }
    lines.push('');
    lines.push('=== 八字命盤 ===');
    lines.push(`日主：${options.dayMaster}`);
    lines.push('');
  }

  lines.push('=== 大運資訊 ===');
  lines.push(`大運方向：${options.direction}`);
  lines.push(`起運年齡：${options.startAge}周歲（${options.startYear}年起運）`);
  lines.push('');

  lines.push('序號 | 大運干支 | 起止虛歲 | 起止公曆年');
  lines.push('-----|---------|---------|----------');

  for (const daYun of daYunList) {
    const index = (daYun.index + 1).toString().padStart(3, ' ');
    const ganzhi = daYun.stem + daYun.branch;
    const ageRange = `${daYun.startAge}-${daYun.endAge}歲`;
    const yearRange = `${daYun.startYear}-${daYun.endYear}年`;

    lines.push(`${index}  | ${ganzhi.padEnd(6, ' ')} | ${ageRange.padEnd(8, ' ')} | ${yearRange}`);
  }

  return lines.join('\n');
}

/**
 * 渲染八字流年列表
 * 統一頭部格式：=== 命主資料 === + === 八字命盤 === + === 流年資訊 ===
 */
export function renderBaziLiuNianList(
  liuNianList: LiuNian[],
  options: BaziListOptions & {
    startYear: number;
    endYear: number;
    currentDaYun?: { stem: string; branch: string; startAge: number; endAge: number };
    daYunList?: DaYun[];
  }
): string {
  const lines: string[] = [];

  if (options.yearPillar && options.monthPillar && options.dayPillar && options.hourPillar) {
    lines.push(...renderBaziBaseHeader(options));
  } else {
    const genderText = options.gender === 'male' ? '男' : '女';
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateTimeStr = `${options.birthYear}-${pad(options.birthMonth)}-${pad(options.birthDay)} ${pad(options.birthHour)}:${pad(options.birthMinute || 0)}:00`;
    const lunarBirthday = formatLunarBirthday(options.birthYear, options.birthMonth, options.birthDay, options.birthHour);

    lines.push('=== 命主資料 ===');
    lines.push(`性別：${genderText}`);
    lines.push(`公曆：${dateTimeStr}`);
    if (lunarBirthday) {
      lines.push(`農曆：${lunarBirthday}`);
    }
    lines.push('');
    lines.push('=== 八字命盤 ===');
    lines.push(`日主：${options.dayMaster}`);
    lines.push('');
  }

  lines.push('=== 流年資訊 ===');
  lines.push(`查詢範圍：${options.startYear}-${options.endYear}年`);
  lines.push('');

  lines.push('公曆年 | 干支年 | 虛歲 | 所屬大運');
  lines.push('-------|-------|------|--------');

  for (const liuNian of liuNianList) {
    const year = `${liuNian.year}年`;
    const ganzhi = `${liuNian.stem}${liuNian.branch}年`;
    const age = `${liuNian.age}歲`;

    let daYunLabel = '-';
    if (options.daYunList && options.daYunList.length > 0) {
      const matchedDaYun = options.daYunList.find(
        dy => liuNian.age >= dy.startAge && liuNian.age <= dy.endAge
      );
      if (matchedDaYun) {
        daYunLabel = `${matchedDaYun.stem}${matchedDaYun.branch}（${matchedDaYun.startAge}-${matchedDaYun.endAge}歲）`;
      }
    }

    lines.push(`${year} | ${ganzhi} | ${age.padEnd(5, ' ')} | ${daYunLabel}`);
  }

  return lines.join('\n');
}

/**
 * 渲染八字流月列表（干支月/節氣月）
 * 統一頭部格式：=== 命主資料 === + === 八字命盤 === + === 大運資訊 === + === 流年資訊 === + === 流月列表 ===
 */
export function renderBaziLiuYueList(
  liuYueList: LiuYueInfo[],
  options: BaziListOptions & {
    ganzhiYear: string;
    gregorianYear: number;
    currentDaYun?: { stem: string; branch: string; startAge: number; endAge: number };
    currentLiuNian?: { stem: string; branch: string; age: number };
  }
): string {
  const lines: string[] = [];

  if (options.yearPillar && options.monthPillar && options.dayPillar && options.hourPillar) {
    lines.push(...renderBaziBaseHeader(options));
  } else {
    const genderText = options.gender === 'male' ? '男' : '女';
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateTimeStr = `${options.birthYear}-${pad(options.birthMonth)}-${pad(options.birthDay)} ${pad(options.birthHour)}:${pad(options.birthMinute || 0)}:00`;
    const lunarBirthday = formatLunarBirthday(options.birthYear, options.birthMonth, options.birthDay, options.birthHour);

    lines.push('=== 命主資料 ===');
    lines.push(`性別：${genderText}`);
    lines.push(`公曆：${dateTimeStr}`);
    if (lunarBirthday) {
      lines.push(`農曆：${lunarBirthday}`);
    }
    lines.push('');
    lines.push('=== 八字命盤 ===');
    lines.push(`日主：${options.dayMaster}`);
    lines.push('');
  }

  if (options.currentDaYun) {
    lines.push('=== 大運資訊 ===');
    lines.push(`當前大運：${options.currentDaYun.stem}${options.currentDaYun.branch}（${options.currentDaYun.startAge}-${options.currentDaYun.endAge}歲）`);
    lines.push('');
  }

  if (options.currentLiuNian) {
    lines.push('=== 流年資訊 ===');
    lines.push(`當前流年：${options.currentLiuNian.stem}${options.currentLiuNian.branch}年（${options.currentLiuNian.age}歲）`);
    lines.push(`干支年：${options.ganzhiYear}年（公曆${options.gregorianYear}年）`);
    lines.push('');
  }

  lines.push('=== 流月列表 ===');
  lines.push('');

  lines.push('序號 | 干支月 | 節氣起止 | 公曆日期範圍');
  lines.push('-----|-------|---------|-------------');

  for (const liuYue of liuYueList) {
    const index = liuYue.month.toString().padStart(3, ' ');
    const ganzhi = `${liuYue.stem}${liuYue.branch}月`;

    const solarTermInfo = SOLAR_TERM_MONTHS[liuYue.month] || { term: '-', nextTerm: '-' };
    const solarTermRange = `${solarTermInfo.term}-${solarTermInfo.nextTerm}`;

    const dateRange = `${formatDate(liuYue.startDate)} ~ ${formatDate(liuYue.endDate)}`;

    lines.push(`${index}  | ${ganzhi.padEnd(5, ' ')} | ${solarTermRange.padEnd(8, ' ')} | ${dateRange}`);
  }

  const lastMonth = liuYueList[liuYueList.length - 1];
  if (lastMonth && lastMonth.endDate.getUTCFullYear() > options.gregorianYear) {
    lines.push('');
    lines.push(`注：${lastMonth.stem}${lastMonth.branch}月雖然公曆日期在${lastMonth.endDate.getUTCFullYear()}年，但仍屬於${options.ganzhiYear}干支年。`);
  }

  return lines.join('\n');
}

/**
 * 渲染八字流日列表
 * 統一頭部格式：=== 命主資料 === + === 八字命盤 === + === 大運資訊 === + === 流年資訊 === + === 流月資訊 === + === 流日列表 ===
 */
export function renderBaziLiuRiList(
  liuRiList: LiuRiInfo[],
  options: BaziListOptions & {
    ganzhiMonth: string;
    ganzhiYear: string;
    gregorianYear: number;
    startDate: Date;
    endDate: Date;
    currentDaYun?: { stem: string; branch: string; startAge: number; endAge: number };
    currentLiuNian?: { stem: string; branch: string; age: number };
    currentLiuYue?: { stem: string; branch: string; month: number };
  }
): string {
  const lines: string[] = [];

  if (options.yearPillar && options.monthPillar && options.dayPillar && options.hourPillar) {
    lines.push(...renderBaziBaseHeader(options));
  } else {
    const genderText = options.gender === 'male' ? '男' : '女';
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateTimeStr = `${options.birthYear}-${pad(options.birthMonth)}-${pad(options.birthDay)} ${pad(options.birthHour)}:${pad(options.birthMinute || 0)}:00`;
    const lunarBirthday = formatLunarBirthday(options.birthYear, options.birthMonth, options.birthDay, options.birthHour);

    lines.push('=== 命主資料 ===');
    lines.push(`性別：${genderText}`);
    lines.push(`公曆：${dateTimeStr}`);
    if (lunarBirthday) {
      lines.push(`農曆：${lunarBirthday}`);
    }
    lines.push('');
    lines.push('=== 八字命盤 ===');
    lines.push(`日主：${options.dayMaster}`);
    lines.push('');
  }

  if (options.currentDaYun) {
    lines.push('=== 大運資訊 ===');
    lines.push(`當前大運：${options.currentDaYun.stem}${options.currentDaYun.branch}（${options.currentDaYun.startAge}-${options.currentDaYun.endAge}歲）`);
    lines.push('');
  }

  if (options.currentLiuNian) {
    lines.push('=== 流年資訊 ===');
    lines.push(`當前流年：${options.currentLiuNian.stem}${options.currentLiuNian.branch}年（${options.currentLiuNian.age}歲）`);
    lines.push('');
  }

  if (options.currentLiuYue) {
    lines.push('=== 流月資訊 ===');
    lines.push(`當前流月：${options.currentLiuYue.stem}${options.currentLiuYue.branch}月（第${options.currentLiuYue.month}月）`);
    lines.push(`干支月：${options.ganzhiMonth}月（${options.ganzhiYear}年，公曆${formatDate(options.startDate)} ~ ${formatDate(options.endDate)}）`);
    lines.push('');
  }

  lines.push('=== 流日列表 ===');
  lines.push('');

  lines.push('公曆日期 | 干支日');
  lines.push('---------|-------');

  for (const liuRi of liuRiList) {
    const dateStr = formatDate(liuRi.date);
    const ganzhi = `${liuRi.stem}${liuRi.branch}日`;

    lines.push(`${dateStr} | ${ganzhi}`);
  }

  lines.push('');
  lines.push(`共${liuRiList.length}日`);

  return lines.join('\n');
}

// ==================== 紫微列表渲染器 ====================

export interface ZiweiListOptions {
  name?: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  gender: 'male' | 'female';
  mingGong: string;
  mingGongStars: string[];
  shenGong?: string;
  shenGongStars?: string[];
  palaces?: any[];  // 完整宮位數據，用於獲取各宫主星
  mutagenInfo?: any; // 四化資訊（包含 natal, decadal, yearly 等）
}

/**
 * 根據palaceIndex獲取宮位主星
 * 更健壯的查找邏輯：先嘗試index匹配，再嘗試陣列索引
 */
function getPalaceStars(palaces: any[] | undefined, palaceIndex: number): string {
  if (!palaces || palaces.length === 0) return '-';

  // 方法1：通過index屬性匹配
  let palace = palaces.find(p => p.index === palaceIndex);

  // 方法2：如果沒找到，直接使用陣列索引
  if (!palace && palaceIndex >= 0 && palaceIndex < palaces.length) {
    palace = palaces[palaceIndex];
  }

  // 方法3：如果還沒找到，嘗試通過地支匹配（備用方案）
  if (!palace) {
    const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const branch = BRANCHES[palaceIndex % 12];
    palace = palaces.find(p => p.earthlyBranch === branch);
  }

  if (!palace) return '-';

  // 獲取主星
  if (palace.majorStars && palace.majorStars.length > 0) {
    return palace.majorStars.map((s: any) => typeof s === 'string' ? s : s.name).join('、');
  }

  // 空宮標記
  return '空宮';
}

/**
 * 格式化四化資訊為文本行
 */
function formatMutagenLine(label: string, info?: any): string {
  if (!info) return '';
  const parts: string[] = [];
  if (info.lu) parts.push(`化祿-${info.lu}`);
  if (info.quan) parts.push(`化權-${info.quan}`);
  if (info.ke) parts.push(`化科-${info.ke}`);
  if (info.ji) parts.push(`化忌-${info.ji}`);
  return parts.length ? `${label}：${parts.join(' ')}` : '';
}

/**
 * 渲染紫微大限列表
 * 統一頭部格式：=== 命主資料 === + === 紫微命盤 === + === 大限資訊 ===
 */
export function renderZiweiDaXianList(
  decades: DecadeInfo[],
  options: ZiweiListOptions & {
    direction: '顺行' | '逆行';
    mingGongHeavenlyStem?: string;
    mingGongEarthlyBranch?: string;
  }
): string {
  const lines: string[] = [];

  lines.push(...renderZiweiBaseHeader({
    name: options.name,
    birthYear: options.birthYear,
    birthMonth: options.birthMonth,
    birthDay: options.birthDay,
    birthHour: options.birthHour,
    birthMinute: options.birthMinute,
    gender: options.gender,
    mingGong: options.mingGong,
    mingGongStars: options.mingGongStars,
    mingGongHeavenlyStem: options.mingGongHeavenlyStem,
    mingGongEarthlyBranch: options.mingGongEarthlyBranch,
    shenGong: options.shenGong,
    shenGongStars: options.shenGongStars,
    palaces: options.palaces,
    mutagenInfo: options.mutagenInfo,
  }));

  lines.push('=== 大限資訊 ===');
  lines.push(`大限方向：${options.direction}`);
  lines.push('');

  lines.push('序號 | 虛歲範圍 | 公曆年範圍 | 大限宮位 | 宮內主星 | 大限四化');
  lines.push('-----|---------|-----------|---------|--------|--------');

  for (const decade of decades) {
    const index = (decade.index + 1).toString().padStart(3, ' ');
    const ageRange = `${decade.startAge}-${decade.endAge}歲`;
    const yearRange = `${options.birthYear + decade.startAge - 1}-${options.birthYear + decade.endAge - 1}`;
    const palaceName = decade.palaceName || PALACE_NAMES[decade.palaceIndex] || '-';

    const stars = getPalaceStars(options.palaces, decade.palaceIndex);

    let decadeMutagenStr = '-';
    if (decade.heavenlyStem) {
      const mutagen = MutagenCore.getMutagen(decade.heavenlyStem);
      if (mutagen) {
        const parts: string[] = [];
        if (mutagen.lu) parts.push(`祿${mutagen.lu}`);
        if (mutagen.quan) parts.push(`權${mutagen.quan}`);
        if (mutagen.ke) parts.push(`科${mutagen.ke}`);
        if (mutagen.ji) parts.push(`忌${mutagen.ji}`);
        decadeMutagenStr = parts.join(' ');
      }
    }

    lines.push(`${index}  | ${ageRange.padEnd(8, ' ')} | ${yearRange.padEnd(10, ' ')} | ${palaceName.padEnd(6, ' ')} | ${stars.padEnd(15, ' ')} | ${decadeMutagenStr}`);
  }

  if (options.mutagenInfo) {
    lines.push('');
    const natalLine = formatMutagenLine('本命四化', options.mutagenInfo.natal);
    if (natalLine) lines.push(natalLine);
  }

  return lines.join('\n');
}

/**
 * 渲染紫微小限列表
 * 統一頭部格式：=== 命主資料 === + === 紫微命盤 === + === 大限資訊 === + === 小限列表 ===
 */
export function renderZiweiXiaoXianList(
  minorLimitList: MinorLimitInfo[],
  options: ZiweiListOptions & {
    startAge: number;
    endAge: number;
    currentDecade?: { palaceName: string; startAge: number; endAge: number };
    decades?: DecadeInfo[];
    mingGongHeavenlyStem?: string;
    mingGongEarthlyBranch?: string;
  }
): string {
  const lines: string[] = [];

  lines.push(...renderZiweiBaseHeader({
    name: options.name,
    birthYear: options.birthYear,
    birthMonth: options.birthMonth,
    birthDay: options.birthDay,
    birthHour: options.birthHour,
    birthMinute: options.birthMinute,
    gender: options.gender,
    mingGong: options.mingGong,
    mingGongStars: options.mingGongStars,
    mingGongHeavenlyStem: options.mingGongHeavenlyStem,
    mingGongEarthlyBranch: options.mingGongEarthlyBranch,
    shenGong: options.shenGong,
    shenGongStars: options.shenGongStars,
    palaces: options.palaces,
    mutagenInfo: options.mutagenInfo,
  }));

  if (options.currentDecade) {
    lines.push('=== 大限資訊 ===');
    lines.push(`當前大限：${options.currentDecade.palaceName}限（${options.currentDecade.startAge}-${options.currentDecade.endAge}歲）`);
    lines.push('');
  }

  lines.push('=== 小限列表 ===');
  lines.push(`查詢範圍：${options.startAge}-${options.endAge}歲`);
  lines.push('');

  lines.push('虛歲 | 公曆年 | 小限干支 | 小限宮位 | 宮內主星 | 所屬大限 | 小限四化');
  lines.push('-----|-------|---------|---------|---------|--------|--------');

  for (const minorLimit of minorLimitList) {
    const age = `${minorLimit.age}歲`;
    const year = `${minorLimit.year}年`;
    const ganzhi = `${minorLimit.heavenlyStem}${minorLimit.earthlyBranch}`;
    
    let palaceName = '-';
    if (options.palaces && minorLimit.palaceIndex >= 0 && minorLimit.palaceIndex < options.palaces.length) {
      palaceName = options.palaces[minorLimit.palaceIndex]?.name || '-';
    }

    const stars = getPalaceStars(options.palaces, minorLimit.palaceIndex);

    let decadeLabel = '-';
    if (options.decades && options.decades.length > 0) {
      const matchedDecade = options.decades.find(
        d => minorLimit.age >= d.startAge && minorLimit.age <= d.endAge
      );
      if (matchedDecade) {
        decadeLabel = `${matchedDecade.palaceName}（${matchedDecade.startAge}-${matchedDecade.endAge}歲）`;
      }
    }

    let mutagenStr = '-';
    if (minorLimit.heavenlyStem) {
      const mutagen = MutagenCore.getMutagen(minorLimit.heavenlyStem);
      if (mutagen) {
        const parts: string[] = [];
        if (mutagen.lu) parts.push(`祿${mutagen.lu}`);
        if (mutagen.quan) parts.push(`權${mutagen.quan}`);
        if (mutagen.ke) parts.push(`科${mutagen.ke}`);
        if (mutagen.ji) parts.push(`忌${mutagen.ji}`);
        mutagenStr = parts.join(' ');
      }
    }

    lines.push(`${age.padEnd(5, ' ')} | ${year} | ${ganzhi.padEnd(6, ' ')} | ${palaceName.padEnd(6, ' ')} | ${stars.padEnd(15, ' ')} | ${decadeLabel} | ${mutagenStr}`);
  }

  lines.push('');
  if (options.mutagenInfo) {
    const natalLine = formatMutagenLine('本命四化', options.mutagenInfo.natal);
    if (natalLine) lines.push(natalLine);
  }

  if (options.decades && options.decades.length > 0) {
    const involvedDecades = new Map<number, DecadeInfo>();
    for (const minorLimit of minorLimitList) {
      const matchedDecade = options.decades.find(
        d => minorLimit.age >= d.startAge && minorLimit.age <= d.endAge
      );
      if (matchedDecade && !involvedDecades.has(matchedDecade.index)) {
        involvedDecades.set(matchedDecade.index, matchedDecade);
      }
    }

    const sortedDecades = Array.from(involvedDecades.values()).sort((a, b) => a.index - b.index);
    for (const decade of sortedDecades) {
      if (decade.heavenlyStem) {
        const mutagen = MutagenCore.getMutagen(decade.heavenlyStem);
        if (mutagen) {
          const parts: string[] = [];
          if (mutagen.lu) parts.push(`化祿-${mutagen.lu}`);
          if (mutagen.quan) parts.push(`化權-${mutagen.quan}`);
          if (mutagen.ke) parts.push(`化科-${mutagen.ke}`);
          if (mutagen.ji) parts.push(`化忌-${mutagen.ji}`);
          if (parts.length > 0) {
            const label = `大限四化（${decade.palaceName}限 ${decade.startAge}-${decade.endAge}歲）`;
            lines.push(`${label}：${parts.join(' ')}`);
          }
        }
      }
    }
  }

  lines.push('');
  lines.push('注：');
  lines.push('1. 小限以虛歲計算，每年一宮。');
  lines.push('2. 小限起宮根據出生年支決定，男順女逆行進。');
  lines.push('3. 小限四化為該年小限天干所化。');

  return lines.join('\n');
}

/**
 * 渲染紫微流年列表
 * 統一頭部格式：=== 命主資料 === + === 紫微命盤 === + === 流年資訊 ===
 */
export function renderZiweiLiuNianList(
  yearlyList: YearlyInfo[],
  options: ZiweiListOptions & {
    startYear: number;
    endYear: number;
    currentDecade?: { palaceName: string; startAge: number; endAge: number };
    decades?: DecadeInfo[];
    mingGongHeavenlyStem?: string;
    mingGongEarthlyBranch?: string;
  }
): string {
  const lines: string[] = [];

  lines.push(...renderZiweiBaseHeader({
    name: options.name,
    birthYear: options.birthYear,
    birthMonth: options.birthMonth,
    birthDay: options.birthDay,
    birthHour: options.birthHour,
    birthMinute: options.birthMinute,
    gender: options.gender,
    mingGong: options.mingGong,
    mingGongStars: options.mingGongStars,
    mingGongHeavenlyStem: options.mingGongHeavenlyStem,
    mingGongEarthlyBranch: options.mingGongEarthlyBranch,
    shenGong: options.shenGong,
    shenGongStars: options.shenGongStars,
    palaces: options.palaces,
    mutagenInfo: options.mutagenInfo,
  }));

  lines.push('=== 流年資訊 ===');
  lines.push(`查詢範圍：${options.startYear}-${options.endYear}年`);
  lines.push('');

  lines.push('公曆年 | 干支年 | 虛歲 | 流年宮位 | 宮內主星 | 所屬大限 | 流年四化');
  lines.push('-------|-------|------|---------|---------|--------|--------');

  for (const yearly of yearlyList) {
    const year = `${yearly.year}年`;
    const ganzhi = `${yearly.heavenlyStem}${yearly.earthlyBranch}年`;
    const age = `${yearly.age}歲`;
    
    // 流年宫位：通过 palaceIndex 从 palaces 数组获取宫位名称
    // 注意：palaceIndex 是地支位置索引，需要直接从 palaces 数组获取对应的宫位名
    let palaceName = '-';
    if (options.palaces && yearly.palaceIndex >= 0 && yearly.palaceIndex < options.palaces.length) {
      palaceName = options.palaces[yearly.palaceIndex]?.name || '-';
    }

    const stars = getPalaceStars(options.palaces, yearly.palaceIndex);

    let decadeLabel = '-';
    if (options.decades && options.decades.length > 0) {
      const matchedDecade = options.decades.find(
        d => yearly.age >= d.startAge && yearly.age <= d.endAge
      );
      if (matchedDecade) {
        decadeLabel = `${matchedDecade.palaceName}（${matchedDecade.startAge}-${matchedDecade.endAge}歲）`;
      }
    } else if (options.currentDecade?.palaceName) {
      decadeLabel = `${options.currentDecade.palaceName}限`;
    }

    let yearlyMutagenStr = '-';
    if (yearly.heavenlyStem) {
      const mutagen = MutagenCore.getMutagen(yearly.heavenlyStem);
      if (mutagen) {
        const parts: string[] = [];
        if (mutagen.lu) parts.push(`祿${mutagen.lu}`);
        if (mutagen.quan) parts.push(`權${mutagen.quan}`);
        if (mutagen.ke) parts.push(`科${mutagen.ke}`);
        if (mutagen.ji) parts.push(`忌${mutagen.ji}`);
        yearlyMutagenStr = parts.join(' ');
      }
    }

    lines.push(`${year} | ${ganzhi} | ${age.padEnd(5, ' ')} | ${palaceName.padEnd(6, ' ')} | ${stars.padEnd(15, ' ')} | ${decadeLabel} | ${yearlyMutagenStr}`);
  }

  lines.push('');
  if (options.mutagenInfo) {
    const natalLine = formatMutagenLine('本命四化', options.mutagenInfo.natal);
    if (natalLine) lines.push(natalLine);
  }

  if (options.decades && options.decades.length > 0) {
    const involvedDecades = new Map<number, DecadeInfo>();
    for (const yearly of yearlyList) {
      const matchedDecade = options.decades.find(
        d => yearly.age >= d.startAge && yearly.age <= d.endAge
      );
      if (matchedDecade && !involvedDecades.has(matchedDecade.index)) {
        involvedDecades.set(matchedDecade.index, matchedDecade);
      }
    }

    const sortedDecades = Array.from(involvedDecades.values()).sort((a, b) => a.index - b.index);
    for (const decade of sortedDecades) {
      if (decade.heavenlyStem) {
        const mutagen = MutagenCore.getMutagen(decade.heavenlyStem);
        if (mutagen) {
          const parts: string[] = [];
          if (mutagen.lu) parts.push(`化祿-${mutagen.lu}`);
          if (mutagen.quan) parts.push(`化權-${mutagen.quan}`);
          if (mutagen.ke) parts.push(`化科-${mutagen.ke}`);
          if (mutagen.ji) parts.push(`化忌-${mutagen.ji}`);
          if (parts.length > 0) {
            const label = `大限四化（${decade.palaceName}限 ${decade.startAge}-${decade.endAge}歲）`;
            lines.push(`${label}：${parts.join(' ')}`);
          }
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * 渲染紫微流月列表（農曆月）
 * 統一頭部格式：=== 命主資料 === + === 紫微命盤 === + === 大限資訊 === + === 小限資訊 === + === 流年資訊 === + === 流月列表 ===
 */
export function renderZiweiLiuYueList(
  monthlyList: MonthlyInfo[],
  options: ZiweiListOptions & {
    lunarYear: number;
    gregorianYear: number;
    yearlyPalace?: string;
    leapMonth?: number;
    mingGongHeavenlyStem?: string;
    mingGongEarthlyBranch?: string;
    currentDecade?: { palaceName: string; startAge: number; endAge: number };
    currentMinorLimit?: { age: number; palaceName: string; heavenlyStem: string; earthlyBranch: string };
    currentYearly?: { year: number; age: number; palaceName: string; heavenlyStem: string; earthlyBranch: string };
  }
): string {
  const lines: string[] = [];

  const ganzhiYear = getGanzhi(options.gregorianYear);

  lines.push(...renderZiweiBaseHeader({
    name: options.name,
    birthYear: options.birthYear,
    birthMonth: options.birthMonth,
    birthDay: options.birthDay,
    birthHour: options.birthHour,
    birthMinute: options.birthMinute,
    gender: options.gender,
    mingGong: options.mingGong,
    mingGongStars: options.mingGongStars,
    mingGongHeavenlyStem: options.mingGongHeavenlyStem,
    mingGongEarthlyBranch: options.mingGongEarthlyBranch,
    shenGong: options.shenGong,
    shenGongStars: options.shenGongStars,
    palaces: options.palaces,
    mutagenInfo: options.mutagenInfo,
  }));

  if (options.currentDecade) {
    lines.push('=== 大限資訊 ===');
    lines.push(`當前大限：${options.currentDecade.palaceName}限（${options.currentDecade.startAge}-${options.currentDecade.endAge}歲）`);
    lines.push('');
  }

  if (options.currentMinorLimit) {
    lines.push('=== 小限資訊 ===');
    lines.push(`當前小限：${options.currentMinorLimit.heavenlyStem}${options.currentMinorLimit.earthlyBranch} ${options.currentMinorLimit.palaceName}（${options.currentMinorLimit.age}歲）`);
    lines.push('');
  }

  if (options.currentYearly) {
    lines.push('=== 流年資訊 ===');
    lines.push(`當前流年：${options.currentYearly.heavenlyStem}${options.currentYearly.earthlyBranch}年 ${options.currentYearly.palaceName}（${options.currentYearly.age}歲）`);
    lines.push(`農曆年：${ganzhiYear}年（公曆${options.gregorianYear}年）`);
    if (options.yearlyPalace) {
      lines.push(`流年宮位：${options.yearlyPalace}`);
    }
    lines.push('');
  }

  lines.push('=== 流月列表 ===');
  lines.push('');

  lines.push('序號 | 農曆月 | 公曆日期範圍 | 流月宮位 | 宮內主星 | 流月四化');
  lines.push('-----|-------|-------------|---------|---------|--------');

  let monthIndex = 0;
  for (const monthly of monthlyList) {
    monthIndex++;
    const index = monthIndex.toString().padStart(3, ' ');

    // 处理闰月名称
    const baseName = LUNAR_MONTH_NAMES[monthly.month] || `${monthly.month}月`;
    const lunarMonthName = monthly.isLeapMonth ? `閏${baseName}` : baseName;

    let dateRange = '-';
    if (monthly.startDate && monthly.endDate) {
      dateRange = `${formatDate(monthly.startDate)} ~ ${formatDate(monthly.endDate)}`;
    }

    // 流月宫位：通过 palaceIndex 从 palaces 数组获取宫位名称
    let palaceName = '-';
    if (options.palaces && monthly.palaceIndex >= 0 && monthly.palaceIndex < options.palaces.length) {
      palaceName = options.palaces[monthly.palaceIndex]?.name || '-';
    }

    const stars = getPalaceStars(options.palaces, monthly.palaceIndex);

    let monthlyMutagenStr = '-';
    if (monthly.heavenlyStem) {
      const mutagen = MutagenCore.getMutagen(monthly.heavenlyStem);
      if (mutagen) {
        const parts: string[] = [];
        if (mutagen.lu) parts.push(`祿${mutagen.lu}`);
        if (mutagen.quan) parts.push(`權${mutagen.quan}`);
        if (mutagen.ke) parts.push(`科${mutagen.ke}`);
        if (mutagen.ji) parts.push(`忌${mutagen.ji}`);
        monthlyMutagenStr = parts.join(' ');
      }
    }

    lines.push(`${index}  | ${lunarMonthName.padEnd(4, ' ')} | ${dateRange.padEnd(25, ' ')} | ${palaceName.padEnd(6, ' ')} | ${stars.padEnd(15, ' ')} | ${monthlyMutagenStr}`);
  }

  if (options.mutagenInfo) {
    lines.push('');
    const natalLine = formatMutagenLine('本命四化', options.mutagenInfo.natal);
    if (natalLine) lines.push(natalLine);
    const decadalLine = formatMutagenLine('大限四化', options.mutagenInfo.decadal);
    if (decadalLine) lines.push(decadalLine);
    const minorLimitLine = formatMutagenLine('小限四化', options.mutagenInfo.minorLimit);
    if (minorLimitLine) lines.push(minorLimitLine);
    const yearlyLine = formatMutagenLine('流年四化', options.mutagenInfo.yearly);
    if (yearlyLine) lines.push(yearlyLine);
  }

  lines.push('');
  lines.push('注：');
  lines.push('1. 紫微流月以農曆月為準，非節氣月。');
  if (options.leapMonth) {
    lines.push(`2. 闰月歸入前一月計算，闰${LUNAR_MONTH_NAMES[options.leapMonth]}按${LUNAR_MONTH_NAMES[options.leapMonth]}論。`);
  }
  lines.push('3. 公曆日期僅供參考，精確邊界以農曆初一為準。');

  return lines.join('\n');
}

/**
 * 紫微流日資訊類型
 */
export interface ZiweiDailyInfo {
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth?: boolean;
  gregorianDate: Date;
  ganzhi: string;
  palaceIndex: number;
}

/**
 * 渲染紫微流日列表（農曆日）
 * 統一頭部格式：=== 命主資料 === + === 紫微命盤 === + === 大限資訊 === + === 小限資訊 === + === 流年資訊 === + === 流月資訊 === + === 流日列表 ===
 */
export function renderZiweiLiuRiList(
  dailyList: ZiweiDailyInfo[],
  options: ZiweiListOptions & {
    lunarYear: number;
    lunarMonth: number;
    isLeapMonth?: boolean;
    gregorianStartDate: Date;
    gregorianEndDate: Date;
    monthlyPalace?: string;
    mingGongHeavenlyStem?: string;
    mingGongEarthlyBranch?: string;
    currentDecade?: { palaceName: string; startAge: number; endAge: number };
    currentMinorLimit?: { age: number; palaceName: string; heavenlyStem: string; earthlyBranch: string };
    currentYearly?: { year: number; age: number; palaceName: string; heavenlyStem: string; earthlyBranch: string };
    currentMonthly?: { month: number; palaceName: string; heavenlyStem?: string; earthlyBranch?: string };
  }
): string {
  const lines: string[] = [];

  const ganzhiYear = getGanzhi(options.lunarYear);
  const monthName = LUNAR_MONTH_NAMES[options.lunarMonth] || `${options.lunarMonth}月`;
  const leapPrefix = options.isLeapMonth ? '閏' : '';

  lines.push(...renderZiweiBaseHeader({
    name: options.name,
    birthYear: options.birthYear,
    birthMonth: options.birthMonth,
    birthDay: options.birthDay,
    birthHour: options.birthHour,
    birthMinute: options.birthMinute,
    gender: options.gender,
    mingGong: options.mingGong,
    mingGongStars: options.mingGongStars,
    mingGongHeavenlyStem: options.mingGongHeavenlyStem,
    mingGongEarthlyBranch: options.mingGongEarthlyBranch,
    shenGong: options.shenGong,
    shenGongStars: options.shenGongStars,
    palaces: options.palaces,
    mutagenInfo: options.mutagenInfo,
  }));

  if (options.currentDecade) {
    lines.push('=== 大限資訊 ===');
    lines.push(`當前大限：${options.currentDecade.palaceName}限（${options.currentDecade.startAge}-${options.currentDecade.endAge}歲）`);
    lines.push('');
  }

  if (options.currentMinorLimit) {
    lines.push('=== 小限資訊 ===');
    lines.push(`當前小限：${options.currentMinorLimit.heavenlyStem}${options.currentMinorLimit.earthlyBranch} ${options.currentMinorLimit.palaceName}（${options.currentMinorLimit.age}歲）`);
    lines.push('');
  }

  if (options.currentYearly) {
    lines.push('=== 流年資訊 ===');
    lines.push(`當前流年：${options.currentYearly.heavenlyStem}${options.currentYearly.earthlyBranch}年 ${options.currentYearly.palaceName}（${options.currentYearly.age}歲）`);
    lines.push('');
  }

  if (options.currentMonthly) {
    lines.push('=== 流月資訊 ===');
    const monthLabel = LUNAR_MONTH_NAMES[options.currentMonthly.month] || `${options.currentMonthly.month}月`;
    lines.push(`當前流月：${monthLabel} ${options.currentMonthly.palaceName}`);
    lines.push(`農曆月：${ganzhiYear}年${leapPrefix}${monthName}（公曆${formatDate(options.gregorianStartDate)} ~ ${formatDate(options.gregorianEndDate)}）`);
    if (options.monthlyPalace) {
      lines.push(`流月宮位：${options.monthlyPalace}`);
    }
    lines.push('');
  }

  lines.push('=== 流日列表 ===');
  lines.push('');

  lines.push('農曆日期 | 公曆日期 | 干支日 | 流日宮位 | 宮內主星 | 流日四化');
  lines.push('--------|---------|-------|--------|--------|--------');

  for (const daily of dailyList) {
    const lunarDate = `${leapPrefix}${monthName}${getLunarDayName(daily.lunarDay)}`;
    const gregorianDate = formatDate(daily.gregorianDate);
    const ganzhiDay = daily.ganzhi + '日';
    
    // 流日宫位：通过 palaceIndex 从 palaces 数组获取宫位名称
    let palaceName = '-';
    if (options.palaces && daily.palaceIndex >= 0 && daily.palaceIndex < options.palaces.length) {
      palaceName = options.palaces[daily.palaceIndex]?.name || '-';
    }

    const stars = getPalaceStars(options.palaces, daily.palaceIndex);

    let dailyMutagenStr = '-';
    if (daily.ganzhi && daily.ganzhi.length >= 1) {
      const dayStem = daily.ganzhi.charAt(0);
      const mutagen = MutagenCore.getMutagen(dayStem);
      if (mutagen) {
        const parts: string[] = [];
        if (mutagen.lu) parts.push(`祿${mutagen.lu}`);
        if (mutagen.quan) parts.push(`權${mutagen.quan}`);
        if (mutagen.ke) parts.push(`科${mutagen.ke}`);
        if (mutagen.ji) parts.push(`忌${mutagen.ji}`);
        dailyMutagenStr = parts.join(' ');
      }
    }

    lines.push(`${lunarDate.padEnd(10, ' ')} | ${gregorianDate} | ${ganzhiDay} | ${palaceName.padEnd(6, ' ')} | ${stars.padEnd(15, ' ')} | ${dailyMutagenStr}`);
  }

  if (options.mutagenInfo) {
    lines.push('');
    const natalLine = formatMutagenLine('本命四化', options.mutagenInfo.natal);
    if (natalLine) lines.push(natalLine);
    const decadalLine = formatMutagenLine('大限四化', options.mutagenInfo.decadal);
    if (decadalLine) lines.push(decadalLine);
    const minorLimitLine = formatMutagenLine('小限四化', options.mutagenInfo.minorLimit);
    if (minorLimitLine) lines.push(minorLimitLine);
    const yearlyLine = formatMutagenLine('流年四化', options.mutagenInfo.yearly);
    if (yearlyLine) lines.push(yearlyLine);
    const monthlyLine = formatMutagenLine('流月四化', options.mutagenInfo.monthly);
    if (monthlyLine) lines.push(monthlyLine);
  }

  lines.push('');
  lines.push(`共${dailyList.length}日`);
  lines.push('');
  lines.push('注：紫微流日以農曆日為準，流日宮位按日支定位。');

  return lines.join('\n');
}
