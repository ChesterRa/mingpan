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
