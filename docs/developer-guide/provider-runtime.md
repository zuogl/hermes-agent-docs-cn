---
title: "Provider 运行时解析"
---
# Provider 运行时解析

Hermes 拥有一个共享的 provider 运行时解析器，用于以下各模块：

- CLI
- gateway
- cron jobs
- ACP
- 辅助模型调用

主要实现文件：

- `hermes_cli/runtime_provider.py` — 凭据解析，`_resolve_custom_runtime()`
- `hermes_cli/auth.py` — provider 注册表，`resolve_provider()`
- `hermes_cli/model_switch.py` — 共享 `/model` 切换流水线（CLI + gateway）
- `agent/auxiliary_client.py` — 辅助模型路由

如果您想要添加新的一等推理 provider，请结合 [添加 Provider](/developer-guide/adding-providers) 一同阅读本文。

## 解析优先级

总体而言，provider 解析依次遵循以下优先级：

1. 显式 CLI/运行时请求
2. `config.yaml` 中的 model/provider 配置
3. 环境变量
4. provider 特定默认值或自动解析

该顺序至关重要，因为 Hermes 将已保存的 model/provider 选择视为正常运行的唯一可信来源。这可以防止 shell 中过期的环境变量导出静默覆盖用户上次在 `hermes model` 中选定的端点。

## Provider 列表

当前支持的 provider 系列包括：

- AI Gateway（Vercel）
- OpenRouter
- Nous Portal
- OpenAI Codex
- Copilot / Copilot ACP
- Anthropic（原生）
- Google / Gemini
- Alibaba / DashScope
- DeepSeek
- Z.AI
- Kimi / Moonshot
- MiniMax
- MiniMax China
- Kilo Code
- Hugging Face
- OpenCode Zen / OpenCode Go
- Custom（`provider: custom`）— 支持任意 OpenAI 兼容端点的一等 provider
- 具名自定义 provider（config.yaml 中的 `custom_providers` 列表）

## 运行时解析的输出

运行时解析器返回的数据包括：

- `provider`
- `api_mode`
- `base_url`
- `api_key`
- `source`
- provider 特定元数据，如过期/刷新信息

## 为何重要

该解析器是 Hermes 能够在以下场景之间共享 auth/运行时逻辑的核心原因：

- `hermes chat`
- gateway 消息处理
- 在全新 session 中运行的 cron jobs
- ACP 编辑器 session
- 辅助模型任务

## AI Gateway

在 `~/.hermes/.env` 中设置 `AI_GATEWAY_API_KEY`，并使用 `--provider ai-gateway` 运行。Hermes 会从 gateway 的 `/models` 端点获取可用模型列表，并筛选出支持工具调用的语言模型。

## OpenRouter、AI Gateway 与自定义 OpenAI 兼容 base URL

当同时存在多个 provider 密钥（如 `OPENROUTER_API_KEY`、`AI_GATEWAY_API_KEY` 和 `OPENAI_API_KEY`）时，Hermes 包含相应逻辑，避免将错误的 API key 泄漏到自定义端点。

每个 provider 的 API key 仅作用于其对应的 base URL：

- `OPENROUTER_API_KEY` 仅发送至 `openrouter.ai` 端点
- `AI_GATEWAY_API_KEY` 仅发送至 `ai-gateway.vercel.sh` 端点
- `OPENAI_API_KEY` 用于自定义端点，并作为兜底选项

Hermes 还会区分以下两种情形：

- 用户主动选择的真实自定义端点
- 未配置自定义端点时使用的 OpenRouter 回退路径

这一区分在以下场景中尤为重要：

- 本地模型服务器
- 非 OpenRouter/非 AI Gateway 的 OpenAI 兼容 API
- 无需重新运行配置即可切换 provider
- 通过配置保存的自定义端点，即使当前 shell 未导出 `OPENAI_BASE_URL` 也能正常使用

## Anthropic 原生路径

Anthropic 不再仅限于"通过 OpenRouter"方式接入。

当 provider 解析选中 `anthropic` 时，Hermes 使用：

- `api_mode = anthropic_messages`
- Anthropic Messages 原生 API
- `agent/anthropic_adapter.py` 进行适配转换

Anthropic 原生路径的凭据解析现在优先使用可刷新的 Claude Code 凭据，而非复制的环境变量 token（当两者同时存在时）。实际效果如下：

- 若 Claude Code 凭据文件包含可刷新的 auth，则优先使用
- 手动设置的 `ANTHROPIC_TOKEN` / `CLAUDE_CODE_OAUTH_TOKEN` 仍可作为显式覆盖
- Hermes 在调用原生 Messages API 前会预先刷新 Anthropic 凭据
- Hermes 在重建 Anthropic 客户端后仍会在收到 401 时重试一次，作为兜底路径

## OpenAI Codex 路径

Codex 使用独立的 Responses API 路径：

- `api_mode = codex_responses`
- 专用的凭据解析与 auth 存储支持

## 辅助模型路由

以下辅助任务：

- 视觉（vision）
- 网页内容提取摘要
- 上下文压缩摘要
- session 搜索摘要
- skills hub 操作
- MCP 辅助操作
- memory 刷新

可使用独立于主对话模型的 provider/model 路由。

当辅助任务配置的 provider 为 `main` 时，Hermes 会通过与普通对话相同的共享运行时路径进行解析。实际效果如下：

- 由环境变量驱动的自定义端点仍然有效
- 通过 `hermes model` / `config.yaml` 保存的自定义端点也同样有效
- 辅助路由能够区分真实保存的自定义端点与 OpenRouter 回退路径

## 回退模型

Hermes 支持配置回退 model/provider 对，允许在主模型遇到错误时进行运行时故障转移。

### 内部实现原理

1. **存储**：`AIAgent.__init__` 存储 `fallback_model` 字典，并将 `_fallback_activated` 初始化为 `False`。

2. **触发点**：`_try_activate_fallback()` 在 `run_agent.py` 主重试循环的三处位置被调用：
   - API 响应无效（None choices、缺少 content）达到最大重试次数后
   - 不可重试的客户端错误（HTTP 401、403、404）
   - 瞬时错误（HTTP 429、500、502、503）达到最大重试次数后

3. **激活流程**（`_try_activate_fallback`）：
   - 若已激活或未配置，立即返回 `False`
   - 调用 `auxiliary_client.py` 中的 `resolve_provider_client()`，使用正确的 auth 构建新客户端
   - 确定 `api_mode`：openai-codex 使用 `codex_responses`，anthropic 使用 `anthropic_messages`，其余均使用 `chat_completions`
   - 原地替换：`self.model`、`self.provider`、`self.base_url`、`self.api_mode`、`self.client`、`self._client_kwargs`
   - 对于 anthropic 回退：构建原生 Anthropic 客户端而非 OpenAI 兼容客户端
   - 重新评估 prompt caching（OpenRouter 上的 Claude 模型启用）
   - 将 `_fallback_activated` 设为 `True`，防止再次触发
   - 将重试计数重置为 0 并继续循环

4. **配置流程**：
   - CLI：`cli.py` 读取 `CLI_CONFIG["fallback_model"]`，传递给 `AIAgent(fallback_model=...)`
   - Gateway：`gateway/run.py._load_fallback_model()` 读取 `config.yaml`，传递给 `AIAgent`
   - 校验：`provider` 和 `model` 键均须非空，否则禁用回退

### 不支持回退的场景

- **子 agent 委托**（`tools/delegate_tool.py`）：子 agent 继承父 agent 的 provider，但不继承回退配置
- **Cron jobs**（`cron/`）：以固定 provider 运行，不支持回退机制
- **辅助任务**：使用各自独立的 provider 自动检测链（参见上方辅助模型路由章节）

### 测试覆盖

请参阅 `tests/test_fallback_model.py`，其中包含覆盖所有支持 provider、单次触发语义及边界情况的完整测试。

## 相关文档

- [Agent 循环内部机制](/developer-guide/agent-loop)
- [ACP 内部机制](/developer-guide/acp-internals)
- [上下文压缩与 Prompt Caching](/developer-guide/context-compression-and-caching)
