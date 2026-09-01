/**
 * 奇門遁甲測試
 *
 * 口徑參照（均為傳統主流規則，且與開源參照 kentang2017/kinqimen 交叉驗證）：
 * - 張志春《神奇之門》（轉盤式）
 * - 拆補法三元：符頭為五日一組之首（甲日/己日），
 *   四仲（子午卯酉）上元、四孟（寅申巳亥）中元、四季（辰戌丑未）下元
 * - 地盤三奇六儀按宮位數字順（陽遁順布、陰遁逆布）
 * - 轉盤：天盤干/九星/八門為剛體轉盤，環序恆定；值符隨時干、值使隨時支（宮數飛）
 *
 * 端到端金样本：2024-06-21 10:00（夏至当日，陰遁三局中元）为手工逐项推演的全盘验证
 */

import { describe, it, expect } from 'vitest';
import { JuShuCalculator } from '../src/services/qimen/calculators/JuShuCalculator';
import { JiuGongCalculator } from '../src/services/qimen/calculators/JiuGongCalculator';
import { ZhuanPanCalculator } from '../src/services/qimen/calculators/ZhuanPanCalculator';
import { SanQiLiuYiCalculator } from '../src/services/qimen/calculators/SanQiLiuYiCalculator';
import { JiuXingCalculator } from '../src/services/qimen/calculators/JiuXingCalculator';
import { BaMenCalculator } from '../src/services/qimen/calculators/BaMenCalculator';
import { QimenService } from '../src/services/qimen/QimenService';
import { renderQimenText } from '../src/output/qimenTextRenderer';
import { JIA_ZI_60, SAN_QI_LIU_YI, getXunShou, getLiuYiGan } from '../src/services/qimen/data/constants';
import type { GongWei, TianGan, YinYangDun } from '../src/services/qimen/types';

/** 物理順時針環序（坎起） */
const RING: GongWei[] = [1, 8, 3, 4, 9, 2, 7, 6];
/** 轉盤九星環序 */
const XING_RING = ['蓬', '任', '冲', '辅', '英', '芮', '柱', '心'];
/** 轉盤八門環序 */
const MEN_RING = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];

describe('JuShuCalculator 拆補法三元', () => {
  it('六十甲子逐日三元應按五日符頭循環（上中下 × 4 輪）', () => {
    // 符頭序列：甲子(上) 己巳(中) 甲戌(下) 己卯(上) 甲申(中) 己丑(下)
    //           甲午(上) 己亥(中) 甲辰(下) 己酉(上) 甲寅(中) 己未(下)
    const expected = ['上元', '中元', '下元', '上元', '中元', '下元',
                      '上元', '中元', '下元', '上元', '中元', '下元'];
    JIA_ZI_60.forEach((gz, idx) => {
      const group = Math.floor(idx / 5);
      const jieQi = idx < 30 ? '冬至' : '夏至'; // 任意節氣均可，三元只看日干支
      const r = JuShuCalculator.calculate(jieQi, gz, 'chaibu');
      expect(r.yuan, `日干支 ${gz} 應為 ${expected[group]}`).toBe(expected[group]);
    });
  });

  it('經典符頭口徑：甲子/甲午/己卯/己酉為上元符頭', () => {
    for (const gz of ['甲子', '甲午', '己卯', '己酉']) {
      expect(JuShuCalculator.calculate('冬至', gz, 'chaibu').yuan).toBe('上元');
    }
  });

  it('經典符頭口徑：甲寅/甲申/己巳/己亥為中元符頭', () => {
    for (const gz of ['甲寅', '甲申', '己巳', '己亥']) {
      expect(JuShuCalculator.calculate('冬至', gz, 'chaibu').yuan).toBe('中元');
    }
  });

  it('經典符頭口徑：甲辰/甲戌/己丑/己未為下元符頭', () => {
    for (const gz of ['甲辰', '甲戌', '己丑', '己未']) {
      expect(JuShuCalculator.calculate('冬至', gz, 'chaibu').yuan).toBe('下元');
    }
  });

  it('同一旬內前後五日應分屬不同元（拆補法的拆補本義）', () => {
    // 甲子旬：甲子..戊辰為上元，己巳..癸酉為中元
    expect(JuShuCalculator.calculate('冬至', '戊辰', 'chaibu').yuan).toBe('上元');
    expect(JuShuCalculator.calculate('冬至', '己巳', 'chaibu').yuan).toBe('中元');
    expect(JuShuCalculator.calculate('冬至', '癸酉', 'chaibu').yuan).toBe('中元');
  });

  it('節氣局數表：冬至一七四、夏至九三六（陽順陰逆）', () => {
    expect(JuShuCalculator.calculate('冬至', '甲子', 'chaibu')).toMatchObject({ yinYangDun: '阳遁', juShu: 1 });
    expect(JuShuCalculator.calculate('冬至', '己巳', 'chaibu')).toMatchObject({ yinYangDun: '阳遁', juShu: 7 });
    expect(JuShuCalculator.calculate('冬至', '甲戌', 'chaibu')).toMatchObject({ yinYangDun: '阳遁', juShu: 4 });
    expect(JuShuCalculator.calculate('夏至', '甲子', 'chaibu')).toMatchObject({ yinYangDun: '阴遁', juShu: 9 });
    expect(JuShuCalculator.calculate('夏至', '己巳', 'chaibu')).toMatchObject({ yinYangDun: '阴遁', juShu: 3 });
    expect(JuShuCalculator.calculate('夏至', '甲戌', 'chaibu')).toMatchObject({ yinYangDun: '阴遁', juShu: 6 });
  });

  it('茅山法按交節後日數定三元', () => {
    const jq = new Date(2024, 5, 21); // 夏至日
    const mk = (d: number) => new Date(2024, 5, 21 + d);
    expect(JuShuCalculator.calculate('夏至', '甲子', 'maoshan', jq, mk(0)).yuan).toBe('上元');
    expect(JuShuCalculator.calculate('夏至', '甲子', 'maoshan', jq, mk(4)).yuan).toBe('上元');
    expect(JuShuCalculator.calculate('夏至', '甲子', 'maoshan', jq, mk(5)).yuan).toBe('中元');
    expect(JuShuCalculator.calculate('夏至', '甲子', 'maoshan', jq, mk(10)).yuan).toBe('下元');
  });
});

describe('JiuGongCalculator 地盤（宮數飛布）', () => {
  it('陽遁一局：戊坎1 己坤2 庚震3 辛巽4 壬中5 癸乾6 丁兌7 丙艮8 乙離9', () => {
    const { gongGan } = JiuGongCalculator.calculate(1, '阳遁');
    const expected: Record<number, TianGan> = { 1: '戊', 2: '己', 3: '庚', 4: '辛', 5: '壬', 6: '癸', 7: '丁', 8: '丙', 9: '乙' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(gongGan[g], `${g}宮`).toBe(expected[g]);
    }
  });

  it('陰遁九局：戊離9 己艮8 庚兌7 辛乾6 壬中5 癸巽4 丁震3 丙坤2 乙坎1', () => {
    const { gongGan } = JiuGongCalculator.calculate(9, '阴遁');
    const expected: Record<number, TianGan> = { 9: '戊', 8: '己', 7: '庚', 6: '辛', 5: '壬', 4: '癸', 3: '丁', 2: '丙', 1: '乙' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(gongGan[g], `${g}宮`).toBe(expected[g]);
    }
  });

  it('陽遁三局：從震3順數宮位', () => {
    const { gongGan } = JiuGongCalculator.calculate(3, '阳遁');
    const expected: Record<number, TianGan> = { 3: '戊', 4: '己', 5: '庚', 6: '辛', 7: '壬', 8: '癸', 9: '丁', 1: '丙', 2: '乙' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(gongGan[g], `${g}宮`).toBe(expected[g]);
    }
  });

  it('任意局數：九宮九干各居其一，中五宮之干寄坤二', () => {
    for (const ju of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
      for (const dun of ['阳遁', '阴遁'] as YinYangDun[]) {
        const { gongGan, ganGong } = JiuGongCalculator.calculate(ju, dun);
        const gans = Object.values(gongGan).sort();
        expect(gans, `${dun}${ju}局`).toEqual([...SAN_QI_LIU_YI].sort());
        const zhongGan = gongGan[5];
        expect(JiuGongCalculator.findGongByGan(ganGong, zhongGan)).toBe(2);
      }
    }
  });
});

describe('轉盤式排盤（剛體旋轉）', () => {
  /** 陽遁一局地盤 */
  const diPan1 = JiuGongCalculator.calculate(1, '阳遁');
  const dp = diPan1.gongGan;

  it('甲子時（旬首儀戊臨時干宮）：天地盤重合，星門歸位', () => {
    const tp = ZhuanPanCalculator.calculateTianPan(diPan1.ganGong, '甲子', '阳遁');
    // 時干甲→遁干戊，地盤戊在坎1 → 天盤不動
    for (const g of RING) {
      expect(tp.gongGan[g]).toBe(dp[g]);
    }
    const xing = ZhuanPanCalculator.calculateJiuXing(diPan1.ganGong['戊'], 1, '阳遁');
    RING.forEach((g, i) => expect(xing.gongXing[g]).toBe(XING_RING[i]));
    const men = ZhuanPanCalculator.calculateBaMen(1, '甲子', '阳遁');
    RING.forEach((g, i) => expect(men.gongMen[g]).toBe(MEN_RING[i]));
  });

  it('丙寅時（甲子旬）：值符天蓬攜戊轉艮8，全盤順轉一位', () => {
    const tp = ZhuanPanCalculator.calculateTianPan(diPan1.ganGong, '丙寅', '阳遁');
    expect(tp.gongGan[8]).toBe('戊'); // 戊坎1→艮8
    expect(tp.gongGan[3]).toBe('丙'); // 丙艮8→震3
    expect(tp.gongGan[1]).toBe('癸'); // 癸乾6→坎1
    // 環序保持：天盤干沿環與地盤干序一致
    const diRing = RING.map(g => dp[g]);
    const tianRing1 = RING.map(g => tp.gongGan[g]);
    // 旋轉一位後，tianRing 應是 diRing 的循環移位
    const shifted = [...diRing.slice(7), ...diRing.slice(0, 7)];
    expect(tianRing1).toEqual(shifted);

    const xing = ZhuanPanCalculator.calculateJiuXing(diPan1.ganGong['戊'], 8, '阳遁');
    expect(xing.zhiFuXing).toBe('蓬');
    expect(xing.gongXing[8]).toBe('蓬');
    expect(xing.gongXing[3]).toBe('任');
    // 星環序保持（循環同構）
    const ringXing = RING.map(g => xing.gongXing[g]).join('');
    expect(isCyclicRotation(XING_RING.join(''), ringXing)).toBe(true);

    const men = ZhuanPanCalculator.calculateBaMen(1, '丙寅', '阳遁');
    // 值使休門，丙寅旬內序2：1→2→3 落震3
    expect(men.zhiShiLuoGong).toBe(3);
    expect(men.gongMen[3]).toBe('休');
    expect(men.gongMen[4]).toBe('生'); // 環序順延
  });

  it('干隨星轉：每星攜其原始宮地盤干同行', () => {
    for (const hourGZ of ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉', '甲戌', '乙亥']) {
      const tp = ZhuanPanCalculator.calculateTianPan(diPan1.ganGong, hourGZ, '阳遁');
      const shiGong = ZhuanPanCalculator.getShiGanLuoGong(diPan1.ganGong, hourGZ);
      // 值符原始宮 = 該時辰旬首儀的地盤宮
      const fuGong = diPan1.ganGong[getLiuYiGan(getXunShou(hourGZ))];
      const xing = ZhuanPanCalculator.calculateJiuXing(fuGong === 5 ? 2 : fuGong, shiGong, '阳遁');
      RING.forEach((g, i) => {
        const xingAt = xing.gongXing[g];
        const homeIdx = XING_RING.indexOf(xingAt);
        const homeGong = RING[homeIdx];
        expect(tp.gongGan[g], `${hourGZ}時 ${g}宮 ${xingAt}星應攜地盤${dp[homeGong]}干`)
          .toBe(dp[homeGong]);
      });
    }
  });

  it('星門環序恆定：任意時辰下環上星序/門序保持循環一致', () => {
    for (const dun of ['阳遁', '阴遁'] as YinYangDun[]) {
      const d = JiuGongCalculator.calculate(4, dun).ganGong;
      const fuGong = d['壬'] as GongWei; // 陽遁4局旬首儀示例：取任一宮作值符原始宮驗證環序
      for (const hourGZ of ['丙子', '己卯', '癸未', '乙酉']) {
        const shiGong = ZhuanPanCalculator.getShiGanLuoGong(d, hourGZ);
        const xing = ZhuanPanCalculator.calculateJiuXing(fuGong, shiGong, dun);
        const men = ZhuanPanCalculator.calculateBaMen(fuGong, hourGZ, dun);
        const ringXing = RING.map(g => xing.gongXing[g]).join('');
        const ringMen = RING.map(g => men.gongMen[g]).join('');
        expect(isCyclicRotation(XING_RING.join(''), ringXing), `${dun} ${hourGZ} 星環序破壞: ${ringXing}`).toBe(true);
        expect(isCyclicRotation(MEN_RING.join(''), ringMen), `${dun} ${hourGZ} 門環序破壞: ${ringMen}`).toBe(true);
      }
    }
  });

  it('值使落宮：旬內序數按宮數順逆數，落中五寄坤二', () => {
    // 陽遁，值符原始宮兌7，戊寅時（甲戌旬內序4）：7→8→9→1→2 落坤2
    const m1 = ZhuanPanCalculator.calculateBaMen(7, '戊寅', '阳遁');
    expect(m1.zhiShiLuoGong).toBe(2);
    // 陰遁，值符原始宮乾6，丙戌時（甲申旬內序2）：6→5→4 落巽4（途經中五計數）
    const m2 = ZhuanPanCalculator.calculateBaMen(6, '丙戌', '阴遁');
    expect(m2.zhiShiLuoGong).toBe(4);
    // 陰遁落中五：乾6，乙酉時（甲申旬內序1）：6→5 → 寄坤2
    const m3 = ZhuanPanCalculator.calculateBaMen(6, '乙酉', '阴遁');
    expect(m3.zhiShiLuoGong).toBe(2);
  });
});

describe('飛盤式排盤（宮數飛布）', () => {
  it('值符隨時干起飛，其餘按儀序宮數飛布（陽遁一局 甲戌旬）', () => {
    const dp = JiuGongCalculator.calculate(1, '阳遁').ganGong;
    // 甲戌時：旬首儀己，時干甲→己，地盤己在坤2 → 天盤自坤2起：己2 庚3 辛4 壬5 癸6 丁7 丙8 乙9 戊1
    const tp = SanQiLiuYiCalculator.calculate(dp, '甲戌', '阳遁');
    const expected: Record<number, TianGan> = { 2: '己', 3: '庚', 4: '辛', 5: '壬', 6: '癸', 7: '丁', 8: '丙', 9: '乙', 1: '戊' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(tp.gongGan[g], `${g}宮`).toBe(expected[g]);
    }
  });

  it('飛盤九星：值符星落時干宮，餘星按原始序飛布', () => {
    // 值符原始宮坎1（天蓬），時干落宮離9：蓬9 芮1 冲2 辅3 禽4 心5 柱6 任7 英8
    const xing = JiuXingCalculator.calculate(1, 9, '阳遁');
    const expected: Record<number, string> = { 9: '蓬', 1: '芮', 2: '冲', 3: '辅', 4: '禽', 5: '心', 6: '柱', 7: '任', 8: '英' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(xing.gongXing[g], `${g}宮`).toBe(expected[g]);
    }
    expect(xing.zhiFuLuoGong).toBe(9);
  });

  it('飛盤八門：值使門落宮後餘門按序飛布（跳過中五）', () => {
    // 值符原始宮坎1（值使休門），甲子時序0 → 休落坎1；門序休生傷杜景死驚開飛 1,2,3,4,6,7,8,9
    const men = BaMenCalculator.calculate(1, '甲子', '阳遁');
    expect(men.zhiShiLuoGong).toBe(1);
    expect(men.gongMen[1]).toBe('休');
    expect(men.gongMen[2]).toBe('生');
    expect(men.gongMen[3]).toBe('伤');
    expect(men.gongMen[4]).toBe('杜');
    expect(men.gongMen[6]).toBe('景');
    expect(men.gongMen[7]).toBe('死');
    expect(men.gongMen[8]).toBe('惊');
    expect(men.gongMen[9]).toBe('开');
  });
});

describe('QimenService 端到端', () => {
  const service = new QimenService();

  it('金樣本：2024-06-21 10:00 夏至當日 陰遁三局中元（手工逐項推演）', () => {
    const r = service.calculate({ year: 2024, month: 6, day: 21, hour: 10 });

    // 時間基礎：夏至日，日柱丙辰，時柱癸巳
    expect(r.timeInfo.jieQi).toBe('夏至');
    expect(r.timeInfo.siZhu.dayGanZhi).toBe('丙辰');
    expect(r.timeInfo.siZhu.hourGanZhi).toBe('癸巳');

    // 局數：夏至九三六，丙辰日符頭甲寅（四孟）→ 中元 → 陰遁三局
    expect(r.yinYangDun).toBe('阴遁');
    expect(r.juShu).toBe(3);
    expect(r.yuan).toBe('中元');

    // 地盤（陰遁三局逆布）
    const diPan: Record<number, TianGan> = { 3: '戊', 2: '己', 1: '庚', 9: '辛', 8: '壬', 7: '癸', 6: '丁', 5: '丙', 4: '乙' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(r.gongs[g].diPanGan, `${g}宮地盤`).toBe(diPan[g]);
    }

    // 旬首甲申儀庚，庚臨地盤坎1 → 值符天蓬；時干癸臨地盤兌7 → 值符落兌7
    expect(r.xunShou.xunShou).toBe('甲申');
    expect(r.xunShou.zhiFuXing).toBe('蓬');
    expect(r.xunShou.zhiFuLuoGong).toBe(7);
    expect(r.xunShou.zhiShiMen).toBe('休');

    // 值使：癸巳旬內序9，陰遁自坎1逆數九宮 → 落坎1
    expect(r.xunShou.zhiShiLuoGong).toBe(1);

    // 天盤（逆時針轉兩位）
    const tianPan: Record<number, TianGan> = { 1: '戊', 8: '乙', 3: '辛', 4: '己', 9: '癸', 2: '丁', 7: '庚', 6: '壬', 5: '丁' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(r.gongs[g].tianPanGan, `${g}宮天盤`).toBe(tianPan[g]);
    }

    // 九星（環序蓬任冲辅英芮柱心逆轉兩位）
    const xing: Record<number, string> = { 7: '蓬', 6: '任', 1: '冲', 8: '辅', 3: '英', 4: '芮', 9: '柱', 2: '心', 5: '禽' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(r.gongs[g].xing, `${g}宮星`).toBe(xing[g]);
    }

    // 八門（值使休落坎1，門環歸位）
    const men: Record<number, string> = { 1: '休', 8: '生', 3: '伤', 4: '杜', 9: '景', 2: '死', 7: '惊', 6: '开', 5: '死' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(r.gongs[g].men, `${g}宮門`).toBe(men[g]);
    }

    // 八神（值符落兌7，陰遁逆時針：符7 蛇2 陰9 合4 虎3 武8 地1 天6）
    const shen: Record<number, string> = { 7: '符', 2: '蛇', 9: '阴', 4: '合', 3: '虎', 8: '武', 1: '地', 6: '天', 5: '蛇' };
    for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9] as GongWei[]) {
      expect(r.gongs[g].shen, `${g}宮神`).toBe(shen[g]);
    }
  });

  it('快照回歸：常用日期 × 盤式組合', () => {
    const cases = [
      { year: 2024, month: 6, day: 21, hour: 10, label: '時盤轉盤拆補' },
      { year: 2024, month: 6, day: 21, hour: 10, panStyle: '飞盘' as const, label: '時盤飛盤拆補' },
      { year: 2024, month: 2, day: 4, hour: 14, panType: '日盘' as const, label: '日盤轉盤拆補' },
      { year: 2024, month: 2, day: 4, hour: 14, zhiRunMethod: 'maoshan' as const, label: '時盤轉盤茅山' },
      { year: 2024, month: 10, day: 1, hour: 8, label: '國慶晨盤' },
    ];
    for (const c of cases) {
      const r = service.calculate({
        year: c.year, month: c.month, day: c.day, hour: c.hour,
        panType: c.panType ?? '时盘', panStyle: c.panStyle ?? '转盘', zhiRunMethod: c.zhiRunMethod ?? 'chaibu',
      });
      expect(summarize(r)).toMatchSnapshot(`${c.label} ${c.year}-${c.month}-${c.day} ${c.hour}時`);
    }
  });

  it('文本渲染：輸出 Markdown 九宮格', () => {
    const r = service.calculate({ year: 2024, month: 6, day: 21, hour: 10 });
    const text = renderQimenText(r);
    expect(text).toContain('阴遁3局');
    expect(text).toContain('值符');
    expect(text.length).toBeGreaterThan(200);
  });

  it('農曆輸入與公曆輸入應排出同盤', () => {
    // 2024-06-21 = 甲辰年五月十六
    const solar = service.calculate({ year: 2024, month: 6, day: 21, hour: 10 });
    const lunar = service.calculate({ year: 2024, month: 5, day: 16, hour: 10, isLunar: true });
    expect(lunar.juShu).toBe(solar.juShu);
    expect(lunar.yinYangDun).toBe(solar.yinYangDun);
    expect(lunar.xunShou.zhiFuXing).toBe(solar.xunShou.zhiFuXing);
    expect(lunar.xunShou.zhiShiLuoGong).toBe(solar.xunShou.zhiShiLuoGong);
  });
});

/** 判斷 s2 是否為 s1 的循環移位 */
function isCyclicRotation(s1: string, s2: string): boolean {
  if (s1.length !== s2.length) return false;
  return (s1 + s1).includes(s2);
}

/** 構造用於快照的盤面摘要 */
function summarize(r: ReturnType<QimenService['calculate']>) {
  return {
    jieQi: r.timeInfo.jieQi,
    siZhu: r.timeInfo.siZhu,
    yinYangDun: r.yinYangDun,
    juShu: r.juShu,
    yuan: r.yuan,
    xunShou: {
      xunShou: r.xunShou.xunShou,
      zhiFuXing: r.xunShou.zhiFuXing,
      zhiFuLuoGong: r.xunShou.zhiFuLuoGong,
      zhiShiMen: r.xunShou.zhiShiMen,
      zhiShiLuoGong: r.xunShou.zhiShiLuoGong,
      kongWang: r.xunShou.kongWang,
    },
    gongs: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => ({
      g,
      tian: r.gongs[g as GongWei].tianPanGan,
      di: r.gongs[g as GongWei].diPanGan,
      xing: r.gongs[g as GongWei].xing,
      men: r.gongs[g as GongWei].men,
      shen: r.gongs[g as GongWei].shen,
      kong: r.gongs[g as GongWei].isKong,
    })),
  };
}

// ============= 年盤典籍口徑金樣本（《遁甲演義》三元年遁） =============
// 上元甲子 1864-1923 陰遁一局；中元 1924-1983 陰遁四局；下元 1984-2043 陰遁七局；
// 六十年一元、一百八十年一大週期；年家奇門只用陰遁。
import { PanTypeCalculator } from '../src/services/qimen/calculators/PanTypeCalculator';

describe('年盤典籍口徑（三元年遁）', () => {
  const cases: Array<[number, '阴遁1局' | '阴遁4局' | '阴遁7局', string]> = [
    [1900, '阴遁1局', '上元（1864-1923）'],
    [1923, '阴遁1局', '上元末年'],
    [1924, '阴遁4局', '中元首年'],
    [1975, '阴遁4局', '中元'],
    [1984, '阴遁7局', '下元首年（1984-2043）'],
    [2002, '阴遁7局', '壬午年（知乎排盤實例之年）'],
    [2024, '阴遁7局', '當代'],
    [2044, '阴遁1局', '下一大週期上元首年'],
  ];

  for (const [year, expected, label] of cases) {
    it(`${year} 年 → ${expected}（${label}）`, () => {
      const r = PanTypeCalculator.calculateYearPan({
        yearGanZhi: '甲子', // 局数只由年份定元决定，与干支无关（典籍口径）
        currentJieQi: '冬至',
        year,
      });
      expect(r.yinYangDun).toBe('阴遁');
      expect(`${r.yinYangDun}${r.juShu}局`).toBe(expected);
    });
  }

  it('三元与局数一致性：上元1/中元4/下元7', () => {
    expect(PanTypeCalculator.calculateYearPan({ yearGanZhi: '甲子', currentJieQi: '冬至', year: 1990 }).yuan).toBe('下元');
    expect(PanTypeCalculator.calculateYearPan({ yearGanZhi: '甲子', currentJieQi: '冬至', year: 1950 }).yuan).toBe('中元');
    expect(PanTypeCalculator.calculateYearPan({ yearGanZhi: '甲子', currentJieQi: '冬至', year: 1900 }).yuan).toBe('上元');
  });
});
