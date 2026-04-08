---
title: "会话"
---
# 会话

Hermes Agent 会自动将每次对话保存为一个会话（session）。会话功能支持对话恢复、跨会话搜索及完整的对话历史管理。

## 会话机制

无论对话来自 CLI、Telegram、Discord、Slack、WhatsApp、Signal、Matrix 还是其他消息平台，Hermes 都会通过两套互补系统追踪会话，完整保留消息历史：

1. **SQLite 数据库**（`~/.hermes/state.db`）——结构化会话元数据，支持 FTS5 全文搜索
2. **JSONL 对话记录**（`~/.hermes/sessions/`）——原始对话记录，包含工具调用（网关模式）

SQLite 数据库存储以下信息：

- 会话 ID、来源平台、用户 ID
- **会话标题**（唯一的、可读性强的名称）
- 模型名称及配置
- 系统提示词快照
- 完整消息历史（角色、内容、工具调用、工具结果）
- Token 数量（输入/输出）
- 时间戳（started_at、ended_at）
- 父会话 ID（用于上下文压缩触发的会话拆分）

### 会话来源

每个会话都带有其来源平台的标签：

| 来源 | 说明 |
|--------|-------------|
| `cli` | 交互式 CLI（`hermes` 或 `hermes chat`） |
| `telegram` | Telegram 消息平台 |
| `discord` | Discord 服务器或私信 |
| `slack` | Slack 工作区 |
| `whatsapp` | WhatsApp 消息平台 |
| `signal` | Signal 消息平台 |
| `matrix` | Matrix 频道和私信 |
| `mattermost` | Mattermost 频道 |
| `email` | 电子邮件（IMAP/SMTP） |
| `sms` | 通过 Twilio 发送的短信 |
| `dingtalk` | 钉钉消息平台 |
| `feishu` | 飞书/Lark 消息平台 |
| `wecom` | 企业微信 |
| `homeassistant` | Home Assistant 对话 |
| `webhook` | 入站 Webhook |
| `api-server` | API 服务器请求 |
| `acp` | ACP（Agent Control Protocol，智能体控制协议）编辑器集成 |
| `cron` | 定时任务 |
| `batch` | 批处理任务 |

## CLI 会话恢复

在 CLI 中使用 `--continue` 或 `--resume` 恢复之前的对话：

### 继续上次会话

```bash
# 恢复最近一次 CLI 会话
hermes --continue
hermes -c

# 或使用 chat 子命令
hermes chat --continue
hermes chat -c
```

这会从 SQLite 数据库中查找最近一次 `cli` 会话，并加载其完整的对话历史。

### 按名称恢复

如果你给会话设置了标题（参见下方[会话命名](#会话命名)），可以通过名称恢复：

```bash
# 按名称恢复会话
hermes -c "my project"

# 如果存在会话谱系变体（my project、my project #2、my project #3），
# 这会自动恢复最新的那个
hermes -c "my project"   # → 恢复 "my project #3"
```

### 恢复指定会话

```bash
# 按 ID 恢复指定会话
hermes --resume 20250305_091523_a1b2c3d4
hermes -r 20250305_091523_a1b2c3d4

# 按标题恢复
hermes --resume "refactoring auth"

# 或使用 chat 子命令
hermes chat --resume 20250305_091523_a1b2c3d4
```

会话 ID 会在退出 CLI 会话时显示，也可通过 `hermes sessions list` 查找。

### 恢复时的对话回顾

恢复会话时，Hermes 会在输入提示符前以样式化面板展示上次对话的简洁回顾。

恢复模式会展示一个简洁的回顾面板，显示最近的用户和助手对话轮次，然后返回实时输入提示。

回顾面板：

- 显示**用户消息**（金色 `●`）和**助手回复**（绿色 `◆`）
- **截断**过长消息（用户消息 300 字符，助手消息 200 字符/3 行）
- **折叠工具调用**为调用次数和工具名称（例如 `[3 tool calls: terminal, web_search]`）
- **隐藏**系统消息、工具结果和内部推理
- **最多显示**最近 10 轮对话，超出部分显示"... N earlier messages ..."
- 使用**淡色样式**与当前活跃对话区分

要关闭回顾面板并恢复简洁的单行提示，可在 `~/.hermes/config.yaml` 中设置：

```yaml
display:
  resume_display: minimal   # 默认值：full
```

:::tip
会话 ID 格式为 `YYYYMMDD_HHMMSS_<8位十六进制>`，例如 `20250305_091523_a1b2c3d4`。通过 ID 或标题均可恢复会话，`-c` 和 `-r` 都支持这两种方式。
:::

## 会话命名

为会话设置可读的标题，方便后续查找和恢复。

### 自动生成标题

Hermes 会在第一轮对话结束后自动为每个会话生成一个简短的描述性标题（3–7 个词）。该操作在后台线程中通过快速的辅助模型执行，不会增加任何延迟。使用 `hermes sessions list` 或 `hermes sessions browse` 浏览会话时，可以看到自动生成的标题。

自动命名仅触发一次，如果你已手动设置标题，则跳过。

### 手动设置标题

在任意聊天会话（CLI 或网关）中使用 `/title` 斜杠命令：

```
/title my research project
```

标题立即生效。如果此时会话尚未在数据库中创建（例如在发送第一条消息前执行 `/title`），标题会进入队列，待会话启动后应用。

也可以在命令行中重命名已有会话：

```bash
hermes sessions rename 20250305_091523_a1b2c3d4 "refactoring auth module"
```

### 标题规则

- **唯一性**——不能有两个会话共用同一标题
- **最长 100 个字符**——保持列表输出整洁
- **自动净化**——控制字符、零宽字符和 RTL 覆盖字符会被自动去除
- **支持普通 Unicode**——emoji、CJK 字符、带变音符号的字符均可使用

### 压缩时的自动谱系

当会话的上下文被压缩（通过 `/compress` 手动触发或自动触发）时，Hermes 会创建一个新的延续会话。如果原会话有标题，新会话会自动获得带编号的标题：

```
"my project" → "my project #2" → "my project #3"
```

按名称恢复时（`hermes -c "my project"`），会自动选择会话谱系中最新的那个。

### 消息平台中的 /title

`/title` 命令在所有网关平台（Telegram、Discord、Slack、WhatsApp）中均可使用：

- `/title My Research` — 设置会话标题
- `/title` — 显示当前标题

## 会话管理命令

Hermes 通过 `hermes sessions` 提供完整的会话管理命令集：

### 列出会话

```bash
# 列出近期会话（默认显示最近 20 条）
hermes sessions list

# 按平台过滤
hermes sessions list --source telegram

# 显示更多会话
hermes sessions list --limit 50
```

当会话有标题时，输出包含标题、预览和相对时间戳：

```
Title                  Preview                                  Last Active   ID
────────────────────────────────────────────────────────────────────────────────────────────────
refactoring auth       Help me refactor the auth module please   2h ago        20250305_091523_a
my project #3          Can you check the test failures?          yesterday     20250304_143022_e
—                      What's the weather in Las Vegas?          3d ago        20250303_101500_f
```

当所有会话均无标题时，使用更简洁的格式：

```
Preview                                            Last Active   Src    ID
──────────────────────────────────────────────────────────────────────────────────────
Help me refactor the auth module please             2h ago        cli    20250305_091523_a
What's the weather in Las Vegas?                    3d ago        tele   20250303_101500_f
```

### 导出会话

```bash
# 将所有会话导出为 JSONL 文件
hermes sessions export backup.jsonl

# 导出指定平台的会话
hermes sessions export telegram-history.jsonl --source telegram

# 导出单个会话
hermes sessions export session.jsonl --session-id 20250305_091523_a1b2c3d4
```

导出文件每行包含一个 JSON 对象，包含完整的会话元数据和所有消息。

### 删除会话

```bash
# 删除指定会话（需确认）
hermes sessions delete 20250305_091523_a1b2c3d4

# 跳过确认直接删除
hermes sessions delete 20250305_091523_a1b2c3d4 --yes
```

### 重命名会话

```bash
# 设置或修改会话标题
hermes sessions rename 20250305_091523_a1b2c3d4 "debugging auth flow"

# 多词标题在 CLI 中无需引号
hermes sessions rename 20250305_091523_a1b2c3d4 debugging auth flow
```

如果标题已被其他会话使用，会显示错误。

### 清理旧会话

```bash
# 删除 90 天前已结束的会话（默认）
hermes sessions prune

# 自定义时间阈值
hermes sessions prune --older-than 30

# 只清理指定平台的会话
hermes sessions prune --source telegram --older-than 60

# 跳过确认
hermes sessions prune --older-than 30 --yes
```

:::info
清理操作只删除**已结束**的会话（已显式结束或自动重置的会话）。活跃会话不会被清理。
:::

### 会话统计

```bash
hermes sessions stats
```

输出示例：

```
Total sessions: 142
Total messages: 3847
  cli: 89 sessions
  telegram: 38 sessions
  discord: 15 sessions
Database size: 12.4 MB
```

如需深入分析——token 用量、费用估算、工具使用分布和活动规律——请使用 [`hermes insights`](/reference/cli-commands#hermes-insights)。

## 会话搜索工具

Hermes Agent 内置 `session_search` 工具，利用 SQLite 的 FTS5 引擎对所有历史对话进行全文搜索。

### 工作原理

1. FTS5 搜索匹配消息，按相关性排序
2. 按会话分组，取前 N 个唯一会话（默认 3 个）
3. 加载每个会话的对话内容，以匹配位置为中心截取约 10 万字符
4. 发送给快速摘要模型生成针对性摘要
5. 返回每个会话的摘要，包含元数据和上下文片段

### FTS5 查询语法

搜索支持标准 FTS5 查询语法：

- 普通关键词：`docker deployment`
- 短语搜索：`"exact phrase"`
- 布尔操作：`docker OR kubernetes`、`python NOT java`
- 前缀匹配：`deploy*`

### 触发时机

当用户提到过去对话中的内容，或判断存在相关历史上下文时，Hermes Agent 会自动调用 `session_search` 工具，在要求用户重复之前先检索历史记录。

## 各平台会话追踪

### 网关会话

在消息平台上，会话通过根据消息来源确定性生成的会话键来标识：

| 聊天类型 | 默认键格式 | 行为 |
|-----------|--------------------|----------|
| Telegram 私信 | `agent:main:telegram:dm:<chat_id>` | 每个私信聊天对应一个会话 |
| Discord 私信 | `agent:main:discord:dm:<chat_id>` | 每个私信聊天对应一个会话 |
| WhatsApp 私信 | `agent:main:whatsapp:dm:<chat_id>` | 每个私信聊天对应一个会话 |
| 群聊 | `agent:main:<platform>:group:<chat_id>:<user_id>` | 当平台提供用户 ID 时，群内每个用户独立会话 |
| 话题/主题 | `agent:main:<platform>:group:<chat_id>:<thread_id>:<user_id>` | 该话题内每个用户独立会话 |
| 频道 | `agent:main:<platform>:channel:<chat_id>:<user_id>` | 当平台提供用户 ID 时，频道内每个用户独立会话 |

当 Hermes 无法获取共享聊天室的参与者标识符时，会退回为该聊天室使用一个共享会话。

### 共享会话与隔离会话

默认情况下，Hermes 在 `config.yaml` 中使用 `group_sessions_per_user: true`，效果如下：

- Alice 和 Bob 可以在同一个 Discord 频道中与 Hermes 对话，且不共享对话历史
- 一个用户的大量工具调用任务不会污染另一个用户的上下文窗口
- 中断处理也保持按用户隔离，因为运行中的智能体键与隔离的会话键一致

如果你希望使用"频道大脑"共享模式，可以设置：

```yaml
group_sessions_per_user: false
```

这会将群组/频道恢复为每个聊天室共用一个会话，从而保留共享的对话上下文，但同时也会共享 token 费用、中断状态和上下文增长。

### 会话重置策略

网关会话会根据可配置的策略自动重置：

- **idle**——闲置 N 分钟后重置
- **daily**——每天在指定时间重置
- **both**——闲置或每日到点，以先触发者为准
- **none**——永不自动重置

会话自动重置前，Hermes Agent 会先获得一次机会，将当前会话中的重要记忆或技能保存下来。

有**活跃后台进程**的会话无论策略如何，都不会被自动重置。

## 存储位置

| 内容 | 路径 | 说明 |
|------|------|-------------|
| SQLite 数据库 | `~/.hermes/state.db` | 所有会话元数据 + 消息，支持 FTS5 |
| 网关对话记录 | `~/.hermes/sessions/` | 每个会话的 JSONL 记录 + sessions.json 索引 |
| 网关索引 | `~/.hermes/sessions/sessions.json` | 会话键到活跃会话 ID 的映射 |

SQLite 数据库使用 WAL 模式，支持多个并发读取者和单个写入者，非常适合网关的多平台架构。

### 数据库结构

`state.db` 中的核心表：

- **sessions**——会话元数据（id、source、user_id、model、title、时间戳、token 数量）。标题有唯一索引（允许 NULL，仅非 NULL 值需要唯一）。
- **messages**——完整消息历史（role、content、tool_calls、tool_name、token_count）
- **messages_fts**——用于全文搜索消息内容的 FTS5 虚拟表

## 会话过期与清理

### 自动清理

- 网关会话根据配置的重置策略自动重置
- 重置前，Hermes Agent 会保存当前会话中的记忆和技能
- 已结束的会话保留在数据库中，直到手动清理

### 手动清理

```bash
# 清理 90 天前的会话
hermes sessions prune

# 删除指定会话
hermes sessions delete <session_id>

# 清理前先导出备份
hermes sessions export backup.jsonl
hermes sessions prune --older-than 30 --yes
```

:::tip
数据库增长缓慢（几百个会话通常只有 10–15 MB）。清理操作主要用于删除不再需要用于搜索召回的旧对话。
:::
