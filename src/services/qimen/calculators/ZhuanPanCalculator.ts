/**
 * 转盘式奇门计算器
 * Rotating style Qimen calculator (following《神奇之门》)
 *
 * 转盘式核心规则：
 * 1. 天盘、九星、八门是三个「物理转盘」，盘内元素相对顺序恒定不变
 * 2. 转盘环序（物理顺时针，从坎一宫起）：坎→艮→震→巽→离→坤→兑→乾
 *    - 九星环序：蓬任冲辅英芮柱心（禽寄芮，随坤二宫）
 *    - 八门环序：休生伤杜景死惊开
 * 3. 天盘干与九星同转：值符星携旬首六仪转到时干（遁干）所在的地盘宫
 * 4. 值使门随时辰飞宫：从值符原始宫起，按旬内时辰序数，
 *    阳遁顺数宫位数字（1→2→…→9→1）、阴遁逆数
 * 5. 中五宫寄坤二宫；天禽随天芮
 *
 * 参照：《神奇之门》（张志春）、kentang2017/kinqimen pan_sky/pan_star/pan_door（MIT）
 */

import type { GongWei, TianGan, DiZhi, BaMen, JiuXing, YinYangDun } from '../types';
import {
  SAN_QI_LIU_YI,
  BA_MEN_ORDER,
  BA_MEN_GONG,
  JIU_XING_GONG,
  JIA_ZI_60,
  getXunShou,
  getLiuYiGan,
  rotate,
  getRotationSteps,
  ZHONG_GONG_JI_ZHUAN,
  PHYSICAL_CLOCKWISE_ORDER,
} from '../data/constants';

// ============= 类型定义 =============

export interface ZhuanPanTianPanResult {
  gongGan: Record<GongWei, TianGan>;
  ganGong: Record<TianGan, GongWei>;
}

export interface ZhuanPanBaMenResult {
  gongMen: Record<GongWei, BaMen>;
  zhiShiMen: BaMen;
  zhiShiGong: GongWei;
  zhiShiLuoGong: GongWei;
}

export interface ZhuanPanJiuXingResult {
  gongXing: Record<GongWei, JiuXing>;
  zhiFuXing: JiuXing;
  zhiFuGong: GongWei;
  zhiFuLuoGong: GongWei;
}

/**
 * 转盘九星环序（物理顺时针，天禽寄天芮不在环上）
 * 与 PHYSICAL_CLOCKWISE_ORDER=[坎1,艮8,震3,巽4,离9,坤2,兑7,乾6] 一一对应
 */
const JIU_XING_RING: JiuXing[] = ['蓬', '任', '冲', '辅', '英', '芮', '柱', '心'];

// ============= 转盘式计算器 =============

/**
 * 转盘式奇门计算器
 * 实现《神奇之门》中的转盘式排盘法
 */
export class ZhuanPanCalculator {
  /**
   * 获取参考干（时干/日干/月干/年干）遁干后的地盘落宫
   * 甲遁于旬首六仪之下；落中五宫者寄坤二
   */
  static getShiGanLuoGong(
    diPanGanGong: Record<TianGan, GongWei>,
    ganZhi: string
  ): GongWei {
    const gan = ganZhi.charAt(0) as TianGan;
    const dunGan = this.getDunGan(gan, ganZhi);
    const gong = diPanGanGong[dunGan];
    return gong === 5 ? ZHONG_GONG_JI_ZHUAN : gong;
  }

  /**
   * 计算转盘式天盘布局
   * @param diPanGanGong 地盘干->宫位映射
   * @param ganZhi 时干支（时盘）、日干支（日盘）、月干支（月盘）或年干支（年盘）
   * @param yinYangDun 阴阳遁
   * @returns 天盘各宫的干
   *
   * 原理（转盘式刚体旋转）：
   * 1. 旬首六仪（值符所携之干）在地盘的原始宫
   * 2. 参考干（时干等，甲用旬首仪）在地盘的落宫
   * 3. 将整个地盘沿转盘环旋转，使旬首仪从原始宫转到参考干落宫
   * 4. 中五宫之干寄坤二宫随盘转动；天盘中宫显示坤二宫之干
   */
  static calculateTianPan(
    diPanGanGong: Record<TianGan, GongWei>,
    ganZhi: string,
    yinYangDun: YinYangDun
  ): ZhuanPanTianPanResult {
    const isYang = yinYangDun === '阳遁';

    const xunShou = getXunShou(ganZhi);
    const fuGan = getLiuYiGan(xunShou);

    const shiGong = this.getShiGanLuoGong(diPanGanGong, ganZhi);

    let fuGong = diPanGanGong[fuGan];
    if (fuGong === 5) {
      fuGong = ZHONG_GONG_JI_ZHUAN; // 中五寄坤二
    }

    const steps = getRotationSteps(fuGong, shiGong, isYang);

    const gongGan: Record<GongWei, TianGan> = {} as Record<GongWei, TianGan>;
    const ganGong: Record<TianGan, GongWei> = {} as Record<TianGan, GongWei>;

    // 地盘坤二宫本干与中五宫寄干（若中五有干，二者同落一宫）
    const kunGan = SAN_QI_LIU_YI.find(g => diPanGanGong[g] === 2);
    const zhongGan = SAN_QI_LIU_YI.find(g => diPanGanGong[g] === 5);

    for (const gan of SAN_QI_LIU_YI) {
      const src = diPanGanGong[gan];
      const srcActual = src === 5 ? ZHONG_GONG_JI_ZHUAN : src;
      const dst = rotate(srcActual, steps, isYang);
      ganGong[gan] = dst;
      gongGan[dst] = gan;
    }

    // 中五寄干与坤二本干同宫时，坤二本干优先显示
    if (zhongGan !== undefined && kunGan !== undefined) {
      const kunDst = ganGong[kunGan];
      gongGan[kunDst] = kunGan;
    }

    // 天盘中五宫寄坤二，显示坤二宫天盘干
    gongGan[5] = gongGan[ZHONG_GONG_JI_ZHUAN];

    return { gongGan, ganGong };
  }

  /**
   * 计算转盘式八门布局
   * @param zhiFuGong 值符星原始宫位（旬首遁干在地盘的宫位，值使门原始宫与其相同）
   * @param refGanZhi 参考干支（时盘为时干支，余类推）
   * @param yinYangDun 阴阳遁
   * @returns 八门布局
   *
   * 原理（转盘式）：
   * 1. 值使门 = 值符星原始宫位对应的门（中五宫寄坤二取死门）
   * 2. 值使门落宫：从值符原始宫起，按参考干支的旬内序数（甲为0），
   *    阳遁顺数宫位数字、阴遁逆数；落中五宫寄坤二
   * 3. 其余七门按八门环序（休生伤杜景死惊开）随盘刚体旋转
   */
  static calculateBaMen(
    zhiFuGong: GongWei,
    refGanZhi: string,
    yinYangDun: YinYangDun
  ): ZhuanPanBaMenResult {
    const isYang = yinYangDun === '阳遁';

    // 1. 确定值使门（值符原始宫对应的门）
    const zhiShiMen = this.getMenByGong(zhiFuGong);
    const zhiShiGong = BA_MEN_GONG[zhiShiMen];

    // 2. 旬内序数：甲为0，乙为1，……癸为9（时干支/日干支在其旬内的位置）
    const idx = JIA_ZI_60.indexOf(refGanZhi);
    if (idx === -1) {
      throw new Error(`无效的干支: ${refGanZhi}`);
    }
    const steps = idx % 10;

    // 3. 值使门落宫（宫位数字顺逆数，落中五寄坤二）
    const anchor = zhiShiGong === 5 ? ZHONG_GONG_JI_ZHUAN : zhiShiGong;
    let luoGong = (((anchor - 1 + (isYang ? steps : -steps)) % 9) + 9) % 9 + 1;
    if (luoGong === 5) {
      luoGong = ZHONG_GONG_JI_ZHUAN;
    }

    // 4. 八门刚体旋转：值使门从原始宫转到落宫
    const ringSteps = getRotationSteps(anchor, luoGong as GongWei, isYang);
    const gongMen: Record<GongWei, BaMen> = {} as Record<GongWei, BaMen>;
    for (let i = 0; i < 8; i++) {
      const men = BA_MEN_ORDER[i];
      const home = PHYSICAL_CLOCKWISE_ORDER[i]; // 八门原始宫与环序一一对应
      gongMen[rotate(home, ringSteps, isYang)] = men;
    }

    // 中宫寄坤二，使用坤二的门
    gongMen[5] = gongMen[ZHONG_GONG_JI_ZHUAN];

    return {
      gongMen,
      zhiShiMen,
      zhiShiGong,
      zhiShiLuoGong: luoGong as GongWei,
    };
  }

  /**
   * 计算转盘式九星布局
   * @param xunShouGong 旬首遁干在地盘的宫位（值符星原始宫）
   * @param shiGanLuoGong 参考干（时干等，甲用旬首仪）的地盘落宫
   * @param yinYangDun 阴阳遁
   * @returns 九星布局
   *
   * 原理（转盘式）：
   * 1. 值符星 = 旬首遁干原始宫对应的星（中五宫为天禽，寄坤二随天芮）
   * 2. 值符星随时干：转盘旋转使值符星从原始宫转到参考干落宫
   * 3. 其余诸星按九星环序（蓬任冲辅英芮柱心）随盘刚体旋转
   */
  static calculateJiuXing(
    xunShouGong: GongWei,
    shiGanLuoGong: GongWei,
    yinYangDun: YinYangDun
  ): ZhuanPanJiuXingResult {
    const isYang = yinYangDun === '阳遁';

    // 1. 确定值符星（旬首落宫对应的星）
    const zhiFuXing = this.getXingByGong(xunShouGong);
    const zhiFuGong = JIU_XING_GONG[zhiFuXing];

    // 天禽寄坤二，随天芮所在环位转动
    const homeSlot = xunShouGong === 5 ? ZHONG_GONG_JI_ZHUAN : xunShouGong;

    // 2. 刚体旋转：值符星原始环位转到参考干落宫
    const steps = getRotationSteps(homeSlot, shiGanLuoGong, isYang);
    const gongXing: Record<GongWei, JiuXing> = {} as Record<GongWei, JiuXing>;
    for (let i = 0; i < 8; i++) {
      const home = PHYSICAL_CLOCKWISE_ORDER[i];
      gongXing[rotate(home, steps, isYang)] = JIU_XING_RING[i];
    }

    // 天禽随天芮寄坤二，中宫显示天禽
    gongXing[5] = '禽';

    return {
      gongXing,
      zhiFuXing,
      zhiFuGong,
      zhiFuLuoGong: shiGanLuoGong,
    };
  }

  // ============= 私有辅助方法 =============

  /**
   * 获取遁甲干
   * 甲遁于六仪之下，需要根据干支确定
   */
  private static getDunGan(gan: TianGan, ganZhi: string): TianGan {
    if (gan !== '甲') {
      return gan;
    }

    // 甲时，需要找到旬首对应的六仪
    const xunShou = getXunShou(ganZhi);
    return getLiuYiGan(xunShou);
  }

  /**
   * 根据宫位获取原始门
   */
  private static getMenByGong(gong: GongWei): BaMen {
    const actualGong = gong === 5 ? ZHONG_GONG_JI_ZHUAN : gong;

    for (const [men, menGong] of Object.entries(BA_MEN_GONG)) {
      if (menGong === actualGong) {
        return men as BaMen;
      }
    }

    return '死'; // 坤二宫默认死门
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
   * 根据宫位找门
   */
  static findMenByGong(gongMen: Record<GongWei, BaMen>, gong: GongWei): BaMen {
    return gongMen[gong === 5 ? ZHONG_GONG_JI_ZHUAN : gong];
  }

  /**
   * 根据宫位找星
   */
  static findXingByGong(gongXing: Record<GongWei, JiuXing>, gong: GongWei): JiuXing {
    if (gong === 5) {
      return '禽';
    }
    return gongXing[gong];
  }

  /**
   * 根据天干找天盘落宫
   */
  static findGongByGan(ganGong: Record<TianGan, GongWei>, gan: TianGan): GongWei {
    const gong = ganGong[gan];
    return gong === 5 ? ZHONG_GONG_JI_ZHUAN : gong;
  }
}
