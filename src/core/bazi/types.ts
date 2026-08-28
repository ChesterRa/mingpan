/**
 * Core BaZi Types
 * Domain models for BaZi calculations - language agnostic
 */

// Basic pillar structure
export interface Pillar {
  stem: string;      // 天干
  branch: string;    // 地支
  hiddenStems?: HiddenStem[];
  naYin?: string;
  selfSitting?: string; // 自坐 (Self-sitting relationship)
  void?: boolean;    // 空亡 (Whether this branch is void)
  voidBranches?: string[]; // 空亡地支 (All void branches for this pillar)
}

export interface HiddenStem {
  stem: string;
  power: number;     // 0-1
  isMain: boolean;
}

// BaZi chart structure
export interface BaziChart {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

// Five elements analysis - 中文键符合TASK_000中文内联开发原则
export interface FiveElementsAnalysis {
  木: number;
  火: number;
  土: number;
  金: number;
  水: number;
  total: number;
  balance: ElementBalance;
}

export interface ElementBalance {
  strongest: string;
  weakest: string;
  missing: string[];
  percentage?: Record<string, number>;
  distribution?: '平衡' | '失衡' | '严重失衡';
}

// Advanced analysis types
export interface TwelveGrowthStage {
  stage: string;
  element: string;
  branch: string;
  meaning: string;
  strength: number;
  power?: number;
  state?: string;
}

export interface NaYinInfo {
  name: string;
  element: string;
  meaning: string;
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  isLeapMonth: boolean;
  monthName?: string;
  dayName?: string;
}

// Input/Output types for BaziCore
export interface BaziCoreInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender?: 'male' | 'female';
  isLunar?: boolean;
  longitude?: number;
}

export interface BaziCoreResult {
  chart: BaziChart;
  birthInfo: {
    solar: Date;
    lunar: LunarDate;
    trueSolarTime?: Date;
    solarTerm?: string;
    adjacentSolarTermTime?: {
      previous: string;
      next: string;
    };
  };
  zodiac: string;
  dayMasterElement: string;
  naYin: NaYinInfo;
  fiveElements: FiveElementsAnalysis;
  voidBranches?: string[];
  twelveGrowthStages?: TwelveGrowthStage[];
  /** 命宫（《三命通会》子平法：子起正月逆数至生月，生时落月宫顺数至卯，五虎遁起干） */
  mingGong?: string;
  /** 胎元（《渊海子平》：月干进一位、月支进三位） */
  taiYuan?: string;
}

// Strength analysis (for components that need it)
export interface ElementStrength {
  element: string;
  state: string;
  count: number;
  percentage: number;
  stemSupport: number;
  branchSupport: number;
  strength: number;
  totalScore: number;
}

export interface ElementBalanceAnalysis {
  supportingElements: string[];
  suppressingElements: string[];
  dominantElement: string;
  weakestElement: string;
  balanced: boolean;
  balance: '平衡' | '失衡' | '高度失衡';
  analysis: string;
  dominant?: string;
  lacking?: string;
  suggestions: string[];
}