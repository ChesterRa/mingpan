# 分发材料（注册表提交文案）

> 用途：向各 MCP 目录/注册表提交时的现成文案。三处口径一致，均以「确定性排盘 + 解读归 AI」为核心卖点。
> 提交前请核对各目标仓库当期的 CONTRIBUTING 格式（字段可能随版本调整）。

## 标准简介（30 词版，用于表格行）

> Deterministic Chinese-metaphysics chart calculator (MCP): BaZi, ZiWei, LiuYao, MeiHua, DaLiuRen, QiMen. Calendar-accurate facts only — interpretation is left to the AI.

## 标准简介（100 词版，用于介绍段）

> Mingpan is an MCP server that computes traditional Chinese divination charts — BaZi (Four Pillars), Zi Wei Dou Shu, LiuYao, MeiHua YiShu, Da Liu Ren, and Qi Men Dun Jia — with calendar-grade rigor. LLMs cannot reliably derive ganzhi pillars, solar-term boundaries, or lunar conversions; this server is the deterministic half of the equation, and your AI stays the interpreter. Outputs are verifiable facts only (pillars, hidden stems, ten gods, palaces, stars, mutagens); fortune scores and auspiciousness labels are deliberately excluded. 218 tests, minute-level LiChun boundary cases, historical-record golden charts, timezone & true-solar-time aware, cross-timezone reproducibility enforced in CI.

## 1. MCP 官方 servers 目录（github.com/modelcontextprotocol/servers）

提交 PR 在 README 社区列表中加一行（以当期 CONTRIBUTING 为准）：

```
| mingpan | Deterministic Chinese metaphysics charts (BaZi, ZiWei, LiuYao, MeiHua, DaLiuRen, QiMen) — calendar facts only, interpretation left to the AI | [ChesterRa/mingpan](https://github.com/ChesterRa/mingpan) |
```

## 2. smithery（smithery.ai）

注册信息（网页表单或 CLI 按其当期流程）：

- **Name**: `mingpan`
- **Description**: Deterministic Chinese-metaphysics chart calculator for AI agents. Six systems: BaZi, Zi Wei Dou Shu, LiuYao, MeiHua, Da Liu Ren, Qi Men Dun Jia. Verified facts only — no fortune scores; interpretation belongs to your AI.
- **Command**: `npx -y mingpan`（stdio transport）

## 3. awesome-mcp-servers（punkpeye/awesome-mcp-servers）

PR 在合适分类（如 `Other` / 工具类）下加一行：

```
- [mingpan](https://github.com/ChesterRa/mingpan) 🇨🇳 - Deterministic Chinese metaphysics chart calculator: BaZi, Zi Wei Dou Shu, LiuYao, MeiHua, Da Liu Ren, Qi Men Dun Jia. Facts only, interpretation left to the AI.
```

（🇨🇳 地区标 emoji 遵循该仓库的既有约定；若当期规则不同则按其格式。）

## 4. 可选：MCP 官方 registry（若走 apps/registry JSON 格式）

```json
{
  "name": "mingpan",
  "description": "Deterministic Chinese metaphysics chart calculator (BaZi, ZiWei, LiuYao, MeiHua, DaLiuRen, QiMen). Calendar-accurate facts only — interpretation is left to the AI.",
  "repository": "https://github.com/ChesterRa/mingpan",
  "version": "0.1.4"
}
```

## 仓库侧待办（本仓库页面配置，用后勾选）

### GitHub Topics（18 词）

```
mcp, mcp-server, model-context-protocol, claude, claude-desktop, bazi, four-pillars, zi-wei-dou-shu, qimen-dunjia, liuyao, meihua-yishu, daliuren, i-ching, chinese-astrology, divination, fortune-telling, chinese-metaphysics, typescript
```

### About 双语描述（复制粘贴即用）

```
中华术数 MCP 排盘服务：八字・紫微斗数・六爻・梅花易数・大六壬・奇门遁甲｜Deterministic Chinese-metaphysics chart calculator for AI agents (MCP). Facts only — interpretation is left to the AI.
```

设计说明：前半中文含六大术数全名（中文用户在 GitHub 搜「八字/紫微斗数」等即命中描述字段）；后半英文含 MCP 与差异化定位；「六术全名」是描述里信息密度最高的搜索锚点。若想兼顾日文搜索，可加「四柱推命」四字（置于中文段括号内）。

粘贴位置：仓库页右上 About 区齿轮（⚙）→ Description；或 API：
`gh api -X PATCH /repos/ChesterRa/mingpan -d '{"description": "...上文案..."}'`

### 其他

- [ ] GitHub 默认展示语言设为 English（Settings → General → Repository default language）
