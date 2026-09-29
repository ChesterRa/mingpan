/**
 * 八宮卦數據
 * 
 * 京房易學體系：
 * - 八宮：乾、兌、離、震、巽、坎、艮、坤
 * - 每宮八卦：本宮卦、一世、二世、三世、四世、五世、遊魂、歸魂
 * - 世應規則：本宮卦世在六爻，一世世在初爻，依次類推
 * 
 * 數據來源：京房納甲體系標準口徑
 */

import { BaGua, WuXing, DiZhi } from '../types';

// ============================================
// 八卦基礎數據
// ============================================

/**
 * 八卦整數編碼（陽=1，陰=0）：下爻*4 + 中爻*2 + 上爻*1。
 * bit 2 是下爻，bit 0 是上爻；二進制字面量從左到右依次為下、中、上爻。
 * 例如震「陽陰陰」= 0b100，艮「陰陰陽」= 0b001。
 * 此值是爻位編碼，不是乾1、兌2等先天卦數。
 * 必須與 NajiaCalculator.getGuaFromYaoValues 的權重一致。
 */
export const BAGUA_BINARY: Record<BaGua, number> = {
  '坤': 0b000,  // ☷ 阴阴阴 = 0
  '艮': 0b001,  // ☶ 阴阴阳 = 1 (上爻阳)
  '坎': 0b010,  // ☵ 阴阳阴 = 2
  '巽': 0b011,  // ☴ 阴阳阳 = 3
  '震': 0b100,  // ☳ 阳阴阴 = 4 (下爻阳)
  '離': 0b101,  // ☲ 阳阴阳 = 5
  '兌': 0b110,  // ☱ 阳阳阴 = 6
  '乾': 0b111,  // ☰ 阳阳阳 = 7
};

/** 
 * 二進制值對應的八卦
 * 
 * 計算方式：下爻*4 + 中爻*2 + 上爻*1（與上表相同）。
 */
export const BINARY_TO_BAGUA: Record<number, BaGua> = {
  0b000: '坤',
  0b001: '艮',
  0b010: '坎',
  0b011: '巽',
  0b100: '震',
  0b101: '離',
  0b110: '兌',
  0b111: '乾',
};

/** 八卦五行 */
export const BAGUA_WUXING: Record<BaGua, WuXing> = {
  '乾': '金',
  '兌': '金',
  '離': '火',
  '震': '木',
  '巽': '木',
  '坎': '水',
  '艮': '土',
  '坤': '土',
};

/** 八卦符號 */
export const BAGUA_SYMBOL: Record<BaGua, string> = {
  '乾': '☰',
  '兌': '☱',
  '離': '☲',
  '震': '☳',
  '巽': '☴',
  '坎': '☵',
  '艮': '☶',
  '坤': '☷',
};

// ============================================
// 六十四卦數據
// ============================================

export interface Gua64Info {
  /** 卦名 */
  name: string;
  /** 上卦 */
  upper: BaGua;
  /** 下卦 */
  lower: BaGua;
  /** 所屬卦宮 */
  gong: BaGua;
  /** 卦序（1-8：本宮、一世、二世、三世、四世、五世、遊魂、歸魂） */
  guaXu: number;
  /** 世爻位置（1-6） */
  shiYao: number;
  /** 應爻位置（1-6） */
  yingYao: number;
}

/**
 * 六十四卦完整數據
 * key = 上卦二進制 * 8 + 下卦二進制
 */
export const GUA64_DATA: Record<number, Gua64Info> = {
  // ============================================
  // 乾宮八卦
  // ============================================
  // 乾為天（本宮卦）
  [0b111111]: { name: '乾為天', upper: '乾', lower: '乾', gong: '乾', guaXu: 1, shiYao: 6, yingYao: 3 },
  // 天風姤（一世）
  [0b111011]: { name: '天風姤', upper: '乾', lower: '巽', gong: '乾', guaXu: 2, shiYao: 1, yingYao: 4 },
  // 天山遯（二世）
  [0b111001]: { name: '天山遯', upper: '乾', lower: '艮', gong: '乾', guaXu: 3, shiYao: 2, yingYao: 5 },
  // 天地否（三世）
  [0b111000]: { name: '天地否', upper: '乾', lower: '坤', gong: '乾', guaXu: 4, shiYao: 3, yingYao: 6 },
  // 風地觀（四世）
  [0b011000]: { name: '風地觀', upper: '巽', lower: '坤', gong: '乾', guaXu: 5, shiYao: 4, yingYao: 1 },
  // 山地剝（五世）
  [0b001000]: { name: '山地剝', upper: '艮', lower: '坤', gong: '乾', guaXu: 6, shiYao: 5, yingYao: 2 },
  // 火地晉（遊魂）
  [0b101000]: { name: '火地晉', upper: '離', lower: '坤', gong: '乾', guaXu: 7, shiYao: 4, yingYao: 1 },
  // 火天大有（歸魂）
  [0b101111]: { name: '火天大有', upper: '離', lower: '乾', gong: '乾', guaXu: 8, shiYao: 3, yingYao: 6 },

  // ============================================
  // 兌宮八卦
  // ============================================
  // 兌為澤（本宮卦）
  [0b110110]: { name: '兌為澤', upper: '兌', lower: '兌', gong: '兌', guaXu: 1, shiYao: 6, yingYao: 3 },
  // 澤水困（一世）
  [0b110010]: { name: '澤水困', upper: '兌', lower: '坎', gong: '兌', guaXu: 2, shiYao: 1, yingYao: 4 },
  // 澤地萃（二世）
  [0b110000]: { name: '澤地萃', upper: '兌', lower: '坤', gong: '兌', guaXu: 3, shiYao: 2, yingYao: 5 },
  // 澤山咸（三世）
  [0b110001]: { name: '澤山咸', upper: '兌', lower: '艮', gong: '兌', guaXu: 4, shiYao: 3, yingYao: 6 },
  // 水山蹇（四世）
  [0b010001]: { name: '水山蹇', upper: '坎', lower: '艮', gong: '兌', guaXu: 5, shiYao: 4, yingYao: 1 },
  // 地山謙（五世）
  [0b000001]: { name: '地山謙', upper: '坤', lower: '艮', gong: '兌', guaXu: 6, shiYao: 5, yingYao: 2 },
  // 雷山小過（遊魂）
  [0b100001]: { name: '雷山小過', upper: '震', lower: '艮', gong: '兌', guaXu: 7, shiYao: 4, yingYao: 1 },
  // 雷澤歸妹（歸魂）
  [0b100110]: { name: '雷澤歸妹', upper: '震', lower: '兌', gong: '兌', guaXu: 8, shiYao: 3, yingYao: 6 },

  // ============================================
  // 離宮八卦
  // ============================================
  // 離為火（本宮卦）
  [0b101101]: { name: '離為火', upper: '離', lower: '離', gong: '離', guaXu: 1, shiYao: 6, yingYao: 3 },
  // 火山旅（一世）
  [0b101001]: { name: '火山旅', upper: '離', lower: '艮', gong: '離', guaXu: 2, shiYao: 1, yingYao: 4 },
  // 火風鼎（二世）
  [0b101011]: { name: '火風鼎', upper: '離', lower: '巽', gong: '離', guaXu: 3, shiYao: 2, yingYao: 5 },
  // 火水未濟（三世）
  [0b101010]: { name: '火水未濟', upper: '離', lower: '坎', gong: '離', guaXu: 4, shiYao: 3, yingYao: 6 },
  // 山水蒙（四世）
  [0b001010]: { name: '山水蒙', upper: '艮', lower: '坎', gong: '離', guaXu: 5, shiYao: 4, yingYao: 1 },
  // 風水渙（五世）
  [0b011010]: { name: '風水渙', upper: '巽', lower: '坎', gong: '離', guaXu: 6, shiYao: 5, yingYao: 2 },
  // 天水訟（遊魂）
  [0b111010]: { name: '天水訟', upper: '乾', lower: '坎', gong: '離', guaXu: 7, shiYao: 4, yingYao: 1 },
  // 天火同人（歸魂）
  [0b111101]: { name: '天火同人', upper: '乾', lower: '離', gong: '離', guaXu: 8, shiYao: 3, yingYao: 6 },

  // ============================================
  // 震宮八卦
  // ============================================
  // 震為雷（本宮卦）
  [0b100100]: { name: '震為雷', upper: '震', lower: '震', gong: '震', guaXu: 1, shiYao: 6, yingYao: 3 },
  // 雷地豫（一世）
  [0b100000]: { name: '雷地豫', upper: '震', lower: '坤', gong: '震', guaXu: 2, shiYao: 1, yingYao: 4 },
  // 雷水解（二世）
  [0b100010]: { name: '雷水解', upper: '震', lower: '坎', gong: '震', guaXu: 3, shiYao: 2, yingYao: 5 },
  // 雷風恆（三世）
  [0b100011]: { name: '雷風恆', upper: '震', lower: '巽', gong: '震', guaXu: 4, shiYao: 3, yingYao: 6 },
  // 地風升（四世）
  [0b000011]: { name: '地風升', upper: '坤', lower: '巽', gong: '震', guaXu: 5, shiYao: 4, yingYao: 1 },
  // 水風井（五世）
  [0b010011]: { name: '水風井', upper: '坎', lower: '巽', gong: '震', guaXu: 6, shiYao: 5, yingYao: 2 },
  // 澤風大過（遊魂）
  [0b110011]: { name: '澤風大過', upper: '兌', lower: '巽', gong: '震', guaXu: 7, shiYao: 4, yingYao: 1 },
  // 澤雷隨（歸魂）
  [0b110100]: { name: '澤雷隨', upper: '兌', lower: '震', gong: '震', guaXu: 8, shiYao: 3, yingYao: 6 },

  // ============================================
  // 巽宮八卦
  // ============================================
  // 巽為風（本宮卦）
  [0b011011]: { name: '巽為風', upper: '巽', lower: '巽', gong: '巽', guaXu: 1, shiYao: 6, yingYao: 3 },
  // 風天小畜（一世）
  [0b011111]: { name: '風天小畜', upper: '巽', lower: '乾', gong: '巽', guaXu: 2, shiYao: 1, yingYao: 4 },
  // 風火家人（二世）
  [0b011101]: { name: '風火家人', upper: '巽', lower: '離', gong: '巽', guaXu: 3, shiYao: 2, yingYao: 5 },
  // 風雷益（三世）
  [0b011100]: { name: '風雷益', upper: '巽', lower: '震', gong: '巽', guaXu: 4, shiYao: 3, yingYao: 6 },
  // 天雷無妄（四世）
  [0b111100]: { name: '天雷無妄', upper: '乾', lower: '震', gong: '巽', guaXu: 5, shiYao: 4, yingYao: 1 },
  // 火雷噬嗑（五世）
  [0b101100]: { name: '火雷噬嗑', upper: '離', lower: '震', gong: '巽', guaXu: 6, shiYao: 5, yingYao: 2 },
  // 山雷頤（遊魂）
  [0b001100]: { name: '山雷頤', upper: '艮', lower: '震', gong: '巽', guaXu: 7, shiYao: 4, yingYao: 1 },
  // 山風蠱（歸魂）
  [0b001011]: { name: '山風蠱', upper: '艮', lower: '巽', gong: '巽', guaXu: 8, shiYao: 3, yingYao: 6 },

  // ============================================
  // 坎宮八卦
  // ============================================
  // 坎為水（本宮卦）
  [0b010010]: { name: '坎為水', upper: '坎', lower: '坎', gong: '坎', guaXu: 1, shiYao: 6, yingYao: 3 },
  // 水澤節（一世）
  [0b010110]: { name: '水澤節', upper: '坎', lower: '兌', gong: '坎', guaXu: 2, shiYao: 1, yingYao: 4 },
  // 水雷屯（二世）
  [0b010100]: { name: '水雷屯', upper: '坎', lower: '震', gong: '坎', guaXu: 3, shiYao: 2, yingYao: 5 },
  // 水火既濟（三世）
  [0b010101]: { name: '水火既濟', upper: '坎', lower: '離', gong: '坎', guaXu: 4, shiYao: 3, yingYao: 6 },
  // 澤火革（四世）
  [0b110101]: { name: '澤火革', upper: '兌', lower: '離', gong: '坎', guaXu: 5, shiYao: 4, yingYao: 1 },
  // 雷火豐（五世）
  [0b100101]: { name: '雷火豐', upper: '震', lower: '離', gong: '坎', guaXu: 6, shiYao: 5, yingYao: 2 },
  // 地火明夷（遊魂）
  [0b000101]: { name: '地火明夷', upper: '坤', lower: '離', gong: '坎', guaXu: 7, shiYao: 4, yingYao: 1 },
  // 地水師（歸魂）
  [0b000010]: { name: '地水師', upper: '坤', lower: '坎', gong: '坎', guaXu: 8, shiYao: 3, yingYao: 6 },

  // ============================================
  // 艮宮八卦
  // ============================================
  // 艮為山（本宮卦）
  [0b001001]: { name: '艮為山', upper: '艮', lower: '艮', gong: '艮', guaXu: 1, shiYao: 6, yingYao: 3 },
  // 山火賁（一世）
  [0b001101]: { name: '山火賁', upper: '艮', lower: '離', gong: '艮', guaXu: 2, shiYao: 1, yingYao: 4 },
  // 山天大畜（二世）
  [0b001111]: { name: '山天大畜', upper: '艮', lower: '乾', gong: '艮', guaXu: 3, shiYao: 2, yingYao: 5 },
  // 山澤損（三世）
  [0b001110]: { name: '山澤損', upper: '艮', lower: '兌', gong: '艮', guaXu: 4, shiYao: 3, yingYao: 6 },
  // 火澤睽（四世）
  [0b101110]: { name: '火澤睽', upper: '離', lower: '兌', gong: '艮', guaXu: 5, shiYao: 4, yingYao: 1 },
  // 天澤履（五世）
  [0b111110]: { name: '天澤履', upper: '乾', lower: '兌', gong: '艮', guaXu: 6, shiYao: 5, yingYao: 2 },
  // 風澤中孚（遊魂）
  [0b011110]: { name: '風澤中孚', upper: '巽', lower: '兌', gong: '艮', guaXu: 7, shiYao: 4, yingYao: 1 },
  // 風山漸（歸魂）
  [0b011001]: { name: '風山漸', upper: '巽', lower: '艮', gong: '艮', guaXu: 8, shiYao: 3, yingYao: 6 },

  // ============================================
  // 坤宮八卦
  // ============================================
  // 坤為地（本宮卦）
  [0b000000]: { name: '坤為地', upper: '坤', lower: '坤', gong: '坤', guaXu: 1, shiYao: 6, yingYao: 3 },
  // 地雷復（一世）
  [0b000100]: { name: '地雷復', upper: '坤', lower: '震', gong: '坤', guaXu: 2, shiYao: 1, yingYao: 4 },
  // 地澤臨（二世）
  [0b000110]: { name: '地澤臨', upper: '坤', lower: '兌', gong: '坤', guaXu: 3, shiYao: 2, yingYao: 5 },
  // 地天泰（三世）
  [0b000111]: { name: '地天泰', upper: '坤', lower: '乾', gong: '坤', guaXu: 4, shiYao: 3, yingYao: 6 },
  // 雷天大壯（四世）
  [0b100111]: { name: '雷天大壯', upper: '震', lower: '乾', gong: '坤', guaXu: 5, shiYao: 4, yingYao: 1 },
  // 澤天夬（五世）
  [0b110111]: { name: '澤天夬', upper: '兌', lower: '乾', gong: '坤', guaXu: 6, shiYao: 5, yingYao: 2 },
  // 水天需（遊魂）
  [0b010111]: { name: '水天需', upper: '坎', lower: '乾', gong: '坤', guaXu: 7, shiYao: 4, yingYao: 1 },
  // 水地比（歸魂）
  [0b010000]: { name: '水地比', upper: '坎', lower: '坤', gong: '坤', guaXu: 8, shiYao: 3, yingYao: 6 },
};

// ============================================
// 納甲數據
// ============================================

/**
 * 京房納甲表
 * 每個八卦的六爻對應的地支（自下而上：初爻到上爻）
 * 
 * 規則：
 * - 乾納甲壬，內卦子寅辰，外卦午申戌
 * - 坤納乙癸，內卦未巳卯，外卦丑亥酉
 * - 震納庚，內卦子寅辰，外卦午申戌
 * - 巽納辛，內卦丑亥酉，外卦未巳卯
 * - 坎納戊，內卦寅辰午，外卦申戌子
 * - 離納己，內卦卯丑亥，外卦酉未巳
 * - 艮納丙，內卦辰午申，外卦戌子寅
 * - 兌納丁，內卦巳卯丑，外卦亥酉未
 */
export const NAJIA_TABLE: Record<BaGua, { inner: [DiZhi, DiZhi, DiZhi]; outer: [DiZhi, DiZhi, DiZhi] }> = {
  '乾': { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  '坤': { inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'] },
  '震': { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  '巽': { inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'] },
  '坎': { inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'] },
  '離': { inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'] },
  '艮': { inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'] },
  '兌': { inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'] },
};

// ============================================
// 地支五行
// ============================================

export const DIZHI_WUXING: Record<DiZhi, WuXing> = {
  '子': '水',
  '丑': '土',
  '寅': '木',
  '卯': '木',
  '辰': '土',
  '巳': '火',
  '午': '火',
  '未': '土',
  '申': '金',
  '酉': '金',
  '戌': '土',
  '亥': '水',
};

// ============================================
// 輔助函數
// ============================================

/**
 * 根據上下卦獲取六十四卦信息
 */
export function getGua64Info(upper: BaGua, lower: BaGua): Gua64Info {
  const key = BAGUA_BINARY[upper] * 8 + BAGUA_BINARY[lower];
  return GUA64_DATA[key];
}

/**
 * 根據六爻陰陽獲取六十四卦信息
 * @param yaoYinYang 六爻陰陽數組（自下而上，true=陽，false=陰）
 */
export function getGua64InfoByYao(yaoYinYang: [boolean, boolean, boolean, boolean, boolean, boolean]): Gua64Info {
  const lowerBinary = (yaoYinYang[0] ? 4 : 0) + (yaoYinYang[1] ? 2 : 0) + (yaoYinYang[2] ? 1 : 0);
  const upperBinary = (yaoYinYang[3] ? 4 : 0) + (yaoYinYang[4] ? 2 : 0) + (yaoYinYang[5] ? 1 : 0);

  return getGua64Info(BINARY_TO_BAGUA[upperBinary], BINARY_TO_BAGUA[lowerBinary]);
}

/**
 * 獲取某爻的納甲地支
 * @param gua 所屬八卦（上卦或下卦）
 * @param position 爻位（1-3 為內卦，4-6 為外卦）
 * @param isOuter 是否為外卦
 */
export function getNaJia(gua: BaGua, positionInGua: number, isOuter: boolean): DiZhi {
  const naJiaData = NAJIA_TABLE[gua];
  const arr = isOuter ? naJiaData.outer : naJiaData.inner;
  return arr[positionInGua - 1];
}
