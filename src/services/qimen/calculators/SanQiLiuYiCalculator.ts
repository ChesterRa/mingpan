/**
 * 三奇六仪计算器
 * 计算飞盘式天盘布局
 */

import type { GongWei, TianGan, YinYangDun } from '../types';
import {
  SAN_QI_LIU_YI,
  ZHONG_GONG_JI,
  getXunShou,
  getLiuYiGan,
} from '../data/constants';

export interface TianPanResult {
  /** 各宫天盘干 (宫位 -> 干) */
  gongGan: Record<GongWei, TianGan>;
  /** 干找宫位映射 (干 -> 宫位) */
  ganGong: Record<TianGan, GongWei>;
}

/**
 * 三奇六仪计算器
 * 负责计算飞盘式天盘布局
 */
export class SanQiLiuYiCalculator {
  /**
   * 计算飞盘式天盘布局
   * @param diPanGanGong 地盘干->宫位映射
   * @param refGanZhi 参考干支（时盘为时干支，余类推）
   * @param yinYangDun 阴阳遁
   * @returns 天盘各宫的干
   *
   * 原理（飞盘式）：
   * 1. 值符随时干：旬首六仪飞到参考干（甲用旬首仪）所在的地盘宫
   * 2. 其余八干按 戊己庚辛壬癸丁丙乙 的循环顺序（自旬首仪起），
   *    按宫位数字顺序（1→2→…→9→1）飞布，阳遁顺飞、阴遁逆飞
   * 3. 落入中五宫之干寄坤二宫（查询时换算，显示时仍在中宫）
   */
  static calculate(
    diPanGanGong: Record<TianGan, GongWei>,
    refGanZhi: string,
    yinYangDun: YinYangDun
  ): TianPanResult {
    const isYang = yinYangDun === '阳遁';
    const refGan = refGanZhi.charAt(0) as TianGan;

    // 参考干对应的遁甲干（甲遁于旬首六仪之下）
    const refDunGan = this.getDunGan(refGan, refGanZhi);

    // 起点宫 = 参考干（遁干）在地盘的落宫（中五寄坤二）
    let startGong = diPanGanGong[refDunGan];
    if (startGong === 5) {
      startGong = ZHONG_GONG_JI;
    }

    // 飞布序列：自旬首仪起，按戊己庚辛壬癸丁丙乙循环
    const xunShou = getXunShou(refGanZhi);
    const fuGan = getLiuYiGan(xunShou);
    const fuIdx = SAN_QI_LIU_YI.indexOf(fuGan);
    const flyOrder = SAN_QI_LIU_YI.slice(fuIdx).concat(SAN_QI_LIU_YI.slice(0, fuIdx));

    const gongGan: Record<GongWei, TianGan> = {} as Record<GongWei, TianGan>;
    const ganGong: Record<TianGan, GongWei> = {} as Record<TianGan, GongWei>;

    for (let i = 0; i < 9; i++) {
      const gan = flyOrder[i];
      const offset = isYang ? i : -i;
      const gong = (((startGong - 1 + offset) % 9) + 9) % 9 + 1;
      gongGan[gong as GongWei] = gan;
      ganGong[gan] = gong as GongWei;
    }

    return { gongGan, ganGong };
  }

  /**
   * 获取遁甲干
   * 甲遁于六仪之下，需要根据干支确定
   */
  private static getDunGan(refGan: TianGan, refGanZhi: string): TianGan {
    if (refGan !== '甲') {
      return refGan;
    }

    const xunShou = getXunShou(refGanZhi);
    return getLiuYiGan(xunShou);
  }

  /**
   * 根据天干找天盘落宫
   */
  static findGongByGan(ganGong: Record<TianGan, GongWei>, gan: TianGan): GongWei {
    const gong = ganGong[gan];
    return gong === 5 ? ZHONG_GONG_JI : gong;
  }
}
