/**
 * 流月计算器
 * 计算指定年月的流月信息
 */

import { IztroAdapter } from '../../../core/ziwei/IztroAdapter';
import { Lunar } from 'lunar-javascript';

export interface MonthlyInfo {
  year: number;
  month: number;
  isLeapMonth?: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  palaceIndex: number;
  mutagen?: string[];
  palaceNames?: string[];
  startDate?: Date;
  endDate?: Date;
}

export class MonthlyCalculator {
  /**
   * 计算指定年月的流月信息
   * @param adapter - Iztro适配器
   * @param year - 公历年份
   * @param monthIndex - 农历月份索引（包含闰月的月份数组索引）
   * @param lunarMonth - 农历月份号（1-12）
   * @param isLeapMonth - 是否闰月
   */
  static calculate(
    adapter: IztroAdapter,
    year: number,
    monthIndex: number,
    lunarMonth?: number,
    isLeapMonth?: boolean
  ): MonthlyInfo | null {
    try {
      if (lunarMonth === undefined) {
        const dateStr = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-15`;
        const horoscope = adapter.getHoroscope(dateStr);
        
        if (!horoscope?.monthly) {
          return null;
        }
        
        const monthly = horoscope.monthly;
        const palaceIndex = monthly.index !== undefined ? monthly.index : 0;
        const startDate = new Date(Date.UTC(year, monthIndex, 1));
        const endDate = new Date(Date.UTC(year, monthIndex + 1, 0));
        
        return {
          year,
          month: monthIndex + 1,
          isLeapMonth: false,
          heavenlyStem: monthly.heavenlyStem || '',
          earthlyBranch: monthly.earthlyBranch || '',
          palaceIndex,
          mutagen: monthly.mutagen || [],
          palaceNames: monthly.palaceNames || [],
          startDate,
          endDate
        };
      }
      
      const lunarYear = year;
      const monthParam = isLeapMonth ? -lunarMonth : lunarMonth;
      const lunarDate = Lunar.fromYmd(lunarYear, monthParam, 15);
      const solarDate = lunarDate.getSolar();
      
      const dateStr = `${solarDate.getYear()}-${solarDate.getMonth().toString().padStart(2, '0')}-${solarDate.getDay().toString().padStart(2, '0')}`;
      const horoscope = adapter.getHoroscope(dateStr);
      
      if (!horoscope?.monthly) {
        return null;
      }
      
      const monthly = horoscope.monthly;
      const palaceIndex = monthly.index !== undefined ? monthly.index : 0;
      
      const firstDay = Lunar.fromYmd(lunarYear, monthParam, 1).getSolar();
      let lastDayNum = 29;
      try {
        Lunar.fromYmd(lunarYear, monthParam, 30);
        lastDayNum = 30;
      } catch {
        // 只有29天
      }
      const lastDay = Lunar.fromYmd(lunarYear, monthParam, lastDayNum).getSolar();
      
      return {
        year,
        month: lunarMonth,
        isLeapMonth: isLeapMonth || false,
        heavenlyStem: monthly.heavenlyStem || '',
        earthlyBranch: monthly.earthlyBranch || '',
        palaceIndex: palaceIndex !== -1 ? palaceIndex : 0,
        mutagen: monthly.mutagen || [],
        palaceNames: monthly.palaceNames || [],
        startDate: new Date(Date.UTC(firstDay.getYear(), firstDay.getMonth() - 1, firstDay.getDay())),
        endDate: new Date(Date.UTC(lastDay.getYear(), lastDay.getMonth() - 1, lastDay.getDay()))
      };
    } catch (error) {
      console.error('计算流月失败:', error);
      return null;
    }
  }
  
  /**
   * 获取指定农历年的闰月（如果有的话）
   * @returns 闰月月份(1-12)，如果没有闰月返回0
   */
  static getLeapMonth(year: number): number {
    try {
      const lunar = Lunar.fromYmd(year, 1, 1);
      const lunarYear = lunar.getYear();
      for (let m = 1; m <= 12; m++) {
        try {
          Lunar.fromYmd(lunarYear, -m, 1);
          return m;
        } catch {
          // 该月没有闰月
        }
      }
      return 0;
    } catch {
      return 0;
    }
  }
  
  /**
   * 批量计算一年的流月信息（农历月，包含闰月）
   * 紫微斗数流月使用农历月，从正月到腊月，如有闰月则包含在内
   */
  static calculateYear(
    adapter: IztroAdapter,
    year: number
  ): MonthlyInfo[] {
    const months: MonthlyInfo[] = [];
    const leapMonth = this.getLeapMonth(year);
    
    for (let lunarMonth = 1; lunarMonth <= 12; lunarMonth++) {
      const monthlyInfo = this.calculate(adapter, year, lunarMonth - 1, lunarMonth, false);
      if (monthlyInfo) {
        months.push(monthlyInfo);
      }
      
      if (leapMonth === lunarMonth) {
        const leapMonthInfo = this.calculate(adapter, year, lunarMonth - 1, lunarMonth, true);
        if (leapMonthInfo) {
          months.push(leapMonthInfo);
        }
      }
    }
    
    return months;
  }
}