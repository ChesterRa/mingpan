/**
 * 紫微斗數計算回歸測試
 *
 * 測試範圍：
 * 1. 十二宮位排列
 * 2. 主星安置
 * 3. 四化計算
 * 4. 農曆輸入轉換
 *
 * 測試數據來源：經典盤例 + 手算驗證
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ZiweiService } from '../src/services/ziwei/ZiweiService';
import { BEIJING_TZ } from '../src/utils/timeNormalization';

// 確保測試環境使用北京時區
beforeAll(() => {
  process.env.TZ = BEIJING_TZ;
});

describe('ZiweiService', () => {
  const ziweiService = new ZiweiService();

  describe('十二宮位排列', () => {
    it('經典盤例：1992-04-12 07:30 男', () => {
      // 期望宮位干支（基於 iztro 計算結果）
      const expectedPalaces: Record<string, string> = {
        '命宮': '壬子',
        '兄弟': '辛亥',
        '夫妻': '庚戌',
        '子女': '己酉',
        '財帛': '戊申',
        '疾厄': '丁未',
        '遷移': '丙午',
        '僕役': '乙巳',
        '官祿': '甲辰',
        '田宅': '癸卯',
        '福德': '壬寅',
        '父母': '癸丑',
      };

      const result = ziweiService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      expect(result.palaces).toBeDefined();
      expect(result.palaces.length).toBe(12);

      // 驗證每個宮位的干支
      for (const palace of result.palaces) {
        // 處理簡繁體差異
        const palaceName = palace.name
          .replace('宫', '宮')
          .replace('仆役', '僕役');

        const actualGanZhi = `${palace.heavenlyStem}${palace.earthlyBranch}`;
        const expectedGanZhi = expectedPalaces[palaceName];

        if (expectedGanZhi) {
          expect(actualGanZhi, `宮位 ${palaceName} 干支不符`).toBe(expectedGanZhi);
        }
      }
    });
  });

  describe('基本信息', () => {
    it('應正確計算五行局', () => {
      const result = ziweiService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      expect(result.basicInfo).toBeDefined();
      expect(result.basicInfo.fiveElement).toBeDefined();
    });

    it('應正確計算命主星和身主星', () => {
      const result = ziweiService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      expect(result.basicInfo).toBeDefined();
      expect(result.basicInfo.soul).toBeDefined();
      expect(result.basicInfo.body).toBeDefined();
    });
  });

  describe('四化計算', () => {
    it('經典盤例：壬年四化', () => {
      // 壬年四化：化祿天梁 化權紫微 化科左輔 化忌武曲
      const result = ziweiService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      expect(result.mutagenInfo).toBeDefined();
      expect(result.mutagenInfo.natal).toBeDefined();

      const natal = result.mutagenInfo.natal;

      // 簡繁體轉換輔助
      const normalize = (s: string | undefined) => {
        if (!s) return '';
        return s.replace('机', '機').replace('阴', '陰');
      };

      expect(normalize(natal.lu)).toBe('天梁');
      expect(normalize(natal.quan)).toBe('紫微');
      expect(normalize(natal.ke)).toBe('左輔');
      expect(normalize(natal.ji)).toBe('武曲');
    });
  });

  describe('命宮主星', () => {
    it('經典盤例：命宮應有巨門', () => {
      // 基於 iztro 計算結果：命宮在壬子，主星為巨門
      const result = ziweiService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      const mingPalace = result.palaces.find(
        (p: any) => p.name === '命宫' || p.name === '命宮'
      );

      expect(mingPalace).toBeDefined();
      expect(mingPalace!.majorStars).toBeDefined();

      const majorStarNames = mingPalace!.majorStars.map((s: any) =>
        s.name.replace('门', '門')
      );

      expect(majorStarNames).toContain('巨門');
    });
  });

  describe('身宮位置', () => {
    it('應正確標記身宮', () => {
      const result = ziweiService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      const bodyPalace = result.palaces.find((p: any) => p.isBodyPalace);
      expect(bodyPalace).toBeDefined();
    });
  });

  describe('農曆輸入', () => {
    it('ZiweiService 不直接處理 isLunar，需在 MCP 層轉換', () => {
      // 注意：ZiweiService 不直接處理 isLunar 參數
      // 農曆轉換應在 MCP 層通過 normalizeBirthDateTime() 完成
      // 這裡只測試公曆輸入的一致性
      const result1 = ziweiService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      const result2 = ziweiService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      // 相同輸入應得到相同結果
      expect(result1.palaces.length).toBe(result2.palaces.length);

      const ming1 = result1.palaces.find(
        (p: any) => p.name === '命宫' || p.name === '命宮'
      );
      const ming2 = result2.palaces.find(
        (p: any) => p.name === '命宫' || p.name === '命宮'
      );

      expect(ming1).toBeDefined();
      expect(ming2).toBeDefined();
      expect(ming1!.earthlyBranch).toBe(ming2!.earthlyBranch);
    });
  });
});

// ============= 確定性基礎驗證（2026-08-28） =============

import { astro } from 'iztro';
import { MutagenCore } from '../src/core/ziwei/MutagenCore';

describe('適配層保真（ZiweiService vs iztro 原始輸出）', () => {
  const service = new ZiweiService();

  // iztro 官方文檔示例日期 + 跨世紀/跨性別/子時樣本
  const cases: Array<[string, number, '男' | '女']> = [
    ['2000-8-16', 2, '男'],
    ['1992-4-12', 4, '男'],
    ['1988-2-15', 3, '女'],
    ['2010-10-10', 6, '女'],
    ['1975-6-8', 0, '男'],
  ];

  for (const [date, timeIdx, gender] of cases) {
    it(`命宮地支與主星應與 iztro 一致：${date} ${gender}`, async () => {
      const raw = astro.bySolar(date, timeIdx, gender, true, 'zh-TW');
      const ours = await service.calculate({
        year: +date.split('-')[0], month: +date.split('-')[1], day: +date.split('-')[2],
        hour: timeIdx * 2, gender: gender === '男' ? 'male' : 'female',
      });
      const rawMing = raw.palace('命宮') || raw.palace('命宫');
      const ourMing = ours.palaces?.find((p: any) => String(p.name).includes('命') && !String(p.name).includes('父母'));
      const rawStars = (rawMing?.majorStars || []).map((s: any) => s.name).sort().join(',');
      const ourStars = (ourMing?.majorStars || []).map((s: any) => (typeof s === 'string' ? s : s.name)).sort().join(',');
      expect(ourMing?.earthlyBranch).toBe(rawMing?.earthlyBranch);
      expect(ourStars).toBe(rawStars);
    });
  }
});

describe('四化表與經典口訣對照', () => {
  // 口訣：甲廉破武陽 乙機梁紫陰 丙同機昌廉 丁陰同機巨
  //       戊貪陰弼機 己武貪梁曲 庚陽武陰同 辛巨陽曲昌 壬梁紫左武 癸破巨陰貪
  // 註：戊干化科取右弼、庚干化科取太陰，均為主流口徑（《紫微斗數全書》中州派），
  //     庚干另有「天府化科」一說，本項目取主流。
  const expected: Record<string, [string, string, string, string]> = {
    '甲': ['廉貞', '破軍', '武曲', '太陽'],
    '乙': ['天機', '天梁', '紫微', '太陰'],
    '丙': ['天同', '天機', '文昌', '廉貞'],
    '丁': ['太陰', '天同', '天機', '巨門'],
    '戊': ['貪狼', '太陰', '右弼', '天機'],
    '己': ['武曲', '貪狼', '天梁', '文曲'],
    '庚': ['太陽', '武曲', '太陰', '天同'],
    '辛': ['巨門', '太陽', '文曲', '文昌'],
    '壬': ['天梁', '紫微', '左輔', '武曲'],
    '癸': ['破軍', '巨門', '太陰', '貪狼'],
  };

  for (const [stem, [lu, quan, ke, ji]] of Object.entries(expected)) {
    it(`${stem}干四化：祿${lu} 權${quan} 科${ke} 忌${ji}`, () => {
      const m = MutagenCore.getMutagen(stem);
      expect(m?.lu).toContain(lu);
      expect(m?.quan).toContain(quan);
      expect(m?.ke).toContain(ke);
      expect(m?.ji).toContain(ji);
    });
  }
});

describe('命宮身宮手工推演（安命宮法：寅起正月順數至生月，再自生月起子時逆數至生時）', () => {
  it('1992-04-12（農曆三月初十）辰時男：命宮在子（巨門）、身宮在申（財帛宮）', async () => {
    const service = new ZiweiService();
    const r = await service.calculate({ year: 1992, month: 4, day: 12, hour: 8, gender: 'male' });
    const ming = r.palaces?.find((p: any) => String(p.name).includes('命'));
    const shen = r.palaces?.find((p: any) => p.isBodyPalace);
    expect(ming?.earthlyBranch).toBe('子');
    expect(String((ming?.majorStars || []).map((s: any) => typeof s === 'string' ? s : s.name))).toContain('巨門');
    expect(shen?.earthlyBranch).toBe('申');
  });
});

// ============= 紫微輸出契約（確定性标配：五行局/命主/身主） =============
import { renderZiweiText } from '../src/output/fortuneTextRenderer';

describe('紫微排盤文本輸出（確定性标配）', () => {
  it('應包含五行局/命主/身主（1992-04-12 辰時男：木三局、命主貪狼、身主天梁）', async () => {
    const service = new ZiweiService();
    const r = await service.calculate({ year: 1992, month: 4, day: 12, hour: 8, gender: 'male' });
    const text = renderZiweiText(
      { ziwei: r, gender: 'male', birthDate: new Date(Date.UTC(1992, 3, 12, 8, 0)), mutagen: r.mutagenInfo },
      { includePersonal: false }
    );
    expect(text).toContain('五行局：木三局');
    expect(text).toContain('命主：貪狼');   // 命宮在子 → 命主貪狼
    expect(text).toContain('身主：天梁');   // 壬申年（申）→ 身主天梁
    // 解读层内容仍不得出现
    for (const banned of ['吉凶', '性格分析', '運勢旺盛', '建議']) {
      expect(text).not.toContain(banned);
    }
  });
});
