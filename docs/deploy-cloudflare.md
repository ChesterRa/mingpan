# Mingpan 开源项目网站与托管 MCP 上线手册

> 受众：Mingpan / BaziWei 维护者。终端用户不需要阅读本手册，也不需要
> Cloudflare 账号、Node.js 或自行部署服务。

## 服务边界

- 开源项目网站：`https://mingpan.bzwai.com`
- 公开端点：`https://mingpan.bzwai.com/mcp`
- 健康检查：`https://mingpan.bzwai.com/healthz`
- 网站静态资产、MCP 与健康检查由本仓库的同一个 Worker 版本发布；BaziWei
  仓库只保留父品牌导流，不维护第二套 Mingpan 官网
- `workers.dev` 只用于维护者诊断，不出现在用户文档或官网入口中
- 计算层无数据库、Redis、BaziWei 登录态或 AI API Key 依赖
- 服务无状态运行，不建立命盘数据库，不缓存或记录出生参数与命盘结果

## 平台前提

生产账号需启用 Cloudflare Workers Paid。排盘属于 CPU 型工作负载，本机热
运行基线中 `bazi_basic` 约 32ms、`ziwei_basic` 约 184ms、
`qimen_basic` 约 8ms；Free 计划的单请求 CPU 上限不适合较重排盘。

仓库将单次 CPU 上限设为 1000ms，并通过请求体上限、来源限流与平台告警
控制异常消耗。平台与本机基线并不等价，正式上线仍必须看生产 Metrics。

## 首次上线（推荐走 CI）

1. 在 GitHub 仓库配置 `CLOUDFLARE_API_TOKEN` 与
   `CLOUDFLARE_ACCOUNT_ID`；Token 仅授予目标 Worker 与自定义域名所需权限。
2. 在本地完成本文的发布前验证，并确认 `package.json` 版本为 `0.1.7`。
3. 提交并推送代码后建立 `v0.1.7` tag。tag 会分别触发 npm 发布与 Worker
   发布；两个工作流都会先校验 tag 与 package 版本一致。
4. Worker 工作流会建立 `mingpan.bzwai.com` Custom Domain、发布项目站与
   `/mcp`，再以 MCP v2 官方客户端实调紫微工具。

`wrangler.toml` 的 Custom Domain 会由 Cloudflare 建立 DNS 记录和证书，不要
再手工建立指向 Worker 的 CNAME，也不要同时开启 Dashboard Git 自动部署。

## 本地手动部署（仅用于维护与救援）

```bash
npm ci
npm run check
npm run deploy:worker:dry-run
npx wrangler login
npm run deploy:worker
```

`wrangler.toml` 已声明 `mingpan.bzwai.com` 自定义域名。部署前确认目标账号有权
管理该域名；部署完成后依次验证正式域名与 `workers.dev` 诊断地址：

1. `/healthz` 返回成功；
2. MCP `initialize` 与 `tools/list` 成功；
3. 至少实调一次 `bazi_basic`、`ziwei_basic`、`qimen_basic`；
4. Cloudflare Metrics 无 `exceededCpu` / 1102，延迟与错误率可接受；
5. 日志中没有出生时间、姓名、经度或完整命盘。

仅健康检查成功不代表排盘链路可上线。

确认 Cloudflare 已完成 DNS 与证书配置，再验证：

```bash
curl --fail https://mingpan.bzwai.com/healthz
MCP_ENDPOINT=https://mingpan.bzwai.com/mcp npm run smoke:remote
```

同时确认项目网站四种语言入口、复制端点按钮与移动端布局正常。全部通过后，
才开放 BaziWei 官网入口。上线顺序必须是：Mingpan Worker → 远端实调与网站
验收 → BaziWei 官网导流。

## GitHub Actions

仓库的 `deploy-worker.yml` 仅在 `v*` tag 或手动触发时运行，不设定时任务。
配置以下仓库 secrets：

- `CLOUDFLARE_API_TOKEN`：仅授予目标 Worker 所需权限
- `CLOUDFLARE_ACCOUNT_ID`：生产 Cloudflare 账号 ID

工作流先校验版本、安装、构建四语言项目站、运行完整测试与 Worker dry-run，
部署后再检查部署域名与正式域名，并用 MCP v2 客户端完成协议协商、工具列表和
一次实际紫微排盘。生产部署使用固定 concurrency group 串行执行，避免多个 tag
互相覆盖。不要同时启用另一条自动部署入口，以免重复发布。

## 监控与告警

至少关注：

- 请求量、错误率、P50 / P95 延迟
- `exceededCpu` / 1102 与 Worker exceptions
- Rate Limiter 命中率
- Workers CPU 与请求用量预算

告警只包含请求 ID、工具名、状态和耗时，不得新增原始参数或命盘正文。

## 回滚

优先在 Cloudflare Workers 的 Deployments 页面选择上一稳定版本，或执行：

```bash
npx wrangler rollback
```

回滚后重新检查 `/healthz`、`tools/list` 与一次代表性排盘。若需暂时撤下公开
入口，先移除自定义域名路由；不要删除代码仓库或历史发布记录。
