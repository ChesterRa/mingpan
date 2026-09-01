/**
 * 权威历史人物金样本（多源交叉验证版）
 *
 * 每个用例的期望值来源：
 * - 慈禧：道光十五年十月初十亥时，《人鉴·命理存验》（林庚白）；
 *   族谱卯时说另见（不采，因时柱有争议）
 * - 袁世凯：咸丰九年八月廿日未时，《人鉴·命理存验》+ 多源一致
 * - 鲁迅：光绪七年八月初三辰时（周作人《越城周氏支谱》推证）
 * - 康熙：顺治十一年三月十八日（时辰不详，验三柱），
 *   来源：维基百科/故宫博物院
 * - 皇太极：万历二十年（时辰不详，验三柱），
 *   来源：维基百科（1559-05-14）
 *
 * 所有期望值均先经我们的引擎实际计算 → 再与文献记载比对确认。
 */

import { describe, it, expect } from 'vitest';
import { BaziService } from '../src/services/bazi/BaziService';
import { Solar } from 'lunar-javascript';

describe('权威历史人物金样本（多源交叉验证）', () => {
  const service = new BaziService({ debug: false });

  async function pillars(y: number, m: number, d: number, h: number, mi = 0) {
    const r = await service.calculate({ year: y, month: m, day: d, hour: h, minute: mi, gender: 'male' });
    return {
      full: [r.chart.year, r.chart.month, r.chart.day, r.chart.hour].map((p: any) => p.stem + p.branch).join(' '),
      three: [r.chart.year, r.chart.month, r.chart.day].map((p: any) => p.stem + p.branch).join(' '),
    };
  }

  it('袁世凯 1859-09-16 未时 → 己未 癸酉 丁巳 丁未（《人鉴·命理存验》）', async () => {
    const p = await pillars(1859, 9, 16, 14);
    expect(p.full).toBe('己未 癸酉 丁巳 丁未');
  });

  it('慈禧(亥时说) 1835-11-29 亥时 → 乙未 丁亥 乙丑 丁亥（《人鉴·命理存验》）', async () => {
    const p = await pillars(1835, 11, 29, 22);
    expect(p.full).toBe('乙未 丁亥 乙丑 丁亥');
  });

  it('鲁迅(辰时说) 1881-09-25 辰时 → 辛巳 丁酉 壬戌 甲辰（周作人《越城周氏支谱》推证）', async () => {
    const p = await pillars(1881, 9, 25, 8);
    expect(p.full).toBe('辛巳 丁酉 壬戌 甲辰');
  });

  it('康熙 1654-05-04（时辰不详，验三柱）→ 甲午 戊辰 戊申', async () => {
    const p = await pillars(1654, 5, 4, 10);
    expect(p.three).toBe('甲午 戊辰 戊申');
  });

  // lunar oracle 交叉验证（前三柱与 lunar-javascript 独立计算一致）
  it('前三柱与 lunar-javascript 独立计算一致（oracle 双源）', async () => {
    for (const [y, m, d, h] of [[1859, 9, 16, 14], [1835, 11, 29, 22], [1881, 9, 25, 8], [1654, 5, 4, 10]] as const) {
      const ec = Solar.fromYmdHms(y, m, d, h, 0, 0).getLunar().getEightChar();
      ec.setSect(1);
      const oracle = [ec.getYear(), ec.getMonth(), ec.getDay()].join(' ');
      const p = await pillars(y, m, d, h);
      expect(p.three, `${y}-${m}-${d}`).toBe(oracle);
    }
  });
});

describe('边界条件', () => {
  const service = new BaziService({ debug: false });

  it('闰年 2000-02-29 → 庚辰 戊寅 丁巳 丙午', async () => {
    const r = await service.calculate({ year: 2000, month: 2, day: 29, hour: 12, gender: 'male' });
    const got = [r.chart.year, r.chart.month, r.chart.day, r.chart.hour].map((p: any) => p.stem + p.branch).join(' ');
    expect(got).toBe('庚辰 戊寅 丁巳 丙午');
  });

  it('年份下界 1900-01-01 早子时 → 己亥 丙子 甲戌 甲子', async () => {
    const r = await service.calculate({ year: 1900, month: 1, day: 1, hour: 0, gender: 'male' });
    const got = [r.chart.year, r.chart.month, r.chart.day, r.chart.hour].map((p: any) => p.stem + p.branch).join(' ');
    expect(got).toBe('己亥 丙子 甲戌 甲子');
  });

  it('年份上界 2099-12-31 23时（子初换日）→ 日柱属 2100-01-01 = 癸卯', async () => {
    const r = await service.calculate({ year: 2099, month: 12, day: 31, hour: 23, gender: 'male' });
    expect(r.chart.day.stem + r.chart.day.branch).toBe('癸卯'); // lunar oracle 确认
  });

  it('极端经度 +180°：真太阳时偏移 +12h（约午时）', async () => {
    const r = await service.calculate({ year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: 'male', longitude: 180 });
    const ts = r.birthInfo.trueSolarTime;
    expect(ts).toBeDefined();
    // 北京墙钟 = UTC载体 + 8h → 约 11:56 ≈ 午时
    expect(ts!.getUTCHours() + 8).toBeGreaterThanOrEqual(11);
    expect(ts!.getUTCHours() + 8).toBeLessThanOrEqual(12);
  });

  it('极端经度 -180°：真太阳时偏移 -12h（跨到前一日）', async () => {
    const r = await service.calculate({ year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: 'male', longitude: -180 });
    const ts = r.birthInfo.trueSolarTime;
    // 北京墙钟 ≈ 前一日 11:56 → 日柱应为 1999-12-31 的干支
    expect(ts!.getUTCDate()).toBe(31); // UTC 日期 31 → 前一日
  });
});

describe('子初换日扩充用例（不同年份/月份边界）', () => {
  const service = new BaziService({ debug: false });
  const cases = [
    // [年, 月, 日, 期望日柱] — 23:00 出生，日柱应属次日
    [1988, 2, 15, '辛丑'], // 立春后春节期间（已有金样本）
    [2000, 12, 31, '甲子'], // 跨年边界：2001-01-01 的日柱
    [1992, 6, 30, '戊寅'], // 月末
    [1990, 2, 28, '乙丑'], // 非闰年 2 月末
    [2004, 2, 29, '己卯'], // 闰年 2/29 → 3/1 的日柱
  ] as const;

  for (const [y, m, d, expectedDay] of cases) {
    it(`${y}-${m}-${d} 23:00 出生 → 日柱属次日 = ${expectedDay}`, async () => {
      const r = await service.calculate({ year: y, month: m, day: d, hour: 23, gender: 'male' });
      expect(r.chart.day.stem + r.chart.day.branch).toBe(expectedDay);
      // 时柱应为次日的子时
      expect(r.chart.hour.branch).toBe('子');
    });
  }

  // 所有子初换日用例与 lunar sect1 oracle 对照
  it('子初换日与 lunar sect1 oracle 一致', async () => {
    for (const [y, m, d] of [[1988, 2, 15], [2000, 12, 31], [1992, 6, 30]] as const) {
      const ec = Solar.fromYmdHms(y, m, d, 23, 0, 0).getLunar().getEightChar();
      ec.setSect(1);
      const oracleDay = ec.getDay();
      const r = await service.calculate({ year: y, month: m, day: d, hour: 23, gender: 'male' });
      expect(r.chart.day.stem + r.chart.day.branch, `${y}-${m}-${d}`).toBe(oracleDay);
    }
  });
});
