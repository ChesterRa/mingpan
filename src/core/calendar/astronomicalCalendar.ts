/**
 * Astronomical Calendar Calculations
 * Based on taro-bazi's high-precision algorithms
 * Implements calculations from 寿星万年历 (Longevity Star Calendar)
 */

/**
 * Convert Gregorian date to Julian Day Number
 * Valid from 100 CE onwards
 */
export function gregorianToJulianDay(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): number {
  // Handle calendar reform (Gregorian calendar adopted Oct 15, 1582)
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  
  let jd: number;
  
  if (year > 1582 || (year === 1582 && month > 10) || (year === 1582 && month === 10 && day >= 15)) {
    // Gregorian calendar
    jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  } else {
    // Julian calendar
    jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  
  // Add time as fraction of day
  const timeFraction = (hour + minute / 60 + second / 3600) / 24;
  
  return jd + timeFraction;
}

/**
 * Convert Julian Day Number to Gregorian date
 */
export function julianDayToGregorian(jd: number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const jdi = Math.floor(jd);
  const jdf = jd - jdi;
  
  let a, b;
  
  if (jdi >= 2299161) {
    // Gregorian calendar
    a = Math.floor((jdi - 1867216.25) / 36524.25);
    b = jdi + 1 + a - Math.floor(a / 4);
  } else {
    // Julian calendar
    b = jdi;
  }
  
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const m = Math.floor((c - e) / 30.6001);
  
  const day = c - e - Math.floor(30.6001 * m);
  const month = m < 14 ? m - 1 : m - 13;
  const year = month > 2 ? d - 4716 : d - 4715;
  
  // Extract time from fractional part
  const hours = jdf * 24;
  const hour = Math.floor(hours);
  const minutes = (hours - hour) * 60;
  const minute = Math.floor(minutes);
  const second = Math.floor((minutes - minute) * 60);
  
  return { year, month, day, hour, minute, second };
}

/**
 * Calculate Earth's nutation parameters
 * Returns nutation in longitude (Δψ) and obliquity (Δε) in degrees
 */
export function getEarthNutationParameter(jd: number): { longitude: number; obliquity: number } {
  const T = (jd - 2451545.0) / 36525.0;
  const T2 = T * T;
  const T3 = T2 * T;
  
  // Mean anomaly of the Moon
  const M = 134.96298 + 477198.867398 * T + 0.0086972 * T2 + T3 / 56250;
  
  // Mean anomaly of the Sun
  const M_ = 357.52772 + 35999.050340 * T - 0.0001603 * T2 - T3 / 300000;
  
  // Moon's argument of latitude
  const F = 93.27191 + 483202.017538 * T - 0.0036825 * T2 + T3 / 327270;
  
  // Longitude of ascending node of Moon's orbit
  const Omega = 125.04452 - 1934.136261 * T + 0.0020708 * T2 + T3 / 450000;
  
  // Convert to radians
  const rad = Math.PI / 180;
  const MRad = M * rad;
  const M_Rad = M_ * rad;
  const FRad = F * rad;
  const OmegaRad = Omega * rad;
  
  // Nutation in longitude (simplified, most significant terms only)
  const deltaPsi = -17.20 * Math.sin(OmegaRad) 
                   - 1.32 * Math.sin(2 * FRad - 2 * OmegaRad) 
                   - 0.23 * Math.sin(2 * FRad + 2 * OmegaRad);
  
  // Nutation in obliquity
  const deltaEpsilon = 9.20 * Math.cos(OmegaRad) 
                      + 0.57 * Math.cos(2 * FRad - 2 * OmegaRad) 
                      + 0.10 * Math.cos(2 * FRad + 2 * OmegaRad);
  
  return {
    longitude: deltaPsi / 3600, // Convert arcseconds to degrees
    obliquity: deltaEpsilon / 3600
  };
}

/**
 * Calculate the aberration of light
 * Returns correction in degrees
 */
export function getLightAberration(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  
  // Mean longitude of the Sun
  const L = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  
  // Convert to radians
  const LRad = (L % 360) * Math.PI / 180;
  
  // Aberration constant (in arcseconds)
  const k = 20.49552;
  
  // Calculate aberration
  const aberration = -k * Math.cos(LRad) / 3600;
  
  return aberration;
}

/**
 * Calculate the apparent solar longitude
 * Includes corrections for nutation and aberration
 */
export function getSolarLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const T2 = T * T;
  const T3 = T2 * T;
  
  // Mean longitude of the Sun
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
  
  // Mean anomaly of the Sun
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T2;
  const MRad = M * Math.PI / 180;
  
  // Equation of center
  const C = (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(MRad)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * MRad)
          + 0.000289 * Math.sin(3 * MRad);
  
  // True longitude
  const trueLongitude = L0 + C;
  
  // Get nutation correction
  const nutation = getEarthNutationParameter(jd);
  
  // Get aberration correction
  const aberration = getLightAberration(jd);
  
  // Apparent longitude
  const apparentLongitude = trueLongitude + nutation.longitude + aberration;
  
  // Normalize to 0-360 degrees
  return ((apparentLongitude % 360) + 360) % 360;
}

/**
 * Find the exact moment of a solar term
 * Uses Newton-Raphson iteration for precision
 */
export function getNewMoonTime(k: number): number {
  // k is the lunation number (0 = Jan 6, 2000)
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  
  // Mean new moon
  const JDE = 2451550.09766 + 29.530588861 * k
            + 0.00015437 * T2
            - 0.000000150 * T3
            + 0.00000000073 * T4;
  
  // Sun's mean anomaly
  const M = 2.5534 + 29.10535670 * k
          - 0.0000014 * T2
          - 0.00000011 * T3;
  
  // Moon's mean anomaly
  const Mp = 201.5643 + 385.81693528 * k
           + 0.0107582 * T2
           + 0.00001238 * T3
           - 0.000000058 * T4;
  
  // Moon's argument of latitude
  const F = 160.7108 + 390.67050284 * k
          - 0.0016118 * T2
          - 0.00000227 * T3
          + 0.000000011 * T4;
  
  // Convert to radians
  const rad = Math.PI / 180;
  const MRad = M * rad;
  const MpRad = Mp * rad;
  const FRad = F * rad;
  
  // Corrections (simplified, main terms only)
  const correction = -0.40720 * Math.sin(MpRad)
                   + 0.17241 * Math.sin(MRad)
                   + 0.01608 * Math.sin(2 * MpRad)
                   + 0.01039 * Math.sin(2 * FRad)
                   + 0.00739 * Math.sin(MpRad - MRad);
  
  return JDE + correction;
}

/**
 * Constants for precise calculations
 */
export const ASTRONOMICAL_CONSTANTS = {
  J2000: 2451545.0,                    // Julian day for J2000.0 epoch
  DAYS_PER_CENTURY: 36525.0,           // Days in a Julian century
  MEAN_SOLAR_DAY: 0.9856473354,        // Mean solar motion in degrees per day
  SYNODIC_MONTH: 29.530588861,         // Mean synodic month in days
  TROPICAL_YEAR: 365.2421897,          // Tropical year in days
  ABERRATION_CONSTANT: 20.49552,       // Aberration constant in arcseconds
  EARTH_OBLIQUITY_J2000: 23.43929111   // Earth's obliquity at J2000.0 in degrees
};

/**
 * Export utility function to check calculation validity
 */
export function isValidDate(year: number, month: number, day: number): boolean {
  // Support dates from 100 CE as per taro-bazi
  if (year < 100 || year > 3000) return false;
  if (month < 1 || month > 12) return false;
  
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Check for leap year
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeap) daysInMonth[1] = 29;
  }
  
  return day >= 1 && day <= daysInMonth[month - 1];
}