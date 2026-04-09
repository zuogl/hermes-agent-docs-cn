---
title: "Gateway 内部机制"
---
# Gateway 内部机制

消息 gateway 是一个长期运行的进程，通过统一架构将 Hermes 接入 14 个以上的外部消息平台。

## 核心文件

| 文件 | 用途 |
|------|---------|
| `gateway/run.py` | `GatewayRunner` — 主循环、slash command 处理、消息分发（约 7,500 行） |
| `gateway/session.py` | `SessionStore` — 会话持久化与 session key 构建 |
| `gateway/delivery.py` | 向目标平台/频道发送出站消息 |
| `gateway/pairing.py` | 用于用户授权的 DM 配对流程 |
| `gateway/channel_directory.py` | 将 chat ID 映射为可读名称，用于定时任务投递 |
| `gateway/hooks.py` | Hook 发现、加载与生命周期事件分发 |
| `gateway/mirror.py` | `send_message` 的跨 session 消息镜像 |
| `gateway/status.py` | 按 profile 范围管理 gateway 实例的 token 锁 |
| `gateway/builtin_hooks/` | 始终注册的内置 hook（如 BOOT.md 系统提示 hook） |
| `gateway/platforms/` | 各消息平台的 adapter（每个平台一个） |

## 架构概览

```text
┌─────────────────────────────────────────────────┐
│                 GatewayRunner                     │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Telegram  │  │ Discord  │  │  Slack   │  ...  │
│  │ Adapter   │  │ Adapter  │  │ Adapter  │       │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘       │
│        │              │              │             │
│        └──────────────┼──────────────┘             │
│                       ▼                            │
│              _handle_message()                     │
│                       │                            │
│          ┌────────────┼────────────┐               │
│          ▼            ▼            ▼               │
│   Slash command   AIAgent      队列/后台            │
│      分发          创建          session            │
│                       │                            │
│                       ▼                            │
│              SessionStore                          │
│           （SQLite 持久化）                         │
└─────────────────────────────────────────────────┘
```

## 消息流程

当任意平台收到消息时：

1. **Platform adapter** 接收原始事件，将其规范化为 `MessageEvent`
2. **Base adapter** 检查活跃 session 守卫：
   - 若该 session 的 agent 正在运行 → 将消息加入队列，并设置中断事件
   - 若为 `/approve`、`/deny`、`/stop` → 绕过守卫（直接内联分发）
3. **GatewayRunner._handle_message()** 接收事件：
   - 通过 `_session_key_for_source()` 解析 session key（格式：`agent:main:{platform}:{chat_type}:{chat_id}`）
   - 检查授权（参见下方"授权"章节）
   - 判断是否为 slash command → 分发至对应命令处理器
   - 判断 agent 是否已在运行 → 拦截 `/stop`、`/status` 等命令
   - 否则 → 创建 `AIAgent` 实例并执行对话
4. **响应** 通过 platform adapter 返回

### Session Key 格式

Session key 编码了完整的路由上下文：

```
agent:main:{platform}:{chat_type}:{chat_id}
```

示例：`agent:main:telegram:private:123456789`

支持线程的平台（Telegram 论坛话题、Discord 线程、Slack 线程）可能在 chat_id 部分包含线程 ID。**请勿手动构造 session key** — 请始终使用 `gateway/session.py` 中的 `build_session_key()`。

### 双层消息守卫

当 agent 正在运行时，传入消息会依次经过两层守卫：

1. **第一层 — Base adapter**（`gateway/platforms/base.py`）：检查 `_active_sessions`。若 session 处于活跃状态，将消息加入 `_pending_messages` 队列并设置中断事件。此层在消息到达 gateway runner **之前**进行拦截。

2. **第二层 — Gateway runner**（`gateway/run.py`）：检查 `_running_agents`。拦截特定命令（`/stop`、`/new`、`/queue`、`/status`、`/approve`、`/deny`）并进行相应路由。其余所有命令触发 `running_agent.interrupt()`。

必须在 agent 阻塞时仍能到达 runner 的命令（如 `/approve`）通过 `await self._message_handler(event)` **内联分发** — 绕过后台任务系统以避免竞态条件。

## 授权

Gateway 按顺序进行多层授权检查：

1. **平台级全员放行标志**（如 `TELEGRAM_ALLOW_ALL_USERS`）— 若设置，该平台所有用户均被授权
2. **平台白名单**（如 `TELEGRAM_ALLOWED_USERS`）— 逗号分隔的用户 ID 列表
3. **DM 配对** — 已授权用户可通过配对码为新用户授权
4. **全局全员放行**（`GATEWAY_ALLOW_ALL_USERS`）— 若设置，所有平台所有用户均被授权
5. **默认：拒绝** — 未授权用户将被拒绝

### DM 配对流程

```text
管理员：/pair
Gateway："配对码：ABC123，请将此码告知用户。"
新用户：ABC123
Gateway："配对成功！您现在已获得授权。"
```

配对状态持久化于 `gateway/pairing.py`，重启后仍然有效。

## Slash Command 分发

Gateway 中所有 slash command 均通过相同的解析流程处理：

1. `hermes_cli/commands.py` 中的 `resolve_command()` 将输入映射为规范名称（处理别名、前缀匹配）
2. 规范名称与 `GATEWAY_KNOWN_COMMANDS` 进行匹配
3. `_handle_message()` 中的处理器依据规范名称进行分发
4. 部分命令受配置项限制（`CommandDef` 上的 `gateway_config_gate`）

### 运行中 Agent 守卫

在 agent 处理消息期间不得执行的命令将被提前拒绝：

```python
if _quick_key in self._running_agents:
    if canonical == "model":
        return "⏳ Agent is running — wait for it to finish or /stop first."
```

绕过命令（`/stop`、`/new`、`/approve`、`/deny`、`/queue`、`/status`）有特殊处理逻辑。

## 配置来源

Gateway 从多个来源读取配置：

| 来源 | 提供内容 |
|--------|-----------------|
| `~/.hermes/.env` | API 密钥、bot token、各平台凭据 |
| `~/.hermes/config.yaml` | 模型设置、工具配置、显示选项 |
| 环境变量 | 覆盖以上任意配置 |

与 CLI（使用 `load_cli_config()` 并内置默认值）不同，gateway 通过 YAML loader 直接读取 `config.yaml`。这意味着，存在于 CLI 默认值字典但不存在于用户配置文件中的配置项，在 CLI 与 gateway 之间的行为可能有所差异。

## Platform Adapter

每个消息平台在 `gateway/platforms/` 下均有对应的 adapter：

```text
gateway/platforms/
├── base.py              # BaseAdapter — 所有平台的共享逻辑
├── telegram.py          # Telegram Bot API（长轮询或 webhook）
├── discord.py           # 基于 discord.py 的 Discord bot
├── slack.py             # Slack Socket Mode
├── whatsapp.py          # WhatsApp Business Cloud API
├── signal.py            # 通过 signal-cli REST API 接入 Signal
├── matrix.py            # 通过 matrix-nio 接入 Matrix（可选 E2EE）
├── mattermost.py        # Mattermost WebSocket API
├── email.py             # 通过 IMAP/SMTP 收发邮件
├── sms.py               # 通过 Twilio 收发短信
├── dingtalk.py          # 钉钉 WebSocket
├── feishu.py            # 飞书/Lark WebSocket 或 webhook
├── wecom.py             # 企业微信（WeCom）回调
├── bluebubbles.py       # 通过 BlueBubbles macOS 服务器接入 Apple iMessage
├── webhook.py           # 入站/出站 webhook adapter
├── api_server.py        # REST API server adapter
└── homeassistant.py     # Home Assistant 对话集成
```

Adapter 实现统一接口：
- `connect()` / `disconnect()` — 生命周期管理
- `send_message()` — 出站消息发送
- `on_message()` — 入站消息规范化 → `MessageEvent`

### Token 锁

使用唯一凭据建立连接的 adapter 在 `connect()` 时调用 `acquire_scoped_lock()`，在 `disconnect()` 时调用 `release_scoped_lock()`。这可防止两个 profile 同时使用同一个 bot token。

## 消息投递路径

出站投递（`gateway/delivery.py`）处理以下场景：

- **直接回复** — 将响应发回发起对话的聊天
- **主频道投递** — 将定时任务输出和后台结果路由至已配置的主频道
- **指定目标投递** — `send_message` 工具指定 `telegram:-1001234567890`
- **跨平台投递** — 投递至与原始消息不同的平台

定时任务的投递**不会**被镜像至 gateway session 历史记录 — 它们只存在于各自的定时任务 session 中。这是有意为之的设计决策，以避免消息交替违规。

## Hooks

Gateway hook 是响应生命周期事件的 Python 模块。

### Gateway Hook 事件

| 事件 | 触发时机 |
|-------|-----------|
| `gateway:startup` | Gateway 进程启动时 |
| `session:start` | 新会话开始时 |
| `session:end` | 会话完成或超时时 |
| `session:reset` | 用户通过 `/new` 重置会话时 |
| `agent:start` | Agent 开始处理消息时 |
| `agent:step` | Agent 完成一次工具调用迭代时 |
| `agent:end` | Agent 处理完毕并返回响应时 |
| `command:*` | 任意 slash command 被执行时 |

Hook 从 `gateway/builtin_hooks/`（始终启用）和 `~/.hermes/hooks/`（用户安装）中发现。每个 hook 是一个包含 `HOOK.yaml` 清单文件和 `handler.py` 的目录。

## Memory Provider 集成

当 memory provider 插件（如 Honcho）启用时：

1. Gateway 为每条消息创建一个带有 session ID 的 `AIAgent`
2. `MemoryManager` 使用 session 上下文初始化 provider
3. Provider 工具（如 `honcho_profile`、`viking_search`）通过以下路径路由：

```text
AIAgent._invoke_tool()
  → self._memory_manager.handle_tool_call(name, args)
    → provider.handle_tool_call(name, args)
```

4. 会话结束/重置时，`on_session_end()` 触发，执行清理和最终数据刷写

### Memory 刷写生命周期

当 session 被重置、恢复或过期时：
1. 内置 memory 刷写至磁盘
2. Memory provider 的 `on_session_end()` hook 触发
3. 一个临时 `AIAgent` 执行仅含 memory 的对话轮次
4. 上下文随后被丢弃或归档

## 后台维护

Gateway 在处理消息的同时运行定期维护任务：

- **Cron 调度** — 检查任务计划并触发到期任务
- **Session 过期** — 超时后清理废弃 session
- **Memory 刷写** — 在 session 过期前主动刷写 memory
- **缓存刷新** — 刷新模型列表和 provider 状态

## 进程管理

Gateway 作为长期运行进程运行，通过以下方式管理：

- `hermes gateway start` / `hermes gateway stop` — 手动控制
- `systemctl`（Linux）或 `launchctl`（macOS）— 服务管理
- PID 文件位于 `~/.hermes/gateway.pid` — 按 profile 范围追踪进程

**按 profile 范围 vs 全局**：`start_gateway()` 使用按 profile 范围的 PID 文件。`hermes gateway stop` 仅停止当前 profile 的 gateway。`hermes gateway stop --all` 通过全局 `ps aux` 扫描终止所有 gateway 进程（用于更新时）。

## 相关文档

- [Session 存储](/developer-guide/session-storage)
- [Cron 内部机制](/developer-guide/cron-internals)
- [ACP 内部机制](/developer-guide/acp-internals)
- [Agent 循环内部机制](/developer-guide/agent-loop)
- [消息 Gateway（用户指南）](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
