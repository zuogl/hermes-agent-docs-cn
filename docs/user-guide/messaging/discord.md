---
title: "Discord 配置"
---
# Discord 配置

Hermes Agent 以机器人身份接入 Discord，让你可以通过私信或服务器频道与 AI 助手对话。机器人接收你的消息，通过 Hermes Agent 管道处理（包括工具调用、记忆和推理），并实时回复。支持文字消息、语音消息、文件附件和斜杠命令。

在开始配置之前，先了解一下大家最关心的问题：Hermes 接入服务器后的行为方式。

## Hermes 的行为方式

| 场景 | 行为 |
|------|------|
| **私信（DM）** | Hermes 回复每一条消息，无需 `@提及`。每个私信对话拥有独立会话。 |
| **服务器频道** | 默认情况下，Hermes 仅在被 `@提及` 时回复。若在频道内发消息未提及 Hermes，消息将被忽略。 |
| **自由回复频道** | 可通过 `DISCORD_FREE_RESPONSE_CHANNELS` 设置特定频道无需提及，或通过 `DISCORD_REQUIRE_MENTION=false` 全局禁用提及要求。 |
| **线程** | Hermes 在同一线程内回复。提及规则仍然适用，除非该线程或其父频道已配置为自由回复频道。线程的会话历史与父频道相互隔离。 |
| **多用户共享频道** | 默认情况下，Hermes 为安全和清晰起见，在频道内按用户隔离会话历史。同一频道内两个用户的对话不会共享上下文，除非你明确禁用此功能。 |
| **提及其他用户的消息** | 当 `DISCORD_IGNORE_NO_MENTION` 为 `true`（默认值）时，若消息 @提及了其他用户但**未**提及机器人，Hermes 将保持沉默。这可防止机器人介入针对他人的对话。若希望机器人回复所有消息而无论提及了谁，可将其设为 `false`。此规则仅适用于服务器频道，不适用于私信。 |

:::tip
如果你希望建立一个普通的机器人帮助频道，让用户无需每次都 @Hermes，只需将该频道添加到 `DISCORD_FREE_RESPONSE_CHANNELS` 即可。
:::

### Discord 网关模型

Hermes 在 Discord 上并非无状态的 Webhook 回复模式，而是通过完整的消息网关运行。每条传入消息都会经过以下流程：

1. 授权验证（`DISCORD_ALLOWED_USERS`）
2. 提及 / 自由回复检查
3. 会话查找
4. 会话记录加载
5. 完整的 Hermes 智能体执行（包括工具、记忆和斜杠命令）
6. 将回复发送回 Discord

这意味着在繁忙服务器中的行为，同时取决于 Discord 路由策略和 Hermes 会话策略。

### Discord 会话模型

默认情况下：

- 每个私信拥有独立会话
- 每个服务器线程拥有独立会话命名空间
- 共享频道内的每个用户在该频道内拥有独立会话

因此，即使 Alice 和 Bob 都在 `#research` 频道中与 Hermes 对话，默认情况下 Hermes 也会将其视为独立对话。

此行为通过 `config.yaml` 控制：

```yaml
group_sessions_per_user: true
```

仅当你明确希望整个频道共享同一对话时，才将其设为 `false`：

```yaml
group_sessions_per_user: false
```

共享会话适用于协作场景，但也意味着：

- 用户共享上下文增长和 token 消耗
- 一个用户的大量工具调用任务会撑大所有人的上下文
- 一个用户正在执行的任务可能打断另一个用户在同一频道的后续消息

### 中断与并发

Hermes 通过会话键追踪正在运行的智能体。

在默认的 `group_sessions_per_user: true` 下：

- Alice 中断自己的进行中请求，只影响她在该频道的会话
- Bob 可以在同一频道继续对话，不会继承 Alice 的历史或打断 Alice 的任务

在 `group_sessions_per_user: false` 下：

- 整个频道/线程共享一个运行中的智能体槽位
- 不同用户发送的后续消息可能互相打断或排队等待

本指南将带你完成完整的配置流程——从在 Discord 开发者门户创建机器人到发送第一条消息。

## 第一步：创建 Discord 应用程序

1. 访问 [Discord 开发者门户](https://discord.com/developers/applications) 并用 Discord 账号登录。
2. 点击右上角的 **New Application**。
3. 为应用程序输入名称（例如"Hermes Agent"），并接受开发者服务条款。
4. 点击 **Create**。

页面将跳转至 **General Information** 页面。记下 **Application ID**——你将在后续步骤中用它构建邀请链接。

## 第二步：创建机器人

1. 在左侧栏中点击 **Bot**。
2. Discord 会自动为你的应用程序创建一个机器人用户，你可以自定义其用户名。
3. 在 **Authorization Flow** 下：
   - 将 **Public Bot** 设为 **ON**——这是使用 Discord 提供的邀请链接的必要条件（推荐）。此设置允许"安装"标签页生成默认授权 URL。
   - 将 **Require OAuth2 Code Grant** 保持为 **OFF**。

:::tip
你可以在此页面为机器人设置自定义头像和横幅，这是用户在 Discord 中看到的样式。
:::

:::info
[私有机器人替代方案] 如果你希望机器人保持私有（Public Bot = OFF），**必须**在第五步中使用**手动 URL** 方式，而非安装标签页。Discord 提供的链接需要启用 Public Bot。
:::

## 第三步：启用特权网关意图

这是整个配置过程中最关键的步骤。若未正确启用意图，你的机器人虽然能连接到 Discord，但**将无法读取消息内容**。

在 **Bot** 页面，向下滚动至 **Privileged Gateway Intents**，你将看到三个开关：

| 意图 | 用途 | 是否必需？ |
|------|------|----------|
| **Presence Intent** | 查看用户在线/离线状态 | 可选 |
| **Server Members Intent** | 访问成员列表、解析用户名 | **必需** |
| **Message Content Intent** | 读取消息的文字内容 | **必需** |

**将 Server Members Intent 和 Message Content Intent 均切换为 ON。**

- 若未启用 **Message Content Intent**，机器人虽能接收消息事件，但消息文字内容为空——机器人根本看不到你输入的内容。
- 若未启用 **Server Members Intent**，机器人将无法解析允许用户列表中的用户名，可能无法识别发送消息的人。

:::caution
[这是 Discord 机器人不响应的首要原因] 如果机器人在线但从不回复消息，极有可能是 **Message Content Intent** 未启用。请返回 [开发者门户](https://discord.com/developers/applications)，选择你的应用程序 → Bot → Privileged Gateway Intents，确认 **Message Content Intent** 已切换为 ON，然后点击 **Save Changes**。
:::

**关于服务器数量：**
- 若机器人加入的服务器**少于 100 个**，可以随意切换意图。
- 若机器人加入的服务器**达到 100 个及以上**，Discord 要求你提交验证申请才能使用特权意图。个人使用无需担心此限制。

点击页面底部的 **Save Changes**。

## 第四步：获取机器人 Token

机器人 token 是 Hermes Agent 以你的机器人身份登录的凭证。仍在 **Bot** 页面：

1. 在 **Token** 部分，点击 **Reset Token**。
2. 如果你的 Discord 账号启用了双重验证，请输入 2FA 验证码。
3. Discord 将显示新 token，**立即复制它**。

:::caution
[Token 只显示一次] Token 仅显示一次。如果丢失，你需要重置并生成新的 token。切勿公开分享 token 或将其提交到 Git——任何持有此 token 的人都可以完全控制你的机器人。
:::

将 token 保存在安全的地方（例如密码管理器）。你将在第八步中用到它。

## 第五步：生成邀请 URL

你需要一个 OAuth2 URL 才能将机器人邀请到服务器。有两种方式：

### 方案 A：使用安装标签页（推荐）

:::note
[需要 Public Bot] 此方法要求在第二步中将 **Public Bot** 设为 **ON**。如果将 Public Bot 设为 OFF，请改用下方的手动 URL 方法。
:::

1. 在左侧栏中点击 **Installation**。
2. 在 **Installation Contexts** 下，启用 **Guild Install**。
3. 在 **Install Link** 中，选择 **Discord Provided Link**。
4. 在 **Default Install Settings** 的 Guild Install 下：
   - **Scopes**：选择 `bot` 和 `applications.commands`
   - **Permissions**：选择下方列出的权限。

### 方案 B：手动 URL

你可以使用以下格式直接构建邀请 URL：

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=274878286912
```

将 `YOUR_APP_ID` 替换为第一步中的应用程序 ID。

### 必需权限

机器人所需的最低权限：

- **View Channels** — 查看其有权限访问的频道
- **Send Messages** — 回复你的消息
- **Embed Links** — 格式化富文本回复
- **Attach Files** — 发送图片、音频和文件
- **Read Message History** — 维持对话上下文

### 推荐的附加权限

- **Send Messages in Threads** — 在线程对话中回复
- **Add Reactions** — 对消息添加表情回应

### 权限整数

| 级别 | 权限整数 | 包含内容 |
|------|---------|---------|
| 最低限度 | `117760` | View Channels、Send Messages、Read Message History、Attach Files |
| 推荐 | `274878286912` | 以上所有权限，外加 Embed Links、Send Messages in Threads、Add Reactions |

## 第六步：邀请机器人到服务器

1. 在浏览器中打开邀请 URL（来自安装标签页或你手动构建的 URL）。
2. 在 **Add to Server** 下拉菜单中，选择你的服务器。
3. 点击 **Continue**，然后点击 **Authorize**。
4. 如有提示，完成 CAPTCHA 验证。

:::info
你需要在 Discord 服务器上拥有 **Manage Server**（管理服务器）权限才能邀请机器人。如果在下拉菜单中看不到你的服务器，请让服务器管理员使用邀请链接。
:::

授权完成后，机器人将出现在服务器的成员列表中（在启动 Hermes 网关之前，它将显示为离线状态）。

## 第七步：查找你的 Discord 用户 ID

Hermes Agent 使用你的 Discord 用户 ID 来控制谁可以与机器人交互。查找方式：

1. 打开 Discord（桌面端或网页端）。
2. 进入 **Settings** → **Advanced** → 将 **Developer Mode** 切换为 **ON**。
3. 关闭设置。
4. 右键点击你自己的用户名（在消息、成员列表或个人主页中）→ **Copy User ID**。

你的用户 ID 是一串长数字，例如 `284102345871466496`。

:::tip
开发者模式同样允许你用同样的方式复制**频道 ID** 和**服务器 ID**——右键点击频道或服务器名称并选择 Copy ID。如果你想手动设置主频道，需要用到频道 ID。
:::

## 第八步：配置 Hermes Agent

### 方案 A：交互式配置（推荐）

运行引导式配置命令：

```bash
hermes gateway setup
```

出现提示时选择 **Discord**，然后粘贴你的机器人 token 和用户 ID。

### 方案 B：手动配置

将以下内容添加到 `~/.hermes/.env` 文件：

```bash
# Required
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ALLOWED_USERS=284102345871466496

# Multiple allowed users (comma-separated)
# DISCORD_ALLOWED_USERS=284102345871466496,198765432109876543
```

然后启动网关：

```bash
hermes gateway
```

机器人应在几秒钟内在 Discord 上线。发送一条消息——私信或机器人有权限查看的频道——进行测试。

:::tip
你可以在后台运行 `hermes gateway` 或将其配置为 systemd 服务以实现持续运行。详见部署文档。
:::

## 配置参考

Discord 行为通过两个文件控制：**`~/.hermes/.env`** 用于凭证和环境级开关，**`~/.hermes/config.yaml`** 用于结构化设置。当两者同时设置时，环境变量始终优先于 config.yaml。

### 环境变量（`.env`）

| 变量 | 是否必需 | 默认值 | 描述 |
|------|---------|-------|------|
| `DISCORD_BOT_TOKEN` | **是** | — | 来自 [Discord 开发者门户](https://discord.com/developers/applications) 的机器人 token。 |
| `DISCORD_ALLOWED_USERS` | **是** | — | 允许与机器人交互的 Discord 用户 ID，多个以逗号分隔。若未设置，网关将拒绝所有用户。 |
| `DISCORD_HOME_CHANNEL` | 否 | — | 机器人发送主动消息（定时任务输出、提醒、通知）的频道 ID。 |
| `DISCORD_HOME_CHANNEL_NAME` | 否 | `"Home"` | 主频道在日志和状态输出中显示的名称。 |
| `DISCORD_REQUIRE_MENTION` | 否 | `true` | 为 `true` 时，机器人仅在服务器频道中被 `@提及` 时回复。设为 `false` 可在所有频道回复所有消息。 |
| `DISCORD_FREE_RESPONSE_CHANNELS` | 否 | — | 机器人无需 `@提及` 即可回复的频道 ID，多个以逗号分隔。即使 `DISCORD_REQUIRE_MENTION` 为 `true` 也生效。 |
| `DISCORD_IGNORE_NO_MENTION` | 否 | `true` | 为 `true` 时，若消息 `@提及` 了其他用户但**未**提及机器人，机器人将保持沉默。防止机器人介入针对他人的对话。仅适用于服务器频道，不适用于私信。 |
| `DISCORD_AUTO_THREAD` | 否 | `true` | 为 `true` 时，在文字频道中每次 `@提及` 都会自动创建新线程，使每次对话相互隔离（类似 Slack 的行为）。已在线程内或私信中的消息不受影响。 |
| `DISCORD_ALLOW_BOTS` | 否 | `"none"` | 控制机器人处理其他 Discord 机器人消息的方式。`"none"` — 忽略所有其他机器人。`"mentions"` — 仅接受 @提及 Hermes 的机器人消息。`"all"` — 接受所有机器人消息。 |
| `DISCORD_REACTIONS` | 否 | `true` | 为 `true` 时，机器人在处理过程中为消息添加表情回应（处理中 👀，成功 ✅，出错 ❌）。设为 `false` 完全禁用表情回应。 |
| `DISCORD_IGNORED_CHANNELS` | 否 | — | 机器人**永不**回复的频道 ID，多个以逗号分隔，即使被 `@提及` 也不回复。优先级高于所有其他频道设置。 |
| `DISCORD_NO_THREAD_CHANNELS` | 否 | — | 机器人直接在频道内回复而非创建线程的频道 ID，多个以逗号分隔。仅在 `DISCORD_AUTO_THREAD` 为 `true` 时有效。 |

### 配置文件（`config.yaml`）

`~/.hermes/config.yaml` 中的 `discord` 部分与上述环境变量相对应。config.yaml 的设置作为默认值——若对应的环境变量已设置，则环境变量优先。

```yaml
# Discord-specific settings
discord:
  require_mention: true           # Require @mention in server channels
  free_response_channels: ""      # Comma-separated channel IDs (or YAML list)
  auto_thread: true               # Auto-create threads on @mention
  reactions: true                 # Add emoji reactions during processing
  ignored_channels: []            # Channel IDs where bot never responds
  no_thread_channels: []          # Channel IDs where bot responds without threading

# Session isolation (applies to all gateway platforms, not just Discord)
group_sessions_per_user: true     # Isolate sessions per user in shared channels
```

#### `discord.require_mention`

**类型：** 布尔值 — **默认值：** `true`

启用后，机器人仅在服务器频道中被直接 `@提及` 时回复。无论此设置如何，私信始终会得到回复。

#### `discord.free_response_channels`

**类型：** 字符串或列表 — **默认值：** `""`

机器人无需 `@提及` 即可回复所有消息的频道 ID。支持逗号分隔的字符串或 YAML 列表：

```yaml
# String format
discord:
  free_response_channels: "1234567890,9876543210"

# List format
discord:
  free_response_channels:
    - 1234567890
    - 9876543210
```

若线程的父频道在此列表中，该线程同样成为无需提及的频道。

#### `discord.auto_thread`

**类型：** 布尔值 — **默认值：** `true`

启用后，在普通文字频道中每次 `@提及` 都会自动为对话创建新线程。这样可以保持主频道整洁，并为每次对话提供独立的会话历史。线程创建后，该线程内的后续消息无需再 `@提及`——机器人知道自己已参与其中。

已在现有线程或私信中发送的消息不受此设置影响。

#### `discord.reactions`

**类型：** 布尔值 — **默认值：** `true`

控制机器人是否为消息添加表情回应作为视觉反馈：
- 机器人开始处理你的消息时添加 👀
- 成功发送回复时添加 ✅
- 处理过程中发生错误时添加 ❌

如果你觉得表情回应有干扰，或机器人角色没有 **Add Reactions** 权限，可以禁用此功能。

#### `discord.ignored_channels`

**类型：** 字符串或列表 — **默认值：** `[]`

机器人**永不**回复的频道 ID，即使被直接 `@提及` 也不例外。此设置具有最高优先级——如果频道在此列表中，机器人将静默忽略该频道的所有消息，无论 `require_mention`、`free_response_channels` 或其他设置如何。

```yaml
# String format
discord:
  ignored_channels: "1234567890,9876543210"

# List format
discord:
  ignored_channels:
    - 1234567890
    - 9876543210
```

若线程的父频道在此列表中，该线程内的消息同样被忽略。

#### `discord.no_thread_channels`

**类型：** 字符串或列表 — **默认值：** `[]`

机器人直接在频道内回复而非自动创建线程的频道 ID。仅在 `auto_thread` 为 `true`（默认值）时有效。在这些频道中，机器人像普通消息一样内联回复，而非创建新线程。

```yaml
discord:
  no_thread_channels:
    - 1234567890  # Bot responds inline here
```

适用于专门用于机器人交互的频道，避免线程造成不必要的干扰。

#### `group_sessions_per_user`

**类型：** 布尔值 — **默认值：** `true`

这是全局网关设置（非 Discord 专属），控制同一频道内的用户是否拥有独立的会话历史。

为 `true` 时：在 `#research` 频道中对话的 Alice 和 Bob 各自与 Hermes 保持独立对话。

为 `false` 时：整个频道共享一份对话记录和一个运行中的智能体槽位。

```yaml
group_sessions_per_user: true
```

完整影响说明，请参阅上方的[会话模型](#discord-会话模型)章节。

#### `display.tool_progress`

**类型：** 字符串 — **默认值：** `"all"` — **可选值：** `off`、`new`、`all`、`verbose`

控制机器人在处理过程中是否在聊天中发送进度消息（例如 "Reading file..."、"Running terminal command..."）。这是全局网关设置，适用于所有平台。

```yaml
display:
  tool_progress: "all"    # off | new | all | verbose
```

- `off` — 不显示进度消息
- `new` — 每轮只显示第一次工具调用
- `all` — 显示所有工具调用（网关消息中截断至 40 字符）
- `verbose` — 显示完整工具调用详情（可能产生较长消息）

#### `display.tool_progress_command`

**类型：** 布尔值 — **默认值：** `false`

启用后，可在网关中使用 `/verbose` 斜杠命令，让你无需编辑 config.yaml 即可在工具进度模式间循环切换（`off → new → all → verbose → off`）。

```yaml
display:
  tool_progress_command: true
```

## 交互式模型选择器

在 Discord 频道中发送不带参数的 `/model` 命令，即可打开基于下拉菜单的模型选择器：

1. **提供商选择** — 显示可用提供商的下拉菜单（最多 25 个）。
2. **模型选择** — 显示所选提供商旗下模型的第二个下拉菜单（最多 25 个）。

选择器在 120 秒后超时。只有经过授权的用户（`DISCORD_ALLOWED_USERS` 中的用户）才能与其交互。如果你已知道模型名称，可以直接输入 `/model <模型名称>`。

## 原生斜杠命令（技能）

Hermes 自动将已安装的技能注册为 **Discord 原生应用命令**，这意味着技能将出现在 Discord 的自动补全 `/` 菜单中，与内置命令并列显示。

- 每个技能都会成为一个 Discord 斜杠命令（例如 `/code-review`、`/ascii-art`）
- 技能接受一个可选的 `args` 字符串参数
- Discord 限制每个机器人最多 100 个应用命令——如果你的技能数量超过可用槽位，多余的技能将被跳过并在日志中记录警告
- 技能在机器人启动时与 `/model`、`/reset`、`/background` 等内置命令一起注册

无需额外配置——通过 `hermes skills install` 安装的任何技能，在下次重启网关后都会自动注册为 Discord 斜杠命令。

## 主频道

你可以指定一个"主频道"，机器人将在其中发送主动消息（如定时任务输出、提醒和通知）。有两种设置方式：

### 使用斜杠命令

在机器人所在的任意 Discord 频道中输入 `/sethome`，该频道即成为主频道。

### 手动配置

将以下内容添加到 `~/.hermes/.env`：

```bash
DISCORD_HOME_CHANNEL=123456789012345678
DISCORD_HOME_CHANNEL_NAME="#bot-updates"
```

将 ID 替换为实际的频道 ID（在开发者模式下右键点击频道 → Copy Channel ID）。

## 语音消息

Hermes Agent 支持 Discord 语音消息：

- **传入语音消息** 将使用已配置的 STT 提供商自动转录：本地 `faster-whisper`（无需密钥）、Groq Whisper（`GROQ_API_KEY`）或 OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）。
- **文字转语音**：使用 `/voice tts` 命令，可让机器人在文字回复的同时发送语音音频。
- **Discord 语音频道**：Hermes 也可以加入语音频道，聆听用户说话，并在频道中语音回复。

完整配置和使用指南，请参阅：
- [语音模式](https://hermes-agent.nousresearch.com/docs/user-guide/features/voice-mode)
- [使用 Hermes 的语音模式](https://hermes-agent.nousresearch.com/docs/guides/use-voice-mode-with-hermes)

## 故障排查

### 机器人在线但不回复消息

**原因**：Message Content Intent 未启用。

**解决方案**：前往 [开发者门户](https://discord.com/developers/applications) → 选择你的应用 → Bot → Privileged Gateway Intents → 启用 **Message Content Intent** → Save Changes。重启网关。

### 启动时出现"Disallowed Intents"错误

**原因**：代码请求的意图在开发者门户中未启用。

**解决方案**：在 Bot 设置中启用全部三个特权网关意图（Presence、Server Members、Message Content），然后重启。

### 机器人在特定频道中无法看到消息

**原因**：机器人的角色没有查看该频道的权限。

**解决方案**：在 Discord 中，进入该频道的设置 → 权限 → 为机器人角色添加 **View Channel** 和 **Read Message History** 权限。

### 403 Forbidden 错误

**原因**：机器人缺少所需权限。

**解决方案**：使用第五步中的 URL 重新邀请机器人并附带正确权限，或在服务器设置 → 身份组中手动调整机器人的身份组权限。

### 机器人离线

**原因**：Hermes 网关未运行，或 token 不正确。

**解决方案**：检查 `hermes gateway` 是否正在运行。验证 `.env` 文件中的 `DISCORD_BOT_TOKEN`。如果你最近重置了 token，请更新它。

### "User not allowed" / 机器人忽略你

**原因**：你的用户 ID 不在 `DISCORD_ALLOWED_USERS` 中。

**解决方案**：将你的用户 ID 添加到 `~/.hermes/.env` 的 `DISCORD_ALLOWED_USERS` 中，并重启网关。

### 同一频道中的用户意外共享上下文

**原因**：`group_sessions_per_user` 已禁用，或平台无法为该上下文中的消息提供用户 ID。

**解决方案**：在 `~/.hermes/config.yaml` 中进行以下设置并重启网关：

```yaml
group_sessions_per_user: true
```

如果你有意设置共享频道对话，可以保持禁用——但需预期共享的记录历史和共享的中断行为。

## 安全

:::caution
请务必设置 `DISCORD_ALLOWED_USERS` 以限制可以与机器人交互的用户。若未设置，网关出于安全考虑默认拒绝所有用户。只添加你信任的用户 ID——已授权用户对智能体的所有功能拥有完全访问权限，包括工具调用和系统访问。
:::

有关保护 Hermes Agent 部署安全的更多信息，请参阅[安全指南](/user-guide/security)。
