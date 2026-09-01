/**
 * HTTP 入口协议级测试（Node fetch 直调 Workers handler）
 *
 * 与 stdio 形态共用 createMingpanServer，本组测试守护两件事：
 * 1. Streamable HTTP 无状态模式的协议正确性（initialize/tools/call）
 * 2. 跨形态输出一致性 —— HTTP 调用与 stdio 调用返回逐字节相同的排盘文本
 */

import { describe, it, expect } from 'vitest';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { Env, handleWorkerRequest } from '../src/worker';

const BASE = 'https://test.example.com/mcp';
const TEST_ENV: Env = {
  ALLOWED_HOSTS: 'test.example.com',
  ALLOWED_ORIGINS: 'client.example.com',
};

function request(url: string, init: RequestInit = {}, env: Env = TEST_ENV): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('host', new URL(url).host);
  return handleWorkerRequest(new Request(url, { ...init, headers }), env);
}

async function rpc(body: unknown): Promise<{ status: number; json?: any; text?: string }> {
  const res = await request(BASE, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();
  if (contentType.includes('text/event-stream')) {
    // SSE 流式响应：解析 data: 行，取本请求 id 对应的 JSON-RPC 结果
    const messages: any[] = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('data: ')) {
        try { messages.push(JSON.parse(line.slice(6))); } catch { /* 心跳/注释行 */ }
      }
    }
    const target = messages.find(m => m.id !== undefined) || messages[messages.length - 1];
    return { status: res.status, json: target };
  }
  try {
    return { status: res.status, json: JSON.parse(raw) };
  } catch {
    return { status: res.status, text: raw };
  }
}

describe('HTTP 入口（Streamable HTTP 无状态）', () => {
  it('非 POST 请求返回 405（v2 无状态协议只接受 POST）', async () => {
    const get = await request(BASE);
    expect(get.status).toBe(405);
    const del = await request(BASE, { method: 'DELETE' });
    expect(del.status).toBe(405);
  });

  it('根路径、健康检查与未知路径职责明确', async () => {
    const root = await request('https://test.example.com/');
    expect(root.status).toBe(200);
    expect(await root.json()).toMatchObject({
      name: 'mingpan',
      mcpEndpoint: BASE,
      website: 'https://mingpan.bzwai.com',
      source: 'https://github.com/ChesterRa/mingpan',
    });

    const health = await request('https://test.example.com/healthz');
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({
      status: 'ok',
      service: 'mingpan',
      protocol: '2026-07-28',
    });

    expect((await request('https://test.example.com/unknown')).status).toBe(404);
  });

  it('拒绝未授权 Host 与浏览器 Origin', async () => {
    expect((await request('https://mingpan.bzwai.com/healthz', {}, {})).status).toBe(200);
    expect((await request('https://mingpan-mcp.account.workers.dev/healthz', {}, {})).status).toBe(200);
    expect((await request('https://another-worker.account.workers.dev/healthz', {}, {})).status).toBe(403);

    const badHost = await handleWorkerRequest(new Request(BASE, {
      headers: { host: 'attacker.example.com' },
    }), TEST_ENV);
    expect(badHost.status).toBe(403);

    const badOrigin = await request(BASE, {
      method: 'OPTIONS',
      headers: { origin: 'https://attacker.example.com' },
    });
    expect(badOrigin.status).toBe(403);
    expect(badOrigin.headers.get('access-control-allow-origin')).toBeNull();

    const allowedOrigin = await request(BASE, {
      method: 'OPTIONS',
      headers: { origin: 'https://client.example.com' },
    });
    expect(allowedOrigin.status).toBe(204);
    expect(allowedOrigin.headers.get('access-control-allow-origin'))
      .toBe('https://client.example.com');
    const allowedHeaders = allowedOrigin.headers
      .get('access-control-allow-headers')
      ?.toLowerCase();
    expect(allowedHeaders).toContain('mcp-method');
    expect(allowedHeaders).toContain('mcp-name');
  });

  it('限制请求体大小与调用频率', async () => {
    const oversized = await request(BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': String(256 * 1024 + 1),
      },
      body: '{}',
    });
    expect(oversized.status).toBe(413);

    let rateLimitKey = '';
    const limited = await request(BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': '203.0.113.9',
      },
      body: '{}',
    }, {
      ...TEST_ENV,
      RATE_LIMITER: {
        async limit({ key }) {
          rateLimitKey = key;
          return { success: false };
        },
      },
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    expect(rateLimitKey).toBe('mcp:203.0.113.9');
  });

  it('新版客户端可完成 2026-07-28 协议协商并调用工具', async () => {
    const localFetch: typeof fetch = async (input, init) => {
      const original = new Request(input, init);
      const headers = new Headers(original.headers);
      headers.set('host', new URL(original.url).host);
      return handleWorkerRequest(new Request(original, { headers }), TEST_ENV);
    };
    const transport = new StreamableHTTPClientTransport(new URL(BASE), {
      fetch: localFetch,
    });
    const client = new Client(
      { name: 'modern-http-test', version: '0' },
      { versionNegotiation: { mode: { pin: '2026-07-28' } } }
    );

    try {
      await client.connect(transport);
      expect(client.getProtocolEra()).toBe('modern');
      expect((await client.listTools()).tools).toHaveLength(18);
    } finally {
      await client.close();
    }
  });

  it('initialize + tools/list：18 个工具经 HTTP 可见', async () => {
    const init = await rpc({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'http-test', version: '0' } },
    });
    expect(init.status).toBe(200);
    expect(init.json?.result?.serverInfo?.name).toBe('mingpan');

    const tools = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(tools.json?.result?.tools).toHaveLength(18);
  });

  it('跨形态一致性：HTTP 调 bazi_basic 与 stdio 逐字节一致（金样本盘）', async () => {
    const call = await rpc({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: {
        name: 'bazi_basic',
        arguments: { year: 1992, month: 4, day: 12, hour: 7, minute: 30, gender: 'male' },
      },
    });
    expect(call.json?.result?.isError).toBeFalsy();
    const text = call.json.result.content[0].text;
    // 金样本锚点（与 stdio 形态同一套渲染器）
    expect(text).toContain('年柱：壬申（剑锋金）');
    expect(text).toContain('命宮：己酉　胎元：乙未');
    expect(text).toContain('藏干十神（※本氣）：年申[庚食神※ 壬偏財 戊比肩]');
  });

  it('HTTP 调 qimen_basic：金样本盘（阴遁3局）', async () => {
    const call = await rpc({
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'qimen_basic', arguments: { year: 2024, month: 6, day: 21, hour: 10 } },
    });
    expect(call.json?.result?.content[0].text).toContain('阴遁3局');
  });

  it('timezone 参数经 HTTP 生效（纽约换算）', async () => {
    const call = await rpc({
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: {
        name: 'bazi_basic',
        arguments: { year: 1990, month: 6, day: 15, hour: 20, minute: 30, gender: 'male', timezone: 'America/New_York' },
      },
    });
    const text = call.json.result.content[0].text;
    expect(text).toContain('America/New_York');
    expect(text).toContain('庚午'); // 北京 1990-06-16 → 年柱庚午
  });

  it('并发紫微请求不共享命盘状态', async () => {
    const cases = [
      { year: 1985, month: 3, day: 14, hour: 12, minute: 56, gender: 'male' },
      { year: 1992, month: 12, day: 24, hour: 9, minute: 16, gender: 'female' },
    ];
    const call = (id: number, args: Record<string, unknown>) => rpc({
      jsonrpc: '2.0', id, method: 'tools/call',
      params: { name: 'ziwei_xiaoxian', arguments: { ...args, count: 6 } },
    });

    const expected = [];
    for (const [index, args] of cases.entries()) {
      expected.push((await call(20 + index, args)).json?.result?.content?.[0]?.text);
    }

    const concurrent = await Promise.all(
      cases.map((args, index) => call(30 + index, args))
    );
    expect(concurrent.map((result) => result.json?.result?.content?.[0]?.text))
      .toEqual(expected);
  });
});
