---
title: "ACP 内部机制"
---
# ACP 内部机制

ACP（Agent 通信协议）适配器将 Hermes 的同步 `AIAgent` 封装为异步 JSON-RPC stdio 服务器。

关键实现文件：

- `acp_adapter/entry.py`
- `acp_adapter/server.py`
- `acp_adapter/session.py`
- `acp_adapter/events.py`
- `acp_adapter/permissions.py`
- `acp_adapter/tools.py`
- `acp_adapter/auth.py`
- `acp_registry/agent.json`

## 启动流程

```text
hermes acp / hermes-acp / python -m acp_adapter
  -> acp_adapter.entry.main()
  -> load ~/.hermes/.env
  -> configure stderr logging
  -> construct HermesACPAgent
  -> acp.run_agent(agent)
```

stdout 保留给 ACP JSON-RPC 传输使用，供人阅读的日志输出至 stderr。

## 主要组件

### `HermesACPAgent`

`acp_adapter/server.py` 实现了 ACP agent 协议。

职责：

- 初始化与认证
- new/load/resume/fork/list/cancel 等会话方法
- 执行提示词
- 切换会话模型
- 将同步 AIAgent 回调接入 ACP 异步通知

### `SessionManager`

`acp_adapter/session.py` 跟踪活跃的 ACP 会话。

每个会话存储：

- `session_id`
- `agent`
- `cwd`
- `model`
- `history`
- `cancel_event`

该管理器是线程安全的，支持：

- create
- get
- remove
- fork
- list
- cleanup
- cwd updates

### 事件桥接

`acp_adapter/events.py` 将 AIAgent 回调转换为 ACP `session_update` 事件。

已桥接的回调：

- `tool_progress_callback`
- `thinking_callback`
- `step_callback`
- `message_callback`

由于 `AIAgent` 在工作线程中运行，而 ACP I/O 位于主事件循环，事件桥接采用：

```python
asyncio.run_coroutine_threadsafe(...)
```

### 权限桥接

`acp_adapter/permissions.py` 将终端中危险操作的审批提示适配为 ACP 权限请求。

映射关系：

- `allow_once` -> Hermes `once`
- `allow_always` -> Hermes `always`
- 拒绝选项 -> Hermes `deny`

超时和桥接失败时默认拒绝。

### 工具渲染辅助

`acp_adapter/tools.py` 将 Hermes 工具映射到 ACP 工具类型，并构建面向编辑器的内容。

示例：

- `patch` / `write_file` -> 文件差异（diff）
- `terminal` -> Shell 命令文本
- `read_file` / `search_files` -> 文本预览
- 超大结果 -> 截断文本块（保障 UI 安全）

## 会话生命周期

```text
new_session(cwd)
  -> create SessionState
  -> create AIAgent(platform="acp", enabled_toolsets=["hermes-acp"])
  -> bind task_id/session_id to cwd override

prompt(..., session_id)
  -> extract text from ACP content blocks
  -> reset cancel event
  -> install callbacks + approval bridge
  -> run AIAgent in ThreadPoolExecutor
  -> update session history
  -> emit final agent message chunk
```

### 取消操作

`cancel(session_id)`：

- 设置会话取消事件
- 在可用时调用 `agent.interrupt()`
- 使提示词响应返回 `stop_reason="cancelled"`

### 会话 fork

`fork_session()` 将消息历史深拷贝至一个新的活跃会话，为 fork 分配独立的 session ID 与工作目录（cwd），同时保留原有对话状态。

## Provider 与认证行为

ACP 不实现自己的认证存储。

它复用 Hermes 的运行时解析器：

- `acp_adapter/auth.py`
- `hermes_cli/runtime_provider.py`

因此 ACP 会声明并使用当前已配置的 Hermes provider 与凭据。

## 工作目录绑定

ACP 会话携带编辑器的工作目录（cwd）。

会话管理器通过任务作用域的终端/文件覆盖，将该 cwd 绑定到 ACP 会话 ID，使文件和终端工具相对于编辑器工作区运行。

## 同名工具的重复调用

事件桥接按工具名称使用 FIFO（先进先出）队列跟踪工具 ID，而非每个工具名只保留一个 ID。这对以下场景至关重要：

- 并行同名调用
- 同一步骤内重复同名调用

若不使用 FIFO 队列，完成事件将会附加到错误的工具调用上。

## 审批回调的恢复

ACP 在执行提示词期间临时为终端工具安装审批回调，执行完成后恢复之前的回调。这避免了将特定 ACP 会话的审批处理器永久安装在全局范围内。

## 当前限制

- ACP 会话从 ACP 服务器的视角来看是进程本地的
- 请求文本提取时，非文本类型提示词块目前会被忽略
- 编辑器特定的用户体验因 ACP 客户端实现而异

## 相关文件

- `tests/acp/` — ACP 测试套件
- `toolsets.py` — `hermes-acp` 工具集定义
- `hermes_cli/main.py` — `hermes acp` CLI 子命令
- `pyproject.toml` — `[acp]` 可选依赖及 `hermes-acp` 脚本
