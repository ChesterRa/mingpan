/**
 * 奇门遁甲服务
 *
 * 提供奇门遁甲排盘功能，支持时盘和日盘
 * 支持拆补法和茅山法两种置闰算法
 */

import { Lunar, Solar } from 'lunar-javascript';
import type {
  QimenInput,
  QimenResult,
  QimenServiceConfig,
  GongWei,
  GongInfo,
  TianGan,
  DiZhi,
  PanType,
  PanStyle,
  ZhiRunMethod,
  SiZhuInfo,
  XunShouInfo,
  QimenCalculationError,
  ShiLei,
  ShenShaInfo,
  YongShenInfo,
} from './types';
import { JuShuCalculator } from './calculators/JuShuCalculator';
import { JiuGongCalculator } from './calculators/JiuGongCalculator';
import { SanQiLiuYiCalculator } from './calculators/SanQiLiuYiCalculator';
import { ZhuanPanCalculator } from './calculators/ZhuanPanCalculator';
import { PanTypeCalculator } from './calculators/PanTypeCalculator';
import { BaMenCalculator } from './calculators/BaMenCalculator';
import { JiuXingCalculator } from './calculators/JiuXingCalculator';
import { BaShenCalculator } from './calculators/BaShenCalculator';
import { GeJuCalculator } from './calculators/GeJuCalculator';
import { YongShenCalculator } from './calculators/YongShenCalculator';
import { ShenShaCalculator } from './calculators/ShenShaCalculator';
import {
  GONG_NAMES,
  GONG_WUXING,
  getXunShou,
  getXunKong,
  getLiuYiGan,
  DI_ZHI_GONG,
  MA_XING,
  ZHONG_GONG_JI,
} from './data/constants';

export class QimenService {
  private config: QimenServiceConfig;

  constructor(config: QimenServiceConfig = {}) {
    this.config = config;
  }

  /**
   * 验证输入参数
   */
  private validateInput(input: QimenInput): void {
    // 验证年份
    if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
      throw new Error(`年份必须在 1900-2100 之间，当前值: ${input.year}`);
    }

    // 验证月份
    if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      throw new Error(`月份必须在 1-12 之间，当前值: ${input.month}`);
    }

    // 验证日期
    if (!Number.isInteger(input.day) || input.day < 1 || input.day > 31) {
      throw new Error(`日期必须在 1-31 之间，当前值: ${input.day}`);
    }

    // 验证小时
    if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) {
      throw new Error(`小时必须在 0-23 之间，当前值: ${input.hour}`);
    }

    // 验证分钟（可选）
    if (input.minute !== undefined) {
      if (!Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59) {
        throw new Error(`分钟必须在 0-59 之间，当前值: ${input.minute}`);
      }
    }

    // 验证盘类型（可选）
    const validPanTypes: PanType[] = ['时盘', '日盘', '月盘', '年盘'];
    if (input.panType !== undefined && !validPanTypes.includes(input.panType)) {
      throw new Error(`盘类型必须是 ${validPanTypes.join('/')}，当前值: ${input.panType}`);
    }

    // 验证盘式（可选）
    const validPanStyles: PanStyle[] = ['转盘', '飞盘'];
    if (input.panStyle !== undefined && !validPanStyles.includes(input.panStyle)) {
      throw new Error(`盘式必须是 ${validPanStyles.join('/')}，当前值: ${input.panStyle}`);
    }

    // 验证置闰方法（可选）
    if (input.zhiRunMethod !== undefined && input.zhiRunMethod !== 'chaibu' && input.zhiRunMethod !== 'maoshan') {
      throw new Error(`置闰方法必须是 'chaibu' 或 'maoshan'，当前值: ${input.zhiRunMethod}`);
    }
  }

  /**
   * 计算奇门遁甲盘
   *
   * 支持四种盘类型：时盘、日盘、月盘、年盘
   * 支持两种盘式：转盘（默认）、飞盘
   */
  calculate(input: QimenInput): QimenResult {
    // 输入参数验证
    this.validateInput(input);

    const panType: PanType = input.panType || '时盘';
    const panStyle: PanStyle = input.panStyle || '转盘';
    const zhiRunMethod: ZhiRunMethod = input.zhiRunMethod || 'chaibu';

    // 1. 处理时间，获取四柱和节气信息
    const { siZhu, jieQi, jieQiDate, solarDate, lunarDate } = this.getTimeInfo(input);

    // 2. 计算局数参数（阴阳遁 + 上中下元 + 局数）
    let yinYangDun: '阳遁' | '阴遁';
    let juShu: import('./types').JuShu;
    let yuan: import('./types').YuanType;

    if (panType === '年盘') {
      // 年盘：使用 PanTypeCalculator 计算
      const yearPanResult = PanTypeCalculator.calculateYearPan({
        yearGanZhi: siZhu.yearGanZhi,
        currentJieQi: jieQi,
        year: input.year,
      });
      yinYangDun = yearPanResult.yinYangDun;
      juShu = yearPanResult.juShu;
      yuan = yearPanResult.yuan;
    } else if (panType === '月盘') {
      // 月盘：使用 PanTypeCalculator 计算
      const monthPanResult = PanTypeCalculator.calculateMonthPan({
        monthGanZhi: siZhu.monthGanZhi,
      });
      yinYangDun = monthPanResult.yinYangDun;
      juShu = monthPanResult.juShu;
      yuan = monthPanResult.yuan;
    } else {
      // 时盘/日盘：使用 JuShuCalculator 计算
      const currentDate = new Date(Date.UTC(input.year, input.month - 1, input.day));
      const juShuResult = JuShuCalculator.calculate(
        jieQi,
        siZhu.dayGanZhi,
        zhiRunMethod,
        jieQiDate,
        currentDate
      );
      yinYangDun = juShuResult.yinYangDun;
      juShu = juShuResult.juShu;
      yuan = juShuResult.yuan;
    }

    // 3. 计算地盘（九宫布局）
    const diPanResult = JiuGongCalculator.calculate(juShu, yinYangDun);

    // 4. 确定用于计算的参考干支
    const { refGanZhi, refZhi } = this.getRefGanZhi(panType, siZhu);

    // 5. 计算天盘、九星、八门（根据盘式选择算法）
    let tianPanResult: { gongGan: Record<GongWei, TianGan>; ganGong: Record<TianGan, GongWei> };
    let jiuXingResult: ReturnType<typeof JiuXingCalculator.calculate>;
    let baMenResult: ReturnType<typeof BaMenCalculator.calculate>;

    // 5.1 先计算旬首信息（需要先用飞盘式计算初始天盘以获取ganGong）
    const initialTianPan = SanQiLiuYiCalculator.calculate(
      diPanResult.ganGong,
      refGanZhi,
      yinYangDun
    );

    const xunShouInfo = this.calculateXunShou(
      refGanZhi,
      diPanResult.ganGong,
      initialTianPan.ganGong,
      refZhi,
      yinYangDun
    );

    // 5.2 根据盘式选择算法
    // 参考干（甲用旬首仪）在地盘的落宫，为转盘/飞盘九星共用
    const shiGanLuoGong = ZhuanPanCalculator.getShiGanLuoGong(
      diPanResult.ganGong,
      refGanZhi
    );

    if (panStyle === '转盘') {
      // 转盘式：使用 ZhuanPanCalculator
      tianPanResult = ZhuanPanCalculator.calculateTianPan(
        diPanResult.ganGong,
        refGanZhi,
        yinYangDun
      );
      jiuXingResult = ZhuanPanCalculator.calculateJiuXing(
        xunShouInfo.zhiFuGong,
        shiGanLuoGong,
        yinYangDun
      );
      baMenResult = ZhuanPanCalculator.calculateBaMen(
        xunShouInfo.zhiFuGong,
        refGanZhi,
        yinYangDun
      );
    } else {
      // 飞盘式：按宫位数字飞布
      tianPanResult = SanQiLiuYiCalculator.calculate(
        diPanResult.ganGong,
        refGanZhi,
        yinYangDun
      );
      jiuXingResult = JiuXingCalculator.calculate(
        xunShouInfo.zhiFuGong,
        shiGanLuoGong,
        yinYangDun
      );
      baMenResult = BaMenCalculator.calculate(
        xunShouInfo.zhiFuGong,
        refGanZhi,
        yinYangDun
      );
    }

    // 6. 计算八神（八神始终按固定顺序排布，不受盘式影响）
    const baShenResult = BaShenCalculator.calculate(
      jiuXingResult.zhiFuLuoGong,
      yinYangDun
    );

    // 7. 组装九宫信息
    const gongs = this.assembleGongs(
      diPanResult.gongGan,
      tianPanResult.gongGan,
      baMenResult.gongMen,
      jiuXingResult.gongXing,
      baShenResult.gongShen,
      xunShouInfo.kongWang,
      siZhu.dayZhi
    );

    // 8. 计算日干/时干落宫
    const dayGanGong = this.findGanGong(siZhu.dayGan, siZhu.dayGanZhi, tianPanResult.ganGong);
    const hourGanGong = this.findGanGong(siZhu.hourGan, siZhu.hourGanZhi, tianPanResult.ganGong);

    // 9. 计算格局（传入 panType 以过滤时辰相关格局）
    const geJu = GeJuCalculator.calculate(
      gongs,
      yinYangDun,
      siZhu.dayGan,
      panType === '时盘' ? siZhu.hourGan : null,
      panType === '时盘' ? siZhu.hourZhi : null,
      xunShouInfo,
      panType
    );

    // 更新旬首信息中的值符值使落宫
    const fullXunShouInfo: XunShouInfo = {
      ...xunShouInfo,
      zhiFuXing: jiuXingResult.zhiFuXing,
      zhiFuLuoGong: jiuXingResult.zhiFuLuoGong,
      zhiShiMen: baMenResult.zhiShiMen,
      zhiShiLuoGong: baMenResult.zhiShiLuoGong,
    };

    return {
      timeInfo: {
        solarDate,
        lunarDate,
        siZhu,
        jieQi,
      },
      panType,
      panStyle,
      zhiRunMethod,
      yinYangDun,
      juShu,
      yuan,
      xunShou: fullXunShouInfo,
      gongs,
      dayGanGong,
      hourGanGong,
      geJu,
    };
  }

  /**
   * 获取参考干支（根据盘类型）
   */
  private getRefGanZhi(panType: PanType, siZhu: SiZhuInfo): { refGanZhi: string; refZhi: DiZhi } {
    switch (panType) {
      case '年盘':
        return {
          refGanZhi: siZhu.yearGanZhi,
          refZhi: siZhu.yearGanZhi.charAt(1) as DiZhi,
        };
      case '月盘':
        return {
          refGanZhi: siZhu.monthGanZhi,
          refZhi: siZhu.monthGanZhi.charAt(1) as DiZhi,
        };
      case '日盘':
        return {
          refGanZhi: siZhu.dayGanZhi,
          refZhi: siZhu.dayZhi,
        };
      case '时盘':
      default:
        return {
          refGanZhi: siZhu.hourGanZhi,
          refZhi: siZhu.hourZhi,
        };
    }
  }

  /**
   * 获取时间信息（四柱、节气）
   */
  private getTimeInfo(input: QimenInput): {
    siZhu: SiZhuInfo;
    jieQi: string;
    jieQiDate: Date;
    solarDate: string;
    lunarDate: string;
  } {
    let solar: InstanceType<typeof Solar>;
    let lunar: InstanceType<typeof Lunar>;

    if (input.isLunar) {
      // 农历转公历
      lunar = Lunar.fromYmd(input.year, input.month, input.day);
      solar = lunar.getSolar();
    } else {
      // 公历
      solar = Solar.fromYmd(input.year, input.month, input.day);
      lunar = solar.getLunar();
    }

    // 使用 Solar 获取精确时辰信息
    const hour = input.hour;
    const solarWithTime = Solar.fromYmdHms(
      solar.getYear(),
      solar.getMonth(),
      solar.getDay(),
      hour,
      input.minute || 0,
      0
    );
    const lunarWithTime = solarWithTime.getLunar();

    // 使用 EightChar 获取精确四柱（sect1：子初换日，全项目统一口径）
    const eightChar = lunarWithTime.getEightChar();
    eightChar.setSect(1);
    const yearGanZhi = eightChar.getYear();
    const monthGanZhi = eightChar.getMonth();
    const dayGanZhi = eightChar.getDay();
    const hourGanZhi = eightChar.getTime();

    const siZhu: SiZhuInfo = {
      yearGanZhi,
      monthGanZhi,
      dayGanZhi,
      hourGanZhi,
      dayGan: dayGanZhi[0] as TianGan,
      dayZhi: dayGanZhi[1] as DiZhi,
      hourGan: hourGanZhi[0] as TianGan,
      hourZhi: hourGanZhi[1] as DiZhi,
    };

    // 获取节气
    const prevJieQi = lunarWithTime.getPrevJieQi();
    const jieQi = prevJieQi ? prevJieQi.getName() : '冬至';
    const jieQiSolar = prevJieQi ? prevJieQi.getSolar() : solar;
    const jieQiDate = new Date(
      jieQiSolar.getYear(),
      jieQiSolar.getMonth() - 1,
      jieQiSolar.getDay()
    );

    // 格式化日期
    const solarDate = `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日`;
    const lunarDate = `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;

    return { siZhu, jieQi, jieQiDate, solarDate, lunarDate };
  }

  /**
   * 计算旬首信息
   */
  private calculateXunShou(
    refGanZhi: string,
    diPanGanGong: Record<TianGan, GongWei>,
    tianPanGanGong: Record<TianGan, GongWei>,
    refZhi: DiZhi,
    yinYangDun: '阳遁' | '阴遁'
  ): XunShouInfo {
    // 获取旬首
    const xunShou = getXunShou(refGanZhi);
    const fuTou = xunShou; // 符头就是旬首

    // 获取旬首对应的六仪（遁甲干）
    const liuYiGan = getLiuYiGan(xunShou);

    // 值符星原始宫位 = 旬首遁干在地盘的宫位
    let zhiFuGong = diPanGanGong[liuYiGan];
    if (zhiFuGong === 5) {
      zhiFuGong = ZHONG_GONG_JI; // 中宫寄坤二
    }

    // 值使门原始宫位 = 值符星原始宫位
    const zhiShiGong = zhiFuGong;

    // 获取空亡
    const kongWang = getXunKong(xunShou);

    return {
      xunShou,
      fuTou,
      zhiFuXing: '蓬', // 占位，后续由 JiuXingCalculator 计算
      zhiFuGong,
      zhiFuLuoGong: zhiFuGong, // 占位，后续更新
      zhiShiMen: '休', // 占位，后续由 BaMenCalculator 计算
      zhiShiGong,
      zhiShiLuoGong: zhiShiGong, // 占位，后续更新
      kongWang,
    };
  }

  /**
   * 组装九宫完整信息
   */
  private assembleGongs(
    diPanGan: Record<GongWei, TianGan>,
    tianPanGan: Record<GongWei, TianGan>,
    gongMen: Record<GongWei, import('./types').BaMen>,
    gongXing: Record<GongWei, import('./types').JiuXing>,
    gongShen: Record<GongWei, import('./types').BaShen>,
    kongWang: [DiZhi, DiZhi],
    dayZhi: DiZhi
  ): Record<GongWei, GongInfo> {
    const gongs: Record<GongWei, GongInfo> = {} as Record<GongWei, GongInfo>;

    // 获取马星地支
    const maZhi = MA_XING[dayZhi];
    const maGong = DI_ZHI_GONG[maZhi];

    for (let g = 1; g <= 9; g++) {
      const gong = g as GongWei;

      // 检查是否空亡（根据地支判断）
      // 某些宫位对应两个地支，只要其中一个在空亡列表中即为空亡
      const gongDiZhiList = this.getGongDiZhiList(gong);
      const isKong = gongDiZhiList.some(dz => kongWang.includes(dz));

      // 检查是否马星
      const isMa = gong === maGong;

      gongs[gong] = {
        gong,
        gongName: GONG_NAMES[gong],
        diPanGan: diPanGan[gong],
        tianPanGan: tianPanGan[gong],
        men: gongMen[gong],
        xing: gongXing[gong],
        shen: gongShen[gong],
        wuXing: GONG_WUXING[gong],
        isKong,
        isMa,
      };
    }

    return gongs;
  }

  /**
   * 获取宫位对应的所有地支
   * 某些宫位对应两个地支（坤、巽、乾、艮），需要全部返回
   */
  private getGongDiZhiList(gong: GongWei): DiZhi[] {
    const gongDiZhiMap: Record<GongWei, DiZhi[]> = {
      1: ['子'],         // 坎宫
      2: ['未', '申'],   // 坤宫
      3: ['卯'],         // 震宫
      4: ['辰', '巳'],   // 巽宫
      5: ['未', '申'],   // 中宫寄坤二
      6: ['戌', '亥'],   // 乾宫
      7: ['酉'],         // 兑宫
      8: ['丑', '寅'],   // 艮宫
      9: ['午'],         // 离宫
    };
    return gongDiZhiMap[gong];
  }

  /**
   * 根据天干找落宫
   * 注意：甲遁于六仪之下，需要根据旬首找对应的六仪
   *
   * @param gan - 天干
   * @param ganZhi - 干支（用于确定甲的旬首）
   * @param ganGong - 天干落宫映射
   */
  private findGanGong(gan: TianGan, ganZhi: string, ganGong: Record<TianGan, GongWei>): GongWei {
    let actualGan = gan;

    // 甲遁于六仪之下，需要根据干支的旬首找对应的六仪
    if (gan === '甲') {
      const xunShou = getXunShou(ganZhi);
      actualGan = getLiuYiGan(xunShou);
    }

    const gong = ganGong[actualGan];
    if (gong === undefined) {
      return ZHONG_GONG_JI; // 默认返回坤二
    }
    return gong === 5 ? ZHONG_GONG_JI : gong;
  }

  // ============= 用神系统 + 神煞 =============

  /**
   * 计算神煞信息
   *
   * 独立计算神煞，不影响基础排盘性能。
   *
   * @param result 奇门盘结果
   * @returns 神煞信息列表
   */
  calculateShenSha(result: QimenResult): ShenShaInfo[] {
    return ShenShaCalculator.calculateAll(result);
  }

  /**
   * 带用神分析的高级排盘
   *
   * 在基础排盘基础上，增加用神分析、神煞计算和主客分析。
   *
   * @param input 排盘输入
   * @param shiLei 事类
   * @param options 可选配置
   * @returns 扩展的奇门盘结果（含 yongShen 字段）
   */
  calculateWithYongShen(
    input: QimenInput,
    shiLei: ShiLei,
    options?: { nianGan?: TianGan; includeShenSha?: boolean }
  ): QimenResult {
    // 基础排盘
    const result = this.calculate(input);

    // 用神分析
    const yongShenInfo: YongShenInfo = YongShenCalculator.analyze(
      result,
      shiLei,
      options?.nianGan
    );

    // 附加用神信息到结果
    result.yongShen = yongShenInfo;

    // 可选：计算神煞并附加到各宫
    if (options?.includeShenSha) {
      const shenShaList = this.calculateShenSha(result);
      const gongShenSha = ShenShaCalculator.distributeToGongs(shenShaList);

      // 将神煞信息附加到各宫
      for (const gong of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
        result.gongs[gong].shenSha = gongShenSha[gong];
      }
    }

    return result;
  }

}
