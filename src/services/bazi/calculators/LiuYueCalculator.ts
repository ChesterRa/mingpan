import { 
  Stem, 
  Branch, 
  FiveElement,
  LiuYueInfo,
  ChineseDate
} from '../types';
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, FIVE_ELEMENTS } from '../../../core/constants/bazi';
import { LuckCycleCalculator } from './LuckCycleCalculator';
import { PreciseSolarTermCalculator } from '../../../core/calendar/solarTerms';

// Extract simple arrays for easier usage
const STEMS = HEAVENLY_STEMS.map(s => s.name) as Stem[];
const BRANCHES = EARTHLY_BRANCHES.map(b => b.name) as Branch[];

// Create stem-element mapping
const STEM_ELEMENTS: Record<Stem, FiveElement> = HEAVENLY_STEMS.reduce((acc, stem) => {
  acc[stem.name as Stem] = stem.element as FiveElement;
  return acc;
}, {} as Record<Stem, FiveElement>);

// Create branch-element mapping
const BRANCH_ELEMENTS: Record<Branch, FiveElement> = EARTHLY_BRANCHES.reduce((acc, branch) => {
  acc[branch.name as Branch] = branch.element as FiveElement;
  return acc;
}, {} as Record<Branch, FiveElement>);

// Solar term months - each month starts from a specific solar term (節)
const MONTH_STARTING_SOLAR_TERMS = [
  '立春', // 寅月
  '惊蛰', // 卯月
  '清明', // 辰月
  '立夏', // 巳月
  '芒种', // 午月
  '小暑', // 未月
  '立秋', // 申月
  '白露', // 酉月
  '寒露', // 戌月
  '立冬', // 亥月
  '大雪', // 子月
  '小寒'  // 丑月
];

/**
 * Calculator for Liu Yue (流月) - Monthly Fortune Cycles
 * Provides month-by-month analysis within a Liu Nian year
 */
export class LiuYueCalculator {
  private luckCalculator: LuckCycleCalculator;

  constructor() {
    this.luckCalculator = new LuckCycleCalculator();
  }

  /**
   * Calculate all Liu Yue for a specific year
   */
  calculateLiuYue(
    yearStem: Stem,
    yearBranch: Branch,
    dayMasterElement: FiveElement,
    yongShen: FiveElement[],
    birthDate: ChineseDate,
    currentYear: number
  ): LiuYueInfo[] {
    const months: LiuYueInfo[] = [];
    
    // Get all solar terms for the year
    const yearSolarTerms = PreciseSolarTermCalculator.calculateYearSolarTerms(currentYear);
    const nextYearSolarTerms = PreciseSolarTermCalculator.calculateYearSolarTerms(currentYear + 1);
    
    // Calculate the stem for the first month (寅月)
    const firstMonthStem = this.calculateFirstMonthStem(yearStem);
    
    for (let i = 0; i < 12; i++) {
      const monthBranch = BRANCHES[(i + 2) % 12] as Branch; // Start from 寅
      const monthStemIndex = (STEMS.indexOf(firstMonthStem) + i) % 10;
      const monthStem = STEMS[monthStemIndex] as Stem;
      
      // Calculate month dates based on solar terms
      const { startDate, endDate, solarTermInfo } = this.getMonthDates(
        currentYear, 
        i, 
        yearSolarTerms, 
        nextYearSolarTerms
      );
      
      // Analyze month fortune
      const analysis = this.analyzeMonth(
        monthStem,
        monthBranch,
        yearStem,
        yearBranch,
        dayMasterElement,
        yongShen
      );
      
      months.push({
        month: i + 1,
        stem: monthStem,
        branch: monthBranch,
        startDate,
        endDate,
        fortune: analysis.fortune,
        rating: analysis.rating,
        mainInfluences: analysis.mainInfluences,
        opportunities: analysis.opportunities,
        challenges: analysis.challenges,
        recommendations: analysis.recommendations,
        healthFocus: analysis.healthFocus,
        luckyDays: this.calculateLuckyDays(monthStem, monthBranch, dayMasterElement),
        solarTerm: solarTermInfo // Store solar term info for display
      });
    }
    
    return months;
  }

  /**
   * Calculate the stem for the first month based on year stem
   */
  private calculateFirstMonthStem(yearStem: Stem): Stem {
    const yearStemIndex = STEMS.indexOf(yearStem);
    const rules: Record<number, Stem> = {
      0: '丙', // 甲年
      1: '戊', // 乙年
      2: '庚', // 丙年
      3: '壬', // 丁年
      4: '甲', // 戊年
      5: '丙', // 己年
      6: '戊', // 庚年
      7: '庚', // 辛年
      8: '壬', // 壬年
      9: '甲'  // 癸年
    };
    return rules[yearStemIndex] as Stem;
  }

  /**
   * Get solar calendar dates for a Chinese month based on solar terms
   */
  private getMonthDates(
    year: number, 
    monthIndex: number,
    yearSolarTerms: Array<{name: string; date: Date}>,
    nextYearSolarTerms: Array<{name: string; date: Date}>
  ): { 
    startDate: Date; 
    endDate: Date; 
    solarTermInfo?: { name: string; date: Date } 
  } {
    // Each Chinese month starts from a specific solar term (節)
    const startingSolarTerm = MONTH_STARTING_SOLAR_TERMS[monthIndex];
    const nextSolarTerm = MONTH_STARTING_SOLAR_TERMS[(monthIndex + 1) % 12];
    
    // Find the starting solar term
    // 注意：八字年从立春开始到次年立春前结束
    // 丑月（monthIndex=11）的开始节气"小寒"在公历次年1月初，需要从下一年节气表查找
    let startDate: Date | null = null;
    let solarTermInfo: { name: string; date: Date } | undefined;
    
    if (monthIndex === 11) {
      // 丑月（小寒~立春）开始于公历次年1月
      for (const term of nextYearSolarTerms) {
        if (term.name === startingSolarTerm) {
          startDate = term.date;
          solarTermInfo = term;
          break;
        }
      }
    } else {
      for (const term of yearSolarTerms) {
        if (term.name === startingSolarTerm) {
          startDate = term.date;
          solarTermInfo = term;
          break;
        }
      }
      
      // If not found in current year (e.g., 立春 might be in previous year)
      if (!startDate && monthIndex === 0) {
        const prevYearTerms = PreciseSolarTermCalculator.calculateYearSolarTerms(year - 1);
        for (const term of prevYearTerms) {
          if (term.name === startingSolarTerm) {
            startDate = term.date;
            solarTermInfo = term;
            break;
          }
        }
      }
    }
    
    // Find the ending solar term
    let endDate: Date | null = null;
    
    // First check current year
    for (const term of yearSolarTerms) {
      if (term.name === nextSolarTerm) {
        // End date should be the moment before the next solar term starts
        endDate = new Date(term.date.getTime() - 1);
        break;
      }
    }
    
    // If not found, or if endDate is before startDate (cross-year case like 子月 or 丑月),
    // check next year
    // 例如：子月从大雪(12/7)到小寒(次年1/5)，当年1月的小寒比大雪早，需要用次年的小寒
    if (!endDate || (startDate && endDate.getTime() <= startDate.getTime())) {
      for (const term of nextYearSolarTerms) {
        if (term.name === nextSolarTerm) {
          // End date should be the moment before the next solar term starts
          endDate = new Date(term.date.getTime() - 1);
          break;
        }
      }
    }
    
    // Fallback to approximate dates if solar terms not found
    if (!startDate) {
      startDate = new Date(Date.UTC(year, monthIndex + 1, 1));
    }
    if (!endDate) {
      endDate = new Date(Date.UTC(year, monthIndex + 2, 0));
    }
    
    return { startDate, endDate, solarTermInfo };
  }


  /**
   * Analyze month fortune
   */
  private analyzeMonth(
    monthStem: Stem,
    monthBranch: Branch,
    yearStem: Stem,
    yearBranch: Branch,
    dayMasterElement: FiveElement,
    yongShen: FiveElement[]
  ): {
    fortune: string;
    rating: number;
    mainInfluences: string[];
    opportunities: string[];
    challenges: string[];
    recommendations: string[];
    healthFocus: string[];
  } {
    const monthElement = STEM_ELEMENTS[monthStem];
    const monthBranchElement = BRANCH_ELEMENTS[monthBranch];
    
    // Calculate fortune rating based on element compatibility
    let rating = 50; // Base rating
    
    // YongShen bonus
    if (yongShen.includes(monthElement)) {
      rating += 30;
    }
    
    // Element cycle bonus/penalty
    const elementCycle: Record<FiveElement, FiveElement> = {
      '木': '火', // Wood generates Fire
      '火': '土', // Fire generates Earth
      '土': '金', // Earth generates Metal
      '金': '水', // Metal generates Water
      '水': '木'  // Water generates Wood
    };
    
    const elementControl: Record<FiveElement, FiveElement> = {
      '木': '土', // Wood controls Earth
      '土': '水', // Earth controls Water
      '水': '火', // Water controls Fire
      '火': '金', // Fire controls Metal
      '金': '木'  // Metal controls Wood
    };
    
    if (elementCycle[dayMasterElement] === monthElement) {
      rating += 10; // Month supports day master
    } else if (elementCycle[monthElement] === dayMasterElement) {
      rating += 15; // Day master receives support
    } else if (elementControl[monthElement] === dayMasterElement) {
      rating -= 20; // Day master is controlled
    } else if (elementControl[dayMasterElement] === monthElement) {
      rating += 5; // Day master controls month
    }
    
    // Ensure rating is within bounds
    rating = Math.max(0, Math.min(100, rating));
    
    // Analyze influences
    const mainInfluences = [];
    const opportunities = [];
    const challenges = [];
    const recommendations = [];
    const healthFocus = [];
    
    // Month-Year interaction
    if (this.isHarmony(monthStem, yearStem)) {
      mainInfluences.push('month_year_harmony');
      opportunities.push('smooth_progress');
    }
    
    if (this.isClash(monthBranch, yearBranch)) {
      mainInfluences.push('month_year_clash');
      challenges.push('potential_conflicts');
    }
    
    // YongShen support
    if (yongShen.includes(monthElement)) {
      opportunities.push('yongshen_support');
      recommendations.push('seize_opportunities');
    } else if (this.isUnfavorable(monthElement, yongShen)) {
      challenges.push('unfavorable_element');
      recommendations.push('stay_cautious');
    }
    
    // Health focus based on element
    healthFocus.push(...this.getHealthFocus(monthElement));
    
    // Fortune description
    const fortune = this.getFortuneDescription(rating);
    
    return {
      fortune,
      rating,
      mainInfluences,
      opportunities,
      challenges,
      recommendations,
      healthFocus
    };
  }

  /**
   * Calculate lucky days within a month
   */
  private calculateLuckyDays(
    monthStem: Stem,
    monthBranch: Branch,
    dayMasterElement: FiveElement
  ): number[] {
    const luckyDays: number[] = [];
    const monthElement = STEM_ELEMENTS[monthStem];
    
    // Simplified lucky day calculation
    // In production, calculate based on daily stems and branches
    for (let day = 1; day <= 30; day++) {
      if ((day % 6) === (STEMS.indexOf(monthStem) % 6)) {
        luckyDays.push(day);
      }
    }
    
    return luckyDays.slice(0, 5); // Return top 5 lucky days
  }

  /**
   * Check if two stems are in harmony
   */
  private isHarmony(stem1: Stem, stem2: Stem): boolean {
    const harmonies: Record<Stem, Stem> = {
      '甲': '己', '己': '甲',
      '乙': '庚', '庚': '乙',
      '丙': '辛', '辛': '丙',
      '丁': '壬', '壬': '丁',
      '戊': '癸', '癸': '戊'
    };
    return harmonies[stem1] === stem2;
  }

  /**
   * Check if two branches clash
   */
  private isClash(branch1: Branch, branch2: Branch): boolean {
    const clashes: Record<Branch, Branch> = {
      '子': '午', '午': '子',
      '丑': '未', '未': '丑',
      '寅': '申', '申': '寅',
      '卯': '酉', '酉': '卯',
      '辰': '戌', '戌': '辰',
      '巳': '亥', '亥': '巳'
    };
    return clashes[branch1] === branch2;
  }

  /**
   * Check if element is unfavorable
   */
  private isUnfavorable(element: FiveElement, yongShen: FiveElement[]): boolean {
    const unfavorableMap: Record<FiveElement, FiveElement[]> = {
      '木': ['金'],
      '火': ['水'],
      '土': ['木'],
      '金': ['火'],
      '水': ['土']
    };
    
    return yongShen.some(ys => unfavorableMap[ys]?.includes(element));
  }

  /**
   * Get health focus areas based on element
   */
  private getHealthFocus(element: FiveElement): string[] {
    const healthMap: Record<FiveElement, string[]> = {
      '木': ['liver_health', 'eye_care', 'emotional_balance'],
      '火': ['heart_health', 'blood_circulation', 'sleep_quality'],
      '土': ['digestive_health', 'immune_system', 'grounding'],
      '金': ['respiratory_health', 'skin_care', 'detoxification'],
      '水': ['kidney_health', 'bone_strength', 'hydration']
    };
    
    return healthMap[element] || [];
  }

  /**
   * Get fortune description based on rating
   */
  private getFortuneDescription(rating: number): string {
    if (rating >= 85) return '优秀';
    if (rating >= 70) return 'very_good';
    if (rating >= 55) return '良好';
    if (rating >= 40) return '一般';
    if (rating >= 25) return '挑战';
    return '困难';
  }
}