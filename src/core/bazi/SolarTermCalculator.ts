/**
 * Solar Term Calculator
 * Based on astronomical calculations from taro-bazi
 * Provides accurate solar term timing for BaZi calculations
 */

import { XL0_xzb, nutB, dt_at, XL0 } from './ephemerisData';


const rad = (180 * 3600) / Math.PI;
const pi2 = Math.PI * 2;
const J2000 = 2451545;

// Solar terms in order
export const SOLAR_TERMS = [
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰',
  '春分', '清明', '谷雨', '立夏', '小满', '芒种',
  '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'
];

// Solar term to month zhi mapping
// Note: Only Jie (节) solar terms determine month boundaries
export const SOLAR_TERM_TO_ZHI: { [key: string]: string } = {
  // Jie (month-starting) solar terms
  '立春': '寅', '惊蛰': '卯', '清明': '辰', '立夏': '巳',
  '芒种': '午', '小暑': '未', '立秋': '申', '白露': '酉',
  '寒露': '戌', '立冬': '亥', '大雪': '子', '小寒': '丑',
  // Qi (mid-month) solar terms - included for compatibility
  '雨水': '寅', '春分': '卯', '谷雨': '辰', '小满': '巳',
  '夏至': '午', '大暑': '未', '处暑': '申', '秋分': '酉',
  '霜降': '戌', '小雪': '亥', '冬至': '子', '大寒': '丑'
};

// Solar term to gregorian month mapping
export const SOLAR_TERM_TO_MONTH: { [key: string]: number } = {
  '立春': 2, '雨水': 2,
  '惊蛰': 3, '春分': 3,
  '清明': 4, '谷雨': 4,
  '立夏': 5, '小满': 5,
  '芒种': 6, '夏至': 6,
  '小暑': 7, '大暑': 7,
  '立秋': 8, '处暑': 8,
  '白露': 9, '秋分': 9,
  '寒露': 10, '霜降': 10,
  '立冬': 11, '小雪': 11,
  '大雪': 12, '冬至': 12,
  '小寒': 1, '大寒': 1
};

/**
 * Convert Julian Day to time string
 */
function jdToTimeStr(jd: number): string {
  let h, m, s;
  jd += 0.5;
  jd = jd - Math.floor(jd);
  s = Math.floor(jd * 86400 + 0.5);
  h = Math.floor(s / 3600);
  s -= h * 3600;
  m = Math.floor(s / 60);
  s -= m * 60;
  h = '0' + h;
  m = '0' + m;
  s = '0' + s;
  return h.substr(h.length - 2, 2) + ':' + m.substr(m.length - 2, 2) + ':' + s.substr(s.length - 2, 2);
}

/**
 * Calculate accurate solar term time
 */
function qiAccurate(W: number): number {
  const t = S_aLon_t(W) * 36525;
  return t - dt_T(t) + 8 / 24;
}

/**
 * Calculate time from solar longitude
 */
function S_aLon_t(W: number): number {
  let t, v = 628.3319653318;
  t = (W - 1.75347 - Math.PI) / v;
  v = E_v(t);
  t += (W - S_aLon(t, 10)) / v;
  v = E_v(t);
  t += (W - S_aLon(t, -1)) / v;
  return t;
}

/**
 * Earth velocity
 */
function E_v(t: number): number {
  const f = 628.307585 * t;
  return 628.332 + 21 * Math.sin(1.527 + f) + 0.44 * Math.sin(1.48 + f * 2) +
    0.129 * Math.sin(5.82 + f) * t + 0.00055 * Math.sin(4.21 + f) * t * t;
}

/**
 * Solar apparent longitude
 */
function S_aLon(t: number, n: number): number {
  return E_Lon(t, n) + nutationLon2(t) + gxc_sunLon(t) + Math.PI;
}

/**
 * Earth longitude
 */
function E_Lon(t: number, n: number): number {
  return XL0_calc(0, 0, t, n);
}

/**
 * Ephemeris calculation
 */
function XL0_calc(xt: number, zn: number, t: number, n: number): number {
  t /= 10;
  let i, j, v = 0, tn = 1, c;
  const F = XL0[xt];
  let n1, n2, N;
  const pn = zn * 6 + 1;
  const N0 = F[pn + 1] - F[pn];
  let n0;
  
  for (i = 0; i < 6; i++, tn *= t) {
    n1 = F[pn + i];
    n2 = F[pn + 1 + i];
    n0 = n2 - n1;
    if (!n0) continue;
    if (n < 0) N = n2;
    else {
      N = Math.floor((3 * n * n0) / N0 + 0.5) + n1;
      if (i) N += 3;
      if (N > n2) N = n2;
    }
    for (j = n1, c = 0; j < N; j += 3)
      c += F[j] * Math.cos(F[j + 1] + t * F[j + 2]);
    v += c * tn;
  }
  v /= F[0];
  
  if (xt == 0) {
    const t2 = t * t;
    const t3 = t2 * t;
    if (zn == 0) v += (-0.0728 - 2.7702 * t - 1.1019 * t2 - 0.0996 * t3) / rad;
    if (zn == 1) v += (+0.0 + 0.0004 * t + 0.0004 * t2 - 0.0026 * t3) / rad;
    if (zn == 2) v += (-0.002 + 0.0044 * t + 0.0213 * t2 - 0.025 * t3) / 1000000;
  } else {
    const dv = XL0_xzb[(xt - 1) * 3 + zn];
    if (zn == 0) v += (-3 * t) / rad;
    if (zn == 2) v += dv / 1000000;
    else v += dv / rad;
  }
  return v;
}

/**
 * Nutation in longitude
 */
function nutationLon2(t: number): number {
  let i, a, dL = 0;
  const t2 = t * t;
  const B = nutB;
  for (i = 0; i < B.length; i += 5) {
    if (i == 0) a = -1.742 * t;
    else a = 0;
    dL += (B[i + 3] + a) * Math.sin(B[i] + B[i + 1] * t + B[i + 2] * t2);
  }
  return dL / 100 / rad;
}

/**
 * Solar aberration
 */
function gxc_sunLon(t: number): number {
  const v = -0.043126 + 628.301955 * t - 0.000002732 * t * t;
  const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
  return (-20.49552 * (1 + e * Math.cos(v))) / rad;
}

/**
 * Delta T calculation
 */
function dt_T(t: number): number {
  return dt_calc(t / 365.2425 + 2000) / 86400.0;
}

function dt_calc(y: number): number {
  const y0 = dt_at[dt_at.length - 2];
  const t0 = dt_at[dt_at.length - 1];
  if (y >= y0) {
    const jsd = 31;
    if (y > y0 + 100) return dt_ext(y, jsd);
    const v = dt_ext(y, jsd);
    const dv = dt_ext(y0, jsd) - t0;
    return v - (dv * (y0 + 100 - y)) / 100;
  }
  let i;
  const d = dt_at;
  for (i = 0; i < d.length; i += 5) if (y < d[i + 5]) break;
  const t1 = ((y - d[i]) / (d[i + 5] - d[i])) * 10;
  const t2 = t1 * t1;
  const t3 = t2 * t1;
  return d[i + 1] + d[i + 2] * t1 + d[i + 3] * t2 + d[i + 4] * t3;
}

function dt_ext(y: number, jsd: number): number {
  const dy = (y - 1820) / 100;
  return -20 + jsd * dy * dy;
}

/**
 * Julian Day calculation
 */
export function JD(y: number, m: number, d: number): number {
  let n = 0, G = 0;
  if (y * 372 + m * 31 + Math.floor(d) >= 588829) G = 1;
  if (m <= 2) {
    m += 12;
    y--;
  }
  if (G) {
    n = Math.floor(y / 100);
    n = 2 - n + Math.floor(n / 4);
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + n - 1524.5;
}

/**
 * Julian Day to Date
 */
export function DD(jd: number): any {
  const r: any = {};
  let D = Math.floor(jd + 0.5);
  let F = jd + 0.5 - D;
  let c;
  if (D >= 2299161) {
    c = Math.floor((D - 1867216.25) / 36524.25);
    D += 1 + c - Math.floor(c / 4);
  }
  D += 1524;
  r.Y = Math.floor((D - 122.1) / 365.25);
  D -= Math.floor(365.25 * r.Y);
  r.M = Math.floor(D / 30.601);
  D -= Math.floor(30.601 * r.M);
  r.D = D;
  if (r.M > 13) {
    r.M -= 13;
    r.Y -= 4715;
  } else {
    r.M -= 1;
    r.Y -= 4716;
  }
  F *= 24;
  r.h = Math.floor(F);
  F -= r.h;
  F *= 60;
  r.m = Math.floor(F);
  F -= r.m;
  F *= 60;
  r.s = F;
  return r;
}

export interface SolarTermInfo {
  [solarTerm: string]: string;
}

/**
 * Calculate solar terms for a given year and month
 */
export function getSolarTermInfo(year: number, month: number): SolarTermInfo {
  let w, d, D, xn;
  const obj: SolarTermInfo = {};
  const jd = {
    Y: year,
    M: month,
    D: 1,
    h: 12,
    m: 0,
    s: 0.1
  };
  
  const Bd0 = Math.floor(JD(jd.Y, jd.M, jd.D + (jd.s / 60 + jd.m) / 60 + jd.h / 24)) - J2000;
  jd.M++;
  if (jd.M > 12) {
    jd.Y++;
    jd.M = 1;
  }
  const Bdn = Math.floor(JD(jd.Y, jd.M, jd.D + (jd.s / 60 + jd.m) / 60 + jd.h / 24)) - J2000 - Bd0;

  const jd2 = Bd0 + dt_T(Bd0) - 8 / 24;

  const lun: any[] = [];
  for (let i = 0; i < Bdn; i++) {
    const d0 = Bd0 + i;
    const r = DD(d0 + J2000);
    lun.push(r);
  }
  
  // Debug: Ensure lun array is properly populated
  if (lun.length === 0) {
    // Fill with default values if empty
    for (let i = 1; i <= 31; i++) {
      lun.push({ D: i });
    }
  }

  w = S_aLon(jd2 / 36525, 3);
  w = (Math.floor(((w - 0.13) / pi2) * 24) * pi2) / 24;

  do {
    d = qiAccurate(w);
    D = Math.floor(d + 0.5);
    xn = Math.floor((w / pi2) * 24 + 24000006.01) % 24;
    w += pi2 / 24;
    if (D >= Bd0 + Bdn) break;
    if (D < Bd0) continue;
    const solarTerm = SOLAR_TERMS[xn];
    const index = D - Bd0;
    
    // Ensure we have a valid object at the index
    let ob = lun[index];
    if (!ob || !ob.D) {
      // Fallback: calculate day from Julian day
      const fallbackDate = DD(D + J2000);
      ob = fallbackDate || { D: 1 };
    }
    
    const time = jdToTimeStr(d);
    obj[solarTerm] = `${year}-${month}-${ob.D} ${time}`;
  } while (D + 12 < Bd0 + Bdn);

  return obj;
}

/**
 * Calculate current solar term for a given date/time
 */
export function calculateSolarTerm(dateTimeStr: string, solarTermInfo: SolarTermInfo): {
  solarTerm: string;
  isCurrentMonthSolarTerm: boolean;
} {
  const currentDay = new Date(dateTimeStr.replace(/未知/g, '00'));
  const solarTermArray = Object.keys(solarTermInfo);
  
  // Handle case with 3 solar terms in month
  if (solarTermArray.length === 3) {
    if (currentDay > new Date(solarTermInfo[solarTermArray[2]])) {
      return {
        solarTerm: solarTermArray[2],
        isCurrentMonthSolarTerm: true
      };
    }
  }
  
  if (currentDay > new Date(solarTermInfo[solarTermArray[1]])) {
    return {
      solarTerm: solarTermArray[1],
      isCurrentMonthSolarTerm: true
    };
  } else if (currentDay > new Date(solarTermInfo[solarTermArray[0]])) {
    return {
      solarTerm: solarTermArray[0],
      isCurrentMonthSolarTerm: true
    };
  } else {
    const index = SOLAR_TERMS.findIndex(item => item === solarTermArray[0]);
    return {
      solarTerm: SOLAR_TERMS[(index - 1 + 24) % 24],
      isCurrentMonthSolarTerm: false
    };
  }
}

/**
 * Get adjacent solar term times
 */
export function getAdjacentSolarTermTime(solarTermInfo: SolarTermInfo, solarTerm: string): {
  previous: string;
  next: string;
} {
  const index = SOLAR_TERMS.findIndex(item => item === solarTerm);
  
  // Current is Qi (even index)
  if (index % 2 === 0) {
    return {
      previous: solarTermInfo[SOLAR_TERMS[(index - 1 + 24) % 24]] || '',
      next: solarTermInfo[SOLAR_TERMS[(index + 1) % 24]] || ''
    };
  }
  // Current is Jie (odd index)
  else {
    return {
      previous: solarTermInfo[solarTerm] || '',
      next: solarTermInfo[SOLAR_TERMS[(index + 2) % 24]] || ''
    };
  }
}
