/**
 * 六爻服務主類
 * 
 * 提供統一的六爻排盤接口
 * 
 * 設計原則：
 * - 排盤層：輸出確定性結構
 * - 斷卦層：交給 Agent/LLM
 * - v1 只支持手動輸入爻值
 */

import { Lunar, Solar } from 'lunar-javascript';
import {
  LiuyaoInput,
  LiuyaoResult,
  LiuyaoServiceConfig,
  YaoInfo,
  GuaInfo,
  TimeInfo,
  YaoValue,
  TianGan,
  DiZhi,
  BaGua,
  FuShenInfo,
  LiuQin,
} from './types';
import { NajiaCalculator } from './calculators/NajiaCalculator';
import { LiuqinCalculator } from './calculators/LiuqinCalculator';
import { LiushenCalculator } from './calculators/LiushenCalculator';
import { XunkongCalculator } from './calculators/XunkongCalculator';
import { FushenCalculator } from './calculators/FushenCalculator';
import { JintuishenCalculator } from './calculators/JintuishenCalculator';
import { WangshuaiCalculator } from './calculators/WangshuaiCalculator';
import {
  getGua64Info,
  BAGUA_WUXING,
  NAJIA_TABLE,
  DIZHI_WUXING,
} from './data/guagong';
import { normalizeBirthDateTime } from '../../utils/timeNormalization';

export class LiuyaoService {
  private config: LiuyaoServiceConfig;

  constructor(config: LiuyaoServiceConfig = {}) {
    this.config = {
      debug: false,
      ...config,
    };
  }

  /**
   * 計算六爻排盤
   */
  calculate(input: LiuyaoInput): LiuyaoResult {
    // 1. 處理時間（農曆轉公曆）
    const normalizedTime = normalizeBirthDateTime({
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      isLunar: input.isLunar,
    });

    // 2. 獲取時間信息
    const timeInfo = this.calculateTimeInfo(
      normalizedTime.year,
      normalizedTime.month,
      normalizedTime.day,
      normalizedTime.hour
    );

    // 3. 計算本卦
    const { upper: benUpper, lower: benLower } = NajiaCalculator.getGuaFromYaoValues(input.yaoValues);
    const benGuaData = getGua64Info(benUpper, benLower);
    const benGua: GuaInfo = {
      name: benGuaData.name,
      upperGua: benGuaData.upper,
      lowerGua: benGuaData.lower,
      gong: benGuaData.gong,
      gongWuXing: BAGUA_WUXING[benGuaData.gong],
      shiYaoPosition: benGuaData.shiYao,
      yingYaoPosition: benGuaData.yingYao,
      guaXu: benGuaData.guaXu,
      isYouHun: benGuaData.guaXu === 7,
      isGuiHun: benGuaData.guaXu === 8,
    };

    // 4. 計算動爻和變卦
    const movingYaoPositions: number[] = [];
    const changedYaoYinYang: boolean[] = [];

    for (let i = 0; i < 6; i++) {
      const yaoValue = input.yaoValues[i];
      const isMoving = NajiaCalculator.isMoving(yaoValue);
      const isYang = yaoValue === 7 || yaoValue === 9;

      if (isMoving) {
        movingYaoPositions.push(i + 1);
        changedYaoYinYang.push(!isYang); // 動爻陰陽反轉
      } else {
        changedYaoYinYang.push(isYang);
      }
    }

    // 5. 計算變卦（如果有動爻）
    let bianGua: GuaInfo | undefined;
    if (movingYaoPositions.length > 0) {
      const { upper: bianUpper, lower: bianLower } = this.getGuaFromYinYang(changedYaoYinYang);
      const bianGuaData = getGua64Info(bianUpper, bianLower);
      bianGua = {
        name: bianGuaData.name,
        upperGua: bianGuaData.upper,
        lowerGua: bianGuaData.lower,
        gong: bianGuaData.gong,
        gongWuXing: BAGUA_WUXING[bianGuaData.gong],
        shiYaoPosition: bianGuaData.shiYao,
        yingYaoPosition: bianGuaData.yingYao,
        guaXu: bianGuaData.guaXu,
        isYouHun: bianGuaData.guaXu === 7,
        isGuiHun: bianGuaData.guaXu === 8,
      };
    }

    // 6. 計算六爻詳細信息
    const yaoList = this.calculateYaoList(
      input.yaoValues,
      benGua,
      bianGua,
      timeInfo.dayStem,
      timeInfo.monthBranch,
      timeInfo.dayGanZhi.charAt(1) as DiZhi
    );

    // 7. 計算伏神
    const presentLiuQin = yaoList.map(y => y.liuQin);
    const benGuaNaJia = yaoList.map(y => ({ diZhi: y.naJia, wuXing: y.naJiaWuXing }));
    const dayBranch = timeInfo.dayGanZhi.charAt(1) as DiZhi;
    
    const fuShenList = FushenCalculator.calculate(
      benGua.gongWuXing,
      benGua.gong,
      presentLiuQin,
      benGuaNaJia,
      timeInfo.monthBranch,
      dayBranch
    );

    return {
      timeInfo,
      benGua,
      bianGua,
      yaoList,
      movingYaoPositions,
      fuShenList,
    };
  }

  /**
   * 計算時間信息
   */
  private calculateTimeInfo(year: number, month: number, day: number, hour: number): TimeInfo {
    const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();
      eightChar.setSect(1); // 子初换日，全项目统一口径

    const yearGanZhi = eightChar.getYear();
    const monthGanZhi = eightChar.getMonth();
    const dayGanZhi = eightChar.getDay();
    const hourGanZhi = eightChar.getTime();

    const dayStem = dayGanZhi.charAt(0) as TianGan;
    const dayBranch = dayGanZhi.charAt(1) as DiZhi;
    const monthBranch = monthGanZhi.charAt(1) as DiZhi;

    const xunKong = XunkongCalculator.calculate(dayStem, dayBranch);

    return {
      solarDate: `${year}年${month}月${day}日`,
      lunarDate: lunar.toString(),
      yearGanZhi,
      monthGanZhi,
      dayGanZhi,
      hourGanZhi,
      dayStem,
      monthBranch,
      xunKong,
    };
  }

  /**
   * 計算六爻詳細信息
   */
  private calculateYaoList(
    yaoValues: YaoValue[],
    benGua: GuaInfo,
    bianGua: GuaInfo | undefined,
    dayStem: TianGan,
    monthBranch: DiZhi,
    dayBranch: DiZhi
  ): YaoInfo[] {
    const yaoList: YaoInfo[] = [];
    const liuShenList = LiushenCalculator.calculateAll(dayStem);
    const naJiaList = NajiaCalculator.calculateAll(benGua.upperGua, benGua.lowerGua);

    for (let i = 0; i < 6; i++) {
      const position = i + 1;
      const yaoValue = yaoValues[i];
      const isMoving = NajiaCalculator.isMoving(yaoValue);
      const yinYang = NajiaCalculator.getYinYang(yaoValue);
      const changedYinYang = NajiaCalculator.getChangedYinYang(yaoValue);

      const naJia = naJiaList[i];
      const liuQin = LiuqinCalculator.calculate(benGua.gongWuXing, naJia.wuXing);

      // 計算變爻納甲和進退神（如果是動爻）
      let changedNaJia: DiZhi | undefined;
      let jinTuiShen = undefined;
      if (isMoving && bianGua) {
        const bianNaJiaList = NajiaCalculator.calculateAll(bianGua.upperGua, bianGua.lowerGua);
        changedNaJia = bianNaJiaList[i].diZhi;
        // 計算進退神
        jinTuiShen = JintuishenCalculator.calculate(naJia.diZhi, changedNaJia);
      }

      // 計算旺衰
      const wangShuaiByMonth = WangshuaiCalculator.calculate(naJia.wuXing, monthBranch);
      const wangShuaiByDay = WangshuaiCalculator.calculate(naJia.wuXing, dayBranch);

      yaoList.push({
        position,
        value: yaoValue,
        yinYang,
        isMoving,
        changedYinYang,
        naJia: naJia.diZhi,
        naJiaWuXing: naJia.wuXing,
        changedNaJia,
        liuQin,
        liuShen: liuShenList[i],
        isShiYao: position === benGua.shiYaoPosition,
        isYingYao: position === benGua.yingYaoPosition,
        jinTuiShen,
        wangShuaiByMonth,
        wangShuaiByDay,
      });
    }

    return yaoList;
  }

  /**
   * 根據陰陽數組獲取上下卦
   * 
   * 八卦二進制：下爻是最高位 (bit 2)
   * 例如：震 = 0b100 = 4，表示下爻阳(1)、中爻阴(0)、上爻阴(0)
   * 計算方式：下爻*4 + 中爻*2 + 上爻*1
   */
  private getGuaFromYinYang(yinYang: boolean[]): { upper: BaGua; lower: BaGua } {
    const BINARY_TO_BAGUA: Record<number, BaGua> = {
      0b000: '坤',
      0b001: '艮',
      0b010: '坎',
      0b011: '巽',
      0b100: '震',
      0b101: '離',
      0b110: '兌',
      0b111: '乾',
    };

    // 下爻是最高位 (bit 2)，上爻是最低位 (bit 0)
    const lowerBinary = (yinYang[0] ? 4 : 0) + (yinYang[1] ? 2 : 0) + (yinYang[2] ? 1 : 0);
    const upperBinary = (yinYang[3] ? 4 : 0) + (yinYang[4] ? 2 : 0) + (yinYang[5] ? 1 : 0);

    return {
      upper: BINARY_TO_BAGUA[upperBinary],
      lower: BINARY_TO_BAGUA[lowerBinary],
    };
  }
}

// 導出單例
export const liuyaoService = new LiuyaoService();
