---
title: "SMS 配置（Twilio）"
---
# SMS 配置（Twilio）

Hermes Agent 通过 [Twilio](https://www.twilio.com/) API 接入 SMS 服务。用户向你的 Twilio 电话号码发送短信，即可获得 AI 回复——与 Telegram 或 Discord 上的对话体验如出一辙，只是通过标准短信渠道收发。

:::info
共享凭据
SMS 网关与可选的[电话技能](https://hermes-agent.nousresearch.com/docs/reference/skills-catalog)共享凭据。如果你已经为语音通话或单次 SMS 配置了 Twilio，网关可以直接使用相同的 `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN` 和 `TWILIO_PHONE_NUMBER`。
:::

---

## 前提条件

- **Twilio 账户** — [在 twilio.com 注册](https://www.twilio.com/try-twilio)（提供免费试用）
- **具备 SMS 功能的 Twilio 电话号码**
- **可公开访问的服务器** — 收到短信时，Twilio 会向你的服务器发送 Webhook 请求
- **aiohttp** — `pip install 'hermes-agent[sms]'`

---

## 第一步：获取 Twilio 凭据

1. 前往 [Twilio 控制台](https://console.twilio.com/)
2. 从控制台首页复制 **Account SID** 和 **Auth Token**
3. 前往 **Phone Numbers → Manage → Active Numbers**，记下 E.164 格式的电话号码（例如 `+15551234567`）

---

## 第二步：配置 Hermes Agent

### 交互式设置（推荐）

```bash
hermes gateway setup
```

从平台列表中选择 **SMS (Twilio)**，向导会提示你输入凭据。

### 手动设置

在 `~/.hermes/.env` 中添加：

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# 安全：限制允许的电话号码（推荐）
SMS_ALLOWED_USERS=+15559876543,+15551112222

# 可选：为定时任务设置默认频道
SMS_HOME_CHANNEL=+15559876543
```

---

## 第三步：配置 Twilio Webhook

Twilio 需要知道将入站消息发送至何处。在 [Twilio 控制台](https://console.twilio.com/) 中：

1. 前往 **Phone Numbers → Manage → Active Numbers**
2. 点击你的电话号码
3. 在 **Messaging → A MESSAGE COMES IN** 下，进行如下设置：
   - **Webhook**：`https://your-server:8080/webhooks/twilio`
   - **HTTP Method**：`POST`

:::tip
暴露 Webhook
如果你在本地运行 Hermes Agent，可以使用隧道工具将 Webhook 暴露到公网：

```bash
# 使用 cloudflared
cloudflared tunnel --url http://localhost:8080

# 使用 ngrok
ngrok http 8080
```

将生成的公网 URL 设置为 Twilio Webhook 地址。
:::

Webhook 端口默认为 `8080`，可通过以下方式覆盖：

```bash
SMS_WEBHOOK_PORT=3000
```

---

## 第四步：启动网关

```bash
hermes gateway
```

你应该看到：

```
[sms] Twilio webhook server listening on port 8080, from: +1555***4567
```

向你的 Twilio 号码发送短信，Hermes Agent 将通过 SMS 回复。

---

## 环境变量

| 变量 | 是否必填 | 说明 |
|------|---------|------|
| `TWILIO_ACCOUNT_SID` | 是 | Twilio Account SID（以 `AC` 开头） |
| `TWILIO_AUTH_TOKEN` | 是 | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | 是 | 你的 Twilio 电话号码（E.164 格式） |
| `SMS_WEBHOOK_PORT` | 否 | Webhook 监听端口（默认：`8080`） |
| `SMS_ALLOWED_USERS` | 否 | 允许发起对话的 E.164 格式电话号码，逗号分隔 |
| `SMS_ALLOW_ALL_USERS` | 否 | 设置为 `true` 允许任何人（不推荐） |
| `SMS_HOME_CHANNEL` | 否 | 用于定时任务/通知推送的电话号码 |
| `SMS_HOME_CHANNEL_NAME` | 否 | 默认频道显示名称（默认：`Home`） |

---

## SMS 特定行为

- **纯文本** — Markdown 会被自动剥除，因为 SMS 渠道会将其显示为原始文本
- **1600 字符限制** — 较长的回复将在自然边界（换行符，其次是空格）处拆分为多条消息
- **防回声** — 来自你自己 Twilio 号码的消息将被忽略，以避免消息循环
- **电话号码脱敏** — 日志中的电话号码会被脱敏处理以保护隐私

---

## 安全

**网关默认拒绝所有用户。** 请配置允许名单：

```bash
# 推荐：限制为特定电话号码
SMS_ALLOWED_USERS=+15559876543,+15551112222

# 或允许所有人（对具有终端访问权限的机器人不推荐）
SMS_ALLOW_ALL_USERS=true
```

:::caution
SMS 没有内置加密。除非你了解其安全影响，否则请勿通过 SMS 进行敏感操作。对于敏感场景，建议使用 Signal 或 Telegram。
:::

---

## 故障排查

### 消息未到达

1. 检查 Twilio Webhook URL 是否正确且可公开访问
2. 验证 `TWILIO_ACCOUNT_SID` 和 `TWILIO_AUTH_TOKEN` 是否正确
3. 检查 Twilio 控制台 → **Monitor → Logs → Messaging** 查看投递错误
4. 确认你的电话号码在 `SMS_ALLOWED_USERS` 中（或已设置 `SMS_ALLOW_ALL_USERS=true`）

### 回复未发送

1. 检查 `TWILIO_PHONE_NUMBER` 是否正确设置（E.164 格式，带 `+` 前缀）
2. 验证你的 Twilio 账户拥有支持 SMS 的号码
3. 检查 Hermes Agent 网关日志中的 Twilio API 错误

### Webhook 端口冲突

如果 8080 端口已被占用，请更改：

```bash
SMS_WEBHOOK_PORT=3001
```

在 Twilio 控制台中更新 Webhook URL 以匹配新端口。
