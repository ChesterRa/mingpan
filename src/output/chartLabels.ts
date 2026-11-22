/**
 * Traditional glyphs used by the chart labels from the calculation tables.
 * Render caller-supplied names and other free text separately.
 */
const TRADITIONAL_GLYPHS: Record<string, string> = {
  业: '業', 临: '臨', 云: '雲', 产: '產', 仪: '儀', 伤: '傷', 会: '會', 养: '養',
  兑: '兌', 农: '農', 冲: '沖', 击: '擊', 剑: '劍', 华: '華', 医: '醫',
  宫: '宮', 寻: '尋', 带: '帶', 开: '開', 张: '張', 惊: '驚',
  时: '時', 显: '顯', 杨: '楊', 气: '氣', 涧: '澗', 灯: '燈', 炉: '爐', 盘: '盤',
  禄: '祿', 离: '離', 矫: '矯', 绝: '絕', 网: '網', 罗: '羅', 腾: '騰', 荧: '熒',
  蜡: '蠟', 腊: '臘', 补: '補', 诉: '訴', 讼: '訟', 试: '試', 财: '財', 贵: '貴',
  转: '轉', 辅: '輔', 钗: '釵', 钏: '釧', 锋: '鋒', 长: '長', 门: '門',
  闰: '閏', 阴: '陰', 阳: '陽', 顺: '順', 风: '風', 飞: '飛', 马: '馬', 驿: '驛', 鸟: '鳥',
  鸡: '雞', 猪: '豬', 龙: '龍', 头: '頭', 岁: '歲', 盖: '蓋', 并: '並', 雳: '靂',
};
const DISPLAY_GLYPHS = new RegExp(`[${Object.keys(TRADITIONAL_GLYPHS).join('')}]`, 'gu');

export function formatChartLabel(label: string): string {
  return label.replace(DISPLAY_GLYPHS, glyph => TRADITIONAL_GLYPHS[glyph]);
}
