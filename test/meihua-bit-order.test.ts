import { describe, expect, it } from 'vitest';
import { BianguaCalculator } from '../src/services/meihua/calculators/BianguaCalculator';
import { HuguaCalculator } from '../src/services/meihua/calculators/HuguaCalculator';
import { BAGUA_BINARY, binaryToBaGua, getGua64Name } from '../src/services/meihua/data/bagua';
import type { BaGuaName } from '../src/services/meihua/types';
import { NajiaCalculator } from '../src/services/liuyao/calculators/NajiaCalculator';
import { getGua64Info, getGua64InfoByYao } from '../src/services/liuyao/data/guagong';

// Independent oracle: integer bit 0 is the bottom line (yang = 1).
// Source: 梅花易數卷一「八卦象例」「爻以六除」「互卦起例」.
// https://zh.wikisource.org/wiki/梅花易數/卷一
// These masks are NOT the production array/string encoding; e.g. 兌上缺 = 0b011.
const TRIGRAM_MASK: Record<BaGuaName, number> = {
  乾: 0b111, 兌: 0b011, 離: 0b101, 震: 0b001,
  巽: 0b110, 坎: 0b010, 艮: 0b100, 坤: 0b000,
};
const TRIGRAM_BY_MASK: BaGuaName[] = ['坤', '震', '坎', '兌', '艮', '離', '巽', '乾'];

describe('梅花爻序（獨立位運算對照，issue #2）', () => {
  it.each(Object.entries(TRIGRAM_MASK))('%s 的陣列與反向映射均自下而上', (name, mask) => {
    const bits: [boolean, boolean, boolean] = [
      Boolean(mask & 1), Boolean(mask & 2), Boolean(mask & 4),
    ];
    expect(BAGUA_BINARY[name as BaGuaName]).toEqual(bits);
    expect(binaryToBaGua(bits)).toBe(name);
  });

  it('64 卦 × 6 動爻：只反轉指定的一爻', () => {
    for (let hexagram = 0; hexagram < 64; hexagram++) {
      const upper = TRIGRAM_BY_MASK[hexagram >> 3];
      const lower = TRIGRAM_BY_MASK[hexagram & 7];
      for (let yao = 1; yao <= 6; yao++) {
        const expected = hexagram ^ (1 << (yao - 1));
        expect(BianguaCalculator.calculate(upper, lower, yao), `${upper}${lower} ${yao}爻`).toEqual({
          upper: TRIGRAM_BY_MASK[expected >> 3],
          lower: TRIGRAM_BY_MASK[expected & 7],
        });
      }
    }
  });

  it('64 卦互卦：2/3/4 爻為下，3/4/5 爻為上', () => {
    for (let hexagram = 0; hexagram < 64; hexagram++) {
      const upper = TRIGRAM_BY_MASK[hexagram >> 3];
      const lower = TRIGRAM_BY_MASK[hexagram & 7];
      expect(HuguaCalculator.calculate(upper, lower), `${upper}${lower}`).toEqual({
        upper: TRIGRAM_BY_MASK[(hexagram >> 2) & 7],
        lower: TRIGRAM_BY_MASK[(hexagram >> 1) & 7],
      });
    }
  });

  it('64 卦的六爻爻值／陰陽入口與梅花卦名使用相同爻位', () => {
    for (let hexagram = 0; hexagram < 64; hexagram++) {
      const upper = TRIGRAM_BY_MASK[hexagram >> 3];
      const lower = TRIGRAM_BY_MASK[hexagram & 7];
      const lines: [boolean, boolean, boolean, boolean, boolean, boolean] = [
        Boolean(hexagram & 1), Boolean(hexagram & 2), Boolean(hexagram & 4),
        Boolean(hexagram & 8), Boolean(hexagram & 16), Boolean(hexagram & 32),
      ];
      expect(NajiaCalculator.getGuaFromYaoValues(lines.map(line => line ? 7 : 8)))
        .toEqual({ upper, lower });
      const info = getGua64Info(upper, lower);
      expect(info).toMatchObject({ upper, lower, name: getGua64Name(upper, lower) });
      expect(getGua64InfoByYao(lines), `${upper}${lower}`).toEqual(info);
    }
  });
});
