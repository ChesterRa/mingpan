// 精确万年历算法

import { 
  gregorianToJulianDay, 
  julianDayToGregorian,
  getGanZhiFromJulianDay 
} from './julian';
import { 
  calculateSolarTerms, 
  findSolarTerm, 
  getSolarTermMonthFromDate,
  SOLAR_TERMS_NAMES 
} from './solarTerms';
import { 
  HEAVENLY_STEMS_ARRAY, 
  EARTHLY_BRANCHES_ARRAY,
  BRANCH_HIDDEN_STEMS
} from '../../core/constants/bazi';
import {
  STEM_WU_XING,
  BRANCH_WU_XING,
  NAYIN_WU_XING
} from './constants';

export interface PreciseBaziPillar {
  stem: string;
  branch: string;
  nayin: string;
  wuxing: string;
  hiddenStems: string[];
}

export interface PreciseBaziChart {
  year: PreciseBaziPillar;
  month: PreciseBaziPillar;
  day: PreciseBaziPillar;
  hour: PreciseBaziPillar;
  dayMaster: string;
  solarTermInfo: {
    current: { name: string; date: Date } | null;
    next: { name: string; date: Date } | null;
    monthName: string;
  };
  julianDay: number;
  lunarDate?: {
    year: number;
    month: number;
    day: number;
    isLeap: boolean;
  };
}

export class PreciseCalendar {
  /**
   * 计算精确的八字四柱
   * @param date 公历日期
   * @param hour 小时 (0-23)
   * @param minute 分钟 (0-59)
   * @returns 精确的八字信息
   */
  static calculatePreciseBazi(
    date: Date,
    hour: number = date.getUTCHours(),
    minute: number = date.getUTCMinutes()
  ): PreciseBaziChart {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    
    // 计算儒略日
    const jd = gregorianToJulianDay(year, month, day, hour, minute);
    
    // 获取节气信息
    const solarTermInfo = findSolarTerm(date);
    let solarMonth;
    try {
      solarMonth = getSolarTermMonthFromDate(date);
    } catch (error) {
      // 如果无法获取节气月份，使用备用方法
      solarMonth = {
        monthIndex: date.getUTCMonth(),
        monthName: ['正月', '二月', '三月', '四月', '五月', '六月',
                   '七月', '八月', '九月', '十月', '十一月', '十二月'][date.getUTCMonth()],
        startTerm: '未知',
        endTerm: '未知'
      };
    }
    
    // 计算年柱（以立春为界）
    const yearPillar = this.calculateYearPillar(date, solarTermInfo);
    
    // 计算月柱（以节气为界）
    const monthPillar = this.calculateMonthPillar(date, yearPillar.stem, solarTermInfo);
    
    // 计算日柱（精确到分钟）
    const dayPillar = this.calculateDayPillar(jd);
    
    // 计算时柱
    const hourPillar = this.calculateHourPillar(hour, minute, dayPillar.stem);
    
    return {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
      dayMaster: dayPillar.stem,
      solarTermInfo: {
        current: solarTermInfo.current ? {
          name: solarTermInfo.current.name,
          date: solarTermInfo.current.date
        } : null,
        next: solarTermInfo.next ? {
          name: solarTermInfo.next.name,
          date: solarTermInfo.next.date
        } : null,
        monthName: solarMonth.monthName
      },
      julianDay: jd
    };
  }
  
  /**
   * 计算年柱（以立春为分界点）
   */
  private static calculateYearPillar(
    date: Date,
    solarTermInfo: any
  ): PreciseBaziPillar {
    let year = date.getUTCFullYear();
    
    // 获取该年立春时间
    const solarTerms = calculateSolarTerms(year);
    const lichun = solarTerms[2]; // 立春是第3个节气 (索引2)
    
    // 如果在立春之前，年份要减1
    if (date < lichun) {
      year -= 1;
    }
    
    // 计算天干地支索引：以1984年甲子年为基准
    // 1984是甲子年，甲=0，子=0
    const yearDiff = year - 1984;
    const stemIndex = yearDiff % 10;
    const branchIndex = yearDiff % 12;
    
    return this.createPillar(
      stemIndex >= 0 ? stemIndex : stemIndex + 10,
      branchIndex >= 0 ? branchIndex : branchIndex + 12
    );
  }
  
  /**
   * 计算月柱（以节气为分界点）
   */
  private static calculateMonthPillar(
    date: Date,
    yearStem: string,
    solarTermInfo: any
  ): PreciseBaziPillar {
    // 获取当前月份的节气信息来确定农历月
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // JavaScript月份从0开始
    const day = date.getUTCDate();
    
    // 计算当前月的节气月份（以节气为准）
    let lunarMonth: number;
    
    try {
      const solarTerms = calculateSolarTerms(year);
      // 按节气确定月份：立春为寅月起始，每个月两个节气
      let termMonth = 2; // 从寅月开始（立春所在月）
      
      for (let i = 2; i < solarTerms.length; i += 2) { // 从立春开始，每两个节气一个月
        if (date >= solarTerms[i]) {
          termMonth = 2 + Math.floor((i - 2) / 2);
        } else {
          break;
        }
      }
      
      lunarMonth = (termMonth - 1) % 12; // 转换为0-11的索引
    } catch (error) {
      // 备用计算：简化的月份对应
      const monthMapping = [10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // 公历月到农历月的映射
      lunarMonth = monthMapping[month - 1];
    }
    
    // 月干计算：根据年干推月干
    const yearStemIndex = HEAVENLY_STEMS_ARRAY.indexOf(yearStem as any);
    const monthStemIndex = ((yearStemIndex % 5) * 2 + lunarMonth) % 10;
    
    // 月支：寅月为正月（索引2），依次类推
    const monthBranchIndex = (lunarMonth + 2) % 12;
    
    return this.createPillar(monthStemIndex, monthBranchIndex);
  }
  
  /**
   * 计算日柱（基于儒略日）
   */
  private static calculateDayPillar(jd: number): PreciseBaziPillar {
    const ganZhi = getGanZhiFromJulianDay(jd);
    const stemIndex = HEAVENLY_STEMS_ARRAY.indexOf(ganZhi.gan as any);
    const branchIndex = EARTHLY_BRANCHES_ARRAY.indexOf(ganZhi.zhi as any);
    
    return this.createPillar(stemIndex, branchIndex);
  }
  
  /**
   * 计算时柱
   */
  private static calculateHourPillar(
    hour: number,
    minute: number,
    dayStem: string
  ): PreciseBaziPillar {
    // 时辰划分：子时23-1点，丑时1-3点，以此类推
    // 精确到分钟：每个时辰120分钟
    let hourBranchIndex: number;
    
    if (hour === 23 || hour === 0) {
      hourBranchIndex = 0; // 子时
    } else {
      hourBranchIndex = Math.floor((hour + 1) / 2);
    }
    
    // 如果是边界时间（如23:30），可能需要特殊处理
    if (hour === 23 && minute >= 0) {
      hourBranchIndex = 0; // 子时开始
    } else if (hour === 1 && minute === 0) {
      hourBranchIndex = 1; // 丑时开始
    }
    
    // 时干计算：日干推时干
    const dayStemIndex = HEAVENLY_STEMS_ARRAY.indexOf(dayStem as any);
    const hourStemIndex = ((dayStemIndex % 5) * 2 + hourBranchIndex) % 10;
    
    return this.createPillar(hourStemIndex, hourBranchIndex);
  }
  
  /**
   * 创建柱子对象
   */
  private static createPillar(
    stemIndex: number,
    branchIndex: number
  ): PreciseBaziPillar {
    const stem = HEAVENLY_STEMS_ARRAY[stemIndex];
    const branch = EARTHLY_BRANCHES_ARRAY[branchIndex];
    const ganZhi = stem + branch;
    
    return {
      stem,
      branch,
      nayin: (NAYIN_WU_XING as any)[ganZhi] || '未知',
      wuxing: (STEM_WU_XING as any)[stem],
      hiddenStems: (BRANCH_HIDDEN_STEMS as any)[branch] || []
    };
  }
  
  /**
   * 获取某日的详细节气信息
   */
  static getDetailedSolarTermInfo(date: Date): {
    currentTerm: string;
    nextTerm: string;
    daysToNext: number;
    monthName: string;
    season: string;
  } {
    const termInfo = findSolarTerm(date);
    const solarMonth = getSolarTermMonthFromDate(date);
    
    if (!termInfo.current || !termInfo.next) {
      throw new Error('无法获取节气信息');
    }
    
    const daysToNext = Math.ceil(
      (termInfo.next.date.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // 判断季节
    const seasons = ['冬', '冬', '春', '春', '春', '春', '夏', '夏', '夏', '夏', '秋', '秋', '秋', '秋', '冬', '冬', '冬', '冬', '冬', '冬', '冬', '冬', '冬', '冬'];
    const season = seasons[termInfo.current.index];
    
    return {
      currentTerm: termInfo.current.name,
      nextTerm: termInfo.next.name,
      daysToNext,
      monthName: solarMonth.monthName,
      season
    };
  }
  
  /**
   * 验证计算结果的准确性
   */
  static validateCalculation(
    date: Date,
    result: PreciseBaziChart
  ): {
    isValid: boolean;
    warnings: string[];
    confidence: number;
  } {
    const warnings: string[] = [];
    let confidence = 100;
    
    // 检查是否在节气边界附近
    if (result.solarTermInfo.next) {
      const daysToNext = Math.ceil(
        (new Date(result.solarTermInfo.next.date).getTime() - date.getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      if (daysToNext <= 1) {
        warnings.push('日期接近节气交换点，请确认具体时间');
        confidence -= 10;
      }
    }
    
    // 检查是否在年份边界
    const year = date.getUTCFullYear();
    const lichun = calculateSolarTerms(year)[2];
    const daysDiff = Math.abs((date.getTime() - lichun.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      warnings.push('日期接近立春，年柱可能需要特别确认');
      confidence -= 15;
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      confidence
    };
  }
}