/**
 * Iztro 库适配器
 * 封装所有与 iztro 库的交互，提供统一的接口
 */

import { astro } from 'iztro';
import { Solar } from 'lunar-javascript';

import { 
  ZiweiInput, 
  BasicInfo, 
  Palace, 
  FourPillars,
  StarWithMutagen,
  MutagenInfo,
  HOUR_TO_INDEX,
  ZiweiCalculationError
} from '../../services/ziwei/types';

export class IztroAdapter {
  private astrolabe: any = null;
  private birthDate: string = '';
  private birthYear: number = 0;
  private gender: string = '';
  private language: string = 'zh-TW';
  
  /**
   * 初始化适配器
   */
  init(input: ZiweiInput): void {
    try {
      // 格式化日期
      // 口径（2026-08-30 裁定）：子初换日——23:00 起即属次日（与八字/六爻/大六壬/奇门统一，
    // 不采用明末清初以后的「早晚子时」区分说）
    const birthSolar = input.hour === 23
      ? Solar.fromYmd(input.year, input.month, input.day).next(1)
      : Solar.fromYmd(input.year, input.month, input.day);
    const dateStr = `${birthSolar.getYear()}-${birthSolar.getMonth().toString().padStart(2, '0')}-${birthSolar.getDay().toString().padStart(2, '0')}`;
      const hourIndex = HOUR_TO_INDEX[input.hour] || 0;
      
      // 保存基本信息
      this.birthDate = dateStr;
      this.birthYear = input.year;
      this.gender = input.gender;
      this.language = input.language || 'zh-TW';
      
      // 创建命盘
      this.astrolabe = astro.bySolar(
        dateStr, 
        hourIndex, 
        input.gender as any, 
        false, 
        this.language
      );
      
      if (!this.astrolabe) {
        throw new ZiweiCalculationError(
          'Failed to create astrolabe',
          'ASTROLABE_CREATION_FAILED'
        );
      }
    } catch (error) {
      throw new ZiweiCalculationError(
        'Failed to initialize IztroAdapter',
        'INIT_FAILED',
        error
      );
    }
  }
  
  /**
   * 获取基本信息
   */
  getBasicInfo(): BasicInfo {
    if (!this.astrolabe) {
      throw new ZiweiCalculationError('Adapter not initialized', 'NOT_INITIALIZED');
    }
    
    return {
      zodiac: this.getZodiac(),
      constellation: this.getConstellation(),
      fourPillars: this.getFourPillars(),
      fiveElement: this.astrolabe.fiveElementsClass || '',
      soul: String(this.astrolabe.soul || ''),
      body: String(this.astrolabe.body || '')
    };
  }
  
  /**
   * 获取四柱信息
   */
  getFourPillars(): FourPillars {
    // 优先从 rawDates 获取
    const rawDates = this.astrolabe?.rawDates;
    if (rawDates?.chineseDate) {
      return {
        year: { 
          stem: rawDates.chineseDate.yearly?.[0] || '', 
          branch: rawDates.chineseDate.yearly?.[1] || '' 
        },
        month: { 
          stem: rawDates.chineseDate.monthly?.[0] || '', 
          branch: rawDates.chineseDate.monthly?.[1] || '' 
        },
        day: { 
          stem: rawDates.chineseDate.daily?.[0] || '', 
          branch: rawDates.chineseDate.daily?.[1] || '' 
        },
        hour: { 
          stem: rawDates.chineseDate.hourly?.[0] || '', 
          branch: rawDates.chineseDate.hourly?.[1] || '' 
        }
      };
    }
    
    // 默认返回空值
    return {
      year: { stem: '', branch: '' },
      month: { stem: '', branch: '' },
      day: { stem: '', branch: '' },
      hour: { stem: '', branch: '' }
    };
  }
  
  /**
   * 获取所有宫位信息
   */
  getPalaces(): Palace[] {
    if (!this.astrolabe?.palaces) {
      return [];
    }
    
    return this.astrolabe.palaces.map((palace: any, index: number) => {
      const majorStars = this.extract(palace.majorStars || [], 'major');
      const minorStars = this.extract(palace.minorStars || [], 'minor');
      const adjectiveStars = this.extract(palace.adjectiveStars || [], 'auxiliary');
      
      // 合并杂曜到辅星列表，并添加类型标记
      const allMinorStars = [
        ...minorStars,
        ...adjectiveStars
      ];
      
      return {
        name: palace.name || '',
        index,
        position: this.getPositionFromBranch(palace.earthlyBranch),
        earthlyBranch: palace.earthlyBranch || '',
        heavenlyStem: palace.heavenlyStem || '',
        majorStars,
        minorStars: allMinorStars,
        isBodyPalace: palace.isBodyPalace || false,
        // 保留额外信息供将来使用
        extras: {
          changsheng12: palace.changsheng12,
          boshi12: palace.boshi12,
          jiangqian12: palace.jiangqian12,
          suiqian12: palace.suiqian12,
          ages: palace.ages
        }
      };
    });
  }
  
  /**
   * 获取运限信息
   */
  getHoroscope(date: string, timeIndex?: number): any {
    if (!this.astrolabe) return null;
    
    try {
      // 如果提供了时辰索引，则传递给horoscope方法
      if (timeIndex !== undefined) {
        return this.astrolabe.horoscope(date, timeIndex);
      }
      return this.astrolabe.horoscope(date);
    } catch (error) {
      console.error('Failed to get horoscope:', error);
      return null;
    }
  }
  
  /**
   * 获取性别
   */
  getGender(): string {
    return this.gender;
  }
  
  /**
   * 获取语言
   */
  getLanguage(): string {
    return this.language;
  }
  
  /**
   * 获取农历日期
   */
  getLunarDate(): { year: number; month: number; day: number; isLeapMonth: boolean } {
    const rawDates = this.astrolabe?.rawDates;
    return {
      year: rawDates?.lunarDate?.lunarYear || 0,
      month: rawDates?.lunarDate?.lunarMonth || 0,
      day: rawDates?.lunarDate?.lunarDay || 0,
      isLeapMonth: rawDates?.lunarDate?.isLeap || false
    };
  }
  
  /**
   * 根据天干获取四化
   */
  getMutagenByStem(stem: string): MutagenInfo {
    // 四化对照表
    const mutagenMap: Record<string, [string, string, string, string]> = {
      '甲': ['廉貞', '破軍', '武曲', '太陽'],
      '乙': ['天機', '天梁', '紫微', '太陰'],
      '丙': ['天同', '天機', '文昌', '廉貞'],
      '丁': ['太陰', '天同', '天機', '巨門'],
      '戊': ['貪狼', '太陰', '右弼', '天機'],
      '己': ['武曲', '貪狼', '天梁', '文曲'],
      '庚': ['太陽', '武曲', '太陰', '天同'],
      '辛': ['巨門', '太陽', '文曲', '文昌'],
      '壬': ['天梁', '紫微', '左輔', '武曲'],
      '癸': ['破軍', '巨門', '太陰', '貪狼']
    };
    
    const mutagen = mutagenMap[stem] || ['', '', '', ''];
    return {
      lu: mutagen[0],
      quan: mutagen[1],
      ke: mutagen[2],
      ji: mutagen[3]
    };
  }
  
  /**
   * 获取年干（用于本命四化）
   */
  getYearStem(): string {
    const fourPillars = this.getFourPillars();
    return fourPillars.year.stem;
  }
  
  // ==================== 私有辅助方法 ====================
  
  /**
   * 提取星曜信息
   */
  private extract(stars: any[], category: 'major' | 'minor' | 'auxiliary' = 'major'): StarWithMutagen[] {
    if (!Array.isArray(stars)) return [];
    
    return stars
      .filter(star => star && star.name)
      .map(star => {
        // 确定星曜的具体类型
        let starType: 'major' | 'minor' | 'auxiliary' | 'flower' | 'helper' = category;
        
        // 根据iztro返回的type进一步细分
        if (star.type === 'flower') {
          starType = 'flower';
        } else if (star.type === 'helper') {
          starType = 'helper';
        } else if (category === 'auxiliary') {
          // 保持auxiliary类型，表示杂曜/神煞
          starType = 'auxiliary';
        }
        
        return {
          name: star.name,
          brightness: star.brightness || undefined,
          type: starType,
          mutagen: [], // 四化信息稍后处理
          scope: star.scope || 'origin'
        };
      });
  }
  
  /**
   * 根据地支获取位置索引
   */
  private getPositionFromBranch(branch: string): number {
    const branchMap: Record<string, number> = {
      '子': 0, '丑': 1, '寅': 2, '卯': 3,
      '辰': 4, '巳': 5, '午': 6, '未': 7,
      '申': 8, '酉': 9, '戌': 10, '亥': 11
    };
    return branchMap[branch] || 0;
  }
  
  /**
   * 获取生肖
   */
  private getZodiac(): string {
    // 尝试从 astrolabe 获取
    if (this.astrolabe?.zodiac) {
      return this.astrolabe.zodiac;
    }
    
    // 根据年支推算
    const zodiacMap: Record<string, string> = {
      '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔',
      '辰': '龙', '巳': '蛇', '午': '马', '未': '羊',
      '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪'
    };
    
    const yearBranch = this.getFourPillars().year.branch;
    return zodiacMap[yearBranch] || '';
  }
  
  /**
   * 获取星座
   */
  private getConstellation(): string {
    // 直接从 'YYYY-MM-DD' 字符串取分量，绕开 Date 的时区解释
    const parts = String(this.birthDate).split('-').map(Number);
    const month = parts[1];
    const day = parts[2];
    
    const constellations = [
      { name: '水瓶座', start: [1, 20], end: [2, 18] },
      { name: '双鱼座', start: [2, 19], end: [3, 20] },
      { name: '白羊座', start: [3, 21], end: [4, 19] },
      { name: '金牛座', start: [4, 20], end: [5, 20] },
      { name: '双子座', start: [5, 21], end: [6, 21] },
      { name: '巨蟹座', start: [6, 22], end: [7, 22] },
      { name: '狮子座', start: [7, 23], end: [8, 22] },
      { name: '处女座', start: [8, 23], end: [9, 22] },
      { name: '天秤座', start: [9, 23], end: [10, 23] },
      { name: '天蝎座', start: [10, 24], end: [11, 22] },
      { name: '射手座', start: [11, 23], end: [12, 21] },
      { name: '摩羯座', start: [12, 22], end: [12, 31] }
    ];
    
    // 特殊处理摩羯座（跨年）
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
      return '摩羯座';
    }
    
    for (const c of constellations) {
      const [startMonth, startDay] = c.start;
      const [endMonth, endDay] = c.end;
      
      if (month === startMonth && day >= startDay) return c.name;
      if (month === endMonth && day <= endDay) return c.name;
      if (month > startMonth && month < endMonth) return c.name;
    }
    
    return '';
  }
  
  /**
   * 调试方法：获取原始 astrolabe 对象
   */
  getDebugInfo(): any {
    return {
      astrolabe: this.astrolabe,
      rawDates: this.astrolabe?.rawDates,
      palaces: this.astrolabe?.palaces?.map((p: any) => ({
        name: p.name,
        branch: p.earthlyBranch,
        stem: p.heavenlyStem,
        majorStarsCount: p.majorStars?.length || 0,
        minorStarsCount: p.minorStars?.length || 0
      }))
    };
  }
}