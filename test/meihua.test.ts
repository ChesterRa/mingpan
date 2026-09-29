/**
 * 梅花易數計算回歸測試
 *
 * 測試範圍：
 * 1. 時間起卦
 * 2. 數字起卦
 * 3. 互卦計算
 * 4. 變卦計算
 * 5. 體用分析
 *
 * 測試數據來源：梅花易數標準口徑
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { MeihuaService } from '../src/services/meihua/MeihuaService';
import { QiguaCalculator } from '../src/services/meihua/calculators/QiguaCalculator';
import { HuguaCalculator } from '../src/services/meihua/calculators/HuguaCalculator';
import { BianguaCalculator } from '../src/services/meihua/calculators/BianguaCalculator';
import { TiyongCalculator } from '../src/services/meihua/calculators/TiyongCalculator';
import { getBaGuaByNumber, getGua64Name } from '../src/services/meihua/data/bagua';
import { BEIJING_TZ } from '../src/utils/timeNormalization';

beforeAll(() => {
  process.env.TZ = BEIJING_TZ;
});

describe('八卦數據', () => {
  it('先天數對應正確', () => {
    expect(getBaGuaByNumber(1).name).toBe('乾');
    expect(getBaGuaByNumber(2).name).toBe('兌');
    expect(getBaGuaByNumber(3).name).toBe('離');
    expect(getBaGuaByNumber(4).name).toBe('震');
    expect(getBaGuaByNumber(5).name).toBe('巽');
    expect(getBaGuaByNumber(6).name).toBe('坎');
    expect(getBaGuaByNumber(7).name).toBe('艮');
    expect(getBaGuaByNumber(8).name).toBe('坤');
  });

  it('餘 0 取 8（坤）', () => {
    expect(getBaGuaByNumber(16).name).toBe('坤');
    expect(getBaGuaByNumber(24).name).toBe('坤');
  });

  it('64卦名稱正確', () => {
    expect(getGua64Name('乾', '乾')).toBe('乾為天');
    expect(getGua64Name('坤', '坤')).toBe('坤為地');
    expect(getGua64Name('坤', '坎')).toBe('地水師');
    expect(getGua64Name('坤', '兌')).toBe('地澤臨');
  });
});

describe('數字起卦', () => {
  it('基本數字起卦', () => {
    const result = QiguaCalculator.fromNumber(5, 3);

    expect(result.upperGuaIndex).toBe(5); // 巽
    expect(result.lowerGuaIndex).toBe(3); // 離
    expect(result.movingYao).toBe(2);     // (5+3)%6=2
  });

  it('餘 0 取 8/6', () => {
    const result = QiguaCalculator.fromNumber(16, 8);

    expect(result.upperGuaIndex).toBe(8); // 16%8=0 → 8(坤)
    expect(result.lowerGuaIndex).toBe(8); // 8%8=0 → 8(坤)
    expect(result.movingYao).toBe(6);     // (16+8)%6=0 → 6
  });

  it('指定動爻數', () => {
    const result = QiguaCalculator.fromNumber(5, 3, 11);

    expect(result.movingYao).toBe(5); // 11%6=5
  });
});

describe('時間起卦', () => {
  it('公曆時間起卦', () => {
    // 2025年12月19日 10:00（公曆）
    // 農曆：乙巳年十月三十日 巳時
    // 標準梅花口徑：年數用地支序數（巳=6）
    // 上卦數 = 6 + 10 + 30 = 46 → 46%8=6 → 6(坎)
    // 下卦數 = 46 + 6(巳時) = 52 → 52%8=4 → 4(震)
    // 動爻 = 52%6=4
    const { qiGuaData, timeDetail } = QiguaCalculator.fromTime(2025, 12, 19, 10, false);

    expect(timeDetail.lunarMonth).toBe(10);
    expect(timeDetail.lunarDay).toBe(30);
    expect(timeDetail.yearZhiIndex).toBe(6); // 巳=6
    expect(qiGuaData.upperGuaIndex).toBe(6); // 坎
    expect(qiGuaData.lowerGuaIndex).toBe(4); // 震
    expect(qiGuaData.movingYao).toBe(4);
  });

  it('農曆時間起卦', () => {
    // 農曆乙巳年十月三十日 巳時（與上面公曆對應）
    const { qiGuaData } = QiguaCalculator.fromTime(2025, 10, 30, 10, true);

    expect(qiGuaData.upperGuaIndex).toBe(6); // 坎
    expect(qiGuaData.lowerGuaIndex).toBe(4); // 震
  });

  it('觀梅：戊辰年十二月十七日申時為澤火革初爻', () => {
    const { qiGuaData, timeDetail } = QiguaCalculator.fromTime(1989, 1, 24, 15, false);
    expect(timeDetail).toMatchObject({ lunarMonth: 12, lunarDay: 17, yearZhiIndex: 5, shiChenIndex: 9 });
    expect(qiGuaData).toMatchObject({ upperGuaIndex: 2, lowerGuaIndex: 3, movingYao: 1 });
    expect(getGua64Name('兌', '離')).toBe('澤火革');
    expect(TiyongCalculator.calculate('金', '火', 1).yongGua).toBe('lower');
  });

  it('牡丹：己巳年三月十六日卯時為天風姤五爻', () => {
    const { qiGuaData, timeDetail } = QiguaCalculator.fromTime(1989, 4, 21, 5, false);
    expect(timeDetail).toMatchObject({ lunarMonth: 3, lunarDay: 16, yearZhiIndex: 6, shiChenIndex: 4 });
    expect(qiGuaData).toMatchObject({ upperGuaIndex: 1, lowerGuaIndex: 5, movingYao: 5 });
    expect(getGua64Name('乾', '巽')).toBe('天風姤');
    expect(TiyongCalculator.calculate('金', '木', 5).yongGua).toBe('upper');
  });

  it('申年按地支序數 9 起卦', () => {
    const { qiGuaData, timeDetail } = QiguaCalculator.fromTime(2017, 1, 14, 10, false);
    expect(timeDetail).toMatchObject({ lunarMonth: 12, lunarDay: 17, yearZhiIndex: 9, shiChenIndex: 6 });
    expect(qiGuaData).toMatchObject({ upperGuaIndex: 6, lowerGuaIndex: 4, movingYao: 2 });
  });
});

describe('互卦計算', () => {
  it('地水師互卦為地雷復', () => {
    // 自下而上 [陰,陽,陰,陰,陰,陰]：2/3/4 爻為震，3/4/5 爻為坤。
    const result = HuguaCalculator.calculate('坤', '坎');

    expect(result.lower).toBe('震');
    expect(result.upper).toBe('坤');
  });

  it('乾為天互卦為乾為天', () => {
    // 乾為天：全陽
    const result = HuguaCalculator.calculate('乾', '乾');

    expect(result.upper).toBe('乾');
    expect(result.lower).toBe('乾');
  });

  it('坤為地互卦為坤為地', () => {
    // 坤為地：全陰
    const result = HuguaCalculator.calculate('坤', '坤');

    expect(result.upper).toBe('坤');
    expect(result.lower).toBe('坤');
  });
});

describe('變卦計算', () => {
  it('地水師六爻動變山水蒙', () => {
    // 上坤的最上爻由陰變陽，成艮；下坎不變。
    const result = BianguaCalculator.calculate('坤', '坎', 6);

    expect(result.lower).toBe('坎');
    expect(result.upper).toBe('艮');
  });

  it('乾為天初爻動變天風姤', () => {
    // 下乾的最下爻由陽變陰，成巽；上乾不變。
    const result = BianguaCalculator.calculate('乾', '乾', 1);

    expect(result.lower).toBe('巽');
    expect(result.upper).toBe('乾');
  });
});

describe('體用分析', () => {
  it('動爻在下卦，上卦為體', () => {
    // 動爻在1-3爻，下卦為用，上卦為體
    const result = TiyongCalculator.calculate('金', '水', 2);

    expect(result.tiGua).toBe('upper');
    expect(result.yongGua).toBe('lower');
    expect(result.tiWuXing).toBe('金');
    expect(result.yongWuXing).toBe('水');
  });

  it('動爻在上卦，下卦為體', () => {
    // 動爻在4-6爻，上卦為用，下卦為體
    const result = TiyongCalculator.calculate('金', '水', 5);

    expect(result.tiGua).toBe('lower');
    expect(result.yongGua).toBe('upper');
    expect(result.tiWuXing).toBe('水');
    expect(result.yongWuXing).toBe('金');
  });

  it('用生體為吉', () => {
    // 水生木
    const result = TiyongCalculator.calculate('木', '水', 2);

    expect(result.relation).toBe('生');
    expect(result.description).toContain('用生體');
    expect(result.description).not.toContain('主吉'); // 吉凶斷語屬解讀層，不進輸出
  });

  it('用剋體為凶', () => {
    // 金剋木
    const result = TiyongCalculator.calculate('木', '金', 2);

    expect(result.relation).toBe('剋');
    expect(result.description).toContain('用剋體');
    expect(result.description).not.toContain('主凶');
  });

  it('體剋用為小吉', () => {
    // 金剋木，體為金
    const result = TiyongCalculator.calculate('金', '木', 2);

    expect(result.relation).toBe('耗');
    expect(result.description).toContain('體剋用');
  });

  it('體生用為洩', () => {
    // 木生火，體為木
    const result = TiyongCalculator.calculate('木', '火', 2);

    expect(result.relation).toBe('洩');
    expect(result.description).toContain('體生用');
  });

  it('比和為平穩', () => {
    const result = TiyongCalculator.calculate('金', '金', 2);

    expect(result.relation).toBe('比和');
    expect(result.description).toContain('比和');
  });
});

describe('完整排盤', () => {
  const meihuaService = new MeihuaService();

  it('時間起卦完整流程', () => {
    // 2025年12月19日 10:00（公曆）
    // 農曆：乙巳年十月三十日 巳時
    // 標準梅花口徑：年數用地支序數（巳=6）
    // 上卦=坎，下卦=震 → 水雷屯
    // 動爻=4（在上卦）
    const result = meihuaService.calculate({
      method: 'time',
      year: 2025,
      month: 12,
      day: 19,
      hour: 10,
    });

    expect(result.method).toBe('time');
    expect(result.benGua.name).toBe('水雷屯');
    expect(result.benGua.upperGua.name).toBe('坎');
    expect(result.benGua.lowerGua.name).toBe('震');
    expect(result.movingYao).toBe(4);
    expect(result.bianGua.name).toBe('澤雷隨');
    expect(result.huGua.name).toBe('山地剝');
    expect(result.timeDetail).toBeDefined();
  });

  it('數字起卦完整流程', () => {
    const result = meihuaService.calculate({
      method: 'number',
      upperNumber: 5,
      lowerNumber: 3,
    });

    expect(result.method).toBe('number');
    expect(result.benGua.upperGua.name).toBe('巽');
    expect(result.benGua.lowerGua.name).toBe('離');
    expect(result.movingYao).toBe(2);
    expect(result.bianGua.name).toBe('風天小畜');
    expect(result.huGua.name).toBe('火水未濟');
    expect(result.timeDetail).toBeUndefined();
  });

  it('體用分析正確', () => {
    const result = meihuaService.calculate({
      method: 'number',
      upperNumber: 1,  // 乾(金)
      lowerNumber: 4,  // 震(木)
    });

    // 動爻 = (1+4)%6 = 5，在上卦
    // 上卦為用，下卦為體
    // 體=震(木)，用=乾(金)
    // 金剋木，用剋體
    expect(result.tiYong.tiGua).toBe('lower');
    expect(result.tiYong.yongGua).toBe('upper');
    expect(result.tiYong.relation).toBe('剋');
  });
});
