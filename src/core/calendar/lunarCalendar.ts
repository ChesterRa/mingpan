// 农历转换模块 - 基于lunar-javascript库
import { Solar, Lunar } from 'lunar-javascript';


export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
  monthName: string;
  dayName: string;
  ganZhi: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  zodiac: string;
  solarTerms: string[];
}

export interface ExtendedBaziInfo {
  year: { stem: string; branch: string; };
  month: { stem: string; branch: string; };
  day: { stem: string; branch: string; };
  hour: { stem: string; branch: string; };
  dayMaster: string;
  nayin: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  solarTermInfo: {
    current: string;
    next: string;
    daysToNext: number;
  };
  zodiac: string;
  lunarDate: LunarDate;
}

export class LunarCalendarService {
  /**
   * 公历转农历
   */
  static solarToLunar(year: number, month: number, day: number): LunarDate {
    try {
      const solar = Solar.fromYmd(year, month, day);
      const lunar = solar.getLunar();
      
      const rawMonth = lunar.getMonth();
      return {
        year: lunar.getYear(),
        month: Math.abs(rawMonth),
        day: lunar.getDay(),
        isLeap: rawMonth < 0,
        monthName: lunar.getMonthInChinese(),
        dayName: lunar.getDayInChinese(),
        ganZhi: {
          year: lunar.getYearInGanZhi(),
          month: lunar.getMonthInGanZhi(),
          day: lunar.getDayInGanZhi(),
          hour: '' // 需要时辰才能确定
        },
        zodiac: lunar.getYearShengXiao(),
        solarTerms: []  // Temporarily removed to avoid errors
      };
    } catch (error) {
      console.error('农历转换错误:', error);
      throw new Error('农历转换失败');
    }
  }

  /**
   * 农历转公历
   */
  static lunarToSolar(
    year: number,
    month: number,
    day: number,
    _isLeap: boolean = false
  ): Date {
    try {
      // Note: lunar-javascript's Lunar.fromYmd doesn't support isLeap parameter
      // For leap months, the month should be negative in the library's convention
      const lunar = Lunar.fromYmd(year, month, day);
      const solar = lunar.getSolar();

      return new Date(Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay()));
    } catch (error) {
      console.error('公历转换错误:', error);
      throw new Error('公历转换失败');
    }
  }

  /**
   * 获取详细的八字信息（使用lunar-javascript）
   */
  static getExtendedBaziInfo(
    year: number,
    month: number,
    day: number,
    hour: number = 12,
    minute: number = 0
  ): ExtendedBaziInfo {
    try {
      const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
      const lunar = solar.getLunar();

      // 获取八字
      const eightChar = lunar.getEightChar();
      
      return {
        year: {
          stem: eightChar.getYearGan(),
          branch: eightChar.getYearZhi()
        },
        month: {
          stem: eightChar.getMonthGan(),
          branch: eightChar.getMonthZhi()
        },
        day: {
          stem: eightChar.getDayGan(),
          branch: eightChar.getDayZhi()
        },
        hour: {
          stem: eightChar.getTimeGan(),
          branch: eightChar.getTimeZhi()
        },
        dayMaster: eightChar.getDayGan(),
        nayin: {
          year: eightChar.getYearNaYin(),
          month: eightChar.getMonthNaYin(),
          day: eightChar.getDayNaYin(),
          hour: eightChar.getTimeNaYin()
        },
        solarTermInfo: {
          current: lunar.getCurrentJieQi()?.getName() || '',
          next: lunar.getNextJie()?.getName() || '',
          daysToNext: 0  // Temporarily set to 0 to avoid errors
        },
        zodiac: lunar.getYearShengXiao(),
        lunarDate: this.solarToLunar(year, month, day)
      };
    } catch (error) {
      console.error('八字信息获取错误:', error);
      throw new Error('八字信息获取失败');
    }
  }

  /**
   * 验证lunar-javascript的计算结果
   */
  static validateLunarCalculation(
    year: number, 
    month: number, 
    day: number
  ): {
    isValid: boolean;
    warnings: string[];
    lunarInfo: any;
  } {
    const warnings: string[] = [];
    let isValid = true;

    try {
      const solar = Solar.fromYmd(year, month, day);
      const lunar = solar.getLunar();
      
      // 检查是否在节气边界
      const currentJieQi = lunar.getCurrentJieQi();
      const nextJie = lunar.getNextJie();
      
      if (nextJie) {
        const daysToNext = 0;  // Temporarily set to 0 to avoid errors
        if (daysToNext <= 1) {
          warnings.push('接近节气交换点，八字月柱可能需要确认');
          isValid = false;
        }
      }

      // 检查是否接近年份边界（立春）
      const lichun = lunar.getNextJie(); // 获取立春
      if (lichun) {
        const daysToLichun = 0;  // Temporarily set to 0 to avoid errors
        if (daysToLichun <= 1) {
          warnings.push('接近立春，年柱可能需要确认');
          isValid = false;
        }
      }

      return {
        isValid,
        warnings,
        lunarInfo: {
          lunar: lunar.toFullString(),
          eightChar: lunar.getEightChar().toString(),
          jieQi: currentJieQi?.getName(),
          zodiac: lunar.getYearShengXiao()
        }
      };
    } catch (error) {
      return {
        isValid: false,
        warnings: ['农历计算验证失败: ' + (error instanceof Error ? error.message : String(error))],
        lunarInfo: null
      };
    }
  }

  /**
   * 获取节气列表
   */
  static getSolarTerms(year: number): Array<{
    name: string;
    date: Date;
    lunarMonth: number;
  }> {
    try {
      const results: Array<{name: string; date: Date; lunarMonth: number}> = [];
      
      // Temporarily return empty array to avoid errors
      // TODO: Fix getJieQiTable() method calls
      
      return results.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      console.error('获取节气列表错误:', error);
      return [];
    }
  }
}