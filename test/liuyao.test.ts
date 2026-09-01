/**
 * 六爻計算回歸測試
 *
 * 測試範圍：
 * 1. 納甲計算
 * 2. 六親計算
 * 3. 六神計算
 * 4. 旬空計算
 * 5. 世應計算
 * 6. 完整排盤
 *
 * 測試數據來源：京房納甲體系標準口徑
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LiuyaoService } from '../src/services/liuyao/LiuyaoService';
import { NajiaCalculator } from '../src/services/liuyao/calculators/NajiaCalculator';
import { LiuqinCalculator } from '../src/services/liuyao/calculators/LiuqinCalculator';
import { LiushenCalculator } from '../src/services/liuyao/calculators/LiushenCalculator';
import { XunkongCalculator } from '../src/services/liuyao/calculators/XunkongCalculator';
import { FushenCalculator } from '../src/services/liuyao/calculators/FushenCalculator';
import { JintuishenCalculator } from '../src/services/liuyao/calculators/JintuishenCalculator';
import { WangshuaiCalculator } from '../src/services/liuyao/calculators/WangshuaiCalculator';
import { getGua64Info } from '../src/services/liuyao/data/guagong';
import { BEIJING_TZ } from '../src/utils/timeNormalization';

beforeAll(() => {
  process.env.TZ = BEIJING_TZ;
});

describe('納甲計算', () => {
  it('乾卦納甲應正確', () => {
    // 乾為天：內卦乾（子寅辰），外卦乾（午申戌）
    const results = NajiaCalculator.calculateAll('乾', '乾');

    expect(results[0].diZhi).toBe('子'); // 初爻
    expect(results[1].diZhi).toBe('寅'); // 二爻
    expect(results[2].diZhi).toBe('辰'); // 三爻
    expect(results[3].diZhi).toBe('午'); // 四爻
    expect(results[4].diZhi).toBe('申'); // 五爻
    expect(results[5].diZhi).toBe('戌'); // 上爻
  });

  it('坤卦納甲應正確', () => {
    // 坤為地：內卦坤（未巳卯），外卦坤（丑亥酉）
    const results = NajiaCalculator.calculateAll('坤', '坤');

    expect(results[0].diZhi).toBe('未'); // 初爻
    expect(results[1].diZhi).toBe('巳'); // 二爻
    expect(results[2].diZhi).toBe('卯'); // 三爻
    expect(results[3].diZhi).toBe('丑'); // 四爻
    expect(results[4].diZhi).toBe('亥'); // 五爻
    expect(results[5].diZhi).toBe('酉'); // 上爻
  });

  it('天火同人納甲應正確', () => {
    // 天火同人：內卦離（卯丑亥），外卦乾（午申戌）
    const results = NajiaCalculator.calculateAll('乾', '離');

    expect(results[0].diZhi).toBe('卯'); // 初爻（離內卦）
    expect(results[1].diZhi).toBe('丑'); // 二爻
    expect(results[2].diZhi).toBe('亥'); // 三爻
    expect(results[3].diZhi).toBe('午'); // 四爻（乾外卦）
    expect(results[4].diZhi).toBe('申'); // 五爻
    expect(results[5].diZhi).toBe('戌'); // 上爻
  });
});

describe('六親計算', () => {
  it('同我者為兄弟', () => {
    expect(LiuqinCalculator.calculate('金', '金')).toBe('兄弟');
  });

  it('生我者為父母', () => {
    // 土生金
    expect(LiuqinCalculator.calculate('金', '土')).toBe('父母');
  });

  it('我生者為子孫', () => {
    // 金生水
    expect(LiuqinCalculator.calculate('金', '水')).toBe('子孫');
  });

  it('克我者為官鬼', () => {
    // 火克金
    expect(LiuqinCalculator.calculate('金', '火')).toBe('官鬼');
  });

  it('我克者為妻財', () => {
    // 金克木
    expect(LiuqinCalculator.calculate('金', '木')).toBe('妻財');
  });
});

describe('六神計算', () => {
  it('甲日青龍起初爻', () => {
    const results = LiushenCalculator.calculateAll('甲');
    expect(results[0]).toBe('青龍');
    expect(results[1]).toBe('朱雀');
    expect(results[2]).toBe('勾陳');
    expect(results[3]).toBe('螣蛇');
    expect(results[4]).toBe('白虎');
    expect(results[5]).toBe('玄武');
  });

  it('丙日朱雀起初爻', () => {
    const results = LiushenCalculator.calculateAll('丙');
    expect(results[0]).toBe('朱雀');
    expect(results[1]).toBe('勾陳');
  });

  it('壬日玄武起初爻', () => {
    const results = LiushenCalculator.calculateAll('壬');
    expect(results[0]).toBe('玄武');
    expect(results[1]).toBe('青龍');
  });
});

describe('旬空計算', () => {
  it('甲子旬空戌亥', () => {
    const xunKong = XunkongCalculator.calculate('甲', '子');
    expect(xunKong).toContain('戌');
    expect(xunKong).toContain('亥');
  });

  it('甲戌旬空申酉', () => {
    const xunKong = XunkongCalculator.calculate('甲', '戌');
    expect(xunKong).toContain('申');
    expect(xunKong).toContain('酉');
  });

  it('甲午旬空辰巳', () => {
    const xunKong = XunkongCalculator.calculate('甲', '午');
    expect(xunKong).toContain('辰');
    expect(xunKong).toContain('巳');
  });

  it('乙丑日空戌亥', () => {
    // 乙丑在甲子旬
    const xunKong = XunkongCalculator.calculate('乙', '丑');
    expect(xunKong).toContain('戌');
    expect(xunKong).toContain('亥');
  });
});

describe('世應計算', () => {
  it('本宮卦世在六爻', () => {
    // 乾為天是乾宮本宮卦
    const guaInfo = getGua64Info('乾', '乾');
    expect(guaInfo.shiYao).toBe(6);
    expect(guaInfo.yingYao).toBe(3);
  });

  it('一世卦世在初爻', () => {
    // 天風姤是乾宮一世卦
    const guaInfo = getGua64Info('乾', '巽');
    expect(guaInfo.shiYao).toBe(1);
    expect(guaInfo.yingYao).toBe(4);
  });

  it('遊魂卦世在四爻', () => {
    // 火地晉是乾宮遊魂卦
    const guaInfo = getGua64Info('離', '坤');
    expect(guaInfo.guaXu).toBe(7);
    expect(guaInfo.shiYao).toBe(4);
  });

  it('歸魂卦世在三爻', () => {
    // 火天大有是乾宮歸魂卦
    const guaInfo = getGua64Info('離', '乾');
    expect(guaInfo.guaXu).toBe(8);
    expect(guaInfo.shiYao).toBe(3);
  });
});

describe('完整排盤', () => {
  const liuyaoService = new LiuyaoService();

  it('乾為天排盤', () => {
    // 全陽爻（7,7,7,7,7,7）= 乾為天
    const result = liuyaoService.calculate({
      yaoValues: [7, 7, 7, 7, 7, 7],
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    expect(result.benGua.name).toBe('乾為天');
    expect(result.benGua.gong).toBe('乾');
    expect(result.benGua.gongWuXing).toBe('金');
    expect(result.benGua.shiYaoPosition).toBe(6);
    expect(result.benGua.yingYaoPosition).toBe(3);
    expect(result.movingYaoPositions).toHaveLength(0);
    expect(result.bianGua).toBeUndefined();
  });

  it('坤為地排盤', () => {
    // 全陰爻（8,8,8,8,8,8）= 坤為地
    const result = liuyaoService.calculate({
      yaoValues: [8, 8, 8, 8, 8, 8],
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    expect(result.benGua.name).toBe('坤為地');
    expect(result.benGua.gong).toBe('坤');
    expect(result.benGua.gongWuXing).toBe('土');
  });

  it('動爻變卦計算', () => {
    // 初爻動（9,7,7,7,7,7）= 乾為天 → 天風姤
    // 9=老陽(動)，陽變陰，初爻變陰後下卦為巽
    // 乾(111) -> 巽(011)，上卦仍為乾(111)
    const result = liuyaoService.calculate({
      yaoValues: [9, 7, 7, 7, 7, 7],
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    expect(result.benGua.name).toBe('乾為天');
    expect(result.bianGua).toBeDefined();
    expect(result.bianGua!.name).toBe('天風姤');
    expect(result.movingYaoPositions).toEqual([1]);
    expect(result.yaoList[0].isMoving).toBe(true);
  });

  it('多動爻變卦計算', () => {
    // 初爻和四爻動（9,7,7,9,7,7）
    const result = liuyaoService.calculate({
      yaoValues: [9, 7, 7, 9, 7, 7],
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    expect(result.movingYaoPositions).toEqual([1, 4]);
    expect(result.yaoList[0].isMoving).toBe(true);
    expect(result.yaoList[3].isMoving).toBe(true);
  });

  it('六親計算正確', () => {
    // 乾為天，卦宮五行為金
    const result = liuyaoService.calculate({
      yaoValues: [7, 7, 7, 7, 7, 7],
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    // 初爻子水，金生水，為子孫
    expect(result.yaoList[0].liuQin).toBe('子孫');
    // 二爻寅木，金克木，為妻財
    expect(result.yaoList[1].liuQin).toBe('妻財');
    // 三爻辰土，土生金，為父母
    expect(result.yaoList[2].liuQin).toBe('父母');
  });

  it('時間信息計算正確', () => {
    const result = liuyaoService.calculate({
      yaoValues: [7, 7, 7, 7, 7, 7],
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    expect(result.timeInfo.solarDate).toBe('2025年12月19日');
    expect(result.timeInfo.dayGanZhi).toBeDefined();
    expect(result.timeInfo.monthBranch).toBeDefined();
    expect(result.timeInfo.xunKong).toHaveLength(2);
  });

  it('旺衰計算正確', () => {
    const result = liuyaoService.calculate({
      yaoValues: [7, 7, 7, 7, 7, 7],
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    // 每爻都應該有旺衰信息
    for (const yao of result.yaoList) {
      expect(yao.wangShuaiByMonth).toBeDefined();
      expect(yao.wangShuaiByDay).toBeDefined();
    }
  });
});

describe('進退神計算', () => {
  it('亥化子為進神', () => {
    expect(JintuishenCalculator.calculate('亥', '子')).toBe('進神');
  });

  it('寅化卯為進神', () => {
    expect(JintuishenCalculator.calculate('寅', '卯')).toBe('進神');
  });

  it('丑化辰為進神', () => {
    expect(JintuishenCalculator.calculate('丑', '辰')).toBe('進神');
  });

  it('子化亥為退神', () => {
    expect(JintuishenCalculator.calculate('子', '亥')).toBe('退神');
  });

  it('卯化寅為退神', () => {
    expect(JintuishenCalculator.calculate('卯', '寅')).toBe('退神');
  });

  it('辰化丑為退神', () => {
    expect(JintuishenCalculator.calculate('辰', '丑')).toBe('退神');
  });

  it('子化丑非進退神', () => {
    expect(JintuishenCalculator.calculate('子', '丑')).toBeNull();
  });

  it('寅化辰非進退神', () => {
    expect(JintuishenCalculator.calculate('寅', '辰')).toBeNull();
  });
});

describe('旺衰計算', () => {
  it('同五行為旺', () => {
    // 子月，水爻為旺
    expect(WangshuaiCalculator.calculate('水', '子')).toBe('旺');
    // 寅月，木爻為旺
    expect(WangshuaiCalculator.calculate('木', '寅')).toBe('旺');
  });

  it('得生為相', () => {
    // 子月（水），木爻得生為相
    expect(WangshuaiCalculator.calculate('木', '子')).toBe('相');
    // 寅月（木），火爻得生為相
    expect(WangshuaiCalculator.calculate('火', '寅')).toBe('相');
  });

  it('生令為休', () => {
    // 子月（水），金爻生水為休
    expect(WangshuaiCalculator.calculate('金', '子')).toBe('休');
  });

  it('克令為囚', () => {
    // 子月（水），土爻克水為囚
    expect(WangshuaiCalculator.calculate('土', '子')).toBe('囚');
  });

  it('被克為死', () => {
    // 子月（水），火爻被水克為死
    expect(WangshuaiCalculator.calculate('火', '子')).toBe('死');
  });
});

describe('伏神計算', () => {
  it('六親俱全無伏神', () => {
    // 乾為天，六親：子孫(子水)、妻財(寅木)、父母(辰土)、父母(午火)、兄弟(申金)、父母(戌土)
    // 實際上乾為天缺官鬼
    const liuyaoService = new LiuyaoService();
    const result = liuyaoService.calculate({
      yaoValues: [7, 7, 7, 7, 7, 7],
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    // 乾為天卦宮五行為金
    // 初爻子水=子孫，二爻寅木=妻財，三爻辰土=父母
    // 四爻午火=官鬼，五爻申金=兄弟，上爻戌土=父母
    // 六親俱全，無伏神
    expect(result.fuShenList).toHaveLength(0);
  });

  it('缺六親有伏神', () => {
    // 天風姤：乾宮一世卦
    // 內卦巽（丑亥酉），外卦乾（午申戌）
    // 卦宮五行：金
    // 初爻丑土=父母，二爻亥水=子孫，三爻酉金=兄弟
    // 四爻午火=官鬼，五爻申金=兄弟，上爻戌土=父母
    // 缺妻財（木）
    const liuyaoService = new LiuyaoService();
    const result = liuyaoService.calculate({
      yaoValues: [8, 7, 7, 7, 7, 7], // 天風姤：上乾下巽（初爻阴，其余阳）
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    expect(result.benGua.name).toBe('天風姤');
    expect(result.fuShenList.length).toBeGreaterThan(0);

    // 應該有妻財伏神
    const caifu = result.fuShenList.find(f => f.liuQin === '妻財');
    expect(caifu).toBeDefined();
    if (caifu) {
      // 妻財在乾卦二爻寅木
      expect(caifu.diZhi).toBe('寅');
      expect(caifu.wuXing).toBe('木');
      expect(caifu.position).toBe(2);
    }
  });

  it('飛伏關係計算正確', () => {
    const liuyaoService = new LiuyaoService();
    const result = liuyaoService.calculate({
      yaoValues: [8, 7, 7, 7, 7, 7], // 天風姤（初爻阴，其余阳）
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    const caifu = result.fuShenList.find(f => f.liuQin === '妻財');
    if (caifu) {
      // 飛神亥水，伏神寅木
      // 水生木，飛生伏
      expect(caifu.feiShenDiZhi).toBe('亥');
      expect(caifu.relation).toBe('飛生伏');
    }
  });
});
