/**
 * 天地盤計算器
 * 
 * 天地盤是大六壬的基礎，由月將加時辰起盤
 * 
 * 算法：
 * 1. 根據節氣確定月將
 * 2. 月將加臨時辰，順布十二地支為天盤
 * 3. 地盤固定為子丑寅卯辰巳午未申酉戌亥
 * 4. 根據日干和晝夜確定貴人起點，順/逆布十二天將
 */

import type { DiZhi, TianJiangShort, TianGan, TianDiPan, YueJiang } from '../types';
import {
  DI_ZHI,
  TIAN_JIANG,
  JIEQI_YUE_JIANG,
  normalizeJieQiName,
  YUE_JIANG_MAP,
  GUIREN_START,
  DAY_NIGHT_MAP,
} from '../data/constants';

export class TianDiPanCalculator {
  /**
   * 計算天地盤
   */
  static calculate(
    jieqi: string,
    hourZhi: DiZhi,
    dayGan: TianGan
  ): TianDiPan {
    // 1. 確定月將
    const yueJiang = this.getYueJiang(jieqi);
    const yueJiangName = YUE_JIANG_MAP[yueJiang];
    
    // 2. 計算天盤（月將加臨時辰）
    const tianPan = this.calculateTianPan(yueJiang, hourZhi);
    
    // 3. 地盤固定
    const diPan = [...DI_ZHI] as DiZhi[];
    
    // 4. 確定晝夜
    const dayNight = DAY_NIGHT_MAP[hourZhi];
    
    // 5. 計算天將排布
    const tianJiang = this.calculateTianJiang(dayGan, dayNight, tianPan);
    
    // 6. 建立地支對應關係
    const diToTian = this.buildDiToTian(diPan, tianPan);
    const diToJiang = this.buildDiToJiang(diPan, tianJiang);
    
    return {
      tianPan,
      diPan,
      tianJiang,
      yueJiang,
      yueJiangName,
      diToTian,
      diToJiang,
    };
  }
  
  /**
   * 根據節氣獲取月將
   */
  private static getYueJiang(jieqi: string): DiZhi {
    // 歸一化節氣名（相容簡/繁體輸入，lunar-javascript 返回簡體）
    const yueJiang = JIEQI_YUE_JIANG[normalizeJieQiName(jieqi)];
    if (!yueJiang) {
      throw new Error(`未知節氣: ${jieqi}（需為二十四節氣之一）`);
    }
    return yueJiang;
  }
  
  /**
   * 計算天盤
   * 月將加臨時辰，順布十二地支
   */
  private static calculateTianPan(yueJiang: DiZhi, hourZhi: DiZhi): DiZhi[] {
    // 找到時辰在地支中的位置
    const hourIndex = DI_ZHI.indexOf(hourZhi);
    // 找到月將在地支中的位置
    const yueJiangIndex = DI_ZHI.indexOf(yueJiang);
    
    // 天盤：從時辰位置開始，月將加臨
    const tianPan: DiZhi[] = [];
    for (let i = 0; i < 12; i++) {
      // 從月將開始順布
      const index = (yueJiangIndex + i) % 12;
      tianPan.push(DI_ZHI[index]);
    }
    
    // 重新排列：使天盤對應地盤從時辰開始
    const result: DiZhi[] = [];
    for (let i = 0; i < 12; i++) {
      const diPanIndex = (hourIndex + i) % 12;
      result[diPanIndex] = tianPan[i];
    }
    
    // 返回按地盤順序排列的天盤
    return DI_ZHI.map((_, i) => result[i]);
  }
  
  /**
   * 計算天將排布
   * 根據日干和晝夜確定貴人起點，然後順/逆布
   */
  private static calculateTianJiang(
    dayGan: TianGan,
    dayNight: '晝' | '夜',
    tianPan: DiZhi[]
  ): TianJiangShort[] {
    // 1. 確定貴人起點
    const guirenConfig = GUIREN_START[dayGan];
    const guirenStart = dayNight === '晝' ? guirenConfig.day : guirenConfig.night;
    
    // 2. 找到貴人在天盤中的位置（貴人臨地盤某支）
    const guirenTianPanZhi = tianPan[DI_ZHI.indexOf(guirenStart)];
    
    // 3. 確定順逆
    // 貴人在巳午未申酉戌（陽位）則逆布，在亥子丑寅卯辰（陰位）則順布
    const yangPositions: DiZhi[] = ['巳', '午', '未', '申', '酉', '戌'];
    const isReverse = yangPositions.includes(guirenTianPanZhi);
    
    // 4. 排布天將
    const tianJiang: TianJiangShort[] = new Array(12);
    const guirenIndex = DI_ZHI.indexOf(guirenStart);
    
    if (isReverse) {
      // 逆布
      const reversedJiang = ['貴', '后', '陰', '玄', '常', '虎', '空', '龍', '勾', '合', '雀', '蛇'] as TianJiangShort[];
      for (let i = 0; i < 12; i++) {
        const targetIndex = (guirenIndex + i) % 12;
        tianJiang[targetIndex] = reversedJiang[i];
      }
    } else {
      // 順布
      for (let i = 0; i < 12; i++) {
        const targetIndex = (guirenIndex + i) % 12;
        tianJiang[targetIndex] = TIAN_JIANG[i];
      }
    }
    
    return tianJiang;
  }
  
  /**
   * 建立地支到天盤的映射
   */
  private static buildDiToTian(diPan: DiZhi[], tianPan: DiZhi[]): Record<DiZhi, DiZhi> {
    const result: Record<string, DiZhi> = {};
    for (let i = 0; i < 12; i++) {
      result[diPan[i]] = tianPan[i];
    }
    return result as Record<DiZhi, DiZhi>;
  }
  
  /**
   * 建立地支到天將的映射
   */
  private static buildDiToJiang(diPan: DiZhi[], tianJiang: TianJiangShort[]): Record<DiZhi, TianJiangShort> {
    const result: Record<string, TianJiangShort> = {};
    for (let i = 0; i < 12; i++) {
      result[diPan[i]] = tianJiang[i];
    }
    return result as Record<DiZhi, TianJiangShort>;
  }
}
