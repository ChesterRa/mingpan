/**
 * 大六壬盤面 Markdown 渲染器
 * 
 * 輸出格式設計原則：
 * - 第一屏就讓人/agent 看懂
 * - Markdown 表格避免過寬
 * - 統一使用繁體中文
 */

import type { DaliurenResult } from '../services/daliuren/types';
import { TIAN_JIANG_FULL, normalizeJieQiName } from '../services/daliuren/data/constants';

/**
 * 渲染大六壬盤面為 Markdown 文本
 */
export function renderDaliurenText(result: DaliurenResult): string {
  const lines: string[] = [];
  
  // 標題
  lines.push('## 大六壬排盤');
  lines.push('');
  
  // 基本信息
  lines.push(`**節氣**：${normalizeJieQiName(result.basicInfo.jieqi)} | **農曆**：${result.basicInfo.lunarMonth}`);
  lines.push(`**日干支**：${result.basicInfo.dayGanZhi}日 | **時干支**：${result.basicInfo.hourGanZhi}時 | **${result.basicInfo.dayNight}占**`);
  lines.push(`**月將**：${result.tianDiPan.yueJiang}（${result.tianDiPan.yueJiangName}）`);
  lines.push('');
  
  // 格局
  lines.push(`**格局**：${result.sanChuan.geJu}課 · ${result.sanChuan.geJuDetail}`);
  lines.push('');
  
  // 三傳
  lines.push('### 三傳');
  lines.push('');
  lines.push('| 傳位 | 地支 | 天將 | 六親 | 空亡 |');
  lines.push('|:----:|:----:|:----:|:----:|:----:|');
  
  const chuans = [result.sanChuan.chuChuan, result.sanChuan.zhongChuan, result.sanChuan.moChuan];
  for (const chuan of chuans) {
    const jiangFull = TIAN_JIANG_FULL[chuan.tianJiang] || chuan.tianJiang;
    const kongMark = chuan.xunKong ? '○' : '';
    lines.push(`| ${chuan.position} | ${chuan.diZhi} | ${jiangFull} | ${chuan.liuQin} | ${kongMark} |`);
  }
  lines.push('');
  
  // 四課
  lines.push('### 四課');
  lines.push('');
  lines.push('| 課位 | 上神 | 下神 | 天將 | 關係 |');
  lines.push('|:----:|:----:|:----:|:----:|:----:|');
  
  // 四課從四課到一課顯示（傳統順序）
  for (let i = 3; i >= 0; i--) {
    const ke = result.siKe.list[i];
    const jiangFull = TIAN_JIANG_FULL[ke.tianJiang] || ke.tianJiang;
    const relationShort = formatRelation(ke.relation);
    lines.push(`| ${ke.position}課 | ${ke.shangShen} | ${ke.xiaShen} | ${jiangFull} | ${relationShort} |`);
  }
  lines.push('');
  
  // 天地盤
  lines.push('### 天地盤');
  lines.push('');
  lines.push(renderTianDiPanGrid(result));
  lines.push('');
  
  // 神煞
  lines.push('### 神煞');
  lines.push('');
  lines.push(`**日馬**：${result.shenSha.riMa} | **月馬**：${result.shenSha.yueMa} | **丁馬**：${result.shenSha.dingMa}`);
  lines.push(`**華蓋**：${result.shenSha.huaGai} | **閃電**：${result.shenSha.shanDian}`);
  lines.push('');
  
  return lines.join('\n');
}

/**
 * 格式化關係
 */
function formatRelation(relation: string): string {
  switch (relation) {
    case '上尅下': return '尅↓';
    case '下賊上': return '賊↑';
    case '比和': return '比';
    case '上生下': return '生↓';
    case '下生上': return '生↑';
    default: return relation;
  }
}

/**
 * 渲染天地盤格子
 */
function renderTianDiPanGrid(result: DaliurenResult): string {
  const { tianPan, diPan, tianJiang } = result.tianDiPan;
  
  // 使用表格顯示天地盤
  const lines: string[] = [];
  
  // 天盤行
  lines.push('```');
  lines.push('        巳    午    未    申');
  lines.push(`天盤：  ${tianPan[5]}    ${tianPan[6]}    ${tianPan[7]}    ${tianPan[8]}`);
  lines.push(`天將：  ${tianJiang[5]}    ${tianJiang[6]}    ${tianJiang[7]}    ${tianJiang[8]}`);
  lines.push('');
  lines.push(`  辰                          酉`);
  lines.push(`  ${tianPan[4]}                          ${tianPan[9]}`);
  lines.push(`  ${tianJiang[4]}                          ${tianJiang[9]}`);
  lines.push('');
  lines.push(`  卯                          戌`);
  lines.push(`  ${tianPan[3]}                          ${tianPan[10]}`);
  lines.push(`  ${tianJiang[3]}                          ${tianJiang[10]}`);
  lines.push('');
  lines.push(`天盤：  ${tianPan[2]}    ${tianPan[1]}    ${tianPan[0]}    ${tianPan[11]}`);
  lines.push(`天將：  ${tianJiang[2]}    ${tianJiang[1]}    ${tianJiang[0]}    ${tianJiang[11]}`);
  lines.push('        寅    丑    子    亥');
  lines.push('```');
  
  return lines.join('\n');
}

// 導出輔助函數
export { formatRelation, renderTianDiPanGrid };
