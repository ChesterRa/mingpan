/**
 * 時間歸一化工具
 *
 * 設計原則：
 * 1. 可複現性優先：內部規範表示為北京時間（UTC+8）壁鐘時間，
 *    所有曆法計算（農曆、節氣、干支）均基於北京時間壁鐘分量
 * 2. 輸入層負責歸一化：農曆轉公曆、時區換算都在入口層一次完成
 * 3. 多時區支持（M4）：timezone 為 IANA 時區名（如 America/New_York），
 *    僅對公曆輸入生效；農曆輸入為曆法日期（無時區語義），忽略 timezone
 * 4. 零額外依賴：時區換算基於 Intl.DateTimeFormat（宿主環境無關，跨機器確定性）
 */

import { Lunar } from 'lunar-javascript';

// ============================================
// Constants
// ============================================

/** 北京時區 IANA 標識（內部規範時區） */
export const BEIJING_TZ = 'Asia/Shanghai';

// ============================================
// Types
// ============================================

export interface BirthDateTimeInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  isLunar?: boolean;
  /** IANA 時區名（公曆輸入的所在時區），默認北京時間 */
  timezone?: string;
}

export interface NormalizedBirthDateTime {
  /** 北京時間（內部規範表示）分量 */
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 標記原始輸入是否為農曆（用於輸出顯示） */
  isLunarInput: boolean;
  /** 原始輸入時區（僅當發生時區換算時存在） */
  sourceTimezone?: string;
}

/** 北京壁鐘分量 */
export interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** 北京鐘錶時間落在中國 1986–1991 年夏令時相關時段的判定（僅用於輸出提示，不改變排盤） */
export type BeijingDstStatus =
  /** 處於夏令時（UTC+9）期間；standard 為該鐘錶時間對應的北京標準時 */
  | { kind: 'dst'; clock: WallClock; standard: WallClock }
  /** 夏令時結束日回撥後重複的時段：第一次（夏令時）對應 standard，第二次即標準時本身 */
  | { kind: 'repeated'; clock: WallClock; standard: WallClock }
  /** 夏令時開始日撥快跳過的時段：當日鐘錶上不存在 */
  | { kind: 'skipped'; clock: WallClock };

// ============================================
// Timezone conversion (Intl-based, no deps)
// ============================================

/** 校驗 IANA 時區名，非法時拋出明確錯誤 */
export function validateTimezone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw new Error(`無效的時區標識: ${timeZone}（需為 IANA 名稱，如 America/New_York）`);
  }
}

/**
 * 校驗公曆日期存在（如 4 月 31 日、平年 2 月 29 日）
 * 月 1-12、日 1-31 的範圍由各工具 schema 保證；此處補足各月天數，
 * 避免 Date 把不存在的日期進位到次月後靜默排盤
 */
export function validateSolarDate(year: number, month: number, day: number): void {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) {
    throw new Error(`公曆日期不存在：${year} 年 ${month} 月 ${day} 日（該月只有 ${daysInMonth} 日）`);
  }
}

/** 取某時刻在指定時區的 UTC 偏移量（毫秒，東八區為 +8h） */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string): number => {
    const p = parts.find(x => x.type === type);
    if (!p) throw new Error(`時區偏移解析失敗: ${timeZone}`);
    return Number(p.value);
  };
  const asUTC = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour') % 24, get('minute'), get('second')
  );
  return asUTC - instant.getTime();
}

/**
 * 取某時刻的北京標準時間（UTC+8 平太陽時）壁鐘分量
 *
 * 命理口徑說明：內部規範表示採用固定 UTC+8，而非 Intl 的 Asia/Shanghai 顯示時間。
 * 中國在 1986-1991 年實行過夏令時（夏季 UTC+9），主流排盤實務對夏令時期間的
 * 出生時刻回撥一小時按標準時排盤；固定 +8 算術即這一口徑，且與
 * lunar-javascript 的曆法換算假設一致。
 */
function beijingStandardWallClock(instant: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const t = new Date(instant.getTime() + 8 * 3600 * 1000);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
  };
}

/**
 * 將指定時區的壁鐘時間換算為北京標準時間（UTC+8）壁鐘分量
 *
 * 演算法：先假設輸入為 UTC 得到猜測時刻，再用該時刻的實際偏移量迭代修正
 * （兩輪即可收斂至秒級偏移，第三輪兜底 DST 邊界）。
 * 輸入側使用 Intl（正確處理各國歷史夏令時，如 1986-1991 中國夏令時），
 * 輸出側使用固定 +8（命理標準時口徑），全程與宿主機時區無關。
 */
export function convertToBeijingWallClock(
  input: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number } {
  validateTimezone(timeZone);

  const asUTC = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute);
  let guess = asUTC;
  for (let i = 0; i < 3; i++) {
    guess = asUTC - tzOffsetMs(new Date(guess), timeZone);
  }

  return beijingStandardWallClock(new Date(guess));
}

// ============================================
// China DST 1986–1991 (table-based, no Intl)
// ============================================

const HOUR_MS = 3600 * 1000;

/**
 * 中國大陸 1986–1991 年全國夏令時起止日（[月, 日]；國務院辦公廳通知，與 IANA tzdata Rule PRC 一致）
 * 開始日 02:00 撥快至 03:00，結束日 02:00（夏令時）回撥至 01:00
 */
export const CHINA_DST_PERIODS: Readonly<Record<number, { start: [number, number]; end: [number, number] }>> = {
  1986: { start: [5, 4], end: [9, 14] },
  1987: { start: [4, 12], end: [9, 13] },
  1988: { start: [4, 17], end: [9, 11] },
  1989: { start: [4, 16], end: [9, 17] },
  1990: { start: [4, 15], end: [9, 16] },
  1991: { start: [4, 14], end: [9, 15] },
};

/**
 * 判定北京鐘錶時間是否落在中國 1986–1991 年夏令時相關時段
 *
 * 未提供 timezone 時，輸入按北京標準時（UTC+8）直接排盤，不扣夏令時；
 * 但這六年夏季的鐘錶讀數是夏令時（UTC+9）。判定三種情況：
 * - 夏令時期間：開始日 03:00 起至結束日 01:00 前
 * - 結束日 01:00–01:59：回撥後重複的一小時
 * - 開始日 02:00–02:59：撥快跳過的一小時
 * 1919 年與 1940 年代的夏令時只見於 IANA 的上海地方記錄、各地做法不一，
 * 不在此提示；顯式傳 Asia/Shanghai 時仍按 IANA 換算。純查表，不依賴 Intl。
 */
export function detectBeijingDst(input: WallClock): BeijingDstStatus | undefined {
  const period = CHINA_DST_PERIODS[input.year];
  if (!period) return undefined;

  const clock = { year: input.year, month: input.month, day: input.day, hour: input.hour, minute: input.minute };
  const t = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute);
  const on = ([month, day]: [number, number], hour: number) => Date.UTC(clock.year, month - 1, day, hour);
  // 夏令時讀數（UTC+9）對應的北京標準時，即早一小時
  const standard = beijingStandardWallClock(new Date(t - 9 * HOUR_MS));

  if (t >= on(period.start, 2) && t < on(period.start, 3)) return { kind: 'skipped', clock };
  if (t >= on(period.end, 1) && t < on(period.end, 2)) return { kind: 'repeated', clock, standard };
  if (t >= on(period.start, 3) && t < on(period.end, 1)) return { kind: 'dst', clock, standard };
  return undefined;
}

// ============================================
// Normalization
// ============================================

/**
 * 歸一化出生（起卦）日期時間至北京時間規範表示
 *
 * 處理順序：
 * 1. 補齊 minute 默認值
 * 2. 農曆輸入：轉換為公曆（農曆為曆法日期，忽略 timezone）
 * 3. 公曆輸入且提供 timezone：換算為北京時間壁鐘
 *
 * @example
 * // 紐約出生，真實出生時刻 1990-06-15 20:30 EDT
 * normalizeBirthDateTime({ year: 1990, month: 6, day: 15, hour: 20, minute: 30, timezone: 'America/New_York' })
 * // => 北京時間 1990-06-16 08:30（次日），用於排盤
 */
export function normalizeBirthDateTime(input: BirthDateTimeInput): NormalizedBirthDateTime {
  const minute = input.minute ?? 0;
  const isLunarInput = !!input.isLunar;

  let solar = { year: input.year, month: input.month, day: input.day, hour: input.hour, minute };

  // 農曆輸入：轉換為公曆（曆法日期無時區語義）
  if (isLunarInput) {
    const lunar = Lunar.fromYmd(input.year, input.month, input.day);
    const s = lunar.getSolar();
    solar = { year: s.getYear(), month: s.getMonth(), day: s.getDay(), hour: input.hour, minute };
    return { ...solar, isLunarInput };
  }

  // 公曆輸入：先確認日期存在，再做時區換算（含北京時區歷史夏令時的歸一化）
  validateSolarDate(solar.year, solar.month, solar.day);
  if (input.timezone) {
    solar = convertToBeijingWallClock(solar, input.timezone);
    return { ...solar, isLunarInput, sourceTimezone: input.timezone };
  }

  return { ...solar, isLunarInput };
}
