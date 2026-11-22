# v0.1.10

本次让 npm 包与官方 Worker 使用同一组锁定的运行依赖，并修正紫微星曜亮度与流月日期显示。

## 本地与官方服务的计算一致性

- npm 包内置运行依赖（`bundleDependencies`）：按 Worker 构建使用的同一份 `package-lock.json` 安装后随包发布。使用 `npx mingpan@0.1.10` 时，npm 直接使用包内的依赖，不再向注册表另行解析，排盘依赖与 0.1.10 Worker 的版本相同。已用 npm 10、11、12 全新安装验证，所装依赖均来自包内。
- 发布工作流从实际 tarball 全新安装，检查文件清单，确认依赖全部来自包内、版本与锁一致，再用安装后的可执行入口对照 18 个工具在 UTC、东京及纽约时区的输出。发布物即为通过验证的 tarball。

## 紫微斗数

- 更新 `iztro` 至 2.6.5。酉宫的太阴由“不”修正为“旺”，七杀由“庙”修正为“旺”，太阳由“陷”修正为“平”。旧盘的酉宫若有这三颗星之一，建议重新排盘并核对亮度。[iztro v2.6.1 修正说明](https://github.com/SylarLong/iztro/releases/tag/v2.6.1)
- 修正本地 `ziwei_liuyue` 在东京等 UTC 正时区把公历日期范围提前一天的问题。以 2030 年农历正月为例，正确范围为 2030-02-03 至 2030-03-03，这个范围现在与 UTC 环境的结果一致。

## 工具输出与 MCP Registry

- 中文排盘与历法结果统一使用繁体标签，八字与紫微的命主资料共用同一份农历生日格式。奇门的 `panType`、`panStyle` 与 `shiLei` 同时接受简体及繁体写法，例如 `時盤`／`时盘`、`轉盤`／`转盘`、`求財`／`求财`。
- 包的 MCP Registry 名称为 `io.github.ChesterRa/mingpan`。`server.json` 包含 npm stdio 包与官方 Streamable HTTP 端点 `https://mingpan.bzwai.com/mcp`。
