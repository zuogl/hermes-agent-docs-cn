---
title: "斜杠命令参考"
---
# 斜杠命令参考

Hermes Agent 有两个斜杠命令入口，均由 `hermes_cli/commands.py` 中的中央 `COMMAND_REGISTRY` 驱动：

- **交互式 CLI 斜杠命令** — 由 `cli.py` 调度，支持从注册表自动补全
- **消息平台斜杠命令** — 由 `gateway/run.py` 调度，从注册表生成帮助文本和平台菜单

已安装的技能同样以动态斜杠命令的形式在两个入口中对外提供。这包括内置技能，如 `/plan`，它会开启计划模式，并将 Markdown 计划文件保存到相对于当前工作区/后端工作目录的 `.hermes/plans/` 目录下。

## 交互式 CLI 斜杠命令

在 CLI 中输入 `/` 可打开自动补全菜单。内置命令不区分大小写。

### 会话

| 命令 | 描述 |
|---------|-------------|
| `/new`（别名：`/reset`） | 开启新会话（全新的会话 ID 与历史记录） |
| `/clear` | 清屏并开启新会话 |
| `/history` | 显示对话历史 |
| `/save` | 保存当前对话 |
| `/retry` | 重试上一条消息（重新发送给智能体） |
| `/undo` | 移除上一次用户/助手的对话交换 |
| `/title` | 为当前会话设置标题（用法：/title 我的会话名称） |
| `/compress` | 手动压缩对话上下文（刷新记忆 + 摘要） |
| `/rollback` | 列出或恢复文件系统检查点（用法：/rollback [编号]） |
| `/stop` | 终止所有正在运行的后台进程 |
| `/queue <prompt>`（别名：`/q`） | 将提示词加入下一轮队列（不会打断当前智能体响应）。**注意：** `/q` 同时被 `/queue` 和 `/quit` 使用；最后注册的优先，因此实际上 `/q` 会解析为 `/quit`。请明确使用 `/queue`。 |
| `/resume [name]` | 恢复之前命名的会话 |
| `/statusbar`（别名：`/sb`） | 切换上下文/模型状态栏的显示与隐藏 |
| `/background <prompt>`（别名：`/bg`） | 在独立后台会话中运行提示词。智能体将独立处理您的提示词——当前会话可继续进行其他操作。任务完成后结果将以面板形式显示。参见 [CLI 后台会话](/user-guide/cli#background-sessions)。 |
| `/btw <question>` | 临时提问，基于会话上下文（无工具、不记录到历史）。用于快速澄清，不影响对话历史。 |
| `/plan [request]` | 加载内置 `plan` 技能，编写 Markdown 计划而非直接执行操作。计划保存到相对于当前工作区/后端工作目录的 `.hermes/plans/` 目录下。 |
| `/branch [name]`（别名：`/fork`） | 分支当前会话（探索不同路径） |

### 配置

| 命令 | 描述 |
|---------|-------------|
| `/config` | 显示当前配置 |
| `/model [model-name]` | 显示或更改当前模型。支持：`/model claude-sonnet-4`、`/model provider:model`（切换提供商）、`/model custom:model`（自定义端点）、`/model custom:name:model`（具名自定义提供商）、`/model custom`（从端点自动检测） |
| `/provider` | 显示可用提供商及当前提供商 |
| `/prompt` | 查看/设置自定义系统提示词 |
| `/personality` | 设置预定义人格 |
| `/verbose` | 循环切换工具进度显示：关闭 → 新增 → 全部 → 详细。可通过配置[为消息平台启用](#注意事项)。 |
| `/reasoning` | 管理推理力度与显示（用法：/reasoning [级别\|show\|hide]） |
| `/skin` | 显示或更改显示皮肤/主题 |
| `/voice [on\|off\|tts\|status]` | 切换 CLI 语音模式和语音播放。录音使用 `voice.record_key`（默认：`Ctrl+B`）。 |
| `/yolo` | 切换 YOLO 模式——跳过所有危险命令确认提示。 |

### 工具与技能

| 命令 | 描述 |
|---------|-------------|
| `/tools [list\|disable\|enable] [name...]` | 管理工具：列出可用工具，或为当前会话禁用/启用特定工具。禁用工具会将其从智能体工具集中移除并触发会话重置。 |
| `/toolsets` | 列出可用工具集 |
| `/browser [connect\|disconnect\|status]` | 管理本地 Chrome CDP 连接。`connect` 将浏览器工具附加到正在运行的 Chrome 实例（默认：`ws://localhost:9222`）。`disconnect` 断开连接。`status` 显示当前连接状态。若未检测到调试器，则自动启动 Chrome。 |
| `/skills` | 从在线注册表搜索、安装、查看或管理技能 |
| `/cron` | 管理计划任务（列出、添加/创建、编辑、暂停、恢复、运行、删除） |
| `/reload-mcp`（别名：`/reload_mcp`） | 从 config.yaml 重新加载 MCP 服务器 |
| `/plugins` | 列出已安装插件及其状态 |

### 信息

| 命令 | 描述 |
|---------|-------------|
| `/help` | 显示此帮助信息 |
| `/usage` | 显示 token 用量、费用明细及会话时长 |
| `/insights` | 显示用量洞察与分析（最近 30 天） |
| `/platforms`（别名：`/gateway`） | 显示网关/消息平台状态 |
| `/paste` | 检查剪贴板中的图片并附加 |
| `/profile` | 显示当前配置文件名称和主目录 |

### 退出

| 命令 | 描述 |
|---------|-------------|
| `/quit` | 退出 CLI（也可用 `/exit`）。关于 `/q` 的说明，请参见上方 `/queue` 条目。 |

### 动态 CLI 斜杠命令

| 命令 | 描述 |
|---------|-------------|
| `/<skill-name>` | 按需加载任意已安装技能作为命令。示例：`/gif-search`、`/github-pr-workflow`、`/excalidraw`。 |
| `/skills ...` | 从注册表和官方可选技能目录中搜索、浏览、查看、安装、审计、发布和配置技能。 |

### 快捷命令

用户自定义的快捷命令将短别名映射到更长的提示词。在 `~/.hermes/config.yaml` 中进行配置：

```yaml
quick_commands:
  review: "审查我最新的 git diff 并提出改进建议"
  deploy: "运行 scripts/deploy.sh 处的部署脚本并验证输出"
  morning: "检查我的日历、未读邮件，并总结今天的优先事项"
```

然后在 CLI 中输入 `/review`、`/deploy` 或 `/morning`。快捷命令在调度时解析，不会显示在内置自动补全/帮助表格中。

### 别名解析

命令支持前缀匹配：输入 `/h` 解析为 `/help`，`/mod` 解析为 `/model`。当前缀不明确（匹配多个命令）时，注册顺序中的第一个匹配优先。完整命令名和已注册的别名始终优先于前缀匹配。

## 消息平台斜杠命令

消息平台网关支持在 Telegram、Discord、Slack、WhatsApp、Signal、Email 和 Home Assistant 聊天中使用以下内置命令：

| 命令 | 描述 |
|---------|-------------|
| `/new` | 开启新对话。 |
| `/reset` | 重置对话历史。 |
| `/status` | 显示会话信息。 |
| `/stop` | 终止所有正在运行的后台进程并中断正在运行的智能体。 |
| `/model [provider:model]` | 显示或更改模型。支持提供商切换（`/model zai:glm-5`）、自定义端点（`/model custom:model`）、具名自定义提供商（`/model custom:local:qwen`）和自动检测（`/model custom`）。 |
| `/provider` | 显示提供商可用性和认证状态。 |
| `/personality [name]` | 为会话叠加人格风格。 |
| `/retry` | 重试上一条消息。 |
| `/undo` | 撤销上一次交换。 |
| `/sethome`（别名：`/set-home`） | 将当前聊天标记为平台主频道以接收推送。 |
| `/compress` | 手动压缩对话上下文。 |
| `/title [name]` | 设置或显示会话标题。 |
| `/resume [name]` | 恢复之前命名的会话。 |
| `/usage` | 显示 token 用量、估算费用明细（输入/输出）、上下文窗口状态及会话时长。 |
| `/insights [days]` | 显示用量分析。 |
| `/reasoning [level\|show\|hide]` | 更改推理力度或切换推理显示。 |
| `/voice [on\|off\|tts\|join\|channel\|leave\|status]` | 控制聊天中的语音回复。`join`/`channel`/`leave` 管理 Discord 语音频道模式。 |
| `/rollback [number]` | 列出或恢复文件系统检查点。 |
| `/background <prompt>` | 在独立后台会话中运行提示词。任务完成后结果将推送回同一聊天。参见[消息后台会话](/user-guide/messaging/#background-sessions)。 |
| `/plan [request]` | 加载内置 `plan` 技能，编写 Markdown 计划而非直接执行操作。计划保存到相对于当前工作区/后端工作目录的 `.hermes/plans/` 目录下。 |
| `/reload-mcp`（别名：`/reload_mcp`） | 从配置中重新加载 MCP 服务器。 |
| `/yolo` | 切换 YOLO 模式——跳过所有危险命令确认提示。 |
| `/commands [page]` | 浏览所有命令和技能（分页显示）。 |
| `/approve [session\|always]` | 批准并执行待处理的危险命令。`session` 仅对本次会话批准；`always` 添加到永久允许列表。 |
| `/deny` | 拒绝待处理的危险命令。 |
| `/update` | 将 Hermes Agent 更新到最新版本。 |
| `/help` | 显示消息平台帮助。 |
| `/<skill-name>` | 按名称调用任意已安装技能。 |

## 注意事项

- `/skin`、`/tools`、`/toolsets`、`/browser`、`/config`、`/prompt`、`/cron`、`/skills`、`/platforms`、`/paste`、`/statusbar` 和 `/plugins` 是**仅限 CLI** 的命令。
- `/verbose` **默认仅限 CLI**，但可通过在 `config.yaml` 中设置 `display.tool_progress_command: true` 为消息平台启用。启用后，它会循环切换 `display.tool_progress` 模式并保存到配置。
- `/status`、`/sethome`、`/update`、`/approve`、`/deny` 和 `/commands` 是**仅限消息平台**的命令。
- `/background`、`/voice`、`/reload-mcp`、`/rollback` 和 `/yolo` 在 **CLI 和消息平台网关**中均可使用。
- `/voice join`、`/voice channel` 和 `/voice leave` 仅在 Discord 上有意义。
