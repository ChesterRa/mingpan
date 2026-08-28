/**
 * 九星计算器（飞盘式）
 * 计算九星在九宫中的飞布
 */

import type { GongWei, JiuXing, YinYangDun } from '../types';
import {
  JIU_XING_GONG,
  JIU_XING_ORDER,
} from '../data/constants';

export interface JiuXingResult {
  /** 各宫九星 (宫位 -> 星) */
  gongXing: Record<GongWei, JiuXing>;
  /** 值符星 */
  zhiFuXing: JiuXing;
  /** 值符星原始宫位 */
  zhiFuGong: GongWei;
  /** 值符星落宫 */
  zhiFuLuoGong: GongWei;
}

/**
 * 九星计算器（飞盘式）
 * 负责计算九星的飞布
 */
export class JiuXingCalculator {
  /**
   * 计算飞盘式九星布局
   * @param xunShouGong 旬首遁干在地盘的宫位（值符星原始宫）
   * @param shiGanLuoGong 参考干（时干等，甲用旬首仪）的地盘落宫
   * @param yinYangDun 阴阳遁
   * @returns 九星布局
   *
   * 原理（飞盘式）：
   * 1. 值符星 = 旬首遁干原始宫对应的星（中五宫为天禽）
   * 2. 值符星随时干：飞到参考干落宫
   * 3. 其余诸星按九星原始序（蓬芮冲辅禽心柱任英，即原始宫数字序）
   *    自值符星起，按宫位数字顺序飞布，阳遁顺飞、阴遁逆飞
   */
  static calculate(
    xunShouGong: GongWei,
    shiGanLuoGong: GongWei,
    yinYangDun: YinYangDun
  ): JiuXingResult {
    const isYang = yinYangDun === '阳遁';

    // 1. 确定值符星（旬首落宫对应的星）
    const zhiFuXing = this.getXingByGong(xunShouGong);
    const zhiFuGong = JIU_XING_GONG[zhiFuXing];

    // 2. 飞布序列：自值符星起，按九星原始序循环
    const zhiFuIdx = JIU_XING_ORDER.indexOf(zhiFuXing);
    const flyOrder = JIU_XING_ORDER.slice(zhiFuIdx).concat(JIU_XING_ORDER.slice(0, zhiFuIdx));

    // 3. 从参考干落宫起飞布（阳顺阴逆，宫位数字序）
    const gongXing: Record<GongWei, JiuXing> = {} as Record<GongWei, JiuXing>;
    for (let i = 0; i < 9; i++) {
      const offset = isYang ? i : -i;
      const gong = (((shiGanLuoGong - 1 + offset) % 9) + 9) % 9 + 1;
      gongXing[gong as GongWei] = flyOrder[i];
    }

    return {
      gongXing,
      zhiFuXing,
      zhiFuGong,
      zhiFuLuoGong: shiGanLuoGong,
    };
  }

  /**
   * 根据宫位获取原始星
   */
  private static getXingByGong(gong: GongWei): JiuXing {
    for (const [xing, xingGong] of Object.entries(JIU_XING_GONG)) {
      if (xingGong === gong) {
        return xing as JiuXing;
      }
    }

    // 中宫为天禽
    if (gong === 5) {
      return '禽';
    }

    return '芮'; // 默认天芮
  }

  /**
   * 根据宫位找星
   */
  static findXingByGong(gongXing: Record<GongWei, JiuXing>, gong: GongWei): JiuXing {
    return gongXing[gong];
  }
}
