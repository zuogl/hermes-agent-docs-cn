---
title: "子智能体委派"
---
# 子智能体委派

`delegate_task` 工具可以创建子 AIAgent 实例，每个实例拥有隔离的上下文、受限的工具集以及独立的终端会话。每个子智能体获得全新的对话，独立工作——只有其最终摘要会进入父智能体的上下文。

## 单任务

```python
delegate_task(
    goal="Debug why tests fail",
    context="Error: assertion in test_foo.py line 42",
    toolsets=["terminal", "file"]
)
```

## 并行批处理

最多 3 个并发子智能体：

```python
delegate_task(tasks=[
    {"goal": "Research topic A", "toolsets": ["web"]},
    {"goal": "Research topic B", "toolsets": ["web"]},
    {"goal": "Fix the build", "toolsets": ["terminal", "file"]}
])
```

## 子智能体上下文的工作方式

:::caution
子智能体对父上下文一无所知
子智能体以**全新的对话**开始。它们对父智能体的对话历史、之前的工具调用或委派前讨论的任何内容毫无了解。子智能体的唯一上下文来自你提供的 `goal` 和 `context` 字段。
:::

这意味着你必须把子智能体所需的**一切**都传递进去：

```python
# 错误示范 - 子智能体不知道"the error"是什么
delegate_task(goal="Fix the error")

# 正确示范 - 子智能体拥有所需的全部上下文
delegate_task(
    goal="Fix the TypeError in api/handlers.py",
    context="""The file api/handlers.py has a TypeError on line 47:
    'NoneType' object has no attribute 'get'.
    The function process_request() receives a dict from parse_body(),
    but parse_body() returns None when Content-Type is missing.
    The project is at /home/user/myproject and uses Python 3.11."""
)
```

子智能体会收到一个根据你的 goal 和 context 构建的专注 system prompt，指示它完成任务并提供结构化摘要，包括：已完成的操作、发现的内容、修改的文件以及遇到的问题。

## 实战示例

### 并行调研

同时调研多个主题并收集摘要：

```python
delegate_task(tasks=[
    {
        "goal": "Research the current state of WebAssembly in 2025",
        "context": "Focus on: browser support, non-browser runtimes, language support",
        "toolsets": ["web"]
    },
    {
        "goal": "Research the current state of RISC-V adoption in 2025",
        "context": "Focus on: server chips, embedded systems, software ecosystem",
        "toolsets": ["web"]
    },
    {
        "goal": "Research quantum computing progress in 2025",
        "context": "Focus on: error correction breakthroughs, practical applications, key players",
        "toolsets": ["web"]
    }
])
```

### 代码审查 + 修复

将审查与修复工作流委派给全新的上下文：

```python
delegate_task(
    goal="Review the authentication module for security issues and fix any found",
    context="""Project at /home/user/webapp.
    Auth module files: src/auth/login.py, src/auth/jwt.py, src/auth/middleware.py.
    The project uses Flask, PyJWT, and bcrypt.
    Focus on: SQL injection, JWT validation, password handling, session management.
    Fix any issues found and run the test suite (pytest tests/auth/).""",
    toolsets=["terminal", "file"]
)
```

### 多文件重构

将大型重构任务委派出去，避免大量占用父智能体的上下文：

```python
delegate_task(
    goal="Refactor all Python files in src/ to replace print() with proper logging",
    context="""Project at /home/user/myproject.
    Use the 'logging' module with logger = logging.getLogger(__name__).
    Replace print() calls with appropriate log levels:
    - print(f"Error: ...") -> logger.error(...)
    - print(f"Warning: ...") -> logger.warning(...)
    - print(f"Debug: ...") -> logger.debug(...)
    - Other prints -> logger.info(...)
    Don't change print() in test files or CLI output.
    Run pytest after to verify nothing broke.""",
    toolsets=["terminal", "file"]
)
```

## 批处理模式详解

当你提供 `tasks` 数组时，子智能体将使用线程池**并行**运行：

- **最大并发数**：3 个任务（`tasks` 数组超过 3 项时会被截断为 3）
- **线程池**：使用 `ThreadPoolExecutor`，`MAX_CONCURRENT_CHILDREN = 3` 个 worker
- **进度显示**：CLI 模式下，树状视图会实时展示每个子智能体的工具调用，并在每个任务完成时显示完成行；网关模式（gateway mode）下，进度会被批量汇总并转发给父智能体的进度回调
- **结果排序**：结果按任务索引排序，与输入顺序保持一致，不受完成顺序影响
- **中断传播**：中断父智能体（如发送新消息）会同时中断所有活跃的子智能体

单任务委派直接运行，无需线程池开销。

## 模型覆盖

你可以通过 `config.yaml` 为子智能体配置不同的模型——适用于将简单任务委派给更便宜/更快的模型：

```yaml
# 在 ~/.hermes/config.yaml 中
delegation:
  model: "google/gemini-flash-2.0"    # 用于子智能体的更便宜的模型
  provider: "openrouter"              # 可选：将子智能体路由到不同的 provider
```

如果省略，子智能体将使用与父智能体相同的模型。

## 工具集选择建议

`toolsets` 参数控制子智能体能访问哪些工具。根据任务选择：

| 工具集配置 | 适用场景 |
|----------------|----------|
| `["terminal", "file"]` | 代码开发、调试、文件编辑、构建 |
| `["web"]` | 调研、事实核查、文档查阅 |
| `["terminal", "file", "web"]` | 全栈任务（默认） |
| `["file"]` | 只读分析、不执行代码的代码审查 |
| `["terminal"]` | 系统管理、进程管理 |

以下工具集**始终对子智能体屏蔽**，无论你如何指定：
- `delegation` — 禁止递归委派（防止无限生成子智能体）
- `clarify` — 子智能体不能与用户交互
- `memory` — 禁止写入共享持久化内存
- `code_execution` — 子智能体应逐步推理
- `send_message` — 禁止跨平台副作用（如发送 Telegram 消息）

## 最大迭代次数

每个子智能体都有迭代次数上限（默认值：50），控制它可以执行多少次工具调用轮次：

```python
delegate_task(
    goal="Quick file check",
    context="Check if /etc/nginx/nginx.conf exists and print its first 10 lines",
    max_iterations=10  # 简单任务，不需要太多轮次
)
```

## 深度限制

委派有**深度限制为 2**——父智能体（深度 0）可以创建子智能体（深度 1），但子智能体不能再向下委派。这防止了失控的递归委派链。

## 关键属性

- 每个子智能体拥有**独立的终端会话**（与父智能体分开）
- **不支持嵌套委派**——子智能体不能再向下委派（不存在孙子智能体层级）
- 子智能体**不能**调用：`delegate_task`、`clarify`、`memory`、`send_message`、`execute_code`
- **中断传播**——中断父智能体会同时中断所有活跃的子智能体
- 只有最终摘要进入父智能体的上下文，保持 token 使用高效
- 子智能体继承父智能体的 **API 密钥、provider 配置和凭证池**（在触达速率限制时启用密钥轮换）

## 委派 vs execute_code

| 对比项 | delegate_task | execute_code |
|--------|--------------|-------------|
| **推理能力** | 完整 LLM 推理循环 | 仅执行 Python 代码 |
| **上下文** | 全新的隔离对话 | 无对话，只有脚本 |
| **工具访问** | 所有非屏蔽工具，具备推理能力 | 通过 RPC 访问 7 个工具，无推理 |
| **并行度** | 最多 3 个并发子智能体 | 单个脚本 |
| **适用场景** | 需要判断力的复杂任务 | 机械式多步骤流水线 |
| **token 成本** | 较高（完整 LLM 循环） | 较低（仅返回 stdout） |
| **用户交互** | 无（子智能体不能澄清） | 无 |

**经验法则**：当子任务需要推理、判断或多步骤问题解决时，使用 `delegate_task`；当你需要机械式数据处理或脚本化工作流时，使用 `execute_code`。

## 配置

```yaml
# 在 ~/.hermes/config.yaml 中
delegation:
  max_iterations: 50                        # 每个子智能体的最大轮次（默认：50）
  default_toolsets: ["terminal", "file", "web"]  # 默认工具集
  model: "google/gemini-3-flash-preview"             # 可选的 provider/模型覆盖
  provider: "openrouter"                             # 可选的内置 provider

# 或者使用直接的自定义端点替代 provider：
delegation:
  model: "qwen2.5-coder"
  base_url: "http://localhost:1234/v1"
  api_key: "local-key"
```

:::tip
智能体会根据任务复杂度自动处理委派。你无需显式要求它委派——它会在合适的时机自动进行。
:::
