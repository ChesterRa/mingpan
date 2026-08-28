/**
 * BaZi Service Type Definitions
 * Comprehensive types for the unified BaZi service
 */

// Basic Types
export type Language = 'zh-TW' | 'zh-CN' | 'en' | 'ja';
export type Gender = 'male' | 'female';
export type DayMasterStrength = '衰极' | '身弱' | '偏弱' | '中和' | '偏强' | '身旺' | '旺极';

// Input Types
export interface BaziInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender?: Gender;
  longitude?: number; // For true solar time adjustment
  name?: string; // Optional name for personal reference
  useLunar?: boolean; // Whether to use lunar calendar
  options?: BaziOptions;
}

export interface BaziOptions {
  includeEnhanced?: boolean;  // Include taro-bazi enhanced features
  includeShenSha?: boolean;   // Include Shen Sha analysis
  includeTraditional?: boolean; // 计算用神分析（流月/流日列表工具的内部输入）
  timeRange?: {              // For Da Yun and Liu Nian calculations
    startYear?: number;
    endYear?: number;
  };
  language?: Language;
}

// Core Types
export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Branch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
export type FiveElement = '木' | '火' | '土' | '金' | '水';

// Chinese Date for calculations
export interface ChineseDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  isLeapMonth?: boolean;
}

// Core Data Structures
export interface BaziChart {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

export interface Pillar {
  stem: string;      // 天干 (Heavenly Stem)
  branch: string;    // 地支 (Earthly Branch)
  hiddenStems?: HiddenStem[]; // 藏干
  naYin?: string;    // 纳音
  selfSitting?: string; // 自坐 (Self-sitting relationship)
  void?: boolean;    // 空亡 (Whether this branch is void)
  voidBranches?: string[]; // 空亡地支 (All void branches for this pillar)
}

export interface HiddenStem {
  stem: string;
  power: number;  // Power coefficient (0-1)
  isMain: boolean;
}

// Basic Analysis Types - 中文键符合TASK_000中文内联开发原则
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
  distribution?: '平衡' | '失衡' | '严重失衡';
}

export interface TenGodInfo {
  name: string;
  element: string;
  position: '年柱' | '月柱' | '日柱' | '時柱';
  strength: number;
  /** 藏干十神对应的藏干（天干十神无此字段） */
  stem?: string;
  interpretation?: string;
}

export interface QuantitativeStrengthAnalysis {
  dayMasterStrength: DayMasterStrength;
  totalScore: number;
  breakdown: {
    base: number;           // 36-point base
    monthSupport: number;   // Monthly support
    stemSupport: number;    // Stem relationships
    branchSupport: number;  // Branch relationships
    seasonalAdjustment: number;
    branchInteractionAdjustment?: number; // Branch interaction adjustments
  };
  percentage: number;
  analysis: string;
  details?: Array<{
    category: 'base' | 'stem' | 'root' | 'interaction';
    item: string;
    score: number;
    adjustment: number;
    adjustmentString?: string; // Original adjustment description
    finalScore?: number; // Final score after adjustments
  }>;
  characteristics?: string[];
  recommendations?: string[];
}

export interface BranchRelations {
  clashes: RelationPair[];      // 冲
  combines: RelationPair[];     // 合
  harms: RelationPair[];        // 害
  punishments: RelationPair[];  // 刑
  destructions: RelationPair[]; // 破
  threeHarmony: string[][];     // 三合
  directional: string[][];      // 方合
}

export interface RelationPair {
  branch1: string;
  branch2: string;
  position1: string;
  position2: string;
  type: string;
  impact: '正面' | '负面' | '中性';
}

export interface ClimateAnalysis {
  temperature: '寒' | '凉' | '中性' | '暖' | '热';
  humidity: '燥' | '偏燥' | '平衡' | '偏湿' | '湿';
  season: string;
  adjustment: string;
  suggestions: string[];
}

export interface TwelveGrowthStage {
  stage: string;
  element: string;
  branch: string;
  meaning: string;
  strength: number;
}

// Traditional Analysis Types
export interface YongShenAnalysis {
  yongShen: string[];     // 用神
  xiShen: string[];       // 喜神
  jiShen: string[];       // 忌神
  xianShen: string[];     // 闲神
  explanation: string;
  recommendations?: YongShenRecommendations; // Actionable recommendations
}

export interface YongShenRecommendations {
  career: CareerRecommendations;
  lifestyle: LifestyleRecommendations;
  relationships: RelationshipRecommendations;
  health: HealthRecommendations;
  luck: LuckEnhancers;
  fengShui: FengShuiSuggestions;
}

export interface CareerRecommendations {
  favorableIndustries: string[]; // Translation keys
  avoidIndustries: string[]; // Translation keys
  idealRoles: string[]; // Translation keys
  workEnvironment: string[]; // Translation keys
  businessPartners: string[]; // Elements to seek in partners
  timing: string; // Best period for career moves
}

export interface LifestyleRecommendations {
  dailyHabits: string[]; // Translation keys
  exercises: string[]; // Translation keys
  hobbies: string[]; // Translation keys
  environment: string[]; // Translation keys
  diet: string[]; // Translation keys
  schedule: string; // Best daily rhythm
}

export interface RelationshipRecommendations {
  compatibleElements: string[]; // Elements
  communicationStyle: string[]; // Translation keys
  socialActivities: string[]; // Translation keys
  partnerQualities: string[]; // Translation keys
  conflictResolution: string[]; // Translation keys
  familyDynamics: string; // Translation key
}

export interface HealthRecommendations {
  preventiveMeasures: string[]; // Translation keys
  vulnerableAreas: string[]; // Translation keys
  exercises: string[]; // Translation keys
  dietaryGuidelines: string[]; // Translation keys
  seasonalCare: string[]; // Translation keys
  stressManagement: string[]; // Translation keys
}

export interface LuckEnhancers {
  colors: string[]; // Translation keys for color names
  numbers: number[]; // Lucky numbers
  directions: string[]; // Translation keys for directions
  seasons: string[]; // Translation keys for seasons
  timeOfDay: string[]; // Translation keys for time periods
  materials: string[]; // Translation keys for materials/textures
}

export interface FengShuiSuggestions {
  homeLayout: string[]; // Translation keys
  officeSetup: string[]; // Translation keys
  sleepDirection: string; // Translation key
  decorElements: string[]; // Translation keys
  plants: string[]; // Translation keys
  avoidPlacements: string[]; // Translation keys
}

export interface DaYun {
  index: number;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  stem: string;
  branch: string;
  tenGod: string;
  analysis?: DaYunAnalysis;
  voidBranches?: string[]; // 空亡地支 for this period
}

export interface DaYunAnalysis {
  fortune: '优秀' | '良好' | '一般' | '挑战' | '困难';
  career: FortunePrediction;
  wealth: FortunePrediction;
  relationships: FortunePrediction;
  health: FortunePrediction;
  suggestions: string[];
}

export interface LiuNian {
  year: number;
  age: number;
  stem: string;
  branch: string;
  zodiac: string;
  tenGod: string;
  analysis?: LiuNianAnalysis;
}

export interface LiuNianAnalysis {
  overall: '优秀' | '良好' | '一般' | '挑战';
  events: string[];
  warnings: string[];
  opportunities: string[];
}

export interface FortunePrediction {
  rating: number; // 1-10
  trend: '上升' | '稳定' | '下降';
  description: string;
}

// Liu Yue (Monthly) Types
export interface LiuYueInfo {
  month: number;
  stem: Stem;
  branch: Branch;
  startDate: Date;
  endDate: Date;
  fortune: string;
  rating: number;
  mainInfluences: string[];
  opportunities: string[];
  challenges: string[];
  recommendations: string[];
  healthFocus: string[];
  luckyDays: number[];
  solarTerm?: {
    name: string;
    date: Date;
  };
}

export interface LiuYue {
  year: number;
  month: number;
  stem: string;
  branch: string;
  tenGod: string;
  element: string;
  season: string;
  analysis?: LiuYueAnalysis;
}

export interface LiuYueAnalysis {
  overall: '优秀' | '良好' | '一般' | '挑战';
  career: FortunePrediction;
  wealth: FortunePrediction;
  relationships: FortunePrediction;
  health: HealthIndicator;
  luckyDays: number[];
  unluckyDays: number[];
  activities: ActivitySuggestion[];
  elementBalance: ElementShift;
  monthlyTheme: string;
}

export interface HealthIndicator {
  stressLevel: 'low' | 'moderate' | 'high';
  vulnerableAreas: string[];
  preventiveMeasures: string[];
  energyLevel: number; // 1-10
}

export interface ActivitySuggestion {
  type: 'travel' | 'negotiation' | 'investment' | 'relationship' | 'study' | 'rest' | 'medical';
  favorability: '大吉' | '吉' | '中性' | '凶';
  reason: string;
}

export interface ElementShift {
  dominant: string;
  trend: '增强' | '减弱' | '稳定';
  impact: string;
}

// Liu Ri (Daily) Types
export interface LiuRiInfo {
  date: Date;
  day: number;
  stem: Stem;
  branch: Branch;
  fortune: string;
  rating: number;
  mainInfluences: string[];
  activities: {
    favorable: string[];
    avoid: string[];
  };
  luckyHours: number[];
  hourlyFortunes: Array<{
    hour: string;
    branch: Branch;
    rating: number;
    activity: string;
  }>;
  energy: string;
  mood: string;
  opportunities: string[];
  warnings: string[];
}

export interface LiuRi {
  date: Date;
  stem: string;
  branch: string;
  tenGod: string;
  element: string;
  analysis?: LiuRiAnalysis;
}

export interface LiuRiAnalysis {
  rating: number; // 1-10 quick daily rating
  quality: '优秀' | '良好' | '一般' | '挑战' | '困难';
  activities: DailyActivity[];
  hourlyAnalysis?: HourlyAnalysis[];
  almanacInfo: AlmanacInfo;
  quickTips: string[];
  elementalFlow: ElementalFlow;
  biorhythm: BiorhythmIndicator;
}

export interface DailyActivity {
  activity: string; // Translation key for activity type
  suitability: '大宜' | '宜' | '中性' | '忌' | '大忌';
  bestHours?: number[]; // 0-23 hours
  reason?: string; // Translation key
}

export interface HourlyAnalysis {
  hour: number; // 0-23
  stem: string;
  branch: string;
  quality: '优秀' | '良好' | '中性' | '较差';
  activities: string[]; // Suitable activities for this hour
}

export interface AlmanacInfo {
  suitable: string[]; // 宜 - Suitable activities (translation keys)
  avoid: string[]; // 忌 - Activities to avoid (translation keys)
  auspiciousHours: number[]; // Lucky hours
  inauspiciousHours: number[]; // Unlucky hours
  conflictZodiac?: string; // Zodiac sign in conflict today
}

export interface ElementalFlow {
  dominant: string; // Dominant element of the day
  interaction: '和谐' | '中性' | '冲突';
  advice: string; // Translation key for elemental advice
}

export interface BiorhythmIndicator {
  physical: number; // 1-10
  emotional: number; // 1-10
  intellectual: number; // 1-10
  overall: number; // 1-10
}

// Main Result Type
export interface BaziResult {
  // Core Data
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
  
  // Basic Analysis
  basic: {
    zodiac: string;
    mingGong?: string;
    taiYuan?: string;
    dayMaster: string;
    dayMasterElement: string;
    fiveElements: FiveElementsAnalysis;
    tenGods: TenGodInfo[];
  };
  
  // Traditional Analysis
  traditional?: {
    yongShen: YongShenAnalysis;
  };
  
  // Enhanced Analysis (taro-bazi features)
  enhanced?: {
    strengthAnalysis: QuantitativeStrengthAnalysis;
    twelveGrowthStages: TwelveGrowthStage[];
    voidBranches: string[];
    branchRelations: any; // Using RelationsResult from analyzer
    climate: ClimateAnalysis;
    monthStrength: number;
    patternAnalysis?: any; // PatternAnalysisResult from analyzer
  };
  
  // Time-based Analysis
  timeBased: {
    daYun: DaYun[];
    currentDaYun?: DaYun;
    liuNian?: LiuNian[];
    currentLiuNian?: LiuNian;        // Monthly fortune   // Current month          // Daily fortune       // Today's fortune
  };
  
  // Metadata
  meta: {
    calculatedAt: Date;
    version: string;
    options: BaziOptions;
    luckSequence?: any; // Luck sequence information from LuckCycleCalculator
  };
}

// Supporting Types
export interface LunarDate {
  year: number;
  month: number;
  day: number;
  hour?: number;
  isLeapMonth: boolean;
  yearName?: string;
  monthName?: string;
  dayName?: string;
}

export interface BaziServiceConfig {
  defaultLanguage?: Language;
  enableCaching?: boolean;
  debug?: boolean;
  // When true, compute continues with safe fallbacks instead of throwing.
  // Use strictly for share rendering to avoid breaking UX.
  lenient?: boolean;
}

// Error Types
export class BaziCalculationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BaziCalculationError';
  }
}

// Translation Types
export interface TranslatedBaziResult extends BaziResult {
  translations: {
    stems: Record<string, string>;
    branches: Record<string, string>;
    elements: Record<string, string>;
    tenGods: Record<string, string>;
    shenSha?: Record<string, string>;
  };
}

// Compatibility Types for Components
// These types are designed to make component usage easier while maintaining consistency

/**
 * Birth information for BaZi calculation
 * Compatible with component forms
 */
export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: 'male' | 'female';
  name?: string;
  isLunar?: boolean;
  longitude?: number;
}

/**
 * Simple BaZi pillar for display components
 */
export interface BaziPillar {
  stem: string;
  branch: string;
}

/**
 * Five elements count for components
 * Uses English property names for language independence
 */
export interface FiveElementsCount {
  木: number;
  火: number;
  土: number;
  金: number;
  水: number;
}

/**
 * Simplified BaZi analysis for components
 * This is a flattened version of BaziResult for easier component usage
 */
