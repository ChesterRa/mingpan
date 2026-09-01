import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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
});
