---
title: "Slack 配置"
---
# Slack 配置

使用 Socket Mode 将 Hermes Agent 以机器人身份接入 Slack。Socket Mode 使用 WebSocket 而非公共 HTTP 端点，因此你的 Hermes 实例无需公开访问——它可以在防火墙后面、你的笔记本电脑上或私有服务器上正常运行。

:::caution
经典 Slack 应用已弃用
使用 RTM API 的经典 Slack 应用已于 **2025 年 3 月完全弃用**。Hermes 使用基于 Socket Mode 的现代 Bolt SDK。如果你有旧版经典应用，必须按照以下步骤创建新应用。
:::

## 概览

| 组件 | 值 |
|-----------|-------|
| **库** | `slack-bolt` / `slack_sdk`（Python，Socket Mode）|
| **连接方式** | WebSocket——无需公共 URL |
| **所需 Token** | Bot Token（`xoxb-`）+ 应用级别 Token（`xapp-`）|
| **用户识别** | Slack Member ID（如 `U01ABC2DEF3`）|

---

## 步骤 1：创建 Slack 应用

1. 访问 [https://api.slack.com/apps](https://api.slack.com/apps)
2. 点击 **Create New App**
3. 选择 **From scratch**
4. 输入应用名称（如"Hermes Agent"）并选择你的工作区
5. 点击 **Create App**

你将进入应用的 **Basic Information** 页面。

---

## 步骤 2：配置 Bot Token 权限范围

在侧边栏中进入 **Features → OAuth & Permissions**，滚动到 **Scopes → Bot Token Scopes**，添加以下权限范围：

| 权限范围 | 用途 |
|-------|---------|
| `chat:write` | 以机器人身份发送消息 |
| `app_mentions:read` | 检测频道中的 @ 提及 |
| `channels:history` | 读取机器人所在公共频道的消息 |
| `channels:read` | 列出并获取公共频道信息 |
| `groups:history` | 读取机器人受邀私有频道的消息 |
| `im:history` | 读取私信历史记录 |
| `im:read` | 查看基本私信信息 |
| `im:write` | 发起和管理私信 |
| `users:read` | 查找用户信息 |
| `files:write` | 上传文件（图片、音频、文档）|

:::caution
缺少权限范围 = 功能缺失
没有 `channels:history` 和 `groups:history`，机器人**将无法接收频道消息**——它只能在私信中工作。这是最容易被遗漏的权限范围。
:::

**可选权限范围：**

| 权限范围 | 用途 |
|-------|---------|
| `groups:read` | 列出并获取私有频道信息 |

---

## 步骤 3：启用 Socket Mode

Socket Mode 允许机器人通过 WebSocket 连接，无需公共 URL。

1. 在侧边栏中进入 **Settings → Socket Mode**
2. 将 **Enable Socket Mode** 切换为开启
3. 系统会提示你创建一个**应用级别 Token**：
   - 将其命名为类似 `hermes-socket` 的名称（名称不重要）
   - 添加 **`connections:write`** 权限范围
   - 点击 **Generate**
4. **复制该 token**——它以 `xapp-` 开头。这是你的 `SLACK_APP_TOKEN`

:::tip
你可以随时在 **Settings → Basic Information → App-Level Tokens** 下找到或重新生成应用级别 token。
:::

---

## 步骤 4：订阅事件

此步骤至关重要——它控制机器人可以接收哪些消息。

1. 在侧边栏中进入 **Features → Event Subscriptions**
2. 将 **Enable Events** 切换为开启
3. 展开 **Subscribe to bot events** 并添加：

| 事件 | 是否必须 | 用途 |
|-------|-----------|---------|
| `message.im` | **是** | 机器人接收私信 |
| `message.channels` | **是** | 机器人接收所在**公共**频道的消息 |
| `message.groups` | **建议** | 机器人接收受邀**私有**频道的消息 |
| `app_mention` | **是** | 防止机器人被 @ 提及时出现 Bolt SDK 错误 |

4. 点击页面底部的 **Save Changes**

> 🚫 **危险**：缺少事件订阅是第一大配置问题
> 如果机器人在私信中正常工作但**无法在频道中响应**，几乎可以确定是忘记添加了 `message.channels`（公共频道）和/或 `message.groups`（私有频道）。没有这些事件，Slack 将不会向机器人推送频道消息。

---

## 步骤 5：启用 Messages Tab

此步骤允许用户直接私信机器人。没有此步骤，用户尝试私信机器人时会看到 **"Sending messages to this app has been turned off"** 的提示。

1. 在侧边栏中进入 **Features → App Home**
2. 滚动到 **Show Tabs**
3. 将 **Messages Tab** 切换为开启
4. 勾选 **"Allow users to send Slash commands and messages from the messages tab"**

> 🚫 **危险**：没有此步骤，私信将被完全阻止
> 即使配置了所有正确的权限范围和事件订阅，如果未启用 Messages Tab，Slack 也不允许用户向机器人发送私信。这是 Slack 平台的要求，而非 Hermes 配置问题。

---

## 步骤 6：将应用安装到工作区

1. 在侧边栏中进入 **Settings → Install App**
2. 点击 **Install to Workspace**
3. 检查权限后点击 **Allow**
4. 授权完成后，你将看到以 `xoxb-` 开头的 **Bot User OAuth Token**
5. **复制该 token**——这是你的 `SLACK_BOT_TOKEN`

:::tip
如果之后修改了权限范围或事件订阅，你**必须重新安装应用**更改才能生效。Install App 页面会显示提示横幅。
:::

---

## 步骤 7：查找用于许可名单的用户 ID

Hermes 使用 Slack **Member ID**（而非用户名或显示名称）作为许可名单。

查找 Member ID 的方法：

1. 在 Slack 中，点击用户的名字或头像
2. 点击 **View full profile**
3. 点击 **⋮**（更多）按钮
4. 选择 **Copy member ID**

Member ID 格式如 `U01ABC2DEF3`。你至少需要填入自己的 Member ID。

---

## 步骤 8：配置 Hermes

将以下内容添加到你的 `~/.hermes/.env` 文件：

```bash
# 必填
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_ALLOWED_USERS=U01ABC2DEF3              # 逗号分隔的 Member ID 列表

# 可选
SLACK_HOME_CHANNEL=C01234567890              # 定时/计划消息的默认频道
SLACK_HOME_CHANNEL_NAME=general              # 主频道的可读名称（可选）
```

或者运行交互式配置：

```bash
hermes gateway setup    # 提示时选择 Slack
```

然后启动 gateway：

```bash
hermes gateway              # 前台运行
hermes gateway install      # 安装为用户服务
sudo hermes gateway install --system   # 仅 Linux：开机自启系统服务
```

---

## 步骤 9：邀请机器人进入频道

启动 gateway 后，你需要**邀请机器人**进入想让它响应的频道：

```
/invite @Hermes Agent
```

机器人**不会**自动加入频道，你必须逐个频道邀请它。

---

## 机器人的响应方式

了解 Hermes 在不同场景下的行为：

| 场景 | 行为 |
|---------|----------|
| **私信** | 机器人响应每条消息——无需 @ 提及 |
| **频道** | 机器人**仅在被 @ 提及时响应**（如 `@Hermes Agent 现在几点？`）。在频道中，Hermes 以线程方式回复该消息。|
| **线程** | 如果你在现有线程中 @ 提及 Hermes，它将在该线程中回复。一旦机器人在线程中建立了活跃会话，**后续回复无需 @ 提及**——机器人会自然跟进对话。|

:::tip
在频道中，始终先 @ 提及机器人来开始对话。一旦机器人在线程中活跃，你可以直接在线程中回复而无需再次提及。在线程外，不带 @ 的消息会被忽略，以避免在繁忙频道中造成干扰。
:::

---

## 配置选项

除步骤 8 中的必填环境变量外，你还可以通过 `~/.hermes/config.yaml` 自定义 Slack 机器人的行为。

### 线程与回复行为

```yaml
platforms:
  slack:
    # 控制多部分响应的线程方式
    # "off"   — 从不将回复线程化到原始消息
    # "first" — 第一个分块线程化到用户消息（默认）
    # "all"   — 所有分块线程化到用户消息
    reply_to_mode: "first"

    extra:
      # 是否在线程中回复（默认：true）
      # 为 false 时，频道消息会直接回复到频道，而非线程
      # 现有线程中的消息仍在线程中回复
      reply_in_thread: true

      # 将线程回复同时发送到主频道
      # （Slack 的"同时发送到频道"功能）
      # 仅广播第一条回复的第一个分块
      reply_broadcast: false
```

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `platforms.slack.reply_to_mode` | `"first"` | 多部分消息的线程模式：`"off"`、`"first"` 或 `"all"` |
| `platforms.slack.extra.reply_in_thread` | `true` | 为 `false` 时，频道消息直接回复而非线程。现有线程中的消息仍在线程中回复。|
| `platforms.slack.extra.reply_broadcast` | `false` | 为 `true` 时，线程回复同时发布到主频道，仅广播第一个分块。|

### 会话隔离

```yaml
# 全局设置——适用于 Slack 及所有其他平台
group_sessions_per_user: true
```

为 `true`（默认值）时，共享频道中的每个用户都有自己独立的对话会话。两人同时在 `#general` 中与 Hermes 交流时，各自拥有独立的历史记录和上下文。

设为 `false` 可启用协作模式，整个频道共享一个对话会话。请注意，这意味着用户共享上下文增长和 token 消耗，且任意用户执行 `/reset` 都会清除所有人的会话。

### 提及与触发行为

```yaml
slack:
  # 在频道中要求 @ 提及（这是默认行为；
  # Slack 适配器会强制执行频道中的 @ 提及限制，
  # 但你可以显式设置以与其他平台保持一致）
  require_mention: true

  # 触发机器人的自定义提及模式
  # （除默认 @ 提及检测外的附加模式）
  mention_patterns:
    - "hey hermes"
    - "hermes,"

  # 在每条发出消息前添加的文字前缀
  reply_prefix: ""
```

:::info
与 Discord 和 Telegram 不同，Slack 没有 `free_response_channels` 的对应功能。Slack 适配器要求在频道中通过 `@mention` 开始对话。一旦机器人在线程中建立了活跃会话，后续的线程回复无需提及。在私信中，机器人始终响应，无需提及。
:::

### 未授权用户处理

```yaml
slack:
  # 未授权用户（不在 SLACK_ALLOWED_USERS 中）私信机器人时的处理方式
  # "pair"   — 提示输入配对码（默认）
  # "ignore" — 静默丢弃消息
  unauthorized_dm_behavior: "pair"
```

也可以为所有平台设置全局配置：

```yaml
unauthorized_dm_behavior: "pair"
```

`slack:` 下的平台特定设置优先于全局设置。

### 语音转录

```yaml
# 全局设置——启用/禁用自动转录传入语音消息
stt_enabled: true
```

为 `true`（默认值）时，传入的音频消息会在智能体处理前，使用已配置的 STT 提供商自动转录。

### 完整示例

```yaml
# 全局 gateway 设置
group_sessions_per_user: true
unauthorized_dm_behavior: "pair"
stt_enabled: true

# Slack 特定设置
slack:
  require_mention: true
  unauthorized_dm_behavior: "pair"

# 平台配置
platforms:
  slack:
    reply_to_mode: "first"
    extra:
      reply_in_thread: true
      reply_broadcast: false
```

---

## 主频道

将 `SLACK_HOME_CHANNEL` 设置为一个频道 ID，Hermes 将在该频道发送定时消息、定时任务结果及其他主动通知。查找频道 ID 的方法：

1. 在 Slack 中右键点击频道名称
2. 点击 **View channel details**
3. 滚动到底部——频道 ID 显示在那里

```bash
SLACK_HOME_CHANNEL=C01234567890
```

确保机器人已**被邀请进入该频道**（`/invite @Hermes Agent`）。

---

## 多工作区支持

Hermes 可以使用单个 gateway 实例同时连接**多个 Slack 工作区**。每个工作区使用其自己的机器人用户 ID 独立进行身份验证。

### 配置

在 `SLACK_BOT_TOKEN` 中以**逗号分隔列表**形式提供多个 Bot Token：

```bash
# 多个 Bot Token——每个工作区一个
SLACK_BOT_TOKEN=xoxb-workspace1-token,xoxb-workspace2-token,xoxb-workspace3-token

# Socket Mode 仍使用单个应用级别 token
SLACK_APP_TOKEN=xapp-your-app-token
```

或在 `~/.hermes/config.yaml` 中配置：

```yaml
platforms:
  slack:
    token: "xoxb-workspace1-token,xoxb-workspace2-token"
```

### OAuth Token 文件

除环境变量或配置中的 token 外，Hermes 还会从以下路径的 **OAuth token 文件**中加载 token：

```
~/.hermes/slack_tokens.json
```

该文件是一个将团队 ID 映射到 token 条目的 JSON 对象：

```json
{
  "T01ABC2DEF3": {
    "token": "xoxb-workspace-token-here",
    "team_name": "My Workspace"
  }
}
```

此文件中的 token 与通过 `SLACK_BOT_TOKEN` 指定的 token 合并，重复 token 会自动去重。

### 工作原理

- 列表中的**第一个 token** 是主 token，用于 Socket Mode 连接（AsyncApp）。
- 每个 token 在启动时通过 `auth.test` 进行身份验证。Gateway 将每个 `team_id` 映射到其自己的 `WebClient` 和 `bot_user_id`。
- 消息到达时，Hermes 使用对应工作区的专用客户端进行响应。
- 主 `bot_user_id`（来自第一个 token）用于向后兼容期望单一机器人身份的功能。

---

## 语音消息

Hermes 在 Slack 上支持语音功能：

- **接收：** 语音/音频消息使用已配置的 STT 提供商自动转录：本地 `faster-whisper`、Groq Whisper（`GROQ_API_KEY`）或 OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）
- **发送：** TTS 响应以音频文件附件形式发送

---

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| 机器人不响应私信 | 验证 `message.im` 已在事件订阅中，且应用已重新安装 |
| 机器人在私信中正常但不响应频道消息 | **最常见问题。** 将 `message.channels` 和 `message.groups` 添加到事件订阅，重新安装应用，并用 `/invite @Hermes Agent` 邀请机器人进入频道 |
| 机器人不响应频道中的 @ 提及 | 1) 检查是否已订阅 `message.channels` 事件。2) 机器人必须被邀请进入频道。3) 确保已添加 `channels:history` 权限范围。4) 修改权限范围/事件后重新安装应用 |
| 机器人忽略私有频道消息 | 添加 `message.groups` 事件订阅和 `groups:history` 权限范围，重新安装应用并用 `/invite` 邀请机器人 |
| 私信时显示"Sending messages to this app has been turned off" | 在 App Home 设置中启用 **Messages Tab**（见步骤 5）|
| 出现"not_authed"或"invalid_auth"错误 | 重新生成 Bot Token 和 App Token，更新 `.env` |
| 机器人可以响应但无法在频道中发帖 | 用 `/invite @Hermes Agent` 邀请机器人进入频道 |
| 出现"missing_scope"错误 | 在 OAuth & Permissions 中添加所需权限范围，然后**重新安装**应用 |
| Socket 频繁断开 | 检查网络连接；Bolt 会自动重连，但网络不稳定会导致延迟 |
| 修改了权限范围/事件但无变化 | 修改任何权限范围或事件订阅后，你**必须重新安装**应用到工作区 |

### 快速检查清单

如果机器人在频道中无法工作，请验证以下**全部**内容：

1. ✅ 已订阅 `message.channels` 事件（公共频道）
2. ✅ 已订阅 `message.groups` 事件（私有频道）
3. ✅ 已订阅 `app_mention` 事件
4. ✅ 已添加 `channels:history` 权限范围（公共频道）
5. ✅ 已添加 `groups:history` 权限范围（私有频道）
6. ✅ 添加权限范围/事件后已**重新安装**应用
7. ✅ 已**邀请**机器人进入频道（`/invite @Hermes Agent`）
8. ✅ 你的消息中已 **@ 提及**机器人

---

## 安全

:::caution
**始终设置 `SLACK_ALLOWED_USERS`**，填入已授权用户的 Member ID。没有此设置，gateway 默认会**拒绝所有消息**以确保安全。永远不要分享你的 Bot Token——像对待密码一样保管它们。
:::

- Token 应存储在 `~/.hermes/.env` 中（文件权限 `600`）
- 定期通过 Slack 应用设置轮换 token
- 审计谁有权访问你的 Hermes 配置目录
- Socket Mode 意味着不暴露公共端点——减少了一个攻击面
