/**
 * 局数计算器
 * 根据节气和置闰法确定阴阳遁和局数
 */

import type { DiZhi, GongWei, JuShu, TianGan, YinYangDun, YuanType, ZhiRunMethod } from '../types';
import {
  JIEQI_JU_MAP,
  JIA_ZI_60,
  getYuanIndex,
} from '../data/constants';
import { DI_ZHI_YUAN_MAP } from './PanTypeCalculator';

export interface JuShuResult {
  /** 阴阳遁 */
  yinYangDun: YinYangDun;
  /** 局数 (1-9) */
  juShu: JuShu;
  /** 上中下元 */
  yuan: YuanType;
}

/**
 * 局数计算器
 */
export class JuShuCalculator {
  /**
   * 计算局数
   * @param jieQi 当前节气名称
   * @param dayGanZhi 日干支
   * @param method 置闰方法
   * @param jieQiDate 节气开始日期 (茅山法需要)
   * @param currentDate 当前日期 (茅山法需要)
   */
  static calculate(
    jieQi: string,
    dayGanZhi: string,
    method: ZhiRunMethod,
    jieQiDate?: Date,
    currentDate?: Date
  ): JuShuResult {
    // 获取节气对应的阴阳遁和局数表
    const jieQiInfo = JIEQI_JU_MAP[jieQi];
    if (!jieQiInfo) {
      throw new Error(`未知节气: ${jieQi}`);
    }

    const { dun, ju } = jieQiInfo;
    const yinYangDun: YinYangDun = dun;

    // 根据置闰方法计算元
    let yuan: YuanType;
    if (method === 'chaibu') {
      yuan = this.calculateYuanChaibu(dayGanZhi);
    } else {
      yuan = this.calculateYuanMaoshan(jieQiDate!, currentDate!);
    }

    // 根据元获取对应局数
    const yuanIdx = getYuanIndex(yuan);
    const juShu = ju[yuanIdx];

    return {
      yinYangDun,
      juShu,
      yuan,
    };
  }

  /**
   * 拆补法计算上中下元
   * 根据日干支的符头（五日一元，元首为甲日或己日）确定上中下元
   *
   * 原理：
   * - 六十甲子按五日一组，各组首日（甲/己日）为符头
   * - 符头地支为四仲（子午卯酉）者为上元：甲子、甲午、己卯、己酉
   * - 符头地支为四孟（寅申巳亥）者为中元：甲寅、甲申、己巳、己亥
   * - 符头地支为四季（辰戌丑未）者为下元：甲辰、甲戌、己丑、己未
   * - 节气内十五天被三元「拆开补齐」，故称拆补法
   *
   * 参照：kentang2017/kinqimen findyuen_dict（MIT）、《神奇之门》
   */
  private static calculateYuanChaibu(dayGanZhi: string): YuanType {
    const idx = JIA_ZI_60.indexOf(dayGanZhi);
    if (idx === -1) {
      throw new Error(`无效的日干支: ${dayGanZhi}`);
    }
    const fuTou = JIA_ZI_60[idx - (idx % 5)];
    return DI_ZHI_YUAN_MAP[fuTou.charAt(1) as DiZhi];
  }

  /**
   * 茅山法计算上中下元
   * 根据节气交节后的天数确定
   *
   * 原理：
   * - 节气交节后 1-5 天为上元
   * - 节气交节后 6-10 天为中元
   * - 节气交节后 11-15 天为下元
   */
  private static calculateYuanMaoshan(jieQiDate: Date, currentDate: Date): YuanType {
    // 使用 UTC 日期避免时区和时间精度问题
    const jieQiDay = Date.UTC(jieQiDate.getUTCFullYear(), jieQiDate.getUTCMonth(), jieQiDate.getUTCDate());
    const currentDay = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate());

    const diffDays = Math.floor((currentDay - jieQiDay) / (1000 * 60 * 60 * 24)) + 1; // 交节当天算第1天

    // 处理边界情况
    if (diffDays < 1) {
      return '上元'; // 节气当天之前，默认上元
    } else if (diffDays <= 5) {
      return '上元';
    } else if (diffDays <= 10) {
      return '中元';
    } else {
      return '下元';
    }
  }

  /**
   * 根据日干支获取其在六十甲子中的索引
   */
  static getGanZhiIndex(ganZhi: string): number {
    return JIA_ZI_60.indexOf(ganZhi);
  }

  /**
   * 判断是否为阳遁
   */
  static isYangDun(yinYangDun: YinYangDun): boolean {
    return yinYangDun === '阳遁';
  }
}
