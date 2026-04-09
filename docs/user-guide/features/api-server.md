---
title: "API 服务器"
---
# API 服务器

API 服务器将 Hermes Agent 作为兼容 OpenAI 格式的 HTTP 端点对外暴露。任何支持 OpenAI 格式的前端——Open WebUI、LobeChat、LibreChat、NextChat、ChatBox 以及数百款同类前端——都可以连接到 Hermes Agent 并将其用作后端。

Agent 会使用其完整工具集（终端、文件操作、网页搜索、记忆、技能）处理请求，并返回最终响应。在流式传输模式下，工具执行进度指示会内联出现，让前端能够实时展示 Agent 正在执行的操作。

## 快速开始

### 1. 启用 API 服务器

在 `~/.hermes/.env` 中添加：

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=change-me-local-dev
# 可选：仅当浏览器需要直接调用 Hermes 时才配置
# API_SERVER_CORS_ORIGINS=http://localhost:3000
```

### 2. 启动网关

```bash
hermes gateway
```

启动后将看到：

```
[API Server] API server listening on http://127.0.0.1:8642
```

### 3. 连接前端

将任意兼容 OpenAI 的客户端指向 `http://localhost:8642/v1`：

```bash
# 使用 curl 测试
curl http://localhost:8642/v1/chat/completions \
  -H "Authorization: Bearer change-me-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"model": "hermes-agent", "messages": [{"role": "user", "content": "Hello!"}]}'
```

或者连接 Open WebUI、LobeChat 或其他任意前端——请参阅 [Open WebUI 集成指南](/user-guide/messaging/open-webui) 获取分步说明。

## 端点

### POST /v1/chat/completions

标准 OpenAI Chat Completions 格式。无状态——每次请求通过 `messages` 数组携带完整对话历史。

**请求：**
```json
{
  "model": "hermes-agent",
  "messages": [
    {"role": "system", "content": "You are a Python expert."},
    {"role": "user", "content": "Write a fibonacci function"}
  ],
  "stream": false
}
```

**响应：**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "hermes-agent",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Here's a fibonacci function..."},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 50, "completion_tokens": 200, "total_tokens": 250}
}
```

**流式传输**（`"stream": true`）：以 Server-Sent Events（SSE）格式逐 token 返回响应数据块。配置中启用流式传输时，token 会在 LLM 生成时实时发出；禁用时，完整响应以单个 SSE 数据块发送。

**流中的工具进度**：Agent 在流式请求中调用工具时，工具开始执行时会将简短的进度指示注入到内容流中（例如 `` `💻 pwd` ``、`` `🔍 Python docs` ``）。这些指示以行内 Markdown 形式出现在 Agent 响应文本之前，让 Open WebUI 等前端能够实时了解工具执行情况。

### POST /v1/responses

OpenAI Responses API 格式。通过 `previous_response_id` 支持服务端对话状态——服务器存储完整的对话历史（包括工具调用和结果），无需客户端管理即可保留多轮上下文。

**请求：**
```json
{
  "model": "hermes-agent",
  "input": "What files are in my project?",
  "instructions": "You are a helpful coding assistant.",
  "store": true
}
```

**响应：**
```json
{
  "id": "resp_abc123",
  "object": "response",
  "status": "completed",
  "model": "hermes-agent",
  "output": [
    {"type": "function_call", "name": "terminal", "arguments": "{\"command\": \"ls\"}", "call_id": "call_1"},
    {"type": "function_call_output", "call_id": "call_1", "output": "README.md src/ tests/"},
    {"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "Your project has..."}]}
  ],
  "usage": {"input_tokens": 50, "output_tokens": 200, "total_tokens": 250}
}
```

#### 使用 previous_response_id 进行多轮对话

通过链式响应在多轮之间保留完整上下文（包括工具调用）：

```json
{
  "input": "Now show me the README",
  "previous_response_id": "resp_abc123"
}
```

服务器会从存储的响应链中重建完整对话——所有之前的工具调用和结果均被保留。

#### 命名会话

使用 `conversation` 参数，而无需追踪响应 ID：

```json
{"input": "Hello", "conversation": "my-project"}
{"input": "What's in src/?", "conversation": "my-project"}
{"input": "Run the tests", "conversation": "my-project"}
```

服务器会自动链接到该会话中最新的响应，类似于网关会话中 `/title` 命令的作用。

### GET /v1/responses/\{id\}

通过 ID 检索之前存储的响应。

### DELETE /v1/responses/\{id\}

删除存储的响应。

### GET /v1/models

列出 `hermes-agent` 作为可用模型。大多数前端进行模型发现时需要此端点。

### GET /health

健康检查。返回 `{"status": "ok"}`。也可通过 **GET /v1/health** 访问，供期望 `/v1/` 前缀的兼容 OpenAI 的客户端使用。

## 系统提示词处理

当前端发送 `system` 消息（Chat Completions）或 `instructions` 字段（Responses API）时，Hermes Agent 会将其**叠加在核心系统提示词之上**。Agent 保留所有工具、记忆和技能——前端的系统提示词仅作为额外指令叠加。

这意味着可以在不损失 Agent 能力的情况下按前端定制行为：
- Open WebUI 系统提示词："You are a Python expert. Always include type hints."
- Agent 仍然拥有终端、文件工具、网页搜索、记忆等能力。

## 认证

通过 `Authorization` 请求头进行 Bearer token 认证：

```
Authorization: Bearer ***
```

通过 `API_SERVER_KEY` 环境变量配置密钥。如需让浏览器直接调用 Hermes，还需将 `API_SERVER_CORS_ORIGINS` 设置为明确的白名单。

> ⚠️ **安全警告**：API 服务器可完全访问 Hermes Agent 的工具集，**包括终端命令**。若将绑定地址改为 `0.0.0.0`（允许网络访问），**务必设置 `API_SERVER_KEY`** 并严格限制 `API_SERVER_CORS_ORIGINS` 的范围——否则，远程调用方可能在您的机器上执行任意命令。
>
> 默认绑定地址（`127.0.0.1`）仅限本地使用。浏览器访问默认禁用，仅在明确信任的来源时才应启用。

## 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `API_SERVER_ENABLED` | `false` | 启用 API 服务器 |
| `API_SERVER_PORT` | `8642` | HTTP 服务器端口 |
| `API_SERVER_HOST` | `127.0.0.1` | 绑定地址（默认仅限本地） |
| `API_SERVER_KEY` | _（无）_ | 用于认证的 Bearer token |
| `API_SERVER_CORS_ORIGINS` | _（无）_ | 允许的浏览器来源（逗号分隔） |

### config.yaml

```yaml
# 暂不支持——请使用环境变量。
# config.yaml 支持将在未来版本中提供。
```

## 安全响应头

所有响应均包含安全响应头：
- `X-Content-Type-Options: nosniff` — 防止 MIME 类型嗅探
- `Referrer-Policy: no-referrer` — 防止来源页面信息泄漏

## CORS（跨域资源共享）

API 服务器**默认不启用**浏览器 CORS。

如需浏览器直接访问，请设置明确的白名单：

```bash
API_SERVER_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

启用 CORS 后：
- **预检响应**包含 `Access-Control-Max-Age: 600`（10 分钟缓存）
- **SSE 流式响应**包含 CORS 响应头，确保浏览器 EventSource 客户端正常工作
- **`Idempotency-Key`** 是允许的请求头——客户端可发送此字段用于去重（响应按 key 缓存 5 分钟）

文档中列出的大多数前端（如 Open WebUI）采用服务端直连方式接入，完全不需要 CORS。

## 兼容的前端

任何支持 OpenAI API 格式的前端均可使用。已测试/已文档化的集成：

| 前端 | Stars | 接入方式 |
|------|-------|---------|
| [Open WebUI](/user-guide/messaging/open-webui) | 126k | 有完整指南 |
| LobeChat | 73k | 自定义 Provider 端点 |
| LibreChat | 34k | librechat.yaml 中自定义端点 |
| AnythingLLM | 56k | 通用 OpenAI Provider |
| NextChat | 87k | BASE_URL 环境变量 |
| ChatBox | 39k | API Host 设置 |
| Jan | 26k | 远程模型配置 |
| HF Chat-UI | 8k | OPENAI_BASE_URL |
| big-AGI | 7k | 自定义端点 |
| OpenAI Python SDK | — | `OpenAI(base_url="http://localhost:8642/v1")` |
| curl | — | 直接 HTTP 请求 |

## 限制

- **响应存储**——通过 `previous_response_id` 存储的响应持久化在 SQLite 中，网关重启后仍可用。最多存储 100 条响应（LRU 淘汰）。
- **文件上传**——暂不支持通过 API 上传文件进行图像/文档分析。
- **`model` 字段仅作形式**——请求中的 `model` 字段会被接受，但实际使用的 LLM 模型由服务端的 config.yaml 配置。
