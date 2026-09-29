/**
 * 八卦基礎數據
 * 
 * 先天八卦數：乾1 兌2 離3 震4 巽5 坎6 艮7 坤8
 */

import { BaGuaName, WuXing, BaGuaInfo } from '../types';

/** 八卦數據表（按先天數排列，索引 0-7 對應數字 1-8） */
export const BAGUA_DATA: BaGuaInfo[] = [
  { name: '乾', symbol: '☰', wuXing: '金', number: 1 },
  { name: '兌', symbol: '☱', wuXing: '金', number: 2 },
  { name: '離', symbol: '☲', wuXing: '火', number: 3 },
  { name: '震', symbol: '☳', wuXing: '木', number: 4 },
  { name: '巽', symbol: '☴', wuXing: '木', number: 5 },
  { name: '坎', symbol: '☵', wuXing: '水', number: 6 },
  { name: '艮', symbol: '☶', wuXing: '土', number: 7 },
  { name: '坤', symbol: '☷', wuXing: '土', number: 8 },
];

/** 根據先天數獲取八卦（1-8） */
export function getBaGuaByNumber(num: number): BaGuaInfo {
  // 餘 0 取 8
  const index = num % 8 === 0 ? 7 : (num % 8) - 1;
  return BAGUA_DATA[index];
}

/** 根據卦名獲取八卦 */
export function getBaGuaByName(name: BaGuaName): BaGuaInfo {
  const gua = BAGUA_DATA.find(g => g.name === name);
  if (!gua) throw new Error(`未知八卦: ${name}`);
  return gua;
}

/** 64卦名稱表（上卦 x 下卦） */
const GUA64_NAMES: Record<string, string> = {
  '乾乾': '乾為天', '乾兌': '天澤履', '乾離': '天火同人', '乾震': '天雷無妄',
  '乾巽': '天風姤', '乾坎': '天水訟', '乾艮': '天山遯', '乾坤': '天地否',
  '兌乾': '澤天夬', '兌兌': '兌為澤', '兌離': '澤火革', '兌震': '澤雷隨',
  '兌巽': '澤風大過', '兌坎': '澤水困', '兌艮': '澤山咸', '兌坤': '澤地萃',
  '離乾': '火天大有', '離兌': '火澤睽', '離離': '離為火', '離震': '火雷噬嗑',
  '離巽': '火風鼎', '離坎': '火水未濟', '離艮': '火山旅', '離坤': '火地晉',
  '震乾': '雷天大壯', '震兌': '雷澤歸妹', '震離': '雷火豐', '震震': '震為雷',
  '震巽': '雷風恆', '震坎': '雷水解', '震艮': '雷山小過', '震坤': '雷地豫',
  '巽乾': '風天小畜', '巽兌': '風澤中孚', '巽離': '風火家人', '巽震': '風雷益',
  '巽巽': '巽為風', '巽坎': '風水渙', '巽艮': '風山漸', '巽坤': '風地觀',
  '坎乾': '水天需', '坎兌': '水澤節', '坎離': '水火既濟', '坎震': '水雷屯',
  '坎巽': '水風井', '坎坎': '坎為水', '坎艮': '水山蹇', '坎坤': '水地比',
  '艮乾': '山天大畜', '艮兌': '山澤損', '艮離': '山火賁', '艮震': '山雷頤',
  '艮巽': '山風蠱', '艮坎': '山水蒙', '艮艮': '艮為山', '艮坤': '山地剝',
  '坤乾': '地天泰', '坤兌': '地澤臨', '坤離': '地火明夷', '坤震': '地雷復',
  '坤巽': '地風升', '坤坎': '地水師', '坤艮': '地山謙', '坤坤': '坤為地',
};

/** 獲取64卦名稱 */
export function getGua64Name(upper: BaGuaName, lower: BaGuaName): string {
  const key = `${upper}${lower}`;
  return GUA64_NAMES[key] || `${upper}${lower}卦`;
}

/** 八卦爻序（自下而上：bits[0] = 初爻；true = 陽），供變卦與互卦共用。 */
export const BAGUA_BINARY: Record<BaGuaName, [boolean, boolean, boolean]> = {
  '乾': [true, true, true],    // 111
  '兌': [true, true, false],   // 110（兌上缺）
  '離': [true, false, true],   // 101
  '震': [true, false, false],  // 100（震仰盂）
  '巽': [false, true, true],   // 011（巽下斷）
  '坎': [false, true, false],  // 010
  '艮': [false, false, true],  // 001（艮覆碗）
  '坤': [false, false, false], // 000
};

/** 自下而上的三爻轉八卦；字串鍵依序為初、二、三爻。 */
export function binaryToBaGua(bits: [boolean, boolean, boolean]): BaGuaName {
  const key = bits.map(b => b ? '1' : '0').join('');
  const map: Record<string, BaGuaName> = {
    '111': '乾', '110': '兌', '101': '離', '100': '震',
    '011': '巽', '010': '坎', '001': '艮', '000': '坤',
  };
  return map[key];
}
