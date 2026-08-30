/**
 * Type declarations for lunar-javascript library
 * Based on actual API from the library source
 */
declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
    static fromJd(jd: number): Solar;
    static fromDate(date: Date): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getLunar(): Lunar;
    getJulianDay(): number;
    toYmd(): string;
    toYmdHms(): string;
    next(days: number): Solar;
    toJd(): number;
    getWeek(): number;
    getWeekInChinese(): string;
    getConstellation(): string;
    getFestivals(): string[];
    toFullString(): string;
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Lunar;
    static fromDate(date: Date): Lunar;
    static fromSolar(solar: Solar): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getYearGan(): string;
    getYearZhi(): string;
    getYearGanZhi(): string;
    getYearGanIndex(): number;
    getYearZhiIndex(): number;
    getMonthGan(): string;
    getMonthZhi(): string;
    getMonthGanZhi(): string;
    getMonthGanIndex(): number;
    getMonthZhiIndex(): number;
    getDayGan(): string;
    getDayZhi(): string;
    getDayGanZhi(): string;
    getDayGanIndex(): number;
    getDayZhiIndex(): number;
    getTimeGan(): string;
    getTimeZhi(): string;
    getTimeGanZhi(): string;
    getTimeGanIndex(): number;
    getTimeZhiIndex(): number;
    getSolar(): Solar;
    getJieQi(): string;
    getJie(): string;
    getQi(): string;
    getPrevJie(): JieQi | null;
    getNextJie(): JieQi | null;
    getJieQiTable(): Record<string, any>;
    getYearInChinese(): string;
    getMonthInGanZhi(): string;
    getYearShengXiao(): string;
    getPrevQi(): JieQi | null;
    getNextQi(): JieQi | null;
    getPrevJieQi(): JieQi | null;
    getNextJieQi(): JieQi | null;
    getCurrentJieQi(): JieQi | null;
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    getYearXun(): string;
    getYearXunKong(): string;
    getMonthXun(): string;
    getMonthXunKong(): string;
    getDayXun(): string;
    getDayXunKong(): string;
    getTimeXun(): string;
    getTimeXunKong(): string;
    getYearZhiIndex12(): number;
    getMonthZhiIndex12(): number;
    getDayZhiIndex12(): number;
    getTimeZhiIndex12(): number;
    getDayYi(): string[];
    getDayJi(): string[];
    getTimeYi(): string[];
    getTimeJi(): string[];
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getSeasonInChinese(): string;
    getShuJiu(): string | null;
    getFu(): string | null;
    getShengXiao(): string;
    getYearShengXiao(): string;
    getYearInGanZhi(): string;
  getYearInGanZhiByLiChun(): string;
  getYearInGanZhiExact(): string;
    getMonthInGanZhi(): string;
    getDayInGanZhi(): string;
    getTimeInGanZhi(): string;
    isLeapMonth(): boolean;
    toFullString(): string;
    getEightChar(): EightChar;
    getTimes(): LunarTime[];
  }

  export class EightChar {
    static fromLunar(lunar: Lunar): EightChar;
    getYear(): string;
  getTaiYuan(): string;
  getMingGong(): string;
  getShenGong(): string;
  setSect(sect: number): void;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    getYearXun(): string;
    getYearXunKong(): string;
    getMonthXun(): string;
    getMonthXunKong(): string;
    getDayXun(): string;
    getDayXunKong(): string;
    getTimeXun(): string;
    getTimeXunKong(): string;
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getDayShiShenGan(): string;
    getTimeShiShenGan(): string;
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    getYearDiShi(): string;
    getMonthDiShi(): string;
    getDayDiShi(): string;
    getTimeDiShi(): string;
    toString(): string;
    toFullString(): string;
  }

  export class LunarTime {
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): LunarTime;
    getGan(): string;
    getZhi(): string;
    getGanZhi(): string;
    getNaYin(): string;
    getXun(): string;
    getXunKong(): string;
    getShengXiao(): string;
    getPositionXi(): string;
    getPositionYangGui(): string;
    getPositionYinGui(): string;
    getPositionFu(): string;
    getPositionCai(): string;
    toString(): string;
    toFullString(): string;
  }

  export class JieQi {
    getName(): string;
    getSolar(): Solar;
    getJie(): boolean;
    getQi(): boolean;
  }

  export class SolarWeek {
    static fromYmd(year: number, month: number, day: number, start: number): SolarWeek;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getIndex(): number;
    getFirstDay(): Solar;
    getDays(): Solar[];
  }

  export class SolarMonth {
    static fromYm(year: number, month: number): SolarMonth;
    getYear(): number;
    getMonth(): number;
    getDays(): Solar[];
    getFirstDay(): Solar;
    getLastDay(): Solar;
  }

  export class SolarYear {
    static fromYear(year: number): SolarYear;
    getYear(): number;
    getLeapMonth(): number;
    getDays(): Solar[];
    getMonths(): SolarMonth[];
  }

  export class LunarMonth {
    static fromYm(year: number, month: number): LunarMonth;
    getYear(): number;
    getMonth(): number;
    getDays(): Lunar[];
    getFirstDay(): Lunar;
    getLastDay(): Lunar;
    isLeap(): boolean;
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear;
    getYear(): number;
    getGanZhi(): string;
    getLeapMonth(): number;
    getMonthsInYear(): number;
    getMonths(): LunarMonth[];
  }

  export class HolidayUtil {
    static getHoliday(year: number, month: number, day: number): Holiday | null;
    static getHolidaysByTarget(year: number, month: number, day: number): Holiday[];
  }

  export class Holiday {
    getDay(): string;
    getName(): string;
    isWork(): boolean;
    getTarget(): string;
  }

  export class JieQiUtil {
    static getJieQi(year: number, month: number, day: number): string;
    static getJieQiSolar(year: number, name: string): Solar;
  }

  export class ShouXingUtil {
    static getJieQi(jd: number): number;
    static qiAccurate(y: number): number;
    static jiangQiAccurate(y: number): number;
  }

  export class SolarUtil {
    static isLeapYear(year: number): boolean;
    static getDaysOfMonth(year: number, month: number): number;
    static getDaysOfYear(year: number): number;
    static getWeeksOfMonth(year: number, month: number, start: number): number;
    static getDaysBetween(year1: number, month1: number, day1: number, year2: number, month2: number, day2: number): number;
  }

  export class LunarUtil {
    static GAN: string[];
    static ZHI: string[];
    static SHENGXIAO: string[];
    static JIE_QI: string[];
    static JIE_QI_IN_USE: string[];
    static convertTime(time: string): number;
  }

  export class I18n {
    static setLanguage(language: string): void;
    static getLanguage(): string;
    static getMessage(key: string): string;
  }
}
