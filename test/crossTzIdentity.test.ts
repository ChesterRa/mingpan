import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('跨時區 stdio 輸出一致性', () => {
  it('同一份編譯產物在 UTC、東京、紐約的所有工具輸出逐字一致', () => {
    const smokeScript = resolve(__dirname, '../scripts/smoke-stdio.mjs');
    const output = execFileSync(process.execPath, [smokeScript, '--compare-timezones'], {
      encoding: 'utf8',
      timeout: 90_000,
    });
    expect(output).toContain('18 tools (UTC, Asia/Tokyo, America/New_York)');
  }, 100_000);
});
