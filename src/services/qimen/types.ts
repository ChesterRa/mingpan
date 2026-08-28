/**
 * 奇门遁甲类型定义
 */

// ============= 基础类型 =============

/** 天干 */
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 地支 */
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 五行 */
export type WuXing = '木' | '火' | '土' | '金' | '水';

/** 宫位 (1-9，对应洛书九宫) */
export type GongWei = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 阴阳遁 */
export type YinYangDun = '阳遁' | '阴遁';

/** 局数 (1-9) */
export type JuShu = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 上中下元 */
export type YuanType = '上元' | '中元' | '下元';

/** 盘类型 */
export type PanType = '时盘' | '日盘' | '月盘' | '年盘';

/** 盘式（飞盘/转盘） */
export type PanStyle = '转盘' | '飞盘';

/** 置闰方法 */
export type ZhiRunMethod = 'chaibu' | 'maoshan';

// ============= 核心类型 =============

/** 三奇六仪 */
export type SanQiLiuYi = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 八门 */
export type BaMen = '休' | '生' | '伤' | '杜' | '景' | '死' | '惊' | '开';

/** 九星 */
export type JiuXing = '蓬' | '芮' | '冲' | '辅' | '禽' | '心' | '柱' | '任' | '英';

/** 八神 */
export type BaShen = '符' | '蛇' | '阴' | '合' | '虎' | '武' | '地' | '天';

// ============= 输入类型 =============

/** 奇门遁甲输入参数 */
export interface QimenInput {
  /** 年份 (1900-2100) */
  year: number;
  /** 月份 (1-12) */
  month: number;
  /** 日期 (1-31) */
  day: number;
  /** 小时 (0-23) */
  hour: number;
  /** 分钟 (0-59) */
  minute?: number;
  /** 是否农历 */
  isLunar?: boolean;
  /** 盘类型 */
  panType?: PanType;
  /** 盘式（转盘/飞盘，默认转盘，遵循《神奇之门》） */
  panStyle?: PanStyle;
  /** 置闰方法 */
  zhiRunMethod?: ZhiRunMethod;
}

// ============= 中间类型 =============

/** 四柱信息 */
export interface SiZhuInfo {
  /** 年干支 */
  yearGanZhi: string;
  /** 月干支 */
  monthGanZhi: string;
  /** 日干支 */
  dayGanZhi: string;
  /** 时干支 */
  hourGanZhi: string;
  /** 日干 */
  dayGan: TianGan;
  /** 日支 */
  dayZhi: DiZhi;
  /** 时干 */
  hourGan: TianGan;
  /** 时支 */
  hourZhi: DiZhi;
}

/** 节气信息 */
export interface JieQiInfo {
  /** 当前节气名称 */
  jieQi: string;
  /** 节气开始日期 */
  jieQiDate: Date;
  /** 是否在节气当天 */
  isJieQiDay: boolean;
}

/** 地盘信息 */
export interface DiPanInfo {
  /** 阴阳遁 */
  yinYangDun: YinYangDun;
  /** 局数 */
  juShu: JuShu;
  /** 元 (上中下) */
  yuan: YuanType;
  /** 各宫地盘干 (宫位 -> 干) */
  gongGan: Record<GongWei, TianGan>;
}

/** 天盘信息 */
export interface TianPanInfo {
  /** 各宫天盘干 (宫位 -> 干) */
  gongGan: Record<GongWei, TianGan>;
}

/** 旬首信息 */
export interface XunShouInfo {
  /** 旬首 (如 "甲子"、"甲戌" 等) */
  xunShou: string;
  /** 符头 (旬首第一天) */
  fuTou: string;
  /** 值符星 */
  zhiFuXing: JiuXing;
  /** 值符星原始宫位 */
  zhiFuGong: GongWei;
  /** 值符星落宫 */
  zhiFuLuoGong: GongWei;
  /** 值使门 */
  zhiShiMen: BaMen;
  /** 值使门原始宫位 */
  zhiShiGong: GongWei;
  /** 值使门落宫 */
  zhiShiLuoGong: GongWei;
  /** 空亡地支 */
  kongWang: [DiZhi, DiZhi];
}

/** 八门信息 */
export interface BaMenInfo {
  /** 各宫八门 (宫位 -> 门) */
  gongMen: Record<GongWei, BaMen>;
}

/** 九星信息 */
export interface JiuXingInfo {
  /** 各宫九星 (宫位 -> 星) */
  gongXing: Record<GongWei, JiuXing>;
}

/** 八神信息 */
export interface BaShenInfo {
  /** 各宫八神 (宫位 -> 神) */
  gongShen: Record<GongWei, BaShen>;
}

// ============= 输出类型 =============

/** 单宫完整信息 */
export interface GongInfo {
  /** 宫位 (1-9) */
  gong: GongWei;
  /** 宫名 (乾坎艮震巽离坤兑中) */
  gongName: string;
  /** 地盘干 */
  diPanGan: TianGan;
  /** 天盘干 */
  tianPanGan: TianGan;
  /** 八门 */
  men: BaMen;
  /** 九星 */
  xing: JiuXing;
  /** 八神 */
  shen: BaShen;
  /** 宫位五行 */
  wuXing: WuXing;
  /** 是否空亡 */
  isKong: boolean;
  /** 是否马星 */
  isMa: boolean;
  /** 该宫神煞列表（可选，启用神煞功能时填充） */
  shenSha?: ShenShaInfo[];
}

/** 格局信息 */
export interface GeJuInfo {
  /** 格局名称 */
  name: string;
  /** 格局类型 */
  type: '吉格' | '凶格' | '中性';
  /** 格局描述 */
  description: string;
  /** 相关宫位 */
  gongs: GongWei[];
}

/** 时间信息 */
export interface QimenTimeInfo {
  /** 公历日期 */
  solarDate: string;
  /** 农历日期 */
  lunarDate: string;
  /** 四柱 */
  siZhu: SiZhuInfo;
  /** 节气 */
  jieQi: string;
}

/** 奇门遁甲完整结果 */
export interface QimenResult {
  /** 时间信息 */
  timeInfo: QimenTimeInfo;
  /** 盘类型 */
  panType: PanType;
  /** 盘式（转盘/飞盘） */
  panStyle: PanStyle;
  /** 置闰方法 */
  zhiRunMethod: ZhiRunMethod;
  /** 阴阳遁 */
  yinYangDun: YinYangDun;
  /** 局数 */
  juShu: JuShu;
  /** 元 */
  yuan: YuanType;
  /** 旬首信息 */
  xunShou: XunShouInfo;
  /** 九宫信息 (宫位 -> 完整信息) */
  gongs: Record<GongWei, GongInfo>;
  /** 日干落宫 */
  dayGanGong: GongWei;
  /** 时干落宫 */
  hourGanGong: GongWei;
  /** 格局列表 */
  geJu: GeJuInfo[];
  /** 用神分析信息（可选，调用 calculateWithYongShen 时填充） */
  yongShen?: YongShenInfo;
}

// ============= 服务配置类型 =============

/** 服务配置 */
export interface QimenServiceConfig {
  /** 是否启用缓存 */
  enableCaching?: boolean;
  /** 调试模式 */
  debug?: boolean;
}

// ============= 用神系统类型 =============

/** 旺相休囚死状态 */
export type WangXiangState = '旺' | '相' | '休' | '囚' | '死';

/** 用神类型 */
export type YongShenType = '门' | '星' | '奇' | '仪' | '神';

/** 与日干关系 */
export type DayGanRelation = '生' | '克' | '比' | '泄' | '耗';

/** 事类枚举 */
export type ShiLei =
  | '求财'
  | '婚姻'
  | '疾病'
  | '出行'
  | '诉讼'
  | '考试'
  | '工作'
  | '失物'
  | '置业'
  | '求官'
  | '孕产'
  | '寻人'
  | '合作'
  | '其他';

/** 单个用神项 */
export interface YongShenItem {
  /** 用神类型（门/星/奇/仪/神） */
  type: YongShenType;
  /** 用神名称（如 '戊'、'生门'） */
  name: string;
  /** 落宫位置 */
  gong: GongWei;
  /** 宫位状态 */
  state: WangXiangState;
}

/** 用神分析结果 */
export interface YongShenAnalysis {
  /** 用神名称 */
  yongshen: string;
  /** 落宫 */
  gong: GongWei;
  /** 是否空亡 */
  isKong: boolean;
  /** 是否入墓 */
  isRuMu: boolean;
  /** 是否击刑 */
  isJiXing: boolean;
  /** 与日干关系 */
  relationToDay: DayGanRelation;
  /** 受格局影响 */
  geJuEffects: string[];
  /** 综合评分 (0-100) */
  score: number;
}

/** 主客分析 */
export interface ZhuKeAnalysis {
  /** 我方（日干） */
  zhu: { gong: GongWei; state: WangXiangState };
  /** 彼方（时干） */
  ke: { gong: GongWei; state: WangXiangState };
  /** 主客关系 */
  relation: '我克彼' | '彼克我' | '比和' | '我生彼' | '彼生我';
  /** 简要结论 */
  summary: string;
}

/** 年命信息 */
export interface NianMingInfo {
  /** 年干 */
  nianGan: TianGan;
  /** 落宫 */
  gong: GongWei;
  /** 宫位状态 */
  state: WangXiangState;
}

/** 用神信息 */
export interface YongShenInfo {
  /** 事类 */
  shiLei: ShiLei;
  /** 主用神列表 */
  zhuyong: YongShenItem[];
  /** 辅用神列表 */
  fuyong: YongShenItem[];
  /** 用神分析结果 */
  analysis: YongShenAnalysis[];
  /** 主客分析（涉及双方的事类） */
  zhuKe?: ZhuKeAnalysis;
  /** 年命落宫信息 */
  nianMing?: NianMingInfo;
}

// ============= 神煞系统类型 =============

/** 神煞类型 */
export type ShenShaType = '吉' | '凶' | '中性';

/** 神煞信息 */
export interface ShenShaInfo {
  /** 神煞名称 */
  name: string;
  /** 吉凶属性 */
  type: ShenShaType;
  /** 落宫 */
  gong: GongWei;
  /** 简要说明 */
  description: string;
}

/**
 * 奇门计算错误
 */
export class QimenCalculationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'QimenCalculationError';
  }
}
