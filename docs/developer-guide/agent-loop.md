---
title: "Agent Loop 内部机制"
---
# Agent Loop 内部机制

核心编排引擎是 `run_agent.py` 中的 `AIAgent` 类 —— 约 9,200 行代码，负责处理从提示词组装、工具分发到 provider 故障转移的所有逻辑。

## 核心职责

`AIAgent` 负责：

- 通过 `prompt_builder.py` 组装有效的系统提示词（system prompt）和工具 schema
- 选择正确的 provider / API 模式（`chat_completions`、`codex_responses`、`anthropic_messages`）
- 发起支持取消操作的可中断模型调用
- 执行工具调用（顺序执行或通过线程池并发执行）
- 以 OpenAI 消息格式维护对话历史
- 处理压缩、重试和回退模型切换
- 跨父子 agent 追踪迭代预算
- 在上下文丢失前将持久化 memory 刷写到磁盘

## 两个入口

```python
# 简单接口 —— 返回最终响应字符串
response = agent.chat("Fix the bug in main.py")

# 完整接口 —— 返回包含消息、元数据和用量统计的 dict
result = agent.run_conversation(
    user_message="Fix the bug in main.py",
    system_message=None,           # 若省略则自动构建
    conversation_history=None,      # 若省略则自动从 session 加载
    task_id="task_abc123"
)
```

`chat()` 是对 `run_conversation()` 的轻量封装，从返回的 dict 中提取 `final_response` 字段。

## API 模式

Hermes 支持三种 API 执行模式，通过 provider 选择、显式参数和 base URL 启发规则来确定：

| API 模式 | 适用场景 | 客户端类型 |
|----------|----------|------------|
| `chat_completions` | OpenAI 兼容端点（OpenRouter、自定义及大多数 provider） | `openai.OpenAI` |
| `codex_responses` | OpenAI Codex / Responses API | `openai.OpenAI`（使用 Responses 格式） |
| `anthropic_messages` | 原生 Anthropic Messages API | `anthropic.Anthropic`（通过适配器） |

模式决定了消息的格式化方式、工具调用的结构、响应的解析方式，以及缓存和 streaming 的工作方式。三种模式在 API 调用前后均统一收敛为相同的内部消息格式（OpenAI 风格的 `role`/`content`/`tool_calls` dict）。

**模式解析顺序：**
1. 显式传入的 `api_mode` 构造参数（最高优先级）
2. Provider 专项检测（例如：`anthropic` provider → `anthropic_messages`）
3. Base URL 启发规则（例如：`api.anthropic.com` → `anthropic_messages`）
4. 默认值：`chat_completions`

## 轮次生命周期

Agent 循环的每次迭代按如下顺序执行：

```text
run_conversation()
  1. 若未提供则生成 task_id
  2. 将用户消息追加到对话历史
  3. 构建或复用已缓存的系统提示词（prompt_builder.py）
  4. 检查是否需要预检压缩（上下文超过 50%）
  5. 从对话历史构建 API 消息
     - chat_completions：直接使用 OpenAI 格式
     - codex_responses：转换为 Responses API 输入项
     - anthropic_messages：通过 anthropic_adapter.py 转换
  6. 注入临时提示词层（预算警告、上下文压力提示）
  7. 若为 Anthropic 则添加提示词缓存标记
  8. 发起可中断的 API 调用（_api_call_with_interrupt）
  9. 解析响应：
     - 若有 tool_calls：执行工具，追加结果，回到步骤 5 循环
     - 若为文本响应：持久化 session，按需刷写 memory，返回
```

### 消息格式

所有消息在内部均使用 OpenAI 兼容格式：

```python
{"role": "system", "content": "..."}
{"role": "user", "content": "..."}
{"role": "assistant", "content": "...", "tool_calls": [...]}
{"role": "tool", "tool_call_id": "...", "content": "..."}
```

推理内容（来自支持扩展思考的模型）存储在 `assistant_msg["reasoning"]` 中，并可通过 `reasoning_callback` 选择性展示。

### 消息交替规则

Agent 循环强制执行严格的消息角色交替：

- 系统消息之后：`User → Assistant → User → Assistant → ...`
- 工具调用期间：`Assistant（含 tool_calls）→ Tool → Tool → ... → Assistant`
- **绝不**连续出现两条 assistant 消息
- **绝不**连续出现两条 user 消息
- **只有** `tool` 角色可以连续出现（并行工具结果）

Provider 会校验这些顺序，格式不合规的历史将被拒绝。

## 可中断的 API 调用

API 请求被封装在 `_api_call_with_interrupt()` 中，实际 HTTP 调用在后台线程执行，同时主线程监听中断事件：

```text
┌──────────────────────┐     ┌──────────────┐
│  主线程               │     │  API 线程     │
│  等待以下事件：        │────▶│  HTTP POST    │
│  - 响应就绪           │     │  到 provider  │
│  - 中断事件           │     └──────────────┘
│  - 超时               │
└──────────────────────┘
```

当被中断（用户发送新消息、执行 `/stop` 命令或收到信号）时：
- API 线程被放弃（响应丢弃）
- agent 可处理新输入或干净地关闭
- 不会将部分响应注入对话历史

## 工具执行

### 顺序执行 vs 并发执行

当模型返回工具调用时：

- **单个工具调用** → 直接在主线程中执行
- **多个工具调用** → 通过 `ThreadPoolExecutor` 并发执行
  - 例外：标记为交互式的工具（如 `clarify`）强制顺序执行
  - 无论完成顺序如何，结果按原始工具调用顺序重新插入

### 执行流程

```text
for each tool_call in response.tool_calls:
    1. 从 tools/registry.py 解析处理器
    2. 触发 pre_tool_call 插件钩子
    3. 检查是否为危险命令（tools/approval.py）
       - 若为危险命令：调用 approval_callback，等待用户确认
    4. 携带参数和 task_id 执行处理器
    5. 触发 post_tool_call 插件钩子
    6. 将 {"role": "tool", "content": result} 追加到历史
```

### Agent 级别工具

部分工具在到达 `handle_function_call()` 之前，由 `run_agent.py` **提前拦截**：

| 工具 | 拦截原因 |
|------|----------|
| `todo` | 读写 agent 本地任务状态 |
| `memory` | 按字符数限制向持久化 memory 文件写入 |
| `session_search` | 通过 agent 的 session DB 查询会话历史 |
| `delegate_task` | 以隔离上下文派生子 agent |

这些工具直接修改 agent 状态，并返回合成的工具结果，不经过注册表。

## 回调接口

`AIAgent` 支持平台专属回调，用于在 CLI、gateway 和 ACP 集成中实现实时进度展示：

| 回调 | 触发时机 | 使用方 |
|------|---------|--------|
| `tool_progress_callback` | 每次工具执行前后 | CLI spinner、gateway 进度消息 |
| `thinking_callback` | 模型开始/停止思考时 | CLI "thinking..." 指示器 |
| `reasoning_callback` | 模型返回推理内容时 | CLI 推理展示、gateway 推理块 |
| `clarify_callback` | 调用 `clarify` 工具时 | CLI 输入提示、gateway 交互消息 |
| `step_callback` | 每个完整 agent 轮次结束后 | gateway 步骤追踪、ACP 进度 |
| `stream_delta_callback` | 每个 streaming token（启用时） | CLI streaming 展示 |
| `tool_gen_callback` | 从 stream 解析到工具调用时 | CLI spinner 中的工具预览 |
| `status_callback` | 状态变更（thinking、executing 等） | ACP 状态更新 |

## 预算与回退行为

### 迭代预算

Agent 通过 `IterationBudget` 追踪迭代次数：

- 默认值：90 次迭代（可通过 `agent.max_turns` 配置）
- 跨父子 agent 共享 —— 子 agent 消耗的是父 agent 的预算
- 通过 `_get_budget_warning()` 实现双层预算压力提示：
  - 使用量达 70%+（警示层）：在最后一条工具结果后追加 `[BUDGET: Iteration X/Y. N iterations left. Start consolidating your work.]`
  - 使用量达 90%+（告警层）：追加 `[BUDGET WARNING: Iteration X/Y. Only N iteration(s) left. Provide your final response NOW.]`
- 达到 100% 时，agent 停止并返回已完成工作的摘要

### 回退模型

当主模型失败时（429 限流、5xx 服务器错误、401/403 认证错误）：

1. 检查配置中的 `fallback_providers` 列表
2. 按顺序依次尝试每个回退项
3. 成功后继续使用新 provider 进行对话
4. 遇到 401/403 时，先尝试刷新凭据，再执行故障转移

回退系统也独立覆盖辅助任务 —— vision、压缩、网页提取和 session 搜索各自拥有独立的回退链，可通过 `auxiliary.*` 配置节进行配置。

## 压缩与持久化

### 压缩触发条件

- **预检触发**（API 调用前）：对话内容超过模型上下文窗口的 50%
- **Gateway 自动压缩**：对话内容超过 85%（更激进，在轮次之间执行）

### 压缩过程

1. 先将 memory 刷写到磁盘（防止数据丢失）
2. 将中间对话轮次压缩为紧凑摘要
3. 保留最后 N 条消息完整不变（`compression.protect_last_n`，默认值：20）
4. 工具调用与结果消息对保持配对（不拆分）
5. 生成新的 session 血缘 ID（压缩会创建一个"子" session）

### Session 持久化

每个轮次结束后：
- 消息保存至 session 存储（通过 `hermes_state.py` 操作 SQLite）
- Memory 变更刷写至 `MEMORY.md` / `USER.md`
- 可通过 `/resume` 或 `hermes chat --resume` 恢复 session

## 主要源文件

| 文件 | 用途 |
|------|------|
| `run_agent.py` | AIAgent 类 —— 完整的 agent 循环（约 9,200 行） |
| `agent/prompt_builder.py` | 从 memory、skill、上下文文件和 personality 组装系统提示词 |
| `agent/context_compressor.py` | 对话压缩算法 |
| `agent/prompt_caching.py` | Anthropic 提示词缓存标记及缓存指标 |
| `agent/auxiliary_client.py` | 辅助 LLM 客户端，用于旁路任务（vision、摘要生成） |
| `model_tools.py` | 工具 schema 收集、`handle_function_call()` 分发 |

## 相关文档

- [Provider 运行时解析](/developer-guide/provider-runtime)
- [提示词组装](/developer-guide/prompt-assembly)
- [上下文压缩与提示词缓存](/developer-guide/context-compression-and-caching)
- [工具运行时](/developer-guide/tools-runtime)
- [架构概览](/developer-guide/architecture)
