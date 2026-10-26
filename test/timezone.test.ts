/**
 * 多時區換算測試（M4）
 *
 * 驗證點：
 * - 各典型時區壁鐘 → 北京時間壁鐘的換算正確性（含跨日、半小時時區）
 * - DST 邊界的確定性行為
 * - 非法時區報錯清晰
 * - 與宿主機時區無關（間接驗證：實現只依賴 Intl + UTC 算術）
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeBirthDateTime,
  convertToBeijingWallClock,
  detectBeijingDst,
  validateTimezone,
} from '../src/utils/timeNormalization';

describe('convertToBeijingWallClock', () => {
  it('紐約夏令時：1990-06-15 20:30 EDT → 北京 1990-06-16 08:30', () => {
    const r = convertToBeijingWallClock(
      { year: 1990, month: 6, day: 15, hour: 20, minute: 30 },
      'America/New_York'
    );
    expect(r).toEqual({ year: 1990, month: 6, day: 16, hour: 8, minute: 30 });
  });

  it('倫敦冬令時：2024-01-15 06:00 GMT → 北京 2024-01-15 14:00（同日）', () => {
    const r = convertToBeijingWallClock(
      { year: 2024, month: 1, day: 15, hour: 6, minute: 0 },
      'Europe/London'
    );
    expect(r).toEqual({ year: 2024, month: 1, day: 15, hour: 14, minute: 0 });
  });

  it('加爾各答半小時時區：2024-03-10 23:15（UTC+5:30）→ 北京 2024-03-11 01:45', () => {
    const r = convertToBeijingWallClock(
      { year: 2024, month: 3, day: 10, hour: 23, minute: 15 },
      'Asia/Kolkata'
    );
    expect(r).toEqual({ year: 2024, month: 3, day: 11, hour: 1, minute: 45 });
  });

  it('中國夏令時（1986-1991）：1990-06-16 10:00 民用時 → 北京標準時 09:00', () => {
    // 1990 年夏 中國實行夏令時（UTC+9）；命理口徑按標準時（UTC+8）排盤
    const r = convertToBeijingWallClock(
      { year: 1990, month: 6, day: 16, hour: 10, minute: 0 },
      'Asia/Shanghai'
    );
    expect(r).toEqual({ year: 1990, month: 6, day: 16, hour: 9, minute: 0 });
  });

  it('洛杉磯冬令時跨日：2024-12-25 18:00 PST → 北京 2024-12-26 10:00', () => {
    const r = convertToBeijingWallClock(
      { year: 2024, month: 12, day: 25, hour: 18, minute: 0 },
      'America/Los_Angeles'
    );
    expect(r).toEqual({ year: 2024, month: 12, day: 26, hour: 10, minute: 0 });
  });

  it('北京時區輸入：直接透傳', () => {
    const r = convertToBeijingWallClock(
      { year: 2024, month: 6, day: 1, hour: 12, minute: 5 },
      'Asia/Shanghai'
    );
    expect(r).toEqual({ year: 2024, month: 6, day: 1, hour: 12, minute: 5 });
  });

  it('DST 切換日（不存在的本地時刻）：結果仍確定且可複現', () => {
    // 2024-03-10 02:30 在紐約不存在（春季撥快）；斷言兩次調用結果一致且落在合理範圍
    const input = { year: 2024, month: 3, day: 10, hour: 2, minute: 30 };
    const r1 = convertToBeijingWallClock(input, 'America/New_York');
    const r2 = convertToBeijingWallClock(input, 'America/New_York');
    expect(r1).toEqual(r2);
    expect(r1.hour).toBeGreaterThanOrEqual(14);
    expect(r1.hour).toBeLessThanOrEqual(16);
  });

  it('換算結果與宿主機時區無關（UTC 與上海兩種宿主下間接一致）', () => {
    // 實現僅依賴 Intl + UTC 算術；此處驗證往返一致性：
    // 北京壁鐘 → 原時區壁鐘 → 北京壁鐘 應還原
    const beijing = { year: 1990, month: 6, day: 16, hour: 8, minute: 30 };
    const ny = wallClockFromBeijing(beijing, 'America/New_York');
    const back = convertToBeijingWallClock(ny, 'America/New_York');
    expect(back).toEqual(beijing);
  });
});

describe('detectBeijingDst（未傳 timezone 時的北京夏令時判定）', () => {
  // 中國 1986–1991 年夏令時（國務院辦公廳通知；IANA tzdata Rule PRC）：
  // 開始日 02:00 撥快至 03:00，結束日 02:00（夏令時）回撥至 01:00
  const windows = [
    { year: 1986, start: [5, 4], end: [9, 14] },
    { year: 1987, start: [4, 12], end: [9, 13] },
    { year: 1988, start: [4, 17], end: [9, 11] },
    { year: 1989, start: [4, 16], end: [9, 17] },
    { year: 1990, start: [4, 15], end: [9, 16] },
    { year: 1991, start: [4, 14], end: [9, 15] },
  ];

  it.each(windows)('$year 年：開始日 03:00 起為夏令時，結束日 02:00 起恢復標準時', ({ year, start, end }) => {
    const at = ([month, day]: number[], hour: number, minute: number) => ({ year, month, day, hour, minute });
    expect(detectBeijingDst(at(start, 1, 59))).toBeUndefined();
    expect(detectBeijingDst(at(start, 3, 0))).toEqual({ kind: 'dst', clock: at(start, 3, 0), standard: at(start, 2, 0) });
    expect(detectBeijingDst(at(end, 0, 59))).toEqual({
      kind: 'dst', clock: at(end, 0, 59), standard: at([end[0], end[1] - 1], 23, 59),
    });
    expect(detectBeijingDst(at(end, 2, 0))).toBeUndefined();
  });

  it('夏令時期間：1988-07-15 15:30 對應北京標準時 14:30，與傳 Asia/Shanghai 的換算一致', () => {
    const clock = { year: 1988, month: 7, day: 15, hour: 15, minute: 30 };
    expect(detectBeijingDst(clock)).toEqual({ kind: 'dst', clock, standard: { ...clock, hour: 14 } });
    expect(convertToBeijingWallClock(clock, 'Asia/Shanghai')).toEqual({ ...clock, hour: 14 });
  });

  it('夏令時跨日：1990-06-16 00:30 對應北京標準時 1990-06-15 23:30', () => {
    expect(detectBeijingDst({ year: 1990, month: 6, day: 16, hour: 0, minute: 30 })).toMatchObject({
      kind: 'dst',
      standard: { year: 1990, month: 6, day: 15, hour: 23, minute: 30 },
    });
  });

  it('結束日 01:00–01:59 出現兩次：傳 Asia/Shanghai 取第二次，傳 Etc/GMT-9 取第一次（早一小時）', () => {
    for (const minute of [0, 30, 59]) {
      const clock = { year: 1988, month: 9, day: 11, hour: 1, minute };
      const standard = { ...clock, hour: 0 };
      expect(detectBeijingDst(clock)).toEqual({ kind: 'repeated', clock, standard });
      expect(convertToBeijingWallClock(clock, 'Asia/Shanghai')).toEqual(clock);
      expect(convertToBeijingWallClock(clock, 'Etc/GMT-9')).toEqual(standard);
    }
  });

  it('開始日 02:00–02:59 在鐘錶上不存在', () => {
    for (const minute of [0, 30, 59]) {
      const clock = { year: 1988, month: 4, day: 17, hour: 2, minute };
      expect(detectBeijingDst(clock)).toEqual({ kind: 'skipped', clock });
    }
  });

  it('窗口外、1992 年後與 1901 年前的地方平時均不判為夏令時', () => {
    expect(detectBeijingDst({ year: 1988, month: 11, day: 15, hour: 15, minute: 30 })).toBeUndefined();
    expect(detectBeijingDst({ year: 1992, month: 7, day: 15, hour: 15, minute: 30 })).toBeUndefined();
    expect(detectBeijingDst({ year: 2024, month: 8, day: 7, hour: 8, minute: 0 })).toBeUndefined();
    // 1901 年前 Asia/Shanghai 為地方平時 +8:05:43；年末改用 +8 時回撥約 6 分鐘，也不是夏令時
    expect(detectBeijingDst({ year: 1900, month: 7, day: 15, hour: 12, minute: 0 })).toBeUndefined();
    expect(detectBeijingDst({ year: 1900, month: 12, day: 31, hour: 23, minute: 56 })).toBeUndefined();
  });

  it('1919 與 1940 年代只見於 IANA 上海地方記錄的夏令時不提示', () => {
    expect(detectBeijingDst({ year: 1919, month: 6, day: 1, hour: 12, minute: 0 })).toBeUndefined();
    expect(detectBeijingDst({ year: 1943, month: 3, day: 10, hour: 12, minute: 0 })).toBeUndefined();
    expect(detectBeijingDst({ year: 1947, month: 7, day: 1, hour: 12, minute: 0 })).toBeUndefined();
  });

  it('起止表與 IANA tzdata（Intl Asia/Shanghai）逐分鐘一致：每次切換前後 3 小時，另每 6 小時抽查全年', () => {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const offsetHours = (instant: number) => {
      const p = Object.fromEntries(dtf.formatToParts(new Date(instant)).map(x => [x.type, Number(x.value)]));
      return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - instant) / 3_600_000;
    };
    // 同一鐘錶讀數分別按 UTC+9、UTC+8 解讀，看哪種解讀在 tzdata 中成立
    const ianaKind = (t: number) => {
      const asDst = offsetHours(t - 9 * 3_600_000) === 9;
      const asStandard = offsetHours(t - 8 * 3_600_000) === 8;
      if (asDst) return asStandard ? 'repeated' : 'dst';
      return asStandard ? undefined : 'skipped';
    };
    const check = (t: number) => {
      const d = new Date(t);
      const clock = {
        year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
        hour: d.getUTCHours(), minute: d.getUTCMinutes(),
      };
      expect(detectBeijingDst(clock)?.kind, JSON.stringify(clock)).toBe(ianaKind(t));
    };

    for (const { year, start, end } of windows) {
      for (const [month, day] of [start, end]) {
        const switchAt = Date.UTC(year, month - 1, day, 2);
        for (let m = -180; m <= 180; m++) check(switchAt + m * 60_000);
      }
      for (let t = Date.UTC(year, 0, 1, 0, 17); t < Date.UTC(year + 1, 0, 1); t += 6 * 3_600_000) check(t);
    }
  });
});

describe('normalizeBirthDateTime（多時區）', () => {
  it('公曆 + timezone：換算為北京時間並記錄來源時區', () => {
    const r = normalizeBirthDateTime({
      year: 1990, month: 6, day: 15, hour: 20, minute: 30,
      timezone: 'America/New_York',
    });
    expect(r.year).toBe(1990);
    expect(r.month).toBe(6);
    expect(r.day).toBe(16);
    expect(r.hour).toBe(8);
    expect(r.minute).toBe(30);
    expect(r.isLunarInput).toBe(false);
    expect(r.sourceTimezone).toBe('America/New_York');
  });

  it('公曆無 timezone：直接透傳（向後兼容）', () => {
    const r = normalizeBirthDateTime({ year: 1990, month: 6, day: 15, hour: 20, minute: 30 });
    expect(r).toEqual({
      year: 1990, month: 6, day: 15, hour: 20, minute: 30,
      isLunarInput: false,
    });
  });

  it('農曆輸入：忽略 timezone（曆法日期無時區語義）', () => {
    const r = normalizeBirthDateTime({
      year: 1990, month: 4, day: 21, hour: 10,
      isLunar: true, timezone: 'America/New_York',
    });
    // 農曆 1990-04-21 = 公曆 1990-05-15
    expect(r).toEqual({
      year: 1990, month: 5, day: 15, hour: 10, minute: 0,
      isLunarInput: true,
    });
  });
});

describe('validateTimezone', () => {
  it('合法時區通過', () => {
    expect(() => validateTimezone('Asia/Tokyo')).not.toThrow();
    expect(() => validateTimezone('Europe/Paris')).not.toThrow();
  });

  it('非法時區報錯信息明確', () => {
    expect(() => validateTimezone('Mars/Olympus')).toThrow(/無效的時區標識/);
  });
});

/** 北京標準時壁鐘 → 指定時區壁鐘（測試輔助，與主實現互為逆運算） */
function wallClockFromBeijing(
  bj: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number } {
  const instant = new Date(Date.UTC(bj.year, bj.month - 1, bj.day, bj.hour, bj.minute) - 8 * 3600 * 1000);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const get = (t: string) => Number(parts.find(p => p.type === t)!.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
}
