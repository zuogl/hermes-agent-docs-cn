---
title: "Telegram 配置"
---
# Telegram 配置

Hermes Agent 可与 Telegram 集成，作为功能齐全的对话机器人。连接后，您可以从任意设备与智能体聊天、发送自动转录的语音备忘录、接收定时任务的执行结果，以及在群组中使用智能体。该集成基于 [python-telegram-bot](https://python-telegram-bot.org/) 构建，支持文本、语音、图片和文件附件。

## 第一步：通过 BotFather 创建机器人

每个 Telegram 机器人都需要由 [@BotFather](https://t.me/BotFather)（Telegram 官方机器人管理工具）签发的 API token。

1. 打开 Telegram，搜索 **@BotFather**，或访问 [t.me/BotFather](https://t.me/BotFather)
2. 发送 `/newbot`
3. 选择一个**显示名称**（如 "Hermes Agent"）——可以是任何名称
4. 选择一个**用户名**——必须唯一且以 `bot` 结尾（如 `my_hermes_bot`）
5. BotFather 会回复您的 **API token**，格式如下：

```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
```

:::caution
请妥善保管您的 Bot token。任何持有此 token 的人都可以控制您的机器人。如果泄漏，请立即通过 BotFather 的 `/revoke` 命令撤销。
:::

## 第二步：自定义机器人（可选）

以下 BotFather 命令可改善用户体验。向 @BotFather 发送以下命令：

| 命令 | 用途 |
|---------|---------|
| `/setdescription` | 用户开始聊天前显示的"这个机器人能做什么？"说明文字 |
| `/setabouttext` | 机器人个人资料页面的简介文字 |
| `/setuserpic` | 为机器人上传头像 |
| `/setcommands` | 定义命令菜单（聊天界面中的 `/` 按钮）|
| `/setprivacy` | 控制机器人是否能看到所有群组消息（详见第三步）|

:::tip
`/setcommands` 推荐的起始命令集：

```
help - 显示帮助信息
new - 开始新对话
sethome - 将此聊天设为主频道
```
:::

## 第三步：隐私模式（群组使用的关键设置）

Telegram 机器人具有**隐私模式**，且该模式**默认开启**。这是在群组中使用机器人时最常见的困惑来源。

**开启隐私模式时**，机器人只能接收：
- 以 `/` 命令开头的消息
- 直接回复机器人消息的内容
- 服务消息（成员加入/退出、消息置顶等）
- 机器人作为管理员的频道消息

**关闭隐私模式时**，机器人可以接收群组中的所有消息。

### 如何关闭隐私模式

1. 向 **@BotFather** 发送消息
2. 发送 `/mybots`
3. 选择您的机器人
4. 进入 **Bot Settings → Group Privacy → Turn off**

:::caution
更改隐私设置后，**必须将机器人从所有群组中移除并重新添加**。Telegram 在机器人加入群组时会缓存隐私状态，移除并重新添加机器人后才会更新。
:::

:::tip
关闭隐私模式的替代方案：将机器人提升为**群组管理员**。管理员机器人无论隐私设置如何都能接收所有消息，且无需切换全局隐私模式。
:::

## 第四步：获取您的用户 ID

Hermes Agent 使用 Telegram 数字用户 ID 来控制访问权限。您的用户 ID 与用户名**不同**——它是一串数字，如 `123456789`。

**方法一（推荐）：** 向 [@userinfobot](https://t.me/userinfobot) 发送消息——它会立即回复您的用户 ID。

**方法二：** 向 [@get_id_bot](https://t.me/get_id_bot) 发送消息——同样可靠的方案。

请记下这个数字，下一步将会用到。

## 第五步：配置 Hermes

### 方案 A：交互式配置（推荐）

```bash
hermes gateway setup
```

按提示选择 **Telegram**。向导会询问您的 Bot token 和允许的用户 ID，然后自动写入配置。

### 方案 B：手动配置

将以下内容添加到 `~/.hermes/.env`：

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_ALLOWED_USERS=123456789    # 多个用户用逗号分隔
```

### 启动 Gateway

```bash
hermes gateway
```

机器人应在数秒内上线。在 Telegram 上向它发送一条消息以验证是否正常工作。

## Webhook 模式

默认情况下，Hermes 通过**长轮询（Long Polling）**连接 Telegram——gateway 向 Telegram 服务器发出出站请求以获取新消息。这对本地部署和持续在线的服务器效果很好。

对于**云端部署**（Fly.io、Railway、Render 等），**Webhook 模式**更具成本效益。这些平台可以在收到入站 HTTP 流量时自动唤醒休眠的机器，但无法通过出站连接触发唤醒。由于轮询是出站操作，使用轮询的机器人永远无法进入休眠。Webhook 模式改变了数据流方向——Telegram 将更新推送至机器人的 HTTPS URL，从而实现空闲时休眠的部署方式。

| | 轮询（默认）| Webhook |
|---|---|---|
| 方向 | Gateway → Telegram（出站）| Telegram → Gateway（入站）|
| 适用场景 | 本地或持续在线的服务器 | 支持自动唤醒的云平台 |
| 配置 | 无需额外配置 | 设置 `TELEGRAM_WEBHOOK_URL` |
| 空闲成本 | 机器必须保持运行 | 机器可在消息间隙休眠 |

### 配置

将以下内容添加到 `~/.hermes/.env`：

```bash
TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
# TELEGRAM_WEBHOOK_PORT=8443        # 可选，默认 8443
# TELEGRAM_WEBHOOK_SECRET=mysecret  # 可选，强烈推荐
```

| 变量 | 是否必填 | 说明 |
|----------|----------|-------------|
| `TELEGRAM_WEBHOOK_URL` | 是 | Telegram 发送更新的公开 HTTPS URL。URL 路径将自动提取（如示例中的 `/telegram`）。|
| `TELEGRAM_WEBHOOK_PORT` | 否 | Webhook 服务器监听的本地端口（默认：`8443`）。|
| `TELEGRAM_WEBHOOK_SECRET` | 否 | 用于验证更新确实来自 Telegram 的密钥 token。**强烈建议在生产环境中设置**。|

当设置了 `TELEGRAM_WEBHOOK_URL` 时，gateway 会启动 HTTP Webhook 服务器而非使用轮询。未设置时则使用轮询模式——与之前版本行为相同。

### 云端部署示例（Fly.io）

1. 将环境变量添加到 Fly.io 应用的 secrets：

```bash
fly secrets set TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
fly secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

2. 在 `fly.toml` 中暴露 Webhook 端口：

```toml
[[services]]
  internal_port = 8443
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

3. 部署：

```bash
fly deploy
```

Gateway 日志应显示：`[telegram] Connected to Telegram (webhook mode)`。

## 主频道

在任意 Telegram 聊天（私聊或群组）中使用 `/sethome` 命令，将其设为**主频道**。定时任务（cron 任务）的执行结果将发送到此频道。

您也可以在 `~/.hermes/.env` 中手动设置：

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="My Notes"
```

:::tip
群组聊天 ID 为负数（如 `-1001234567890`）。您的个人私聊 ID 与您的用户 ID 相同。
:::

## 语音消息

### 接收语音（语音转文字）

您在 Telegram 上发送的语音消息将由 Hermes 配置的 STT（语音转文字）提供商自动转录，并以文字形式注入对话中。

- `local` 使用在运行 Hermes 的机器上部署的 `faster-whisper`——无需 API 密钥
- `groq` 使用 Groq Whisper，需要配置 `GROQ_API_KEY`
- `openai` 使用 OpenAI Whisper，需要配置 `VOICE_TOOLS_OPENAI_KEY`

### 发送语音（文字转语音）

当智能体通过 TTS（文字转语音）生成音频时，将以 Telegram 原生**语音气泡**的形式发送——即圆形的行内可播放样式。

- **OpenAI 和 ElevenLabs** 原生输出 Opus 格式——无需额外配置
- **Edge TTS**（默认的免费提供商）输出 MP3 格式，需要 **ffmpeg** 转换为 Opus：

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

未安装 ffmpeg 时，Edge TTS 音频将以普通音频文件发送（仍可播放，但使用矩形播放器而非语音气泡）。

在 `config.yaml` 的 `tts.provider` 键下配置 TTS 提供商。

## 群组聊天使用

Hermes Agent 在 Telegram 群组聊天中有以下注意事项：

- **隐私模式**决定机器人能看到哪些消息（见[第三步](#第三步隐私模式群组使用的关键设置)）
- `TELEGRAM_ALLOWED_USERS` 仍然有效——即使在群组中，也只有授权用户才能触发机器人
- 您可以使用 `telegram.require_mention: true` 防止机器人响应普通群组消息
- 设置 `telegram.require_mention: true` 后，以下情况的群组消息会被响应：
  - slash 命令
  - 直接回复机器人消息的内容
  - `@botusername` 提及
  - 匹配 `telegram.mention_patterns` 中配置的正则唤醒词
- 如果 `telegram.require_mention` 未设置或为 false，Hermes 保持原有的开放群组行为，响应所有可见的普通群组消息

### 群组触发配置示例

在 `~/.hermes/config.yaml` 中添加：

```yaml
telegram:
  require_mention: true
  mention_patterns:
    - "^\\s*chompy\\b"
```

此示例允许所有常规直接触发方式，以及以 `chompy` 开头的消息，即使不使用 `@mention`。

### `mention_patterns` 说明

- 模式使用 Python 正则表达式
- 匹配不区分大小写
- 模式同时匹配文本消息和媒体说明文字
- 无效的正则表达式模式将被忽略，并在 gateway 日志中产生警告，而不会导致机器人崩溃
- 如需仅匹配消息开头，请使用 `^` 锚点

## 私聊话题（Bot API 9.4）

Telegram Bot API 9.4（2026 年 2 月）引入了**私聊话题**功能——机器人可以在一对一私聊中直接创建论坛式话题线程，无需超级群组。这让您可以在与 Hermes 的现有私聊中运行多个相互隔离的工作空间。

### 使用场景

如果您同时处理多个长期项目，话题功能可以将各自的上下文分开：

- **"Website"话题** — 处理您的生产 Web 服务
- **"Research"话题** — 文献调研和论文探索
- **"General"话题** — 杂项任务和快速提问

每个话题都有独立的对话会话、历史记录和上下文——与其他话题完全隔离。

### 配置

在 `~/.hermes/config.yaml` 的 `platforms.telegram.extra.dm_topics` 下添加话题配置：

```yaml
platforms:
  telegram:
    extra:
      dm_topics:
      - chat_id: 123456789        # 您的 Telegram 用户 ID
        topics:
        - name: General
          icon_color: 7322096
        - name: Website
          icon_color: 9367192
        - name: Research
          icon_color: 16766590
          skill: arxiv              # 在此话题中自动加载技能
```

**字段说明：**

| 字段 | 是否必填 | 说明 |
|-------|----------|-------------|
| `name` | 是 | 话题显示名称 |
| `icon_color` | 否 | Telegram 图标颜色代码（整数）|
| `icon_custom_emoji_id` | 否 | 话题图标的自定义 emoji ID |
| `skill` | 否 | 在此话题中新建会话时自动加载的技能 |
| `thread_id` | 否 | 话题创建后自动填充——请勿手动设置 |

### 工作原理

1. Gateway 启动时，Hermes 会对尚未有 `thread_id` 的话题调用 `createForumTopic`
2. `thread_id` 将自动保存回 `config.yaml`——后续重启时跳过 API 调用
3. 每个话题映射到独立的会话键：`agent:main:telegram:dm:{chat_id}:{thread_id}`
4. 各话题中的消息拥有独立的对话历史、记忆清除机制和上下文窗口

### 技能绑定

具有 `skill` 字段的话题会在该话题中新建会话时自动加载对应技能。其工作方式与在对话开始时输入 `/skill-name` 完全相同——技能内容将被注入到第一条消息中，后续消息也能在对话历史中看到它。

例如，配置了 `skill: arxiv` 的话题，在每次会话重置（因空闲超时、每日重置或手动 `/reset`）后都会预加载 arxiv 技能。

:::tip
在配置之外创建的话题（如通过手动调用 Telegram API 创建）会在收到 `forum_topic_created` 服务消息时自动被发现。您也可以在 gateway 运行期间向配置中添加话题——下次缓存未命中时将自动生效。
:::

## 群组论坛话题技能绑定

启用了**话题模式**（也称为"论坛话题"）的超级群组已经支持按话题进行会话隔离——每个 `thread_id` 对应独立的对话。但您可能还希望在特定群组话题中收到消息时**自动加载技能**，就像私聊话题技能绑定的工作方式一样。

### 使用场景

一个拥有多个工作流话题的团队超级群组：

- **"Engineering"话题** → 自动加载 `software-development` 技能
- **"Research"话题** → 自动加载 `arxiv` 技能
- **"General"话题** → 无技能，通用助手

### 配置

在 `~/.hermes/config.yaml` 的 `platforms.telegram.extra.group_topics` 下添加话题绑定：

```yaml
platforms:
  telegram:
    extra:
      group_topics:
      - chat_id: -1001234567890       # 超级群组 ID
        topics:
        - name: Engineering
          thread_id: 5
          skill: software-development
        - name: Research
          thread_id: 12
          skill: arxiv
        - name: General
          thread_id: 1
          # 无技能——通用用途
```

**字段说明：**

| 字段 | 是否必填 | 说明 |
|-------|----------|-------------|
| `chat_id` | 是 | 超级群组的数字 ID（以 `-100` 开头的负数）|
| `name` | 否 | 话题的人类可读标签（仅供参考）|
| `thread_id` | 是 | Telegram 论坛话题 ID——可在 `t.me/c/<群组ID>/<话题ID>` 链接中查看 |
| `skill` | 否 | 在此话题中新建会话时自动加载的技能 |

### 工作原理

1. 当映射的群组话题中有消息到达时，Hermes 在 `group_topics` 配置中查找对应的 `chat_id` 和 `thread_id`
2. 若匹配项包含 `skill` 字段，则自动为该会话加载对应技能——与私聊话题技能绑定完全相同
3. 没有 `skill` 键的话题仅获得会话隔离（现有行为，保持不变）
4. 未映射的 `thread_id` 或 `chat_id` 将静默跳过——无报错，无技能加载

### 与私聊话题的区别

| | 私聊话题 | 群组话题 |
|---|---|---|
| 配置键 | `extra.dm_topics` | `extra.group_topics` |
| 话题创建 | Hermes 在 `thread_id` 缺失时通过 API 创建话题 | 管理员在 Telegram 界面创建话题 |
| `thread_id` | 创建后自动填充 | 必须手动设置 |
| `icon_color` / `icon_custom_emoji_id` | 支持 | 不适用（外观由管理员控制）|
| 技能绑定 | ✓ | ✓ |
| 会话隔离 | ✓ | ✓（论坛话题已内置会话隔离）|

:::tip
要查找话题的 `thread_id`，请在 Telegram Web 或桌面客户端中打开该话题，查看 URL：`https://t.me/c/1234567890/5`——最后的数字（`5`）即为 `thread_id`。超级群组的 `chat_id` 是群组 ID 加上 `-100` 前缀（如群组 `1234567890` 对应 `-1001234567890`）。
:::

## 近期 Bot API 新功能

- **Bot API 9.4（2026 年 2 月）：** 私聊话题——机器人可通过 `createForumTopic` 在一对一私聊中创建论坛话题。详见上方[私聊话题](#私聊话题bot-api-94)。
- **隐私政策：** Telegram 现在要求机器人具有隐私政策。可通过 BotFather 的 `/setprivacy_policy` 命令设置，否则 Telegram 可能自动生成占位符。对于面向公众的机器人，此项尤为重要。
- **消息流式传输：** Bot API 9.x 新增了对长回复流式传输的支持，可改善智能体长回复的感知延迟。

## 交互式模型选择器

在 Telegram 聊天中不带参数发送 `/model` 时，Hermes 会显示用于切换模型的交互式内联键盘：

1. **提供商选择** — 显示各可用提供商及其模型数量的按钮（如 "OpenAI (15)"、当前提供商显示为 "✓ Anthropic (12)"）。
2. **模型选择** — 分页显示的模型列表，包含 **Prev**/**Next** 导航按钮、**Back** 返回提供商列表按钮，以及 **Cancel** 取消按钮。

当前模型和提供商显示在顶部。所有导航操作均通过就地编辑同一条消息实现——不会产生聊天消息堆积。

:::tip
如果您知道确切的模型名称，可直接输入 `/model <模型名称>` 跳过选择器。还可以使用 `/model <模型名称> --global` 将更改持久化到所有会话。
:::

## Webhook 模式

默认情况下，Telegram 适配器通过**长轮询**连接——gateway 向 Telegram 服务器发出出站连接。这在任何环境下都能正常工作，但会保持持久连接。

**Webhook 模式**是一种替代方式，Telegram 通过 HTTPS 将更新推送到您的服务器。这非常适合**无服务器和云端部署**（Fly.io、Railway 等），因为入站 HTTP 请求可以唤醒休眠中的机器。

### 配置

设置 `TELEGRAM_WEBHOOK_URL` 环境变量以启用 Webhook 模式：

```bash
# 必填——您的公开 HTTPS 端点
TELEGRAM_WEBHOOK_URL=https://app.fly.dev/telegram

# 可选——本地监听端口（默认：8443）
TELEGRAM_WEBHOOK_PORT=8443

# 可选——用于验证更新的密钥 token（未设置时自动生成）
TELEGRAM_WEBHOOK_SECRET=my-secret-token
```

或在 `~/.hermes/config.yaml` 中配置：

```yaml
telegram:
  webhook_mode: true
```

当设置了 `TELEGRAM_WEBHOOK_URL` 时，gateway 会启动监听 `0.0.0.0:<PORT>` 的 HTTP 服务器，并向 Telegram 注册 Webhook URL。URL 路径从 Webhook URL 中提取（默认为 `/telegram`）。

:::caution
Telegram 要求 Webhook 端点具有**有效的 TLS 证书**。自签名证书将被拒绝。请使用反向代理（nginx、Caddy）或提供 TLS 终止服务的平台（Fly.io、Railway、Cloudflare Tunnel）。
:::

## DNS-over-HTTPS 备用 IP

在某些受限网络中，`api.telegram.org` 可能解析到无法访问的 IP。Telegram 适配器内置了**备用 IP** 机制，在保留正确 TLS 主机名和 SNI 的同时，透明地重试备用 IP 的连接。

### 工作原理

1. 若设置了 `TELEGRAM_FALLBACK_IPS`，则直接使用这些 IP。
2. 否则，适配器会自动通过 DNS-over-HTTPS（DoH）查询 **Google DNS** 和 **Cloudflare DNS**，以发现 `api.telegram.org` 的备用 IP。
3. DoH 返回的与系统 DNS 结果不同的 IP 将被用作备用 IP。
4. 如果 DoH 也被封锁，将使用硬编码的种子 IP（`149.154.167.220`）作为最后手段。
5. 一旦某个备用 IP 连接成功，该 IP 将被优先复用——后续请求直接使用该 IP，无需再次尝试主路径。

### 配置

```bash
# 显式指定备用 IP（逗号分隔）
TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221
```

或在 `~/.hermes/config.yaml` 中配置：

```yaml
platforms:
  telegram:
    extra:
      fallback_ips:
        - "149.154.167.220"
```

:::tip
通常情况下无需手动配置此项。通过 DoH 的自动发现可以处理大多数受限网络场景。只有在您的网络中 DoH 也被封锁时，才需要设置 `TELEGRAM_FALLBACK_IPS` 环境变量。
:::

## 消息反应

机器人可以通过 emoji 反应提供视觉处理反馈：

- 👀 当机器人开始处理您的消息时
- ✅ 当回复成功发送时
- ❌ 当处理过程中发生错误时

反应功能**默认关闭**。在 `config.yaml` 中启用：

```yaml
telegram:
  reactions: true
```

或通过环境变量：

```bash
TELEGRAM_REACTIONS=true
```

:::note
与 Discord（反应是累加的）不同，Telegram 的 Bot API 通过单次调用替换所有机器人反应。从 👀 到 ✅/❌ 的切换是原子操作——不会同时看到两者。
:::

:::tip
如果机器人在群组中没有添加反应的权限，反应调用将静默失败，消息处理照常继续。
:::

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| 机器人完全没有响应 | 验证 `TELEGRAM_BOT_TOKEN` 是否正确。查看 `hermes gateway` 日志中的错误信息。|
| 机器人回复"unauthorized" | 您的用户 ID 不在 `TELEGRAM_ALLOWED_USERS` 中。通过 @userinfobot 再次确认。|
| 机器人忽略群组消息 | 隐私模式可能已开启。关闭它（第三步）或将机器人设为群组管理员。**记得在更改隐私设置后将机器人从群组中移除并重新添加。**|
| 语音消息未转录 | 验证 STT 是否可用：安装 `faster-whisper` 进行本地转录，或在 `~/.hermes/.env` 中设置 `GROQ_API_KEY` / `VOICE_TOOLS_OPENAI_KEY`。|
| 语音回复是文件而非气泡 | 安装 `ffmpeg`（Edge TTS 转换为 Opus 格式所需）。|
| Bot token 已撤销/无效 | 通过 BotFather 的 `/revoke` 然后 `/newbot` 或 `/token` 生成新 token。更新您的 `.env` 文件。|
| Webhook 未收到更新 | 验证 `TELEGRAM_WEBHOOK_URL` 是否可公开访问（用 `curl` 测试）。确保您的平台/反向代理将来自 URL 端口的入站 HTTPS 流量路由到 `TELEGRAM_WEBHOOK_PORT` 配置的本地监听端口（两者不必相同）。确保 SSL/TLS 已启用——Telegram 只向 HTTPS URL 发送请求。检查防火墙规则。|

## 执行审批

当智能体尝试运行可能存在危险的命令时，会在聊天中请求您的审批：

> ⚠️ 此命令存在潜在危险（递归删除）。回复 "yes" 以批准。

回复 "yes"/"y" 批准，或回复 "no"/"n" 拒绝。

## 安全

:::caution
请务必设置 `TELEGRAM_ALLOWED_USERS` 以限制可与机器人交互的用户。若未设置，gateway 默认拒绝所有用户作为安全措施。
:::

请勿公开分享您的 Bot token。如果泄露，请立即通过 BotFather 的 `/revoke` 命令撤销。

更多详情，请参阅[安全文档](/user-guide/security)。您也可以使用 [DM 配对](/user-guide/messaging#dm-pairing-alternative-to-allowlists)作为更灵活的用户授权方式。
