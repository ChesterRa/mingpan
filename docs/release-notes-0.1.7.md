# v0.1.7

官方托管服务版：Mingpan 仍保持 `0.1.x` 阶段，本次不扩大命理解释范围，重点是让开源计算引擎拥有一个可直接使用、可持续发布的官方入口。

## 用户可见变化

- 开源项目网站：`https://mingpan.bzwai.com`
- Remote MCP：`https://mingpan.bzwai.com/mcp`
- 四种网站语言：繁体中文、简体中文、English、日本語
- 无需安装 Node.js 或自行部署；在支持 Remote MCP / Streamable HTTP 的 AI 客户端添加一个端点即可

## 部署与稳定性

- 开源项目网站静态资产、`/mcp` 与 `/healthz` 由同一个 Cloudflare Worker 版本发布
- 生产 tag 与 `package.json` 版本不一致时停止发布
- 所有生产部署使用同一个 concurrency group 串行执行，避免旧 tag 覆盖新版本
- 部署后使用 MCP v2 官方客户端完成协议协商、`tools/list` 与一次真实紫微排盘，不再依赖无法覆盖新版请求头的裸 JSON 请求
- CORS 明确允许 MCP 2026-07-28 所需的 `Mcp-Method` 与 `Mcp-Name`

## 产品边界

- Mingpan 仓库负责 `mingpan.bzwai.com` 开源项目网站及 MCP 服务
- BaziWei 官网只负责父品牌背书与导流，不维护第二套 Mingpan 页面
- Mingpan 只输出确定性排盘事实，具体解释继续由接入它的 AI 完成

## 验证

- 300 项自动化测试
- UTC 与本地时区双轮回归
- Cloudflare Worker dry-run
- 四语言、桌面／平板／移动端无横向溢出与浏览器控制台错误
