/**
 * 统一的节气计算模块
 * 整合了原calendar/solarTerms.ts和bazi/astronomy/solarTerm.ts的功能
 */

import { gregorianToJulianDay, julianDayToGregorian } from './julian';
import { Solar } from 'lunar-javascript';

/**
 * 24节气名称
 */
export const SOLAR_TERMS_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
];

// 节气数据定义
export const SOLAR_TERMS = SOLAR_TERMS_NAMES;

export interface SolarTermInfo {
  currentSolarTerm: string;
  nextSolarTerm: string;
  currentSolarTermDate: Date;
  nextSolarTermDate: Date;
  isAfterLichun: boolean;
}

/**
 * 精确的节气计算器类
 */
export class PreciseSolarTermCalculator {
  // 基准数据：2000年各节气的儒略日
  private static readonly SOLAR_TERM_BASE_2000: number[] = [
    2451547.65, // 小寒
    2451562.95, // 大寒
    2451578.31, // 立春
    2451593.63, // 雨水
    2451609.00, // 惊蛰
    2451624.39, // 春分
    2451639.83, // 清明
    2451655.28, // 谷雨
    2451670.76, // 立夏
    2451686.26, // 小满
    2451701.77, // 芒种
    2451717.31, // 夏至
    2451732.86, // 小暑
    2451748.42, // 大暑
    2451764.00, // 立秋
    2451779.60, // 处暑
    2451795.22, // 白露
    2451810.86, // 秋分
    2451826.52, // 寒露
    2451842.21, // 霜降
    2451857.93, // 立冬
    2451873.68, // 小雪
    2451889.46, // 大雪
    2451905.28  // 冬至
  ];

  // 每年的平均增量（天）
  private static readonly YEAR_INCREMENT = 365.2422;
  
  // 章动和岁差修正系数
  private static readonly PRECESSION_RATE = 0.0000137; // 每年的岁差

  /**
   * 获取指定日期的节气信息
   */
  static getSolarTermInfo(date: Date): SolarTermInfo {
    const year = date.getUTCFullYear();
    const solarTerms = this.calculateYearSolarTerms(year);
    
    let currentIndex = -1;
    for (let i = 23; i >= 0; i--) {
      if (date >= solarTerms[i].date) {
        currentIndex = i;
        break;
      }
    }
    
    // 如果在第一个节气之前，使用上一年的最后一个节气
    if (currentIndex === -1) {
      const prevYearTerms = this.calculateYearSolarTerms(year - 1);
      currentIndex = 23;
      return {
        currentSolarTerm: SOLAR_TERMS_NAMES[23],
        nextSolarTerm: SOLAR_TERMS_NAMES[0],
        currentSolarTermDate: prevYearTerms[23].date,
        nextSolarTermDate: solarTerms[0].date,
        isAfterLichun: false
      };
    }
    
    const nextIndex = (currentIndex + 1) % 24;
    const nextTerms = nextIndex === 0 ? 
      this.calculateYearSolarTerms(year + 1) : 
      solarTerms;
    
    return {
      currentSolarTerm: SOLAR_TERMS_NAMES[currentIndex],
      nextSolarTerm: SOLAR_TERMS_NAMES[nextIndex],
      currentSolarTermDate: solarTerms[currentIndex].date,
      nextSolarTermDate: nextTerms[nextIndex].date,
      isAfterLichun: currentIndex >= 2 || (currentIndex < 2 && date >= solarTerms[2].date)
    };
  }

  /**
   * 计算某年所有节气
   * 使用 lunar-javascript 的 getJieQiTable() 获取精确的节气日期
   */
  static calculateYearSolarTerms(year: number): Array<{name: string; date: Date}> {
    const terms: Array<{name: string; date: Date}> = [];
    
    // 使用 lunar-javascript 的 getJieQiTable 获取完整节气表
    // 该方法返回包含该年前后所有节气的精确时间
    const jieQiTable = this.getJieQiTableFromLunar(year);
    
    // 节气名称按照本文件定义的顺序
    for (const termName of SOLAR_TERMS_NAMES) {
      const termData = jieQiTable.get(termName);
      if (termData) {
        terms.push({ name: termName, date: termData });
      } else {
        // Fallback: 使用原有算法
        const termIndex = SOLAR_TERMS_NAMES.indexOf(termName);
        terms.push({ name: termName, date: this.calculateSingleTermFallback(year, termIndex) });
      }
    }
    
    // 按日期排序确保顺序正确
    terms.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return terms;
  }
  
  /**
   * 使用 lunar-javascript 获取某年所有节气的精确日期
   * 通过 Lunar.getJieQiTable() 方法获取
   */
  private static getJieQiTableFromLunar(year: number): Map<string, Date> {
    const result = new Map<string, Date>();
    
    // 英文名称到中文名称的映射
    // jieQiTable 中部分节气使用英文拼音名（如下一年的节气）
    const englishToChineseMap: Record<string, string> = {
      'XIAO_HAN': '小寒',
      'DA_HAN': '大寒',
      'LI_CHUN': '立春',
      'YU_SHUI': '雨水',
      'JING_ZHE': '惊蛰',
      'CHUN_FEN': '春分',
      'QING_MING': '清明',
      'GU_YU': '谷雨',
      'LI_XIA': '立夏',
      'XIAO_MAN': '小满',
      'MANG_ZHONG': '芒种',
      'XIA_ZHI': '夏至',
      'XIAO_SHU': '小暑',
      'DA_SHU': '大暑',
      'LI_QIU': '立秋',
      'CHU_SHU': '处暑',
      'BAI_LU': '白露',
      'QIU_FEN': '秋分',
      'HAN_LU': '寒露',
      'SHUANG_JIANG': '霜降',
      'LI_DONG': '立冬',
      'XIAO_XUE': '小雪',
      'DA_XUE': '大雪',
      'DONG_ZHI': '冬至',
    };
    
    // 获取某一天的农历对象，然后获取完整节气表
    // 使用年中的某一天来确保获取该年的节气数据
    const solar = Solar.fromYmd(year, 6, 15);
    const lunar = solar.getLunar();
    const jieQiTable = (lunar as any).getJieQiTable();
    
    if (jieQiTable) {
      // 首先收集所有节气数据，按年份分类
      const termsByYear: Map<string, Array<{name: string; date: Date; year: number}>> = new Map();
      
      for (const [termName, termValue] of Object.entries(jieQiTable)) {
        const p = (termValue as any)?._p;
        if (p && p.year && p.month && p.day) {
          // 转换英文名称为中文
          let chineseName = termName;
          if (englishToChineseMap[termName]) {
            chineseName = englishToChineseMap[termName];
          } else if (!/^[\u4e00-\u9fa5]+$/.test(termName)) {
            // 忽略其他非中文名称
            continue;
          }
          
          const date = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour || 0, p.minute || 0, p.second || 0));
          const key = `${chineseName}_${p.year}`;
          
          if (!termsByYear.has(chineseName)) {
            termsByYear.set(chineseName, []);
          }
          termsByYear.get(chineseName)!.push({ name: chineseName, date, year: p.year });
        }
      }
      
      // 对于每个节气，选择正确年份的数据
      for (const [termName, entries] of termsByYear) {
        // 优先选择目标年份的数据
        let selected = entries.find(e => e.year === year);
        
        // 特殊处理跨年节气（小寒、大寒可能在次年1月）
        if (!selected && (termName === '小寒' || termName === '大寒')) {
          selected = entries.find(e => e.year === year + 1);
        }
        
        // 如果没有找到，选择最接近目标年份的数据
        if (!selected && entries.length > 0) {
          selected = entries.sort((a, b) => 
            Math.abs(a.year - year) - Math.abs(b.year - year)
          )[0];
        }
        
        if (selected) {
          result.set(termName, selected.date);
        }
      }
    }
    
    return result;
  }
  
  /**
   * 通过检测月干支变化来定位节气（JIE）的精确日期
   * lunar-javascript 的月干支会在节气当天变化
   */
  private static findJieTermDatesByGanZhiChange(year: number): Map<string, Date> {
    const result = new Map<string, Date>();
    
    // 节气名称及其对应的月支变化
    // 当月干支从一个值变为另一个值时，就是节气当天
    const jieToMonthBranch: Record<string, string> = {
      '小寒': '丑',  // 子月->丑月
      '立春': '寅',  // 丑月->寅月  
      '惊蛰': '卯',  // 寅月->卯月
      '清明': '辰',  // 卯月->辰月
      '立夏': '巳',  // 辰月->巳月
      '芒种': '午',  // 巳月->午月
      '小暑': '未',  // 午月->未月
      '立秋': '申',  // 未月->申月
      '白露': '酉',  // 申月->酉月
      '寒露': '戌',  // 酉月->戌月
      '立冬': '亥',  // 戌月->亥月
      '大雪': '子',  // 亥月->子月
    };
    
    // 遍历一年中的每一天，检测月干支变化
    const startDate = new Date(year, 0, 1);  // 1月1日
    const endDate = new Date(year + 1, 0, 31);  // 次年1月31日
    
    let prevMonthGanZhi = '';
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      try {
        const solar = Solar.fromYmd(
          currentDate.getUTCFullYear(),
          currentDate.getUTCMonth() + 1,
          currentDate.getUTCDate()
        );
        const lunar = solar.getLunar();
        const monthGanZhi = lunar.getMonthInGanZhi();
        
        if (prevMonthGanZhi && monthGanZhi !== prevMonthGanZhi) {
          // 月干支发生变化，这是节气当天
          const newBranch = monthGanZhi.substring(1);  // 取地支
          
          // 找到对应的节气
          for (const [jieName, branch] of Object.entries(jieToMonthBranch)) {
            if (branch === newBranch) {
              // 检查年份是否匹配（小寒和大雪可能跨年）
              const isCurrentYear = currentDate.getUTCFullYear() === year;
              const isJanNextYear = currentDate.getUTCFullYear() === year + 1 && currentDate.getUTCMonth() === 0;
              const isDecCurrentYear = currentDate.getUTCFullYear() === year && currentDate.getUTCMonth() === 11;
              
              if ((jieName === '小寒' && isJanNextYear) ||
                  (jieName === '大雪' && isDecCurrentYear) ||
                  (jieName !== '小寒' && jieName !== '大雪' && isCurrentYear)) {
                result.set(jieName, new Date(currentDate));
              } else if (jieName === '小寒' && currentDate.getUTCFullYear() === year && currentDate.getUTCMonth() === 0) {
                // 当年1月的小寒
                result.set(jieName, new Date(currentDate));
              }
              break;
            }
          }
        }
        
        prevMonthGanZhi = monthGanZhi;
      } catch (e) {
        // 忽略无效日期
      }
      
      currentDate.setDate(currentDate.getUTCDate() + 1);
    }
    
    return result;
  }
  
  /**
   * 使用原有算法计算单个节气的日期（作为 fallback）
   */
  private static calculateSingleTermFallback(year: number, termIndex: number): Date {
    const yearDiff = year - 2000;
    
    // 基础儒略日
    let jd = this.SOLAR_TERM_BASE_2000[termIndex];
    
    // 年份修正
    jd += yearDiff * this.YEAR_INCREMENT;
    
    // 岁差修正
    jd += yearDiff * yearDiff * this.PRECESSION_RATE;
    
    // 章动修正（简化版）
    const T = yearDiff / 100;
    const nutation = 0.0001 * Math.sin(125.04 - 1934.136 * T);
    jd += nutation;
    
    // 转换为公历日期
    const gregorian = julianDayToGregorian(jd);
    return new Date(
      gregorian.year,
      gregorian.month - 1,
      gregorian.day,
      gregorian.hour,
      gregorian.minute,
      gregorian.second
    );
  }
}

/**
 * 计算某年24节气的精确时间
 * @param year 年份
 * @returns 24节气时间数组
 */
export function calculateSolarTerms(year: number): Date[] {
  const terms = PreciseSolarTermCalculator.calculateYearSolarTerms(year);
  return terms.map(t => t.date);
}

/**
 * 计算某个节气的儒略日
 * @param year 年份
 * @param termIndex 节气索引 (0-23)
 * @returns 儒略日
 */
function calculateSolarTermJD(year: number, termIndex: number): number {
  // 基准年份和角度
  const baseYear = 2000;
  const yearDiff = year - baseYear;
  
  // 每个节气对应的太阳黄经度数 (从小寒开始，每15度一个节气)
  const baseLongitude = 285 + termIndex * 15; // 小寒对应285度
  const longitude = baseLongitude % 360;
  
  // 概略计算：基于平均值
  const dayOfYear = getSolarTermApproxDay(termIndex, year);
  const baseJD = gregorianToJulianDay(year, 1, 1) + dayOfYear - 1;
  
  // 使用迭代法精确计算
  let jd = baseJD;
  for (let i = 0; i < 10; i++) {
    const actualLongitude = getSolarLongitude(jd);
    const diff = normalizeLongitude(longitude - actualLongitude);
    
    if (Math.abs(diff) < 0.0001) break;
    
    // 太阳每天移动约1度
    jd += diff / 1.0;
  }
  
  return jd;
}

/**
 * 获取节气在一年中的大概日期
 * @param termIndex 节气索引
 * @param year 年份
 * @returns 年内第几天
 */
function getSolarTermApproxDay(termIndex: number, year: number): number {
  // 基础天数（基于现代天文数据）
  const baseDays = [
    5, 20, // 小寒、大寒
    4, 19, // 立春、雨水
    6, 21, // 惊蛰、春分
    5, 20, // 清明、谷雨
    6, 21, // 立夏、小满
    6, 22, // 芒种、夏至
    7, 23, // 小暑、大暑
    8, 23, // 立秋、处暑
    8, 23, // 白露、秋分
    8, 24, // 寒露、霜降
    8, 22, // 立冬、小雪
    7, 22  // 大雪、冬至
  ];
  
  const monthStart = Math.floor(termIndex / 2);
  const dayInMonth = baseDays[termIndex];
  
  let dayOfYear = dayInMonth;
  for (let m = 0; m < monthStart; m++) {
    dayOfYear += getDaysInMonth(year, m + 1);
  }
  
  return dayOfYear;
}

/**
 * 计算太阳黄经
 * @param jd 儒略日
 * @returns 太阳黄经度数
 */
function getSolarLongitude(jd: number): number {
  // 简化的太阳黄经计算（实际应使用VSOP87等高精度算法）
  const t = (jd - 2451545.0) / 36525.0; // 儒略世纪数
  
  // 平均近点角
  const M = 357.5291 + 35999.0503 * t - 0.0001559 * t * t - 0.00000048 * t * t * t;
  
  // 太阳的平均黄经
  const L0 = 280.46645 + 36000.76983 * t + 0.0003032 * t * t;
  
  // 黄经改正
  const C = (1.9146 - 0.004817 * t - 0.000014 * t * t) * Math.sin(toRadians(M))
          + (0.019993 - 0.000101 * t) * Math.sin(toRadians(2 * M))
          + 0.000290 * Math.sin(toRadians(3 * M));
  
  // 真黄经
  const longitude = L0 + C;
  
  return normalizeLongitude(longitude);
}

/**
 * 角度转弧度
 */
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * 规范化角度到0-360度
 */
function normalizeLongitude(longitude: number): number {
  while (longitude < 0) longitude += 360;
  while (longitude >= 360) longitude -= 360;
  return longitude;
}

/**
 * 获取某月的天数
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getUTCDate();
}

/**
 * 查找某日期对应的节气
 * @param date 日期
 * @returns 节气信息
 */
export function findSolarTerm(date: Date): {
  current: { name: string; date: Date; index: number } | null;
  next: { name: string; date: Date; index: number } | null;
  previous: { name: string; date: Date; index: number } | null;
} {
  const year = date.getUTCFullYear();
  const terms = calculateSolarTerms(year);
  
  // 添加前一年最后一个节气和后一年第一个节气
  const prevYearTerms = calculateSolarTerms(year - 1);
  const nextYearTerms = calculateSolarTerms(year + 1);
  
  const allTerms = [
    ...prevYearTerms.slice(-1).map((d, i) => ({ date: d, index: 23, name: SOLAR_TERMS_NAMES[23] })),
    ...terms.map((d, i) => ({ date: d, index: i, name: SOLAR_TERMS_NAMES[i] })),
    ...nextYearTerms.slice(0, 1).map((d, i) => ({ date: d, index: 0, name: SOLAR_TERMS_NAMES[0] }))
  ];
  
  let current = null;
  let next = null;
  let previous = null;
  
  for (let i = 0; i < allTerms.length; i++) {
    const term = allTerms[i];
    
    if (term.date <= date) {
      previous = current;
      current = term;
    } else {
      next = term;
      break;
    }
  }
  
  return { current, next, previous };
}

/**
 * 获取某日期所在的节气月份
 * @param date 日期
 * @returns 节气月份信息
 */
export function getSolarTermMonthFromDate(date: Date): {
  monthIndex: number; // 0-11，对应十二个节气月
  monthName: string;
  startTerm: string;
  endTerm: string;
} {
  const termInfo = findSolarTerm(date);
  
  if (!termInfo.current) {
    throw new Error('无法确定节气月份');
  }
  
  // 节气月以立春为起点
  const monthIndex = Math.floor((termInfo.current.index + 22) / 2) % 12;
  
  const monthNames = [
    '正月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  
  const startTermIndex = monthIndex * 2 + 2; // 立春开始
  const endTermIndex = (startTermIndex + 1) % 24;
  
  return {
    monthIndex,
    monthName: monthNames[monthIndex],
    startTerm: SOLAR_TERMS_NAMES[startTermIndex % 24],
    endTerm: SOLAR_TERMS_NAMES[endTermIndex]
  };
}

/**
 * 根据年月日获取节气月份（用于八字计算）
 * @param year 年
 * @param month 月
 * @param day 日
 * @returns 节气月份索引 (0-11)
 */
export function getSolarTermMonth(year: number, month: number, day: number): number {
  const date = new Date(year, month - 1, day);
  const termInfo = PreciseSolarTermCalculator.getSolarTermInfo(date);
  
  // 根据当前节气确定月份
  const termIndex = SOLAR_TERMS_NAMES.indexOf(termInfo.currentSolarTerm);
  
  // 节气月份从寅月（立春）开始
  // 小寒、大寒属于丑月（11）
  // 立春、雨水属于寅月（0）
  // 以此类推
  if (termIndex < 2) {
    // 小寒、大寒属于上一年的丑月
    return 11;
  }
  
  return Math.floor((termIndex - 2) / 2);
}

/**
 * 获取某年立春的准确日期
 * @param year 年份
 * @returns 立春日期
 */
export function getAccurateLichunDate(year: number): Date {
  const solarTerms = PreciseSolarTermCalculator.calculateYearSolarTerms(year);
  return solarTerms[2].date; // 立春是第3个节气（索引2）
}

// 导出原getSolarTermMonth的别名，保持兼容性
export { getSolarTermMonthFromDate as getSolarTermMonthByDate };