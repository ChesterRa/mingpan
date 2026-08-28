/**
 * 體用計算器
 * 
 * 體用判定：
 * - 動爻所在卦為「用」
 * - 另一卦為「體」
 * 
 * 五行生剋關係：
 * - 體生用：洩（體氣外洩，不利）
 * - 用生體：生（得助，有利）
 * - 體剋用：耗（耗費精力，小利）
 * - 用剋體：剋（受制，不利）
 * - 體用同：比和（平穩）
 */

import { WuXing, TiYongRelation, TiYongAnalysis } from '../types';

/** 五行相生關係（A 生 B） */
const WUXING_SHENG: Record<WuXing, WuXing> = {
  '木': '火',
  '火': '土',
  '土': '金',
  '金': '水',
  '水': '木',
};

/** 五行相剋關係（A 剋 B） */
const WUXING_KE: Record<WuXing, WuXing> = {
  '木': '土',
  '土': '水',
  '水': '火',
  '火': '金',
  '金': '木',
};

export class TiyongCalculator {
  /**
   * 計算體用關係
   * 
   * @param upperWuXing 上卦五行
   * @param lowerWuXing 下卦五行
   * @param movingYao 動爻位置（1-6）
   */
  static calculate(
    upperWuXing: WuXing,
    lowerWuXing: WuXing,
    movingYao: number
  ): TiYongAnalysis {
    // 判定體用：動爻在下卦（1-3）則下卦為用，動爻在上卦（4-6）則上卦為用
    const isMovingInLower = movingYao <= 3;
    
    const tiGua: 'upper' | 'lower' = isMovingInLower ? 'upper' : 'lower';
    const yongGua: 'upper' | 'lower' = isMovingInLower ? 'lower' : 'upper';
    
    const tiWuXing = tiGua === 'upper' ? upperWuXing : lowerWuXing;
    const yongWuXing = yongGua === 'upper' ? upperWuXing : lowerWuXing;
    
    // 計算五行關係
    const relation = this.getRelation(tiWuXing, yongWuXing);
    const description = this.getDescription(tiWuXing, yongWuXing, relation);
    
    return {
      tiGua,
      yongGua,
      tiWuXing,
      yongWuXing,
      relation,
      description,
    };
  }
  
  /**
   * 獲取體用關係
   */
  private static getRelation(tiWuXing: WuXing, yongWuXing: WuXing): TiYongRelation {
    if (tiWuXing === yongWuXing) {
      return '比和';
    }
    
    // 用生體
    if (WUXING_SHENG[yongWuXing] === tiWuXing) {
      return '生';
    }
    
    // 體生用（洩）
    if (WUXING_SHENG[tiWuXing] === yongWuXing) {
      return '洩';
    }
    
    // 用剋體
    if (WUXING_KE[yongWuXing] === tiWuXing) {
      return '剋';
    }
    
    // 體剋用（耗）
    if (WUXING_KE[tiWuXing] === yongWuXing) {
      return '耗';
    }
    
    return '比和'; // fallback
  }
  
  /**
   * 獲取關係描述
   */
  private static getDescription(
    tiWuXing: WuXing,
    yongWuXing: WuXing,
    relation: TiYongRelation
  ): string {
    // 只輸出確定性的生剋關係，吉凶判斷屬解讀層（AI 職責）
    switch (relation) {
      case '生':
        return `${yongWuXing}生${tiWuXing}，用生體`;
      case '洩':
        return `${tiWuXing}生${yongWuXing}，體生用`;
      case '剋':
        return `${yongWuXing}剋${tiWuXing}，用剋體`;
      case '耗':
        return `${tiWuXing}剋${yongWuXing}，體剋用`;
      case '比和':
        return `${tiWuXing}與${yongWuXing}比和`;
    }
  }
}
