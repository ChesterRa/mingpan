/**
 * 八字計算回歸測試
 *
 * 測試範圍：
 * 1. 四柱計算正確性
 * 2. 大運計算
 * 3. 農曆輸入轉換
 *
 * 測試數據來源：經典盤例 + 手算驗證
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { BaziService } from '../src/services/bazi/BaziService';
import { BEIJING_TZ } from '../src/utils/timeNormalization';

// 確保測試環境使用北京時區
beforeAll(() => {
  process.env.TZ = BEIJING_TZ;
});

describe('BaziService', () => {
  const baziService = new BaziService({ debug: false });

  describe('四柱計算', () => {
    it('經典盤例：1992-04-12 07:30 男', async () => {
      // 期望八字：年柱壬申 月柱甲辰 日柱戊午 時柱丙辰
      // 驗證來源：lunar-javascript 計算結果
      const result = await baziService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        minute: 30,
        gender: 'male',
      });

      expect(result.chart).toBeDefined();
      const chart = result.chart!;

      expect(`${chart.year.stem}${chart.year.branch}`).toBe('壬申');
      expect(`${chart.month.stem}${chart.month.branch}`).toBe('甲辰');
      expect(`${chart.day.stem}${chart.day.branch}`).toBe('戊午');
      expect(`${chart.hour.stem}${chart.hour.branch}`).toBe('丙辰');
    });

    it('子時邊界：23:00 應屬當日子時', async () => {
      // 2000-01-01 23:00 - 子時開始
      const result = await baziService.calculate({
        year: 2000,
        month: 1,
        day: 1,
        hour: 23,
        gender: 'male',
      });

      expect(result.chart).toBeDefined();
      // 子時的地支應為「子」
      expect(result.chart!.hour.branch).toBe('子');
    });

    it('子時邊界：00:30 應屬當日子時', async () => {
      // 2000-01-02 00:30 - 子時中段
      const result = await baziService.calculate({
        year: 2000,
        month: 1,
        day: 2,
        hour: 0,
        minute: 30,
        gender: 'male',
      });

      expect(result.chart).toBeDefined();
      expect(result.chart!.hour.branch).toBe('子');
    });

    it('節氣邊界：立春前後', async () => {
      // 2024年立春：2月4日 16:27（lunar-javascript）
      // 注意：當前 BaziCore 的年柱邊界在 2 月初，而非精確的立春時刻
      // TODO: 修復 BaziCore 使用精確的立春時刻作為年柱邊界

      // 2024-01-31 - 明確在立春前（1月）
      const beforeLichun = await baziService.calculate({
        year: 2024,
        month: 1,
        day: 31,
        hour: 12,
        gender: 'male',
      });

      // 2024-02-05 - 明確在立春後（2月）
      const afterLichun = await baziService.calculate({
        year: 2024,
        month: 2,
        day: 5,
        hour: 12,
        gender: 'male',
      });

      expect(beforeLichun.chart).toBeDefined();
      expect(afterLichun.chart).toBeDefined();

      // 立春前後年柱應不同
      const yearBefore = `${beforeLichun.chart!.year.stem}${beforeLichun.chart!.year.branch}`;
      const yearAfter = `${afterLichun.chart!.year.stem}${afterLichun.chart!.year.branch}`;

      expect(yearBefore).toBe('癸卯');
      expect(yearAfter).toBe('甲辰');
    });
  });

  describe('農曆輸入', () => {
    it('農曆輸入應正確轉換並計算', async () => {
      // 農曆 1992-03-10 07:30 = 公曆 1992-04-12 07:30
      // 期望八字：年柱壬申 月柱甲辰 日柱戊午 時柱丙辰
      // 注意：BaziService 不直接處理 isLunar，需要在 MCP 層轉換
      // 這裡直接用公曆測試，農曆轉換在 timeNormalization.test.ts 中測試
      const result = await baziService.calculate({
        year: 1992,
        month: 4,  // 公曆 4 月
        day: 12,   // 公曆 12 日
        hour: 7,
        minute: 30,
        gender: 'male',
      });

      expect(result.chart).toBeDefined();
      const chart = result.chart!;

      expect(`${chart.year.stem}${chart.year.branch}`).toBe('壬申');
      expect(`${chart.month.stem}${chart.month.branch}`).toBe('甲辰');
      expect(`${chart.day.stem}${chart.day.branch}`).toBe('戊午');
      expect(`${chart.hour.stem}${chart.hour.branch}`).toBe('丙辰');
    });
  });

  describe('日主與五行', () => {
    it('應正確識別日主', async () => {
      const result = await baziService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      expect(result.chart).toBeDefined();
      // 日主為戊土
      expect(result.chart!.day.stem).toBe('戊');
    });
  });

  describe('大運計算', () => {
    it('男命順行大運', async () => {
      // 壬申年男命，年干壬為陽，順行
      const result = await baziService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'male',
      });

      // 大運在 timeBased.daYun 中
      expect(result.timeBased?.daYun).toBeDefined();
      expect(result.timeBased!.daYun!.length).toBeGreaterThan(0);
    });

    it('女命逆行大運', async () => {
      // 壬申年女命，年干壬為陽，逆行
      const result = await baziService.calculate({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        gender: 'female',
      });

      // 大運在 timeBased.daYun 中
      expect(result.timeBased?.daYun).toBeDefined();
      expect(result.timeBased!.daYun!.length).toBeGreaterThan(0);
    });
  });
});


// ============= 排盤輸出內容測試 =============
// 產品定位（2026-08-28 確立）：bazi_basic 只輸出確定且權威且 AI 不易獲知的量
// （四柱干支、旬空、公農曆對照）。十神/藏干/五行/格局/用神/神煞屬 AI 解讀層，
// 一律不進輸出。此組測試固化該契約，防止未來靜默膨脹。

import { renderBaziText } from '../src/output/fortuneTextRenderer';

describe('八字排盤文本輸出（最小確定性契約）', () => {
  const service = new BaziService({ debug: false });
  const birth = { year: 1992, month: 4, day: 12, hour: 7, minute: 30, gender: 'male' as const };
  const birthDate = new Date(Date.UTC(1992, 3, 12, 7, 30));

  it('應包含：命主資料（公農曆）、四柱、藏干、十神、旬空', async () => {
    const r = await service.calculate(birth);
    const text = renderBaziText({ bazi: r, gender: 'male', birthDate }, { includePersonal: false });

    expect(text).toContain('公曆：1992-04-12 07:30:00');
    expect(text).toContain('農曆：壬申年三月初十辰時');
    expect(text).toContain('年柱：壬申（剑锋金）');
    expect(text).toContain('月柱：甲辰（覆灯火）');
    expect(text).toContain('日柱：戊午（天上火）');
    expect(text).toContain('時柱：丙辰（沙中土）');
    expect(text).toContain('日柱：戊午');
    expect(text).toContain('時柱：丙辰');
    expect(text).toContain('日柱旬空：');
    // 命宮/胎元（古典法逐例核證：辰月辰時，子起正月逆數三月=戌宮，辰時從戌順數至卯時落酉 → 命宮酉，壬年五虎遁得己酉；
    // 胎元=月干甲進一乙、支辰進三未 → 乙未）
    expect(text).toContain('命宮：己酉');
    expect(text).toContain('胎元：乙未');
    // 藏干十神合併標注（1992-04-12，日主戊土，逐項手工核對）
    expect(text).toContain('年申[庚食神※ 壬偏財 戊比肩]');
    expect(text).toContain('月辰[戊比肩※ 乙正官 癸正財]');
    expect(text).toContain('日午[丁正印※ 己劫財]');
    expect(text).toContain('時辰[戊比肩※ 乙正官 癸正財]');
    // 十二長生（自坐）：壬長生在申、甲衰在辰、戊帝旺在午、丙冠帶在辰
    expect(text).toContain('十二長生（自坐）：年长生　月衰　日帝旺　時冠带');
    // 天干十神（日主戊：壬=偏財 甲=七殺 丙=偏印）
    expect(text).toContain('天干十神：年干水=偏財');
    expect(text).toContain('月干木=七殺');
    expect(text).toContain('時干火=偏印');
  });

  it('不應包含解讀層內容（五行力量/強弱/格局/用神/神煞/大運）', async () => {
    const r = await service.calculate(birth);
    const text = renderBaziText({ bazi: r, gender: 'male', birthDate }, { includePersonal: false });

    for (const banned of ['五行力量', '日主強弱', '用神', '格局', '神煞', '大運', '喜神', '忌神']) {
      expect(text, `輸出不應包含「${banned}」`).not.toContain(banned);
    }
  });

  it('輸出應保持精煉（< 350 字符）', async () => {
    const r = await service.calculate(birth);
    const text = renderBaziText({ bazi: r, gender: 'male', birthDate }, { includePersonal: false });
    expect(text.length).toBeLessThan(350);
    expect(text.length).toBeGreaterThan(100);
  });
});

// ============= 四柱金樣本（lunar-javascript EightChar 測試集為 oracle） =============
// 驗證自研 calculateHoroscope 的干支推演（五虎遁/五鼠遁/立春換年/晚子時）
// 與久經使用的參照庫一致。其中「立春後春節前」用例暴露過年柱以春節換年的缺陷
// （1988 年立春 2/4、春節 2/17，窗口內年柱曾錯排），2026-08-28 修復。

describe('四柱金樣本（lunar-javascript oracle 對照）', () => {
  const service = new BaziService({ debug: false });

  const cases: Array<{ input: any; expected: string; label: string }> = [
    { input: { year: 2005, month: 12, day: 23, hour: 8, minute: 37 }, expected: '乙酉 戊子 辛巳 壬辰', label: '常規' },
    { input: { year: 1988, month: 2, day: 15, hour: 23, minute: 30 }, expected: '戊辰 甲寅 辛丑 戊子', label: '子初換日（23 點起日柱時柱同換次日）+ 立春後春節前' },
    { input: { year: 1988, month: 2, day: 15, hour: 22, minute: 30 }, expected: '戊辰 甲寅 庚子 丁亥', label: '立春後春節前·亥時' },
    { input: { year: 1988, month: 2, day: 2, hour: 22, minute: 30 }, expected: '丁卯 癸丑 丁亥 辛亥', label: '立春前（年柱不換）' },
    { input: { year: 1999, month: 6, day: 7, hour: 9, minute: 11 }, expected: '己卯 庚午 庚寅 辛巳', label: '常規2' },
    { input: { year: 1992, month: 4, day: 12, hour: 7, minute: 30 }, expected: '壬申 甲辰 戊午 丙辰', label: 'README 示例' },
  ];

  for (const c of cases) {
    it(`${c.label}：${c.input.year}-${c.input.month}-${c.input.day} ${c.input.hour}:${c.input.minute} → ${c.expected}`, async () => {
      const r = await service.calculate({ ...c.input, gender: 'male' });
      const got = [r.chart.year, r.chart.month, r.chart.day, r.chart.hour]
        .map((p: any) => p.stem + p.branch).join(' ');
      expect(got).toBe(c.expected);
    });
  }

  it('農曆輸入（生產路徑：入口層歸一化）：己亥年臘月十二午時 → 己亥 丁丑 戊申 戊午', async () => {
    // MCP 層由 normalizeBirthDateTime 完成農曆→公曆，服務層只收公曆
    const { normalizeBirthDateTime } = await import('../src/utils/timeNormalization');
    const normalized = normalizeBirthDateTime({ year: 2019, month: 12, day: 12, hour: 11, minute: 22, isLunar: true });
    const r = await service.calculate({ ...normalized, gender: 'male' });
    const got = [r.chart.year, r.chart.month, r.chart.day, r.chart.hour]
      .map((p: any) => p.stem + p.branch).join(' ');
    expect(got).toBe('己亥 丁丑 戊申 戊午');
  });
});

// ============= 權威用例金樣本（2026-08-28 多源考證） =============
// 每個用例均經網絡權威來源交叉驗證（官方記載/族譜/原始檔案/命理典籍），
// 詳細出處見 docs/product-roadmap.md「信任深化」節。

describe('權威用例金樣本（歷史人物）', () => {
  const service = new BaziService({ debug: false });

  it('毛澤東：1893-12-26 08:30（韶山市政府官網/《韶山毛氏四修族譜》「光緒十九年癸巳十一月十九辰時」）→ 癸巳 甲子 丁酉 甲辰', async () => {
    const r = await service.calculate({ year: 1893, month: 12, day: 26, hour: 8, minute: 30, gender: 'male' });
    const got = [r.chart.year, r.chart.month, r.chart.day, r.chart.hour].map((p: any) => p.stem + p.branch).join(' ');
    expect(got).toBe('癸巳 甲子 丁酉 甲辰');
  });

  it('乾隆：1711-09-25 早子時（康熙五十年八月十三子時，《內閣大庫檔案》原始批語）→ 辛卯 丁酉 庚午 丙子', async () => {
    const r = await service.calculate({ year: 1711, month: 9, day: 25, hour: 0, minute: 30, gender: 'male' });
    const got = [r.chart.year, r.chart.month, r.chart.day, r.chart.hour].map((p: any) => p.stem + p.branch).join(' ');
    expect(got).toBe('辛卯 丁酉 庚午 丙子');
  });

  it('蔣介石（時辰諸說並存，僅驗年月日三柱）：1887-10-31（韋千里《千里命稿》等各版一致）→ 丁亥 庚戌 己巳', async () => {
    const r = await service.calculate({ year: 1887, month: 10, day: 31, hour: 12, gender: 'male' });
    const got = [r.chart.year, r.chart.month, r.chart.day].map((p: any) => p.stem + p.branch).join(' ');
    expect(got).toBe('丁亥 庚戌 己巳');
  });
});

describe('立春分鐘級邊界（年月柱精確換界）', () => {
  const service = new BaziService({ debug: false });

  // 節氣時刻採自公開天文數據：2025 年立春 2025-02-03 22:10:13；2024 年立春 2024-02-04 16:26:53
  it('2025-02-03 22:00（立春前 10 分鐘）→ 年柱甲辰、月柱丁丑', async () => {
    const r = await service.calculate({ year: 2025, month: 2, day: 3, hour: 22, minute: 0, gender: 'male' });
    expect(r.chart.year.stem + r.chart.year.branch).toBe('甲辰');
    expect(r.chart.month.stem + r.chart.month.branch).toBe('丁丑');
  });

  it('2025-02-03 22:30（立春後 20 分鐘）→ 年柱乙巳、月柱戊寅', async () => {
    const r = await service.calculate({ year: 2025, month: 2, day: 3, hour: 22, minute: 30, gender: 'male' });
    expect(r.chart.year.stem + r.chart.year.branch).toBe('乙巳');
    expect(r.chart.month.stem + r.chart.month.branch).toBe('戊寅');
  });

  it('2024-02-04 16:00（立春前 27 分鐘）→ 年柱癸卯、月柱乙丑', async () => {
    const r = await service.calculate({ year: 2024, month: 2, day: 4, hour: 16, minute: 0, gender: 'male' });
    expect(r.chart.year.stem + r.chart.year.branch).toBe('癸卯');
    expect(r.chart.month.stem + r.chart.month.branch).toBe('乙丑');
  });

  it('2024-02-04 17:00（立春後 33 分鐘）→ 年柱甲辰、月柱丙寅', async () => {
    const r = await service.calculate({ year: 2024, month: 2, day: 4, hour: 17, minute: 0, gender: 'male' });
    expect(r.chart.year.stem + r.chart.year.branch).toBe('甲辰');
    expect(r.chart.month.stem + r.chart.month.branch).toBe('丙寅');
  });
});

// ============= 六十甲子納音表校驗 =============
// 納音為完全確定的傳世查找表（《三命通會》等典籍一致，無門派分歧）
import { NA_YIN } from '../src/core/constants/bazi';
import { JIA_ZI_60 } from '../src/services/qimen/data/constants';

describe('六十甲子納音表', () => {
  it('覆蓋全部六十甲子', () => {
    for (const gz of JIA_ZI_60) {
      expect(NA_YIN[gz], `${gz} 應有納音`).toBeTruthy();
    }
  });

  it('結構不變量：三十種納音、相鄰兩干支一對', () => {
    const names = Object.values(NA_YIN);
    expect(names.length).toBe(60);
    const distinct = new Set(names);
    expect(distinct.size).toBe(30);
    for (let i = 0; i < 60; i += 2) {
      expect(NA_YIN[JIA_ZI_60[i]], `${JIA_ZI_60[i]} 與 ${JIA_ZI_60[i + 1]} 應同納音`).toBe(NA_YIN[JIA_ZI_60[i + 1]]);
    }
  });

  it('經典抽樣：與《三命通會》通行表一致', () => {
    const canonical: Record<string, string> = {
      '甲子': '海中金', '壬申': '剑锋金', '戊子': '霹雳火', '庚寅': '松柏木',
      '壬辰': '长流水', '甲午': '砂中金', '丙午': '天河水', '庚申': '石榴木',
      '甲寅': '大溪水', '壬戌': '大海水', '戊午': '天上火', '丙辰': '沙中土',
    };
    for (const [gz, naYin] of Object.entries(canonical)) {
      expect(NA_YIN[gz], `${gz}`).toBe(naYin);
    }
  });
});

// ============= 真太陽時校正（經度）回歸 =============
// v0.1.x 缺陷：longitude 校正只作用於年/月柱（lunar 用了校正後時刻），
// 日/時柱仍用原始 input.hour —— 兩套時間源混用。2026-08-29 修復：四柱一律按校正後時刻。
describe('真太陽時（經度）校正', () => {
  const service = new BaziService({ debug: false });

  it('東經 87.6°（烏魯木齊）07:30 → 真太陽時約 05:20 → 時柱乙卯（非辰時丙辰）', async () => {
    const r = await service.calculate({ year: 1992, month: 4, day: 12, hour: 7, minute: 30, gender: 'male', longitude: 87.6 });
    expect(r.chart.hour.stem + r.chart.hour.branch).toBe('乙卯'); // 戊日五鼠遁：卯時=乙卯
    expect(r.chart.hour.naYin).toBe('大溪水');
    // 日柱未跨日，年月柱不受影響
    expect(r.chart.year.stem + r.chart.year.branch).toBe('壬申');
    expect(r.chart.day.stem + r.chart.day.branch).toBe('戊午');
  });

  it('不提供經度時行為不變（時柱丙辰）', async () => {
    const r = await service.calculate({ year: 1992, month: 4, day: 12, hour: 7, minute: 30, gender: 'male' });
    expect(r.chart.hour.stem + r.chart.hour.branch).toBe('丙辰');
  });
});

// ============= 大運起運 oracle 對照（lunar-javascript getYun 雙源驗證） =============
// 此前的「9 歲起運」斷言來自自身實現（循環自證）。本組測試與久經使用的
// lunar getYun 逐項對照：起運歲數、干支序列、公曆起止年（順行/逆行 × 男/女）。
import { Solar as SolarOracle } from 'lunar-javascript';
import { DaYunCalculator } from '../src/services/bazi/calculators/DaYunCalculator';

describe('大運 oracle 對照（lunar getYun）', () => {
  const service = new BaziService({ debug: false });

  const cases: Array<{ y: number; mo: number; d: number; h: number; mi: number; gender: 'male' | 'female' }> = [
    { y: 1992, mo: 4, d: 12, h: 7, mi: 30, gender: 'male' },    // 壬陽年男 → 順行
    { y: 1991, mo: 6, d: 20, h: 14, mi: 0, gender: 'female' },  // 辛陰年女 → 順行
    { y: 1990, mo: 10, d: 8, h: 4, mi: 0, gender: 'male' },     // 庚陽年男 → 順行
    { y: 1991, mo: 3, d: 5, h: 16, mi: 0, gender: 'male' },     // 辛陰年男 → 逆行
    { y: 1992, mo: 11, d: 25, h: 20, mi: 0, gender: 'female' }, // 壬陽年女 → 逆行
    { y: 1985, mo: 7, d: 18, h: 10, mi: 0, gender: 'female' },  // 乙陰年女 → 順行
  ];

  for (const c of cases) {
    it(`${c.y}-${c.mo}-${c.d} ${c.h}:${String(c.mi).padStart(2, '0')} ${c.gender === 'male' ? '男' : '女'}：起運歲數/干支序列/公曆年起止與 lunar 一致`, async () => {
      const ours = await service.calculate({ year: c.y, month: c.mo, day: c.d, hour: c.h, minute: c.mi, gender: c.gender });
      const ourList = DaYunCalculator.calculate(
        ours.chart, ours.birthInfo, c.gender,
        { startYear: c.y, endYear: c.y + 100 }
      );

      const oracleYun = SolarOracle.fromYmdHms(c.y, c.mo, c.d, c.h, c.mi, 0)
        .getLunar().getEightChar().getYun(c.gender === 'male' ? 1 : 0);
      const oracleList = oracleYun.getDaYun(); // [0] 为首运前占位段，[1] 起为正式大运

      for (let i = 0; i < 8; i++) {
        const o = ourList[i];
        const t = oracleList[i + 1];
        expect(o.stem + o.branch, `第${i + 1}運干支`).toBe(t.getGanZhi());
        expect(o.startAge, `第${i + 1}運起歲`).toBe(t.getStartAge());
        expect(o.endAge, `第${i + 1}運止歲`).toBe(t.getEndAge());
        expect(o.startYear, `第${i + 1}運起始公曆年`).toBe(t.getStartYear());
        expect(o.endYear, `第${i + 1}運止公曆年`).toBe(t.getEndYear());
      }
    });
  }
});
