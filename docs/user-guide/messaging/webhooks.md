---
title: "Webhooks"
---
# Webhooks

接收来自外部服务（GitHub、GitLab、JIRA、Stripe 等）的事件，并自动触发 Hermes Agent 运行。Webhook 适配器运行一个 HTTP 服务器，接受 POST 请求、验证 HMAC 签名、将负载映射为智能体提示词，并将响应路由回来源或另一个已配置的平台。

智能体处理事件后，可通过在 PR 上发布评论、向 Telegram/Discord 发送消息或记录结果来进行响应。

---

## 快速开始

1. 通过 `hermes gateway setup` 或环境变量启用
2. 在 `config.yaml` 中定义路由，**或**使用 `hermes webhook subscribe` 动态创建路由
3. 将你的服务指向 `http://your-server:8644/webhooks/`

---

## 设置

有两种方式可以启用 Webhook 适配器。

### 通过安装向导

```bash
hermes gateway setup
```

按照提示启用 webhook、设置端口和全局 HMAC 密钥。

### 通过环境变量

添加到 `~/.hermes/.env`：

```bash
WEBHOOK_ENABLED=true
WEBHOOK_PORT=8644        # 默认值
WEBHOOK_SECRET=your-global-secret
```

### 验证服务器

网关运行后：

```bash
curl http://localhost:8644/health
```

预期响应：

```json
{"status": "ok", "platform": "webhook"}
```

---

## 配置路由 {#configuring-routes}

路由定义了如何处理不同 webhook 来源。每条路由是 `config.yaml` 中 `platforms.webhook.extra.routes` 下的一个命名条目。

### 路由属性

| 属性 | 是否必填 | 描述 |
|----------|----------|-------------|
| `events` | 否 | 要接受的事件类型列表（例如 `["pull_request"]`）。若为空，则接受所有事件。事件类型从负载中的 `X-GitHub-Event`、`X-GitLab-Event` 或 `event_type` 读取。 |
| `secret` | **是** | 用于签名验证的 HMAC 密钥。若路由未单独设置密钥，则回退到全局 `secret`。仅用于测试时可设为 `"INSECURE_NO_AUTH"`（跳过验证）。 |
| `prompt` | 否 | 使用点号表示法访问负载字段的模板字符串（例如 `{pull_request.title}`）。若省略，则将完整 JSON 负载转储到提示词中。 |
| `skills` | 否 | 为智能体运行加载的技能名称列表。 |
| `deliver` | 否 | 响应发送目标：`github_comment`、`telegram`、`discord`、`slack`、`signal`、`matrix`、`mattermost`、`email`、`sms`、`dingtalk`、`feishu`、`wecom` 或 `log`（默认）。 |
| `deliver_extra` | 否 | 额外的投递配置——键取决于 `deliver` 类型（例如 `repo`、`pr_number`、`chat_id`）。值支持与 `prompt` 相同的 `{dot.notation}` 模板语法。 |

### 完整示例

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644
      secret: "global-fallback-secret"
      routes:
        github-pr:
          events: ["pull_request"]
          secret: "github-webhook-secret"
          prompt: |
            Review this pull request:
            Repository: {repository.full_name}
            PR #{number}: {pull_request.title}
            Author: {pull_request.user.login}
            URL: {pull_request.html_url}
            Diff URL: {pull_request.diff_url}
            Action: {action}
          skills: ["github-code-review"]
          deliver: "github_comment"
          deliver_extra:
            repo: "{repository.full_name}"
            pr_number: "{number}"
        deploy-notify:
          events: ["push"]
          secret: "deploy-secret"
          prompt: "New push to {repository.full_name} branch {ref}: {head_commit.message}"
          deliver: "telegram"
```

### 提示词模板

提示词使用点号表示法访问 webhook 负载中的嵌套字段：

- `{pull_request.title}` 解析为 `payload["pull_request"]["title"]`
- `{repository.full_name}` 解析为 `payload["repository"]["full_name"]`
- `{__raw__}` — 特殊标记，将**完整负载**以缩进 JSON 形式转储（截断至 4000 个字符）。适用于监控告警或通用 webhook，此时智能体需要完整上下文。
- 缺失的键保留为字面量 `{key}` 字符串（不报错）
- 嵌套字典和列表会被 JSON 序列化并截断至 2000 个字符

你可以将 `{__raw__}` 与常规模板变量混合使用：

```yaml
prompt: "PR #{pull_request.number} by {pull_request.user.login}: {__raw__}"
```

若路由未配置 `prompt` 模板，整个负载将以缩进 JSON 形式转储（截断至 4000 个字符）。

`deliver_extra` 的值中同样支持点号表示法模板。

### 论坛话题投递

向 Telegram 投递 webhook 响应时，可通过在 `deliver_extra` 中包含 `message_thread_id`（或 `thread_id`）来定向到特定论坛话题：

```yaml
webhooks:
  routes:
    alerts:
      events: ["alert"]
      prompt: "Alert: {__raw__}"
      deliver: "telegram"
      deliver_extra:
        chat_id: "-1001234567890"
        message_thread_id: "42"
```

若 `deliver_extra` 中未提供 `chat_id`，投递将回退到目标平台配置的默认频道。

---

## GitHub PR 审查（分步指南） {#github-pr-review}

本指南演示如何对每个 Pull Request 自动进行代码审查。

### 1. 在 GitHub 中创建 Webhook

1. 前往你的仓库 → **Settings** → **Webhooks** → **Add webhook**
2. 将 **Payload URL** 设置为 `http://your-server:8644/webhooks/github-pr`
3. 将 **Content type** 设置为 `application/json`
4. 将 **Secret** 设置为与路由配置匹配的值（例如 `github-webhook-secret`）
5. 在 **Which events?** 下，选择 **Let me select individual events** 并勾选 **Pull requests**
6. 点击 **Add webhook**

### 2. 添加路由配置

按照上述示例，将 `github-pr` 路由添加到 `~/.hermes/config.yaml`。

### 3. 确保 `gh` CLI 已完成认证

`github_comment` 投递类型使用 GitHub CLI 发布评论：

```bash
gh auth login
```

### 4. 测试

在仓库中发起 Pull Request。webhook 触发后，Hermes 处理事件并在 PR 上发布审查评论。

---

## GitLab Webhook 设置 {#gitlab-webhook-setup}

GitLab webhook 的工作方式类似，但使用不同的认证机制。GitLab 以纯文本 `X-Gitlab-Token` 请求头发送密钥（精确字符串匹配，而非 HMAC）。

### 1. 在 GitLab 中创建 Webhook

1. 前往你的项目 → **Settings** → **Webhooks**
2. 将 **URL** 设置为 `http://your-server:8644/webhooks/gitlab-mr`
3. 输入你的 **Secret token**
4. 选择 **Merge request events**（以及其他你需要的事件）
5. 点击 **Add webhook**

### 2. 添加路由配置

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      routes:
        gitlab-mr:
          events: ["merge_request"]
          secret: "your-gitlab-secret-token"
          prompt: |
            Review this merge request:
            Project: {project.path_with_namespace}
            MR !{object_attributes.iid}: {object_attributes.title}
            Author: {object_attributes.last_commit.author.name}
            URL: {object_attributes.url}
            Action: {object_attributes.action}
          deliver: "log"
```

---

## 投递选项 {#delivery-options}

`deliver` 字段控制智能体处理 webhook 事件后响应的发送目标。

| 投递类型 | 描述 |
|-------------|-------------|
| `log` | 将响应记录到网关日志输出。这是默认值，适用于测试。 |
| `github_comment` | 通过 `gh` CLI 将响应作为 PR/Issue 评论发布。需要 `deliver_extra.repo` 和 `deliver_extra.pr_number`。网关主机上必须安装 `gh` 并完成认证（`gh auth login`）。 |
| `telegram` | 将响应路由到 Telegram。使用默认频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `discord` | 将响应路由到 Discord。使用默认频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `slack` | 将响应路由到 Slack。使用默认频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `signal` | 将响应路由到 Signal。使用默认频道，或在 `deliver_extra` 中指定 `chat_id`。 |
| `sms` | 通过 Twilio 将响应路由到 SMS。使用默认频道，或在 `deliver_extra` 中指定 `chat_id`。 |

对于跨平台投递（telegram、discord、slack、signal、sms），目标平台必须在网关中启用并连接。若 `deliver_extra` 中未提供 `chat_id`，响应将发送到该平台配置的默认频道。

---

## 动态订阅（CLI） {#dynamic-subscriptions}

除了 `config.yaml` 中的静态路由，你还可以使用 `hermes webhook` CLI 命令动态创建 webhook 订阅。当智能体本身需要设置事件驱动触发器时，这一功能尤为实用。

### 创建订阅

```bash
hermes webhook subscribe github-issues \
  --events "issues" \
  --prompt "New issue #{issue.number}: {issue.title}\nBy: {issue.user.login}\n\n{issue.body}" \
  --deliver telegram \
  --deliver-chat-id "-100123456789" \
  --description "Triage new GitHub issues"
```

此命令返回 webhook URL 和一个自动生成的 HMAC 密钥。将你的服务配置为向该 URL 发送 POST 请求。

### 列出订阅

```bash
hermes webhook list
```

### 删除订阅

```bash
hermes webhook remove github-issues
```

### 测试订阅

```bash
hermes webhook test github-issues
hermes webhook test github-issues --payload '{"issue": {"number": 42, "title": "Test"}}'
```

### 动态订阅的工作原理

- 订阅存储在 `~/.hermes/webhook_subscriptions.json`
- Webhook 适配器在每次收到请求时热重载此文件（基于 mtime 检测，开销可忽略不计）
- `config.yaml` 中的静态路由始终优先于同名的动态订阅
- 动态订阅使用与静态路由相同的格式和能力（事件、提示词模板、技能、投递）
- 无需重启网关——订阅后立即生效

### 智能体驱动的订阅

智能体可在 `webhook-subscriptions` 技能的引导下，通过终端工具创建订阅。向智能体请求"为 GitHub Issues 设置 webhook"，它将运行相应的 `hermes webhook subscribe` 命令。

---

## 安全性 {#security}

Webhook 适配器包含多层安全防护：

### HMAC 签名验证

适配器根据来源，使用对应的方式验证传入 webhook 的签名：

- **GitHub**：`X-Hub-Signature-256` 请求头——前缀为 `sha256=` 的 HMAC-SHA256 十六进制摘要
- **GitLab**：`X-Gitlab-Token` 请求头——纯密钥字符串匹配
- **通用**：`X-Webhook-Signature` 请求头——原始 HMAC-SHA256 十六进制摘要

若已配置密钥但请求中不存在可识别的签名请求头，则该请求将被拒绝。

### 必须设置密钥

每条路由都必须设置密钥——直接在路由上设置，或从全局 `secret` 继承。没有密钥的路由会导致适配器启动时因错误而终止。仅用于开发/测试时，可将密钥设为 `"INSECURE_NO_AUTH"` 以完全跳过验证。

### 速率限制

每条路由默认限制为每分钟 **30 个请求**（固定窗口）。可全局配置：

```yaml
platforms:
  webhook:
    extra:
      rate_limit: 60  # 每分钟请求数
```

超出限制的请求将收到 `429 Too Many Requests` 响应。

### 幂等性

投递 ID（来自 `X-GitHub-Delivery`、`X-Request-ID` 或时间戳回退）会被缓存 **1 小时**。重复投递（例如 webhook 重试）会被静默跳过并返回 `200` 响应，从而防止重复触发智能体运行。

### 请求体大小限制

超过 **1 MB** 的负载在读取请求体前即被拒绝。可通过以下配置修改：

```yaml
platforms:
  webhook:
    extra:
      max_body_bytes: 2097152  # 2 MB
```

### 提示词注入风险

:::caution
Webhook 负载包含攻击者可控的数据——PR 标题、提交信息、Issue 描述等均可能包含恶意指令。向互联网暴露时，请在沙盒环境（Docker、VM）中运行网关。建议使用 Docker 或 SSH 终端后端进行隔离。
:::

---

## 故障排除 {#troubleshooting}

### Webhook 未到达

- 验证端口是否已暴露并可从 webhook 来源访问
- 检查防火墙规则——端口 `8644`（或你配置的端口）必须开放
- 验证 URL 路径是否匹配：`http://your-server:8644/webhooks/`
- 使用 `/health` 端点确认服务器正在运行

### 签名验证失败

- 确保路由配置中的密钥与 webhook 来源中配置的密钥完全一致
- 对于 GitHub，密钥基于 HMAC——检查 `X-Hub-Signature-256`
- 对于 GitLab，密钥是纯文本匹配——检查 `X-Gitlab-Token`
- 检查网关日志中的 `Invalid signature` 警告

### 事件被忽略

- 检查事件类型是否在路由的 `events` 列表中
- GitHub 事件使用 `pull_request`、`push`、`issues` 等值（`X-GitHub-Event` 请求头的值）
- GitLab 事件使用 `merge_request`、`push` 等值（`X-GitLab-Event` 请求头的值）
- 若 `events` 为空或未设置，则接受所有事件

### 智能体未响应

- 在前台运行网关以查看日志：`hermes gateway run`
- 检查提示词模板是否正确渲染
- 验证投递目标已配置并已连接

### 重复响应

- 幂等性缓存应能防止此问题——检查 webhook 来源是否发送了投递 ID 请求头（`X-GitHub-Delivery` 或 `X-Request-ID`）
- 投递 ID 缓存 1 小时

### `gh` CLI 错误（GitHub 评论投递）

- 在网关主机上运行 `gh auth login`
- 确保已认证的 GitHub 用户对仓库有写入权限
- 检查 `gh` 是否已安装并在 PATH 中

---

## 环境变量 {#environment-variables}

| 变量 | 描述 | 默认值 |
|----------|-------------|---------|
| `WEBHOOK_ENABLED` | 启用 webhook 平台适配器 | `false` |
| `WEBHOOK_PORT` | 接收 webhook 的 HTTP 服务器端口 | `8644` |
| `WEBHOOK_SECRET` | 全局 HMAC 密钥（当路由未指定自己的密钥时作为回退） | （无） |
