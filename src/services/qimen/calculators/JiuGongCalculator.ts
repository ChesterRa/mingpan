/**
 * 九宫计算器
 * 计算地盘布局（三奇六仪在九宫中的分布）
 */

import type { GongWei, JuShu, TianGan, YinYangDun } from '../types';
import {
  SAN_QI_LIU_YI,
  ZHONG_GONG_JI,
} from '../data/constants';

export interface DiPanResult {
  /** 各宫地盘干 (宫位 -> 干) */
  gongGan: Record<GongWei, TianGan>;
  /** 干找宫位映射 (干 -> 宫位) */
  ganGong: Record<TianGan, GongWei>;
}

/**
 * 九宫计算器
 * 负责计算地盘布局（三奇六仪的分布）
 */
export class JiuGongCalculator {
  /**
   * 计算地盘布局
   * @param juShu 局数 (1-9)
   * @param yinYangDun 阴阳遁
   * @returns 地盘各宫的干
   *
   * 原理：
   * - 阳遁：从局数对应的宫位开始，按宫位数字顺序（1→2→…→9→1）顺布戊己庚辛壬癸丁丙乙
   * - 阴遁：从局数对应的宫位开始，按宫位数字逆序（1→9→…→2→1）顺布戊己庚辛壬癸丁丙乙
   * - 落入中五宫的干寄坤二宫（查询时换算，显示时仍在中宫）
   *
   * 例如阳遁一局：戊-坎1, 己-坤2, 庚-震3, 辛-巽4, 壬-中5(寄坤2), 癸-乾6, 丁-兑7, 丙-艮8, 乙-离9
   * 例如阴遁九局：戊-离9, 己-艮8, 庚-兑7, 辛-乾6, 壬-中5(寄坤2), 癸-巽4, 丁-震3, 丙-坤2, 乙-坎1
   *
   * 参照：《神奇之门》、kentang2017/kinqimen pan_earth（MIT）
   */
  static calculate(juShu: JuShu, yinYangDun: YinYangDun): DiPanResult {
    const isYang = yinYangDun === '阳遁';
    const gongGan: Record<GongWei, TianGan> = {} as Record<GongWei, TianGan>;
    const ganGong: Record<TianGan, GongWei> = {} as Record<TianGan, GongWei>;

    // 起始宫位就是局数
    const startGong: number = juShu;

    // 遍历九个干（三奇六仪），按宫位数字飞布
    for (let i = 0; i < 9; i++) {
      const gan = SAN_QI_LIU_YI[i];
      const offset = isYang ? i : -i;
      const gong = (((startGong - 1 + offset) % 9) + 9) % 9 + 1;
      gongGan[gong as GongWei] = gan;
      ganGong[gan] = gong as GongWei;
    }

    return { gongGan, ganGong };
  }

  /**
   * 根据天干找落宫
   * @param diPan 地盘信息
   * @param gan 要查找的天干
   * @returns 该天干所在的宫位
   */
  static findGongByGan(ganGong: Record<TianGan, GongWei>, gan: TianGan): GongWei {
    const gong = ganGong[gan];
    // 如果在中宫，返回寄宫
    return gong === 5 ? ZHONG_GONG_JI : gong;
  }

  /**
   * 根据宫位找天干
   * @param gongGan 地盘各宫的干
   * @param gong 宫位
   * @returns 该宫位的天干
   */
  static findGanByGong(gongGan: Record<GongWei, TianGan>, gong: GongWei): TianGan {
    return gongGan[gong];
  }
}
