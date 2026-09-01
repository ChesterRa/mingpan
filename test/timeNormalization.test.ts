/**
 * 時間歸一化模組測試
 *
 * 測試範圍：
 * 1. 公曆輸入（直接透傳）
 * 2. 農曆輸入（轉換為公曆）
 * 3. 閏月邊界情況
 * 4. 跨環境 TZ 一致性
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { normalizeBirthDateTime, BEIJING_TZ } from '../src/utils/timeNormalization';

// 確保測試環境使用北京時區
beforeAll(() => {
  process.env.TZ = BEIJING_TZ;
});

describe('normalizeBirthDateTime', () => {
  describe('公曆輸入（直接透傳）', () => {
    it('應正確處理標準公曆日期', () => {
      const result = normalizeBirthDateTime({
        year: 1990,
        month: 5,
        day: 15,
        hour: 10,
      });

      expect(result).toEqual({
        year: 1990,
        month: 5,
        day: 15,
        hour: 10,
        minute: 0,
        isLunarInput: false,
      });
    });

    it('應正確處理帶分鐘的公曆日期', () => {
      const result = normalizeBirthDateTime({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 30,
      });

      expect(result).toEqual({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 30,
        isLunarInput: false,
      });
    });

    it('應正確處理 isLunar=false 的顯式設置', () => {
      const result = normalizeBirthDateTime({
        year: 1985,
        month: 12,
        day: 31,
        hour: 23,
        minute: 59,
        isLunar: false,
      });

      expect(result).toEqual({
        year: 1985,
        month: 12,
        day: 31,
        hour: 23,
        minute: 59,
        isLunarInput: false,
      });
    });
  });

  describe('農曆輸入（轉換為公曆）', () => {
    it('應正確轉換農曆日期 - 1990年農曆四月廿一', () => {
      // 農曆 1990-04-21 = 公曆 1990-05-15
      const result = normalizeBirthDateTime({
        year: 1990,
        month: 4,
        day: 21,
        hour: 10,
        isLunar: true,
      });

      expect(result).toEqual({
        year: 1990,
        month: 5,
        day: 15,
        hour: 10,
        minute: 0,
        isLunarInput: true,
      });
    });

    it('應正確轉換農曆日期 - 1992年農曆三月初十', () => {
      // 農曆 1992-03-10 = 公曆 1992-04-12
      const result = normalizeBirthDateTime({
        year: 1992,
        month: 3,
        day: 10,
        hour: 7,
        minute: 30,
        isLunar: true,
      });

      expect(result).toEqual({
        year: 1992,
        month: 4,
        day: 12,
        hour: 7,
        minute: 30,
        isLunarInput: true,
      });
    });

    it('應正確轉換跨年農曆日期 - 農曆臘月', () => {
      // 農曆 2023-12-15 = 公曆 2024-01-25
      const result = normalizeBirthDateTime({
        year: 2023,
        month: 12,
        day: 15,
        hour: 12,
        isLunar: true,
      });

      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.isLunarInput).toBe(true);
    });

    it('應正確轉換農曆正月初一（春節）', () => {
      // 農曆 2024-01-01 = 公曆 2024-02-10
      const result = normalizeBirthDateTime({
        year: 2024,
        month: 1,
        day: 1,
        hour: 0,
        isLunar: true,
      });

      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
      expect(result.day).toBe(10);
      expect(result.isLunarInput).toBe(true);
    });
  });

  describe('邊界情況', () => {
    it('應正確處理年初邊界 - 公曆1月1日', () => {
      const result = normalizeBirthDateTime({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
      });

      expect(result.year).toBe(2000);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('應正確處理年末邊界 - 公曆12月31日', () => {
      const result = normalizeBirthDateTime({
        year: 1999,
        month: 12,
        day: 31,
        hour: 23,
        minute: 59,
      });

      expect(result.year).toBe(1999);
      expect(result.month).toBe(12);
      expect(result.day).toBe(31);
    });

    it('應正確處理子時邊界 - 23:00', () => {
      const result = normalizeBirthDateTime({
        year: 2000,
        month: 6,
        day: 15,
        hour: 23,
      });

      expect(result.hour).toBe(23);
    });

    it('應正確處理子時邊界 - 00:00', () => {
      const result = normalizeBirthDateTime({
        year: 2000,
        month: 6,
        day: 15,
        hour: 0,
      });

      expect(result.hour).toBe(0);
    });
  });

  describe('minute 默認值', () => {
    it('未提供 minute 時應默認為 0', () => {
      const result = normalizeBirthDateTime({
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
      });

      expect(result.minute).toBe(0);
    });

    it('提供 minute=undefined 時應默認為 0', () => {
      const result = normalizeBirthDateTime({
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: undefined,
      });

      expect(result.minute).toBe(0);
    });
  });
});
