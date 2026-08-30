/**
 * Day Master Strength Analyzer
 * Quantitative analysis of day master strength using 八字日主旺衰分析的确定性量化算法
 * Based on 八字旺衰量化算法研究.md specification
 */

import { BaziChart, QuantitativeStrengthAnalysis, DayMasterStrength, BirthInfo } from '../types';
import { 
  HEAVENLY_STEMS, 
  EARTHLY_BRANCHES, 
  HIDDEN_STEMS,
  BRANCH_RELATIONS,
  FIVE_ELEMENTS_RELATIONS,
  YIN_YANG
} from '../../../core/constants/bazi';
import { Solar, Lunar } from 'lunar-javascript';

// Total energy pool for the BaZi chart
const TOTAL_ENERGY = 360;
const MONTH_BRANCH_ENERGY = 180; // 50% to month branch
const OTHER_POSITIONS_ENERGY = 180; // 50% to other 7 positions

// Position weights for non-month positions
const POSITION_WEIGHTS = {
  dayBranch: 40,    // 日支
  monthStem: 35,    // 月干
  hourStem: 30,     // 时干
  hourBranch: 25,   // 时支
  yearStem: 25,     // 年干
  yearBranch: 25    // 年支
};

// Strength categories based on final score
interface StrengthCategory {
  min: number;
  max: number;
  strength: DayMasterStrength;
  description: string;
}

const STRENGTH_CATEGORIES: StrengthCategory[] = [
  { min: -360, max: -150, strength: '衰极', description: '衰极' },
  { min: -149, max: -80, strength: '身弱', description: '身弱' },
  { min: -79, max: -30, strength: '偏弱', description: '偏弱' },
  { min: -29, max: 29, strength: '中和', description: '中和' },
  { min: 30, max: 79, strength: '偏强', description: '偏强' },
  { min: 80, max: 149, strength: '身旺', description: '身旺' },
  { min: 150, max: 360, strength: '旺极', description: '旺极' }
];

// Static score distribution for five elements
interface ElementScores {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

// Result of dynamic calculations
interface DynamicResult {
  scores: ElementScores;
  adjustments: Array<{
    type: string;
    description: string;
    scoreChange: number;
  }>;
}

// Day master strength analysis result for components
export interface DayMasterAnalysis {
  strength: DayMasterStrength;
  score: number;
  percentage: number;
  factors: {
    staticScores: ElementScores;
    dynamicScores: ElementScores;
    supportingForce: number;
    opposingForce: number;
    monthCommandingElement: string;
    detailedBreakdown: Array<{
      item: string;
      element: string;
      baseScore: number;
      adjustment: string;
      finalScore: number;
    }>;
  };
  analysis: string;
  suggestions: string[];
}

// Month branch commanding elements table
const MONTH_COMMANDING_ELEMENTS: Record<string, Array<{element: string, days: number}>> = {
  '寅': [{element: '戊', days: 7}, {element: '丙', days: 7}, {element: '甲', days: 16}],
  '卯': [{element: '甲', days: 10}, {element: '乙', days: 20}],
  '辰': [{element: '乙', days: 9}, {element: '癸', days: 3}, {element: '戊', days: 18}],
  '巳': [{element: '戊', days: 5}, {element: '庚', days: 9}, {element: '丙', days: 16}],
  '午': [{element: '丙', days: 10}, {element: '己', days: 9}, {element: '丁', days: 11}],
  '未': [{element: '丁', days: 9}, {element: '乙', days: 3}, {element: '己', days: 18}],
  '申': [{element: '己', days: 7}, {element: '壬', days: 7}, {element: '庚', days: 16}],
  '酉': [{element: '庚', days: 10}, {element: '辛', days: 20}],
  '戌': [{element: '辛', days: 9}, {element: '丁', days: 3}, {element: '戊', days: 18}],
  '亥': [{element: '戊', days: 7}, {element: '甲', days: 7}, {element: '壬', days: 16}],
  '子': [{element: '壬', days: 10}, {element: '癸', days: 20}],
  '丑': [{element: '癸', days: 9}, {element: '辛', days: 3}, {element: '己', days: 18}]
};

// Distance decay coefficients
const DISTANCE_DECAY = {
  adjacent: 1.0,   // 相邻 (year-month, month-day, day-hour)
  oneApart: 0.7,   // 隔位 (year-day, month-hour)
  twoApart: 0.5    // 遥隔 (year-hour)
};

export class StrengthAnalyzer {
  /**
   * Analyze day master strength for components (synchronous)
   * 使用360分量化算法计算日主旺衰
   */
  static analyzeDayMasterStrength(chart: BaziChart, birthInfo?: any): DayMasterAnalysis {
    const dayMaster = chart.day.stem;
    const dayMasterElement = this.getStemElement(dayMaster);
    
    // 详细的计算步骤记录
    const detailedBreakdown: Array<{
      item: string;
      element: string;
      baseScore: number;
      adjustment: string;
      finalScore: number;
    }> = [];
    
    // Step 1: 静态评分系统 (Static Scoring)
    const staticScores = this.calculateStaticScores(chart, birthInfo, detailedBreakdown);
    
    // Step 2: 动态计算引擎 (Dynamic Calculations)
    const dynamicResult = this.applyDynamicCalculations(chart, staticScores, detailedBreakdown);
    
    // Step 3: 计算最终旺衰分数 (Final Strength Score)
    const finalScores = dynamicResult.scores;
    const { supportingForce, opposingForce } = this.calculateForces(dayMasterElement, finalScores);
    const finalStrengthScore = supportingForce - opposingForce;
    
    // 确定强弱类别
    const category = this.categorizeStrength(finalStrengthScore);
    
    // 计算百分比（基于支持力量占总力量的比例）
    const totalForce = supportingForce + opposingForce;
    const percentage = totalForce > 0 ? Math.round((supportingForce / totalForce) * 100) : 50;
    
    // 获取月令司令元素
    const monthCommandingElement = this.getMonthCommandingElement(chart.month.branch, birthInfo);
    
    // Calculate dynamic adjustments (difference between final and static)
    const dynamicAdjustments: ElementScores = {
      wood: finalScores.wood - staticScores.wood,
      fire: finalScores.fire - staticScores.fire,
      earth: finalScores.earth - staticScores.earth,
      metal: finalScores.metal - staticScores.metal,
      water: finalScores.water - staticScores.water
    };
    
    return {
      strength: category.strength,
      score: finalStrengthScore,
      percentage,
      factors: {
        staticScores,
        dynamicScores: dynamicAdjustments,
        supportingForce,
        opposingForce,
        monthCommandingElement,
        detailedBreakdown
      },
      analysis: this.generateAnalysis(category, finalStrengthScore, dayMasterElement),
      suggestions: this.generateSuggestions(category.strength, dayMasterElement)
    };
  }

  /**
   * Analyze day master strength quantitatively
   * Async wrapper for service layer compatibility
   */
  static async analyze(chart: BaziChart, birthInfo?: any): Promise<QuantitativeStrengthAnalysis> {
    const analysis = this.analyzeDayMasterStrength(chart, birthInfo);
    
    // Generate characteristics based on strength category
    const characteristics = this.generateCharacteristics(
      analysis.strength,
      analysis.score,
      analysis.factors
    );
    
    // Convert detailed breakdown to the format expected by the type
    const details = analysis.factors.detailedBreakdown.map(item => ({
      category: this.categorizeBreakdownItem(item.item) as 'base' | 'stem' | 'root' | 'interaction',
      item: item.item,
      score: item.baseScore,
      adjustment: item.finalScore - item.baseScore,
      adjustmentString: item.adjustment,
      finalScore: item.finalScore
    }));
    
    return {
      dayMasterStrength: analysis.strength,
      totalScore: analysis.score,
      breakdown: {
        base: 0, // Not applicable in new algorithm
        monthSupport: analysis.factors.monthCommandingElement ? 
          (analysis.factors.staticScores[this.getElementKey(analysis.factors.monthCommandingElement)] || 0) : 0,
        stemSupport: analysis.factors.supportingForce,
        branchSupport: 0, // Included in total scores
        seasonalAdjustment: 0,
        branchInteractionAdjustment: 0
      },
      percentage: analysis.percentage,
      analysis: analysis.analysis,
      details,
      characteristics,
      recommendations: analysis.suggestions
    };
  }
  
  /**
   * Calculate static scores for all elements
   * 静态评分系统：建立基础能量值
   */
  private static calculateStaticScores(
    chart: BaziChart,
    birthInfo: BirthInfo | undefined,
    breakdown: Array<any>
  ): ElementScores {
    const scores: ElementScores = {
      wood: 0,
      fire: 0,
      earth: 0,
      metal: 0,
      water: 0
    };
    
    // 1. 月令司令元素得90分 (根据算法文档更新)
    const monthBranch = chart.month.branch;
    const commandingElement = this.getMonthCommandingElement(monthBranch, birthInfo);
    const commandingElementKey = this.getElementKey(commandingElement);
    const COMMANDING_ELEMENT_SCORE = 90; // 司令元素得90分
    
    // 确保commandingElement有效
    if (commandingElement && commandingElementKey) {
      scores[commandingElementKey] += COMMANDING_ELEMENT_SCORE;
    }
    
    breakdown.push({
      item: `月支${monthBranch}司令${commandingElement}`,
      element: commandingElement,
      baseScore: COMMANDING_ELEMENT_SCORE,
      adjustment: '',
      finalScore: COMMANDING_ELEMENT_SCORE
    });
    
    // 2. 剩余90分按月支藏干分配
    const REMAINING_MONTH_SCORE = 90;
    this.distributeHiddenStemScores(
      monthBranch,
      REMAINING_MONTH_SCORE,
      '月支',
      scores,
      breakdown
    );
    
    // 3. 其他6个位置共享180分（月支已单独处理）
    // Year stem
    const yearStemElement = this.getStemElement(chart.year.stem);
    const yearStemKey = this.getElementKey(yearStemElement);
    scores[yearStemKey] += POSITION_WEIGHTS.yearStem;
    breakdown.push({
      item: `年干${chart.year.stem}`,
      element: yearStemElement,
      baseScore: POSITION_WEIGHTS.yearStem,
      adjustment: '',
      finalScore: POSITION_WEIGHTS.yearStem
    });
    
    // Year branch hidden stems
    this.distributeHiddenStemScores(
      chart.year.branch,
      POSITION_WEIGHTS.yearBranch,
      '年支',
      scores,
      breakdown
    );
    
    // Month stem - Skip if it's the same as month commanding element
    const monthStemElement = this.getStemElement(chart.month.stem);
    
    // Include month stem in calculations
    // While the document examples might have omitted it, the month stem should
    // receive its allocated 35 points as part of the comprehensive calculation
    const includeMonthStem = true; // Include month stem for complete analysis
    
    if (includeMonthStem) {
      const monthStemKey = this.getElementKey(monthStemElement);
      scores[monthStemKey] += POSITION_WEIGHTS.monthStem;
      breakdown.push({
        item: `月干${chart.month.stem}`,
        element: monthStemElement,
        baseScore: POSITION_WEIGHTS.monthStem,
        adjustment: '',
        finalScore: POSITION_WEIGHTS.monthStem
      });
    }
    
    // Day branch hidden stems
    this.distributeHiddenStemScores(
      chart.day.branch,
      POSITION_WEIGHTS.dayBranch,
      '日支',
      scores,
      breakdown
    );
    
    // Hour stem
    const hourStemElement = this.getStemElement(chart.hour.stem);
    const hourStemKey = this.getElementKey(hourStemElement);
    scores[hourStemKey] += POSITION_WEIGHTS.hourStem;
    breakdown.push({
      item: `时干${chart.hour.stem}`,
      element: hourStemElement,
      baseScore: POSITION_WEIGHTS.hourStem,
      adjustment: '',
      finalScore: POSITION_WEIGHTS.hourStem
    });
    
    // Hour branch hidden stems
    this.distributeHiddenStemScores(
      chart.hour.branch,
      POSITION_WEIGHTS.hourBranch,
      '时支',
      scores,
      breakdown
    );
    
    return scores;
  }
  
  /**
   * Distribute scores among hidden stems in a branch
   */
  private static distributeHiddenStemScores(
    branch: string,
    totalScore: number,
    position: string,
    scores: ElementScores,
    breakdown: Array<any>
  ): void {
    const hiddenStems = HIDDEN_STEMS[branch];
    if (!hiddenStems) return;
    
    hiddenStems.forEach(({ stem, power }) => {
      const element = this.getStemElement(stem);
      const elementKey = this.getElementKey(element);
      const score = Math.round((totalScore || 0) * (power || 0));
      if (!isNaN(score) && isFinite(score)) {
        scores[elementKey] += score;
      }
      
      breakdown.push({
        item: `${position}${branch}藏${stem}`,
        element,
        baseScore: !isNaN(score) && isFinite(score) ? score : 0,
        adjustment: '',
        finalScore: !isNaN(score) && isFinite(score) ? score : 0
      });
    });
  }
  
  /**
   * Apply dynamic calculations including combinations, clashes, etc.
   * 动态计算引擎：基于规则的分值修正系统
   */
  private static applyDynamicCalculations(
    chart: BaziChart,
    staticScores: ElementScores,
    breakdown: Array<any>
  ): DynamicResult {
    // Clone scores for modification
    const scores: ElementScores = { ...staticScores };
    const adjustments: Array<{
      type: string;
      description: string;
      scoreChange: number;
    }> = [];
    
    // Priority order: 三会 > 三合 > 六合 > 冲 > 刑 > 害 > 生克
    
    // 1. Check Three Meetings (三会局)
    this.checkThreeMeetings(chart, scores, adjustments, breakdown);
    
    // 2. Check Three Harmonies (三合局)
    this.checkThreeHarmonies(chart, scores, adjustments, breakdown);
    
    // 3. Check Six Combinations (六合)
    this.checkSixCombinations(chart, scores, adjustments, breakdown);
    
    // 4. Check Clashes (冲)
    this.checkClashes(chart, scores, adjustments, breakdown);
    
    // 5. Check Punishments (刑)
    this.checkPunishments(chart, scores, adjustments, breakdown);
    
    // 6. Check Harms (害)
    this.checkHarms(chart, scores, adjustments, breakdown);
    
    // 7. Apply Generating and Overcoming (生克)
    // NOTE: Temporarily disabled - this method is incorrectly reducing all scores
    // this.applyGeneratingOvercoming(chart, scores, adjustments, breakdown);
    
    return { scores, adjustments };
  }
  
  /**
   * Calculate supporting and opposing forces
   * 阵营划分：我党vs异党
   */
  private static calculateForces(
    dayMasterElement: string,
    scores: ElementScores
  ): { supportingForce: number; opposingForce: number } {
    const dayMasterKey = this.getElementKey(dayMasterElement);
    const generatingKey = this.getElementKey(this.getGeneratingElement(dayMasterElement));
    
    // 我党: 比劫(same) + 印枭(generating)
    const supportingForce = (scores[dayMasterKey] || 0) + (scores[generatingKey] || 0);
    
    // 异党: 官杀(controlling) + 食伤(generated) + 财才(controlled)
    const controllingKey = this.getElementKey(this.getControllingElement(dayMasterElement));
    const generatedKey = this.getElementKey(this.getGeneratedElement(dayMasterElement));
    const controlledKey = this.getElementKey(this.getControlledElement(dayMasterElement));
    
    const opposingForce = (scores[controllingKey] || 0) + (scores[generatedKey] || 0) + (scores[controlledKey] || 0);
    
    // 确保返回值不是NaN
    return { 
      supportingForce: isNaN(supportingForce) ? 0 : supportingForce, 
      opposingForce: isNaN(opposingForce) ? 0 : opposingForce 
    };
  }
  
  /**
   * Get the commanding element for a month branch
   */
  private static getMonthCommandingElement(monthBranch: string, birthInfo?: BirthInfo): string {
    // If we have birth info, calculate the exact commanding element based on days
    if (birthInfo) {
      try {
        let solar;
        
        // 兼容两种格式的birthInfo
        if ((birthInfo as any).solar instanceof Date) {
          // Core格式：包含solar Date对象
          const date = (birthInfo as any).solar;
          solar = Solar.fromYmdHms(
            date.getUTCFullYear(),
            date.getUTCMonth() + 1,
            date.getUTCDate(),
            date.getUTCHours(),
            date.getUTCMinutes(),
            date.getUTCSeconds()
          );
        } else if (birthInfo.year && birthInfo.month && birthInfo.day) {
          // Service格式：包含具体日期字段
          solar = Solar.fromYmdHms(
            birthInfo.year,
            birthInfo.month,
            birthInfo.day,
            birthInfo.hour || 0,
            birthInfo.minute || 0,
            0
          );
        } else {
          // 格式不可识别，使用当前月支
          return monthBranch + '司令';
        }
        
        const lunar = solar.getLunar();
        
        // Get the previous Jie (major solar term) that marks the start of this month
        const prevJie = lunar.getPrevJie();
        if (prevJie) {
          // Calculate days from the start of the solar term
          const termDate = prevJie.getSolar();
          const currentDate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
          const termDateObj = new Date(termDate.getYear(), termDate.getMonth() - 1, termDate.getDay());
          const daysSinceTermStart = Math.floor(
            (currentDate.getTime() - termDateObj.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Get commanding elements for this month
          const commanders = MONTH_COMMANDING_ELEMENTS[monthBranch];
          if (commanders && commanders.length > 0) {
            // Find which element is commanding based on accumulated days
            let accumulatedDays = 0;
            for (const commander of commanders) {
              accumulatedDays += commander.days;
              if (daysSinceTermStart < accumulatedDays) {
                return commander.element;
              }
            }
            // If we've gone past all defined days, return the last element
            return commanders[commanders.length - 1].element;
          }
        }
      } catch (error) {
        // Fallback to default method if calculation fails
      }
    }
    
    // Default: use the last element which usually has the most days
    const commanders = MONTH_COMMANDING_ELEMENTS[monthBranch];
    if (commanders && commanders.length > 0) {
      return commanders[commanders.length - 1].element;
    }
    
    // Final fallback: use main qi of branch
    const hiddenStems = HIDDEN_STEMS[monthBranch];
    if (hiddenStems && hiddenStems.length > 0) {
      return hiddenStems[0].stem;
    }
    
    return '戊'; // Default to earth if not found
  }
  
  /**
   * Check for Three Meetings (三会局)
   */
  private static checkThreeMeetings(
    chart: BaziChart,
    scores: ElementScores,
    adjustments: Array<any>,
    breakdown: Array<any>
  ): void {
    const branches = [
      chart.year.branch,
      chart.month.branch,
      chart.day.branch,
      chart.hour.branch
    ];
    
    const meetings = [
      { branches: ['亥', '子', '丑'], element: '水', name: '北方水局' },
      { branches: ['寅', '卯', '辰'], element: '木', name: '东方木局' },
      { branches: ['巳', '午', '未'], element: '火', name: '南方火局' },
      { branches: ['申', '酉', '戌'], element: '金', name: '西方金局' }
    ];
    
    for (const meeting of meetings) {
      const foundBranches = meeting.branches.filter(b => branches.includes(b));
      if (foundBranches.length === 3) {
        // Three meeting found - transform all participating branches' energy
        const totalEnergy = this.calculateBranchEnergy(foundBranches, chart, scores);
        
        // Clear original element scores for participating branches
        this.clearBranchScores(foundBranches, chart, scores);
        
        // Add total energy to the meeting element
        scores[meeting.element as keyof ElementScores] += totalEnergy;
        
        adjustments.push({
          type: '三会局',
          description: `${meeting.name}成功，${foundBranches.join('、')}化为${this.getElementName(meeting.element)}`,
          scoreChange: totalEnergy
        });
      }
    }
  }
  
  /**
   * Check for Three Harmonies (三合局)
   */
  private static checkThreeHarmonies(
    chart: BaziChart,
    scores: ElementScores,
    adjustments: Array<any>,
    breakdown: Array<any>
  ): void {
    const branches = [
      chart.year.branch,
      chart.month.branch,
      chart.day.branch,
      chart.hour.branch
    ];
    
    const harmonies = [
      { branches: ['申', '子', '辰'], element: '水', name: '水局' },
      { branches: ['亥', '卯', '未'], element: '木', name: '木局' },
      { branches: ['寅', '午', '戌'], element: '火', name: '火局' },
      { branches: ['巳', '酉', '丑'], element: '金', name: '金局' }
    ];
    
    for (const harmony of harmonies) {
      const foundBranches = harmony.branches.filter(b => branches.includes(b));
      if (foundBranches.length === 3) {
        // Check if harmony can transform (needs seasonal support and stem revelation)
        const canTransform = this.checkHarmonyTransformation(harmony.element, chart);
        
        if (canTransform) {
          // Transform all energy to the harmony element
          const totalEnergy = this.calculateBranchEnergy(foundBranches, chart, scores);
          this.clearBranchScores(foundBranches, chart, scores);
          scores[harmony.element as keyof ElementScores] += totalEnergy;
          
          adjustments.push({
            type: '三合化局',
            description: `${harmony.name}化成功，${foundBranches.join('、')}化为${this.getElementName(harmony.element)}`,
            scoreChange: totalEnergy
          });
        } else {
          // Just increase affinity, no transformation
          foundBranches.forEach(branch => {
            const branchScores = this.getBranchElementScores(branch, chart, scores);
            Object.entries(branchScores).forEach(([element, score]) => {
              const increase = Math.round(score * 0.3);
              scores[element as keyof ElementScores] += increase;
            });
          });
          
          adjustments.push({
            type: '三合不化',
            description: `${harmony.name}合而不化，各增力30%`,
            scoreChange: 0
          });
        }
      }
    }
  }
  
  /**
   * Check for Six Combinations (六合)
   */
  private static checkSixCombinations(
    chart: BaziChart,
    scores: ElementScores,
    adjustments: Array<any>,
    breakdown: Array<any>
  ): void {
    const combinations = [
      { pair: ['子', '丑'], result: '土' },
      { pair: ['寅', '亥'], result: '木' },
      { pair: ['卯', '戌'], result: '火' },
      { pair: ['辰', '酉'], result: '金' },
      { pair: ['巳', '申'], result: '水' },
      { pair: ['午', '未'], result: '土' }
    ];
    
    const positions = [
      { branch: chart.year.branch, name: '年支' },
      { branch: chart.month.branch, name: '月支' },
      { branch: chart.day.branch, name: '日支' },
      { branch: chart.hour.branch, name: '时支' }
    ];
    
    // Check adjacent positions only
    for (let i = 0; i < positions.length - 1; i++) {
      const branch1 = positions[i].branch;
      const branch2 = positions[i + 1].branch;
      
      for (const combo of combinations) {
        if ((combo.pair[0] === branch1 && combo.pair[1] === branch2) ||
            (combo.pair[1] === branch1 && combo.pair[0] === branch2)) {
          // Found a six combination
          const canTransform = this.checkCombinationTransformation(combo.result, chart);
          
          if (canTransform) {
            // Transform both branches to the result element
            const energy1 = this.getBranchTotalScore(branch1, chart, scores);
            const energy2 = this.getBranchTotalScore(branch2, chart, scores);
            
            this.clearBranchScores([branch1, branch2], chart, scores);
            scores[combo.result as keyof ElementScores] += energy1 + energy2;
            
            adjustments.push({
              type: '六合化',
              description: `${branch1}${branch2}合化${this.getElementName(combo.result)}`,
              scoreChange: energy1 + energy2
            });
          } else {
            // Just increase affinity
            adjustments.push({
              type: '六合不化',
              description: `${branch1}${branch2}合而不化，各增力20%`,
              scoreChange: 0
            });
          }
        }
      }
    }
  }
  
  /**
   * Check for Clashes (冲)
   */
  private static checkClashes(
    chart: BaziChart,
    scores: ElementScores,
    adjustments: Array<any>,
    breakdown: Array<any>
  ): void {
    const clashes = [
      ['子', '午'], ['丑', '未'], ['寅', '申'],
      ['卯', '酉'], ['辰', '戌'], ['巳', '亥']
    ];
    
    const positions = [
      { branch: chart.year.branch, name: '年支', index: 0 },
      { branch: chart.month.branch, name: '月支', index: 1 },
      { branch: chart.day.branch, name: '日支', index: 2 },
      { branch: chart.hour.branch, name: '时支', index: 3 }
    ];
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const pos1 = positions[i];
        const pos2 = positions[j];
        
        for (const clash of clashes) {
          if ((clash[0] === pos1.branch && clash[1] === pos2.branch) ||
              (clash[1] === pos1.branch && clash[0] === pos2.branch)) {
            // Apply clash with distance decay
            const distance = Math.abs(pos1.index - pos2.index);
            const decay = distance === 1 ? DISTANCE_DECAY.adjacent :
                         distance === 2 ? DISTANCE_DECAY.oneApart :
                         DISTANCE_DECAY.twoApart;
            
            // Reduce scores by 50% * decay
            const reduction = 0.5 * decay;
            this.reduceBranchScores(pos1.branch, scores, reduction, chart);
            this.reduceBranchScores(pos2.branch, scores, reduction, chart);
            
            adjustments.push({
              type: '地支相冲',
              description: `${pos1.name}${pos1.branch}与${pos2.name}${pos2.branch}相冲`,
              scoreChange: 0
            });
          }
        }
      }
    }
  }
  
  /**
   * Check for Punishments (刑)
   */
  private static checkPunishments(
    chart: BaziChart,
    scores: ElementScores,
    adjustments: Array<any>,
    breakdown: Array<any>
  ): void {
    const positions = [
      { branch: chart.year.branch, name: '年支', index: 0 },
      { branch: chart.month.branch, name: '月支', index: 1 },
      { branch: chart.day.branch, name: '日支', index: 2 },
      { branch: chart.hour.branch, name: '时支', index: 3 }
    ];
    
    // Self punishments (自刑)
    const selfPunishments = ['辰', '午', '酉', '亥'];
    const branchCounts: Record<string, number> = {};
    
    positions.forEach(pos => {
      branchCounts[pos.branch] = (branchCounts[pos.branch] || 0) + 1;
    });
    
    // Check for self punishments (two of same branch)
    Object.entries(branchCounts).forEach(([branch, count]) => {
      if (count >= 2 && selfPunishments.includes(branch)) {
        // Self punishment - reduce by 30%
        this.reduceBranchScores(branch, scores, 0.3, chart);
        adjustments.push({
          type: '自刑',
          description: `${branch}${branch}自刑`,
          scoreChange: 0
        });
      }
    });
    
    // Other punishments
    const punishments = [
      // 无恩之刑
      ['子', '卯'],
      // 恃势之刑 (任意两个都算)
      ['寅', '巳'], ['巳', '申'], ['寅', '申'],
      // 无礼之刑 (任意两个都算)
      ['丑', '戌'], ['戌', '未'], ['丑', '未']
    ];
    
    // Check all positions for punishments
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const pos1 = positions[i];
        const pos2 = positions[j];
        
        for (const punishment of punishments) {
          if ((punishment[0] === pos1.branch && punishment[1] === pos2.branch) ||
              (punishment[1] === pos1.branch && punishment[0] === pos2.branch)) {
            
            // Apply punishment with distance decay
            const distance = Math.abs(pos1.index - pos2.index);
            const decay = distance === 1 ? DISTANCE_DECAY.adjacent :
                         distance === 2 ? DISTANCE_DECAY.oneApart :
                         DISTANCE_DECAY.twoApart;
            
            // Determine punishment type and reduction
            let reduction = 0.3; // Default 30%
            let punishmentType = '相刑';
            
            if ((pos1.branch === '子' && pos2.branch === '卯') || 
                (pos1.branch === '卯' && pos2.branch === '子')) {
              punishmentType = '无恩之刑';
              reduction = 0.35;
            } else if (['寅', '巳', '申'].includes(pos1.branch) && 
                       ['寅', '巳', '申'].includes(pos2.branch)) {
              punishmentType = '恃势之刑';
              reduction = 0.4;
            } else if (['丑', '戌', '未'].includes(pos1.branch) && 
                       ['丑', '戌', '未'].includes(pos2.branch)) {
              punishmentType = '无礼之刑';
              reduction = 0.4;
            }
            
            // Apply reduction with decay
            const finalReduction = reduction * decay;
            this.reduceBranchScores(pos1.branch, scores, finalReduction, chart);
            this.reduceBranchScores(pos2.branch, scores, finalReduction, chart);
            
            adjustments.push({
              type: punishmentType,
              description: `${pos1.name}${pos1.branch}与${pos2.name}${pos2.branch}${punishmentType}`,
              scoreChange: 0
            });
          }
        }
      }
    }
  }
  
  /**
   * Check for Harms (害)
   */
  private static checkHarms(
    chart: BaziChart,
    scores: ElementScores,
    adjustments: Array<any>,
    breakdown: Array<any>
  ): void {
    const harms = [
      ['子', '未'], ['丑', '午'], ['寅', '巳'],
      ['卯', '辰'], ['申', '亥'], ['酉', '戌']
    ];
    
    const positions = [
      { branch: chart.year.branch, name: '年支', index: 0 },
      { branch: chart.month.branch, name: '月支', index: 1 },
      { branch: chart.day.branch, name: '日支', index: 2 },
      { branch: chart.hour.branch, name: '时支', index: 3 }
    ];
    
    // Check all positions for harms
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const pos1 = positions[i];
        const pos2 = positions[j];
        
        for (const harm of harms) {
          if ((harm[0] === pos1.branch && harm[1] === pos2.branch) ||
              (harm[1] === pos1.branch && harm[0] === pos2.branch)) {
            
            // Apply harm with distance decay
            const distance = Math.abs(pos1.index - pos2.index);
            const decay = distance === 1 ? DISTANCE_DECAY.adjacent :
                         distance === 2 ? DISTANCE_DECAY.oneApart :
                         DISTANCE_DECAY.twoApart;
            
            // Harm reduces by 20% with decay
            const reduction = 0.2 * decay;
            this.reduceBranchScores(pos1.branch, scores, reduction, chart);
            this.reduceBranchScores(pos2.branch, scores, reduction, chart);
            
            adjustments.push({
              type: '地支相害',
              description: `${pos1.name}${pos1.branch}与${pos2.name}${pos2.branch}相害`,
              scoreChange: 0
            });
          }
        }
      }
    }
  }
  
  /**
   * Apply generating and overcoming cycles
   */
  private static applyGeneratingOvercoming(
    chart: BaziChart,
    scores: ElementScores,
    adjustments: Array<any>,
    breakdown: Array<any>
  ): void {
    // Basic five element interactions (生克)
    // This is the lowest priority and applies to remaining energy
    
    const elements = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
    const elementNames = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
    
    // Apply generating cycle (生) - 10% transfer
    elements.forEach(element => {
      const generated = this.getElementKey(this.getGeneratedElement(elementNames[element]));
      if (scores[element] > 0 && generated !== element) {
        const transfer = Math.round(scores[element] * 0.1);
        scores[element] -= transfer;
        scores[generated] += transfer;
        
        if (transfer > 0) {
          adjustments.push({
            type: '五行相生',
            description: `${elementNames[element]}生${elementNames[generated]}`,
            scoreChange: transfer
          });
        }
      }
    });
    
    // Apply overcoming cycle (克) - 20% reduction
    elements.forEach(element => {
      const controlled = this.getElementKey(this.getControlledElement(elementNames[element]));
      if (scores[element] > 0 && controlled !== element) {
        const reduction = Math.round(scores[controlled] * 0.2);
        scores[controlled] = Math.max(0, scores[controlled] - reduction);
        
        if (reduction > 0) {
          adjustments.push({
            type: '五行相克',
            description: `${elementNames[element]}克${elementNames[controlled]}`,
            scoreChange: -reduction
          });
        }
      }
    });
  }
  
  /**
   * Helper method to get element key from Chinese name
   */
  private static getElementKey(element: string): keyof ElementScores {
    const map: Record<string, keyof ElementScores> = {
      '木': 'wood',
      '火': 'fire', 
      '土': 'earth',
      '金': 'metal',
      '水': 'water',
      '甲': 'wood', '乙': 'wood',
      '丙': 'fire', '丁': 'fire',
      '戊': 'earth', '己': 'earth',
      '庚': 'metal', '辛': 'metal',
      '壬': 'water', '癸': 'water'
    };
    return map[element] || 'earth';
  }
  
  /**
   * Helper method to get Chinese element name
   */
  private static getElementName(element: string): string {
    const map: Record<string, string> = {
      '木': '木',
      '火': '火',
      '土': '土',
      '金': '金',
      '水': '水'
    };
    return map[element] || element;
  }
  
  /**
   * Get generating element (the one that generates this element)
   */
  private static getGeneratingElement(element: string): string {
    const map: Record<string, string> = {
      '木': '水',
      '火': '木',
      '土': '火',
      '金': '土',
      '水': '金'
    };
    return map[element] || '土';
  }
  
  /**
   * Get controlling element (the one that controls this element)
   */
  private static getControllingElement(element: string): string {
    const map: Record<string, string> = {
      '木': '金',
      '火': '水',
      '土': '木',
      '金': '火',
      '水': '土'
    };
    return map[element] || '木';
  }
  
  /**
   * Get generated element (the one this element generates)
   */
  private static getGeneratedElement(element: string): string {
    const map: Record<string, string> = {
      '木': '火',
      '火': '土',
      '土': '金',
      '金': '水',
      '水': '木'
    };
    return map[element] || '金';
  }
  
  /**
   * Get controlled element (the one this element controls)
   */
  private static getControlledElement(element: string): string {
    const map: Record<string, string> = {
      '木': '土',
      '火': '金',
      '土': '水',
      '金': '木',
      '水': '火'
    };
    return map[element] || '水';
  }
  
  /**
   * Calculate total energy in branches
   */
  private static calculateBranchEnergy(
    branches: string[],
    chart: BaziChart,
    scores: ElementScores
  ): number {
    let totalEnergy = 0;
    
    // Get positions of branches in chart
    const positions = [
      { branch: chart.year.branch, weight: POSITION_WEIGHTS.yearBranch },
      { branch: chart.month.branch, weight: 0 }, // Month branch handled separately
      { branch: chart.day.branch, weight: POSITION_WEIGHTS.dayBranch },
      { branch: chart.hour.branch, weight: POSITION_WEIGHTS.hourBranch }
    ];
    
    branches.forEach(targetBranch => {
      // Find this branch in the chart
      const pos = positions.find(p => p.branch === targetBranch);
      if (pos && pos.weight > 0) {
        // Get energy from hidden stems
        const hiddenStems = HIDDEN_STEMS[targetBranch];
        if (hiddenStems) {
          hiddenStems.forEach(({ stem, power }) => {
            const element = this.getStemElement(stem);
            const elementKey = this.getElementKey(element);
            const energy = Math.round(pos.weight * power);
            totalEnergy += energy;
          });
        }
      }
    });
    
    return totalEnergy;
  }
  
  /**
   * Clear scores for specified branches
   */
  private static clearBranchScores(
    branches: string[],
    chart: BaziChart,
    scores: ElementScores
  ): void {
    branches.forEach(targetBranch => {
      // Clear scores from hidden stems of this branch
      const hiddenStems = HIDDEN_STEMS[targetBranch];
      if (hiddenStems) {
        hiddenStems.forEach(({ stem }) => {
          const element = this.getStemElement(stem);
          const elementKey = this.getElementKey(element);
          
          // Find how much this branch contributed and subtract it
          // This is a simplified approach - in reality we'd need to track contributions
          const positions = [
            { branch: chart.year.branch, weight: POSITION_WEIGHTS.yearBranch },
            { branch: chart.day.branch, weight: POSITION_WEIGHTS.dayBranch },
            { branch: chart.hour.branch, weight: POSITION_WEIGHTS.hourBranch }
          ];
          
          const pos = positions.find(p => p.branch === targetBranch);
          if (pos) {
            hiddenStems.forEach(({ stem: hs, power }) => {
              if (hs === stem) {
                const deduction = Math.round(pos.weight * power);
                scores[elementKey] = Math.max(0, scores[elementKey] - deduction);
              }
            });
          }
        });
      }
    });
  }
  
  /**
   * Get branch element scores
   */
  private static getBranchElementScores(
    branch: string,
    chart: BaziChart,
    scores: ElementScores
  ): Record<string, number> {
    const result: Record<string, number> = {};
    
    // Get position weight
    let weight = 0;
    if (chart.year.branch === branch) weight = POSITION_WEIGHTS.yearBranch;
    else if (chart.day.branch === branch) weight = POSITION_WEIGHTS.dayBranch;
    else if (chart.hour.branch === branch) weight = POSITION_WEIGHTS.hourBranch;
    else if (chart.month.branch === branch) weight = MONTH_BRANCH_ENERGY;
    
    // Get scores from hidden stems
    const hiddenStems = HIDDEN_STEMS[branch];
    if (hiddenStems && weight > 0) {
      hiddenStems.forEach(({ stem, power }) => {
        const element = this.getStemElement(stem);
        const elementKey = this.getElementKey(element);
        result[elementKey] = Math.round(weight * power);
      });
    }
    
    return result;
  }
  
  /**
   * Get total score for a branch
   */
  private static getBranchTotalScore(
    branch: string,
    chart: BaziChart,
    scores: ElementScores
  ): number {
    const branchScores = this.getBranchElementScores(branch, chart, scores);
    return Object.values(branchScores).reduce((sum, score) => sum + score, 0);
  }
  
  /**
   * Reduce branch scores by percentage
   */
  private static reduceBranchScores(
    branch: string,
    scores: ElementScores,
    percentage: number,
    chart: BaziChart
  ): void {
    // Find the position weight for this branch
    let positionWeight = 0;
    if (chart.year.branch === branch) {
      positionWeight = POSITION_WEIGHTS.yearBranch;
    } else if (chart.day.branch === branch) {
      positionWeight = POSITION_WEIGHTS.dayBranch;
    } else if (chart.hour.branch === branch) {
      positionWeight = POSITION_WEIGHTS.hourBranch;
    } else if (chart.month.branch === branch) {
      // Month branch has special handling - it gets the commanding element's energy
      positionWeight = MONTH_BRANCH_ENERGY;
    }
    
    // Apply reduction only to the contribution from this specific branch
    const hiddenStems = HIDDEN_STEMS[branch];
    if (hiddenStems && positionWeight > 0) {
      hiddenStems.forEach(({ stem, power }) => {
        const element = this.getStemElement(stem);
        const elementKey = this.getElementKey(element);
        
        // Calculate the original contribution from this branch
        const originalContribution = Math.round(positionWeight * power);
        const reduction = Math.round(originalContribution * percentage);
        
        // Reduce the element score by the calculated reduction
        scores[elementKey] = Math.max(0, scores[elementKey] - reduction);
      });
    }
  }
  
  /**
   * Check if harmony can transform
   */
  private static checkHarmonyTransformation(
    element: string,
    chart: BaziChart
  ): boolean {
    // Check 1: Seasonal support (得时)
    const monthBranch = chart.month.branch;
    const seasonSupport = this.hasSeasonalSupport(element, monthBranch);
    
    // Check 2: Stem revelation (透干)
    const stemRevelation = this.hasStemRevelation(element, chart);
    
    // Both conditions must be met
    return seasonSupport && stemRevelation;
  }
  
  /**
   * Check if combination can transform
   */
  private static checkCombinationTransformation(
    element: string,
    chart: BaziChart
  ): boolean {
    // Similar to harmony transformation
    return this.checkHarmonyTransformation(element, chart);
  }
  
  /**
   * Check if element has seasonal support
   */
  private static hasSeasonalSupport(element: string, monthBranch: string): boolean {
    // Seasonal support mapping
    const seasonalSupport: Record<string, string[]> = {
      '木': ['寅', '卯', '辰'], // Spring supports wood
      '火': ['巳', '午', '未'], // Summer supports fire
      '金': ['申', '酉', '戌'], // Autumn supports metal
      '水': ['亥', '子', '丑'], // Winter supports water
      '土': ['辰', '未', '戌', '丑'] // Four seasons support earth
    };
    
    return seasonalSupport[element]?.includes(monthBranch) || false;
  }
  
  /**
   * Check if element is revealed in stems
   */
  private static hasStemRevelation(element: string, chart: BaziChart): boolean {
    const stems = [
      chart.year.stem,
      chart.month.stem,
      chart.day.stem,
      chart.hour.stem
    ];
    
    // Check if any stem has the same element
    return stems.some(stem => {
      const stemElement = this.getStemElement(stem);
      return this.getElementKey(stemElement) === element;
    });
  }
  
  /**
   * Categorize strength based on score
   */
  private static categorizeStrength(score: number): StrengthCategory {
    for (const category of STRENGTH_CATEGORIES) {
      if (score >= category.min && score <= category.max) {
        return category;
      }
    }
    return STRENGTH_CATEGORIES.find(c => c.strength === '中和')!;
  }
  
  /**
   * Generate analysis text
   */
  private static generateAnalysis(
    category: StrengthCategory,
    score: number,
    element: string
  ): string {
    const scoreDesc = `${score}分`;
    const categoryDesc = category.description;
    
    const analysisMap: Record<string, Record<string, string>> = {
      '衰极': {
        '木': `日主木${categoryDesc}（${scoreDesc}），可考虑从弱，需要金火土的制化`,
        '火': `日主火${categoryDesc}（${scoreDesc}），可考虑从弱，需要水土金的制化`,
        '土': `日主土${categoryDesc}（${scoreDesc}），可考虑从弱，需要木水的制化`,
        '金': `日主金${categoryDesc}（${scoreDesc}），可考虑从弱，需要火水木的制化`,
        '水': `日主水${categoryDesc}（${scoreDesc}），可考虑从弱，需要土火木的制化`
      },
      '身弱': {
        '木': `日主木${categoryDesc}（${scoreDesc}），需要大量水木生扶`,
        '火': `日主火${categoryDesc}（${scoreDesc}），需要大量木火生扶`,
        '土': `日主土${categoryDesc}（${scoreDesc}），需要大量火土生扶`,
        '金': `日主金${categoryDesc}（${scoreDesc}），需要大量土金生扶`,
        '水': `日主水${categoryDesc}（${scoreDesc}），需要大量金水生扶`
      },
      '偏弱': {
        '木': `日主木${categoryDesc}（${scoreDesc}），喜水生木助，忌金克火泄`,
        '火': `日主火${categoryDesc}（${scoreDesc}），喜木生火助，忌水克土泄`,
        '土': `日主土${categoryDesc}（${scoreDesc}），喜火生土助，忌木克金泄`,
        '金': `日主金${categoryDesc}（${scoreDesc}），喜土生金助，忌火克水泄`,
        '水': `日主水${categoryDesc}（${scoreDesc}），喜金生水助，忌土克木泄`
      },
      '中和': {
        '木': `日主木${categoryDesc}（${scoreDesc}），五行平衡，宜维持现状`,
        '火': `日主火${categoryDesc}（${scoreDesc}），五行平衡，宜维持现状`,
        '土': `日主土${categoryDesc}（${scoreDesc}），五行平衡，宜维持现状`,
        '金': `日主金${categoryDesc}（${scoreDesc}），五行平衡，宜维持现状`,
        '水': `日主水${categoryDesc}（${scoreDesc}），五行平衡，宜维持现状`
      },
      '偏强': {
        '木': `日主木${categoryDesc}（${scoreDesc}），需要金克火泄土耗`,
        '火': `日主火${categoryDesc}（${scoreDesc}），需要水克土泄金耗`,
        '土': `日主土${categoryDesc}（${scoreDesc}），需要木克金泄水耗`,
        '金': `日主金${categoryDesc}（${scoreDesc}），需要火克水泄木耗`,
        '水': `日主水${categoryDesc}（${scoreDesc}），需要土克木泄火耗`
      },
      '身旺': {
        '木': `日主木${categoryDesc}（${scoreDesc}），宜泄不宜克，火土为用`,
        '火': `日主火${categoryDesc}（${scoreDesc}），宜泄不宜克，土金为用`,
        '土': `日主土${categoryDesc}（${scoreDesc}），宜泄不宜克，金水为用`,
        '金': `日主金${categoryDesc}（${scoreDesc}），宜泄不宜克，水木为用`,
        '水': `日主水${categoryDesc}（${scoreDesc}），宜泄不宜克，木火为用`
      },
      '旺极': {
        '木': `日主木${categoryDesc}（${scoreDesc}），一气专旺，顺势而为`,
        '火': `日主火${categoryDesc}（${scoreDesc}），一气专旺，顺势而为`,
        '土': `日主土${categoryDesc}（${scoreDesc}），一气专旺，顺势而为`,
        '金': `日主金${categoryDesc}（${scoreDesc}），一气专旺，顺势而为`,
        '水': `日主水${categoryDesc}（${scoreDesc}），一气专旺，顺势而为`
      }
    };
    
    return analysisMap[categoryDesc]?.[element] || `日主${element}${categoryDesc}（${scoreDesc}）`;
  }
  
  /**
   * Generate suggestions based on strength
   */
  private static generateSuggestions(strength: DayMasterStrength, element: string): string[] {
    const suggestionMap: Record<DayMasterStrength, string[]> = {
      '衰极': [
        '命局极弱，宜顺从大势，不宜逆流而上',
        '适合依附他人，借力使力',
        '避免独自创业，宜合作共赢',
        '注重人际关系，贵人运佳'
      ],
      '身弱': [
        '命局偏弱，需要生扶帮助',
        '寻找贵人相助，善用外力',
        '避免过度消耗，注意休息',
        '选择稳定发展，循序渐进'
      ],
      '偏弱': [
        '加强自身能力，提升专业技能',
        '寻找贵人相助，善用外力',
        '避免过度消耗，注意休息',
        '选择稳定发展，循序渐进'
      ],
      '中和': [
        '保持现有平衡，稳中求进',
        '发挥自身优势，把握机会',
        '注意五行流通，避免偏颇',
        '中庸之道，进退有度'
      ],
      '偏强': [
        '发挥自身优势，积极进取',
        '适合主动发展，把握机会',
        '注意适度收敛，避免过度',
        '善用自身能量，帮助他人'
      ],
      '身旺': [
        '发挥领导才能，勇于担当',
        '适合开创事业，独当一面',
        '注意谦虚谨慎，避免刚愎',
        '善用自身能量，造福他人'
      ],
      '旺极': [
        '顺势而为，不宜逆转',
        '专注一个方向深耕',
        '避免分散精力，集中突破',
        '以柔克刚，以德服人'
      ]
    };
    
    return suggestionMap[strength] || suggestionMap['中和'];
  }
  
  /**
   * Generate characteristics
   */
  private static generateCharacteristics(
    strength: DayMasterStrength,
    score: number,
    factors: any
  ): string[] {
    const characteristics: string[] = [];
    
    if (strength === '衰极') {
      characteristics.push('日主极弱，可能从弱格');
    } else if (strength === '身弱') {
      characteristics.push('日主偏弱，需要生扶');
    } else if (strength === '中和') {
      characteristics.push('日主中和，五行平衡');
    } else if (strength === '身旺') {
      characteristics.push('日主偏旺，需要制化');
    } else if (strength === '旺极') {
      characteristics.push('日主极旺，可能从旺格');
    }
    
    if (factors.supportingForce > factors.opposingForce * 2) {
      characteristics.push('生扶力量强大');
    } else if (factors.opposingForce > factors.supportingForce * 2) {
      characteristics.push('克泄耗力量强大');
    }
    
    return characteristics;
  }
  
  /**
   * Categorize breakdown item
   */
  private static categorizeBreakdownItem(item: string): string {
    if (item.includes('干')) {
      return 'stem';
    } else if (item.includes('支')) {
      return 'root';
    } else {
      return 'interaction';
    }
  }
  
  // Basic helper methods
  private static getStemElement(stem: string): string {
    const stemData = HEAVENLY_STEMS.find(s => s.name === stem);
    return stemData?.element || '';
  }
  
  private static getBranchElement(branch: string): string {
    const branchData = EARTHLY_BRANCHES.find(b => b.name === branch);
    return branchData?.element || '';
  }
}