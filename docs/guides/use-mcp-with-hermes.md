---
title: "在 Hermes 中使用 MCP"
---
# 在 Hermes 中使用 MCP

本指南介绍如何在日常工作流中通过 Hermes Agent 实际使用 MCP（模型上下文协议）。

如果功能介绍页解释了 MCP 是什么，本指南则聚焦于如何快速、安全地从中获取价值。

## 什么时候应该使用 MCP？

使用 MCP 的时机：
- 已有 MCP 形式的工具，且不想构建原生 Hermes 工具
- 希望 Hermes 通过简洁的 RPC 层操作本地或远程系统
- 需要细粒度的按服务器暴露控制
- 希望将 Hermes 连接到内部 API、数据库或公司系统，而不修改 Hermes 核心

不要使用 MCP 的时机：
- 内置 Hermes 工具已能很好地完成任务
- 服务器暴露了大量危险工具，而你还没准备好对其进行过滤
- 只需要一项非常单一的集成，原生工具会更简单、更安全

## 心智模型

把 MCP 理解为一个适配器层：

- Hermes 仍然是智能体
- MCP 服务器负责提供工具
- Hermes 在启动或重新加载时发现这些工具
- 模型可以像使用普通工具一样使用它们
- 你可以控制每个服务器的可见范围

最后一点很重要。好的 MCP 使用方式不是"连接所有东西"，而是"连接正确的东西，并保持最小可用暴露面"。

## 第一步：安装 MCP 支持

如果你使用标准安装脚本安装了 Hermes，MCP 支持已经包含在内（安装程序会执行 `uv pip install -e ".[all]"`）。

如果安装时未包含扩展，需要单独添加 MCP：

```bash
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"
```

对于基于 npm 的服务器，请确保 Node.js 和 `npx` 可用。

对于许多 Python MCP 服务器，`uvx` 是一个不错的默认选择。

## 第二步：先添加一个服务器

从单一、安全的服务器开始。

示例：仅访问一个项目目录的文件系统服务器。

```yaml
mcp_servers:
  project_fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/my-project"]
```

然后启动 Hermes：

```bash
hermes chat
```

现在提出一个具体的问题：

```text
Inspect this project and summarize the repo layout.
```

## 第三步：验证 MCP 是否已加载

可以通过以下几种方式验证：

- Hermes 的启动信息/状态栏在配置后应显示 MCP 集成状态
- 询问 Hermes 当前有哪些可用工具
- 配置变更后使用 `/reload-mcp`
- 如果服务器连接失败，检查日志

实用的测试提示词：

```text
Tell me which MCP-backed tools are available right now.
```

## 第四步：立即开始过滤

如果服务器暴露了大量工具，不要等到之后再处理。

### 示例：只允许你需要的工具（白名单）

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, search_code]
```

对于敏感系统，这通常是最佳的默认配置。

### 示例：屏蔽危险操作（黑名单）

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer, refund_payment]
```

### 示例：同时禁用实用工具包装器

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: false
      resources: false
```

## 过滤实际会影响什么？

Hermes 中 MCP 暴露的功能分为两类：

1. 服务器原生 MCP 工具，过滤方式：
  - `tools.include`
  - `tools.exclude`

2. Hermes 添加的实用工具包装器，过滤方式：
  - `tools.resources`
  - `tools.prompts`

### 你可能看到的实用工具包装器

资源类：
- `list_resources`
- `read_resource`

提示词类：
- `list_prompts`
- `get_prompt`

这些包装器只在以下两个条件同时满足时出现：
- 你的配置允许它们，且
- MCP 服务器会话实际支持这些能力

因此，如果服务器本身不支持 resources/prompts，Hermes 不会假装它支持。

## 常见模式

### 模式一：本地项目助手

当你希望 Hermes 在受限工作区内进行推理时，为仓库使用本地文件系统或 git 服务器。

```yaml
mcp_servers:
  fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/project"]

  git:
    command: "uvx"
    args: ["mcp-server-git", "--repository", "/home/user/project"]
```

推荐提示词：

```text
Review the project structure and identify where configuration lives.
```

```text
Check the local git state and summarize what changed recently.
```

### 模式二：GitHub 问题分类助手

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      prompts: false
      resources: false
```

推荐提示词：

```text
List open issues about MCP, cluster them by theme, and draft a high-quality issue for the most common bug.
```

```text
Search the repo for uses of _discover_and_register_server and explain how MCP tools are registered.
```

### 模式三：内部 API 助手

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      include: [list_customers, get_customer, list_invoices]
      resources: false
      prompts: false
```

推荐提示词：

```text
Look up customer ACME Corp and summarize recent invoice activity.
```

在这种情况下，严格的白名单远优于排除列表。

### 模式四：文档 / 知识服务器

某些 MCP 服务器暴露的提示词或资源更像是共享知识资产，而非直接操作。

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: true
      resources: true
```

推荐提示词：

```text
List available MCP resources from the docs server, then read the onboarding guide and summarize it.
```

```text
List prompts exposed by the docs server and tell me which ones would help with incident response.
```

## 教程：带过滤策略的端到端配置

以下是一个实践性的逐步演进流程。

### 阶段一：添加带严格白名单的 GitHub MCP

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, search_code]
      prompts: false
      resources: false
```

启动 Hermes 并提问：

```text
Search the codebase for references to MCP and summarize the main integration points.
```

### 阶段二：仅在需要时扩展

如果之后还需要更新 issue：

```yaml
tools:
  include: [list_issues, create_issue, update_issue, search_code]
```

然后重新加载：

```text
/reload-mcp
```

### 阶段三：添加策略不同的第二个服务器

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      prompts: false
      resources: false

  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/project"]
```

现在 Hermes 可以组合使用两个服务器：

```text
Inspect the local project files, then create a GitHub issue summarizing the bug you find.
```

这正是 MCP 的强大之处：无需修改 Hermes 核心，即可实现跨系统工作流。

## 安全使用建议

### 对危险系统优先使用白名单

对于任何涉及财务、面向客户或具有破坏性的系统：
- 使用 `tools.include`
- 从尽可能小的工具集开始

### 禁用未使用的实用工具

如果不希望模型浏览服务器提供的 resources/prompts，请将其关闭：

```yaml
tools:
  resources: false
  prompts: false
```

### 严格限定服务器范围

示例：
- 文件系统服务器的根目录设置为单个项目目录，而非整个主目录
- git 服务器指向单个仓库
- 内部 API 服务器默认以读为主的工具暴露

### 配置变更后重新加载

```text
/reload-mcp
```

在以下变更后执行：
- include/exclude 列表
- enabled 标志
- resources/prompts 开关
- 认证头 / 环境变量

## 按症状排查问题

### "服务器连接正常，但预期的工具消失了"

可能原因：
- 被 `tools.include` 过滤
- 被 `tools.exclude` 排除
- 通过 `resources: false` 或 `prompts: false` 禁用了实用工具包装器
- 服务器本身不支持 resources/prompts

### "服务器已配置，但什么都没加载"

检查：
- 配置中是否遗留了 `enabled: false`
- 命令/运行时是否存在（`npx`、`uvx` 等）
- HTTP 端点是否可达
- 认证环境变量或请求头是否正确

### "为什么我看到的工具比 MCP 服务器宣称支持的要少？"

因为 Hermes 遵循了你的按服务器策略和能力感知注册机制。这是预期行为，通常也是你想要的。

### "如何在不删除配置的情况下移除 MCP 服务器？"

使用：

```yaml
enabled: false
```

这样可以保留配置，但阻止连接和注册。

## 推荐的首批 MCP 配置

适合大多数用户优先使用的服务器：
- filesystem（文件系统）
- git
- GitHub
- fetch / 文档 MCP 服务器
- 一个范围较窄的内部 API

不适合优先使用的服务器：
- 拥有大量破坏性操作且未经过滤的大型业务系统
- 任何你了解不够深入、无法有效约束的系统

## 相关文档

- [MCP（模型上下文协议）](/user-guide/features/mcp)
- [常见问题](/reference/faq)
- [斜线命令](/reference/slash-commands)
