/**
 * 六爻服務類型定義
 * 
 * 設計原則：
 * - 排盤層：MCP 負責，輸出確定性結構
 * - 斷卦層：交給 Agent/LLM
 * - v1 只支持手動輸入爻值（確定性優先）
 */

// ============================================
// 基礎類型
// ============================================

/** 爻值：6=老陰(動), 7=少陽(靜), 8=少陰(靜), 9=老陽(動) */
export type YaoValue = 6 | 7 | 8 | 9;

/** 爻的陰陽 */
export type YinYang = '陽' | '陰';

/** 五行 */
export type WuXing = '金' | '木' | '水' | '火' | '土';

/** 六親 */
export type LiuQin = '父母' | '兄弟' | '子孫' | '妻財' | '官鬼';

/** 六神 */
export type LiuShen = '青龍' | '朱雀' | '勾陳' | '螣蛇' | '白虎' | '玄武';

/** 飛伏關係 */
export type FeiShenRelation = '飛生伏' | '飛克伏' | '伏生飛' | '伏克飛' | '比和';

/** 進退神類型 */
export type JinTuiShenType = '進神' | '退神' | null;

/** 旺衰狀態 */
export type WangShuaiState = '旺' | '相' | '休' | '囚' | '死';

/** 天干 */
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 地支 */
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 八卦 */
export type BaGua = '乾' | '兌' | '離' | '震' | '巽' | '坎' | '艮' | '坤';

// ============================================
// 輸入類型
// ============================================

export interface LiuyaoInput {
  /** 六個爻值（自下而上，初爻到上爻） */
  yaoValues: [YaoValue, YaoValue, YaoValue, YaoValue, YaoValue, YaoValue];
  
  /** 起卦時間（用於月建、六神、旬空等計算） */
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  
  /** 是否為農曆輸入，默認 false */
  isLunar?: boolean;
}

// ============================================
// 單爻信息
// ============================================

export interface YaoInfo {
  /** 爻位（1-6，自下而上） */
  position: number;
  
  /** 原始爻值 */
  value: YaoValue;
  
  /** 本卦陰陽 */
  yinYang: YinYang;
  
  /** 是否為動爻 */
  isMoving: boolean;
  
  /** 變卦陰陽（動爻才有） */
  changedYinYang?: YinYang;
  
  /** 納甲地支 */
  naJia: DiZhi;
  
  /** 納甲五行 */
  naJiaWuXing: WuXing;
  
  /** 變爻納甲地支（動爻才有） */
  changedNaJia?: DiZhi;
  
  /** 六親 */
  liuQin: LiuQin;
  
  /** 六神 */
  liuShen: LiuShen;
  
  /** 是否為世爻 */
  isShiYao: boolean;
  
  /** 是否為應爻 */
  isYingYao: boolean;
  
  /** 進退神（動爻才有） */
  jinTuiShen?: JinTuiShenType;
  
  /** 月建旺衰 */
  wangShuaiByMonth?: WangShuaiState;
  
  /** 日辰旺衰 */
  wangShuaiByDay?: WangShuaiState;
}

// ============================================
// 卦信息
// ============================================

export interface GuaInfo {
  /** 卦名 */
  name: string;
  
  /** 上卦（外卦） */
  upperGua: BaGua;
  
  /** 下卦（內卦） */
  lowerGua: BaGua;
  
  /** 所屬卦宮 */
  gong: BaGua;
  
  /** 卦宮五行 */
  gongWuXing: WuXing;
  
  /** 世爻位置（1-6） */
  shiYaoPosition: number;
  
  /** 應爻位置（1-6） */
  yingYaoPosition: number;
  
  /** 卦序（在八宮中的位置：1-8） */
  guaXu: number;
  
  /** 是否為遊魂卦 */
  isYouHun: boolean;
  
  /** 是否為歸魂卦 */
  isGuiHun: boolean;
}

// ============================================
// 時間信息
// ============================================

export interface TimeInfo {
  /** 公曆日期字符串 */
  solarDate: string;
  
  /** 農曆日期字符串 */
  lunarDate: string;
  
  /** 年干支 */
  yearGanZhi: string;
  
  /** 月干支（節氣月） */
  monthGanZhi: string;
  
  /** 日干支 */
  dayGanZhi: string;
  
  /** 時干支 */
  hourGanZhi: string;
  
  /** 日干 */
  dayStem: TianGan;
  
  /** 月建（地支） */
  monthBranch: DiZhi;
  
  /** 旬空（兩個地支） */
  xunKong: [DiZhi, DiZhi];
}

// ============================================
// 伏神信息
// ============================================

export interface FuShenInfo {
  /** 伏神六親 */
  liuQin: LiuQin;
  
  /** 伏神地支 */
  diZhi: DiZhi;
  
  /** 伏神五行 */
  wuXing: WuXing;
  
  /** 伏神所在爻位（1-6） */
  position: number;
  
  /** 飛神地支（該爻位的本卦納甲） */
  feiShenDiZhi: DiZhi;
  
  /** 飛神五行 */
  feiShenWuXing: WuXing;
  
  /** 飛伏關係 */
  relation: FeiShenRelation;
  
  /** 伏神月建旺衰 */
  wangShuaiByMonth?: WangShuaiState;
  
  /** 伏神日辰旺衰 */
  wangShuaiByDay?: WangShuaiState;
}

// ============================================
// 完整結果
// ============================================

export interface LiuyaoResult {
  /** 時間信息 */
  timeInfo: TimeInfo;
  
  /** 本卦信息 */
  benGua: GuaInfo;
  
  /** 變卦信息（有動爻時才有） */
  bianGua?: GuaInfo;
  
  /** 六爻詳細信息（自下而上） */
  yaoList: YaoInfo[];
  
  /** 動爻位置列表（1-6） */
  movingYaoPositions: number[];
  
  /** 伏神列表（卦中缺失的六親） */
  fuShenList: FuShenInfo[];
}

// ============================================
// 服務配置
// ============================================

export interface LiuyaoServiceConfig {
  /** 是否啟用調試模式 */
  debug?: boolean;
}
