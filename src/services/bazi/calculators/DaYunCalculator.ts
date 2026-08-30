/**
 * Da Yun Calculator
 * Enhanced with taro-bazi's precise calculation methods
 * Calculates major luck periods (大運)
 */

import { BaziChart, DaYun, DaYunAnalysis, FortunePrediction } from '../types';
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, TEN_GODS } from '../../../core/constants/bazi';
import { LuckCycleCalculator, DaYunPeriod } from './LuckCycleCalculator';

export class DaYunCalculator {
  /**
   * Calculate Da Yun periods using taro-bazi's precise method
   */
  static calculate(
    chart: BaziChart,
    birthInfo: any,
    gender: 'male' | 'female',
    timeRange: { startYear?: number; endYear?: number }
  ): DaYun[] {
    
    // Use LuckCycleCalculator for precise calculations
    const birthDate = birthInfo.solar instanceof Date ? birthInfo.solar : new Date(birthInfo.solar);
    const birthYear = birthDate.getUTCFullYear();
    
    
    const daYunPeriods = LuckCycleCalculator.calLuckyList(
      chart,
      gender,
      birthDate,
      12 // Generate 12 periods to cover full lifetime (120 years)
    );
    
    
    const daYuns: DaYun[] = [];
    
    for (const period of daYunPeriods) {
      const periodStartYear = birthYear + period.startAge - 1;
      const periodEndYear = birthYear + period.endAge - 1;
      
      // Calculate ten god for this Da Yun
      const tenGod = this.getTenGod(chart.day.stem, period.stemBranch.stem);
      
      // Analyze this Da Yun period
      const analysis = this.analyzeDaYun(
        period.stemBranch,
        chart,
        tenGod
      );
      
      daYuns.push({
        index: period.index,
        startAge: period.startAge,
        endAge: period.endAge,
        startYear: periodStartYear,
        endYear: periodEndYear,
        stem: period.stemBranch.stem,
        branch: period.stemBranch.branch,
        tenGod,
        analysis
      });
    }
    
    return daYuns;
  }
  
  /**
   * Get ten god relationship
   */
  private static getTenGod(dayMaster: string, stem: string): string {
    return TEN_GODS[dayMaster]?.[stem] || '';
  }
  
  /**
   * Enhanced Da Yun analysis with more factors
   */
  private static analyzeDaYun(
    daYun: { stem: string; branch: string },
    chart: BaziChart,
    tenGod: string
  ): DaYunAnalysis {
    // Determine overall fortune
    const fortune = this.evaluateFortune(daYun, chart, tenGod);
    
    // Analyze different life aspects
    const career = this.analyzeCareer(daYun, chart, tenGod);
    const wealth = this.analyzeWealth(daYun, chart, tenGod);
    const relationships = this.analyzeRelationships(daYun, chart, tenGod);
    const health = this.analyzeHealth(daYun, chart);
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(fortune, tenGod);
    
    return {
      fortune,
      career,
      wealth,
      relationships,
      health,
      suggestions
    };
  }
  
  /**
   * Enhanced fortune evaluation with more factors
   */
  private static evaluateFortune(
    daYun: { stem: string; branch: string },
    chart: BaziChart,
    tenGod: string
  ): '优秀' | '良好' | '一般' | '挑战' | '困难' {
    let score = 50; // Base score
    
    // Ten god influence (±20 points)
    const tenGodScores: Record<string, number> = {
      '正官': 15, '正印': 15, '正財': 15, '食神': 10,
      '比肩': 0, '偏印': 0, '偏財': 5,
      '七殺': -10, '傷官': -10, '劫財': -15
    };
    score += tenGodScores[tenGod] || 0;
    
    // Check stem combinations (±10 points)
    if (this.hasStemCombination(daYun.stem, chart)) {
      score += 10;
    }
    if (this.hasStemClash(daYun.stem, chart)) {
      score -= 10;
    }
    
    // Check branch relationships (±15 points)
    const branchRelations = this.analyzeBranchRelations(daYun.branch, chart);
    if (branchRelations.hasHarmony) score += 15;
    if (branchRelations.hasTripleCombine) score += 10;
    if (branchRelations.hasClash) score -= 15;
    if (branchRelations.hasHarm) score -= 10;
    if (branchRelations.hasPunishment) score -= 10;
    
    // Check element balance (±10 points)
    const elementBalance = this.checkElementBalance(daYun, chart);
    score += elementBalance * 10;
    
    // Convert score to rating
    if (score >= 80) return '优秀';
    if (score >= 65) return '良好';
    if (score >= 45) return '一般';
    if (score >= 30) return '挑战';
    return '困难';
  }
  
  /**
   * Check stem combinations
   */
  private static hasStemCombination(stem: string, chart: BaziChart): boolean {
    const combinations: Record<string, string> = {
      '甲': '己', '己': '甲',
      '乙': '庚', '庚': '乙',
      '丙': '辛', '辛': '丙',
      '丁': '壬', '壬': '丁',
      '戊': '癸', '癸': '戊'
    };
    
    const chartStems = [chart.year.stem, chart.month.stem, chart.day.stem, chart.hour.stem];
    return chartStems.includes(combinations[stem]);
  }
  
  /**
   * Check stem clashes
   */
  private static hasStemClash(stem: string, chart: BaziChart): boolean {
    const clashes: Record<string, string> = {
      '甲': '庚', '庚': '甲',
      '乙': '辛', '辛': '乙',
      '丙': '壬', '壬': '丙',
      '丁': '癸', '癸': '丁'
    };
    
    const chartStems = [chart.year.stem, chart.month.stem, chart.day.stem, chart.hour.stem];
    return chartStems.includes(clashes[stem]);
  }
  
  /**
   * Analyze branch relationships
   */
  private static analyzeBranchRelations(branch: string, chart: BaziChart): {
    hasHarmony: boolean;
    hasTripleCombine: boolean;
    hasClash: boolean;
    hasHarm: boolean;
    hasPunishment: boolean;
  } {
    const chartBranches = [chart.year.branch, chart.month.branch, chart.day.branch, chart.hour.branch];
    
    // Six harmonies (六合)
    const harmonies: Record<string, string> = {
      '子': '丑', '丑': '子',
      '寅': '亥', '亥': '寅',
      '卯': '戌', '戌': '卯',
      '辰': '酉', '酉': '辰',
      '巳': '申', '申': '巳',
      '午': '未', '未': '午'
    };
    
    // Six clashes (六沖)
    const clashes: Record<string, string> = {
      '子': '午', '午': '子',
      '丑': '未', '未': '丑',
      '寅': '申', '申': '寅',
      '卯': '酉', '酉': '卯',
      '辰': '戌', '戌': '辰',
      '巳': '亥', '亥': '巳'
    };
    
    // Six harms (六害)
    const harms: Record<string, string> = {
      '子': '未', '未': '子',
      '丑': '午', '午': '丑',
      '寅': '巳', '巳': '寅',
      '卯': '辰', '辰': '卯',
      '申': '亥', '亥': '申',
      '酉': '戌', '戌': '酉'
    };
    
    // Three combinations (三合)
    const tripleCombines = [
      ['申', '子', '辰'], // Water
      ['亥', '卯', '未'], // Wood
      ['寅', '午', '戌'], // Fire
      ['巳', '酉', '丑']  // Metal
    ];
    
    const hasHarmony = chartBranches.includes(harmonies[branch] || '');
    const hasClash = chartBranches.includes(clashes[branch] || '');
    const hasHarm = chartBranches.includes(harms[branch] || '');
    
    // Check triple combines
    let hasTripleCombine = false;
    for (const triple of tripleCombines) {
      if (triple.includes(branch)) {
        const otherTwo = triple.filter(b => b !== branch);
        if (otherTwo.every(b => chartBranches.includes(b))) {
          hasTripleCombine = true;
          break;
        }
      }
    }
    
    // Simplified punishment check
    const hasPunishment = false; // Would implement full punishment logic
    
    return { hasHarmony, hasTripleCombine, hasClash, hasHarm, hasPunishment };
  }
  
  /**
   * Check element balance
   */
  private static checkElementBalance(
    daYun: { stem: string; branch: string },
    chart: BaziChart
  ): number {
    const daYunElement = this.getStemElement(daYun.stem);
    const dayMasterElement = this.getStemElement(chart.day.stem);
    
    // Check generating cycle
    if (this.isGenerating(daYunElement, dayMasterElement)) return 1;
    
    // Check same element (supporting)
    if (daYunElement === dayMasterElement) return 0.5;
    
    // Check controlling cycle
    if (this.isControlling(daYunElement, dayMasterElement)) return -1;
    
    // Check being controlled
    if (this.isControlling(dayMasterElement, daYunElement)) return -0.5;
    
    return 0;
  }
  
  /**
   * Analyze career prospects
   */
  private static analyzeCareer(
    daYun: { stem: string; branch: string },
    chart: BaziChart,
    tenGod: string
  ): FortunePrediction {
    let rating = 5;
    let trend: '上升' | '稳定' | '下降' = '稳定';
    let description = '';
    
    switch (tenGod) {
      case '正官':
        rating = 8;
        trend = '上升';
        description = '事業運佳，易得上司賞識，有升遷機會';
        break;
      case '七殺':
        rating = 6;
        trend = '上升';
        description = '事業競爭激烈，需要努力拼搏';
        break;
      case '正印':
        rating = 7;
        trend = '稳定';
        description = '工作穩定，有貴人相助';
        break;
      case '偏印':
        rating = 6;
        trend = '稳定';
        description = '適合專業技術發展';
        break;
      case '正財':
        rating = 7;
        trend = '上升';
        description = '財運帶動事業，收入穩定增長';
        break;
      case '偏財':
        rating = 6;
        trend = '上升';
        description = '有意外收入，適合投資創業';
        break;
      case '食神':
        rating = 7;
        trend = '稳定';
        description = '才華得以發揮，工作愉快';
        break;
      case '傷官':
        rating = 5;
        trend = '下降';
        description = '易與上司不合，宜自主創業';
        break;
      case '比肩':
        rating = 5;
        trend = '稳定';
        description = '競爭者多，需要努力維持';
        break;
      case '劫財':
        rating = 4;
        trend = '下降';
        description = '防小人，合作需謹慎';
        break;
      default:
        rating = 5;
        trend = '稳定';
        description = '事業平穩發展';
    }
    
    return { rating, trend, description };
  }
  
  /**
   * Analyze wealth prospects
   */
  private static analyzeWealth(
    daYun: { stem: string; branch: string },
    chart: BaziChart,
    tenGod: string
  ): FortunePrediction {
    let rating = 5;
    let trend: '上升' | '稳定' | '下降' = '稳定';
    let description = '';
    
    switch (tenGod) {
      case '正財':
        rating = 8;
        trend = '上升';
        description = '正財運強，收入穩定增長';
        break;
      case '偏財':
        rating = 7;
        trend = '上升';
        description = '偏財運佳，有意外之財';
        break;
      case '食神':
        rating = 7;
        trend = '上升';
        description = '財源廣進，賺錢輕鬆';
        break;
      case '正官':
        rating = 6;
        trend = '稳定';
        description = '職位帶來穩定收入';
        break;
      case '正印':
        rating = 5;
        trend = '稳定';
        description = '財運平穩，重視儲蓄';
        break;
      case '劫財':
        rating = 3;
        trend = '下降';
        description = '防破財，投資需謹慎';
        break;
      case '比肩':
        rating = 4;
        trend = '稳定';
        description = '財運一般，競爭激烈';
        break;
      default:
        rating = 5;
        trend = '稳定';
        description = '財運平穩';
    }
    
    return { rating, trend, description };
  }
  
  /**
   * Analyze relationship prospects
   */
  private static analyzeRelationships(
    daYun: { stem: string; branch: string },
    chart: BaziChart,
    tenGod: string
  ): FortunePrediction {
    let rating = 5;
    let trend: '上升' | '稳定' | '下降' = '稳定';
    let description = '';
    
    // Check for relationship stars
    const hasRelationshipStar = this.checkRelationshipStars(daYun, chart);
    
    if (hasRelationshipStar) {
      rating = 7;
      trend = '上升';
      description = '桃花運旺，感情機會多';
    } else {
      switch (tenGod) {
        case '正財':
          rating = 7;
          trend = '上升';
          description = '男命娶妻運，女命夫運佳';
          break;
        case '正官':
          rating = 7;
          trend = '稳定';
          description = '感情穩定，適合結婚';
          break;
        case '食神':
          rating = 6;
          trend = '稳定';
          description = '人緣佳，感情和諧';
          break;
        case '傷官':
          rating = 4;
          trend = '下降';
          description = '感情易有波折，需要包容';
          break;
        case '劫財':
          rating = 4;
          trend = '下降';
          description = '感情競爭者多，需要維護';
          break;
        default:
          rating = 5;
          trend = '稳定';
          description = '感情平穩發展';
      }
    }
    
    return { rating, trend, description };
  }
  
  /**
   * Analyze health prospects
   */
  private static analyzeHealth(
    daYun: { stem: string; branch: string },
    chart: BaziChart
  ): FortunePrediction {
    // Simplified health analysis based on element balance
    const daYunElement = this.getStemElement(daYun.stem);
    const dayMasterElement = this.getStemElement(chart.day.stem);
    
    let rating = 6;
    let trend: '上升' | '稳定' | '下降' = '稳定';
    let description = '身體健康，注意保養';
    
    // Check if elements clash
    if (this.isControlling(daYunElement, dayMasterElement)) {
      rating = 4;
      trend = '下降';
      description = '注意身體健康，避免過勞';
    } else if (this.isGenerating(daYunElement, dayMasterElement)) {
      rating = 7;
      trend = '上升';
      description = '身體健康良好，精力充沛';
    }
    
    return { rating, trend, description };
  }
  
  /**
   * Generate suggestions based on Da Yun
   */
  private static generateSuggestions(
    fortune: string,
    tenGod: string
  ): string[] {
    const suggestions: string[] = [];
    
    switch (fortune) {
      case '优秀':
        suggestions.push('把握良機，積極進取');
        suggestions.push('適合開展新計劃');
        break;
      case '良好':
        suggestions.push('穩健發展，循序漸進');
        suggestions.push('維持現有成果');
        break;
      case '一般':
        suggestions.push('保持耐心，等待時機');
        suggestions.push('加強學習提升');
        break;
      case '挑战':
        suggestions.push('謹慎行事，避免冒險');
        suggestions.push('多聽取他人意見');
        break;
      case '困难':
        suggestions.push('低調行事，保守為主');
        suggestions.push('注意身體健康');
        break;
    }
    
    // Add ten god specific suggestions
    switch (tenGod) {
      case '正官':
        suggestions.push('適合考公職或升遷');
        break;
      case '正財':
        suggestions.push('適合理財投資');
        break;
      case '正印':
        suggestions.push('適合學習深造');
        break;
      case '食神':
        suggestions.push('發揮創意才能');
        break;
      case '劫財':
        suggestions.push('避免合夥投資');
        break;
    }
    
    return suggestions;
  }
  
  /**
   * Check for relationship stars
   */
  private static checkRelationshipStars(
    daYun: { stem: string; branch: string },
    chart: BaziChart
  ): boolean {
    // Check for peach blossom stars
    const dayBranch = chart.day.branch;
    const peachBlossoms: Record<string, string[]> = {
      '申': ['酉'], '子': ['酉'], '辰': ['酉'],
      '巳': ['午'], '酉': ['午'], '丑': ['午'],
      '寅': ['卯'], '午': ['卯'], '戌': ['卯'],
      '亥': ['子'], '卯': ['子'], '未': ['子']
    };
    
    const peachBlossomBranches = peachBlossoms[dayBranch] || [];
    return peachBlossomBranches.includes(daYun.branch);
  }
  
  // Helper methods
  private static getStemElement(stem: string): string {
    const stemData = HEAVENLY_STEMS.find(s => s.name === stem);
    return stemData?.element || '';
  }
  
  private static isGenerating(from: string, to: string): boolean {
    const generating: Record<string, string> = {
      '木': '火',
      '火': '土',
      '土': '金',
      '金': '水',
      '水': '木'
    };
    return generating[from] === to;
  }
  
  private static isControlling(from: string, to: string): boolean {
    const controlling: Record<string, string> = {
      '木': '土',
      '土': '水',
      '水': '火',
      '火': '金',
      '金': '木'
    };
    return controlling[from] === to;
  }
}