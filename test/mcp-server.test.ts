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

  it.each([
    { upperNumber: 1, lowerNumber: 2, yaoNumber: 4, ben: '天澤履', bian: '風澤中孚', hu: '風火家人' },
    { upperNumber: 1, lowerNumber: 2, yaoNumber: 6, ben: '天澤履', bian: '兌為澤', hu: '風火家人' },
    { upperNumber: 7, lowerNumber: 4, yaoNumber: 1, ben: '山雷頤', bian: '山地剝', hu: '坤為地' },
    { upperNumber: 2, lowerNumber: 3, yaoNumber: 5, ben: '澤火革', bian: '雷火豐', hu: '天風姤' },
    { upperNumber: 8, lowerNumber: 6, yaoNumber: 6, ben: '地水師', bian: '山水蒙', hu: '地雷復' },
    { upperNumber: 1, lowerNumber: 1, yaoNumber: 1, ben: '乾為天', bian: '天風姤', hu: '乾為天' },
  ])('梅花數字起卦：$ben $yaoNumber 爻動 → $bian，互 $hu', async ({ upperNumber, lowerNumber, yaoNumber, ben, bian, hu }) => {
    const res = await client.callTool({
      name: 'meihua_basic',
      arguments: { method: 'number', upperNumber, lowerNumber, yaoNumber },
    });
    expect(res.isError).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain(`**本卦**：${ben} → **變卦**：${bian} | **互卦**：${hu}`);
  });

  it('梅花時間起卦：觀梅占的革之咸、互乾巽經 MCP 輸出', async () => {
    // 原例為辰年十二月十七日申時；以 1989-01-24（戊辰年臘月十七）復現。
    // https://zh.wikisource.org/wiki/梅花易數/卷一#觀梅占
    const res = await client.callTool({
      name: 'meihua_basic',
      arguments: { method: 'time', year: 1989, month: 1, day: 24, hour: 15 },
    });
    expect(res.isError).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('**本卦**：澤火革 → **變卦**：澤山咸 | **互卦**：天風姤');
    expect(text).toContain('**動爻**：初爻（下卦）');
    expect(text).toContain('**體用關係**：火剋金，用剋體');
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

  it('不存在的公曆日期：返回 isError 並說明原因，不進位到次月排盤', async () => {
    const res = await client.callTool({
      name: 'bazi_basic',
      arguments: { year: 1988, month: 4, day: 31, hour: 15, gender: 'male' },
    });
    expect(res.isError).toBe(true);
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('公曆日期不存在：1988 年 4 月 31 日（該月只有 30 日）');
  });

  it('奇門工具說明採用繁體名稱，schema 保留原有簡體參數', async () => {
    const { tools } = await client.listTools();
    const tool = (name: string) => tools.find(t => t.name === name)!;
    const enumOf = (name: string, prop: string) =>
      (tool(name).inputSchema.properties as Record<string, { enum?: string[] }>)[prop].enum ?? [];

    const yongshen = tool('qimen_yongshen').description ?? '';
    const shiLeiLine = yongshen.split('\n').find(line => line.endsWith('、其他'));
    const labels = shiLeiLine?.split('、') ?? [];
    expect(labels).toHaveLength(14);
    expect(labels).toContain('求財');
    expect(enumOf('qimen_yongshen', 'shiLei')).toEqual(expect.arrayContaining([...labels, '求财']));

    const basic = tool('qimen_basic').description ?? '';
    const labelsByProperty = {
      panType: ['時盤', '日盤', '月盤', '年盤'],
      panStyle: ['轉盤', '飛盤'],
      zhiRunMethod: ['chaibu', 'maoshan'],
    };
    for (const [property, labels] of Object.entries(labelsByProperty)) {
      expect(enumOf('qimen_basic', property)).toEqual(expect.arrayContaining(labels));
      for (const label of labels) expect(basic).toContain(label);
    }
    expect(enumOf('qimen_basic', 'panType')).toEqual(expect.arrayContaining(['时盘', '日盘', '月盘', '年盘']));
    expect(enumOf('qimen_basic', 'panStyle')).toEqual(expect.arrayContaining(['转盘', '飞盘']));
  });

  it.each([
    ['panType', '時盤', '时盘'],
    ['panType', '日盤', '日盘'],
    ['panType', '月盤', '月盘'],
    ['panType', '年盤', '年盘'],
    ['panStyle', '轉盤', '转盘'],
    ['panStyle', '飛盤', '飞盘'],
    ['shiLei', '求財', '求财'],
    ['shiLei', '訴訟', '诉讼'],
    ['shiLei', '考試', '考试'],
    ['shiLei', '置業', '置业'],
    ['shiLei', '孕產', '孕产'],
    ['shiLei', '尋人', '寻人'],
  ])('奇門 %s 的 %s 與 %s 排盤結果完全相同', async (key, traditional, simplified) => {
    const name = key === 'shiLei' ? 'qimen_yongshen' : 'qimen_basic';
    const args = { year: 2024, month: 6, day: 21, hour: 10 };
    const withTraditional = await client.callTool({ name, arguments: { ...args, [key]: traditional } });
    const withSimplified = await client.callTool({ name, arguments: { ...args, [key]: simplified } });
    expect(withTraditional.isError).toBeFalsy();
    expect(withSimplified.isError).toBeFalsy();
    expect(withTraditional.content).toEqual(withSimplified.content);
    if (key === 'shiLei') {
      const text = (withTraditional.content as { type: string; text: string }[])[0].text;
      expect(text).toContain(`**事類**：${traditional}`);
    }
  });

  // 2026 年立春為北京標準時 02-04 04:02:08，交節當小時內月建由丑轉寅。
  it.each([
    [4, 1, '丑'], [4, 3, '寅'], [4, 59, '寅'], [5, 0, '寅'],
  ] as const)('六爻交節月建：%i 時 %i 分為 %s 月', async (hour, minute, monthBranch) => {
    const res = await client.callTool({
      name: 'liuyao_basic',
      arguments: { year: 2026, month: 2, day: 4, hour, minute, yaoValues: [7, 8, 9, 6, 7, 8] },
    });
    expect(res.isError).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain(`**月建**：${monthBranch}月`);
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
    expect(text).toContain('陰遁3局');
  });

  // 合成例：農曆十二月由 lunar-javascript 輸出「腊」，納音霹靂火含「雳」，兩者都要轉為繁體。
  it.each([
    ['calendar_convert', { direction: 'solar2lunar', year: 2025, month: 1, day: 15 }, '臘月十六'],
    ['calendar_convert', { direction: 'lunar2solar', year: 2024, month: 12, day: 16 }, '臘月十六'],
    ['qimen_basic', { year: 2026, month: 1, day: 20, hour: 10 }, '臘月初二'],
    ['meihua_basic', { method: 'time', year: 2026, month: 1, day: 20, hour: 10 }, '臘月初二'],
    ['bazi_basic', { year: 1984, month: 2, day: 24, hour: 6, minute: 10, gender: 'male' }, '日柱：戊子（霹靂火）'],
  ] as const)('%s 的臘月與霹靂火採用繁體字形', async (name, args, expected) => {
    const res = await client.callTool({ name, arguments: args });
    expect(res.isError).toBeFalsy();
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain(expected);
    expect(text).not.toMatch(/[腊雳]/u);
  });

  describe('北京夏令時提示（未做時區換算）', () => {
    // 1988 年夏令時為 4/17–9/11：7/15 在窗口內，11/15 為窗口外對照
    const inDst = { year: 1988, month: 7, day: 15, hour: 15 };
    const control = { year: 1988, month: 11, day: 15, hour: 15 };
    const timeTools: Array<[string, Record<string, unknown>]> = [
      ['bazi_basic', { gender: 'male' }],
      ['bazi_dayun', { gender: 'male' }],
      ['bazi_liunian', { gender: 'male', startYear: 2024, endYear: 2025 }],
      ['bazi_liuyue', { gender: 'male', ganzhiYear: 2025 }],
      ['bazi_liuri', { gender: 'male', ganzhiYear: 2025, ganzhiMonth: 1 }],
      ['ziwei_basic', { gender: 'male' }],
      ['ziwei_daxian', { gender: 'male' }],
      ['ziwei_xiaoxian', { gender: 'male', startAge: 30, endAge: 32 }],
      ['ziwei_liunian', { gender: 'male', startYear: 2024, endYear: 2025 }],
      ['ziwei_liuyue', { gender: 'male', lunarYear: 2025 }],
      ['ziwei_liuri', { gender: 'male', lunarYear: 2025, lunarMonth: 1 }],
      ['liuyao_basic', { yaoValues: [7, 8, 9, 6, 7, 8] }],
      ['meihua_basic', { method: 'time' }],
      ['daliuren_basic', {}],
      ['qimen_basic', {}],
      ['qimen_yongshen', { shiLei: '求财' }],
    ];

    async function callText(name: string, args: Record<string, unknown>): Promise<string> {
      const res = await client.callTool({ name, arguments: args });
      expect(res.isError).toBeFalsy();
      return (res.content as { type: string; text: string }[])[0].text;
    }

    it('覆蓋全部接受鐘錶時間的工具', async () => {
      const { tools } = await client.listTools();
      const withHour = tools
        .filter(t => 'hour' in ((t.inputSchema.properties ?? {}) as Record<string, unknown>))
        .map(t => t.name);
      expect(withHour.sort()).toEqual(timeTools.map(([name]) => name).sort());
    });

    it.each(timeTools)('%s：夏令時期間開頭附提示，窗口外不附', async (name, extra) => {
      const dstText = await callText(name, { ...inDst, ...extra });
      expect(dstText.startsWith(
        '> 注：公曆 1988-07-15 15:00 落在 1988 年北京夏令時期間（04-17 至 09-11，UTC+9），對應北京標準時 1988-07-15 14:00。'
      )).toBe(true);

      const controlText = await callText(name, { ...control, ...extra });
      expect(controlText).not.toContain('夏令時');
    });

    it('bazi_basic：四柱仍按輸入時間；傳 Asia/Shanghai 後按標準時排盤且不再提示', async () => {
      const plain = await callText('bazi_basic', { ...inDst, minute: 30, gender: 'male' });
      expect(plain).toContain('對應北京標準時 1988-07-15 14:30');
      expect(plain).toContain('時柱：丙申');

      const converted = await callText('bazi_basic', { ...inDst, minute: 30, gender: 'male', timezone: 'Asia/Shanghai' });
      expect(converted).not.toContain('夏令時');
      expect(converted).toContain('時柱：乙未');
    });

    it('切換日：回撥重複與撥快跳過的時段分別提示；照提示傳 Etc/GMT-9 取第一次且不再提示', async () => {
      const repeatedArgs = { year: 1988, month: 9, day: 11, hour: 1, minute: 30, gender: 'male' };
      const repeated = await callText('bazi_basic', repeatedArgs);
      expect(repeated).toContain('當日 01:00–01:59 出現兩次');
      expect(repeated).toContain('對應北京標準時 1988-09-11 00:30');

      const firstPass = await callText('bazi_basic', { ...repeatedArgs, timezone: 'Etc/GMT-9' });
      expect(firstPass).not.toContain('夏令時');
      expect(firstPass).toContain('公曆：1988-09-11 00:30');

      const skipped = await callText('bazi_basic', { year: 1988, month: 4, day: 17, hour: 2, minute: 30, gender: 'male' });
      expect(skipped).toContain('當日鐘錶上不存在此時間');
      expect(skipped).toContain('若輸入已是標準時，可忽略本提示');
    });

    it('農曆輸入不做時區換算：未傳 timezone 時提示改用公曆重排', async () => {
      // 農曆 1988 年六月初二 = 公曆 1988-07-15
      const lunar = { year: 1988, month: 6, day: 2, hour: 15, minute: 30, isLunar: true, gender: 'male' };
      const text = await callText('bazi_basic', lunar);
      expect(text.startsWith('> 注：公曆 1988-07-15 15:30 落在 1988 年北京夏令時期間')).toBe(true);
      expect(text).toContain('請以公曆 1988-07-15 15:30（isLunar: false）加傳 timezone: "Asia/Shanghai" 重新排盤');
      expect(text).toContain('時柱：丙申'); // 四柱仍按輸入時間
    });

    it('農曆輸入傳了 timezone 也不換算：照常提示並寫明未使用該 timezone', async () => {
      const lunar = { year: 1988, month: 6, day: 2, hour: 15, minute: 30, isLunar: true, gender: 'male' };
      for (const timezone of ['Asia/Shanghai', 'America/New_York']) {
        const text = await callText('bazi_basic', { ...lunar, timezone });
        expect(text.startsWith(
          '> 注：農曆輸入不做時區換算，本次未使用所傳的 timezone，如需換算請改用公曆日期（isLunar: false）。公曆 1988-07-15 15:30 落在 1988 年北京夏令時期間'
        )).toBe(true);
        if (timezone !== 'Asia/Shanghai') expect(text).not.toContain(timezone); // 不回顯所傳值（上海出現在固定的重排建議裡）
        expect(text).toContain('若此為中國大陸當時的鐘錶時間，請以公曆 1988-07-15 15:30（isLunar: false）加傳 timezone: "Asia/Shanghai"');
        expect(text).toContain('時柱：丙申'); // 與未傳 timezone 相同，timezone 未被使用
      }
      // 農曆輸入不校驗 timezone：任意字串都不得進入提示正文
      const odd = await callText('bazi_basic', { ...lunar, timezone: 'Not/AZone\n# injected' });
      expect(odd).toContain('本次未使用所傳的 timezone');
      expect(odd).not.toContain('injected');
      // 照提示改用公曆並傳 Asia/Shanghai：扣除夏令時，不再提示
      const converted = await callText('bazi_basic', {
        year: 1988, month: 7, day: 15, hour: 15, minute: 30, gender: 'male', timezone: 'Asia/Shanghai',
      });
      expect(converted).not.toContain('夏令時');
      expect(converted).toContain('時柱：乙未');
    });

    it('農曆輸入落在切換日：回撥時段仍指向 Etc/GMT-9，撥快時段不建議換算', async () => {
      // 農曆 1988 年八月初一 = 公曆 1988-09-11（結束日）；三月初二 = 1988-04-17（開始日）
      const repeated = await callText('bazi_basic', {
        year: 1988, month: 8, day: 1, hour: 1, minute: 30, isLunar: true, gender: 'female', timezone: 'Asia/Shanghai',
      });
      expect(repeated).toContain('本次未使用所傳的 timezone');
      expect(repeated).toContain('若此為中國大陸當時的鐘錶時間且為第一次（夏令時），對應北京標準時 1988-09-11 00:30，請以公曆 1988-09-11 01:30（isLunar: false）加傳 timezone: "Etc/GMT-9"（固定 UTC+9）重新排盤');

      const skipped = await callText('bazi_basic', {
        year: 1988, month: 3, day: 2, hour: 2, minute: 30, isLunar: true, gender: 'female', timezone: 'Asia/Shanghai',
      });
      expect(skipped.startsWith('> 注：農曆輸入不做時區換算，本次未使用所傳的 timezone。公曆 1988-04-17 02:30 落在')).toBe(true);
      expect(skipped).not.toContain('如需換算');
      expect(skipped).toContain('若此為中國大陸當時的鐘錶時間，當日鐘錶上不存在此時間');
    });

    it('梅花 time 模式只取時辰：農曆輸入傳 timezone 時同樣提示', async () => {
      const text = await callText('meihua_basic', {
        method: 'time', year: 1988, month: 6, day: 2, hour: 15, isLunar: true, timezone: 'Asia/Shanghai',
      });
      expect(text).toContain('本次未使用所傳的 timezone');
      expect(text).toContain('公曆 1988-07-15 15:00 落在 1988 年北京夏令時期間'); // 梅花 time 模式只收時辰，提示按整點
    });
  });
});
