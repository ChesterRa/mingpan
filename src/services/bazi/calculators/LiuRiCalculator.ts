import { 
  Stem, 
  Branch, 
  FiveElement,
  LiuRiInfo,
  ChineseDate
} from '../types';
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, FIVE_ELEMENTS } from '../../../core/constants/bazi';
import { LuckCycleCalculator } from './LuckCycleCalculator';
import { PreciseSolarTermCalculator } from '../../../core/calendar/solarTerms';
import { Solar } from 'lunar-javascript';

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

/**
 * Calculator for Liu Ri (流日) - Daily Fortune Cycles
 * Provides day-by-day analysis within a Liu Yue month
 */
export class LiuRiCalculator {
  private luckCalculator: LuckCycleCalculator;

  constructor() {
    this.luckCalculator = new LuckCycleCalculator();
  }

  /**
   * Calculate all Liu Ri for a specific month (based on solar terms)
   */
  calculateLiuRi(
    monthStem: Stem,
    monthBranch: Branch,
    yearStem: Stem,
    yearBranch: Branch,
    dayMasterElement: FiveElement,
    yongShen: FiveElement[],
    year: number,
    month: number // This is the Gregorian month (1-12)
  ): LiuRiInfo[] {
    const days: LiuRiInfo[] = [];
    
    // Map of month branches to solar term names
    const BRANCH_TO_SOLAR_TERM: Record<Branch, string> = {
      '寅': '立春',
      '卯': '惊蛰',
      '辰': '清明',
      '巳': '立夏',
      '午': '芒种',
      '未': '小暑',
      '申': '立秋',
      '酉': '白露',
      '戌': '寒露',
      '亥': '立冬',
      '子': '大雪',
      '丑': '小寒'
    };
    
    // Map of branches to next solar term
    const BRANCH_TO_NEXT_TERM: Record<Branch, string> = {
      '寅': '惊蛰',
      '卯': '清明',
      '辰': '立夏',
      '巳': '芒种',
      '午': '小暑',
      '未': '立秋',
      '申': '白露',
      '酉': '寒露',
      '戌': '立冬',
      '亥': '大雪',
      '子': '小寒',
      '丑': '立春'
    };
    
    // Get the solar term boundaries based on the month branch
    const startSolarTerm = BRANCH_TO_SOLAR_TERM[monthBranch];
    const nextSolarTerm = BRANCH_TO_NEXT_TERM[monthBranch];
    
    // Calculate solar terms for this year and next year
    const yearSolarTerms = PreciseSolarTermCalculator.calculateYearSolarTerms(year);
    const nextYearSolarTerms = PreciseSolarTermCalculator.calculateYearSolarTerms(year + 1);
    
    // Find the start date of this month
    // 注意：八字年从立春开始到次年立春前结束
    // 子月（大雪）在公历12月，仍属于当年
    // 丑月（小寒）在公历1月5日左右，属于公历下一年，需要从下一年节气表查找
    let startDate: Date | null = null;
    
    // 丑月（monthBranch === '丑'）的开始节气"小寒"在公历次年1月初
    // 需要从下一年节气表查找
    if (monthBranch === '丑') {
      for (const term of nextYearSolarTerms) {
        if (term.name === startSolarTerm) {
          startDate = term.date;
          break;
        }
      }
    } else {
      // 其他月份先从当年查找
      for (const term of yearSolarTerms) {
        if (term.name === startSolarTerm) {
          startDate = term.date;
          break;
        }
      }
      
      // 如果是寅月（立春），可能在前一年
      if (!startDate && monthBranch === '寅') {
        const prevYearTerms = PreciseSolarTermCalculator.calculateYearSolarTerms(year - 1);
        for (const term of prevYearTerms) {
          if (term.name === startSolarTerm) {
            startDate = term.date;
            break;
          }
        }
      }
    }
    
    // Find the end date of this month
    let endDate: Date | null = null;
    
    // First check current year
    for (const term of yearSolarTerms) {
      if (term.name === nextSolarTerm) {
        endDate = term.date;
        break;
      }
    }
    
    // If end date is before start date (cross-year case like 子月 or 丑月),
    // or if not found, check next year
    // 例如：子月从大雪(12/7)到小寒(次年1/5)，当年1月的小寒比大雪早，需要用次年的小寒
    if (!endDate || (startDate && endDate.getTime() <= startDate.getTime())) {
      for (const term of nextYearSolarTerms) {
        if (term.name === nextSolarTerm) {
          endDate = term.date;
          break;
        }
      }
    }
    
    // Fallback if solar terms not found
    if (!startDate || !endDate) {
      console.warn('Solar term boundaries not found, falling back to gregorian month');
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    }
    
    // Calculate all days within this solar term month
    const currentDate = new Date(startDate);
    // Normalize end date to start of day to ensure we don't include the day the next solar term starts
    const endDateStartOfDay = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
    
    while (currentDate.getTime() < endDateStartOfDay.getTime()) {
      const iterDate = new Date(currentDate);
      // Calculate day stem and branch for each day individually
      const { dayStem: currentDayStem, dayBranch: currentDayBranch } = this.calculateDayStemBranch(currentDate);
      
      // Analyze day fortune
      const analysis = this.analyzeDay(
        currentDayStem,
        currentDayBranch,
        monthStem,
        monthBranch,
        yearStem,
        yearBranch,
        dayMasterElement,
        yongShen
      );
      
      // Calculate hourly fortunes
      const hourlyFortunes = this.calculateHourlyFortunes(
        currentDayStem,
        currentDayBranch,
        dayMasterElement,
        yongShen
      );
      
      days.push({
        date: iterDate,
        day: iterDate.getDate(), // Use the actual day of month
        stem: currentDayStem,
        branch: currentDayBranch,
        fortune: analysis.fortune,
        rating: analysis.rating,
        mainInfluences: analysis.mainInfluences,
        activities: {
          favorable: analysis.favorableActivities,
          avoid: analysis.avoidActivities
        },
        luckyHours: analysis.luckyHours,
        hourlyFortunes,
        energy: analysis.energyLevel,
        mood: analysis.moodIndicator,
        opportunities: analysis.opportunities,
        warnings: analysis.warnings
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  /**
   * Calculate day stem and branch for a given date
   */
  private calculateDayStemBranch(date: Date): { dayStem: Stem; dayBranch: Branch } {
    // Use lunar-javascript for accurate day pillar calculation
    const solar = Solar.fromYmd(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
    const lunar = solar.getLunar();
    
    // Get day GanZhi directly from lunar-javascript
    const dayGanZhi = lunar.getDayInGanZhi();
    
    return {
      dayStem: dayGanZhi.substring(0, 1) as Stem,
      dayBranch: dayGanZhi.substring(1, 2) as Branch
    };
  }

  /**
   * Analyze day fortune
   */
  private analyzeDay(
    dayStem: Stem,
    dayBranch: Branch,
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
    favorableActivities: string[];
    avoidActivities: string[];
    luckyHours: number[];
    energyLevel: string;
    moodIndicator: string;
    opportunities: string[];
    warnings: string[];
  } {
    const dayElement = STEM_ELEMENTS[dayStem];
    const dayBranchElement = BRANCH_ELEMENTS[dayBranch];
    
    // Calculate fortune rating based on element compatibility
    let rating = 50; // Base rating
    
    // YongShen bonus
    if (yongShen.includes(dayElement)) {
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
    
    if (elementCycle[dayMasterElement] === dayElement) {
      rating += 10; // Day supports day master
    } else if (elementCycle[dayElement] === dayMasterElement) {
      rating += 15; // Day master receives support
    } else if (elementControl[dayElement] === dayMasterElement) {
      rating -= 20; // Day master is controlled
    } else if (elementControl[dayMasterElement] === dayElement) {
      rating += 5; // Day master controls day
    }
    
    // Branch relationships bonus/penalty
    if (this.isClash(dayBranch, monthBranch)) {
      rating -= 15;
    }
    if (this.isTripleHarmony(dayBranch, monthBranch, yearBranch)) {
      rating += 20;
    }
    
    // Ensure rating is within bounds
    rating = Math.max(0, Math.min(100, rating));
    
    // Analyze influences
    const mainInfluences = [];
    const favorableActivities = [];
    const avoidActivities = [];
    const opportunities = [];
    const warnings = [];
    
    // Day-Month-Year interactions
    if (this.isTripleHarmony(dayBranch, monthBranch, yearBranch)) {
      mainInfluences.push('triple_harmony');
      opportunities.push('exceptional_luck');
      favorableActivities.push('important_decisions', 'new_ventures');
    }
    
    if (this.isClash(dayBranch, monthBranch)) {
      mainInfluences.push('day_month_clash');
      warnings.push('avoid_conflicts');
      avoidActivities.push('negotiations', 'confrontations');
    }
    
    // Element analysis
    if (yongShen.includes(dayElement)) {
      opportunities.push('favorable_energy');
      favorableActivities.push('career_advancement', 'financial_decisions');
    }
    
    // Activity recommendations based on element
    const activities = this.getActivityRecommendations(dayElement, rating);
    favorableActivities.push(...activities.favorable);
    avoidActivities.push(...activities.avoid);
    
    // Lucky hours
    const luckyHours = this.calculateLuckyHours(dayStem, dayMasterElement, yongShen);
    
    // Energy and mood
    const energyLevel = this.getEnergyLevel(rating);
    const moodIndicator = this.getMoodIndicator(dayElement, rating);
    
    // Fortune description
    const fortune = this.getFortuneDescription(rating);
    
    return {
      fortune,
      rating,
      mainInfluences,
      favorableActivities,
      avoidActivities,
      luckyHours,
      energyLevel,
      moodIndicator,
      opportunities,
      warnings
    };
  }

  /**
   * Calculate hourly fortunes for a day
   */
  private calculateHourlyFortunes(
    dayStem: Stem,
    dayBranch: Branch,
    dayMasterElement: FiveElement,
    yongShen: FiveElement[]
  ): Array<{
    hour: string;
    branch: Branch;
    rating: number;
    activity: string;
  }> {
    const hourlyFortunes = [];
    const hourBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as Branch[];
    const hourRanges = [
      '23:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00',
      '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00',
      '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00'
    ];
    
    // Calculate hour stem based on day stem
    const firstHourStem = this.calculateFirstHourStem(dayStem);
    
    for (let i = 0; i < 12; i++) {
      const hourBranch = hourBranches[i];
      const hourStemIndex = (STEMS.indexOf(firstHourStem) + i) % 10;
      const hourStem = STEMS[hourStemIndex] as Stem;
      const hourElement = STEM_ELEMENTS[hourStem];
      
      // Simple rating calculation
      let rating = 50;
      if (yongShen.includes(hourElement)) rating += 30;
      if (this.isClash(hourBranch, dayBranch)) rating -= 20;
      if (this.isHarmony(hourBranch, dayBranch)) rating += 20;
      
      // Activity recommendation
      const activity = this.getHourActivity(i, rating);
      
      hourlyFortunes.push({
        hour: hourRanges[i],
        branch: hourBranch,
        rating: Math.max(0, Math.min(100, rating)),
        activity
      });
    }
    
    return hourlyFortunes;
  }

  /**
   * Calculate the stem for the first hour based on day stem
   */
  private calculateFirstHourStem(dayStem: Stem): Stem {
    const dayStemIndex = STEMS.indexOf(dayStem);
    const rules: Record<number, Stem> = {
      0: '甲', // 甲日
      1: '丙', // 乙日
      2: '戊', // 丙日
      3: '庚', // 丁日
      4: '壬', // 戊日
      5: '甲', // 己日
      6: '丙', // 庚日
      7: '戊', // 辛日
      8: '庚', // 壬日
      9: '壬'  // 癸日
    };
    return rules[dayStemIndex % 5 * 2] as Stem;
  }

  /**
   * Calculate lucky hours for the day
   */
  private calculateLuckyHours(dayStem: Stem, dayMasterElement: FiveElement, yongShen: FiveElement[]): number[] {
    const luckyHours = [];
    const dayElement = STEM_ELEMENTS[dayStem];
    
    // Hours that support yong shen
    if (yongShen.includes('木')) luckyHours.push(3, 4); // 寅卯時
    if (yongShen.includes('火')) luckyHours.push(5, 6); // 巳午時
    if (yongShen.includes('土')) luckyHours.push(2, 5, 8, 11); // 丑辰未戌時
    if (yongShen.includes('金')) luckyHours.push(8, 9); // 申酉時
    if (yongShen.includes('水')) luckyHours.push(0, 10); // 子亥時
    
    return [...new Set(luckyHours)].sort((a, b) => a - b);
  }

  /**
   * Get activity recommendations based on element and rating
   */
  private getActivityRecommendations(element: FiveElement, rating: number): {
    favorable: string[];
    avoid: string[];
  } {
    const elementActivities: Record<FiveElement, { favorable: string[]; avoid: string[] }> = {
      '木': {
        favorable: ['planning', 'creative_work', 'networking'],
        avoid: ['metal_work', 'cutting', 'surgery']
      },
      '火': {
        favorable: ['presentations', 'celebrations', 'marketing'],
        avoid: ['water_activities', 'emotional_decisions']
      },
      '土': {
        favorable: ['real_estate', 'building', 'stability_focus'],
        avoid: ['risky_ventures', 'speculation']
      },
      '金': {
        favorable: ['financial_planning', 'legal_matters', 'precision_work'],
        avoid: ['fire_activities', 'impulsive_actions']
      },
      '水': {
        favorable: ['travel', 'learning', 'communication'],
        avoid: ['earth_work', 'stubborn_positions']
      }
    };
    
    const base = elementActivities[element];
    
    if (rating >= 70) {
      base.favorable.push('important_meetings', 'contract_signing');
    } else if (rating < 40) {
      base.avoid.push('major_decisions', 'investments');
    }
    
    return base;
  }

  /**
   * Get hour activity recommendation
   */
  private getHourActivity(hour: number, rating: number): string {
    const activities = [
      'rest_meditation',      // 子時
      'sleep_rejuvenation',   // 丑時
      'early_exercise',       // 寅時
      'planning_strategy',    // 卯時
      'focused_work',         // 辰時
      'communication',        // 巳時
      'peak_performance',     // 午時
      'creative_tasks',       // 未時
      'analysis_review',      // 申時
      'social_networking',    // 酉時
      'relaxation',          // 戌時
      'preparation_rest'      // 亥時
    ];
    
    if (rating < 30) {
      return 'avoid_important_tasks';
    }
    
    return activities[hour];
  }

  /**
   * Check if three branches form a harmony
   */
  private isTripleHarmony(branch1: Branch, branch2: Branch, branch3: Branch): boolean {
    const harmonies = [
      ['申', '子', '辰'], // Water
      ['寅', '午', '戌'], // Fire
      ['巳', '酉', '丑'], // Metal
      ['亥', '卯', '未']  // Wood
    ];
    
    return harmonies.some(group => 
      group.includes(branch1) && group.includes(branch2) && group.includes(branch3)
    );
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
   * Check if two branches are in harmony
   */
  private isHarmony(branch1: Branch, branch2: Branch): boolean {
    const harmonies: Record<Branch, Branch> = {
      '子': '丑', '丑': '子',
      '寅': '亥', '亥': '寅',
      '卯': '戌', '戌': '卯',
      '辰': '酉', '酉': '辰',
      '巳': '申', '申': '巳',
      '午': '未', '未': '午'
    };
    return harmonies[branch1] === branch2;
  }

  /**
   * Get energy level description
   */
  private getEnergyLevel(rating: number): string {
    if (rating >= 80) return 'high_energy';
    if (rating >= 60) return 'good_energy';
    if (rating >= 40) return 'moderate_energy';
    if (rating >= 20) return 'low_energy';
    return 'very_low_energy';
  }

  /**
   * Get mood indicator
   */
  private getMoodIndicator(element: FiveElement, rating: number): string {
    const elementMoods: Record<FiveElement, string> = {
      '木': 'growth_oriented',
      '火': 'enthusiastic',
      '土': '稳定',
      '金': 'determined',
      '水': 'adaptable'
    };
    
    if (rating < 30) {
      return 'challenging_mood';
    }
    
    return elementMoods[element];
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