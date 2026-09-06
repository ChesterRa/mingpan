import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { createMingpanServer } from '../src/server';
import example from '../site-src/example.json';

const root = path.resolve(import.meta.dirname, '..');
const origin = 'https://mingpan.bzwai.com';
const endpoint = `${origin}/mcp`;

const pages = [
  { file: 'site/index.html', lang: 'zh-TW', canonical: origin },
  { file: 'site/zh-CN/index.html', lang: 'zh-CN', canonical: `${origin}/zh-CN` },
  { file: 'site/en/index.html', lang: 'en', canonical: `${origin}/en` },
  { file: 'site/ja/index.html', lang: 'ja', canonical: `${origin}/ja` },
];

describe('Mingpan 产品站静态资产', () => {
  it.each(pages)('$lang 页面具备正确端点、语言与 canonical', async (page) => {
    const html = await readFile(path.join(root, page.file), 'utf8');
    expect(html).toContain(`<html lang="${page.lang}">`);
    expect(html).toContain(`<link rel="canonical" href="${page.canonical}">`);
    expect(html).toContain(endpoint);
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('mcp.bzwai.com');
    expect(html).toContain(`href="https://bzwai.com/${page.lang}"`);
    expect(html).toContain('claude mcp add --transport http mingpan');
    expect(html).toContain('class="connect-steps"');
    expect(html).toContain('庚午');
    expect(html).toContain('<picture class="hero-scene"');
    expect(html).toContain('(max-width:767px)');
    expect(html).toContain('/assets/time-atlas-mobile.webp');
    expect(html).not.toContain('time-folio');
    expect(html).not.toMatch(/three\.js|unpkg\.com|type="importmap"|<canvas|<video/);
  });

  it('both responsive artwork files are local build assets', async () => {
    for (const file of ['time-atlas.webp', 'time-atlas-mobile.webp']) {
      const source = await readFile(path.join(root, 'site-src/assets', file));
      expect(await readFile(path.join(root, 'site/assets', file))).toEqual(source);
      expect(source.subarray(8, 12).toString()).toBe('WEBP');
    }
  });

  it('sitemap 只发布四个 canonical 语言入口', async () => {
    const sitemap = await readFile(path.join(root, 'site/sitemap.xml'), 'utf8');
    expect(sitemap.match(/<url>/g)).toHaveLength(4);
    expect(sitemap).toContain(`<loc>${origin}</loc>`);
    expect(sitemap).toContain(`<loc>${origin}/zh-CN</loc>`);
    expect(sitemap).toContain(`<loc>${origin}/en</loc>`);
    expect(sitemap).toContain(`<loc>${origin}/ja</loc>`);
  });

  it('产品站脚本只复制固定官方端点且不采集输入', async () => {
    const script = await readFile(path.join(root, 'site/site.js'), 'utf8');
    expect(script).toContain(`const endpoint = "${endpoint}"`);
    expect(script).toContain('navigator.clipboard.writeText(endpoint)');
    expect(script).not.toMatch(/fetch\(|XMLHttpRequest|localStorage|sessionStorage/);
  });

  it('公开示例来自同一真实工具出口，不是手写占位结果', async () => {
    expect(example.fictional).toBe(true);
    const server = createMingpanServer();
    const client = new Client({ name: 'site-proof-test', version: '0.0.1' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      expect((await client.listTools()).tools).toHaveLength(example.toolCount);
      for (const saved of example.results) {
        const result = await client.callTool({ name: saved.name, arguments: example.input });
        expect(result.isError).toBeFalsy();
        const content = result.content as { type: string; text: string }[];
        expect(content.filter(item => item.type === 'text').map(item => item.text).join('\n')).toBe(saved.text);
      }
    } finally {
      await client.close();
      await server.close();
    }
  });
});
