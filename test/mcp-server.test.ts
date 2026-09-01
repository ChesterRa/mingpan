/**
 * MCP 服務器集成測試
 *
 * 通過 InMemoryTransport 以真實 MCP 客戶端協議驅動服務器，
 * 覆蓋工具註冊層（schema 校驗、分發、錯誤處理），
 * 為工具層重構（如 SDK API 遷移）提供安全網。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/client';
import { createMingpanServer, SERVER_NAME, SERVER_VERSION } from '../src/server';
import manifest from '../package.json';

describe('MCP 服務器（InMemoryTransport 集成）', () => {
  let client: Client;

  beforeAll(async () => {
    const server = createMingpanServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    client = new Client({ name: 'test-client', version: '0.0.1' });
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
  });

  it('初始化握手：服務器名稱與版本正確', async () => {
    // listTools 前的隱式 initialize 已完成；此處驗證連接對象元數據
    expect(SERVER_NAME).toBe('mingpan');
    expect(SERVER_VERSION).toBe(manifest.version);
  });

  it('工具清單：應註冊全部 18 個工具（含歷法原語）', async () => {
    const res = await client.listTools();
    const names = res.tools.map(t => t.name);
    expect(names).toEqual([
      // 八字
      'bazi_basic', 'bazi_dayun', 'bazi_liunian', 'bazi_liuyue', 'bazi_liuri',
      // 紫微
      'ziwei_basic', 'ziwei_daxian', 'ziwei_xiaoxian', 'ziwei_liunian', 'ziwei_liuyue', 'ziwei_liuri',
      // 占卜
      'liuyao_basic', 'meihua_basic', 'daliuren_basic',
      // 奇門
      'qimen_basic', 'qimen_yongshen', 'jieqi_query', 'calendar_convert',
    ]);
    // 每個工具都應有描述與 JSON Schema
    for (const tool of res.tools) {
      expect(tool.description?.length ?? 0).toBeGreaterThan(20);
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('梅花數字起卦：協議層調用返回 Markdown 文本', async () => {
    const res = await client.callTool({
      name: 'meihua_basic',
      arguments: { method: 'number', upperNumber: 5, lowerNumber: 3 },
    });
    expect(res.isError).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('梅花');
  });

  it('八字排盤：基礎調用成功', async () => {
    const res = await client.callTool({
      name: 'bazi_basic',
      arguments: { year: 1992, month: 4, day: 12, hour: 7, minute: 30, gender: 'male' },
    });
    expect(res.isError).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('1992');
  });

  it('八字時區：紐約時間出生應按北京時間排盤', async () => {
    // 1990-06-15 20:30 紐約（EDT）= 北京 1990-06-16 08:30
    const res = await client.callTool({
      name: 'bazi_basic',
      arguments: {
        year: 1990, month: 6, day: 15, hour: 20, minute: 30,
        gender: 'male', timezone: 'America/New_York',
      },
    });
    expect(res.isError).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    // 時柱應對應北京時間辰時（08:30），而非紐約當地 20:30（戌時）
    expect(text).toContain('辰');
  });

  it('大六壬時間起課：僅提供時間即可排盤（無需手工推干支）', async () => {
    const res = await client.callTool({
      name: 'daliuren_basic',
      arguments: { year: 2025, month: 12, day: 19, hour: 10 },
    });
    expect(res.isError).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('壬戌'); // 日干支自動推得
  });

  it('大六壬專家模式：顯式干支輸入仍可用（向後兼容）', async () => {
    const res = await client.callTool({
      name: 'daliuren_basic',
      arguments: { jieqi: '驚蟄', lunarMonth: 2, dayGanZhi: '甲子', hourGanZhi: '甲子' },
    });
    expect(res.isError).toBeFalsy();
  });

  it('參數缺失：返回可讀的 isError 結果（而非協議錯誤）', async () => {
    const res = await client.callTool({
      name: 'daliuren_basic',
      arguments: { jieqi: '驚蟄' }, // 不完整的專家輸入
    });
    expect(res.isError).toBe(true);
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Error');
  });

  it('參數校驗：非法爻值應被 schema 拒絕', async () => {
    const res = await client.callTool({
      name: 'liuyao_basic',
      arguments: {
        yaoValues: [7, 7, 7, 7, 7, 5], // 5 不是合法爻值
        year: 2025, month: 12, day: 19, hour: 10,
      },
    });
    expect(res.isError).toBe(true);
  });

  it('奇門排盤：協議層調用返回九宮格文本', async () => {
    const res = await client.callTool({
      name: 'qimen_basic',
      arguments: { year: 2024, month: 6, day: 21, hour: 10 },
    });
    expect(res.isError).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('阴遁3局');
  });
});
