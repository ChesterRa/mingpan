/**
 * 八门计算器（飞盘式）
 * 计算八门在九宫中的飞布
 */

import type { BaMen, GongWei, YinYangDun } from '../types';
import {
  BA_MEN_GONG,
  BA_MEN_ORDER,
  JIA_ZI_60,
  ZHONG_GONG_JI,
} from '../data/constants';

export interface BaMenResult {
  /** 各宫八门 (宫位 -> 门) */
  gongMen: Record<GongWei, BaMen>;
  /** 值使门 */
  zhiShiMen: BaMen;
  /** 值使门原始宫位 */
  zhiShiGong: GongWei;
  /** 值使门落宫 */
  zhiShiLuoGong: GongWei;
}

/**
 * 八门计算器（飞盘式）
 * 负责计算八门的飞布
 */
export class BaMenCalculator {
  /**
   * 计算飞盘式八门布局
   * @param zhiFuGong 值符星原始宫位（旬首遁干在地盘的宫位，值使门原始宫与其相同）
   * @param refGanZhi 参考干支（时盘为时干支，余类推）
   * @param yinYangDun 阴阳遁
   * @returns 八门布局
   *
   * 原理（飞盘式）：
   * 1. 值使门 = 值符星原始宫对应的门（中五宫寄坤二取死门）
   * 2. 值使门落宫：从值符原始宫起，按参考干支的旬内序数（甲为0），
   *    阳遁顺数宫位数字（1→2→…→9→1）、阴遁逆数；落中五宫寄坤二
   * 3. 其余七门按八门原始序（休生伤杜景死惊开）自值使门起，
   *    按宫位数字顺序飞布（跳过中五宫），阳遁顺飞、阴遁逆飞
   */
  static calculate(
    zhiFuGong: GongWei,
    refGanZhi: string,
    yinYangDun: YinYangDun
  ): BaMenResult {
    const isYang = yinYangDun === '阳遁';

    // 1. 确定值使门（值符原始宫对应的门）
    const zhiShiMen = this.getMenByGong(zhiFuGong);
    const zhiShiGong = BA_MEN_GONG[zhiShiMen];

    // 2. 旬内序数：甲为0，乙为1，……癸为9
    const idx = JIA_ZI_60.indexOf(refGanZhi);
    if (idx === -1) {
      throw new Error(`无效的干支: ${refGanZhi}`);
    }
    const steps = idx % 10;

    // 3. 值使门落宫（宫位数字顺逆数，落中五寄坤二）
    const anchor = zhiShiGong === 5 ? ZHONG_GONG_JI : zhiShiGong;
    let luoGong = (((anchor - 1 + (isYang ? steps : -steps)) % 9) + 9) % 9 + 1;
    if (luoGong === 5) {
      luoGong = ZHONG_GONG_JI;
    }

    // 4. 飞布序列：自值使门起，按八门原始序循环；飞宫序列跳过中五
    const zhiShiIdx = BA_MEN_ORDER.indexOf(zhiShiMen);
    const flyOrder = BA_MEN_ORDER.slice(zhiShiIdx).concat(BA_MEN_ORDER.slice(0, zhiShiIdx));
    const FLY_PALACES: GongWei[] = [1, 2, 3, 4, 6, 7, 8, 9];

    const startIdx = FLY_PALACES.indexOf(luoGong as GongWei);
    const gongMen: Record<GongWei, BaMen> = {} as Record<GongWei, BaMen>;
    for (let i = 0; i < 8; i++) {
      const gongIdx = isYang
        ? (startIdx + i) % 8
        : ((startIdx - i) % 8 + 8) % 8;
      gongMen[FLY_PALACES[gongIdx]] = flyOrder[i];
    }

    // 中宫寄坤二，使用坤二的门
    gongMen[5] = gongMen[ZHONG_GONG_JI];

    return {
      gongMen,
      zhiShiMen,
      zhiShiGong,
      zhiShiLuoGong: luoGong as GongWei,
    };
  }

  /**
   * 根据宫位获取原始门
   */
  private static getMenByGong(gong: GongWei): BaMen {
    // 中宫无门，寄坤二
    const actualGong = gong === 5 ? ZHONG_GONG_JI : gong;

    for (const [men, menGong] of Object.entries(BA_MEN_GONG)) {
      if (menGong === actualGong) {
        return men as BaMen;
      }
    }

    return '死'; // 坤二宫默认死门
  }

  /**
   * 根据宫位找门
   */
  static findMenByGong(gongMen: Record<GongWei, BaMen>, gong: GongWei): BaMen {
    return gongMen[gong === 5 ? ZHONG_GONG_JI : gong];
  }
}
