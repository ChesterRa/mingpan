/**
 * True Solar Time Calculator
 * Enhanced with high-precision astronomical calculations from taro-bazi
 * Implements algorithms from 寿星万年历 (Longevity Star Calendar)
 */

import { 
  gregorianToJulianDay, 
  getSolarLongitude,
  getLightAberration,
  getEarthNutationParameter 
} from '../calendar/astronomicalCalendar';

export class TrueSolarTime {
  /**
   * Adjust clock time to true solar time with astronomical precision
   * @param date - The clock time
   * @param longitude - The longitude in degrees (positive for East, negative for West)
   * @returns Adjusted date/time
   */
  static adjust(date: Date, longitude: number): Date {
    // Convert to Julian Day for astronomical calculations
    const jd = gregorianToJulianDay(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );
    
    // Calculate precise equation of time
    const equationOfTime = this.getEquationOfTime(jd);
    
    // Beijing standard time is UTC+8, based on 120°E longitude
    const standardLongitude = 120;
    
    // Calculate time difference in minutes
    // Every degree of longitude = 4 minutes of time
    const timeDifferenceMinutes = (longitude - standardLongitude) * 4;
    
    // Total correction in minutes
    const totalCorrectionMinutes = timeDifferenceMinutes + equationOfTime;
    
    // Create new date with adjustment
    const adjustedTime = new Date(date.getTime() + totalCorrectionMinutes * 60 * 1000);
    
    return adjustedTime;
  }
  
  /**
   * Calculate the equation of time with high precision
   * This accounts for the Earth's elliptical orbit and axial tilt
   * @param jd - Julian Day number
   * @returns Correction in minutes
   */
  private static getEquationOfTime(jd: number): number {
    // Calculate centuries from J2000.0
    const T = (jd - 2451545.0) / 36525.0;
    const T2 = T * T;
    const T3 = T2 * T;
    
    // Mean longitude of the Sun
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
    
    // Mean anomaly of the Sun
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T2;
    
    // Eccentricity of Earth's orbit
    const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T2;
    
    // Convert to radians
    const MRad = M * Math.PI / 180;
    const L0Rad = L0 * Math.PI / 180;
    
    // Obliquity of the ecliptic
    const epsilon = 23.43929111 - 0.013004167 * T - 0.000000164 * T2 + 0.000000503 * T3;
    const y = Math.tan(0.5 * epsilon * Math.PI / 180) ** 2;
    
    // Equation of time
    const E = y * Math.sin(2 * L0Rad)
             - 2 * e * Math.sin(MRad)
             + 4 * e * y * Math.sin(MRad) * Math.cos(2 * L0Rad)
             - 0.5 * y * y * Math.sin(4 * L0Rad)
             - 1.25 * e * e * Math.sin(2 * MRad);
    
    // Convert from radians to minutes
    return E * 180 / Math.PI * 4;
  }
  
  /**
   * Get the day of year (1-365/366)
   */
  private static getDayOfYear(date: Date): number {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
    const diff = date.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return dayOfYear;
  }
  
  /**
   * Calculate sunrise time with astronomical precision
   * @param date - The date
   * @param latitude - Latitude in degrees (positive for North)
   * @param longitude - Longitude in degrees (positive for East)
   * @returns Sunrise time
   */
  static calculateSunrise(date: Date, latitude: number, longitude: number): Date {
    // Convert to Julian Day at noon
    const jdNoon = gregorianToJulianDay(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      12, 0, 0
    );
    
    // Get solar longitude
    const solarLongitude = getSolarLongitude(jdNoon);
    
    // Calculate solar declination
    const obliquity = 23.43929111; // Earth's axial tilt
    const declinationRad = Math.asin(
      Math.sin(solarLongitude * Math.PI / 180) * 
      Math.sin(obliquity * Math.PI / 180)
    );
    
    // Calculate hour angle at sunrise
    const latRad = latitude * Math.PI / 180;
    
    // Check for polar day/night
    const cosH = -Math.tan(latRad) * Math.tan(declinationRad);
    if (cosH > 1) {
      // Polar night - no sunrise
      return new Date(NaN);
    }
    if (cosH < -1) {
      // Polar day - sun doesn't set
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
    }
    
    const hourAngleRad = Math.acos(cosH);
    const hourAngleDeg = hourAngleRad * 180 / Math.PI;
    
    // Time of solar noon (in hours)
    const solarNoon = 12 - longitude / 15 + date.getTimezoneOffset() / 60;
    
    // Sunrise time
    const sunriseHour = solarNoon - hourAngleDeg / 15;
    
    // Apply equation of time correction
    const equationOfTime = this.getEquationOfTime(jdNoon);
    const correctedSunriseHour = sunriseHour - equationOfTime / 60;
    
    const sunriseDate = new Date(date);
    sunriseDate.setHours(Math.floor(correctedSunriseHour));
    sunriseDate.setMinutes(Math.floor((correctedSunriseHour % 1) * 60));
    sunriseDate.setSeconds(0);
    
    return sunriseDate;
  }
  
  /**
   * Calculate sunset time with astronomical precision
   * @param date - The date
   * @param latitude - Latitude in degrees
   * @param longitude - Longitude in degrees
   * @returns Sunset time
   */
  static calculateSunset(date: Date, latitude: number, longitude: number): Date {
    // Similar to sunrise but add the hour angle instead of subtracting
    const jdNoon = gregorianToJulianDay(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      12, 0, 0
    );
    
    const solarLongitude = getSolarLongitude(jdNoon);
    const obliquity = 23.43929111;
    const declinationRad = Math.asin(
      Math.sin(solarLongitude * Math.PI / 180) * 
      Math.sin(obliquity * Math.PI / 180)
    );
    
    const latRad = latitude * Math.PI / 180;
    const cosH = -Math.tan(latRad) * Math.tan(declinationRad);
    
    if (cosH > 1) {
      // Polar night
      return new Date(NaN);
    }
    if (cosH < -1) {
      // Polar day
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));
    }
    
    const hourAngleRad = Math.acos(cosH);
    const hourAngleDeg = hourAngleRad * 180 / Math.PI;
    
    const solarNoon = 12 - longitude / 15 + date.getTimezoneOffset() / 60;
    const sunsetHour = solarNoon + hourAngleDeg / 15;
    
    const equationOfTime = this.getEquationOfTime(jdNoon);
    const correctedSunsetHour = sunsetHour - equationOfTime / 60;
    
    const sunsetDate = new Date(date);
    sunsetDate.setHours(Math.floor(correctedSunsetHour));
    sunsetDate.setMinutes(Math.floor((correctedSunsetHour % 1) * 60));
    sunsetDate.setSeconds(0);
    
    return sunsetDate;
  }
  
  /**
   * Determine if a time is during daylight hours
   * @param date - The date/time to check
   * @param latitude - Latitude in degrees
   * @param longitude - Longitude in degrees
   * @returns true if during daylight hours
   */
  static isDaylight(date: Date, latitude: number, longitude: number): boolean {
    const sunrise = this.calculateSunrise(date, latitude, longitude);
    const sunset = this.calculateSunset(date, latitude, longitude);
    
    // Handle polar day/night cases
    if (isNaN(sunrise.getTime())) return false; // Polar night
    if (sunrise.getUTCHours() === 0 && sunset.getUTCHours() === 23) return true; // Polar day
    
    return date >= sunrise && date <= sunset;
  }
  
  /**
   * Get timezone offset for a longitude
   * @param longitude - Longitude in degrees
   * @returns Timezone offset in hours from UTC
   */
  static getTimezoneOffset(longitude: number): number {
    // Theoretical timezone based on longitude
    // Actual timezones may differ due to political boundaries
    return Math.round(longitude / 15);
  }
  
  /**
   * Calculate the solar position (altitude and azimuth) for a given time and location
   * Useful for advanced BaZi calculations that consider solar position
   */
  static getSolarPosition(date: Date, latitude: number, longitude: number): {
    altitude: number;  // degrees above horizon
    azimuth: number;   // degrees from north
  } {
    const jd = gregorianToJulianDay(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );
    
    // Get solar coordinates
    const solarLongitude = getSolarLongitude(jd);
    const obliquity = 23.43929111;
    
    // Right ascension and declination
    const alpha = Math.atan2(
      Math.cos(obliquity * Math.PI / 180) * Math.sin(solarLongitude * Math.PI / 180),
      Math.cos(solarLongitude * Math.PI / 180)
    );
    const delta = Math.asin(
      Math.sin(obliquity * Math.PI / 180) * Math.sin(solarLongitude * Math.PI / 180)
    );
    
    // Local sidereal time
    const T = (jd - 2451545.0) / 36525.0;
    const theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * (0.000387933 - T / 38710000);
    const theta = (theta0 + longitude) % 360;
    
    // Hour angle
    const H = (theta - alpha * 180 / Math.PI) * Math.PI / 180;
    
    // Convert to horizontal coordinates
    const latRad = latitude * Math.PI / 180;
    const altitude = Math.asin(
      Math.sin(latRad) * Math.sin(delta) + 
      Math.cos(latRad) * Math.cos(delta) * Math.cos(H)
    );
    
    const azimuth = Math.atan2(
      Math.sin(H),
      Math.cos(H) * Math.sin(latRad) - Math.tan(delta) * Math.cos(latRad)
    );
    
    return {
      altitude: altitude * 180 / Math.PI,
      azimuth: ((azimuth * 180 / Math.PI + 360) % 360)
    };
  }
}