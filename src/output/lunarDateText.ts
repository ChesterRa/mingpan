import { Solar } from 'lunar-javascript';
import { EARTHLY_BRANCHES, HOUR_TO_INDEX } from '../services/ziwei/types';
import type { WallParts } from '../utils/wallTime';

export const LUNAR_MONTH_NAMES = [
  '', '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '臘月',
];

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

export function getLunarDayName(day: number): string {
  return LUNAR_DAY_NAMES[day - 1];
}

export function formatLunarBirthday({ year, month, day, hour }: Pick<WallParts, 'year' | 'month' | 'day' | 'hour'>): string {
  try {
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    const lunarMonth = lunar.getMonth();
    const monthNumber = Math.abs(lunarMonth);
    const monthName = LUNAR_MONTH_NAMES[monthNumber] || `${monthNumber}月`;
    const leapPrefix = lunarMonth < 0 ? '閏' : '';
    const dayName = getLunarDayName(lunar.getDay());
    const hourBranch = EARTHLY_BRANCHES[HOUR_TO_INDEX[hour]];
    const shichen = hourBranch ? `${hourBranch}時` : '未知時';
    return `${lunar.getYearInGanZhi()}年${leapPrefix}${monthName}${dayName}${shichen}`;
  } catch {
    return '';
  }
}
