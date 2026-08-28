# 0.1.4 发布说明（草稿）

> 发布方式：合并 main 后打 tag `v0.1.4` 触发 Release workflow（npm publish）。
> 本文件同时用作 GitHub Release 的正文素材。

## 一句话总结

面向正确性与产品定位的重构版：修复了八字年柱与奇门排盘两类历史性错排缺陷，输出全面收紧为「确定且权威且 AI 不易获知」的排盘量，解读层（五行力量/格局吉凶/用神评分等）交还 AI。

## ⚠️ 与 0.1.3 的不兼容变更（用户须知）

1. **八字：二月出生者结果可能变化** —— 年柱此前在「立春至春节」窗口（每年 2 月上中旬约两周）按春节换年错排，连带月干/大运顺逆出错；现按立春精确时刻换年。
2. **八字：晚子时（23:00-24:00）时柱变化** —— 改按次日干起五鼠遁（主流口径，与其它工具一致）。
3. **八字：提供 `longitude`（真太阳时）时四柱变化** —— 此前校正只作用于年/月柱而日/时柱仍按原始钟点（两套时间源混用），现四柱一律按校正后时刻排盘，输出附校正时刻说明行。
4. **奇门：时盘/日盘结果与旧版不同** —— 修复四类口径缺陷（详见 `docs/qimen-correctness-notes.md`）：拆补法符头、地盘宫数飞布、转盘刚体旋转、飞盘飞布；经 kinqimen 实跑交叉验证。
5. **工具移除**：`qimen_zeri`（择日评分属解读层，与定位冲突）。
6. **输出内容收紧**：bazi_basic 输出四柱纳音/天干藏干十神/十二长生自坐/命宫胎元/旬空/公农历（不再含五行力量等分析）；梅花去吉凶断语；奇门格局平列（不再分吉格/凶格）；奇门用神分析不再输出评分。

## 新增能力

- **大六壬时间起课**：直接输入公历时间即可排盘，节气/月将/干支自动推得（推荐用法；原显式参数保留为专家模式）
- 紫微排盘补齐五行局/命主/身主（确定性查表标配）
- 八字补齐命宫（三命通会子平起法）与胎元（渊海子平月干进一支进三）；修复真太阳时只校正年月柱的缺陷
- **多时区**：所有时间类工具支持 `timezone` 参数（IANA 名，默认北京时间）；输入侧精确处理历史夏令时（含 1986-1991 中国夏令时）
- MCP SDK 高级 API（registerTool）+ 工具按领域模块化；zod v4
- 修复 stdio 日志污染 JSON-RPC 流的问题（严格的客户端此前可能解析失败）

## 质量

- 测试 117 → 218：奇门金样本（含手工逐项推演盘）、八字权威用例（历史人物记载 + 立春分钟级边界）、紫微三路验证（适配层保真/四化口诀/安星法手推）、各工具输出契约、MCP 集成测试
- CI：Node 22/24 × 时区矩阵（上海/UTC/纽约）
- 代码净减约 5000 行（死代码分析器与择日模块移除）

## 分发材料（提交注册表用）

**MCP servers 目录提交简介（英文）**：

> **mingpan** — Chinese metaphysics chart calculator for AI agents: BaZi (Four Pillars), ZiWei Dou Shu, LiuYao, MeiHua YiShu, DaLiuRen, and QiMen DunJia (rotating & flying styles). Deterministic calendar/ganzhi computation only — interpretation is left to the AI. Solar-term-accurate (minute-level LiChun boundaries), timezone-aware, golden-tested against historical records.

**关键词**：mcp, bazi, ziwei, qimen, liuyao, meihua, daliuren, chinese-astrology, divination, model-context-protocol
