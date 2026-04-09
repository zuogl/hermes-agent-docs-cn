---
title: "MCP（模型上下文协议）"
---
# MCP（模型上下文协议）

MCP（Model Context Protocol，模型上下文协议）让 Hermes Agent 能够连接外部工具服务器，使 agent 可以使用 Hermes 本身之外的工具——GitHub、数据库、文件系统、浏览器栈、内部 API 等。

如果你曾希望 Hermes 使用某个已存在于其他地方的工具，MCP 通常是最简洁的实现方式。

## MCP 带来什么

- 无需先编写原生 Hermes 工具，即可访问外部工具生态系统
- 在同一配置中同时支持本地 stdio 服务器和远程 HTTP MCP 服务器
- 启动时自动发现并注册工具
- 在服务器支持的情况下，为 MCP 资源和提示词提供实用工具封装
- 按服务器精细过滤，只向 Hermes 暴露真正需要的 MCP 工具

## 快速开始

1. 安装 MCP 支持（使用标准安装脚本时已包含在内）：

```bash
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"
```

2. 在 `~/.hermes/config.yaml` 中添加一个 MCP 服务器：

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
```

3. 启动 Hermes：

```bash
hermes chat
```

4. 让 Hermes 使用 MCP 提供的能力。

例如：

```text
List the files in /home/user/projects and summarize the repo structure.
```

Hermes 会发现 MCP 服务器的工具，并像使用其他工具一样直接调用它们。

## 两种 MCP 服务器

### Stdio 服务器

Stdio 服务器作为本地子进程运行，通过 stdin/stdout 进行通信。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
```

在以下情况下使用 stdio 服务器：
- 服务器已在本地安装
- 需要低延迟访问本地资源
- 按照显示 `command`、`args` 和 `env` 字段的 MCP 服务器文档进行配置

### HTTP 服务器

HTTP MCP 服务器是 Hermes 直接连接的远程端点。

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer ***"
```

在以下情况下使用 HTTP 服务器：
- MCP 服务器托管在其他地方
- 组织内部暴露了内部 MCP 端点
- 不希望 Hermes 为该集成启动本地子进程

## 基本配置参考

Hermes 从 `~/.hermes/config.yaml` 的 `mcp_servers` 节点下读取 MCP 配置。

### 常用配置键

| 键 | 类型 | 说明 |
|---|---|---|
| `command` | 字符串 | stdio MCP 服务器的可执行文件路径 |
| `args` | 列表 | stdio 服务器的启动参数 |
| `env` | 映射 | 传递给 stdio 服务器的环境变量 |
| `url` | 字符串 | HTTP MCP 端点地址 |
| `headers` | 映射 | 远程服务器的 HTTP 请求头 |
| `timeout` | 数字 | 工具调用超时时间 |
| `connect_timeout` | 数字 | 初始连接超时时间 |
| `enabled` | 布尔值 | 若为 `false`，Hermes 完全跳过该服务器 |
| `tools` | 映射 | 按服务器配置的工具过滤和实用工具策略 |

### 最简 stdio 示例

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
```

### 最简 HTTP 示例

```yaml
mcp_servers:
  company_api:
    url: "https://mcp.internal.example.com"
    headers:
      Authorization: "Bearer ***"
```

## Hermes 如何注册 MCP 工具

Hermes 为 MCP 工具添加前缀，以避免与内置名称冲突：

```text
mcp_<server_name>_<tool_name>
```

示例：

| 服务器 | MCP 工具 | 注册名称 |
|---|---|---|
| `filesystem` | `read_file` | `mcp_filesystem_read_file` |
| `github` | `create-issue` | `mcp_github_create_issue` |
| `my-api` | `query.data` | `mcp_my_api_query_data` |

实际使用中，通常不需要手动调用带前缀的名称——Hermes 在正常推理过程中会自动发现并选用合适的工具。

## MCP 实用工具

在服务器支持的情况下，Hermes 还会为 MCP 资源和提示词注册以下实用工具：

- `list_resources`
- `read_resource`
- `list_prompts`
- `get_prompt`

这些工具按服务器注册，遵循相同的前缀命名规则，例如：

- `mcp_github_list_resources`
- `mcp_github_get_prompt`

### 重要说明

这些实用工具现已具备能力感知功能：
- 只有 MCP 会话实际支持资源操作时，Hermes 才会注册资源实用工具
- 只有 MCP 会话实际支持提示词操作时，Hermes 才会注册提示词实用工具

因此，若某服务器仅暴露可调用工具而不支持资源/提示词，则不会获得这些额外的实用工具。

## 按服务器过滤

你可以控制每个 MCP 服务器向 Hermes 贡献哪些工具，从而精确控制工具命名空间。

### 完全禁用某个服务器

```yaml
mcp_servers:
  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

设置 `enabled: false` 后，Hermes 会完全跳过该服务器，甚至不尝试建立连接。

### 工具白名单

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [create_issue, list_issues]
```

只注册列出的 MCP 服务器工具。

### 工具黑名单

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    tools:
      exclude: [delete_customer]
```

注册所有服务器工具，但排除指定的工具。

### 优先级规则

若两者同时存在：

```yaml
tools:
  include: [create_issue]
  exclude: [create_issue, delete_issue]
```

`include` 优先生效。

### 过滤实用工具

还可以单独禁用 Hermes 添加的实用工具：

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: false
      resources: false
```

含义如下：
- `tools.resources: false` 禁用 `list_resources` 和 `read_resource`
- `tools.prompts: false` 禁用 `list_prompts` 和 `get_prompt`

### 完整示例

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [create_issue, list_issues, search_code]
      prompts: false

  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer]
      resources: false

  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

## 如果所有工具都被过滤掉会怎样？

如果你的配置过滤掉了所有可调用工具，并禁用或省略了所有支持的实用工具，Hermes 不会为该服务器创建空的运行时 MCP 工具集。

这样可以保持工具列表整洁。

## 运行时行为

### 发现时机

Hermes 在启动时发现 MCP 服务器，并将其工具注册到正常的工具注册表中。

### 动态工具发现

MCP 服务器可以通过发送 `notifications/tools/list_changed` 通知，在运行时告知 Hermes 其可用工具发生了变化。收到该通知后，Hermes 会自动重新获取服务器的工具列表并更新注册表——无需手动执行 `/reload-mcp`。

这对于能力会动态变化的 MCP 服务器非常有用（例如，加载新数据库模式时添加工具，或服务下线时移除工具）。

刷新操作受锁保护，防止来自同一服务器的快速连续通知触发重叠刷新。提示词和资源变更通知（`prompts/list_changed`、`resources/list_changed`）会被接收，但目前尚未响应处理。

### 重新加载

如果修改了 MCP 配置，可使用：

```text
/reload-mcp
```

该命令会从配置重新加载 MCP 服务器并刷新可用工具列表。关于服务器主动推送的运行时工具变更，请参阅上方[动态工具发现](#动态工具发现)部分。

### 工具集

每个已配置的 MCP 服务器，若贡献了至少一个已注册工具，也会创建一个运行时工具集：

```text
mcp-<server>
```

这使在工具集层面理解和管理 MCP 服务器更加直观。

## 安全模型

### Stdio 环境变量过滤

对于 stdio 服务器，Hermes 不会盲目传入完整的 shell 环境变量。只有明确配置的 `env` 加上安全基线才会被传递，以降低意外泄露密钥的风险。

### 配置层面的暴露控制

过滤功能同时也是一项安全控制手段：
- 禁用不希望模型看到的危险工具
- 为敏感服务器仅暴露最小化白名单
- 不希望暴露相关接口时，禁用资源/提示词实用工具

## 使用示例

### 使用最小问题管理接口的 GitHub 服务器

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue]
      prompts: false
      resources: false
```

用法示例：

```text
Show me open issues labeled bug, then draft a new issue for the flaky MCP reconnection behavior.
```

### 移除危险操作的 Stripe 服务器

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer, refund_payment]
```

用法示例：

```text
Look up the last 10 failed payments and summarize common failure reasons.
```

### 锁定单个项目根目录的文件系统服务器

```yaml
mcp_servers:
  project_fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/my-project"]
```

用法示例：

```text
Inspect the project root and explain the directory layout.
```

## 故障排查

### MCP 服务器无法连接

检查：

```bash
# 验证 MCP 依赖是否已安装（标准安装已包含）
cd ~/.hermes/hermes-agent && uv pip install -e ".[mcp]"

node --version
npx --version
```

然后验证配置并重启 Hermes。

### 工具未出现

可能原因：
- 服务器连接失败
- 发现过程失败
- 过滤配置排除了这些工具
- 该服务器不支持此实用工具能力
- 服务器被 `enabled: false` 禁用

如果是有意进行的过滤，这属于预期行为。

### 为什么资源或提示词实用工具没有出现？

因为 Hermes 现在只有在以下两个条件同时满足时才注册这些实用工具：
1. 你的配置允许注册
2. 服务器会话实际支持该能力

这是有意为之的设计，可保持工具列表的真实性。

## MCP 采样支持

MCP 服务器可以通过 `sampling/createMessage` 协议向 Hermes 请求 LLM 推理。这使 MCP 服务器能够请求 Hermes 代为完成 LLM 推理——适用于需要 LLM 能力但自身无法直接访问模型的服务器。

采样功能对所有 MCP 服务器**默认启用**（当 MCP SDK 支持时）。可在各服务器的 `sampling` 键下单独配置：

```yaml
mcp_servers:
  my_server:
    command: "my-mcp-server"
    sampling:
      enabled: true            # 启用采样（默认：true）
      model: "openai/gpt-4o"  # 覆盖采样请求使用的模型（可选）
      max_tokens_cap: 4096     # 每次采样响应的最大 token 数（默认：4096）
      timeout: 30              # 每次请求的超时时间，单位秒（默认：30）
      max_rpm: 10              # 速率限制：每分钟最大请求数（默认：10）
      max_tool_rounds: 5       # 采样循环中的最大工具调用轮次（默认：5）
      allowed_models: []       # 服务器可请求的模型白名单（空表示不限制）
      log_level: "info"        # 审计日志级别：debug、info 或 warning（默认：info）
```

采样处理器内置滑动窗口速率限制器、单次请求超时和工具循环深度限制，以防止失控调用。每个服务器实例会跟踪指标（请求数、错误数、token 用量）。

如需为特定服务器禁用采样：

```yaml
mcp_servers:
  untrusted_server:
    url: "https://mcp.example.com"
    sampling:
      enabled: false
```

## 将 Hermes 作为 MCP 服务器运行

除了连接**到** MCP 服务器，Hermes 还可以**作为** MCP 服务器运行。这使其他支持 MCP 的 agent（Claude Code、Cursor、Codex 或任何 MCP 客户端）能够使用 Hermes 的消息功能——列出对话、读取消息历史、以及向所有已连接平台发送消息。

### 适用场景

- 希望 Claude Code、Cursor 或其他编程 agent 通过 Hermes 发送和读取 Telegram/Discord/Slack 消息
- 希望用一个 MCP 服务器桥接 Hermes 连接的所有消息平台
- 已有运行中的 Hermes 网关，且已连接各消息平台

### 快速开始

```bash
hermes mcp serve
```

这将启动一个 stdio MCP 服务器。进程生命周期由 MCP 客户端（而非你）管理。

### MCP 客户端配置

将 Hermes 添加到你的 MCP 客户端配置中。例如，在 Claude Code 的 `~/.claude/claude_desktop_config.json` 中：

```json
{
  "mcpServers": {
    "hermes": {
      "command": "hermes",
      "args": ["mcp", "serve"]
    }
  }
}
```

或者，如果 Hermes 安装在特定位置：

```json
{
  "mcpServers": {
    "hermes": {
      "command": "/home/user/.hermes/hermes-agent/venv/bin/hermes",
      "args": ["mcp", "serve"]
    }
  }
}
```

### 可用工具

MCP 服务器暴露 10 个工具，匹配 OpenClaw 的频道桥接接口以及 Hermes 专属的频道浏览器：

| 工具 | 说明 |
|------|------|
| `conversations_list` | 列出活跃的消息对话，支持按平台过滤或按名称搜索。 |
| `conversation_get` | 通过会话键获取某个对话的详细信息。 |
| `messages_read` | 读取某个对话的最近消息历史。 |
| `attachments_fetch` | 从特定消息中提取非文本附件（图片、媒体文件）。 |
| `events_poll` | 从指定游标位置轮询新的对话事件。 |
| `events_wait` | 长轮询/阻塞，直到下一个事件到达（接近实时）。 |
| `messages_send` | 通过平台发送消息（如 `telegram:123456`、`discord:#general`）。 |
| `channels_list` | 列出所有平台的可用消息目标。 |
| `permissions_list_open` | 列出本次桥接会话中观察到的待审批请求。 |
| `permissions_respond` | 批准或拒绝待审批请求。 |

### 事件系统

MCP 服务器内置实时事件桥接，轮询 Hermes 的会话数据库以获取新消息。这使 MCP 客户端能够近实时感知传入的对话：

```
# 轮询新事件（非阻塞）
events_poll(after_cursor=0)

# 等待下一个事件（阻塞直到超时）
events_wait(after_cursor=42, timeout_ms=30000)
```

事件类型：`message`、`approval_requested`、`approval_resolved`

事件队列存储在内存中，在桥接连接时启动。更早的消息可通过 `messages_read` 获取。

### 选项

```bash
hermes mcp serve              # 正常模式
hermes mcp serve --verbose    # 在 stderr 输出调试日志
```

### 工作原理

MCP 服务器直接从 Hermes 的会话存储（`~/.hermes/sessions/sessions.json` 和 SQLite 数据库）读取对话数据。后台线程轮询数据库以获取新消息，并维护内存中的事件队列。发送消息时，使用与 Hermes agent 本身相同的 `send_message` 基础设施。

对于读取操作（列出对话、读取历史、轮询事件），网关**无需**处于运行状态。对于发送操作，网关**必须**处于运行状态，因为平台适配器需要活跃连接。

### 当前限制

- 仅支持 stdio 传输（暂不支持 HTTP MCP 传输）
- 事件轮询间隔约 200ms，通过 mtime 优化的数据库轮询实现（文件未变化时跳过）
- 暂不支持 `claude/channel` 推送通知协议
- 仅支持文本发送（`messages_send` 暂不支持媒体/附件发送）

## 相关文档

- [在 Hermes 中使用 MCP](/guides/use-mcp-with-hermes)
- [CLI 命令](/reference/cli-commands)
- [斜杠命令](/reference/slash-commands)
- [常见问题 (FAQ)](/reference/faq)
