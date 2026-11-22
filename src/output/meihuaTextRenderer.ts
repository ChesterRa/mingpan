/**
 * 梅花易數盤面文本渲染器
 * 
 * 輸出格式：Markdown 純文本
 * 語言：繁體中文
 */

import { formatChartLabel } from './chartLabels';
import { MeihuaResult } from '../services/meihua/types';

/**
 * 渲染梅花易數盤面為 Markdown 文本
 */
export function renderMeihuaText(result: MeihuaResult): string {
  const lines: string[] = [];

  // 標題
  lines.push('## 梅花易數排盤');
  lines.push('');

  // 時間信息
  lines.push(`**起卦時間**：${formatChartLabel(result.timeInfo.lunarDate)}`);
  
  // 起卦方式和數據
  if (result.method === 'time' && result.timeDetail) {
    const td = result.timeDetail;
    lines.push(`**起卦方式**：時間起卦`);
    lines.push(`**起卦數**：年(${td.yearZhiIndex}) + 月(${td.lunarMonth}) + 日(${td.lunarDay}) = ${td.sumForUpper} → 上卦 ${td.sumForUpper}%8=${result.qiGuaData.upperGuaIndex}(${result.benGua.upperGua.name})`);
    lines.push(`**起卦數**：${td.sumForUpper} + 時(${td.shiChenIndex}) = ${td.sumForLower} → 下卦 ${td.sumForLower}%8=${result.qiGuaData.lowerGuaIndex}(${result.benGua.lowerGua.name}) | 動爻 ${td.sumForLower}%6=${result.movingYao}`);
  } else {
    lines.push(`**起卦方式**：數字起卦`);
    lines.push(`**上卦數**：${result.qiGuaData.upperNumber} → ${result.qiGuaData.upperNumber}%8=${result.qiGuaData.upperGuaIndex}(${result.benGua.upperGua.name})`);
    lines.push(`**下卦數**：${result.qiGuaData.lowerNumber} → ${result.qiGuaData.lowerNumber}%8=${result.qiGuaData.lowerGuaIndex}(${result.benGua.lowerGua.name})`);
    lines.push(`**動爻數**：${result.qiGuaData.yaoNumber} → ${result.qiGuaData.yaoNumber}%6=${result.movingYao}`);
  }
  lines.push('');

  // 卦象
  lines.push(`**本卦**：${result.benGua.name} → **變卦**：${result.bianGua.name} | **互卦**：${result.huGua.name}`);
  lines.push('');

  // 卦象表格
  lines.push('| 卦 | 卦象 | 五行 | 體/用 |');
  lines.push('|:--:|:----:|:----:|:-----:|');
  
  const tiYongUpper = result.tiYong.tiGua === 'upper' ? '體' : '用';
  const tiYongLower = result.tiYong.tiGua === 'lower' ? '體' : '用';
  
  lines.push(`| 上卦 | ${result.benGua.upperGua.name} ${result.benGua.upperGua.symbol} | ${result.benGua.upperGua.wuXing} | ${tiYongUpper} |`);
  lines.push(`| 下卦 | ${result.benGua.lowerGua.name} ${result.benGua.lowerGua.symbol} | ${result.benGua.lowerGua.wuXing} | ${tiYongLower} |`);
  lines.push('');

  // 動爻位置
  const yaoPositionNames = ['初', '二', '三', '四', '五', '上'];
  lines.push(`**動爻**：${yaoPositionNames[result.movingYao - 1]}爻（${result.movingYao <= 3 ? '下卦' : '上卦'}）`);
  lines.push('');

  // 體用關係
  lines.push(`**體用關係**：${result.tiYong.description}`);

  return lines.join('\n');
}
