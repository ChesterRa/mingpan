/**
 * 奇門遁甲 MCP 工具
 *
 * 工具列表：
 * - qimen_basic     基礎排盤（九宮布局、三奇六儀、八門九星八神、格局檢測）
 * - qimen_yongshen  用神分析（按事類，僅確定性信息）
 */

import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { QimenService } from '../services/qimen/QimenService';
import { renderQimenText, renderQimenYongShenText } from '../output/qimenTextRenderer';
import {
  birthTimeFields,
  normalizeBirthInfo,
  textResult,
  timezoneNote,
} from './schemas';

const SHI_LEI_VALUES = [
  '求财', '婚姻', '疾病', '出行', '诉讼', '考试', '工作',
  '失物', '置业', '求官', '孕产', '寻人', '合作', '其他',
] as const;

const panTypeField = z.enum(['时盘', '日盘', '月盘', '年盘']).optional().default('时盘')
  .describe('盤類型：时盘（默認）、日盘、月盘、年盘');
const panStyleField = z.enum(['转盘', '飞盘']).optional().default('转盘')
  .describe('盤式：转盘（默認，遵循《神奇之門》）或飞盘');
const zhiRunMethodField = z.enum(['chaibu', 'maoshan']).optional().default('chaibu')
  .describe('置閏方法：chaibu=拆補法（默認），maoshan=茅山法');
const shiLeiField = z.enum(SHI_LEI_VALUES).describe('事類（用於確定用神）');

export function registerQimenTools(server: McpServer): void {
  server.registerTool('qimen_basic', {
    title: '奇門遁甲排盤',
    description: `奇門遁甲排盤（基礎排盤）。

奇門遁甲是中國古代三式之一，與大六壬、太乙神數並稱，用於預測和決策。

輸入時間信息，返回完整的奇門盤面：
- 陰陽遁和局數（根據節氣判定）
- 九宮布局（地盤干、天盤干）
- 八門飛布（休、生、傷、杜、景、死、驚、開）
- 九星飛布（天蓬、天芮、天沖、天輔、天禽、天心、天柱、天任、天英）
- 八神排布（值符、螣蛇、太陰、六合、白虎、玄武、九地、九天）
- 旬首信息（符頭、值符星、值使門、空亡）
- 日干/時干落宮
- 格局判斷（吉格/凶格約20-30種）

支持選項：
- 盤類型：時盤（默認）、日盤、月盤、年盤
- 盤式：轉盤（默認，遵循《神奇之門》）或飛盤
- 置閏法：拆補法（默認）或茅山法

盤類型說明：
- 時盤：以時辰為主導，適用於即時預測
- 日盤：以日干支為主導，適用於當日吉凶
- 月盤：以月干支為主導，適用於月度運勢
- 年盤：以年干支為主導，適用於年度規劃

盤式說明：
- 轉盤：天盤、八門、九星按物理方向旋轉（《神奇之門》派）
- 飛盤：天盤、八門、九星按宮位數字飛布（傳統飛宮法）

輸出為 Markdown 格式，含 ASCII 九宮格，便於 AI 分析解讀。`,
    inputSchema: {
      ...birthTimeFields,
      panType: panTypeField,
      panStyle: panStyleField,
      zhiRunMethod: zhiRunMethodField,
    },
  }, async (args) => textResult('qimen_basic', async () => {
    const { normalized, sourceTimezone } = normalizeBirthInfo(args);

    const qimenService = new QimenService();
    const result = qimenService.calculate({
      year: normalized.year,
      month: normalized.month,
      day: normalized.day,
      hour: normalized.hour,
      minute: normalized.minute,
      isLunar: false,
      panType: args.panType,
      panStyle: args.panStyle,
      zhiRunMethod: args.zhiRunMethod,
    });

    return timezoneNote(sourceTimezone) + renderQimenText(result);
  }));

  server.registerTool('qimen_yongshen', {
    title: '奇門用神分析',
    description: `奇門遁甲用神分析。

在基礎排盤基礎上，根據事類選取用神並分析：

**支持 14 種事類**：
求財、婚姻、疾病、出行、訴訟、考試、工作、失物、置業、求官、孕產、尋人、合作、其他

**分析內容**（僅確定性事實）：
- 主用神/輔用神識別及落宮（依《神奇之門》通行用神表）
- 用神旺相休囚死狀態（依月令）
- 用神空亡、入墓、擊刑檢測
- 與日干生克關係
- 主客落宮與生克關係（涉及雙方的事類）
- 年命落宮（可選）

定位說明：用神吉凶、格局利弊等判斷無權威統一口徑，
請由 AI 結合盤面（含格局檢測）自行分析。

輸出為結構化 Markdown，便於 AI 斷卦分析。`,
    inputSchema: {
      ...birthTimeFields,
      panType: panTypeField,
      panStyle: panStyleField,
      zhiRunMethod: zhiRunMethodField,
      shiLei: shiLeiField,
      nianGan: z.enum(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'])
        .optional().describe('年干（用於年命分析，可選）'),
      includeShenSha: z.boolean().optional().default(true).describe('是否包含神煞分析'),
    },
  }, async (args) => textResult('qimen_yongshen', async () => {
    const { normalized, sourceTimezone } = normalizeBirthInfo(args);

    const qimenService = new QimenService();
    const result = qimenService.calculateWithYongShen(
      {
        year: normalized.year,
        month: normalized.month,
        day: normalized.day,
        hour: normalized.hour,
        minute: normalized.minute,
        isLunar: false,
        panType: args.panType,
        panStyle: args.panStyle,
        zhiRunMethod: args.zhiRunMethod,
      },
      args.shiLei,
      {
        nianGan: args.nianGan,
        includeShenSha: args.includeShenSha,
      }
    );

    return timezoneNote(sourceTimezone) + renderQimenYongShenText(result);
  }));

}
