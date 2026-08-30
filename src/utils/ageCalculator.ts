/**
 * Age calculation utilities
 * Simplified from baziwei/frontend/src/utils/ageCalculator.ts
 */

/**
 * Calculate nominal age (虛歲) - Chinese age calculation
 * A person is considered 1 year old at birth, and gains a year at each lunar new year
 *
 * @param birthYear - Birth year
 * @param targetYear - Target year for calculation (defaults to current year)
 * @returns Nominal age in Chinese tradition
 */
export function calculateNominalAge(birthYear: number, targetYear?: number): number {
  const currentYear = targetYear ?? new Date().getFullYear();
  // Nominal age: target year - birth year + 1
  return currentYear - birthYear + 1;
}

/**
 * Calculate Western age (實歲)
 *
 * @param birthDate - Birth date in ISO format (YYYY-MM-DD)
 * @param targetDate - Target date (defaults to today, Beijing wall)
 * @returns Western age
 */
export function calculateWesternAge(birthDate: string, targetDate?: string): number {
  // 字符串分量直接比较，彻底绕开 Date 的时区解释
  const [bY, bM, bD] = birthDate.split('-').map(Number);
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const t = targetDate
    ? targetDate.split('-').map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()];

  let age = t[0] - bY;
  const monthDiff = t[1] - bM;
  if (monthDiff < 0 || (monthDiff === 0 && t[2] < bD)) {
    age--;
  }
  return age;
}

/**
 * Calculate age range for DaYun (大運) period
 *
 * @param startAge - Start age of the DaYun period
 * @param duration - Duration of the period (typically 10 years)
 * @returns Formatted age range string
 */
export function formatDaYunAgeRange(startAge: number, duration: number = 10): string {
  const endAge = startAge + duration - 1;
  return `${startAge}-${endAge}歲`;
}
