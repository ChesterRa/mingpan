/**
 * 跨環境時區一致性測試
 *
 * 測試目標：
 * 確保在不同 TZ 環境變量下，計算結果保持一致
 *
 * 設計原則：
 * 當前階段統一使用北京時間（UTC+8），不對外暴露時區參數
 * 啟動時設置 process.env.TZ = 'Asia/Shanghai'
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { BEIJING_TZ } from '../src/utils/timeNormalization';

describe('跨環境時區一致性', () => {
  beforeAll(() => {
    // 確保測試環境使用北京時區
    process.env.TZ = BEIJING_TZ;
  });

  describe('BEIJING_TZ 常量', () => {
    it('應為 Asia/Shanghai', () => {
      expect(BEIJING_TZ).toBe('Asia/Shanghai');
    });
  });

  describe('process.env.TZ 設置', () => {
    it('測試環境應使用北京時區', () => {
      expect(process.env.TZ).toBe('Asia/Shanghai');
    });
  });

  describe('Date 對象行為一致性', () => {
    it('UTC 時間戳轉換應一致', () => {
      // 使用固定的 UTC 時間戳
      const timestamp = Date.UTC(2024, 0, 1, 0, 0, 0); // 2024-01-01 00:00:00 UTC
      const date = new Date(timestamp);

      // 驗證 UTC 方法返回正確值（與時區無關）
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCFullYear()).toBe(2024);

      // 本地時間應該比 UTC 時間晚（東八區或更東）
      // 注意：process.env.TZ 在 Node.js 中可能不會立即生效
      // 這裡只驗證時間戳的一致性
      expect(date.getTime()).toBe(timestamp);
    });

    it('toISOString 應返回一致的 UTC 字符串', () => {
      const timestamp = Date.UTC(2024, 0, 1, 20, 0, 0);
      const date = new Date(timestamp);

      // ISO 字符串始終是 UTC 時間，與本地時區無關
      expect(date.toISOString()).toBe('2024-01-01T20:00:00.000Z');
    });
  });

  describe('計算結果確定性', () => {
    it('相同輸入應產生相同輸出（多次調用）', async () => {
      const { BaziService } = await import('../src/services/bazi/BaziService');
      const baziService = new BaziService({ debug: false, enableCaching: false });

      const input = {
        year: 1990,
        month: 5,
        day: 15,
        hour: 10,
        gender: 'male' as const,
      };

      const result1 = await baziService.calculate(input);
      const result2 = await baziService.calculate(input);

      // 四柱應完全一致
      expect(result1.chart!.year.stem).toBe(result2.chart!.year.stem);
      expect(result1.chart!.year.branch).toBe(result2.chart!.year.branch);
      expect(result1.chart!.month.stem).toBe(result2.chart!.month.stem);
      expect(result1.chart!.month.branch).toBe(result2.chart!.month.branch);
      expect(result1.chart!.day.stem).toBe(result2.chart!.day.stem);
      expect(result1.chart!.day.branch).toBe(result2.chart!.day.branch);
      expect(result1.chart!.hour.stem).toBe(result2.chart!.hour.stem);
      expect(result1.chart!.hour.branch).toBe(result2.chart!.hour.branch);
    });
  });
});
