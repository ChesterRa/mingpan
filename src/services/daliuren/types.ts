/**
 * 大六壬服務類型定義
 * 
 * 設計原則：
 * - 排盤層：MCP 負責，輸出確定性結構
 * - 斷課層：交給 Agent/LLM
 * - 參考來源：kentang2017/kinliuren (MIT License)
 * 
 * 大六壬核心概念：
 * - 天地盤：以月將加時辰起盤
 * - 四課：由日干支推演
 * - 三傳：由四課通過九宗門推演
 * - 十二天將：貴人起點順逆排布
 */

// ============================================
// 基礎類型
// ============================================

/** 天干 */
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 地支 */
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 五行 */
export type WuXing = '金' | '木' | '水' | '火' | '土';

/** 六親 */
export type LiuQin = '父母' | '兄弟' | '子孫' | '妻財' | '官鬼';

/** 十二天將 */
export type TianJiang = 
  | '貴人' | '螣蛇' | '朱雀' | '六合' 
  | '勾陳' | '青龍' | '天空' | '白虎' 
  | '太常' | '玄武' | '太陰' | '天后';

/** 十二天將簡稱 */
export type TianJiangShort = 
  | '貴' | '蛇' | '雀' | '合' 
  | '勾' | '龍' | '空' | '虎' 
  | '常' | '玄' | '陰' | '后';

/** 月將（十二神） */
export type YueJiang = 
  | '登明' | '河魁' | '從魁' | '傳送' 
  | '小吉' | '勝光' | '太乙' | '天罡' 
  | '太沖' | '功曹' | '大吉' | '神後';

/** 課式格局 */
export type GeJu = 
  | '賊尅' | '比用' | '涉害' | '遙尅' 
  | '昴星' | '別責' | '八專' | '伏吟' | '返吟';

/** 課式細分 */
export type GeJuDetail = 
  | '元首' | '重審' | '知一' | '涉害' 
  | '蒿矢' | '彈射' | '虎視' | '冬蛇掩目'
  | '帷簿' | '自任' | '杜傳' | '無依' | '無親'
  | string;  // 還有很多細分格局

/** 陰陽 */
export type YinYang = '陽' | '陰';

/** 晝夜 */
export type DayNight = '晝' | '夜';

// ============================================
// 輸入類型
// ============================================

export interface DaliurenInput {
  /** 節氣（用於確定月將） */
  jieqi: string;
  
  /** 農曆月份（用於輔助判斷） */
  lunarMonth: number;
  
  /** 日干支 */
  dayGanZhi: string;
  
  /** 時干支 */
  hourGanZhi: string;
  
  /** 貴人起法：0=標準, 1=另一種 */
  guirenMethod?: 0 | 1;
}

/**
 * 公曆時間起課輸入（推薦）
 * 節氣、農曆月、日時干支由曆法自動推得
 */
export interface DaliurenTimeInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  /** 貴人起法：0=標準, 1=另一種 */
  guirenMethod?: 0 | 1;
}

// ============================================
// 天地盤
// ============================================

export interface TianDiPan {
  /** 天盤（十二地支，從時辰起） */
  tianPan: DiZhi[];
  
  /** 地盤（固定十二地支） */
  diPan: DiZhi[];
  
  /** 天將（十二天將排布） */
  tianJiang: TianJiangShort[];
  
  /** 月將 */
  yueJiang: DiZhi;
  
  /** 月將名稱 */
  yueJiangName: YueJiang;
  
  /** 地支對應天盤 */
  diToTian: Record<DiZhi, DiZhi>;
  
  /** 地支對應天將 */
  diToJiang: Record<DiZhi, TianJiangShort>;
}

// ============================================
// 四課
// ============================================

export interface SiKe {
  /** 課位（一課到四課） */
  position: 1 | 2 | 3 | 4;
  
  /** 上神（天盤地支） */
  shangShen: DiZhi;
  
  /** 下神（地盤地支或日干寄宮） */
  xiaShen: string;
  
  /** 天將 */
  tianJiang: TianJiangShort;
  
  /** 上下關係 */
  relation: '上尅下' | '下賊上' | '比和' | '上生下' | '下生上';
}

export interface SiKeInfo {
  /** 四課列表（一課到四課） */
  list: [SiKe, SiKe, SiKe, SiKe];
  
  /** 日干 */
  dayGan: TianGan;
  
  /** 日支 */
  dayZhi: DiZhi;
  
  /** 日干寄宮 */
  dayGanJiGong: DiZhi;
}

// ============================================
// 三傳
// ============================================

export interface ChuanInfo {
  /** 傳位（初傳/中傳/末傳） */
  position: '初傳' | '中傳' | '末傳';
  
  /** 地支 */
  diZhi: DiZhi;
  
  /** 天將 */
  tianJiang: TianJiangShort;
  
  /** 六親（相對於日干） */
  liuQin: string;
  
  /** 旬空（空亡干支） */
  xunKong: string | null;
}

export interface SanChuan {
  /** 初傳 */
  chuChuan: ChuanInfo;
  
  /** 中傳 */
  zhongChuan: ChuanInfo;
  
  /** 末傳 */
  moChuan: ChuanInfo;
  
  /** 格局 */
  geJu: GeJu;
  
  /** 格局細分 */
  geJuDetail: GeJuDetail;
}

// ============================================
// 神煞
// ============================================

export interface ShenSha {
  /** 日馬 */
  riMa: DiZhi;
  
  /** 月馬 */
  yueMa: DiZhi;
  
  /** 丁馬 */
  dingMa: DiZhi;
  
  /** 華蓋 */
  huaGai: DiZhi;
  
  /** 閃電 */
  shanDian: DiZhi;
  
  /** 其他神煞 */
  others?: Record<string, DiZhi>;
}

// ============================================
// 完整結果
// ============================================

export interface DaliurenResult {
  /** 基本信息 */
  basicInfo: {
    /** 節氣 */
    jieqi: string;
    /** 農曆月 */
    lunarMonth: string;
    /** 日干支 */
    dayGanZhi: string;
    /** 時干支 */
    hourGanZhi: string;
    /** 晝夜 */
    dayNight: DayNight;
  };
  
  /** 天地盤 */
  tianDiPan: TianDiPan;
  
  /** 四課 */
  siKe: SiKeInfo;
  
  /** 三傳 */
  sanChuan: SanChuan;
  
  /** 神煞 */
  shenSha: ShenSha;
}

// ============================================
// 服務配置
// ============================================

export interface DaliurenServiceConfig {
  /** 是否啟用調試模式 */
  debug?: boolean;
}
