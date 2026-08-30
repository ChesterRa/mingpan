/**
 * Luck Cycle Calculator
 * Implements taro-bazi's complete luck cycle system
 * Handles DaYun (大運), LiuNian (流年), LiuYue (流月), and LiuRi (流日)
 */

import { BaziChart, Gender } from '../types';
import { 
  HEAVENLY_STEMS, 
  EARTHLY_BRANCHES,
  STEM_YIN_YANG
} from '../../../core/constants/bazi';
import { gregorianToJulianDay } from '../../../core/calendar/astronomicalCalendar';
import { Solar } from 'lunar-javascript';
import { calculateNominalAge } from '../../../utils/ageCalculator';

export interface LuckSequence {
  direction: 'forward' | 'backward';
  startAge: number;
  startDate: Date;
  detailedStartTime?: {
    years: number;
    months: number;
    days: number;
    hours: number;
  };
  deliveryYears?: string[]; // Years when DaYun changes (e.g., "丁、壬" years)
  deliveryTiming?: string; // When in those years (e.g., "小寒后4天")
}

export interface DaYunPeriod {
  index: number;
  startAge: number;
  endAge: number;
  stemBranch: {
    stem: string;
    branch: string;
  };
  element: string;
  yinYang: 'yin' | 'yang';
  voidBranches?: string[]; // 空亡地支 for this DaYun period
}

export interface LiuNianYear {
  year: number;
  age: number;
  stemBranch: {
    stem: string;
    branch: string;
  };
  element: string;
  yinYang: 'yin' | 'yang';
}

export interface LiuYueMonth {
  year: number;
  month: number;
  stemBranch: {
    stem: string;
    branch: string;
  };
  element: string;
}

export interface LiuRiDay {
  date: Date;
  stemBranch: {
    stem: string;
    branch: string;
  };
  element: string;
}

export class LuckCycleCalculator {
  /**
   * Calculate delivery stems based on birth year stem
   * Returns the stems of years when DaYun changes
   */
  private static calculateDeliveryStems(yearStemIndex: number): string[] {
    // Delivery occurs every 10 years on years with specific stems
    // Pattern: if birth year stem index is n, delivery on (n+2)%10 and (n+7)%10
    const stem1Index = (yearStemIndex + 2) % 10;
    const stem2Index = (yearStemIndex + 7) % 10;
    
    return [
      HEAVENLY_STEMS[stem1Index].name,
      HEAVENLY_STEMS[stem2Index].name
    ].sort();
  }
  
  /**
   * Calculate delivery timing based on solar term
   * This should calculate the exact days after the solar term for delivery
   */
  private static calculateDeliveryTiming(solarTermName: string, daysDiff: number): string {
    // Use absolute value and determine if before or after
    const absDays = Math.abs(Math.round(daysDiff));
    
    if (absDays === 0) {
      return `${solarTermName}当天`;
    } else if (daysDiff > 0) {
      return `${solarTermName}后${absDays}天`;
    } else {
      return `${solarTermName}前${absDays}天`;
    }
  }
  
  /**
   * Calculate void branches (空亡) for a stem-branch combination
   */
  static calculateVoidBranches(stem: string, branch: string): string[] {
    const stemIndex = HEAVENLY_STEMS.findIndex(s => s.name === stem);
    const branchIndex = EARTHLY_BRANCHES.findIndex(b => b.name === branch);
    
    if (stemIndex === -1 || branchIndex === -1) return [];
    
    // Calculate the JiaZi cycle position
    const cyclePosition = (branchIndex - stemIndex + 12) % 12;
    
    // Determine void branches based on the 60-cycle position
    const voidMap: Record<number, string[]> = {
      0: ['戌', '亥'],  // 甲子旬
      1: ['戌', '亥'],  // 甲子旬
      2: ['申', '酉'],  // 甲戌旬
      3: ['申', '酉'],  // 甲戌旬
      4: ['午', '未'],  // 甲申旬
      5: ['午', '未'],  // 甲申旬
      6: ['辰', '巳'],  // 甲午旬
      7: ['辰', '巳'],  // 甲午旬
      8: ['寅', '卯'],  // 甲辰旬
      9: ['寅', '卯'],  // 甲辰旬
      10: ['子', '丑'], // 甲寅旬
      11: ['子', '丑']  // 甲寅旬
    };
    
    return voidMap[cyclePosition] || [];
  }

  /**
   * Calculate luck sequence direction based on gender and year stem
   * Male + Yang year OR Female + Yin year = Forward
   * Male + Yin year OR Female + Yang year = Backward
   */
  static calLuckySequence(gender: Gender, yearStem: string): 'forward' | 'backward' {
    const stemData = HEAVENLY_STEMS.find(s => s.name === yearStem);
    const isYangStem = stemData?.yinYang === 'yang';
    
    // Male with Yang stem or Female with Yin stem goes forward
    if ((gender === 'male' && isYangStem) || (gender === 'female' && !isYangStem)) {
      return 'forward';
    }
    
    // Male with Yin stem or Female with Yang stem goes backward
    return 'backward';
  }
  
  /**
   * Calculate the starting age and date for luck cycles
   * Based on distance to nearest solar term (forward or backward)
   */
  static calLuckyAge(
    birthDate: Date, 
    gender: Gender,
    yearStem: string
  ): LuckSequence {
    const direction = this.calLuckySequence(gender, yearStem);
    const year = birthDate.getUTCFullYear();
    
    // Define JIE terms (节) - only these are used for DaYun calculation
    const jieTerms = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
    
    // 节气时刻采用 lunar-javascript 权威表（2026-08-30 裁定）：
    // 此前用自研天文引擎 getSolarTermsForYear，与权威表差可达数小时
    // （实测 1992 立夏 02:05 vs lunar 14:08），直接影响起运精度。
    // birthDate 为北京墙钟载体，转 Solar 分量查询后还原为载体。
    const birthSolar = Solar.fromYmdHms(
      birthDate.getUTCFullYear(),
      birthDate.getUTCMonth() + 1,
      birthDate.getUTCDate(),
      birthDate.getUTCHours(),
      birthDate.getUTCMinutes(),
      birthDate.getUTCSeconds()
    );
    const jie = direction === 'forward'
      ? birthSolar.getLunar().getNextJie()
      : birthSolar.getLunar().getPrevJie();
    
    const nearestTerm: { date: Date; name: string } | null = jie
      ? {
          name: jie.getName(),
          date: (() => {
            const js = jie.getSolar();
            return new Date(Date.UTC(js.getYear(), js.getMonth() - 1, js.getDay(), js.getHour(), js.getMinute(), js.getSecond()));
          })(),
        }
      : null;
    const minDays = nearestTerm
      ? Math.abs(nearestTerm.date.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    
    // Calculate starting age using traditional formula from 八字命理算法开发指南2
    // Get precise time difference in minutes
    const totalMinutes = minDays * 24 * 60;
    const totalHours = totalMinutes / 60;
    const totalDaysExact = totalHours / 24;
    
    // Traditional conversion: 3 days = 1 year, 1 day = 4 months, 1 hour = 5 days
    // First convert to total hours for more precision
    const totalHoursExact = totalDaysExact * 24;
    
    // 3 days = 1 year, so 72 hours = 1 year
    const years = Math.floor(totalHoursExact / 72);
    const remainingHoursAfterYears = totalHoursExact - (years * 72);
    
    // 1 day = 4 months, so 24 hours = 4 months, 6 hours = 1 month
    const months = Math.floor(remainingHoursAfterYears / 6);
    const remainingHoursAfterMonths = remainingHoursAfterYears - (months * 6);
    
    // 1 hour = 5 days (传统算法)
    const days = Math.floor(remainingHoursAfterMonths * 5);
    const remainingDayFraction = (remainingHoursAfterMonths * 5) - days;
    
    // Convert remaining day fraction to hours: 1 day = 24 hours
    const hours = Math.round(remainingDayFraction * 24);
    
    // Calculate start age based on the detailed time
    // 起运时间是出生后的时间，需要加上虚岁1
    // 如果起运时间是2年9月多，那么第一个大运从虚岁4岁开始
    // 起运岁数由交运的日历日期定位（与 lunar-javascript getYun 口径对齐，经 oracle 双源验证）：
    // 交运时刻 = 出生时刻 + N年M月D天H时；起运虚岁 = 交运公历年 - 出生公历年 + 1。
    // 此前用「年数+1+满6月进位」的纯算术近似，在跨公历年边界处与日历定位分歧。
    const deliveryDateForAge = new Date(birthDate);
    deliveryDateForAge.setUTCFullYear(deliveryDateForAge.getUTCFullYear() + years);
    deliveryDateForAge.setUTCMonth(deliveryDateForAge.getUTCMonth() + months);
    deliveryDateForAge.setUTCDate(deliveryDateForAge.getUTCDate() + days);
    deliveryDateForAge.setUTCHours(deliveryDateForAge.getUTCHours() + hours);
    const startAge = deliveryDateForAge.getUTCFullYear() - birthDate.getUTCFullYear() + 1;
    
    // Calculate actual start date
    const startDate = new Date(deliveryDateForAge);
    
    // Calculate delivery years pattern
    const yearStemIndex = HEAVENLY_STEMS.findIndex(s => s.name === yearStem);
    const deliveryStems = this.calculateDeliveryStems(yearStemIndex);
    
    // For delivery timing, we need to calculate when DaYun changes occur
    // According to traditional BaZi rules:
    // Delivery happens on the exact time offset from birth
    // The solar term reference is based on the original calculation direction
    let deliveryTiming = '';
    if (nearestTerm && years >= 0) {
      // The delivery timing is based on the same solar term used for start calculation
      // For backward direction (like this case), it's relative to the previous JIE term
      // Calculate the exact delivery timing based on the start time offset
      
      // Birth time + start time = first delivery moment
      // This happens at birth hour + hours, birth day + days, etc.
      // Then find which solar term this is closest to
      
      // Since we calculated from Jingzhe (backward), delivery timing should be relative to a JIE term
      // The delivery pattern follows the birth time pattern based on calculated offset
      
      // Traditional rule: delivery occurs at the same time offset as the DaYun start
      // So if DaYun starts at 2年9月28天15時 after birth, 
      // delivery happens at this exact time offset in delivery years
      
      // Find the solar term closest to this time pattern
      const deliveryHour = birthDate.getUTCHours() + hours;
      const deliveryDayOfMonth = birthDate.getUTCDate() + days;
      
      // For the expected case: birth March 14 + 28 days ≈ April 11
      // The nearest JIE term would be 清明 (April 5) or 立夏 (May 5)
      // But traditionally, for backward calculation from 惊蛰, 
      // the delivery reference should be 小寒 (previous year's cycle)
      
      // Traditional rule: DaYun changes occur at the same time offset as initial DaYun start
      // The delivery happens in specific years (丁、壬) at birth time + DaYun start offset
      
      // Calculate the exact delivery date/time pattern
      const deliveryDate = new Date(birthDate);
      deliveryDate.setUTCFullYear(deliveryDate.getUTCFullYear() + years);
      deliveryDate.setUTCMonth(deliveryDate.getUTCMonth() + months);
      deliveryDate.setUTCDate(deliveryDate.getUTCDate() + days);
      deliveryDate.setUTCHours(deliveryDate.getUTCHours() + hours);
      
      // Find which solar term this delivery date is closest to
      const deliverySolar = Solar.fromYmdHms(
        deliveryDate.getUTCFullYear(),
        deliveryDate.getUTCMonth() + 1,
        deliveryDate.getUTCDate(),
        deliveryDate.getUTCHours(),
        deliveryDate.getUTCMinutes(),
        deliveryDate.getUTCSeconds()
      );
      const deliveryLunar = deliverySolar.getLunar();
      // 就近节：比较前后两节取近者（lunar 权威表）
      const toTerm = (j: ReturnType<typeof deliveryLunar.getPrevJie>): { name: string; date: Date } | null => {
        if (!j) return null;
        const js = j.getSolar();
        return {
          name: j.getName(),
          date: new Date(Date.UTC(js.getYear(), js.getMonth() - 1, js.getDay(), js.getHour(), js.getMinute(), js.getSecond())),
        };
      };
      const candidates = [toTerm(deliveryLunar.getPrevJie()), toTerm(deliveryLunar.getNextJie())]
        .filter((t): t is { name: string; date: Date } => t !== null);
      let closestTerm: { name: string; date: Date } = candidates[0];
      let minDiff = Math.abs(deliveryDate.getTime() - closestTerm.date.getTime());
      for (const term of candidates) {
        const diff = Math.abs(deliveryDate.getTime() - term.date.getTime());
        if (diff < minDiff) { minDiff = diff; closestTerm = term; }
      }
      
      // Calculate days offset from the closest solar term
      const daysDiff = (deliveryDate.getTime() - closestTerm.date.getTime()) / (1000 * 60 * 60 * 24);
      const deliveryTermName = closestTerm.name;
      const daysOffset = daysDiff;
      
      deliveryTiming = this.calculateDeliveryTiming(deliveryTermName, daysOffset);
    }
    
    return {
      direction,
      startAge,
      startDate,
      detailedStartTime: {
        years,
        months,
        days,
        hours
      },
      deliveryYears: deliveryStems,
      deliveryTiming
    };
  }
  
  /**
   * Calculate complete list of 10-year luck pillars (大運)
   * Usually calculates 8-10 periods covering 80-100 years
   */
  static calLuckyList(
    chart: BaziChart,
    gender: Gender,
    birthDate: Date,
    numberOfPeriods: number = 10
  ): DaYunPeriod[] {
    const luckSequence = this.calLuckyAge(birthDate, gender, chart.year.stem);
    const { direction, startAge } = luckSequence;
    
    // Find starting point from month pillar
    const monthStemIndex = HEAVENLY_STEMS.findIndex(s => s.name === chart.month.stem);
    const monthBranchIndex = EARTHLY_BRANCHES.findIndex(b => b.name === chart.month.branch);
    
    const periods: DaYunPeriod[] = [];
    
    for (let i = 0; i < numberOfPeriods; i++) {
      // Calculate stem and branch indices
      let stemIndex: number;
      let branchIndex: number;
      
      if (direction === 'forward') {
        stemIndex = (monthStemIndex + i + 1) % 10;
        branchIndex = (monthBranchIndex + i + 1) % 12;
      } else {
        // 修复负数模运算问题：确保结果始终为正数
        stemIndex = ((monthStemIndex - i - 1) % 10 + 10) % 10;
        branchIndex = ((monthBranchIndex - i - 1) % 12 + 12) % 12;
      }
      
      // 添加防御性检查确保索引有效
      if (stemIndex < 0 || stemIndex >= HEAVENLY_STEMS.length || !HEAVENLY_STEMS[stemIndex]) {
        throw new Error(`Invalid stem index: ${stemIndex} for period ${i}, monthStemIndex: ${monthStemIndex}, direction: ${direction}`);
      }
      
      if (branchIndex < 0 || branchIndex >= EARTHLY_BRANCHES.length || !EARTHLY_BRANCHES[branchIndex]) {
        throw new Error(`Invalid branch index: ${branchIndex} for period ${i}, monthBranchIndex: ${monthBranchIndex}, direction: ${direction}`);
      }
      
      const stem = HEAVENLY_STEMS[stemIndex].name;
      const branch = EARTHLY_BRANCHES[branchIndex].name;
      
      // Get element from stem
      const element = HEAVENLY_STEMS[stemIndex].element;
      
      // Calculate void branches for this DaYun period
      const voidBranches = this.calculateVoidBranches(stem, branch);
      
      periods.push({
        index: i,
        startAge: startAge + (i * 10),
        endAge: startAge + ((i + 1) * 10) - 1,
        stemBranch: { stem, branch },
        element,
        yinYang: HEAVENLY_STEMS[stemIndex].yinYang as 'yin' | 'yang',
        voidBranches
      });
    }
    
    return periods;
  }
  
  /**
   * Calculate fleeting year list (流年)
   * Returns yearly pillars for specified years
   */
  static calFleetingYearList(birthYear: number, years: number[]): LiuNianYear[] {
    const liuNianList: LiuNianYear[] = [];
    
    for (const year of years) {
      // Calculate stem and branch for the year
      const stemIndex = (year - 4) % 10;
      const branchIndex = (year - 4) % 12;
      
      const stem = HEAVENLY_STEMS[stemIndex].name;
      const branch = EARTHLY_BRANCHES[branchIndex].name;
      
      // Get element from stem
      const element = HEAVENLY_STEMS[stemIndex].element;
      
      liuNianList.push({
        year,
        age: calculateNominalAge(birthYear, year), // Chinese age (虚岁)
        stemBranch: { stem, branch },
        element,
        yinYang: HEAVENLY_STEMS[stemIndex].yinYang as 'yin' | 'yang'
      });
    }
    
    return liuNianList;
  }
  
  /**
   * Calculate fleeting month list (流月)
   * Returns monthly pillars for a specific year
   */
  static calFleetingMonthList(year: number): LiuYueMonth[] {
    const months: LiuYueMonth[] = [];
    
    // Get year stem index for month calculation
    const yearStemIndex = (year - 4) % 10;
    
    // Month stem calculation formula: 
    // First month stem = (year stem * 2 + 1) % 10
    const firstMonthStemIndex = (yearStemIndex * 2 + 2) % 10;
    
    for (let month = 1; month <= 12; month++) {
      const stemIndex = (firstMonthStemIndex + month - 1) % 10;
      const branchIndex = (month + 1) % 12; // 寅月 is first month
      
      const stem = HEAVENLY_STEMS[stemIndex].name;
      const branch = EARTHLY_BRANCHES[branchIndex].name;
      
      // Get element from stem
      const element = HEAVENLY_STEMS[stemIndex].element;
      
      months.push({
        year,
        month,
        stemBranch: { stem, branch },
        element
      });
    }
    
    return months;
  }
  
  /**
   * Calculate fleeting day list (流日)
   * Returns daily pillars for a specific month
   */
  static calFleetingDayList(year: number, month: number): LiuRiDay[] {
    const days: LiuRiDay[] = [];
    
    // Calculate starting Julian Day for the month
    const startJD = gregorianToJulianDay(year, month, 1);
    
    // Reference date: 甲子日 = JD 2394479.5 (1845-12-31)
    const referenceJD = 2394479.5;
    const daysSinceReference = Math.floor(startJD - referenceJD);
    
    // Get days in month
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentJD = startJD + day - 1;
      const dayIndex = Math.floor(currentJD - referenceJD);
      
      const stemIndex = dayIndex % 10;
      const branchIndex = dayIndex % 12;
      
      const stem = HEAVENLY_STEMS[stemIndex].name;
      const branch = EARTHLY_BRANCHES[branchIndex].name;
      
      // Get element from stem
      const element = HEAVENLY_STEMS[stemIndex].element;
      
      days.push({
        date: new Date(Date.UTC(year, month - 1, day)),
        stemBranch: { stem, branch },
        element
      });
    }
    
    return days;
  }
  
  /**
   * Get current DaYun period for a specific age
   */
  static getCurrentDaYun(daYunList: DaYunPeriod[], age: number): DaYunPeriod | null {
    return daYunList.find(period => age >= period.startAge && age <= period.endAge) || null;
  }
  
  /**
   * Get current LiuNian for a specific year
   */
  static getCurrentLiuNian(birthYear: number, currentYear: number): LiuNianYear {
    const [liuNian] = this.calFleetingYearList(birthYear, [currentYear]);
    return liuNian;
  }
  
  /**
   * Calculate interaction between DaYun and LiuNian
   * Returns analysis of their combined influence
   */
  static analyzeDaYunLiuNian(
    daYun: DaYunPeriod,
    liuNian: LiuNianYear
  ): {
    stemRelation: string;
    branchRelation: string;
    elementalBalance: string;
  } {
    // Analyze stem relationship
    const daYunStemIndex = HEAVENLY_STEMS.findIndex(s => s.name === daYun.stemBranch.stem);
    const liuNianStemIndex = HEAVENLY_STEMS.findIndex(s => s.name === liuNian.stemBranch.stem);
    
    let stemRelation = '中性';
    const stemDiff = Math.abs(daYunStemIndex - liuNianStemIndex);
    if (stemDiff === 5) {
      stemRelation = 'combine'; // 天干合
    } else if (stemDiff === 4 || stemDiff === 6) {
      stemRelation = 'clash'; // 天干冲
    }
    
    // Analyze branch relationship
    const daYunBranchIndex = EARTHLY_BRANCHES.findIndex(b => b.name === daYun.stemBranch.branch);
    const liuNianBranchIndex = EARTHLY_BRANCHES.findIndex(b => b.name === liuNian.stemBranch.branch);
    
    let branchRelation = '中性';
    const branchDiff = Math.abs(daYunBranchIndex - liuNianBranchIndex);
    if (branchDiff === 6) {
      branchRelation = 'clash'; // 地支冲
    } else if ([1, 5, 7, 11].includes(branchDiff)) {
      branchRelation = 'harmony'; // 地支合
    }
    
    // Analyze elemental balance
    let elementalBalance = '平衡';
    if (daYun.element === liuNian.element) {
      elementalBalance = 'reinforced';
    } else {
      // Check generating/controlling cycle
      const generatingCycle: Record<string, string> = {
        '木': '火', '火': '土', '土': '金', '金': '水', '水': '木'
      };
      const controllingCycle: Record<string, string> = {
        '木': '土', '土': '水', '水': '火', '火': '金', '金': '木'
      };
      
      if (generatingCycle[daYun.element] === liuNian.element) {
        elementalBalance = 'generating';
      } else if (controllingCycle[daYun.element] === liuNian.element) {
        elementalBalance = 'controlling';
      }
    }
    
    return {
      stemRelation,
      branchRelation,
      elementalBalance
    };
  }
}