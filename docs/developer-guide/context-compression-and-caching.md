---
title: "上下文压缩与缓存"
---
# 上下文压缩与缓存

Hermes Agent 采用双重压缩机制与 Anthropic prompt 缓存，在长对话中高效管理 context window 的使用量。

源文件：`agent/context_compressor.py`、`agent/prompt_caching.py`、`gateway/run.py`（会话清理）、`run_agent.py`（搜索 `_compress_context`）


## 双重压缩机制

Hermes 具有两个独立运行的压缩层：

```
                     ┌──────────────────────────┐
  Incoming message   │   Gateway Session Hygiene │  在 context 使用率达 85% 时触发
  ─────────────────► │   (pre-agent, rough est.) │  大型 session 的安全兜底
                     └─────────────┬────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │   Agent ContextCompressor │  在 context 使用率达 50% 时触发（默认）
                     │   (in-loop, real tokens)  │  常规 context 管理
                     └──────────────────────────┘
```

### 1. Gateway 会话清理（85% 阈值）

位于 `gateway/run.py`（搜索 `_maybe_compress_session`）。这是一道**安全兜底**机制，在 agent 处理消息之前运行，用于防止 session 在多轮对话之间（例如 Telegram/Discord 中的隔夜积累）过度增长导致 API 调用失败。

- **阈值**：固定为模型 context 长度的 85%
- **token 来源**：优先使用上一轮实际 API 返回的 token 数；若不可用则回退至基于字符数的粗略估算（`estimate_messages_tokens_rough`）
- **触发条件**：仅在 `len(history) >= 4` 且压缩功能已启用时触发
- **用途**：捕获绕过 agent 自身压缩器的超大 session

Gateway 清理阈值有意高于 agent 压缩器的阈值。若将其设为 50%（与 agent 相同），会导致长 gateway session 在每一轮都过早触发压缩。

### 2. Agent ContextCompressor（50% 阈值，可配置）

位于 `agent/context_compressor.py`。这是**主压缩机制**，在 agent 的工具循环内运行，可访问精确的 API 报告 token 计数。


## 配置

所有压缩设置从 `config.yaml` 的 `compression` 键中读取：

```yaml
compression:
  enabled: true              # 启用/禁用压缩（默认：true）
  threshold: 0.50            # context window 占用比例（默认：0.50 = 50%）
  target_ratio: 0.20         # 保留尾部的比例（默认：0.20）
  protect_last_n: 20         # 受保护的最近消息最小数量（默认：20）
  summary_model: null        # 摘要使用的模型覆盖（默认：使用辅助模型）
```

### 参数说明

| 参数 | 默认值 | 范围 | 说明 |
|-----------|---------|-------|-------------|
| `threshold` | `0.50` | 0.0-1.0 | 当 prompt token 数 ≥ `threshold × context_length` 时触发压缩 |
| `target_ratio` | `0.20` | 0.10-0.80 | 控制尾部保护的 token 预算：`threshold_tokens × target_ratio` |
| `protect_last_n` | `20` | ≥1 | 始终保留的最近消息最小数量 |
| `protect_first_n` | `3` | （硬编码） | 系统提示词与首轮对话始终保留 |

### 计算示例（200K context 模型，使用默认值）

```
context_length       = 200,000
threshold_tokens     = 200,000 × 0.50 = 100,000
tail_token_budget    = 100,000 × 0.20 = 20,000
max_summary_tokens   = min(200,000 × 0.05, 12,000) = 10,000
```


## 压缩算法

`ContextCompressor.compress()` 方法遵循四阶段算法：

### 阶段 1：清除旧工具结果（轻量操作，无需 LLM 调用）

受保护尾部之外的旧工具结果（超过 200 字符）将被替换为：
```
[Old tool output cleared to save context space]
```

这是一个轻量级预处理步骤，可从冗长的工具输出（文件内容、终端输出、搜索结果）中节省大量 token。

### 阶段 2：确定边界

```
┌─────────────────────────────────────────────────────────────┐
│  消息列表                                                    │
│                                                             │
│  [0..2]  ← protect_first_n（系统提示词 + 首轮对话）          │
│  [3..N]  ← 中间轮次 → 生成摘要                              │
│  [N..end] ← 尾部（基于 token 预算或 protect_last_n）         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

尾部保护基于 **token 预算**：从末尾向前遍历，累计 token 数直至预算耗尽。若预算所能保护的消息数少于固定值 `protect_last_n`，则回退使用该固定值。

边界会自动对齐，以避免拆分 tool_call/tool_result 组合。`_align_boundary_backward()` 方法会向前跳过连续的 tool result，找到对应的 assistant 消息，从而保持组合的完整性。

### 阶段 3：生成结构化摘要

使用辅助 LLM，按照结构化模板对中间轮次进行摘要：

```
## Goal
[用户希望完成的目标]

## Constraints & Preferences
[用户偏好、编码风格、约束条件、重要决策]

## Progress
### Done
[已完成的工作——具体文件路径、执行的命令、结果]
### In Progress
[当前进行中的工作]
### Blocked
[遇到的阻碍或问题]

## Key Decisions
[重要的技术决策及其原因]

## Relevant Files
[已读取、修改或创建的文件——附简要说明]

## Next Steps
[接下来需要做的事情]

## Critical Context
[具体数值、错误信息、配置细节]
```

摘要的 token 预算随被压缩内容的规模动态调整：
- 计算公式：`content_tokens × 0.20`（`_SUMMARY_RATIO` 常量）
- 最小值：2,000 tokens
- 最大值：`min(context_length × 0.05, 12,000)` tokens

### 阶段 4：组装压缩后的消息

压缩后的消息列表由以下部分组成：
1. 头部消息（首次压缩时在系统提示词末尾附加说明）
2. 摘要消息（role 经选择，以避免连续相同角色的违规）
3. 尾部消息（保持原样）

孤立的 tool_call/tool_result 对由 `_sanitize_tool_pairs()` 清理：
- 引用了已删除 tool call 的 tool result → 删除
- 其 tool result 已被删除的 tool call → 注入占位结果

### 迭代式重压缩

在后续压缩中，先前的摘要会连同指令一起传给 LLM，要求其**更新**摘要，而非从头重新总结。这样可在多次压缩之间保留信息——"进行中"的事项会迁移至"已完成"，新的进展被添加进来，过时的信息则被移除。

压缩器实例上的 `_previous_summary` 字段用于存储上一次的摘要文本。


## 压缩前后对比示例

### 压缩前（45 条消息，约 95K tokens）

```
[0] system:    "You are a helpful assistant..."（系统提示词）
[1] user:      "Help me set up a FastAPI project"
[2] assistant: <tool_call> terminal: mkdir project </tool_call>
[3] tool:      "directory created"
[4] assistant: <tool_call> write_file: main.py </tool_call>
[5] tool:      "file written (2.3KB)"
    ... 30 more turns of file editing, testing, debugging ...
[38] assistant: <tool_call> terminal: pytest </tool_call>
[39] tool:      "8 passed, 2 failed\n..."  (5KB output)
[40] user:      "Fix the failing tests"
[41] assistant: <tool_call> read_file: tests/test_api.py </tool_call>
[42] tool:      "import pytest\n..."  (3KB)
[43] assistant: "I see the issue with the test fixtures..."
[44] user:      "Great, also add error handling"
```

### 压缩后（25 条消息，约 45K tokens）

```
[0] system:    "You are a helpful assistant...
               [Note: Some earlier conversation turns have been compacted...]"
[1] user:      "Help me set up a FastAPI project"
[2] assistant: "[CONTEXT COMPACTION] Earlier turns were compacted...

               ## Goal
               Set up a FastAPI project with tests and error handling

               ## Progress
               ### Done
               - Created project structure: main.py, tests/, requirements.txt
               - Implemented 5 API endpoints in main.py
               - Wrote 10 test cases in tests/test_api.py
               - 8/10 tests passing

               ### In Progress
               - Fixing 2 failing tests (test_create_user, test_delete_user)

               ## Relevant Files
               - main.py — FastAPI app with 5 endpoints
               - tests/test_api.py — 10 test cases
               - requirements.txt — fastapi, pytest, httpx

               ## Next Steps
               - Fix failing test fixtures
               - Add error handling"
[3] user:      "Fix the failing tests"
[4] assistant: <tool_call> read_file: tests/test_api.py </tool_call>
[5] tool:      "import pytest\n..."
[6] assistant: "I see the issue with the test fixtures..."
[7] user:      "Great, also add error handling"
```


## Prompt 缓存（Anthropic）

源文件：`agent/prompt_caching.py`

通过缓存对话前缀，可将多轮对话的输入 token 成本降低约 75%。使用 Anthropic 的 `cache_control` 断点机制。

### 策略：system_and_3

Anthropic 每次请求最多允许 4 个 `cache_control` 断点。Hermes 使用 "system_and_3" 策略：

```
断点 1：系统提示词                          （在所有轮次中保持稳定）
断点 2：倒数第 3 条非系统消息  ─┐
断点 3：倒数第 2 条非系统消息   ├─ 滚动窗口
断点 4：最后一条非系统消息     ─┘
```

### 工作原理

`apply_anthropic_cache_control()` 对消息进行深拷贝，并注入 `cache_control` 标记：

```python
# cache 标记格式
marker = {"type": "ephemeral"}
# 或使用 1 小时 TTL：
marker = {"type": "ephemeral", "ttl": "1h"}
```

标记的注入位置因内容类型而异：

| 内容类型 | 标记位置 |
|-------------|-------------------|
| 字符串内容 | 转换为 `[{"type": "text", "text": ..., "cache_control": ...}]` |
| 列表内容 | 添加至最后一个元素的 dict 中 |
| None/空内容 | 作为 `msg["cache_control"]` 添加 |
| Tool 消息 | 作为 `msg["cache_control"]` 添加（仅限原生 Anthropic） |

### 缓存友好的设计模式

1. **保持系统提示词稳定**：系统提示词是断点 1，在所有轮次中均被缓存。避免在对话过程中修改它（压缩操作仅在首次压缩时追加说明）。

2. **消息顺序很重要**：缓存命中需要前缀匹配。在消息列表中间插入或删除消息，会使其后所有内容的缓存失效。

3. **压缩与缓存的交互**：压缩后，被压缩区域的缓存会失效，但系统提示词缓存得以保留。滚动的 3 条消息窗口可在 1-2 轮内重新建立缓存。

4. **TTL 选择**：默认为 `5m`（5 分钟）。对于用户在轮次之间有较长间隔的长时 session，建议使用 `1h`。

### 启用 Prompt 缓存

满足以下条件时，prompt 缓存自动启用：
- 模型为 Anthropic Claude 系列（通过模型名称识别）
- provider 支持 `cache_control`（原生 Anthropic API 或 OpenRouter）

```yaml
# config.yaml — TTL 可配置
model:
  cache_ttl: "5m"   # "5m" 或 "1h"
```

CLI 在启动时显示缓存状态：
```
💾 Prompt caching: ENABLED (Claude via OpenRouter, 5m TTL)
```


## 上下文压力警告

当 context 使用量达到压缩阈值的 85% 时，agent 会发出上下文压力警告（注意：不是 context 总量的 85%，而是阈值的 85%，而阈值本身为 context 总量的 50%）：

```
⚠️  Context is 85% to compaction threshold (42,500/50,000 tokens)
```

压缩完成后，若使用量降至阈值的 85% 以下，警告状态将被清除。若压缩未能将使用量降至警告水位以下（对话内容过于密集），警告将持续显示，但在使用量再次超过阈值之前不会重新触发压缩。
