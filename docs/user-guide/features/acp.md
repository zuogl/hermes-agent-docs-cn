---
title: "ACP 编辑器集成"
---
# ACP 编辑器集成

Hermes Agent 可作为 ACP（Agent Control Protocol，智能体控制协议）服务器运行，让支持 ACP 的编辑器通过 stdio 与 Hermes 通信，并在编辑器界面中呈现：

- 聊天消息
- 工具活动
- 文件 diff
- 终端命令
- 审批提示
- 流式思考 / 响应数据块

当你希望 Hermes 像编辑器原生代理一样运行，而非独立的 CLI 或消息机器人时，ACP 是理想选择。

## Hermes 在 ACP 模式下提供的能力

Hermes 使用专为编辑器工作流设计的 `hermes-acp` 工具集运行。它包含：

- 文件工具：`read_file`、`write_file`、`patch`、`search_files`
- 终端工具：`terminal`、`process`
- 网页/浏览器工具
- 记忆、待办事项、会话搜索
- 技能
- `execute_code` 和 `delegate_task`
- 视觉能力

它刻意排除了不适合典型编辑器用户体验的功能，例如消息传递和定时任务管理。

## 安装

按常规方式安装 Hermes，然后再安装 ACP 额外依赖：

```bash
pip install -e '.[acp]'
```

这会安装 `agent-client-protocol` 依赖并启用：

- `hermes acp`
- `hermes-acp`
- `python -m acp_adapter`

## 启动 ACP 服务器

以下任意一条命令均可启动 Hermes ACP 服务器：

```bash
hermes acp
```

```bash
hermes-acp
```

```bash
python -m acp_adapter
```

Hermes 将日志输出到 stderr，以便 stdout 保留给 ACP JSON-RPC 流量。

## 编辑器配置

### VS Code

安装 ACP 客户端扩展，然后将其指向仓库的 `acp_registry/` 目录。

示例配置片段：

```json
{
  "acpClient.agents": [
    {
      "name": "hermes-agent",
      "registryDir": "/path/to/hermes-agent/acp_registry"
    }
  ]
}
```

### Zed

示例配置片段：

```json
{
  "agent_servers": {
    "hermes-agent": {
      "type": "custom",
      "command": "hermes",
      "args": ["acp"],
    },
  },
}
```

### JetBrains

使用支持 ACP 的插件，并将其指向：

```text
/path/to/hermes-agent/acp_registry
```

## 注册表清单

ACP 注册表清单位于：

```text
acp_registry/agent.json
```

它声明了一个基于命令的智能体，其启动命令为：

```text
hermes acp
```

## 配置与凭据

ACP 模式使用与 CLI 相同的 Hermes 配置：

- `~/.hermes/.env`
- `~/.hermes/config.yaml`
- `~/.hermes/skills/`
- `~/.hermes/state.db`

提供商解析使用 Hermes 的正常运行时解析器，因此 ACP 继承当前已配置的提供商和凭据。

## 会话行为

ACP 会话由 ACP 适配器的内存会话管理器在服务器运行期间跟踪。

每个会话存储：

- 会话 ID
- 工作目录
- 所选模型
- 当前对话历史
- 取消事件

底层的 `AIAgent` 仍使用 Hermes 的正常持久化/日志路径，但 ACP 的 `list/load/resume/fork` 操作的作用域限于当前运行的 ACP 服务器进程。

## 工作目录行为

ACP 会话将编辑器的工作目录绑定到 Hermes 任务 ID，使文件和终端工具相对于编辑器工作区运行，而非服务器进程的工作目录。

## 审批

危险的终端命令可作为审批提示路由回编辑器。ACP 审批选项比 CLI 流程更简单：

- 允许一次
- 始终允许
- 拒绝

超时或出错时，审批桥接会拒绝请求。

## 故障排除

### ACP 智能体未出现在编辑器中

检查：

- 编辑器是否指向正确的 `acp_registry/` 路径
- Hermes 是否已安装并在 PATH 中
- ACP 额外依赖是否已安装（`pip install -e '.[acp]'`）

### ACP 启动后立即报错

尝试以下检查：

```bash
hermes doctor
hermes status
hermes acp
```

### 缺少凭据

ACP 模式没有独立的登录流程，它直接使用 Hermes 现有的提供商配置。请通过以下方式配置凭据：

```bash
hermes model
```

或编辑 `~/.hermes/.env`。

## 另请参阅

- [ACP 内部实现](/developer-guide/acp-internals)
- [提供商运行时解析](/developer-guide/provider-runtime)
- [工具运行时](/developer-guide/tools-runtime)