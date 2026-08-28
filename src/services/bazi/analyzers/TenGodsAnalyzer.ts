/**
 * Ten Gods Analyzer
 * Analyzes the ten gods (十神) relationships in a BaZi chart
 */

import { BaziChart, TenGodInfo } from '../types';
import { TEN_GODS, HEAVENLY_STEMS, TEN_GODS_ARRAY } from '../../../core/constants/bazi';
import { POSITION_NAMES } from '../../../core/constants/positions';

// Ten God type definitions
export type TenGod = string; // Will use values from TEN_GODS_ARRAY

export interface TenGodAttribute {
  element: 'same' | 'generate' | 'control';
  relation: 'same' | 'different';
  nature: '吉' | '凶' | '中性';
  type: 'companion' | 'output' | 'wealth' | 'power' | 'resource';
  meaning: string;
}

export interface TenGodCombinationAnalysis {
  pattern: string;
  description: string;
  implications: string[];
}

export interface TenGodStrengthAnalysis {
  god: TenGod;
  influence: '有利' | '不利' | '中性';
  suggestion: string;
}

export interface CompleteTenGodAnalysis {
  distribution: TenGodInfo[];
  combinations: TenGodCombinationAnalysis[];
  strengthAnalysis: TenGodStrengthAnalysis[];
  summary: string;
  suggestions: string[];
}

export const TEN_GOD_ATTRIBUTES: Record<string, TenGodAttribute> = {
  [TEN_GODS_ARRAY[0]]: { element: 'same', relation: 'same', nature: '中性', type: 'companion', meaning: 'tengod:bijian:meaning' },
  [TEN_GODS_ARRAY[1]]: { element: 'same', relation: 'different', nature: '凶', type: 'companion', meaning: 'tengod:jiecai:meaning' },
  [TEN_GODS_ARRAY[2]]: { element: 'generate', relation: 'same', nature: '吉', type: 'output', meaning: 'tengod:shishen:meaning' },
  [TEN_GODS_ARRAY[3]]: { element: 'generate', relation: 'different', nature: '凶', type: 'output', meaning: 'tengod:shangguan:meaning' },
  [TEN_GODS_ARRAY[4]]: { element: 'control', relation: 'same', nature: '吉', type: 'wealth', meaning: 'tengod:piancai:meaning' },
  [TEN_GODS_ARRAY[5]]: { element: 'control', relation: 'different', nature: '吉', type: 'wealth', meaning: 'tengod:zhengcai:meaning' },
  [TEN_GODS_ARRAY[6]]: { element: 'control', relation: 'same', nature: '凶', type: 'power', meaning: 'tengod:qisha:meaning' },
  [TEN_GODS_ARRAY[7]]: { element: 'control', relation: 'different', nature: '吉', type: 'power', meaning: 'tengod:zhengguan:meaning' },
  [TEN_GODS_ARRAY[8]]: { element: 'generate', relation: 'same', nature: '中性', type: 'resource', meaning: 'tengod:pianyin:meaning' },
  [TEN_GODS_ARRAY[9]]: { element: 'generate', relation: 'different', nature: '吉', type: 'resource', meaning: 'tengod:zhengyin:meaning' }
};

export class TenGodsAnalyzer {
  /**
   * Calculate single ten god relationship
   */
  calculateTenGod(dayMaster: string, target: string): TenGod {
    return TEN_GODS[dayMaster]?.[target] || TEN_GODS_ARRAY[0];
  }

  /**
   * Get complete ten gods analysis for components
   */
  static analyzeComplete(chart: BaziChart, dayMaster: string, dayMasterStrength?: string): CompleteTenGodAnalysis {
    // Get distribution
    const distribution = this.analyze(chart, dayMaster);
    
    // Analyze combinations
    const combinations = this.analyzeCombinations(distribution);
    
    // Analyze strength influence
    const strengthAnalysis = this.analyzeStrengthInfluence(
      distribution, 
      dayMasterStrength || '正格'
    );
    
    // Generate summary
    const summary = this.generateSummary(distribution, combinations);
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(distribution, combinations, dayMasterStrength);
    
    return {
      distribution,
      combinations,
      strengthAnalysis,
      summary,
      suggestions
    };
  }

  /**
   * Analyze ten gods relationships in the chart
   */
  static analyze(chart: BaziChart, dayMaster: string): TenGodInfo[] {
    const results: TenGodInfo[] = [];
    
    // Analyze each pillar
    const pillars = [
      { position: POSITION_NAMES.year, stem: chart.year.stem },
      { position: POSITION_NAMES.month, stem: chart.month.stem },
      { position: POSITION_NAMES.hour, stem: chart.hour.stem }
    ];
    
    pillars.forEach(({ position, stem }) => {
      const tenGod = this.getTenGod(dayMaster, stem);
      const element = this.getStemElement(stem);
      const strength = this.calculateStrength(position, tenGod);
      
      results.push({
        name: tenGod,
        element,
        position,
        strength,
        interpretation: this.getInterpretation(tenGod, position)
      });
    });
    
    // Also analyze hidden stems in branches
    const branches = [
      { position: POSITION_NAMES.year, pillar: chart.year },
      { position: POSITION_NAMES.month, pillar: chart.month },
      { position: POSITION_NAMES.day, pillar: chart.day },
      { position: POSITION_NAMES.hour, pillar: chart.hour }
    ];
    
    branches.forEach(({ position, pillar }) => {
      if (pillar.hiddenStems) {
        // 全部藏干（本氣/中氣/餘氣）均推十神，供渲染層完整標注
        pillar.hiddenStems.forEach(hidden => {
          const tenGod = this.getTenGod(dayMaster, hidden.stem);
          const element = this.getStemElement(hidden.stem);
          const strength = this.calculateStrength(position, tenGod) * hidden.power;

          results.push({
            name: `${tenGod}(hidden)`,
            element,
            position,
            stem: hidden.stem,
            strength,
            interpretation: this.getInterpretation(tenGod, position)
          });
        });
      }
    });
    
    return results;
  }
  
  /**
   * Get ten god relationship between two stems
   */
  private static getTenGod(dayMaster: string, stem: string): string {
    return TEN_GODS[dayMaster]?.[stem] || '';
  }
  
  /**
   * Get element of a stem
   */
  private static getStemElement(stem: string): string {
    const stemData = HEAVENLY_STEMS.find(s => s.name === stem);
    return stemData?.element || '';
  }
  
  /**
   * Calculate strength based on position
   */
  private static calculateStrength(position: string, tenGod: string): number {
    // Position weights
    const positionWeights: Record<string, number> = {
      'month': 1.5,  // Month pillar is strongest
      'hour': 1.2,   // Hour pillar is second
      'year': 1.0,   // Year pillar is third
      'day': 0.8     // Day pillar (for hidden stems)
    };
    
    // Ten god type weights
    const tenGodWeights: Record<string, number> = {
      [TEN_GODS_ARRAY[7]]: 1.2,  // 正官
      [TEN_GODS_ARRAY[6]]: 1.1,  // 七殺
      [TEN_GODS_ARRAY[5]]: 1.1,  // 正財
      [TEN_GODS_ARRAY[4]]: 1.0,  // 偏財
      [TEN_GODS_ARRAY[9]]: 1.1,  // 正印
      [TEN_GODS_ARRAY[8]]: 1.0,  // 偏印
      [TEN_GODS_ARRAY[2]]: 1.0,  // 食神
      [TEN_GODS_ARRAY[3]]: 0.9,  // 傷官
      [TEN_GODS_ARRAY[0]]: 1.0,  // 比肩
      [TEN_GODS_ARRAY[1]]: 0.9   // 劫財
    };
    
    const posWeight = positionWeights[position] || 1.0;
    const godWeight = tenGodWeights[tenGod] || 1.0;
    
    return posWeight * godWeight;
  }
  
  /**
   * Get interpretation for ten god in position
   */
  private static getInterpretation(tenGod: string, position: string): string {
    // Return Chinese description directly
    const interpretations: Record<string, Record<string, string>> = {
      '比肩': {
        [POSITION_NAMES.year]: '年柱比肩，兄弟姐妹緣份深',
        [POSITION_NAMES.month]: '月柱比肩，朋友支持力強',
        [POSITION_NAMES.day]: '日柱比肩，自信獨立',
        [POSITION_NAMES.hour]: '時柱比肩，子女獨立性強'
      },
      '劫財': {
        [POSITION_NAMES.year]: '年柱劫財，幼年競爭激烈',
        [POSITION_NAMES.month]: '月柱劫財，青年奮鬥求進',
        [POSITION_NAMES.day]: '日柱劫財，競爭意識強',
        [POSITION_NAMES.hour]: '時柱劫財，晚年有鬥志'
      },
      '食神': {
        [POSITION_NAMES.year]: '年柱食神，童年快樂',
        [POSITION_NAMES.month]: '月柱食神，青年有才華',
        [POSITION_NAMES.day]: '日柱食神，感情豐富',
        [POSITION_NAMES.hour]: '時柱食神，晚年享福'
      },
      '傷官': {
        [POSITION_NAMES.year]: '年柱傷官，幼年叛逆',
        [POSITION_NAMES.month]: '月柱傷官，青年創新',
        [POSITION_NAMES.day]: '日柱傷官，感情多變',
        [POSITION_NAMES.hour]: '時柱傷官，子女叛逆'
      },
      '偏財': {
        [POSITION_NAMES.year]: '年柱偏財，祖上有財',
        [POSITION_NAMES.month]: '月柱偏財，青年發財',
        [POSITION_NAMES.day]: '日柱偏財，配偶有助',
        [POSITION_NAMES.hour]: '時柱偏財，晚年富足'
      },
      '正財': {
        [POSITION_NAMES.year]: '年柱正財，家境優渥',
        [POSITION_NAMES.month]: '月柱正財，事業穩定',
        [POSITION_NAMES.day]: '日柱正財，配偶賢淑',
        [POSITION_NAMES.hour]: '時柱正財，子女孝順'
      },
      '七殺': {
        [POSITION_NAMES.year]: '年柱七殺，幼年辛苦',
        [POSITION_NAMES.month]: '月柱七殺，青年壓力',
        [POSITION_NAMES.day]: '日柱七殺，意志堅強',
        [POSITION_NAMES.hour]: '時柱七殺，晚年有權'
      },
      '正官': {
        [POSITION_NAMES.year]: '年柱正官，家教嚴謹',
        [POSITION_NAMES.month]: '月柱正官，事業有成',
        [POSITION_NAMES.day]: '日柱正官，配偶正派',
        [POSITION_NAMES.hour]: '時柱正官，子女有成'
      },
      '偏印': {
        [POSITION_NAMES.year]: '年柱偏印，神祖保佑',
        [POSITION_NAMES.month]: '月柱偏印，學習能力強',
        [POSITION_NAMES.day]: '日柱偏印，思想獨特',
        [POSITION_NAMES.hour]: '時柱偏印，晚年好學'
      },
      '正印': {
        [POSITION_NAMES.year]: '年柱正印，母慈子孝',
        [POSITION_NAMES.month]: '月柱正印，貴人相助',
        [POSITION_NAMES.day]: '日柱正印，配偶溫柔',
        [POSITION_NAMES.hour]: '時柱正印，晚年安康'
      }
    };
    
    const godInterpretations = interpretations[tenGod];
    if (godInterpretations && godInterpretations[position]) {
      return godInterpretations[position];
    }
    
    return `${position}${tenGod}`;
  }
  
  /**
   * Analyze ten god combinations
   */
  private static analyzeCombinations(distribution: TenGodInfo[]): TenGodCombinationAnalysis[] {
    const analyses: TenGodCombinationAnalysis[] = [];
    
    // Count ten gods by name
    const counts: Record<string, number> = {};
    distribution.forEach(info => {
      const baseName = info.name.replace('(hidden)', '');
      counts[baseName] = (counts[baseName] || 0) + 1;
    });
    
    // Analyze patterns
    if (counts[TEN_GODS_ARRAY[7]] && counts[TEN_GODS_ARRAY[6]]) {  // 正官, 七殺
      analyses.push({
        pattern: 'mixed_officer_killer',
        description: 'tengod_pattern:mixed_officer_killer:description',
        implications: [
          'tengod_pattern:mixed_officer_killer:implication:1',
          'tengod_pattern:mixed_officer_killer:implication:2',
          'tengod_pattern:mixed_officer_killer:implication:3'
        ]
      });
    }
    
    if (counts[TEN_GODS_ARRAY[5]] && counts[TEN_GODS_ARRAY[4]]) {  // 正財, 偏財
      analyses.push({
        pattern: 'mixed_wealth',
        description: 'tengod_pattern:mixed_wealth:description',
        implications: [
          'tengod_pattern:mixed_wealth:implication:1',
          'tengod_pattern:mixed_wealth:implication:2',
          'tengod_pattern:mixed_wealth:implication:3'
        ]
      });
    }
    
    if (counts[TEN_GODS_ARRAY[9]] && counts[TEN_GODS_ARRAY[8]]) {  // 正印, 偏印
      analyses.push({
        pattern: 'mixed_seal',
        description: 'tengod_pattern:mixed_seal:description',
        implications: [
          'tengod_pattern:mixed_seal:implication:1',
          'tengod_pattern:mixed_seal:implication:2',
          'tengod_pattern:mixed_seal:implication:3'
        ]
      });
    }
    
    if (counts[TEN_GODS_ARRAY[2]] && counts[TEN_GODS_ARRAY[3]]) {  // 食神, 傷官
      analyses.push({
        pattern: 'output_combination',
        description: 'tengod_pattern:output_combination:description',
        implications: [
          'tengod_pattern:output_combination:implication:1',
          'tengod_pattern:output_combination:implication:2',
          'tengod_pattern:output_combination:implication:3'
        ]
      });
    }
    
    const totalCompanion = (counts[TEN_GODS_ARRAY[0]] || 0) + (counts[TEN_GODS_ARRAY[1]] || 0);  // 比肩, 劫財
    if (totalCompanion >= 3) {
      analyses.push({
        pattern: 'excessive_companion',
        description: 'tengod_pattern:excessive_companion:description',
        implications: [
          'tengod_pattern:excessive_companion:implication:1',
          'tengod_pattern:excessive_companion:implication:2',
          'tengod_pattern:excessive_companion:implication:3'
        ]
      });
    }
    
    return analyses;
  }
  
  /**
   * Analyze strength influence on ten gods
   */
  private static analyzeStrengthInfluence(
    distribution: TenGodInfo[], 
    dayMasterStrength: string
  ): TenGodStrengthAnalysis[] {
    const analyses: TenGodStrengthAnalysis[] = [];
    
    // Get unique ten gods
    const uniqueGods = new Set<string>();
    distribution.forEach(info => {
      uniqueGods.add(info.name.replace('(hidden)', ''));
    });
    
    uniqueGods.forEach(god => {
      const attr = TEN_GOD_ATTRIBUTES[god as TenGod];
      if (!attr) return;
      
      let influence: '有利' | '不利' | '中性' = '中性';
      let suggestion = '日主平衡，此神影響中性，順其自然';
      
      if (dayMasterStrength === '身弱' || dayMasterStrength === '衰极') {
        // Weak day master prefers resource and companion
        if (attr.type === 'resource' || attr.type === 'companion') {
          influence = '有利';
          suggestion = '日主弱，此神有助，宜加強利用';
        } else if (attr.type === 'power' || attr.type === 'output') {
          influence = '不利';
          suggestion = '日主弱，此神耗消，宜謹慎使用';
        }
      } else if (dayMasterStrength === '身旺' || dayMasterStrength === '旺极') {
        // Strong day master prefers output and wealth
        if (attr.type === 'output' || attr.type === 'wealth') {
          influence = '有利';
          suggestion = '日主強，此神化洩，宜積極利用';
        } else if (attr.type === 'resource' || attr.type === 'companion') {
          influence = '不利';
          suggestion = '日主強，此神加強，宜適度控制';
        }
      }
      
      analyses.push({
        god: god as TenGod,
        influence,
        suggestion
      });
    });
    
    return analyses;
  }
  
  /**
   * Generate summary of ten gods analysis
   */
  private static generateSummary(
    distribution: TenGodInfo[], 
    combinations: TenGodCombinationAnalysis[]
  ): string {
    // Count by type
    const typeCounts: Record<string, number> = {
      companion: 0,
      output: 0,
      wealth: 0,
      power: 0,
      resource: 0
    };
    
    distribution.forEach(info => {
      const god = info.name.replace('(hidden)', '') as TenGod;
      const attr = TEN_GOD_ATTRIBUTES[god];
      if (attr) {
        typeCounts[attr.type]++;
      }
    });
    
    // Find dominant type
    const dominantType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    // Return translation key for summary
    const typeKey = dominantType || '平衡';
    const combinationKey = combinations.length > 0 ? combinations[0].pattern : 'none';
    
    return `tengod_summary:${typeKey}:${combinationKey}`;
  }
  
  /**
   * Generate suggestions based on analysis
   */
  private static generateSuggestions(
    distribution: TenGodInfo[],
    combinations: TenGodCombinationAnalysis[],
    dayMasterStrength?: string
  ): string[] {
    const suggestions: string[] = [];
    
    // Add combination-based suggestions
    combinations.forEach(combo => {
      suggestions.push(`tengod_suggestion:pattern:${combo.pattern}`);
    });
    
    // Add strength-based suggestions
    if (dayMasterStrength === '身弱' || dayMasterStrength === '衰极') {
      suggestions.push('加強印比之力，求得生扶');
      suggestions.push('避免過度消耗，保存實力');
    } else if (dayMasterStrength === '身旺' || dayMasterStrength === '旺极') {
      suggestions.push('利用食傷財官，流通能量');
      suggestions.push('避免過度印比，保持平衡');
    }
    
    // Add general suggestions
    suggestions.push('了解十神特性，順勢而為');
    suggestions.push('平衡五行能量，和諧發展');
    
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }
}