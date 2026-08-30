/**
 * 節氣計算器
 * 用於確定日期所屬的節氣月份
 */

export interface SolarTermInfo {
  termIndex: number;  // 0-23
  termName: string;   // 節氣名稱
  termDate: Date;     // 節氣日期
  nextTerm: string;   // 下一個節氣
  nextTermDate: Date; // 下一個節氣日期
}

export class SolarTermsCalculator {
  // 24節氣名稱
  private static readonly SOLAR_TERMS = [
    '立春', '雨水', '驚蟄', '春分', '清明', '穀雨',
    '立夏', '小滿', '芒種', '夏至', '小暑', '大暑',
    '立秋', '處暑', '白露', '秋分', '寒露', '霜降',
    '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
  ];

  // 節氣基準數據（2000年的節氣時刻，單位：分鐘）
  // 這是簡化版本，實際應該使用更精確的天文算法
  private static readonly BASE_MINUTES_2000 = [
    318663, 333795, 349066, 364618, 380057, 395317,
    410841, 426569, 442303, 458174, 473964, 489528,
    504978, 520435, 535914, 551476, 567087, 582633,
    598067, 613506, 628960, 644509, 660096, 675611
  ];

  /**
   * 獲取指定日期所屬的節氣月份
   */
  static getSolarTermMonth(year: number, month: number, day: number): SolarTermInfo {
    const date = new Date(year, month - 1, day);
    
    // 計算該年的所有節氣日期
    const solarTermDates = this.calculateYearSolarTerms(year);
    
    // 找出日期所屬的節氣區間
    for (let i = 0; i < solarTermDates.length; i++) {
      const currentTerm = solarTermDates[i];
      const nextTerm = solarTermDates[(i + 1) % 24];
      const nextTermDate = i < 23 ? nextTerm.date : this.calculateYearSolarTerms(year + 1)[0].date;
      
      if (date >= currentTerm.date && date < nextTermDate) {
        return {
          termIndex: i,
          termName: currentTerm.name,
          termDate: currentTerm.date,
          nextTerm: nextTerm.name,
          nextTermDate: nextTermDate
        };
      }
    }
    
    // 如果日期在大寒之後，屬於下一年的立春
    return {
      termIndex: 0,
      termName: '立春',
      termDate: this.calculateYearSolarTerms(year + 1)[0].date,
      nextTerm: '雨水',
      nextTermDate: this.calculateYearSolarTerms(year + 1)[1].date
    };
  }

  /**
   * 計算指定年份的所有節氣日期
   * 使用簡化算法，實際應用中應該使用更精確的天文算法
   */
  private static calculateYearSolarTerms(year: number): Array<{name: string, date: Date}> {
    const terms: Array<{name: string, date: Date}> = [];
    
    // 簡化算法：基於經驗公式計算節氣日期
    // 實際應該使用天文算法或查表
    const yearDiff = year - 2000;
    const leapYears = Math.floor(yearDiff / 4) - Math.floor(yearDiff / 100) + Math.floor(yearDiff / 400);
    
    for (let i = 0; i < 24; i++) {
      // 基準分鐘數 + 年份調整
      const baseMinutes = this.BASE_MINUTES_2000[i];
      const adjustedMinutes = baseMinutes + yearDiff * 365.2422 * 24 * 60 / 24;
      
      // 轉換為日期
      const termDate = new Date(2000, 0, 1);
      termDate.setMinutes(termDate.getUTCMinutes() + adjustedMinutes);
      
      // 根據節氣索引調整日期（這是簡化版本）
      const month = Math.floor(i / 2);
      const isFirstHalf = i % 2 === 0;
      
      // 節氣通常在每月的5-7日（節）和20-22日（氣）
      const day = isFirstHalf ? 
        (4 + Math.round((year - 2000) * 0.242)) : 
        (19 + Math.round((year - 2000) * 0.242));
      
      const actualDate = new Date(year, month, day);
      
      // 微調：立春通常在2月3-5日
      if (i === 0) {
        actualDate.setMonth(1);
        actualDate.setDate(4);
      }
      
      terms.push({
        name: this.SOLAR_TERMS[i],
        date: actualDate
      });
    }
    
    return terms;
  }

  /**
   * 判斷某個日期是否是節氣日
   */
  static isSolarTermDay(year: number, month: number, day: number): boolean {
    const terms = this.calculateYearSolarTerms(year);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return terms.some(term => {
      const termDateStr = `${term.date.getUTCFullYear()}-${String(term.date.getUTCMonth() + 1).padStart(2, '0')}-${String(term.date.getUTCDate()).padStart(2, '0')}`;
      return termDateStr === dateStr;
    });
  }

  /**
   * 獲取節氣名稱
   */
  static getSolarTermName(index: number): string {
    return this.SOLAR_TERMS[index] || '';
  }
}