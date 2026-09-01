/**
 * 紫微斗数服务主类
 * 提供统一的对外接口，整合所有计算功能
 */

import { 
  ZiweiInput, 
  ZiweiResult, 
  ZiweiServiceConfig,
  EnhancedPalace,
  DecadeInfo,
  ZiweiCalculationError
} from './types';
import { IztroAdapter } from '../../core/ziwei/IztroAdapter';
import { DecadeCalculator } from './calculators/DecadeCalculator';
import { YearlyCalculator } from './calculators/YearlyCalculator';
import { MinorLimitCalculator } from './calculators/MinorLimitCalculator';
import { MutagenCalculator } from './calculators/MutagenCalculator';
import { BrightnessCalculator } from './calculators/BrightnessCalculator';
import { MonthlyCalculator } from './calculators/MonthlyCalculator';
import { DailyCalculator } from './calculators/DailyCalculator';
import { HourlyCalculator } from './calculators/HourlyCalculator';
import { HoroscopeStarsCalculator } from './calculators/HoroscopeStarsCalculator';
import { PalaceTransformer } from './transformers/PalaceTransformer';
import { Logger } from '../../shared/logger';
import { nowBeijingParts } from '../../utils/wallTime';

export class ZiweiService {
  private adapter: IztroAdapter;
  private config: ZiweiServiceConfig;
  private currentGender: 'male' | 'female' = 'male';
  private logger: Logger;
  
  constructor(config: ZiweiServiceConfig = {}) {
    this.adapter = new IztroAdapter();
    this.config = {
      language: 'zh-TW',
      includeYearlyInfo: true,
      includeMutagenInfo: true,
      debug: false,
      ...config
    };
    this.logger = new Logger('ZiweiService');
  }
  
  /**
   * 更新服务配置
   */
  setConfig(config: Partial<ZiweiServiceConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
  
  /**
   * 计算紫微斗数命盘
   */
  calculate(input: ZiweiInput): ZiweiResult {
    const startTime = Date.now();
    
    // 不记录出生年月日、时刻、姓名、经度或排盘结果。
    this.logger.info('开始紫微计算', {
      type: '紫微',
      palaceCount: 12
    });
    
    try {
      // 设置语言
      const language = input.language || this.config.language || 'zh-TW';
      
      // 保存性别信息
      this.currentGender = input.gender;
      
      // 初始化适配器
      this.adapter.init({ ...input, language });
      
      // 获取基本信息
      const basicInfo = this.adapter.getBasicInfo();
      const fourPillars = this.adapter.getFourPillars();
      const lunarDate = this.adapter.getLunarDate();
      
      // 获取宫位信息
      let palaces = this.adapter.getPalaces();
      
      // 计算星曜亮度
      palaces = BrightnessCalculator.calculateForAllPalaces(palaces);
      
      // 计算大限信息
      let decades = DecadeCalculator.calculate(
        palaces, 
        basicInfo, 
        fourPillars,
        input.gender,
        input.year
      );
      
      // 获取增强的大限信息（包含正确的天干地支）
      decades = DecadeCalculator.getEnhancedDecadeInfo(
        decades,
        this.adapter,
        input.year
      );
      
      // 获取当前大限 - 使用目标年份或当前年份
      const targetYear = this.config.targetYear || nowBeijingParts().year;
      const targetAge = DecadeCalculator.getCurrentAge(input.year, targetYear);
      const currentDecade = DecadeCalculator.getCurrentDecade(targetAge, decades);
      
      // 计算流年信息（如果需要）
      let yearlyInfo;
      if (this.config.includeYearlyInfo) {
        yearlyInfo = YearlyCalculator.calculate(targetYear, input.year, palaces);
      }
      
      // 计算四化信息（如果需要）
      let mutagenInfo;
      if (this.config.includeMutagenInfo) {
        const natalStem = fourPillars.year.stem;
        const decadalStem = currentDecade?.heavenlyStem;
        const yearlyStem = yearlyInfo?.heavenlyStem;

        mutagenInfo = MutagenCalculator.calculateCompleteMutagen(
          natalStem,
          decadalStem,
          yearlyStem,
          language
        );

        // 应用四化到宫位
        palaces = MutagenCalculator.applyMutagenToPalaces(palaces, mutagenInfo);
      }
      
      // 提取并应用流曜 - 使用目标年份构建日期
      const targetYearForHoroscope = this.config.targetYear || nowBeijingParts().year;
      const targetDate = `${targetYearForHoroscope}-01-01`;  // 使用目标年份的第一天
      const horoscope = this.adapter.getHoroscope(targetDate);
      const yearlyStars = HoroscopeStarsCalculator.extractYearlyStars(horoscope);
      const decadalStars = HoroscopeStarsCalculator.extractDecadalStars(horoscope);
      
      // 将流曜应用到宫位
      palaces = HoroscopeStarsCalculator.applyHoroscopeStarsToPalaces(
        palaces,
        yearlyStars,
        decadalStars
      );
      
      // 将流曜信息添加到年份和大限信息中
      if (yearlyInfo && yearlyStars) {
        yearlyInfo.stars = yearlyStars;
      }
      
      if (currentDecade && decadalStars) {
        currentDecade.stars = decadalStars;
      }
      
      // 增强宫位信息
      const enhancedPalaces = this.enhancePalaces(
        palaces, 
        decades, 
        currentDecade || undefined,
        yearlyInfo
      );
      
      // 构建返回结果
      const result: ZiweiResult = {
        basicInfo,
        solarDate: `${input.year}-${input.month.toString().padStart(2, '0')}-${input.day.toString().padStart(2, '0')}`,
        lunarDate,
        palaces: enhancedPalaces,
        decades,
        currentDecade: currentDecade || undefined,
        yearlyInfo,
        mutagenInfo,
        gender: input.gender,
        birthYear: input.year,
        language
      };
      
      if (this.config.debug) {
        this.logger.debug('ZiweiService debug enabled');
      }
      
      // 成功出口日志
      this.logger.info('紫微计算完成', {
        duration: Date.now() - startTime,
        starCount: result.palaces.reduce((count, palace) => 
          count + palace.majorStars.length + palace.minorStars.length, 0
        )
      });
      
      return result;
      
    } catch (error) {
      // 错误日志
      this.logger.error('紫微计算失败', error as Error, {
        duration: Date.now() - startTime,
      });
      
      if (error instanceof ZiweiCalculationError) {
        throw error;
      }
      throw new ZiweiCalculationError(
        'Ziwei calculation failed',
        'CALCULATION_FAILED',
        error
      );
    }
  }
  
  /**
   * 计算指定日期的运限信息
   */
  calculateHoroscope(date: string): any {
    const horoscope = this.adapter.getHoroscope(date);
    
    // 修正流年信息
    if (horoscope?.yearly) {
      const targetYear = new Date(date).getUTCFullYear();
      horoscope.yearly = YearlyCalculator.fixYearlyInfo(horoscope.yearly, targetYear);
    }
    
    return horoscope;
  }
  
  /**
   * 计算小限年龄
   * 小限计算规则：
   * 1. 根据出生年支确定起始宫位
   * 2. 男顺女逆运行
   * 3. 每年一宫，12年一轮回
   */
  private calculateMinorLimitAges(palace: any, gender: 'male' | 'female', yearBranch: string): number[] {
    const ages: number[] = [];
    
    // 地支顺序
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const palaceBranchIndex = branches.indexOf(palace.earthlyBranch);
    
    if (palaceBranchIndex === -1) {
      console.warn(`Palace branch not found: ${palace.earthlyBranch}`);
      return ages;
    }
    
    // 根据出生年支确定起始宫位
    let startBranch: string;
    if (['寅', '午', '戌'].includes(yearBranch)) {
      startBranch = '辰'; // 寅午戌年生人：从辰宫起1岁
    } else if (['申', '子', '辰'].includes(yearBranch)) {
      startBranch = '戌'; // 申子辰年生人：从戌宫起1岁
    } else if (['巳', '酉', '丑'].includes(yearBranch)) {
      startBranch = '未'; // 巳酉丑年生人：从未宫起1岁
    } else if (['亥', '卯', '未'].includes(yearBranch)) {
      startBranch = '丑'; // 亥卯未年生人：从丑宫起1岁
    } else {
      console.warn(`Year branch not in any group: ${yearBranch}`);
      return ages;
    }
    
    const startBranchIndex = branches.indexOf(startBranch);
    if (startBranchIndex === -1) {
      console.warn(`Start branch not found: ${startBranch}`);
      return ages;
    }
    
    
    // 计算该宫位的小限年龄
    for (let cycle = 0; cycle < 8; cycle++) {
      for (let offset = 0; offset < 12; offset++) {
        const currentAge = offset + 1 + (cycle * 12);
        if (currentAge > 96) break;
        
        // 计算当前年龄对应的宫位
        let currentBranchIndex: number;
        if (gender === 'male') {
          // 男命顺行
          currentBranchIndex = (startBranchIndex + offset) % 12;
        } else {
          // 女命逆行
          currentBranchIndex = (startBranchIndex - offset + 12) % 12;
        }
        
        
        // 如果当前宫位与传入的宫位匹配，记录年龄
        if (currentBranchIndex === palaceBranchIndex) {
          ages.push(currentAge);
        }
      }
    }
    
    return ages;
  }

  /**
   * 增强宫位信息
   */
  private enhancePalaces(
    palaces: any[],
    decades: DecadeInfo[],
    currentDecade?: DecadeInfo,
    yearlyInfo?: any
  ): EnhancedPalace[] {
    // 获取年支和性别信息
    const yearBranch = this.adapter.getFourPillars().year.branch;
    const gender = this.currentGender;
    
    return palaces.map((palace, index) => {
      const enhanced: EnhancedPalace = {
        ...palace,
        minorLimitAges: this.calculateMinorLimitAges(palace, gender, yearBranch)
      };
      
      // Find the decade that is assigned to THIS palace
      // Match by earthly branch since palace array order might not match decade calculation order
      // Skip 童限 (index = -1) and find the actual decade
      const decade = decades.find(d => {
        if (d.index < 0) return false; // Skip 童限
        // Match by earthly branch which is more reliable than array index
        return d.earthlyBranch === palace.earthlyBranch;
      });
      
      if (decade) {
        enhanced.decadeInfo = {
          startAge: decade.startAge,
          endAge: decade.endAge,
          isCurrent: currentDecade?.index === decade.index
        };
      }
      
      // 设置动态宫位名称
      if (currentDecade && currentDecade.palaceIndex !== undefined) {
        // 获取命宫索引
        const mingGongIndex = palaces.findIndex(p => 
          p.name === '命宮' || p.name === '命宫' || p.name === 'Life' || p.name === '命'
        );
        
        if (mingGongIndex >= 0) {
          const isClockwise = DecadeCalculator.isClockwise(
            this.adapter.getFourPillars().year.stem,
            this.currentGender
          );
          
          const palaceInfo = PalaceTransformer.getCompletePalaceInfo(
            palace,
            index,
            mingGongIndex,
            currentDecade,
            yearlyInfo,
            isClockwise,
            palaces
          );
          
          enhanced.dynamicNames = {
            decadal: palaceInfo.decadal,
            yearly: palaceInfo.yearly
          };
          enhanced.isDecadeHighlight = palaceInfo.isDecadalMing || false;
          enhanced.isYearlyHighlight = palaceInfo.isYearlyMing || false;
        } else {
          enhanced.isDecadeHighlight = index === currentDecade.palaceIndex;
        }
      } else {
        enhanced.isDecadeHighlight = false;
      }
      
      
      return enhanced;
    });
  }
  
  /**
   * 获取小限信息
   */
  getMinorLimitInfo(
    birthYear: number,
    targetYear: number
  ): ReturnType<typeof MinorLimitCalculator.calculate> {
    return MinorLimitCalculator.calculate(this.adapter, birthYear, targetYear);
  }
  
  /**
   * 获取小限列表（年龄范围）
   */
  getMinorLimitRange(
    birthYear: number,
    startAge: number,
    endAge: number
  ): ReturnType<typeof MinorLimitCalculator.calculateRange> {
    return MinorLimitCalculator.calculateRange(this.adapter, birthYear, startAge, endAge);
  }
  
  /**
   * 获取小限列表（年份范围）
   */
  getMinorLimitByYearRange(
    birthYear: number,
    startYear: number,
    endYear: number
  ): ReturnType<typeof MinorLimitCalculator.calculateByYearRange> {
    return MinorLimitCalculator.calculateByYearRange(this.adapter, birthYear, startYear, endYear);
  }
  
  /**
   * 获取所有小限（1-96岁）
   */
  getAllMinorLimits(
    birthYear: number,
    maxAge: number = 96
  ): ReturnType<typeof MinorLimitCalculator.calculateAll> {
    return MinorLimitCalculator.calculateAll(this.adapter, birthYear, maxAge);
  }
  
  /**
   * 获取流月信息
   * @param year - 公历年份
   * @param monthIndex - 农历月份索引
   * @param lunarMonth - 农历月份号（1-12）
   * @param isLeapMonth - 是否闰月
   */
  getMonthlyInfo(
    year: number, 
    monthIndex: number, 
    lunarMonth?: number, 
    isLeapMonth?: boolean
  ): ReturnType<typeof MonthlyCalculator.calculate> {
    return MonthlyCalculator.calculate(this.adapter, year, monthIndex, lunarMonth, isLeapMonth);
  }
  
  /**
   * 获取一年的流月信息
   */
  getYearlyMonths(year: number): ReturnType<typeof MonthlyCalculator.calculateYear> {
    return MonthlyCalculator.calculateYear(this.adapter, year);
  }
  
  /**
   * 获取流日信息
   */
  getDailyInfo(year: number, month: number, day: number): ReturnType<typeof DailyCalculator.calculate> {
    return DailyCalculator.calculate(this.adapter, year, month, day);
  }
  
  /**
   * 获取一个月的流日信息
   */
  getMonthlyDays(year: number, month: number): ReturnType<typeof DailyCalculator.calculateMonth> {
    return DailyCalculator.calculateMonth(this.adapter, year, month);
  }
  
  /**
   * 获取流时信息
   */
  getHourlyInfo(year: number, month: number, day: number, hour: number): ReturnType<typeof HourlyCalculator.calculate> {
    return HourlyCalculator.calculate(this.adapter, year, month, day, hour);
  }
  
  /**
   * 获取一天的流时信息
   */
  getDailyHours(year: number, month: number, day: number): ReturnType<typeof HourlyCalculator.calculateDay> {
    return HourlyCalculator.calculateDay(this.adapter, year, month, day);
  }
}

// 导出单例实例
export const ziweiService = new ZiweiService();
