# MingPan 下一階段開發路線圖（六爻 / 梅花 / 統一時間處理）

> 版本: 2.1.0
> 創建日期: 2025-12-19
> 狀態: 規劃中

## 0. 第一性原理與設計邊界

### 0.1 MCP 的職責邊界

- **MCP = 確定性計算器**（給出可複現、可驗證的排盤結果）
- **Agent = 解釋/推斷分析師**（基於盤面做解讀、推斷、建議）

MCP 輸出應優先提供 **Agent 無法「查表/推理」得到**、且對結果敏感的量：
- 干支（涉及節氣、曆法）
- 卦象結構與動變規則（六爻/梅花）
- 運限結構（大運/小限/流年等）

**輸出格式**：純文本/Markdown 優先（穩定、可讀、省 token），統一使用繁體中文。

### 0.2 可複現性優先

命理計算對「時間、曆法邊界」高度敏感。設計原則：
- 同一輸入在不同機器上輸出必須一致
- 當前階段統一使用北京時間（UTC+8），不暴露時區參數
- 先保證 **可複現**，再逐步擴展 **多時區/地理校正**

### 0.3 開源參考策略

- 開源項目當「算法與數據的對照標杆（oracle）+ 思路來源」
- 核心實現做成自己可維護的 TS 模組——不被 license 綁住，不被小項目停更綁住

---

## 1. 統一時間處理

### 1.1 當前階段：北京時間單時區

**設計決策**：
- 統一使用北京時間（UTC+8）
- 不對外暴露 `timezone` 參數（避免用戶誤解為支持多時區）
- 啟動時設置 `process.env.TZ = 'Asia/Shanghai'`，確保 Node `Date` 與 `lunar-javascript` 行為一致

**輸入口徑**：

| 字段 | 類型 | 說明 |
|------|------|------|
| `year` | `number` | 公曆年 |
| `month` | `number` | 公曆月（1-12） |
| `day` | `number` | 公曆日（1-31） |
| `hour` | `number` | 公曆時（0-23） |
| `minute` | `number?` | 分鐘，默認 0 |
| `isLunar` | `boolean?` | 輸入日期是否為農曆，默認 false。若為 true，入口即轉換為公曆後再計算 |
| `longitude` | `number?` | 真太陽時校正（BaZi 已支持） |

**實現要點**：
- `src/utils/timeNormalization.ts` 提供 `normalizeBirthDateTime()` 處理農曆轉公曆
- 在 MCP 入口層統一調用，避免在每個 handler 裡重複代碼

### 1.2 下一階段：多時區支持（里程碑 M4）

當產品需要支持海外用戶時：
- **原則**：不依賴 `process.env.TZ` 全局副作用
- **方案**：引入 `date-fns-tz`（輕量）或 `@js-temporal/polyfill`（功能全）
- **屆時再新增 `timezone` 參數**

---

## 2. 六爻（LiuYao）v1 功能規劃

### 2.1 設計原則

- **排盤層**：MCP 負責，輸出確定性結構
- **斷卦層**：交給 Agent/LLM，不在引擎裡「自動斷」
- **確定性優先**：v1 只支持手動輸入爻值，不做隨機起卦（金錢法由 Agent 生成隨機數後調用）

### 2.2 參考標杆

- **shu-var-negative**（MIT）：納甲/六親/世應/六神/旬空齊全，適合做回歸對照

### 2.3 MCP 工具定義

**工具名**：`liuyao_basic`

**輸入**：
```typescript
{
  // 六個爻值（自下而上，初爻到上爻）
  // 6=老陰(動), 7=少陽(靜), 8=少陰(靜), 9=老陽(動)
  yaoValues: [number, number, number, number, number, number],
  
  // 時間信息（用於六神、旬空），統一用公曆輸入
  year: number,
  month: number,
  day: number,
  hour: number,
  isLunar?: boolean,  // 默認 false
}
```

**輸出**（Markdown 文本）

### 2.4 v1 必做功能（排盤層，基本無爭議）

| 功能 | 說明 | 口徑 |
|------|------|------|
| 本卦/變卦 | 動爻（6/9）陰陽反轉得變卦 | 標準 |
| 動爻標註 | 哪些爻為 6/9 | 自下而上標註 |
| 京房納甲 | 每爻地支（含五行） | 京房體系 |
| 卦宮/五行 | 八宮歸屬 + 卦宮五行 | 用於六親推導 |
| 六親 | 以卦宮五行為「我」，對每爻五行生剋 | 兄/子/財/官/父 |
| 世應 | 按八宮卦（含遊魂/歸魂）確定 | 標準世應規則 |
| 六神 | 按日干起六神 | 青龍/朱雀/勾陳/螣蛇/白虎/玄武 |
| 月建 | 按節氣建月 | 主流六爻口徑 |
| 日辰 | 日干支 | 標準 |
| 旬空 | 由日柱推得空亡 | 標準 |

### 2.5 v1.1 新增功能（高權威性，已實現）

| 功能 | 說明 | 來源 |
|------|------|------|
| 伏神/飛神 | 用神不現時從本宮首卦尋找伏神 | 《增刪卜易》第35章 |
| 飛伏關係 | 飛生伏/飛克伏/伏生飛/伏克飛/比和 | 《卜筮正宗》 |
| 進神/退神 | 動爻變化的地支順進或逆退 | 《增刪卜易》第36章 |
| 旺衰判斷 | 月建/日辰對爻的旺相休囚死 | 五行傳統理論 |

### 2.6 v2 暫緩功能（斷卦層，分歧多）

| 功能 | 原因 |
|------|------|
| 用神取法/應期推斷 | 交給 LLM |
| 旺衰量化打分 | 口徑差異大，只做定性判斷 |
| 神煞體系 | 極易引戰，先不碰 |

### 2.7 工程結構

```
src/services/liuyao/
├── LiuyaoService.ts      # 統一對外接口
├── types.ts              # 輸入輸出類型
├── calculators/
│   ├── NajiaCalculator.ts      # 納甲
│   ├── LiuqinCalculator.ts     # 六親
│   ├── LiushenCalculator.ts    # 六神
│   ├── XunkongCalculator.ts    # 旬空
│   ├── FushenCalculator.ts     # 伏神/飛神（v1.1）
│   ├── JintuishenCalculator.ts # 進神/退神（v1.1）
│   └── WangshuaiCalculator.ts  # 旺衰（v1.1）
└── data/
    └── guagong.ts              # 八宮卦數據
```

---

## 3. 梅花易數（Meihua）v1 功能規劃

### 3.1 設計原則

- 主流程（起卦->互卦->變卦->體用->五行生剋）自研，可控性高
- 卦辭數據可引用開源（HexVerse explains.json，MIT）

### 3.2 參考標杆

- **HexVerse**（MIT）：64卦卦辭/彖辭/象辭/爻辭數據源
- **plum-cg**（ISC）：策軌法模組，類型/測試完善，v2 可引入

### 3.3 MCP 工具定義

**工具名**：`meihua_basic`

**輸入**：
```typescript
{
  // 起卦方式
  method: 'time' | 'number',
  
  // time 模式（默認）：接口統一用公曆輸入，內部自動轉農曆計算
  // 轉換流程：公曆 -> 農曆年月日時 -> 干支序數 -> 起卦
  year?: number,       // 公曆年
  month?: number,      // 公曆月
  day?: number,        // 公曆日
  hour?: number,       // 公曆時（0-23）
  isLunar?: boolean,   // 默認 false，若為 true 則輸入視為農曆
  
  // number 模式：兩數起卦
  upperNumber?: number,  // 上卦數
  lowerNumber?: number,  // 下卦數
  yaoNumber?: number,    // 動爻數（可選，默認用上下卦數之和）
}
```

**輸出**（Markdown 文本）

### 3.4 v1 必做功能

| 功能 | 說明 | 口徑 |
|------|------|------|
| 時間起卦 | 農曆年月日時 | 見下方算法口徑 |
| 數字起卦 | 兩數/三數 | 標準取模 |
| 本卦 | 上卦 + 下卦 | 標準 |
| 變卦 | 按動爻變爻 | 標準 |
| 互卦 | 2-4 為下卦、3-5 為上卦（自下而上） | 標準 |
| 體用 | 動爻所在卦為用，另一卦為體 | 輸出規則說明 |
| 五行生剋 | 體卦五行、用卦五行、關係 | 生/剋/比和/洩耗 |

**時間起卦算法口徑**（農曆）：
```
年數 = 農曆年地支序數（子=1, 丑=2, ..., 亥=12）
月數 = 農曆月（1-12，閏月按本月算）
日數 = 農曆日（1-30）
時數 = 時辰地支序數（子=1, 丑=2, ..., 亥=12）

上卦數 = (年數 + 月數 + 日數) % 8，餘 0 取 8
下卦數 = (年數 + 月數 + 日數 + 時數) % 8，餘 0 取 8
動爻 = (年數 + 月數 + 日數 + 時數) % 6，餘 0 取 6
```

**注意**：年數使用地支序數(1-12)，不是干支序數(1-60)。這是《梅花易數》原著及主流實現的標準口徑。

### 3.5 v1 暫緩功能

| 功能 | 原因 |
|------|------|
| 錯卦/綜卦/交互卦 | 算法不難，但不是每個人都用，v2 可加 |
| 策軌法 | 作為高級模組引入（參考 plum-cg） |
| 卦辭爻辭 | 可做為參考文本，不參與計算 |

### 3.6 工程結構

```
src/services/meihua/
├── MeihuaService.ts      # 統一對外接口
├── types.ts              # 輸入輸出類型
├── calculators/
│   ├── QiguaCalculator.ts    # 起卦（時間/數字）
│   ├── HuguaCalculator.ts    # 互卦
│   ├── BianguaCalculator.ts  # 變卦
│   └── TiyongCalculator.ts   # 體用/五行
└── data/
    └── bagua.ts              # 八卦基礎數據
```

---

## 4. 輸出格式規範

### 4.1 設計原則

- 第一屏就讓人/agent 看懂
- Markdown 表格避免過寬，適配聊天窗口
- 所有文本渲染集中在 `src/output/`，service 層只返回結構化數據
- **統一使用繁體中文**

### 4.2 六爻盤面示例

```markdown
## 六爻排盤

**起卦時間**：2025年12月19日 巳時
**日干支**：甲子日 | **月建**：子月 | **旬空**：戌亥

**本卦**：天火同人（離宮）→ **變卦**：乾為天

| 爻位 | 本卦 | 變卦 | 六親 | 六神 | 納甲 |
|:----:|:----:|:----:|:----:|:----:|:----:|
| 上 | ▅▅▅ | ▅▅▅ | 兄 | 玄武 | 戌土 |
| 五 | ▅▅▅ | ▅▅▅ | 子 | 白虎 | 申金 |
| 四 | ▅▅▅○ | ▅ ▅ | 父 | 螣蛇 | 午火→未土 |
| 三 | ▅▅▅ | ▅▅▅ | 父 | 勾陳 | 巳火 |
| 二 | ▅ ▅ | ▅▅▅ | 財 | 朱雀 | 卯木 |
| 初 | ▅▅▅ | ▅▅▅ | 官 | 青龍 | 丑土 |

**世爻**：二爻 | **應爻**：五爻
```

### 4.3 梅花盤面示例

```markdown
## 梅花易數排盤

**起卦時間**：農曆乙巳年冬月十九日 巳時
**起卦數**：年(42) + 月(11) + 日(19) = 72 → 上卦 72%8=8(坤)
**起卦數**：72 + 時(6) = 78 → 下卦 78%8=6(坎) | 動爻 78%6=6(六爻)

**本卦**：地水師 → **變卦**：地澤臨 | **互卦**：地雷復

| 卦 | 卦象 | 五行 | 體/用 |
|:--:|:----:|:----:|:-----:|
| 上卦 | 坤 ☷ | 土 | 體 |
| 下卦 | 坎 ☵ | 水 | 用 |

**體用關係**：土剋水，體剋用，主吉。
```

---

## 5. 測試策略

### 5.1 單元測試

- `isLunar` 農曆->公曆轉換（含閏月邊界）
- 六爻：納甲、六親、世應、六神、旬空
- 梅花：時間起卦、數字起卦、互卦、體用

### 5.2 回歸測試

- 固定一組經典盤例，做 snapshot 或關鍵字段斷言
- 六爻：與 shu-var-negative 輸出對照
- 梅花：與手算結果對照

### 5.3 跨環境一致性

- CI 中強制不同 `TZ` 環境變量運行，確保輸出一致

---

## 6. 里程碑

| 里程碑 | 內容 | 預估週期 | 狀態 |
|--------|------|----------|------|
| M1 | 時間處理測試體系落地（Vitest + 農曆轉換回歸） | 1 週 | ✅ 完成 |
| M2 | 六爻 v1（manual + 排盤層全功能 + 對照用例） | 2 週 | ✅ 完成 |
| M2.1 | 六爻 v1.1（伏神/飛神 + 進退神 + 旺衰） | 0.5 週 | ✅ 完成 |
| M3 | 梅花 v1（time/number + 體用/五行 + 對照用例） | 1-2 週 | ✅ 完成 |
| M4 | 多時區支持（timezone 參數） | 1 週 | ✅ 完成 |
| M5 | 大六壬 v1（天地盤 + 四課 + 三傳 + 十二天將） | 1 週 | ✅ 完成 |

### M1 完成內容（2025-12-19）

- `test/timeNormalization.test.ts` - 時間歸一化模組測試（13 個測試用例）
  - 公曆輸入直接透傳
  - 農曆輸入轉換為公曆
  - 邊界情況處理
  - minute 默認值
- `test/bazi.test.ts` - 八字計算回歸測試（8 個測試用例）
  - 四柱計算正確性
  - 子時邊界處理
  - 節氣邊界處理
  - 大運計算
- `test/ziwei.test.ts` - 紫微斗數回歸測試（7 個測試用例）
  - 十二宮位排列
  - 基本信息計算
  - 四化計算
  - 命宮主星
- `test/tzConsistency.test.ts` - 跨環境時區一致性測試（5 個測試用例）
  - BEIJING_TZ 常量驗證
  - Date 對象行為一致性
  - 計算結果確定性

### M2 完成內容（2025-12-19）

- `src/services/liuyao/types.ts` - 六爻類型定義
- `src/services/liuyao/data/guagong.ts` - 八宮卦數據（64 卦完整納甲、世應、卦宮）
- `src/services/liuyao/calculators/` - 計算器模組
  - `NajiaCalculator.ts` - 納甲計算（京房體系）
  - `LiuqinCalculator.ts` - 六親計算（五行生剋）
  - `LiushenCalculator.ts` - 六神計算（日干起神）
  - `XunkongCalculator.ts` - 旬空計算
- `src/services/liuyao/LiuyaoService.ts` - 六爻服務主類
- `src/output/liuyaoTextRenderer.ts` - 六爻盤面 Markdown 渲染器
- `src/index.ts` - MCP 工具 `liuyao_basic` 註冊
- `test/liuyao.test.ts` - 六爻測試（25 個測試用例）
  - 納甲計算（乾/坤/天火同人）
  - 六親計算（五行生剋關係）
  - 六神計算（甲/丙/壬日）
  - 旬空計算（甲子/甲戌/甲午旬）
  - 世應計算（本宮/一世/遊魂/歸魂）
  - 完整排盤（乾為天/坤為地/動爻變卦/多動爻/六親/時間信息）

### M2.1 完成內容（2025-12-19）

- `src/services/liuyao/calculators/FushenCalculator.ts` - 伏神/飛神計算器
  - 用神不現時從本宮首卦尋找伏神
  - 計算飛伏關係（飛生伏/飛克伏/伏生飛/伏克飛/比和）
  - 伏神旺衰計算
- `src/services/liuyao/calculators/JintuishenCalculator.ts` - 進神/退神計算器
  - 進神：亥→子、寅→卯、巳→午、申→酉、丑→辰、辰→未、未→戌、戌→丑
  - 退神：子→亥、卯→寅、午→巳、酉→申、辰→丑、未→辰、戌→未、丑→戌
- `src/services/liuyao/calculators/WangshuaiCalculator.ts` - 旺衰計算器
  - 旺/相/休/囚/死 五種狀態
  - 月建旺衰、日辰旺衰
- `src/services/liuyao/types.ts` - 新增類型定義
  - FeiShenRelation、JinTuiShenType、WangShuaiState
  - FuShenInfo、YaoInfo 擴展
- `src/output/liuyaoTextRenderer.ts` - 更新輸出格式
  - 新增旺衰列（月/日）
  - 進退神標記（↑/↓）
  - 伏神信息區塊
- `test/liuyao.test.ts` - 新增測試用例（17 個）
  - 進退神計算（8 個）
  - 旺衰計算（5 個）
  - 伏神計算（4 個）

### M3 完成內容（2025-12-19）

- `src/services/meihua/types.ts` - 梅花易數類型定義
- `src/services/meihua/data/bagua.ts` - 八卦基礎數據（先天數、五行、64卦名）
- `src/services/meihua/calculators/` - 計算器模組
  - `QiguaCalculator.ts` - 起卦計算（時間/數字）
  - `HuguaCalculator.ts` - 互卦計算
  - `BianguaCalculator.ts` - 變卦計算
  - `TiyongCalculator.ts` - 體用分析（五行生剋）
- `src/services/meihua/MeihuaService.ts` - 梅花易數服務主類
- `src/output/meihuaTextRenderer.ts` - 梅花盤面 Markdown 渲染器
- `src/index.ts` - MCP 工具 `meihua_basic` 註冊
- `test/meihua.test.ts` - 梅花易數測試（23 個測試用例）
  - 八卦數據（先天數對應、餘0取8、64卦名）
  - 數字起卦（基本/餘0/指定動爻）
  - 時間起卦（公曆/農曆）
  - 互卦計算（地水師/乾為天/坤為地）
  - 變卦計算（六爻動/初爻動）
  - 體用分析（生/剋/耗/洩/比和）
  - 完整排盤（時間起卦/數字起卦/體用分析）

### M5 完成內容（2025-12-19）

- `src/services/daliuren/types.ts` - 大六壬類型定義
  - 天地盤、四課、三傳、十二天將、神煞類型
  - 格局類型（賊尅、比用、涉害、遙尅、昴星、別責、八專、伏吟、返吟）
- `src/services/daliuren/data/constants.ts` - 大六壬常量數據
  - 十天干、十二地支、十二天將
  - 月將對應節氣
  - 貴人起點（晝夜）
  - 五行生剋、六親對應
  - 日干寄宮、旬空、地支關係
- `src/services/daliuren/calculators/` - 計算器模組
  - `TianDiPanCalculator.ts` - 天地盤計算（月將加時辰起盤）
  - `SiKeCalculator.ts` - 四課計算（日干支推演）
  - `SanChuanCalculator.ts` - 三傳計算（九宗門推演）
  - `ShenShaCalculator.ts` - 神煞計算（日馬、月馬、丁馬、華蓋、閃電）
- `src/services/daliuren/DaliurenService.ts` - 大六壬服務主類
- `src/output/daliurenTextRenderer.ts` - 大六壬盤面 Markdown 渲染器
- `src/index.ts` - MCP 工具 `daliuren_basic` 註冊
- `test/daliuren.test.ts` - 大六壬測試（19 個測試用例）
  - 天地盤計算（月將、天盤、地盤）
  - 四課計算（日干寄宮、關係統計）
  - 三傳計算（格局、六親）
  - 神煞計算（日馬、華蓋、丁馬）
  - 完整排盤（經典盤例）
  - 文本渲染（Markdown 格式）

**參考來源**：
- kentang2017/kinliuren (MIT License) - Python 大六壬實現
- 《大六壬大全》- 經典文獻
- 《六壬粹言》- 經典文獻

**設計決策**：
- 只負責排盤，斷課解讀交給 Agent
- 九宗門簡化實現（賊尅、比用、涉害、遙尅、昴星、別責、八專、伏吟、返吟）
- 輸入需要節氣和干支（不自動計算，由 Agent 提供）

---

> 本文檔的目標是讓後續迭代「口徑可追溯、實現可落地、回歸可驗證」。
> 如果要變更算法口徑，請務必先更新本文檔再改代碼。

### M4 完成內容（2026-08-28，v0.1.4）

- `src/utils/timeNormalization.ts` 擴展：
  - 新增 `timezone` 參數（IANA 時區名），基於 `Intl.DateTimeFormat` 迭代換算，**零新增依賴**（未採用原規劃的 date-fns-tz/temporal）
  - 內部規範表示為北京時間（UTC+8 平太陽時）；輸出側採固定 +8 算術
  - 輸入側使用 IANA 偏移（自動處理歷史夏令時，含 1986-1991 中國夏令時：民用時自動回撥一小時，與主流排盤口徑一致）
  - `isLunar` 輸入忽略 timezone（曆法日期無時區語義）
- `test/timezone.test.ts`：15 個用例（跨日換算、半小時時區、DST 邊界、往返一致性、農曆忽略時區、非法時區報錯）
- 同批完成的相關工作見 `docs/qimen-correctness-notes.md`（奇門口徑修正）、大六壬時間起課（`DaliurenService.calculateFromTime`）、index.ts 按領域拆分並遷移至 MCP SDK 高級 API（registerTool）、zod v4（SDK 1.30 + zod 3.25 組合會觸發 TS2589 類型實例化爆炸，zod v4 解決）。
