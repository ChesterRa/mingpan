/**
 * 大六壬服務測試
 *
 * 測試用例參考：
 * - kentang2017/kinliuren 輸出對照
 * - 《大六壬大全》經典盤例
 */

import { describe, it, expect } from 'vitest';
import { DaliurenService } from '../src/services/daliuren/DaliurenService';
import { TianDiPanCalculator } from '../src/services/daliuren/calculators/TianDiPanCalculator';
import { SiKeCalculator } from '../src/services/daliuren/calculators/SiKeCalculator';
import { SanChuanCalculator } from '../src/services/daliuren/calculators/SanChuanCalculator';
import { ShenShaCalculator } from '../src/services/daliuren/calculators/ShenShaCalculator';
import { renderDaliurenText } from '../src/output/daliurenTextRenderer';
import type { DiZhi, TianGan } from '../src/services/daliuren/types';

describe('大六壬服務', () => {
  const service = new DaliurenService();

  describe('天地盤計算', () => {
    it('驚蟄節氣月將應為亥（登明）', () => {
      const result = TianDiPanCalculator.calculate('驚蟄', '午' as DiZhi, '己' as TianGan);
      expect(result.yueJiang).toBe('亥');
      expect(result.yueJiangName).toBe('登明');
    });

    it('夏至節氣月將應為未（小吉）', () => {
      const result = TianDiPanCalculator.calculate('夏至', '午' as DiZhi, '甲' as TianGan);
      expect(result.yueJiang).toBe('未');
      expect(result.yueJiangName).toBe('小吉');
    });

    it('冬至節氣月將應為丑（大吉）', () => {
      const result = TianDiPanCalculator.calculate('冬至', '子' as DiZhi, '甲' as TianGan);
      expect(result.yueJiang).toBe('丑');
      expect(result.yueJiangName).toBe('大吉');
    });

    it('天盤應有12個地支', () => {
      const result = TianDiPanCalculator.calculate('驚蟄', '午' as DiZhi, '己' as TianGan);
      expect(result.tianPan).toHaveLength(12);
      expect(result.diPan).toHaveLength(12);
      expect(result.tianJiang).toHaveLength(12);
    });

    it('地盤應為固定順序', () => {
      const result = TianDiPanCalculator.calculate('驚蟄', '午' as DiZhi, '己' as TianGan);
      expect(result.diPan).toEqual(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
    });
  });

  describe('四課計算', () => {
    it('應正確計算四課', () => {
      const tianDiPan = TianDiPanCalculator.calculate('驚蟄', '午' as DiZhi, '己' as TianGan);
      const siKe = SiKeCalculator.calculate('己' as TianGan, '未' as DiZhi, tianDiPan);

      expect(siKe.list).toHaveLength(4);
      expect(siKe.dayGan).toBe('己');
      expect(siKe.dayZhi).toBe('未');
      expect(siKe.dayGanJiGong).toBe('未'); // 己寄未
    });

    it('日干寄宮應正確', () => {
      const tianDiPan = TianDiPanCalculator.calculate('驚蟄', '午' as DiZhi, '甲' as TianGan);
      const siKe = SiKeCalculator.calculate('甲' as TianGan, '子' as DiZhi, tianDiPan);

      expect(siKe.dayGanJiGong).toBe('寅'); // 甲寄寅
    });

    it('四課關係統計應正確', () => {
      const tianDiPan = TianDiPanCalculator.calculate('驚蟄', '午' as DiZhi, '己' as TianGan);
      const siKe = SiKeCalculator.calculate('己' as TianGan, '未' as DiZhi, tianDiPan);
      const stats = SiKeCalculator.analyzeRelations(siKe);

      expect(stats.shangKeXia + stats.xiaZeiShang + stats.biHe + stats.shangShengXia + stats.xiaShengShang).toBe(4);
    });
  });

  describe('三傳計算', () => {
    it('應正確計算三傳', () => {
      const tianDiPan = TianDiPanCalculator.calculate('驚蟄', '午' as DiZhi, '己' as TianGan);
      const siKe = SiKeCalculator.calculate('己' as TianGan, '未' as DiZhi, tianDiPan);
      const sanChuan = SanChuanCalculator.calculate(siKe, tianDiPan, '己未', '午' as DiZhi);

      expect(sanChuan.chuChuan).toBeDefined();
      expect(sanChuan.zhongChuan).toBeDefined();
      expect(sanChuan.moChuan).toBeDefined();
      expect(sanChuan.geJu).toBeDefined();
      expect(sanChuan.geJuDetail).toBeDefined();
    });

    it('三傳應有正確的六親', () => {
      const tianDiPan = TianDiPanCalculator.calculate('驚蟄', '午' as DiZhi, '己' as TianGan);
      const siKe = SiKeCalculator.calculate('己' as TianGan, '未' as DiZhi, tianDiPan);
      const sanChuan = SanChuanCalculator.calculate(siKe, tianDiPan, '己未', '午' as DiZhi);

      const validLiuQin = ['父母', '兄弟', '子孫', '妻財', '官鬼'];
      expect(validLiuQin).toContain(sanChuan.chuChuan.liuQin);
      expect(validLiuQin).toContain(sanChuan.zhongChuan.liuQin);
      expect(validLiuQin).toContain(sanChuan.moChuan.liuQin);
    });
  });

  describe('神煞計算', () => {
    it('應正確計算日馬', () => {
      const shenSha = ShenShaCalculator.calculate('甲子');
      expect(shenSha.riMa).toBe('寅');
    });

    it('應正確計算華蓋', () => {
      const shenSha = ShenShaCalculator.calculate('甲子');
      expect(shenSha.huaGai).toBe('戌');
    });

    it('應正確計算丁馬', () => {
      const shenSha = ShenShaCalculator.calculate('甲子');
      expect(shenSha.dingMa).toBe('卯'); // 甲子旬丁馬在卯
    });
  });

  describe('完整排盤', () => {
    it('經典盤例：驚蟄 己未日 甲午時', () => {
      // 參考 kinliuren 輸出
      const result = service.calculate({
        jieqi: '驚蟄',
        lunarMonth: 2,
        dayGanZhi: '己未',
        hourGanZhi: '甲午',
      });

      expect(result.basicInfo.jieqi).toBe('驚蟄');
      expect(result.basicInfo.dayGanZhi).toBe('己未');
      expect(result.basicInfo.hourGanZhi).toBe('甲午');
      expect(result.tianDiPan.yueJiang).toBe('亥');
      expect(result.siKe.list).toHaveLength(4);
      expect(result.sanChuan.chuChuan).toBeDefined();
    });

    it('經典盤例：立秋 壬戌日 庚戌時', () => {
      const result = service.calculate({
        jieqi: '立秋',
        lunarMonth: 6,
        dayGanZhi: '壬戌',
        hourGanZhi: '庚戌',
      });

      expect(result.basicInfo.jieqi).toBe('立秋');
      expect(result.tianDiPan.yueJiang).toBe('午'); // 大暑、立秋月將為午
      expect(result.siKe.dayGan).toBe('壬');
      expect(result.siKe.dayZhi).toBe('戌');
    });

    it('應正確判斷晝夜', () => {
      // 午時應為晝
      const dayResult = service.calculate({
        jieqi: '驚蟄',
        lunarMonth: 2,
        dayGanZhi: '己未',
        hourGanZhi: '甲午',
      });
      expect(dayResult.basicInfo.dayNight).toBe('晝');

      // 子時應為夜
      const nightResult = service.calculate({
        jieqi: '驚蟄',
        lunarMonth: 2,
        dayGanZhi: '己未',
        hourGanZhi: '甲子',
      });
      expect(nightResult.basicInfo.dayNight).toBe('夜');
    });
  });

  describe('文本渲染', () => {
    it('應正確渲染 Markdown 格式', () => {
      const result = service.calculate({
        jieqi: '驚蟄',
        lunarMonth: 2,
        dayGanZhi: '己未',
        hourGanZhi: '甲午',
      });

      const text = renderDaliurenText(result);

      expect(text).toContain('## 大六壬排盤');
      expect(text).toContain('**節氣**');
      expect(text).toContain('**格局**');
      expect(text).toContain('### 三傳');
      expect(text).toContain('### 四課');
      expect(text).toContain('### 天地盤');
      expect(text).toContain('### 神煞');
    });

    it('三傳表格應包含所有欄位', () => {
      const result = service.calculate({
        jieqi: '驚蟄',
        lunarMonth: 2,
        dayGanZhi: '己未',
        hourGanZhi: '甲午',
      });

      const text = renderDaliurenText(result);

      expect(text).toContain('| 傳位 | 地支 | 天將 | 六親 | 空亡 |');
      expect(text).toContain('初傳');
      expect(text).toContain('中傳');
      expect(text).toContain('末傳');
    });

    it('四課表格應包含所有欄位', () => {
      const result = service.calculate({
        jieqi: '驚蟄',
        lunarMonth: 2,
        dayGanZhi: '己未',
        hourGanZhi: '甲午',
      });

      const text = renderDaliurenText(result);

      expect(text).toContain('| 課位 | 上神 | 下神 | 天將 | 關係 |');
      expect(text).toContain('1課');
      expect(text).toContain('2課');
      expect(text).toContain('3課');
      expect(text).toContain('4課');
    });
  });
});

describe('時間起課（calculateFromTime）', () => {
  const service = new DaliurenService();

  it('應自動推得日干支、時干支與節氣（與 lunar-javascript 口徑一致）', () => {
    const r = service.calculateFromTime({ year: 2025, month: 12, day: 19, hour: 10 });
    expect(r.basicInfo.dayGanZhi).toBe('壬戌');
    expect(r.basicInfo.hourGanZhi).toBe('乙巳');
    // 2025-12-19 已過大雪（12/7），節氣應為大雪
    expect(r.basicInfo.jieqi).toBe('大雪');
  });

  it('月將應符合中氣換將口徑（大雪後為寅將·功曹）', () => {
    const r = service.calculateFromTime({ year: 2025, month: 12, day: 19, hour: 10 });
    expect(r.tianDiPan.yueJiang).toBe('寅');
    expect(r.tianDiPan.yueJiangName).toBe('功曹');
  });

  it('時間起課與等價專家輸入應排出同盤', () => {
    const fromTime = service.calculateFromTime({ year: 2025, month: 12, day: 19, hour: 10 });
    const expert = service.calculate({
      jieqi: '大雪', lunarMonth: 10,
      dayGanZhi: '壬戌', hourGanZhi: '乙巳',
    });
    expect(fromTime.tianDiPan.tianPan).toEqual(expert.tianDiPan.tianPan);
    expect(fromTime.sanChuan).toEqual(expert.sanChuan);
  });

  it('專家模式：簡體節氣名（lunar 返回風格）與繁體等效', () => {
    const trad = service.calculate({ jieqi: '驚蟄', lunarMonth: 2, dayGanZhi: '甲子', hourGanZhi: '甲子' });
    const simp = service.calculate({ jieqi: '惊蛰', lunarMonth: 2, dayGanZhi: '甲子', hourGanZhi: '甲子' });
    expect(simp.tianDiPan.yueJiang).toBe(trad.tianDiPan.yueJiang);
    expect(simp.tianDiPan.yueJiang).toBe('亥');
  });

  it('未知節氣應報錯而非靜默回退（排盤正確性優先）', () => {
    expect(() =>
      service.calculate({ jieqi: '不存在的節氣', lunarMonth: 2, dayGanZhi: '甲子', hourGanZhi: '甲子' })
    ).toThrow(/未知節氣/);
  });

  it('閏月歸前月（僅影響展示欄位）', () => {
    // 2025 年有閏六月：閏六月十五 → 農曆月按 6 處理
    const r = service.calculateFromTime({ year: 2025, month: 8, day: 8, hour: 12 });
    expect(r.basicInfo.lunarMonth).toMatch(/月/);
  });
});
