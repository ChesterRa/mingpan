/**
 * 梅花易數服務主類
 * 
 * 提供統一的梅花易數排盤接口
 * 
 * 設計原則：
 * - 排盤層：輸出確定性結構
 * - 斷卦層：交給 Agent/LLM
 */

import { Solar } from 'lunar-javascript';
import {
  MeihuaInput,
  MeihuaResult,
  MeihuaServiceConfig,
  GuaXiang,
  BaGuaName,
} from './types';
import { QiguaCalculator } from './calculators/QiguaCalculator';
import { HuguaCalculator } from './calculators/HuguaCalculator';
import { BianguaCalculator } from './calculators/BianguaCalculator';
import { TiyongCalculator } from './calculators/TiyongCalculator';
import { getBaGuaByNumber, getGua64Name } from './data/bagua';
import { normalizeBirthDateTime } from '../../utils/timeNormalization';
import { nowBeijingParts } from '../../utils/wallTime';

export class MeihuaService {
  private config: MeihuaServiceConfig;

  constructor(config: MeihuaServiceConfig = {}) {
    this.config = {
      debug: false,
      ...config,
    };
  }

  /**
   * 計算梅花易數排盤
   */
  calculate(input: MeihuaInput): MeihuaResult {
    if (input.method === 'time') {
      return this.calculateByTime(input);
    } else {
      return this.calculateByNumber(input);
    }
  }

  /**
   * 時間起卦
   */
  private calculateByTime(input: MeihuaInput): MeihuaResult {
    const { year, month, day, hour, isLunar } = input;
    
    if (!year || !month || !day || hour === undefined) {
      throw new Error('時間起卦需要提供完整的年月日時');
    }

    // 處理時間（農曆轉公曆用於顯示）
    const normalizedTime = normalizeBirthDateTime({
      year,
      month,
      day,
      hour,
      isLunar,
    });

    // 起卦計算（內部使用農曆）
    const { qiGuaData, timeDetail, lunar } = QiguaCalculator.fromTime(
      year,
      month,
      day,
      hour,
      isLunar
    );

    // 獲取上下卦
    const upperGuaInfo = getBaGuaByNumber(qiGuaData.upperGuaIndex);
    const lowerGuaInfo = getBaGuaByNumber(qiGuaData.lowerGuaIndex);

    // 構建本卦
    const benGua: GuaXiang = {
      name: getGua64Name(upperGuaInfo.name, lowerGuaInfo.name),
      upperGua: upperGuaInfo,
      lowerGua: lowerGuaInfo,
    };

    // 計算變卦
    const bianGuaResult = BianguaCalculator.calculate(
      upperGuaInfo.name,
      lowerGuaInfo.name,
      qiGuaData.movingYao
    );
    const bianUpperInfo = getBaGuaByNumber(
      this.getBaGuaNumberByName(bianGuaResult.upper)
    );
    const bianLowerInfo = getBaGuaByNumber(
      this.getBaGuaNumberByName(bianGuaResult.lower)
    );
    const bianGua: GuaXiang = {
      name: getGua64Name(bianGuaResult.upper, bianGuaResult.lower),
      upperGua: bianUpperInfo,
      lowerGua: bianLowerInfo,
    };

    // 計算互卦
    const huGuaResult = HuguaCalculator.calculate(
      upperGuaInfo.name,
      lowerGuaInfo.name
    );
    const huUpperInfo = getBaGuaByNumber(
      this.getBaGuaNumberByName(huGuaResult.upper)
    );
    const huLowerInfo = getBaGuaByNumber(
      this.getBaGuaNumberByName(huGuaResult.lower)
    );
    const huGua: GuaXiang = {
      name: getGua64Name(huGuaResult.upper, huGuaResult.lower),
      upperGua: huUpperInfo,
      lowerGua: huLowerInfo,
    };

    // 計算體用
    const tiYong = TiyongCalculator.calculate(
      upperGuaInfo.wuXing,
      lowerGuaInfo.wuXing,
      qiGuaData.movingYao
    );

    // 時間信息
    const solar = Solar.fromYmdHms(
      normalizedTime.year,
      normalizedTime.month,
      normalizedTime.day,
      normalizedTime.hour,
      0,
      0
    );

    return {
      method: 'time',
      qiGuaData,
      timeDetail,
      timeInfo: {
        solarDate: `${normalizedTime.year}年${normalizedTime.month}月${normalizedTime.day}日`,
        lunarDate: lunar.toString(),
        yearGanZhi: `${lunar.getYearGan()}${lunar.getYearZhi()}`,
      },
      benGua,
      bianGua,
      huGua,
      movingYao: qiGuaData.movingYao,
      tiYong,
    };
  }

  /**
   * 數字起卦
   */
  private calculateByNumber(input: MeihuaInput): MeihuaResult {
    const { upperNumber, lowerNumber, yaoNumber } = input;
    
    if (!upperNumber || !lowerNumber) {
      throw new Error('數字起卦需要提供上卦數和下卦數');
    }

    // 起卦計算
    const qiGuaData = QiguaCalculator.fromNumber(upperNumber, lowerNumber, yaoNumber);

    // 獲取上下卦
    const upperGuaInfo = getBaGuaByNumber(qiGuaData.upperGuaIndex);
    const lowerGuaInfo = getBaGuaByNumber(qiGuaData.lowerGuaIndex);

    // 構建本卦
    const benGua: GuaXiang = {
      name: getGua64Name(upperGuaInfo.name, lowerGuaInfo.name),
      upperGua: upperGuaInfo,
      lowerGua: lowerGuaInfo,
    };

    // 計算變卦
    const bianGuaResult = BianguaCalculator.calculate(
      upperGuaInfo.name,
      lowerGuaInfo.name,
      qiGuaData.movingYao
    );
    const bianUpperInfo = getBaGuaByNumber(
      this.getBaGuaNumberByName(bianGuaResult.upper)
    );
    const bianLowerInfo = getBaGuaByNumber(
      this.getBaGuaNumberByName(bianGuaResult.lower)
    );
    const bianGua: GuaXiang = {
      name: getGua64Name(bianGuaResult.upper, bianGuaResult.lower),
      upperGua: bianUpperInfo,
      lowerGua: bianLowerInfo,
    };

    // 計算互卦
    const huGuaResult = HuguaCalculator.calculate(
      upperGuaInfo.name,
      lowerGuaInfo.name
    );
    const huUpperInfo = getBaGuaByNumber(
      this.getBaGuaNumberByName(huGuaResult.upper)
    );
    const huLowerInfo = getBaGuaByNumber(
      this.getBaGuaNumberByName(huGuaResult.lower)
    );
    const huGua: GuaXiang = {
      name: getGua64Name(huGuaResult.upper, huGuaResult.lower),
      upperGua: huUpperInfo,
      lowerGua: huLowerInfo,
    };

    // 計算體用
    const tiYong = TiyongCalculator.calculate(
      upperGuaInfo.wuXing,
      lowerGuaInfo.wuXing,
      qiGuaData.movingYao
    );

    // 當前時間作為記錄（北京牆鐘分量，與宿主時區無關）
    const nowParts = nowBeijingParts();
    const solar = Solar.fromYmd(nowParts.year, nowParts.month, nowParts.day);
    const lunar = solar.getLunar();

    return {
      method: 'number',
      qiGuaData,
      timeInfo: {
        solarDate: `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日`,
        lunarDate: lunar.toString(),
        yearGanZhi: `${lunar.getYearGan()}${lunar.getYearZhi()}`,
      },
      benGua,
      bianGua,
      huGua,
      movingYao: qiGuaData.movingYao,
      tiYong,
    };
  }

  /**
   * 根據卦名獲取先天數
   */
  private getBaGuaNumberByName(name: BaGuaName): number {
    const map: Record<BaGuaName, number> = {
      '乾': 1, '兌': 2, '離': 3, '震': 4,
      '巽': 5, '坎': 6, '艮': 7, '坤': 8,
    };
    return map[name];
  }
}

// 導出單例
export const meihuaService = new MeihuaService();
