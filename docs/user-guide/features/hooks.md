---
title: "事件钩子"
---
# 事件钩子

Hermes 提供两套钩子系统，可在关键生命周期节点运行自定义代码：

| 系统 | 注册方式 | 运行环境 | 使用场景 |
|--------|---------------|---------|----------|
| **[Gateway 钩子](#gateway-event-hooks)** | `~/.hermes/hooks/` 下的 `HOOK.yaml` + `handler.py` | 仅 Gateway | 日志、告警、Webhook |
| **[插件钩子](#plugin-hooks)** | 在[插件](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)中通过 `ctx.register_hook()` 注册 | CLI + Gateway | 工具拦截、指标采集、护栏 |

两套系统均为非阻塞式——任何钩子中的错误都会被捕获并记录，不会导致智能体崩溃。

## Gateway 事件钩子

Gateway 钩子在 Gateway 运行期间（Telegram、Discord、Slack、WhatsApp）自动触发，不会阻塞智能体主流水线。

### 创建钩子

每个钩子是 `~/.hermes/hooks/` 下的一个目录，包含两个文件：

```text
~/.hermes/hooks/
└── my-hook/
    ├── HOOK.yaml      # 声明要监听的事件
    └── handler.py     # Python 处理函数
```

#### HOOK.yaml

```yaml
name: my-hook
description: Log all agent activity to a file
events:
  - agent:start
  - agent:end
  - agent:step
```

`events` 列表决定哪些事件触发你的处理器。可以订阅任意组合的事件，包括 `command:*` 等通配符。

#### handler.py

```python
import json
from datetime import datetime
from pathlib import Path

LOG_FILE = Path.home() / ".hermes" / "hooks" / "my-hook" / "activity.log"

async def handle(event_type: str, context: dict):
    """每个已订阅事件触发时调用此函数，函数名必须为 'handle'。"""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "event": event_type,
        **context,
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
```

**处理器规则：**
- 函数名必须为 `handle`
- 接收 `event_type`（字符串）和 `context`（字典）
- 可以是 `async def` 或普通 `def`——两者均可
- 错误会被捕获并记录，不会导致智能体崩溃

### 可用事件

| 事件 | 触发时机 | Context 键 |
|-------|---------------|--------------|
| `gateway:startup` | Gateway 进程启动 | `platforms`（活跃平台名称列表） |
| `session:start` | 新消息会话创建 | `platform`、`user_id`、`session_id`、`session_key` |
| `session:end` | 会话结束（重置前） | `platform`、`user_id`、`session_key` |
| `session:reset` | 用户执行 `/new` 或 `/reset` | `platform`、`user_id`、`session_key` |
| `agent:start` | 智能体开始处理消息 | `platform`、`user_id`、`session_id`、`message` |
| `agent:step` | 工具调用循环的每次迭代 | `platform`、`user_id`、`session_id`、`iteration`、`tool_names` |
| `agent:end` | 智能体完成处理 | `platform`、`user_id`、`session_id`、`message`、`response` |
| `command:*` | 任意斜杠命令执行 | `platform`、`user_id`、`command`、`args` |

#### 通配符匹配

注册了 `command:*` 的处理器会对任何 `command:` 事件（`command:model`、`command:reset` 等）触发。只需一个订阅即可监控所有斜杠命令。

### 示例

#### 启动清单（BOOT.md）——内置

Gateway 内置了一个 `boot-md` 钩子，每次启动时查找 `~/.hermes/BOOT.md`。如果该文件存在，智能体会在后台会话中执行其中的指令。无需安装——创建文件即可使用。

**创建 `~/.hermes/BOOT.md`：**

```markdown
# Startup Checklist

1. Check if any cron jobs failed overnight — run `hermes cron list`
2. Send a message to Discord #general saying "Gateway restarted, all systems go"
3. Check if /opt/app/deploy.log has any errors from the last 24 hours
```

智能体在后台线程中执行这些指令，不会阻塞 Gateway 启动。如果无需处理，智能体会回复 `[SILENT]`，不发送任何消息。

:::tip
没有 BOOT.md？钩子会静默跳过——零开销。需要启动自动化时创建文件，不需要时删除即可。
:::

#### Telegram 长任务告警

当智能体执行超过 10 步时向自己发送消息：

```yaml
# ~/.hermes/hooks/long-task-alert/HOOK.yaml
name: long-task-alert
description: Alert when agent is taking many steps
events:
  - agent:step
```

```python
# ~/.hermes/hooks/long-task-alert/handler.py
import os
import httpx

THRESHOLD = 10
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_HOME_CHANNEL")

async def handle(event_type: str, context: dict):
    iteration = context.get("iteration", 0)
    if iteration == THRESHOLD and BOT_TOKEN and CHAT_ID:
        tools = ", ".join(context.get("tool_names", []))
        text = f"⚠️ Agent has been running for {iteration} steps. Last tools: {tools}"
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": CHAT_ID, "text": text},
            )
```

#### 命令使用日志

记录斜杠命令的使用情况：

```yaml
# ~/.hermes/hooks/command-logger/HOOK.yaml
name: command-logger
description: Log slash command usage
events:
  - command:*
```

```python
# ~/.hermes/hooks/command-logger/handler.py
import json
from datetime import datetime
from pathlib import Path

LOG = Path.home() / ".hermes" / "logs" / "command_usage.jsonl"

def handle(event_type: str, context: dict):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": datetime.now().isoformat(),
        "command": context.get("command"),
        "args": context.get("args"),
        "platform": context.get("platform"),
        "user": context.get("user_id"),
    }
    with open(LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")
```

#### 会话开始 Webhook

新会话时向外部服务发送 POST 请求：

```yaml
# ~/.hermes/hooks/session-webhook/HOOK.yaml
name: session-webhook
description: Notify external service on new sessions
events:
  - session:start
  - session:reset
```

```python
# ~/.hermes/hooks/session-webhook/handler.py
import httpx

WEBHOOK_URL = "https://your-service.example.com/hermes-events"

async def handle(event_type: str, context: dict):
    async with httpx.AsyncClient() as client:
        await client.post(WEBHOOK_URL, json={
            "event": event_type,
            **context,
        }, timeout=5)
```

### 工作原理

1. Gateway 启动时，`HookRegistry.discover_and_load()` 扫描 `~/.hermes/hooks/`
2. 每个包含 `HOOK.yaml` + `handler.py` 的子目录会被动态加载
3. 处理器按声明的事件进行注册
4. 在每个生命周期节点，`hooks.emit()` 触发所有匹配的处理器
5. 任何处理器中的错误都会被捕获并记录——损坏的钩子永远不会使智能体崩溃

:::info
Gateway 钩子只在 **Gateway**（Telegram、Discord、Slack、WhatsApp）中触发。CLI 不加载 Gateway 钩子。如需在任何地方都能运行的钩子，请使用[插件钩子](#plugin-hooks)。
:::

## 插件钩子

[插件](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)可以注册在 **CLI 和 Gateway** 会话中均可触发的钩子。这些钩子通过插件 `register()` 函数中的 `ctx.register_hook()` 以编程方式注册。

```python
def register(ctx):
    ctx.register_hook("pre_tool_call", my_tool_observer)
    ctx.register_hook("post_tool_call", my_tool_logger)
    ctx.register_hook("pre_llm_call", my_memory_callback)
    ctx.register_hook("post_llm_call", my_sync_callback)
    ctx.register_hook("on_session_start", my_init_callback)
    ctx.register_hook("on_session_end", my_cleanup_callback)
```

**所有钩子的通用规则：**

- 回调函数接收**关键字参数**。始终接受 `**kwargs` 以保证向前兼容——未来版本可能新增参数，但不会破坏你的插件。
- 如果回调函数**崩溃**，错误会被记录并跳过，其他钩子和智能体继续正常运行。行为异常的插件永远不会破坏智能体。
- 所有钩子均为**即发即忘的观察者**，返回值会被忽略——`pre_llm_call` 除外，它可以[注入上下文](#pre_llm_call)。

### 快速参考

| 钩子 | 触发时机 | 返回值 |
|------|-----------|---------|
| [`pre_tool_call`](#pre_tool_call) | 任意工具执行前 | 忽略 |
| [`post_tool_call`](#post_tool_call) | 任意工具返回后 | 忽略 |
| [`pre_llm_call`](#pre_llm_call) | 每轮一次，工具调用循环开始前 | 上下文注入 |
| [`post_llm_call`](#post_llm_call) | 每轮一次，工具调用循环结束后 | 忽略 |
| [`on_session_start`](#on_session_start) | 新会话创建（仅第一轮） | 忽略 |
| [`on_session_end`](#on_session_end) | 会话结束 | 忽略 |

---

### `pre_tool_call`

在每次工具执行**之前**立即触发——包括内置工具和插件工具。

**回调签名：**

```python
def my_callback(tool_name: str, args: dict, task_id: str, **kwargs):
```

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `tool_name` | `str` | 即将执行的工具名称（如 `"terminal"`、`"web_search"`、`"read_file"`） |
| `args` | `dict` | 模型传给工具的参数 |
| `task_id` | `str` | 会话/任务标识符。未设置时为空字符串。 |

**触发位置：** 在 `model_tools.py` 的 `handle_function_call()` 中，工具处理器运行前。每次工具调用触发一次——如果模型并行调用 3 个工具，则触发 3 次。

**返回值：** 忽略。

**使用场景：** 日志记录、审计跟踪、工具调用计数、阻断危险操作（打印警告）、速率限制。

**示例——工具调用审计日志：**

```python
import json, logging
from datetime import datetime

logger = logging.getLogger(__name__)

def audit_tool_call(tool_name, args, task_id, **kwargs):
    logger.info("TOOL_CALL session=%s tool=%s args=%s",
                task_id, tool_name, json.dumps(args)[:200])

def register(ctx):
    ctx.register_hook("pre_tool_call", audit_tool_call)
```

**示例——对危险工具发出警告：**

```python
DANGEROUS = {"terminal", "write_file", "patch"}

def warn_dangerous(tool_name, **kwargs):
    if tool_name in DANGEROUS:
        print(f"⚠ Executing potentially dangerous tool: {tool_name}")

def register(ctx):
    ctx.register_hook("pre_tool_call", warn_dangerous)
```

---

### `post_tool_call`

在每次工具执行返回**之后**立即触发。

**回调签名：**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str, **kwargs):
```

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `tool_name` | `str` | 刚刚执行完的工具名称 |
| `args` | `dict` | 模型传给工具的参数 |
| `result` | `str` | 工具的返回值（始终为 JSON 字符串） |
| `task_id` | `str` | 会话/任务标识符。未设置时为空字符串。 |

**触发位置：** 在 `model_tools.py` 的 `handle_function_call()` 中，工具处理器返回后。每次工具调用触发一次。若工具抛出未处理的异常，该异常会被捕获并作为错误 JSON 字符串返回——此时 `post_tool_call` **仍会触发**，`result` 参数即为该错误字符串。

**返回值：** 忽略。

**使用场景：** 记录工具结果、指标采集、跟踪工具成功/失败率、在特定工具完成时发送通知。

**示例——工具使用指标跟踪：**

```python
from collections import Counter
import json

_tool_counts = Counter()
_error_counts = Counter()

def track_metrics(tool_name, result, **kwargs):
    _tool_counts[tool_name] += 1
    try:
        parsed = json.loads(result)
        if "error" in parsed:
            _error_counts[tool_name] += 1
    except (json.JSONDecodeError, TypeError):
        pass

def register(ctx):
    ctx.register_hook("post_tool_call", track_metrics)
```

---

### `pre_llm_call`

**每轮触发一次**，在工具调用循环开始前。这是**唯一使用返回值的钩子**——它可以向当前轮次的用户消息注入上下文。

**回调签名：**

```python
def my_callback(session_id: str, user_message: str, conversation_history: list,
                is_first_turn: bool, model: str, platform: str, **kwargs):
```

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `session_id` | `str` | 当前会话的唯一标识符 |
| `user_message` | `str` | 本轮用户的原始消息（技能注入前） |
| `conversation_history` | `list` | 完整消息列表的副本（OpenAI 格式：`[{"role": "user", "content": "..."}]`） |
| `is_first_turn` | `bool` | 新会话的第一轮为 `True`，后续轮次为 `False` |
| `model` | `str` | 模型标识符（如 `"anthropic/claude-sonnet-4.6"`） |
| `platform` | `str` | 会话运行环境：`"cli"`、`"telegram"`、`"discord"` 等 |

**触发位置：** 在 `run_agent.py` 的 `run_conversation()` 中，上下文压缩之后、主 `while` 循环之前。每次 `run_conversation()` 调用触发一次（即每个用户轮次触发一次），而非工具循环内每次 API 调用触发一次。

**返回值：** 如果回调返回包含 `"context"` 键的字典，或非空的纯字符串，该文本将被追加到当前轮次的用户消息中。返回 `None` 则不注入。

```python
# 注入上下文
return {"context": "Recalled memories:\n- User likes Python\n- Working on hermes-agent"}

# 纯字符串（等效写法）
return "Recalled memories:\n- User likes Python"

# 不注入
return None
```

**上下文注入位置：** 始终注入到**用户消息**，而非系统提示词。这样可以保护提示词缓存——系统提示词在各轮次保持一致，缓存的 token 得以复用。系统提示词属于 Hermes 的领域（模型引导、工具强制、个性、技能）。插件在用户输入旁边贡献上下文。

所有注入的上下文均为**临时性的**——仅在 API 调用时添加。会话历史中的原始用户消息不会被修改，也不会持久化到会话数据库。

当**多个插件**返回上下文时，它们的输出按插件发现顺序（目录名字母顺序）以双换行符拼接。

**使用场景：** 记忆召回、RAG 上下文注入、护栏、逐轮分析。

**示例——记忆召回：**

```python
import httpx

MEMORY_API = "https://your-memory-api.example.com"

def recall(session_id, user_message, is_first_turn, **kwargs):
    try:
        resp = httpx.post(f"{MEMORY_API}/recall", json={
            "session_id": session_id,
            "query": user_message,
        }, timeout=3)
        memories = resp.json().get("results", [])
        if not memories:
            return None
        text = "Recalled context:\n" + "\n".join(f"- {m['text']}" for m in memories)
        return {"context": text}
    except Exception:
        return None

def register(ctx):
    ctx.register_hook("pre_llm_call", recall)
```

**示例——护栏：**

```python
POLICY = "Never execute commands that delete files without explicit user confirmation."

def guardrails(**kwargs):
    return {"context": POLICY}

def register(ctx):
    ctx.register_hook("pre_llm_call", guardrails)
```

---

### `post_llm_call`

**每轮触发一次**，在工具调用循环完成且智能体产生最终响应后触发。仅在**成功**的轮次触发——轮次被中断时不触发。

**回调签名：**

```python
def my_callback(session_id: str, user_message: str, assistant_response: str,
                conversation_history: list, model: str, platform: str, **kwargs):
```

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `session_id` | `str` | 当前会话的唯一标识符 |
| `user_message` | `str` | 本轮用户的原始消息 |
| `assistant_response` | `str` | 智能体本轮的最终文本响应 |
| `conversation_history` | `list` | 本轮完成后完整消息列表的副本 |
| `model` | `str` | 模型标识符 |
| `platform` | `str` | 会话运行环境 |

**触发位置：** 在 `run_agent.py` 的 `run_conversation()` 中，工具循环以最终响应退出后。由 `if final_response and not interrupted` 条件保护——用户在轮次中途中断，或智能体达到迭代上限但未产生响应时，均**不会**触发。

**返回值：** 忽略。

**使用场景：** 将对话数据同步到外部记忆系统、计算响应质量指标、记录轮次摘要、触发后续操作。

**示例——同步到外部记忆：**

```python
import httpx

MEMORY_API = "https://your-memory-api.example.com"

def sync_memory(session_id, user_message, assistant_response, **kwargs):
    try:
        httpx.post(f"{MEMORY_API}/store", json={
            "session_id": session_id,
            "user": user_message,
            "assistant": assistant_response,
        }, timeout=5)
    except Exception:
        pass  # best-effort

def register(ctx):
    ctx.register_hook("post_llm_call", sync_memory)
```

**示例——跟踪响应长度：**

```python
import logging
logger = logging.getLogger(__name__)

def log_response_length(session_id, assistant_response, model, **kwargs):
    logger.info("RESPONSE session=%s model=%s chars=%d",
                session_id, model, len(assistant_response or ""))

def register(ctx):
    ctx.register_hook("post_llm_call", log_response_length)
```

---

### `on_session_start`

在全新会话创建时**触发一次**。会话续接时（用户在已有会话中发送第二条消息）**不会**触发。

**回调签名：**

```python
def my_callback(session_id: str, model: str, platform: str, **kwargs):
```

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `session_id` | `str` | 新会话的唯一标识符 |
| `model` | `str` | 模型标识符 |
| `platform` | `str` | 会话运行环境 |

**触发位置：** 在 `run_agent.py` 的 `run_conversation()` 中，新会话第一轮时触发——具体在系统提示词组装完成之后、工具循环开始之前。判断条件为 `if not conversation_history`（无历史消息 = 新会话）。

**返回值：** 忽略。

**使用场景：** 初始化会话级状态、预热缓存、向外部服务注册会话、记录会话启动。

**示例——初始化会话缓存：**

```python
_session_caches = {}

def init_session(session_id, model, platform, **kwargs):
    _session_caches[session_id] = {
        "model": model,
        "platform": platform,
        "tool_calls": 0,
        "started": __import__("datetime").datetime.now().isoformat(),
    }

def register(ctx):
    ctx.register_hook("on_session_start", init_session)
```

---

### `on_session_end`

在每次 `run_conversation()` 调用**结束时**触发，无论结果如何。如果用户在轮次进行中退出，也会从 CLI 的 atexit 处理器中触发。

**回调签名：**

```python
def my_callback(session_id: str, completed: bool, interrupted: bool,
                model: str, platform: str, **kwargs):
```

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `session_id` | `str` | 会话的唯一标识符 |
| `completed` | `bool` | 智能体产生最终响应为 `True`，否则为 `False` |
| `interrupted` | `bool` | 轮次被中断（用户发送新消息、`/stop` 或退出）为 `True` |
| `model` | `str` | 模型标识符 |
| `platform` | `str` | 会话运行环境 |

**触发位置：** 两处：
1. **`run_agent.py`** — 每次 `run_conversation()` 调用结束后，所有清理完成后触发。始终触发，即使轮次出错。
2. **`cli.py`** — 在 CLI 的 atexit 处理器中，但**仅当**退出时智能体正处于轮次中（`_agent_running=True`）。捕获处理中发生的 Ctrl+C 和 `/exit`。此时 `completed=False`，`interrupted=True`。

**返回值：** 忽略。

**使用场景：** 刷新缓冲区、关闭连接、持久化会话状态、记录会话时长、清理 `on_session_start` 中初始化的资源。

**示例——刷新并清理：**

```python
_session_caches = {}

def cleanup_session(session_id, completed, interrupted, **kwargs):
    cache = _session_caches.pop(session_id, None)
    if cache:
        # 将累积数据刷新到磁盘或外部服务
        status = "completed" if completed else ("interrupted" if interrupted else "failed")
        print(f"Session {session_id} ended: {status}, {cache['tool_calls']} tool calls")

def register(ctx):
    ctx.register_hook("on_session_end", cleanup_session)
```

**示例——会话时长跟踪：**

```python
import time, logging
logger = logging.getLogger(__name__)

_start_times = {}

def on_start(session_id, **kwargs):
    _start_times[session_id] = time.time()

def on_end(session_id, completed, interrupted, **kwargs):
    start = _start_times.pop(session_id, None)
    if start:
        duration = time.time() - start
        logger.info("SESSION_DURATION session=%s seconds=%.1f completed=%s interrupted=%s",
                     session_id, duration, completed, interrupted)

def register(ctx):
    ctx.register_hook("on_session_start", on_start)
    ctx.register_hook("on_session_end", on_end)
```

---

完整演练（包括工具 schema、处理器及高级钩子模式）请参阅 **[插件构建指南](https://hermes-agent.nousresearch.com/docs/guides/build-a-hermes-plugin)**。
