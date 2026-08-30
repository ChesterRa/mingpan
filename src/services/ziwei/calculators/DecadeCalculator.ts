/**
 * 大限计算器
 * 负责计算紫微斗数的大限信息
 * 整合了原 decadeFlow.ts 的增强功能
 */

import { 
  Palace, 
  BasicInfo, 
  DecadeInfo,
  FourPillars,
  HoroscopeInfo,
  PALACE_NAMES,
  PALACE_NAMES_EN
} from '../types';
import { IztroAdapter } from '../../../core/ziwei/IztroAdapter';
import { MutagenCore } from '../../../core/ziwei/MutagenCore';
import { calculateNominalAge } from '../../../utils/ageCalculator';
import { nowBeijingParts } from '../../../utils/wallTime';

export class DecadeCalculator {
  /**
   * 计算所有大限信息
   */
  static calculate(
    palaces: Palace[], 
    basicInfo: BasicInfo,
    fourPillars: FourPillars,
    gender: 'male' | 'female',
    birthYear: number
  ): DecadeInfo[] {
    
    // 找到命宫索引 - 支持多语言
    let mingGongIndex = palaces.findIndex(p => {
      const name = p.name.toLowerCase();
      // 检查各种可能的命宫名称
      return name === '命宮' || name === '命宫' || 
             name === 'life' || name === 'life palace' ||
             name === '명궁' || name === 'いのち' ||
             name.includes('命') || name.includes('life');
    });
    
    // 如果还是找不到，尝试使用标准宫位名称的第一个
    if (mingGongIndex === -1) {
      mingGongIndex = palaces.findIndex(p => 
        p.name === PALACE_NAMES[0] || p.name === PALACE_NAMES_EN[0]
      );
    }
    
    if (mingGongIndex === -1) {
      console.warn('Cannot find Ming Gong palace, using first palace as default');
      mingGongIndex = 0; // 使用第一个宫位作为默认命宫
    }
    
    
    // 获取起运年龄
    const startAge = this.getStartAge(basicInfo.fiveElement);
    
    // 判断顺逆行
    const isClockwise = this.isClockwise(fourPillars.year.stem, gender);
    
    const decades: DecadeInfo[] = [];
    
    // 如果起运年龄大于1，先添加童限（在命宫）
    if (startAge > 1) {
      decades.push({
        index: -1,
        palaceIndex: mingGongIndex,  // 童限在命宫
        startAge: 1,
        endAge: startAge - 1,
        heavenlyStem: palaces[mingGongIndex].heavenlyStem,
        earthlyBranch: palaces[mingGongIndex].earthlyBranch,
        palaceName: '童限',
        label: `童限 1-${startAge - 1}岁`
      });
    }
    
    // 生成12个大限 - 第一个大限从命宫开始计算
    let currentStartAge = startAge;
    for (let i = 0; i < 12; i++) {
      // 正确的计算：第一个大限（i=0）应该从命宫开始
      const palaceIndex = isClockwise 
        ? (mingGongIndex + i) % 12
        : (mingGongIndex - i + 12) % 12;
      
      const palace = palaces[palaceIndex];
      const endAge = currentStartAge + 9;
      
      
      decades.push({
        index: i,
        palaceIndex,
        startAge: currentStartAge,
        endAge: endAge,
        heavenlyStem: palace.heavenlyStem,
        earthlyBranch: palace.earthlyBranch,
        palaceName: palace.name,
        label: `${palace.name} ${currentStartAge}-${endAge}岁`
      });
      
      currentStartAge = endAge + 1;
    }
    
    
    return decades;
  }
  
  /**
   * 获取起运年龄
   */
  private static getStartAge(fiveElement: string): number {
    // 从五行局提取起运年龄
    if (fiveElement.includes('水二')) return 2;
    if (fiveElement.includes('木三')) return 3;
    if (fiveElement.includes('金四')) return 4;
    if (fiveElement.includes('土五')) return 5;
    if (fiveElement.includes('火六')) return 6;
    
    // 默认值
    return 3;
  }
  
  /**
   * 判断是否顺行
   */
  static isClockwise(yearStem: string, gender: 'male' | 'female'): boolean {
    // 阳干：甲、丙、戊、庚、壬
    const yangStems = ['甲', '丙', '戊', '庚', '壬'];
    const isYangYear = yangStems.includes(yearStem);
    const isMale = gender === 'male';
    
    // 阳男阴女顺行，阴男阳女逆行
    return (isYangYear && isMale) || (!isYangYear && !isMale);
  }
  
  /**
   * 根据年龄获取当前大限
   */
  static getCurrentDecade(age: number, decades: DecadeInfo[]): DecadeInfo | null {
    return decades.find(d => age >= d.startAge && age <= d.endAge) || null;
  }
  
  /**
   * 计算当前年龄（虚岁）
   */
  static getCurrentAge(birthYear: number, targetYear?: number): number {
    // 使用目标年份或当前年份计算虚岁
    const actualTargetYear = targetYear || nowBeijingParts().year;
    return actualTargetYear - birthYear + 1;  // 虚岁 = 目标年份 - 出生年份 + 1
  }
  
  /**
   * 获取增强的大限信息（包含四化、宫位名称变化等）
   */
  static getEnhancedDecadeInfo(
    decades: DecadeInfo[],
    adapter: IztroAdapter,
    birthYear: number
  ): DecadeInfo[] {
    return decades.map(decade => {
      // 计算该大限对应的年份 (虚岁转实际年份)
      const targetYear = birthYear + decade.startAge - 1;
      const dateStr = `${targetYear}-6-1`; // 使用年中日期避免边界问题
      
      try {
        const horoscope = adapter.getHoroscope(dateStr);
        if (horoscope?.decadal) {
          return {
            ...decade,
            heavenlyStem: horoscope.decadal.heavenlyStem || decade.heavenlyStem,
            earthlyBranch: horoscope.decadal.earthlyBranch || decade.earthlyBranch
          };
        }
      } catch (error) {
        console.error('Failed to get enhanced decade info:', error);
      }
      
      return decade;
    });
  }
  
  /**
   * 获取大限期间的宫位动态名称
   */
  static getDecadePalaceNames(
    mingGongIndex: number,
    decadeIndex: number,
    isClockwise: boolean
  ): string[] {
    const palaceNames = [
      '命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄',
      '遷移', '交友', '官祿', '田宅', '福德', '父母'
    ];
    
    // 计算大限命宫位置
    const decadeMingIndex = isClockwise 
      ? (mingGongIndex + decadeIndex) % 12
      : (mingGongIndex - decadeIndex + 12) % 12;
    
    // 重新排列宫位名称
    const result: string[] = new Array(12);
    for (let i = 0; i < 12; i++) {
      const currentIndex = (decadeMingIndex + i) % 12;
      result[currentIndex] = `限${palaceNames[i]}`;
    }
    
    return result;
  }
  
  /**
   * 计算大限天干（基于年干和大限索引）
   */
  static calculateDecadeStem(yearStem: string, decadeIndex: number): string {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const yearIndex = stems.indexOf(yearStem);
    
    if (yearIndex === -1) return '';
    
    // 大限天干计算规则（简化版）
    const decadeStemIndex = (yearIndex + decadeIndex * 2) % 10;
    return stems[decadeStemIndex];
  }
  
  /**
   * 判断某个宫位是否为指定大限的宫位
   */
  static isDecadePalace(
    palaceIndex: number,
    decades: DecadeInfo[],
    decadeIndex: number
  ): boolean {
    const decade = decades.find(d => d.index === decadeIndex);
    return decade ? decade.palaceIndex === palaceIndex : false;
  }
}