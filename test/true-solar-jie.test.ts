/**
 * 真太陽時與節界回歸測試（issue #3）
 *
 * 口徑：提供經度時，日柱、時柱（含子初換日）與農曆日期依出生地真太陽時；年柱、月柱、
 * 命宮與胎元的年月部分、起運與大運，依出生時刻對照北京時間節氣表，與經度無關。
 * 同壽星萬年曆 mingLiBaZi 的原寫法（taro-bazi src/utils/solarTerm.ts 保留的註解）：
 * 年月柱取此刻太陽視黃經，只有日時柱取真太陽時。拿真太陽時去比北京時間節氣表是混鐘。
 *
 * 驗收以不變量為主：同一出生時刻，傳不傳經度，年柱、月柱、起運、大運必須相同；
 * 日柱、時柱必須等於「以真太陽時牆鐘、不帶經度」排出的日柱、時柱（即修正前的日時柱行為）。
 * 本檔不設 process.env.TZ，宿主時區矩陣由 CI／發布前以 TZ=UTC、TZ=America/New_York 重跑。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { Solar } from 'lunar-javascript';
import { BaziCore } from '../src/core/bazi/BaziCore';
import type { BaziCoreResult } from '../src/core/bazi/types';
import { BaziService } from '../src/services/bazi/BaziService';
import { createMingpanServer } from '../src/server';

const MINUTE = 60_000;
const gz = (p: { stem: string; branch: string }) => p.stem + p.branch;

/** 北京墙鐘載體的牆鐘分量（minute 截到整分，與工具輸入一致） */
const wall = (d: Date) => ({
  year: d.getUTCFullYear(),
  month: d.getUTCMonth() + 1,
  day: d.getUTCDate(),
  hour: d.getUTCHours(),
  minute: d.getUTCMinutes(),
});
const carrier = (w: ReturnType<typeof wall>) => new Date(Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute));

/** lunar-javascript 節氣精確時刻（北京時間）→ 北京墙鐘載體 */
function jieCarrier(year: number, name: string): Date {
  const s = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable()[name];
  return new Date(Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()));
}

const JIE = ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪'];

describe('真太陽時只決定日柱、時柱：合成邊界例', () => {
  const service = new BaziService({ debug: false, enableCaching: false });

  // 牆鐘均為北京標準時；期望年月柱以出生時刻比節氣，日時柱為修正前（真太陽時）的結果。
  const cases = [
    { id: 'A 白露後約5分·重慶', w: { year: 2025, month: 9, day: 7, hour: 16, minute: 56 }, lon: 106.55, term: '白露', ym: ['乙巳', '乙酉'], dh: ['己卯', '壬申'] },
    { id: 'B 立春後約20分·重慶', w: { year: 2026, month: 2, day: 4, hour: 4, minute: 22 }, lon: 106.55, term: '立春', ym: ['丙午', '庚寅'], dh: ['己酉', '丙寅'] },
    { id: 'C 立春後約12小時·紐約（美東 03:02）', w: { year: 2026, month: 2, day: 4, hour: 16, minute: 2 }, lon: -74.0, term: '立春', ym: ['丙午', '庚寅'], dh: ['己酉', '乙丑'] },
    { id: 'D 白露前約10分·哈爾濱（120°E 以東）', w: { year: 2025, month: 9, day: 7, hour: 16, minute: 41 }, lon: 126.63, term: '立秋', ym: ['乙巳', '甲申'], dh: ['己卯', '癸酉'] },
    { id: 'E 立春後約10分·正好 120°E（均時差約 −14 分）', w: { year: 2026, month: 2, day: 4, hour: 4, minute: 12 }, lon: 120, term: '立春', ym: ['丙午', '庚寅'], dh: ['己酉', '丙寅'] },
    { id: 'F 夏令時年份合成例：1990 立秋後約5分（夏令時牆鐘 03:50 已換成標準時）', w: { year: 1990, month: 8, day: 8, hour: 2, minute: 50 }, lon: 106.55, term: '立秋', ym: ['庚午', '甲申'], dh: ['乙巳', '丁丑'] },
  ];

  for (const c of cases) {
    it(c.id, async () => {
      const withLon = await service.calculate({ ...c.w, gender: 'male', longitude: c.lon });
      const without = await service.calculate({ ...c.w, gender: 'male' });

      expect([gz(withLon.chart.year), gz(withLon.chart.month)]).toEqual(c.ym);
      expect(withLon.birthInfo.solarTerm).toBe(c.term);
      expect([gz(withLon.chart.day), gz(withLon.chart.hour)]).toEqual(c.dh);
      expect(withLon.birthInfo.trueSolarTime).toBeDefined();

      // 起運與大運只看出生時刻
      expect(withLon.birthInfo.solar.getTime()).toBe(carrier(c.w).getTime());
      expect(withLon.meta.luckSequence).toEqual(without.meta.luckSequence);
      const luck = (r: typeof withLon) => r.timeBased.daYun.map((d: any) => `${d.stem}${d.branch}:${d.startAge}-${d.endAge}`);
      expect(luck(withLon)).toEqual(luck(without));
    });
  }
});

describe('不變量：同一出生時刻，經度只改日柱、時柱', () => {
  const core = new BaziCore();
  const LONGITUDES = [-157.86, -74.0, -0.13, 75.99, 106.55, 120, 126.63, 139.69, 180];
  const OFFSETS_MIN = [-790, -185, -61, -16, -5, -1, 1, 5, 16, 61, 185, 790];

  // 命宮的獨立 oracle：在同一節月中段取一個時支相同的時刻，交給 lunar-javascript 計算
  const BRANCH_HOUR: Record<string, number> = { 子: 0, 丑: 1, 寅: 3, 卯: 5, 辰: 7, 巳: 9, 午: 11, 未: 13, 申: 15, 酉: 17, 戌: 19, 亥: 21 };
  function mingGongOracle(instant: Date, hourBranch: string): string {
    const jie = Solar.fromYmdHms(instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
      instant.getUTCHours(), instant.getUTCMinutes(), 0).getLunar().getPrevJie().getSolar();
    const mid = new Date(Date.UTC(jie.getYear(), jie.getMonth() - 1, jie.getDay() + 10));
    return Solar.fromYmdHms(mid.getUTCFullYear(), mid.getUTCMonth() + 1, mid.getUTCDate(), BRANCH_HOUR[hourBranch], 30, 0)
      .getLunar().getEightChar().getMingGong();
  }

  it('2025–2026 全部 24 個節 × 12 個時距 × 9 個經度', async () => {
    let checked = 0;
    let flippedBeforeFix = 0;
    for (const year of [2025, 2026]) {
      for (const name of JIE) {
        const jie = jieCarrier(year, name);
        for (const off of OFFSETS_MIN) {
          const w = wall(new Date(jie.getTime() + off * MINUTE));
          const base = await core.calculate({ ...w, gender: 'male' });
          for (const lon of LONGITUDES) {
            const r: BaziCoreResult = await core.calculate({ ...w, gender: 'male', longitude: lon });
            const tst = r.birthInfo.trueSolarTime!;
            const local = await core.calculate({ ...wall(tst), gender: 'male' });

            // 節界：與經度無關
            expect(gz(r.chart.year)).toBe(gz(base.chart.year));
            expect(gz(r.chart.month)).toBe(gz(base.chart.month));
            expect(r.birthInfo.solarTerm).toBe(base.birthInfo.solarTerm);
            expect(r.taiYuan).toBe(base.taiYuan);
            expect(r.birthInfo.solar.getTime()).toBe(base.birthInfo.solar.getTime());
            // 日、時柱與農曆：等於以真太陽時牆鐘、不帶經度排出的結果
            expect(gz(r.chart.day)).toBe(gz(local.chart.day));
            expect(gz(r.chart.hour)).toBe(gz(local.chart.hour));
            expect(r.birthInfo.lunar).toEqual(local.birthInfo.lunar);
            // 命宮：年干、月支隨出生時刻，時支隨真太陽時
            expect(r.mingGong).toBe(mingGongOracle(carrier(w), r.chart.hour.branch));

            // 修正前做法（以真太陽時牆鐘比節氣）會在這些點翻錯年月柱的次數，用來確認樣本確實壓在邊界上
            if (gz(local.chart.month) !== gz(base.chart.month)) flippedBeforeFix++;
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(2 * 12 * 12 * 9);
    expect(flippedBeforeFix).toBeGreaterThan(200);
  });
});

describe('命宮、胎元公式與 lunar-javascript 逐例一致（不帶經度）', () => {
  const core = new BaziCore();

  it('2024–2026 每隔 37 小時 13 分取樣，並加上每個節前後 1 分鐘', async () => {
    const samples: Date[] = [];
    for (let t = Date.UTC(2024, 0, 1, 0, 7); t < Date.UTC(2027, 0, 1); t += (37 * 60 + 13) * MINUTE) samples.push(new Date(t));
    for (const year of [2024, 2025, 2026]) {
      for (const name of JIE) {
        const jie = jieCarrier(year, name).getTime();
        samples.push(new Date(jie - MINUTE), new Date(jie + MINUTE));
      }
    }
    for (const d of samples) {
      const w = wall(d);
      const r = await core.calculate({ ...w, gender: 'female' });
      const ec = Solar.fromYmdHms(w.year, w.month, w.day, w.hour, w.minute, 0).getLunar().getEightChar();
      expect(r.mingGong).toBe(ec.getMingGong());
      expect(r.taiYuan).toBe(ec.getTaiYuan());
      expect([gz(r.chart.year), gz(r.chart.month)]).toEqual([ec.getYear(), ec.getMonth()]);
    }
    expect(samples.length).toBe(707 + 72); // 等距樣本 + 3 年 × 12 節 × 前後各 1 分鐘
  });
});

describe('計算快取：未傳經度與 longitude: 0 是兩種盤', () => {
  // 2026-02-04 04:03 北京時間，立春（04:02:08）之後
  const input = { year: 2026, month: 2, day: 4, hour: 4, minute: 3, gender: 'male' as const };

  it('同一實例先後調用、反序調用，結果都不互相覆蓋', async () => {
    const first = new BaziService({ debug: false, enableCaching: true });
    const omittedA = await first.calculate(input);
    const zeroA = await first.calculate({ ...input, longitude: 0 });

    const second = new BaziService({ debug: false, enableCaching: true });
    const zeroB = await second.calculate({ ...input, longitude: 0 });
    const omittedB = await second.calculate(input);

    const pillars = (r: typeof omittedA) => [r.chart.year, r.chart.month, r.chart.day, r.chart.hour].map(gz);
    expect(pillars(omittedA)).toEqual(['丙午', '庚寅', '己酉', '丙寅']);
    expect(pillars(zeroA)).toEqual(['丙午', '庚寅', '戊申', '壬戌']); // 0° 真太陽時約前一日 19:49
    expect(pillars(omittedB)).toEqual(pillars(omittedA));
    expect(pillars(zeroB)).toEqual(pillars(zeroA));
    expect(omittedA.birthInfo.trueSolarTime).toBeUndefined();
    expect(zeroA.birthInfo.trueSolarTime).toBeDefined();
  });
});

describe('MCP 出口：bazi_basic / bazi_dayun', () => {
  let client: Client;

  beforeAll(async () => {
    const server = createMingpanServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: 'true-solar-jie-test', version: '0.0.1' });
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
  });

  const text = async (name: string, args: Record<string, unknown>) => {
    const res = await client.callTool({ name, arguments: args });
    expect(res.isError).toBeFalsy();
    return (res.content as Array<{ type: string; text: string }>).map((c) => c.text).join('\n');
  };

  it('夏令時年份合成例：夏令時牆鐘 + timezone + 經度，月柱為甲申，並寫明口徑', async () => {
    // 1990 立秋為北京標準時 08-08 02:45:32；夏令時牆鐘 03:50 即標準時 02:50，已過立秋
    const out = await text('bazi_basic', {
      year: 1990, month: 8, day: 8, hour: 3, minute: 50, gender: 'female', timezone: 'Asia/Shanghai', longitude: 106.55,
    });
    expect(out).toContain('月柱：甲申');
    expect(out).toContain('真太陽時：1990-08-08 01:50:34（按經度校正：日柱、時柱以此排盤；年柱、月柱與起運依出生時刻對照節氣）');
    expect(out).toMatch(/農曆：.+（依真太陽時）/);
    expect(out).not.toContain('四柱以此排盤');
  });

  it('五個八字出口的農曆生日一致：有經度時依真太陽時並註明', async () => {
    // 2026-02-04 04:03 北京時間；經度 0° 的真太陽時約前一日 19:49（戌時）
    const birth = { year: 2026, month: 2, day: 4, hour: 4, minute: 3, gender: 'male' };
    const tools: Array<[string, Record<string, unknown>]> = [
      ['bazi_basic', {}],
      ['bazi_dayun', { count: 2 }],
      ['bazi_liunian', { startYear: 2030, endYear: 2030 }],
      ['bazi_liuyue', { ganzhiYear: 2030 }],
      ['bazi_liuri', { ganzhiYear: 2030, ganzhiMonth: 1 }],
    ];
    const lunarLine = (t: string) => t.split('\n').find((l) => l.startsWith('農曆：'));
    for (const [name, extra] of tools) {
      const withLon = await text(name, { ...birth, ...extra, longitude: 0 });
      expect(lunarLine(withLon), name).toBe('農曆：乙巳年臘月十六戌時（依真太陽時）');
      expect(withLon, name).toMatch(/時柱：壬戌/);
      const without = await text(name, { ...birth, ...extra });
      expect(lunarLine(without), name).toBe('農曆：乙巳年臘月十七寅時');
    }
  });

  it('白露後約5分·重慶：大運列表與起運不隨經度改變', async () => {
    const args = { year: 2025, month: 9, day: 7, hour: 16, minute: 56, gender: 'male', timezone: 'Asia/Shanghai', count: 8 };
    const without = await text('bazi_dayun', args);
    const withLon = await text('bazi_dayun', { ...args, longitude: 106.55 });
    const luckLines = (t: string) => t.split('\n').filter((l) => /起運|大運方向|^\s*\d|歲/.test(l));
    // 起運歲數 = 交運公曆年 − 出生公曆年 + 1（虛歲）；本例出生約 8 小時後即交運
    expect(without).toContain('起運年齡：1虛歲（2025年起運）');
    expect(luckLines(withLon)).toEqual(luckLines(without));
    expect(withLon).toContain('月柱：乙酉');
  });
});
