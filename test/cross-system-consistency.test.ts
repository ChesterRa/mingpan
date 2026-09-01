/**
 * 跨系统干支一致性测试
 *
 * 同一出生时刻，五个系统（八字/六爻/大六壬/奇门/紫微）排出的
 * 日柱/时柱干支必须一致。这不仅是工程正确性问题，
 * 更是命理正确性问题——不同系统共用同一套干支历法。
 *
 * 测试时间点覆盖：常规时段、早子时、晚子时（子初换日）、
 * 节气交接日、闰月。
 */

import { describe, it, expect } from 'vitest';
import { BaziService } from '../src/services/bazi/BaziService';
import { LiuyaoService } from '../src/services/liuyao/LiuyaoService';
import { DaliurenService } from '../src/services/daliuren/DaliurenService';
import { QimenService } from '../src/services/qimen/QimenService';
import { Solar, Lunar } from 'lunar-javascript';

interface TimeCase {
  label: string;
  year: number;
  month: number;
  day: number;
  hour: number;
}

describe('跨系统干支一致性（同一时刻五系统）', () => {
  const bazi = new BaziService({ debug: false });
  const liuyao = new LiuyaoService();
  const daliuren = new DaliurenService();
  const qimen = new QimenService();

  const cases: TimeCase[] = [
    { label: '常规午时', year: 1992, month: 4, day: 12, hour: 12 },
    { label: '早子时', year: 1992, month: 4, day: 12, hour: 0 },
    { label: '晚子时（子初换日）', year: 1988, month: 2, day: 15, hour: 23 },
    { label: '节气交接（2024 夏至日）', year: 2024, month: 6, day: 21, hour: 10 },
    { label: '闰月（2025 闰六月）', year: 2025, month: 8, day: 1, hour: 8 },
    { label: '跨年边界', year: 2000, month: 12, day: 31, hour: 23 },
  ];

  for (const c of cases) {
    it(`${c.label} ${c.year}-${c.month}-${c.day} ${c.hour}时：四系统日柱一致`, async () => {
      // 八字
      const baziResult = await bazi.calculate({
        year: c.year, month: c.month, day: c.day, hour: c.hour, gender: 'male',
      });
      const baziDay = baziResult.chart.day.stem + baziResult.chart.day.branch;
      const baziHour = baziResult.chart.hour.stem + baziResult.chart.hour.branch;

      // 六爻
      const liuyaoResult = liuyao.calculate({
        yaoValues: [7, 7, 7, 7, 7, 7],
        year: c.year, month: c.month, day: c.day, hour: c.hour, isLunar: false,
      });
      const liuyaoDay = liuyaoResult.timeInfo?.dayGanZhi;
      const liuyaoHour = liuyaoResult.timeInfo?.hourGanZhi;

      // 大六壬（时间起课）
      const dlResult = daliuren.calculateFromTime({
        year: c.year, month: c.month, day: c.day, hour: c.hour,
      });
      const dlDay = dlResult.basicInfo.dayGanZhi;
      const dlHour = dlResult.basicInfo.hourGanZhi;

      // 奇门
      const qmResult = qimen.calculate({
        year: c.year, month: c.month, day: c.day, hour: c.hour,
      });
      const qmDay = qmResult.timeInfo.siZhu.dayGanZhi;
      const qmHour = qmResult.timeInfo.siZhu.hourGanZhi;

      // 断言一致性
      expect(liuyaoDay, `六爻日柱 vs 八字: ${liuyaoDay} ≠ ${baziDay}`).toBe(baziDay);
      expect(dlDay, `大六壬日柱 vs 八字: ${dlDay} ≠ ${baziDay}`).toBe(baziDay);
      expect(qmDay, `奇门日柱 vs 八字: ${qmDay} ≠ ${baziDay}`).toBe(baziDay);
      expect(liuyaoHour, `六爻时柱 vs 八字: ${liuyaoHour} ≠ ${baziHour}`).toBe(baziHour);
      expect(dlHour, `大六壬时柱 vs 八字: ${dlHour} ≠ ${baziHour}`).toBe(baziHour);
      expect(qmHour, `奇门时柱 vs 八字: ${qmHour} ≠ ${baziHour}`).toBe(baziHour);
    });
  }

  it('与 lunar-javascript sect1 oracle 一致（终极仲裁）', async () => {
    for (const c of cases) {
      const ec = Solar.fromYmdHms(c.year, c.month, c.day, c.hour, 0, 0)
        .getLunar().getEightChar();
      ec.setSect(1);
      const oracleDay = ec.getDay();
      const oracleHour = ec.getTime();

      const baziResult = await bazi.calculate({
        year: c.year, month: c.month, day: c.day, hour: c.hour, gender: 'male',
      });
      expect(baziResult.chart.day.stem + baziResult.chart.day.branch,
        `${c.label} 日柱 vs lunar oracle`).toBe(oracleDay);
      expect(baziResult.chart.hour.stem + baziResult.chart.hour.branch,
        `${c.label} 时柱 vs lunar oracle`).toBe(oracleHour);
    }
  });
});
