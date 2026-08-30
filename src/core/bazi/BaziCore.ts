/**
 * BaZi Core Calculator
 * Enhanced with taro-bazi astronomical calculations
 * Language-agnostic core calculations
 */

import { 
  BaziChart, 
  Pillar, 
  HiddenStem,
  FiveElementsAnalysis,
  ElementBalance,
  TwelveGrowthStage,
  NaYinInfo,
  LunarDate,
  BaziCoreInput,
  BaziCoreResult
} from './types';
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, FIVE_ELEMENTS, HIDDEN_STEMS, NA_YIN, GROWTH_STAGE_MAPPING } from '../../core/constants/bazi';
import { TrueSolarTime } from './TrueSolarTime';
import { 
  getSolarTermInfo, 
  calculateSolarTerm, 
  getAdjacentSolarTermTime,
  getTrueSolarTime,
  SOLAR_TERMS,
  SOLAR_TERM_TO_ZHI
} from './SolarTermCalculator';

// Import necessary utilities from existing code
import { PreciseCalendar } from '../../core/calendar/calendar';
import { Solar, Lunar } from 'lunar-javascript';

// Define CalendarDate interface
interface CalendarDate {
  year: number;
  month: number;
  day: number;
  hour: number;
}

// Define solar term info interface
interface SolarTermData {
  solarTerm: string;
  isCurrentMonthSolarTerm: boolean;
  adjacentSolarTermTime?: {
    previous: string;
    next: string;
  };
}

export class BaziCore {
  constructor() {
    // PreciseCalendar uses static methods, no need to instantiate
  }
  
  /**
   * Main calculation method
   * Calculates the four pillars based on birth information
   */
  async calculate(input: BaziCoreInput): Promise<BaziCoreResult> {
    // Step 1: 构造北京墙钟载体（Date.UTC 构造 + getUTC* 读取，与宿主时区无关）
    let birthDate = new Date(
      Date.UTC(
        input.year,
        input.month - 1,
        input.day,
        input.hour,
        input.minute || 0
      )
    );
    
    // Step 2: Apply true solar time if longitude provided
    let trueSolarTime: Date | undefined;
    let trueSolarTimeStr: string | undefined;
    if (input.longitude !== undefined) {
      trueSolarTimeStr = getTrueSolarTime(
        input.year,
        input.month,
        input.day,
        `${input.hour}:${input.minute || 0}:0`,
        input.longitude
      );
      // Parse true solar time string back to adjust birth date
      trueSolarTime = TrueSolarTime.adjust(birthDate, input.longitude);
      birthDate = trueSolarTime;
    }
    
    // Step 3: Calculate solar terms using lunar-javascript
    const solar = Solar.fromYmdHms(
      birthDate.getUTCFullYear(),
      birthDate.getUTCMonth() + 1,
      birthDate.getUTCDate(),
      birthDate.getUTCHours(),
      birthDate.getUTCMinutes(),
      birthDate.getUTCSeconds()
    );
    const lunar = solar.getLunar();
    // Get the previous Jie to determine the current month
    const prevJie = lunar.getPrevJie();
    const solarTerm = prevJie ? prevJie.getName() : '立春'; // Default to LiChun if no term found
    
    // Calculate if it's current month solar term
    const monthZhi = SOLAR_TERM_TO_ZHI[solarTerm] || '卯';
    const isCurrentMonthSolarTerm = true; // Simplified for now
    
    // Get adjacent solar term times (simplified)
    const adjacentSolarTermTime = {
      previous: '',
      next: ''
    };
    
    // Step 4: Calculate four pillars with solar term consideration
    // 注意：一律使用（可能的真太阳时）校正后的 birthDate 分量，
    // 与 Step 3 的节气月柱同源。此前误传 input.* 原始分量，
    // 导致 longitude 校正只影响年/月柱而日/时柱不校正（v0.1.0 起的缺陷）。
    const chart = this.calculateHoroscope(
      birthDate.getUTCFullYear(),
      birthDate.getUTCMonth() + 1,
      birthDate.getUTCDate(),
      birthDate.getUTCHours(),
      solarTerm,
      isCurrentMonthSolarTerm,
      lunar
    );
    
    // Step 5: Get lunar date (already calculated above)
    const rawMonth = lunar.getMonth();
    const lunarDate: LunarDate = {
      year: lunar.getYear(),
      month: Math.abs(rawMonth),
      day: lunar.getDay(),
      hour: solar.getHour(),
      isLeapMonth: rawMonth < 0,
      monthName: lunar.getMonthInChinese(),
      dayName: lunar.getDayInChinese()
    };
    
    // Step 5.5: 命宫/胎元（古典法：命宫依《三命通会》子平起法，胎元依《渊海子平》；
    // 实现取 lunar-javascript，已与其测试向量及典籍手工推演逐例核对）
    let mingGong: string | undefined;
    let taiYuan: string | undefined;
    try {
      const eightCharForGong = lunar.getEightChar();
      mingGong = eightCharForGong.getMingGong();
      taiYuan = eightCharForGong.getTaiYuan();
    } catch {
      // 历法边界异常时容忍缺省
    }

    // Step 6: Calculate derived information
    const dayMasterElement = this.getStemElement(chart.day.stem);
    const zodiac = this.getZodiac(chart.year.branch);
    const naYin = this.getNaYin(chart.year);
    const fiveElements = this.calculateFiveElements(chart);
    
    // Step 7: Calculate additional features from taro-bazi
    const voidBranches = this.calculateVoidBranches(chart.day);
    const twelveGrowthStages = await this.calculateTwelveGrowthStages(chart);
    
    return {
      chart,
      birthInfo: {
        solar: birthDate,
        lunar: lunarDate,
        trueSolarTime,
        solarTerm,
        adjacentSolarTermTime
      },
      zodiac,
      mingGong,
      taiYuan,
      dayMasterElement,
      naYin,
      fiveElements,
      voidBranches,
      twelveGrowthStages
    };
  }
  
  /**
   * Calculate four pillars based on taro-bazi logic
   */
  private calculateHoroscope(
    year: number,
    month: number,
    day: number,
    hour: number,
    solarTerm: string,
    isCurrentMonthSolarTerm: boolean,
    lunar: ReturnType<typeof Solar.prototype.getLunar>
  ): BaziChart {
    // Calculate year pillar
    const { yearGan, yearZhi } = this.calculateYearPillar(lunar);
    
    // Calculate month pillar
    const { monthGan, monthZhi } = this.calculateMonthPillar(yearGan, month, solarTerm, isCurrentMonthSolarTerm);
    
    // Calculate day pillar
    const { dayGan, dayZhi } = this.calculateDayPillar(year, month, day, hour);
    
    // Calculate hour pillar
    const { hourGan, hourZhi } = this.calculateHourPillar(dayGan, hour);
    
    // Create pillars - each calculates its own void branches
    const chart = {
      year: this.createPillar(yearGan, yearZhi),
      month: this.createPillar(monthGan, monthZhi),
      day: this.createPillar(dayGan, dayZhi),
      hour: this.createPillar(hourGan, hourZhi)
    };
    
    // Update self-sitting for each pillar using its OWN stem
    chart.year.selfSitting = this.calculateSelfSitting(yearGan, yearZhi);
    chart.month.selfSitting = this.calculateSelfSitting(monthGan, monthZhi);
    chart.day.selfSitting = this.calculateSelfSitting(dayGan, dayZhi);
    chart.hour.selfSitting = this.calculateSelfSitting(hourGan, hourZhi);
    
    return chart;
  }
  
  /**
   * Calculate year pillar
   *
   * 干支年以立春交接时刻为界（非农历正月初一）。
   * 此前实现用「每月15日」近似日期查 getYearInGanZhi()（春节界），
   * 导致立春至春节期间（每年2月上中旬最长约两周）年柱错排。
   * 参照：lunar-javascript getYearInGanZhiExact（立春精确到时刻）、
   * 八字主流口径。
   */
  private calculateYearPillar(lunar: ReturnType<typeof Solar.prototype.getLunar>): {
    yearGan: string;
    yearZhi: string;
  } {
    const yearGanZhi = lunar.getYearInGanZhiExact();

    return {
      yearGan: yearGanZhi.substring(0, 1),
      yearZhi: yearGanZhi.substring(1, 2)
    };
  }
  
  /**
   * Calculate month pillar based on solar term
   */
  private calculateMonthPillar(
    yearGan: string,
    month: number,
    solarTerm: string,
    isCurrentMonthSolarTerm: boolean
  ): {
    monthGan: string;
    monthZhi: string;
  } {
    // Normalize solar term to simplified form to avoid zh-TW/zh-CN mismatch
    const normalizedTerm = this.normalizeSolarTerm(solarTerm);
    // Get the month branch from solar term (fallback to 丑 if unknown)
    const monthZhi = SOLAR_TERM_TO_ZHI[normalizedTerm] || EARTHLY_BRANCHES[1].name;
    
    // Map branch to solar term month index (寅=0, 卯=1, ..., 丑=11)
    const zhiToMonthIndex: Record<string, number> = {
      '寅': 0, '卯': 1, '辰': 2, '巳': 3,
      '午': 4, '未': 5, '申': 6, '酉': 7,
      '戌': 8, '亥': 9, '子': 10, '丑': 11
    };
    
    const solarTermMonthIndex = zhiToMonthIndex[monthZhi] ?? 1;
    
    // Five Tigers Escape (五虎遁) for month stem
    const fiveTigersDict: Record<string, string> = {
      '甲': '丙', '己': '丙',
      '乙': '戊', '庚': '戊',
      '丙': '庚', '辛': '庚',
      '丁': '壬', '壬': '壬',
      '戊': '甲', '癸': '甲'
    };
    
    const startGan = fiveTigersDict[yearGan];
    const startGanIndex = HEAVENLY_STEMS.findIndex(s => s.name === startGan);
    
    // Calculate month stem based on solar term month
    const ganIndex = (startGanIndex + solarTermMonthIndex) % 10;
    
    return {
      monthGan: HEAVENLY_STEMS[ganIndex].name,
      monthZhi: monthZhi
    };
  }

  /**
   * Normalize solar term names to simplified Chinese keys used by SOLAR_TERM_TO_ZHI
   */
  private normalizeSolarTerm(term: string): string {
    // Quick exit for exact matches
    if (SOLAR_TERM_TO_ZHI[term]) return term;
    const map: Record<string, string> = {
      '驚蟄': '惊蛰',
      '處暑': '处暑',
      '穀雨': '谷雨',
      '小滿': '小满',
      '大雪': '大雪',
      '小雪': '小雪',
      '霜降': '霜降',
      '白露': '白露',
      '秋分': '秋分',
      '寒露': '寒露',
      '立冬': '立冬',
      '小寒': '小寒',
      '大寒': '大寒',
      '立春': '立春',
      '雨水': '雨水',
      '春分': '春分',
      '清明': '清明',
      '立夏': '立夏',
      '芒種': '芒种',
      '夏至': '夏至',
      '小暑': '小暑',
      '大暑': '大暑',
      '立秋': '立秋',
      '冬至': '冬至'
    };
    // Remove whitespace and normalize punctuation
    const clean = term.replace(/\s+/g, '');
    return map[clean] || clean;
  }
  
  /**
   * Calculate day pillar
   */
  private calculateDayPillar(year: number, month: number, day: number, hour: number): {
    dayGan: string;
    dayZhi: string;
  } {
    // Use lunar-javascript for accurate day pillar calculation
    // 口径（2026-08-30 裁定，与用户共识）：子初换日——23:00 起即属次日，
    // 日柱与时柱同换。不采用「早晚子时」区分（该说系明末清初钟表传入后的
    // 后期修正，古籍无据，民国袁树珊《命理探源》始正式化）。
    const solar = hour === 23
      ? Solar.fromYmd(year, month, day).next(1)
      : Solar.fromYmd(year, month, day);
    const lunar = solar.getLunar();
    
    // Get day GanZhi directly from lunar-javascript
    const dayGanZhi = lunar.getDayInGanZhi();
    
    // Split GanZhi into Gan and Zhi
    const dayGan = dayGanZhi.substring(0, 1);
    const dayZhi = dayGanZhi.substring(1, 2);
    
    return {
      dayGan,
      dayZhi
    };
  }
  
  /**
   * Calculate hour pillar
   */
  private calculateHourPillar(dayGan: string, hour: number): {
    hourGan: string;
    hourZhi: string;
  } {
    // Five Rats Escape (五鼠遁) for hour stem
    const fiveRatsDict: Record<string, string> = {
      '甲': '甲', '己': '甲',
      '乙': '丙', '庚': '丙',
      '丙': '戊', '辛': '戊',
      '丁': '庚', '壬': '庚',
      '戊': '壬', '癸': '壬'
    };
    
    // 子初换日后，23 点出生的 dayGan 已是次日干，五鼠遁自然得出次日子时，
    // 无需任何早/晚子时特判
    const startGan = fiveRatsDict[dayGan];
    const startGanIndex = HEAVENLY_STEMS.findIndex(s => s.name === startGan);
    const zhiIndex = Math.ceil(hour / 2) % 12;
    const ganIndex = (startGanIndex + zhiIndex) % 10;
    
    return {
      hourGan: HEAVENLY_STEMS[ganIndex].name,
      hourZhi: EARTHLY_BRANCHES[zhiIndex].name
    };
  }
  
  /**
   * Create a pillar with hidden stems and Na Yin
   */
  private createPillar(stem: string, branch: string): Pillar {
    const hiddenStems = this.getHiddenStems(branch);
    const naYin = NA_YIN[`${stem}${branch}`] || '';
    
    // Self-sitting will be calculated later based on day stem
    const selfSitting = '';
    
    // Calculate void branches for this pillar
    const voidBranches = this.calculateVoidBranches({ stem, branch });
    const isVoid = voidBranches.includes(branch);
    
    return {
      stem,
      branch,
      hiddenStems,
      naYin,
      selfSitting,
      void: isVoid,
      voidBranches
    };
  }
  
  /**
   * Get hidden stems for a branch
   */
  private getHiddenStems(branch: string): HiddenStem[] {
    const stems = HIDDEN_STEMS[branch];
    if (!stems) return [];
    
    return stems.map((stem, index) => ({
      stem: stem.stem,
      power: stem.power,
      isMain: index === 0
    }));
  }
  
  /**
   * Get element of a heavenly stem
   */
  private getStemElement(stem: string): string {
    const stemData = HEAVENLY_STEMS.find(s => s.name === stem);
    return stemData?.element || '';
  }
  
  /**
   * Get element of an earthly branch
   */
  private getBranchElement(branch: string): string {
    const branchData = EARTHLY_BRANCHES.find(b => b.name === branch);
    return branchData?.element || '';
  }
  
  /**
   * Get zodiac animal for a branch
   */
  private getZodiac(branch: string): string {
    const branchData = EARTHLY_BRANCHES.find(b => b.name === branch);
    return branchData?.zodiac || branch;
  }
  
  /**
   * Get Na Yin information
   */
  private getNaYin(pillar: Pillar): NaYinInfo {
    const naYinName = pillar.naYin || '';
    const element = this.extractNaYinElement(naYinName);
    
    return {
      name: naYinName,
      element,
      meaning: this.getNaYinMeaning(naYinName)
    };
  }
  
  /**
   * Extract element from Na Yin name
   */
  private extractNaYinElement(naYin: string): string {
    for (const element of FIVE_ELEMENTS) {
      if (naYin.includes(element.name)) {
        return element.name;
      }
    }
    return '';
  }
  
  /**
   * Get Na Yin meaning
   */
  private getNaYinMeaning(naYin: string): string {
    // Simplified - in real implementation, would have detailed meanings
    const meanings: Record<string, string> = {
      '海中金': '海中之金，深藏不露',
      '爐中火': '爐中之火，煉化萬物',
      '大林木': '大林之木，挺拔向上',
      '路旁土': '路旁之土，承載萬物',
      '劍鋒金': '劍鋒之金，鋒芒畢露',
      // ... more meanings
    };
    return meanings[naYin] || naYin;
  }
  
  /**
   * Calculate five elements distribution
   */
  calculateFiveElements(chart: BaziChart): FiveElementsAnalysis {
    const count: Record<string, number> = {
      木: 0,
      火: 0,
      土: 0,
      金: 0,
      水: 0
    };
    
    // Count stems
    const stems = [chart.year.stem, chart.month.stem, chart.day.stem, chart.hour.stem];
    stems.forEach(stem => {
      const element = this.getStemElement(stem);
      if (element) count[element]++;
    });
    
    // Count branches (main qi)
    const branches = [chart.year.branch, chart.month.branch, chart.day.branch, chart.hour.branch];
    branches.forEach(branch => {
      const element = this.getBranchElement(branch);
      if (element) count[element]++;
    });
    
    // Count hidden stems
    const allPillars = [chart.year, chart.month, chart.day, chart.hour];
    allPillars.forEach(pillar => {
      if (pillar.hiddenStems) {
        pillar.hiddenStems.forEach(hidden => {
          const element = this.getStemElement(hidden.stem);
          if (element) count[element] += hidden.power;
        });
      }
    });
    
    // Calculate total and balance
    const total = Object.values(count).reduce((sum, val) => sum + val, 0);
    const elements = Object.entries(count).map(([elem, val]) => ({ element: elem, count: val }));
    const sorted = elements.sort((a, b) => b.count - a.count);
    
    const missing = FIVE_ELEMENTS
      .filter(e => count[e.name] === 0)
      .map(e => e.name);
    
    const balance: ElementBalance = {
      strongest: sorted[0].element,
      weakest: sorted[sorted.length - 1].element,
      missing,
      distribution: this.evaluateDistribution(count, total)
    };
    
    return {
      木: count['木'],
      火: count['火'],
      土: count['土'],
      金: count['金'],
      水: count['水'],
      total,
      balance
    };
  }
  
  /**
   * Evaluate element distribution
   */
  private evaluateDistribution(
    count: Record<string, number>,
    total: number
  ): '平衡' | '失衡' | '严重失衡' {
    const values = Object.values(count);
    const avg = total / 5;
    const deviations = values.map(v => Math.abs(v - avg));
    const maxDeviation = Math.max(...deviations);
    
    if (maxDeviation < avg * 0.5) return '平衡';
    if (maxDeviation < avg * 1.0) return '失衡';
    return '严重失衡';
  }
  
  /**
   * Calculate twelve growth stages based on taro-bazi logic
   */
  async calculateTwelveGrowthStages(chart: BaziChart): Promise<TwelveGrowthStage[]> {
    const dayGan = chart.day.stem;
    const dayGanIndex = HEAVENLY_STEMS.findIndex(s => s.name === dayGan);
    const twelveGrowInfo: Record<string, string> = {};
    
    const twelvegGrowthStages = [
      '長生', '沐浴', '冠帶', '臨官', '帝旺', '衰',
      '病', '死', '墓', '絕', '胎', '養'
    ];
    
    // Yang stems go forward, Yin stems go backward
    if (dayGanIndex % 2 === 0) {
      // Yang day master - forward
      const offsetMap: Record<string, number> = {
        '甲': 1,  // 木 starts at 亥
        '丙': -2, // 火 starts at 寅
        '戊': -2, // 土 starts at 寅
        '庚': -5, // 金 starts at 巳
        '壬': -8  // 水 starts at 申
      };
      const offset = offsetMap[dayGan] || 0;
      
      EARTHLY_BRANCHES.forEach((branch, index) => {
        const stageIndex = (index + offset + 12) % 12;
        twelveGrowInfo[branch.name] = twelvegGrowthStages[stageIndex];
      });
    } else {
      // Yin day master - backward
      const offsetMap: Record<string, number> = {
        '乙': -6, // 木 starts at 午
        '丁': -3, // 火 starts at 酉
        '己': -3, // 土 starts at 酉
        '辛': 0,  // 金 starts at 子
        '癸': 3   // 水 starts at 卯
      };
      const offset = offsetMap[dayGan] || 0;
      
      EARTHLY_BRANCHES.forEach((branch, index) => {
        const stageIndex = ((-index + offset + 12) % 12 + 12) % 12;
        twelveGrowInfo[branch.name] = twelvegGrowthStages[stageIndex];
      });
    }
    
    // Build result for each pillar
    const branches = [
      { branch: chart.year.branch, position: 'year' },
      { branch: chart.month.branch, position: 'month' },
      { branch: chart.day.branch, position: 'day' },
      { branch: chart.hour.branch, position: 'hour' }
    ];
    
    return branches.map(({ branch, position }) => {
      const stage = twelveGrowInfo[branch];
      const stageInfo = this.getGrowthStageInfo(stage);
      return {
        stage,
        element: this.getStemElement(dayGan),
        branch,
        meaning: stageInfo.meaning,
        strength: stageInfo.strength
      };
    });
  }
  
  /**
   * Get growth stage information
   */
  private getGrowthStageInfo(stage: string): {
    meaning: string;
    strength: number;
  } {
    const stageInfo: Record<string, { meaning: string; strength: number }> = {
      '長生': { meaning: 'Birth - New beginning', strength: 0.8 },
      '沐浴': { meaning: 'Bath - Cleansing', strength: 0.6 },
      '冠帶': { meaning: 'Crown - Coming of age', strength: 0.9 },
      '臨官': { meaning: 'Official - Peak career', strength: 1.0 },
      '帝旺': { meaning: 'Emperor - Maximum power', strength: 1.2 },
      '衰': { meaning: 'Decline - Weakening', strength: 0.7 },
      '病': { meaning: 'Sick - Illness', strength: 0.5 },
      '死': { meaning: 'Death - End', strength: 0.3 },
      '墓': { meaning: 'Tomb - Storage', strength: 0.4 },
      '絕': { meaning: 'Extinction - Void', strength: 0.2 },
      '胎': { meaning: 'Embryo - Conception', strength: 0.5 },
      '養': { meaning: 'Nurture - Growth', strength: 0.6 }
    };
    
    return stageInfo[stage] || { meaning: stage, strength: 0.5 };
  }
  
  /**
   * Calculate self-sitting relationship (自坐)
   * Uses the twelve growth stages (十二长生) system
   * Based on taro-bazi implementation
   */
  private calculateSelfSitting(stem: string, branch: string): string {
    // Twelve growth stages in order
    const twelveGrowthStages = [
      '长生', '沐浴', '冠带', '临官', '帝旺', 
      '衰', '病', '死', '墓', '绝', '胎', '养'
    ];
    
    // Get branch index
    const branchIndex = EARTHLY_BRANCHES.findIndex(b => b.name === branch);
    if (branchIndex === -1) return '';
    
    // Get stem index to determine offset
    const stemIndex = HEAVENLY_STEMS.findIndex(s => s.name === stem);
    if (stemIndex === -1) return '';
    
    // Use taro-bazi offsets for twelve growth stages calculation
    // These offsets have been verified to produce correct results
    const offsetMap: Record<string, number> = {
      '甲': 1,   // Yang Wood
      '乙': -6,  // Yin Wood
      '丙': -2,  // Yang Fire
      '丁': -3,  // Yin Fire
      '戊': -2,  // Yang Earth (same as Yang Fire)
      '己': -3,  // Yin Earth (same as Yin Fire)
      '庚': -5,  // Yang Metal
      '辛': 0,   // Yin Metal
      '壬': -8,  // Yang Water
      '癸': 3    // Yin Water
    };
    
    const offset = offsetMap[stem] || 0;
    
    // Calculate stage index
    let stageIndex: number;
    if (stemIndex % 2 === 0) {
      // Yang stems (even index) - forward progression
      stageIndex = (branchIndex + offset + 12) % 12;
    } else {
      // Yin stems (odd index) - reverse progression
      stageIndex = ((-branchIndex + offset + 12) % 12 + 12) % 12;
    }
    
    return twelveGrowthStages[stageIndex];
  }

  /**
   * Calculate void branches (空亡) based on taro-bazi logic
   */
  calculateVoidBranches(pillar: { stem: string; branch: string }): string[] {
    const gan = pillar.stem;
    const zhi = pillar.branch;
    
    const ganIndex = HEAVENLY_STEMS.findIndex(s => s.name === gan);
    const zhiIndex = EARTHLY_BRANCHES.findIndex(b => b.name === zhi);
    
    if (ganIndex === -1 || zhiIndex === -1) return [];
    
    let diffIndex = zhiIndex - ganIndex;
    diffIndex = diffIndex < 0 ? diffIndex + 11 : diffIndex;
    
    // Determine void branches based on JiaZi cycle pattern
    if (diffIndex === 0 || diffIndex === 11) return ['戌', '亥']; // 甲子旬
    if (diffIndex === 9 || diffIndex === 10) return ['申', '酉']; // 甲戌旬
    if (diffIndex === 7 || diffIndex === 8) return ['午', '未']; // 甲申旬
    if (diffIndex === 5 || diffIndex === 6) return ['辰', '巳']; // 甲午旬
    if (diffIndex === 3 || diffIndex === 4) return ['寅', '卯']; // 甲辰旬
    if (diffIndex === 1 || diffIndex === 2) return ['子', '丑']; // 甲寅旬
    
    return [];
  }
  
  /**
   * Calculate month strength
   */
  calculateMonthStrength(chart: BaziChart, birthInfo: any): number {
    const monthBranch = chart.month.branch;
    const season = this.getSeason(monthBranch);
    const dayMasterElement = this.getStemElement(chart.day.stem);
    
    // Calculate strength based on seasonal support
    let strength = 1.0;
    
    // Element-season relationships
    const seasonSupport: Record<string, Record<string, number>> = {
      '春': { '木': 1.5, '火': 1.2, '土': 0.8, '金': 0.6, '水': 0.9 },
      '夏': { '木': 0.9, '火': 1.5, '土': 1.2, '金': 0.7, '水': 0.6 },
      '秋': { '木': 0.6, '火': 0.8, '土': 1.1, '金': 1.5, '水': 1.2 },
      '冬': { '木': 1.2, '火': 0.6, '土': 0.9, '金': 0.8, '水': 1.5 }
    };
    
    if (seasonSupport[season] && seasonSupport[season][dayMasterElement]) {
      strength = seasonSupport[season][dayMasterElement];
    }
    
    return strength;
  }
  
  /**
   * Get season from month branch
   */
  private getSeason(monthBranch: string): string {
    const branchSeasons: Record<string, string> = {
      '寅': '春', '卯': '春', '辰': '春',
      '巳': '夏', '午': '夏', '未': '夏',
      '申': '秋', '酉': '秋', '戌': '秋',
      '亥': '冬', '子': '冬', '丑': '冬'
    };
    return branchSeasons[monthBranch] || '春';
  }
  
  /**
   * Get birth info for other calculations
   */
  async getBirthInfo(year: number, month: number, day: number, hour: number): Promise<any> {
    const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
    const lunar = solar.getLunar();
    const rawMonth = lunar.getMonth();
    
    return {
      solar: new Date(Date.UTC(year, month - 1, day, hour)),
      lunar: {
        year: lunar.getYear(),
        month: Math.abs(rawMonth),
        day: lunar.getDay(),
        isLeapMonth: rawMonth < 0,
        monthName: lunar.getMonthInChinese(),
        dayName: lunar.getDayInChinese()
      }
    };
  }
}
