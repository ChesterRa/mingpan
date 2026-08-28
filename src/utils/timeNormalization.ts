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

  // 公曆輸入：時區換算（含北京時區歷史夏令時的歸一化）
  if (input.timezone) {
    solar = convertToBeijingWallClock(solar, input.timezone);
    return { ...solar, isLunarInput, sourceTimezone: input.timezone };
  }

  return { ...solar, isLunarInput };
}
