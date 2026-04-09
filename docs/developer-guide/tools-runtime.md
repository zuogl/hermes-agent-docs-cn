---
title: "工具运行时"
---
# 工具运行时

Hermes 工具是自注册函数，按工具集分组，通过中央注册表/调度系统执行。

核心文件：

- `tools/registry.py`
- `model_tools.py`
- `toolsets.py`
- `tools/terminal_tool.py`
- `tools/environments/*`

## 工具注册模型

每个工具模块在导入时调用 `registry.register(...)`。

`model_tools.py` 负责导入/发现工具模块，并构建供模型使用的 schema 列表。

### `registry.register()` 的工作原理

`tools/` 目录中的每个工具文件都在模块级别调用 `registry.register()`，以完成自身声明。函数签名如下：

```python
registry.register(
    name="terminal",               # 唯一工具名称（用于 API schema）
    toolset="terminal",            # 该工具所属的工具集
    schema={...},                  # OpenAI function-calling schema（描述、参数）
    handler=handle_terminal,       # 工具被调用时执行的函数
    check_fn=check_terminal,       # 可选：返回 True/False 表示是否可用
    requires_env=["SOME_VAR"],     # 可选：所需的环境变量（用于 UI 展示）
    is_async=False,                # handler 是否为异步协程
    description="Run commands",    # 人类可读的描述
    emoji="💻",                    # 用于进度条/旋转动画的 Emoji
)
```

每次调用会创建一个 `ToolEntry`，存入单例 `ToolRegistry._tools` 字典，以工具名称为键。若不同工具集之间发生名称冲突，系统会记录警告，后注册的工具将覆盖先前的。

### 发现机制：`_discover_tools()`

`model_tools.py` 被导入时，会调用 `_discover_tools()`，按序导入所有工具模块：

```python
_modules = [
    "tools.web_tools",
    "tools.terminal_tool",
    "tools.file_tools",
    "tools.vision_tools",
    "tools.mixture_of_agents_tool",
    "tools.image_generation_tool",
    "tools.skills_tool",
    "tools.skill_manager_tool",
    "tools.browser_tool",
    "tools.cronjob_tools",
    "tools.rl_training_tool",
    "tools.tts_tool",
    "tools.todo_tool",
    "tools.memory_tool",
    "tools.session_search_tool",
    "tools.clarify_tool",
    "tools.code_execution_tool",
    "tools.delegate_tool",
    "tools.process_registry",
    "tools.send_message_tool",
    # "tools.honcho_tools",  # 已移除 — Honcho 现已作为内存提供商插件
    "tools.homeassistant_tool",
]
```

每次导入都会触发该模块的 `registry.register()` 调用。可选工具的错误（例如图像生成所需的 `fal_client` 缺失）会被捕获并记录日志——不会阻止其他工具的加载。

核心工具发现完成后，还会发现 MCP 工具和插件工具：

1. **MCP 工具** — `tools.mcp_tool.discover_mcp_tools()` 读取 MCP 服务器配置，注册来自外部服务器的工具。
2. **插件工具** — `hermes_cli.plugins.discover_plugins()` 加载用户/项目/pip 插件，这些插件可能注册额外的工具。

## 工具可用性检测（`check_fn`）

每个工具都可选地提供一个 `check_fn`——一个返回 `True`（可用）或 `False`（不可用）的可调用对象。典型检测包括：

- **API 密钥存在** — 例如 `lambda: bool(os.environ.get("SERP_API_KEY"))`（用于网络搜索）
- **服务运行中** — 例如检查 Honcho 服务器是否已配置
- **二进制文件已安装** — 例如验证浏览器工具所需的 `playwright` 是否可用

当 `registry.get_definitions()` 为模型构建 schema 列表时，会运行每个工具的 `check_fn()`：

```python
# 简化自 registry.py
if entry.check_fn:
    try:
        available = bool(entry.check_fn())
    except Exception:
        available = False   # 异常 = 不可用
    if not available:
        continue            # 跳过此工具
```

关键行为：
- 检测结果**在本次构建中缓存** — 若多个工具共享同一 `check_fn`，只执行一次检测。
- `check_fn()` 中的异常被视为"不可用"（故障安全）。
- `is_toolset_available()` 方法检查工具集的 `check_fn` 是否通过，用于 UI 展示和工具集解析。

## 工具集解析

工具集是具名的工具集合。Hermes 通过以下方式解析工具集：

- 显式的启用/禁用工具集列表
- 平台预设（`hermes-cli`、`hermes-telegram` 等）
- 动态 MCP 工具集
- 精选的特殊用途集合，如 `hermes-acp`

### `get_tool_definitions()` 如何过滤工具

主入口为 `model_tools.get_tool_definitions(enabled_toolsets, disabled_toolsets, quiet_mode)`：

1. **若提供了 `enabled_toolsets`** — 仅包含这些工具集中的工具。每个工具集名称通过 `resolve_toolset()` 解析，将复合工具集展开为单个工具名称。

2. **若提供了 `disabled_toolsets`** — 从所有工具集开始，减去已禁用的工具集。

3. **若均未提供** — 包含所有已知工具集。

4. **注册表过滤** — 解析后的工具名称集合传递给 `registry.get_definitions()`，该函数应用 `check_fn` 过滤并返回 OpenAI 格式的 schema。

5. **动态 schema 修补** — 过滤后，`execute_code` 和 `browser_navigate` 的 schema 会被动态调整，只引用实际通过过滤的工具（防止模型产生对不可用工具的幻觉）。

### 遗留工具集名称

带有 `_tools` 后缀的旧工具集名称（例如 `web_tools`、`terminal_tools`）通过 `_LEGACY_TOOLSET_MAP` 映射到当前工具名称，以保证向后兼容。

## 调度

运行时，工具通过中央注册表调度执行，但部分智能体级别的工具（如 memory/todo/session-search）会在智能体循环中直接处理，绕过注册表调度。

### 调度流程：模型 tool_call → 处理器执行

当模型返回 `tool_call` 时，调度流程如下：

```
模型响应 tool_call
    ↓
run_agent.py 智能体循环
    ↓
model_tools.handle_function_call(name, args, task_id, user_task)
    ↓
[智能体循环工具？] → 由智能体循环直接处理（todo、memory、session_search、delegate_task）
    ↓
[插件前置钩子] → invoke_hook("pre_tool_call", ...)
    ↓
registry.dispatch(name, args, **kwargs)
    ↓
按名称查找 ToolEntry
    ↓
[异步处理器？] → 通过 _run_async() 桥接
[同步处理器？]  → 直接调用
    ↓
返回结果字符串（或 JSON 错误）
    ↓
[插件后置钩子] → invoke_hook("post_tool_call", ...)
```

### 错误封装

所有工具执行均在两个层级进行错误处理：

1. **`registry.dispatch()`** — 捕获处理器抛出的任何异常，以 JSON 格式返回 `{"error": "Tool execution failed: ExceptionType: message"}`。

2. **`handle_function_call()`** — 在调度外层再包裹一层 try/except，返回 `{"error": "Error executing tool_name: message"}`。

这确保模型始终收到格式完整的 JSON 字符串，而不会遭遇未处理的异常。

### 智能体循环工具

以下四个工具在注册表调度前被拦截，因为它们需要智能体级别的状态（TodoStore、MemoryStore 等）：

- `todo` — 规划/任务跟踪
- `memory` — 持久化内存写入
- `session_search` — 跨会话召回
- `delegate_task` — 生成子智能体会话

这些工具的 schema 仍在注册表中注册（用于 `get_tool_definitions`），但若调度意外直达它们，其处理器会返回 stub 错误（占位响应）。

### 异步桥接

当工具处理器为异步函数时，`_run_async()` 将其桥接到同步调度路径：

- **CLI 路径（无运行中的事件循环）** — 使用持久事件循环，保持已缓存的异步客户端存活
- **网关路径（有运行中的事件循环）** — 创建一次性线程并以 `asyncio.run()` 执行
- **工作线程（并行工具）** — 使用存储在线程本地存储中的每线程持久事件循环

## DANGEROUS_PATTERNS 审批流程

终端工具集成了一套危险命令审批系统，定义于 `tools/approval.py`：

1. **模式检测** — `DANGEROUS_PATTERNS` 是一组 `(正则表达式, 描述)` 元组，覆盖破坏性操作：
   - 递归删除（`rm -rf`）
   - 文件系统格式化（`mkfs`、`dd`）
   - SQL 破坏性操作（`DROP TABLE`、不含 `WHERE` 的 `DELETE FROM`）
   - 系统配置覆写（`> /etc/`）
   - 服务操控（`systemctl stop`）
   - 远程代码执行（`curl | sh`）
   - Fork 炸弹、进程终止等

2. **检测** — 在执行任何终端命令前，`detect_dangerous_command(command)` 检查所有模式。

3. **审批提示** — 若匹配到危险模式：
   - **CLI 模式** — 交互式提示，用户可选择批准、拒绝或永久允许
   - **网关模式** — 异步审批回调，将请求发送至消息平台
   - **智能审批** — 可选地，由辅助 LLM 自动批准低风险命令（例如 `rm -rf node_modules/` 匹配"递归删除"模式，但实际安全）

4. **会话状态** — 审批按会话跟踪。一旦在本次会话中批准了"递归删除"，后续 `rm -rf` 命令不再提示确认。

5. **永久白名单** — "永久允许"选项会将模式写入 `config.yaml` 的 `command_allowlist`，跨会话持久保存。

## 终端/运行时环境

终端系统支持多种后端：

- local（本地）
- docker
- ssh
- singularity
- modal
- daytona

同时支持：

- 基于任务的工作目录（cwd）覆盖
- 后台进程管理
- PTY 模式
- 危险命令的审批回调

## 并发

工具调用可顺序执行，也可并发执行，具体取决于工具组合和交互需求。

## 相关文档

- [工具集参考](/reference/toolsets-reference)
- [内置工具参考](/reference/tools-reference)
- [智能体循环内部机制](/developer-guide/agent-loop)
- [ACP 内部机制](/developer-guide/acp-internals)
