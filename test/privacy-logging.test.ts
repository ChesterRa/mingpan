import { describe, expect, it, vi } from 'vitest';
import { BaziService } from '../src/services/bazi/BaziService';
import { ZiweiService } from '../src/services/ziwei/ZiweiService';

describe('日志隐私边界', () => {
  it('计算失败日志不包含出生参数、姓名或经度', async () => {
    const lines: string[] = [];
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: unknown) => {
      lines.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);

    try {
      const bazi = new BaziService({ enableCaching: false });
      (bazi as unknown as { core: { calculate: () => Promise<never> } }).core.calculate =
        async () => { throw new Error('PrivacyMarker 1987-13-29 23:41 123.456789'); };
      await expect(bazi.calculate({
        year: 1987,
        month: 12,
        day: 29,
        hour: 23,
        minute: 41,
        gender: 'female',
        name: 'PrivacyMarker',
        longitude: 123.456789,
      })).rejects.toThrow();

      const ziwei = new ZiweiService();
      (ziwei as unknown as { adapter: { init: () => never } }).adapter.init =
        () => { throw new Error('PrivacyMarker 1987-12-29 23:41'); };
      expect(() => ziwei.calculate({
        year: 1987,
        month: 12,
        day: 29,
        hour: 23,
        gender: 'female',
        name: 'PrivacyMarker',
      })).toThrow();
    } finally {
      write.mockRestore();
    }

    const output = lines.join('');
    expect(output).not.toContain('PrivacyMarker');
    expect(output).not.toContain('123.456789');
    expect(output).not.toContain('1987-12-29');
    expect(output).not.toContain('23:41');
  });
});
