/**
 * BaZi Service Main Class
 * Unified entry point for all BaZi calculations
 */

import {
  BaziInput,
  BaziResult,
  BaziOptions,
  BaziServiceConfig,
  BaziCalculationError,
  BaziChart,
  DaYun,
  LiuNian,
  LiuYue,
  LiuRi,
  LiuYueInfo,
  LiuRiInfo,
  FiveElement,
  Stem,
  Branch,
  Language,
  Gender
} from './types';
import { BaziCore } from '../../core/bazi';
import { HEAVENLY_STEMS } from '../../core/constants/bazi';
import { StrengthAnalyzer } from './analyzers/StrengthAnalyzer';
import { ClimateAnalyzer } from './analyzers/ClimateAnalyzer';
import { LuckCycleCalculator } from './calculators/LuckCycleCalculator';
import { TenGodsAnalyzer } from './analyzers/TenGodsAnalyzer';
import { YongShenAnalyzer } from './analyzers/YongShenAnalyzer';
import { PatternAnalyzer } from './analyzers/PatternAnalyzer';
import { RelationsAnalyzer } from './analyzers/RelationsAnalyzer';
import { DaYunCalculator } from './calculators/DaYunCalculator';
import { LiuNianCalculator } from './calculators/LiuNianCalculator';
import { LiuYueCalculator } from './calculators/LiuYueCalculator';
import { LiuRiCalculator } from './calculators/LiuRiCalculator';
import { Logger } from '../../shared/logger';
import { nowBeijingParts } from '../../utils/wallTime';

// Create stem-element mapping
const STEM_ELEMENTS: Record<Stem, FiveElement> = HEAVENLY_STEMS.reduce((acc, stem) => {
  acc[stem.name as Stem] = stem.element as FiveElement;
  return acc;
}, {} as Record<Stem, FiveElement>);

export class BaziService {
  /**
   * Map numeric strength to rating string
   */
  private static mapStrengthToRating(strength: number): string {
    if (strength >= 9) return '优秀';
    if (strength >= 7) return '良好';
    if (strength >= 5) return '一般';
    if (strength >= 3) return '挑战';
    return '困难';
  }
  private config: BaziServiceConfig;
  private core: BaziCore;
  private cache: Map<string, BaziResult> = new Map();
  private logger: Logger;
  
  constructor(config: BaziServiceConfig = {}) {
    this.config = {
      defaultLanguage: 'zh-TW',
      enableCaching: true,
      debug: false,
      lenient: false,
      ...config
    };
    this.core = new BaziCore();
    this.logger = new Logger('BaziService');
  }
  
  /**
   * Debug logging helper
   */
  private debug(message: string, data?: any) {
    this.logger.debug(message, data);
  }
  
  /**
   * Main calculation method
   * Performs all BaZi calculations based on input and options
   */
  async calculate(input: BaziInput): Promise<BaziResult> {
    const startTime = Date.now();
    
    // 不记录出生年月日、时刻、姓名、经度或排盘结果。
    this.logger.info('开始八字计算', { 
      type: '八字',
      hasLocation: !!input.longitude 
    });
    
    try {
      this.debug('Starting calculation', {
        hasLocation: !!input.longitude,
        hasOptions: !!input.options,
      });
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(input);
      
      // Check cache if enabled
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        this.debug('Returning cached result');
        
        // 性能日志：缓存命中
        this.logger.info('八字计算完成（缓存命中）', {
          duration: Date.now() - startTime,
          cached: true
        });
        
        return this.maybeTranslate(cached, input.options?.language);
      }
      
      // Merge options with defaults
      const options: BaziOptions = {
        includeEnhanced: true,
        includeTraditional: true,
        ...input.options
      };
      
      // Step 1: Core calculation
      this.debug('Step 1: Starting core calculation');
      const coreResult = await this.core.calculate({
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.hour,
        minute: input.minute,
        gender: input.gender,
        longitude: input.longitude
      });
      
      this.debug(`Core calculation completed in ${Date.now() - startTime}ms`);
      
      // Step 2: Basic analysis (always included)
      const basic = {
        zodiac: coreResult.zodiac || '',
        mingGong: coreResult.mingGong,
        taiYuan: coreResult.taiYuan,
        dayMaster: coreResult.chart.day.stem,
        dayMasterElement: coreResult.dayMasterElement || '',
        fiveElements: coreResult.fiveElements,
        tenGods: TenGodsAnalyzer.analyze(coreResult.chart, coreResult.chart.day.stem)
      };
      
      // Step 3: Enhanced analysis (optional but needed for traditional)
      let enhanced;
      let advancedRelations;
      let patternAnalysis;
      
      if (options.includeEnhanced || options.includeTraditional) {
        const [
          strengthAnalysis,
          twelveGrowthStages,
          voidBranches,
          climate,
          monthStrength
        ] = await Promise.all([
          StrengthAnalyzer.analyze(coreResult.chart, coreResult.birthInfo),
          this.core.calculateTwelveGrowthStages(coreResult.chart),
          this.core.calculateVoidBranches(coreResult.chart.day),
          ClimateAnalyzer.analyze(coreResult.chart, coreResult.birthInfo),
          this.core.calculateMonthStrength(coreResult.chart, coreResult.birthInfo)
        ]);
        
        // Use RelationsAnalyzer for comprehensive branch relations
        advancedRelations = RelationsAnalyzer.analyze(coreResult.chart);
        
        // Pattern analysis
        this.debug('Starting pattern analysis');
        try {
          const rawPatternAnalysis = PatternAnalyzer.analyze(coreResult.chart, advancedRelations, strengthAnalysis);
          this.debug('Pattern analysis completed');
          // Keep the raw pattern analysis format that the component expects
          patternAnalysis = rawPatternAnalysis;
        } catch (paErr) {
          if (!this.config.lenient) {
            throw paErr;
          }
          // Share/lenient mode: fallback to a safe default
          this.logger.warn('Pattern analysis failed, using fallback pattern (lenient)', paErr as Error);
          patternAnalysis = {
            primaryPattern: {
              type: '正格',
              subtype: undefined,
              strength: 5,
              description: '標準格局，五行較為平衡',
              priority: 3,
              characteristics: ['平衡穩定', '發展均衡']
            },
            secondaryPatterns: [],
            chartStructure: {
              dayMasterType: '平衡',
              usefulGods: [],
              avoidGods: [],
              structureScore: 50,
              balanceType: '平衡'
            },
            specialFeatures: [],
            recommendations: {
              favorableElements: [],
              unfavorableElements: [],
              careerSuggestions: [],
              lifestyleSuggestions: []
            }
          } as any;
        }
        
        enhanced = {
          strengthAnalysis,
          twelveGrowthStages,
          voidBranches,
          branchRelations: advancedRelations,
          climate,
          monthStrength,
          patternAnalysis
        };
      }
      
      // Step 4: Traditional analysis with enhanced YongShen (optional)
      let traditional;
      if (options.includeTraditional && coreResult.dayMasterElement && enhanced) {
        // 用神分析（流月/流日列表工具的内部输入）
        traditional = {
          yongShen: YongShenAnalyzer.analyze(
            coreResult.chart,
            enhanced.strengthAnalysis,
            patternAnalysis,
            enhanced.climate
          ),
        };
      }
      
      // Step 5: Time-based analysis
      // Calculate full lifetime Da Yun periods (typically 8-10 periods covering 80-100 years)
      const birthYear = input.year;
      const timeRange = options.timeRange || {
        startYear: birthYear,
        endYear: birthYear + 100 // Cover full lifetime
      };
      
      // Calculate luck sequence information
      const birthDate = coreResult.birthInfo.solar instanceof Date 
        ? coreResult.birthInfo.solar 
        : new Date(coreResult.birthInfo.solar);
      let luckSequence: any = undefined;
      try {
        luckSequence = LuckCycleCalculator.calLuckyAge(
          birthDate,
          input.gender || 'male',
          coreResult.chart.year.stem
        );
      } catch (lsErr) {
        if (!this.config.lenient) {
          throw lsErr;
        }
        this.logger.warn('Luck sequence calculation failed; continuing without it (lenient)', lsErr as Error);
      }
      
      let daYun = [] as DaYun[];
      try {
        daYun = DaYunCalculator.calculate(
          coreResult.chart,
          coreResult.birthInfo,
          input.gender || 'male',
          timeRange
        );
      } catch (dyErr) {
        if (!this.config.lenient) {
          throw dyErr;
        }
        this.logger.warn('DaYun calculation failed; returning empty list (lenient)', dyErr as Error);
        daYun = [] as any;
      }
      
      // Add void branches to each DaYun period
      daYun.forEach(period => {
        period.voidBranches = LuckCycleCalculator.calculateVoidBranches(
          period.stem,
          period.branch
        );
      });
      
      const currentYear = nowBeijingParts().year;
      const currentAge = currentYear - input.year + 1;
      const currentDaYun = daYun.find(d => currentAge >= d.startAge && currentAge <= d.endAge);
      
      let liuNian;
      let currentLiuNian;
      // Always calculate LiuNian for the full DaYun range if time range is specified
      if (timeRange.startYear && timeRange.endYear) {
        try {
          liuNian = LiuNianCalculator.calculate(
            coreResult.chart,
            input.year,
            timeRange.startYear,
            timeRange.endYear,
            coreResult.birthInfo,
            input.gender || 'male'
          );
          currentLiuNian = liuNian.find(l => l.year === currentYear);
        } catch (lnErr) {
          if (!this.config.lenient) {
            throw lnErr;
          }
          this.logger.warn('LiuNian calculation failed; continuing without yearly list (lenient)', lnErr as Error);
          liuNian = undefined;
          currentLiuNian = undefined;
        }
      }
      
      // Step 6: Assemble result
      const result: BaziResult = {
        chart: coreResult.chart,
        birthInfo: {
          solar: coreResult.birthInfo.solar,
          lunar: coreResult.birthInfo.lunar,
          trueSolarTime: coreResult.birthInfo.trueSolarTime,
          solarTerm: coreResult.birthInfo.solarTerm,
          adjacentSolarTermTime: coreResult.birthInfo.adjacentSolarTermTime
        },
        basic,
        traditional,
        enhanced,
        timeBased: {
          daYun,
          currentDaYun,
          liuNian,
          currentLiuNian
        },
        meta: {
          calculatedAt: new Date(),
          version: '2.0.0',
          options,
          luckSequence
        }
      };
      
      // Cache result if enabled
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, result);
      }
      
      // Step 7: Translate if needed
      const finalResult = this.maybeTranslate(result, options.language);
      
      // 成功出口日志
      this.logger.info('八字计算完成', {
        duration: Date.now() - startTime,
        complexity: {
          tenGodsCount: finalResult.basic?.tenGods?.length || 0
        }
      });
      
      return finalResult;
      
    } catch (error) {
      // 错误日志
      this.logger.error('八字计算失败', error as Error, {
        duration: Date.now() - startTime,
      });
      
      if (error instanceof BaziCalculationError) {
        throw error;
      }
      this.debug('❌ Original error in calculation', error);
      throw new BaziCalculationError(
        'BaZi calculation failed',
        'CALCULATION_FAILED',
        error
      );
    }
  }
  
  /**
   * Analyze specific features
   * Allows selective analysis for performance optimization
   */
  async analyze(
    input: BaziInput,
    features: string[]
  ): Promise<Partial<BaziResult>> {
    // Implementation for selective analysis
    // This allows components to request only specific features
    const fullResult = await this.calculate({
      ...input,
      options: {
        ...input.options,
        includeEnhanced: features.includes('enhanced'),
        includeTraditional: features.includes('traditional')
      }
    });
    
    // Return only requested features
    const result: Partial<BaziResult> = {
      chart: fullResult.chart,
      birthInfo: fullResult.birthInfo,
      meta: fullResult.meta
    };
    
    if (features.includes('basic')) {
      result.basic = fullResult.basic;
    }
    if (features.includes('traditional')) {
      result.traditional = fullResult.traditional;
    }
    if (features.includes('enhanced')) {
      result.enhanced = fullResult.enhanced;
    }
    if (features.includes('timeBased')) {
      result.timeBased = fullResult.timeBased;
    }
    
    return result;
  }
  
  // 註：便捷封裝（getDaYun/getLiuNian/getLiuYue/getLiuRi 及未實現的今日運勢樁）
  // 為 baziwei 血統遺留、零調用方，已於 0.1.4 移除；MCP 工具直接使用各 Calculator。

  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Generate cache key from input
   */
  private generateCacheKey(input: BaziInput): string {
    const { year, month, day, hour, minute = 0, gender = 'male', longitude = 0, options = {} } = input;
    return `${year}-${month}-${day}-${hour}:${minute}-${gender}-${longitude}-${JSON.stringify(options)}`;
  }
  
  /**
   * Translate result if language is specified
   */
  private maybeTranslate(result: BaziResult, language?: Language): BaziResult {
    // Translation now handled at component level with useT()
    return result;
  }
  
  /**
   * Validate input
   */
  validateInput(input: Partial<BaziInput>): string[] {
    const errors: string[] = [];
    
    if (!input.year || input.year < 1900 || input.year > 2100) {
      errors.push('Invalid year (must be between 1900 and 2100)');
    }
    if (!input.month || input.month < 1 || input.month > 12) {
      errors.push('Invalid month (must be between 1 and 12)');
    }
    if (!input.day || input.day < 1 || input.day > 31) {
      errors.push('Invalid day (must be between 1 and 31)');
    }
    if (input.hour === undefined || input.hour < 0 || input.hour > 23) {
      errors.push('Invalid hour (must be between 0 and 23)');
    }
    if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) {
      errors.push('Invalid longitude (must be between -180 and 180)');
    }
    
    return errors;
  }
  
  /**
   * Get service configuration
   */
  getConfig(): BaziServiceConfig {
    return { ...this.config };
  }
  
  /**
   * Update service configuration
   */
  updateConfig(config: Partial<BaziServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get year stem and branch for a given year
   */
  private getYearStemBranch(year: number): { stem: Stem; branch: Branch } {
    const STEMS: Stem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const BRANCHES: Branch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    // Year 1984 is 甲子年 (stem index 0, branch index 0)
    const baseYear = 1984;
    const yearDiff = year - baseYear;
    
    const stemIndex = ((yearDiff % 10) + 10) % 10;
    const branchIndex = ((yearDiff % 12) + 12) % 12;
    
    return {
      stem: STEMS[stemIndex],
      branch: BRANCHES[branchIndex]
    };
  }

  /**
   * Get month stem and branch for a given year and month
   * 注意：这里的month是节气月序号(1-12)，不是公历月份
   * month=1 -> 寅月, month=2 -> 卯月, ..., month=11 -> 子月, month=12 -> 丑月
   * 这与 LiuYueCalculator 中的 (i + 2) % 12 逻辑一致
   */
  private getMonthStemBranch(year: number, month: number): { stem: Stem; branch: Branch } {
    const STEMS: Stem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const BRANCHES: Branch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    // 月支计算：(month + 1) % 12
    // month=1 -> 寅(2), month=11 -> 子(0), month=12 -> 丑(1)
    const monthBranch = BRANCHES[(month + 1) % 12];
    
    // Month stem depends on year stem
    const yearStem = this.getYearStemBranch(year).stem;
    const yearStemIndex = STEMS.indexOf(yearStem);
    
    // Rules for first month stem based on year stem
    // 五虎遁年起月诀
    const firstMonthStemMap: Record<number, number> = {
      0: 2, // 甲年 -> 丙寅月
      1: 4, // 乙年 -> 戊寅月
      2: 6, // 丙年 -> 庚寅月
      3: 8, // 丁年 -> 壬寅月
      4: 0, // 戊年 -> 甲寅月
      5: 2, // 己年 -> 丙寅月
      6: 4, // 庚年 -> 戊寅月
      7: 6, // 辛年 -> 庚寅月
      8: 8, // 壬年 -> 壬寅月
      9: 0  // 癸年 -> 甲寅月
    };
    
    const firstMonthStemIndex = firstMonthStemMap[yearStemIndex];
    const monthStemIndex = (firstMonthStemIndex + month - 1) % 10;
    
    return {
      stem: STEMS[monthStemIndex],
      branch: monthBranch
    };
  }
}

// Export singleton instance for convenience
export const baziService = new BaziService();
