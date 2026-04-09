---
title: "CLI 命令参考"
---
# CLI 命令参考

本页介绍在终端 shell 中运行的**命令行命令**。

关于会话内的斜杠命令，请参见 [斜杠命令参考](/reference/slash-commands)。

## 全局入口

```bash
hermes [全局选项] <命令> [子命令/选项]
```

### 全局选项

| 选项 | 说明 |
|--------|-------------|
| `--version`, `-V` | 显示版本并退出。 |
| `--profile <名称>`, `-p <名称>` | 为本次调用选择使用的 Hermes profile。会覆盖由 `hermes profile use` 设置的默认 profile。 |
| `--resume <ID>`, `-r <ID>` | 通过 ID 或标题恢复之前的 session。 |
| `--continue [名称]`, `-c [名称]` | 恢复最近的 session，或恢复最近一个与标题匹配的 session。 |
| `--worktree`, `-w` | 在独立的 git worktree 中启动，用于并行 agent 工作流。 |
| `--yolo` | 跳过危险命令的审批提示。 |
| `--pass-session-id` | 在 agent 的系统提示中包含 session ID。 |

## 顶级命令

| 命令 | 用途 |
|---------|---------|
| `hermes chat` | 与 agent 进行交互式或单次对话。 |
| `hermes model` | 交互式选择默认 provider 和模型。 |
| `hermes gateway` | 运行或管理消息网关服务。 |
| `hermes setup` | 全部或部分配置的交互式向导。 |
| `hermes whatsapp` | 配置并配对 WhatsApp 桥接。 |
| `hermes auth` | 管理凭据——添加、列出、移除、重置、设置策略。处理 Codex/Nous/Anthropic 的 OAuth 流程。 |
| `hermes login` / `logout` | **已废弃** — 请改用 `hermes auth`。 |
| `hermes status` | 显示 agent、认证和平台状态。 |
| `hermes cron` | 查看和触发 cron 调度器。 |
| `hermes webhook` | 管理用于事件驱动激活的动态 webhook 订阅。 |
| `hermes doctor` | 诊断配置和依赖问题。 |
| `hermes config` | 查看、编辑、迁移和查询配置文件。 |
| `hermes pairing` | 审批或撤销消息配对码。 |
| `hermes skills` | 浏览、安装、发布、审计和配置 skill。 |
| `hermes honcho` | 管理 Honcho 跨 session 记忆集成。 |
| `hermes memory` | 配置外部 memory provider。 |
| `hermes acp` | 将 Hermes 作为 ACP 服务器运行，用于编辑器集成。 |
| `hermes mcp` | 管理 MCP 服务器配置，并将 Hermes 作为 MCP 服务器运行。 |
| `hermes plugins` | 管理 Hermes Agent 插件（安装、启用、禁用、移除）。 |
| `hermes tools` | 按平台配置已启用的工具。 |
| `hermes sessions` | 浏览、导出、清理、重命名和删除 session。 |
| `hermes insights` | 显示 token/费用/活动分析报告。 |
| `hermes claw` | OpenClaw 迁移工具。 |
| `hermes profile` | 管理 profile——多个相互隔离的 Hermes 实例。 |
| `hermes completion` | 输出 shell 补全脚本（bash/zsh）。 |
| `hermes version` | 显示版本信息。 |
| `hermes update` | 拉取最新代码并重新安装依赖。 |
| `hermes uninstall` | 从系统中移除 Hermes。 |

## `hermes chat`

```bash
hermes chat [选项]
```

常用选项：

| 选项 | 说明 |
|--------|-------------|
| `-q`, `--query "..."` | 单次非交互式提示。 |
| `-m`, `--model <模型>` | 为本次运行覆盖模型。 |
| `-t`, `--toolsets <列表>` | 启用以逗号分隔的 toolset 集合。 |
| `--provider <名称>` | 强制指定 provider：`auto`、`openrouter`、`nous`、`openai-codex`、`copilot-acp`、`copilot`、`anthropic`、`huggingface`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`、`deepseek`、`ai-gateway`、`opencode-zen`、`opencode-go`、`kilocode`、`alibaba`。 |
| `-s`, `--skills <列表>` | 为 session 预加载一个或多个 skill（可重复指定或以逗号分隔）。 |
| `-v`, `--verbose` | 详细输出。 |
| `-Q`, `--quiet` | 程序化模式：隐藏横幅、加载动画和工具预览。 |
| `--resume <ID>` / `--continue [名称]` | 直接从 `chat` 命令恢复 session。 |
| `--worktree` | 为本次运行创建独立的 git worktree。 |
| `--checkpoints` | 在破坏性文件变更前启用文件系统检查点。 |
| `--yolo` | 跳过审批提示。 |
| `--pass-session-id` | 将 session ID 传入系统提示。 |
| `--source <标签>` | 用于过滤的 session 来源标签（默认：`cli`）。第三方集成使用 `tool`，这类 session 不会出现在用户 session 列表中。 |
| `--max-turns <N>` | 每个对话轮次的最大工具调用迭代次数（默认：90，或 config 中的 `agent.max_turns`）。 |

示例：

```bash
hermes
hermes chat -q "Summarize the latest PRs"
hermes chat --provider openrouter --model anthropic/claude-sonnet-4.6
hermes chat --toolsets web,terminal,skills
hermes chat --quiet -q "Return only JSON"
hermes chat --worktree -q "Review this repo and open a PR"
```

## `hermes model`

交互式 provider + 模型选择器。

```bash
hermes model
```

适用场景：
- 切换默认 provider
- 在模型选择过程中登录 OAuth 支持的 provider
- 从 provider 专属模型列表中选择
- 配置自定义/自托管端点
- 将新默认值保存到配置文件

### `/model` 斜杠命令（会话中途切换）

无需退出 session 即可切换模型：

```
/model                              # 显示当前模型及可用选项
/model claude-sonnet-4              # 切换模型（自动检测 provider）
/model zai:glm-5                    # 切换 provider 和模型
/model custom:qwen-2.5              # 使用自定义端点上的模型
/model custom                       # 从自定义端点自动检测模型
/model custom:local:qwen-2.5        # 使用命名的自定义 provider
/model openrouter:anthropic/claude-sonnet-4  # 切换回云端
```

provider 和 base URL 的变更会自动持久化到 `config.yaml`。当切换离开自定义端点时，过时的 base URL 会被清除，防止其泄漏到其他 provider。

## `hermes gateway`

```bash
hermes gateway <子命令>
```

子命令：

| 子命令 | 说明 |
|------------|-------------|
| `run` | 在前台运行 gateway。 |
| `start` | 启动已安装的 gateway 服务。 |
| `stop` | 停止服务。 |
| `restart` | 重启服务。 |
| `status` | 显示服务状态。 |
| `install` | 作为用户服务安装（Linux 上使用 `systemd`，macOS 上使用 `launchd`）。 |
| `uninstall` | 移除已安装的服务。 |
| `setup` | 消息平台的交互式配置。 |

## `hermes setup`

```bash
hermes setup [model|terminal|gateway|tools|agent] [--non-interactive] [--reset]
```

使用完整向导，或直接跳转到某个配置章节：

| 章节 | 说明 |
|---------|-------------|
| `model` | Provider 和模型配置。 |
| `terminal` | 终端后端和 sandbox 配置。 |
| `gateway` | 消息平台配置。 |
| `tools` | 按平台启用/禁用工具。 |
| `agent` | Agent 行为设置。 |

选项：

| 选项 | 说明 |
|--------|-------------|
| `--non-interactive` | 使用默认值/环境变量，不弹出交互提示。 |
| `--reset` | 在配置前将配置重置为默认值。 |

## `hermes whatsapp`

```bash
hermes whatsapp
```

运行 WhatsApp 配对/配置流程，包括模式选择和二维码配对。

## `hermes login` / `hermes logout` *（已废弃）*

:::caution
`hermes login` 已被移除。请使用 `hermes auth` 管理 OAuth 凭据，使用 `hermes model` 选择 provider，或使用 `hermes setup` 进行完整的交互式配置。
:::

## `hermes auth`

管理同一 provider 的凭据池，用于 API key 轮换。完整文档请参见 [凭据池](https://hermes-agent.nousresearch.com/docs/user-guide/features/credential-pools)。

```bash
hermes auth                                              # 交互式向导
hermes auth list                                         # 显示所有凭据池
hermes auth list openrouter                              # 显示特定 provider
hermes auth add openrouter --api-key sk-or-v1-xxx        # 添加 API key
hermes auth add anthropic --type oauth                   # 添加 OAuth 凭据
hermes auth remove openrouter 2                          # 按索引移除
hermes auth reset openrouter                             # 清除冷却时间
```

子命令：`add`、`list`、`remove`、`reset`。不带子命令调用时，将启动交互式管理向导。

## `hermes status`

```bash
hermes status [--all] [--deep]
```

| 选项 | 说明 |
|--------|-------------|
| `--all` | 以可分享的脱敏格式显示所有详情。 |
| `--deep` | 执行更深入的检查（可能耗时较长）。 |

## `hermes cron`

```bash
hermes cron <list|create|edit|pause|resume|run|remove|status|tick>
```

| 子命令 | 说明 |
|------------|-------------|
| `list` | 显示已调度的任务。 |
| `create` / `add` | 从提示词创建调度任务，可通过重复 `--skill` 参数附加一个或多个 skill。 |
| `edit` | 更新任务的调度时间、提示词、名称、投递方式、重复次数或附加 skill。支持 `--clear-skills`、`--add-skill` 和 `--remove-skill`。 |
| `pause` | 暂停任务而不删除。 |
| `resume` | 恢复已暂停的任务，并计算下次运行时间。 |
| `run` | 在下次调度器 tick 时触发任务。 |
| `remove` | 删除调度任务。 |
| `status` | 检查 cron 调度器是否在运行。 |
| `tick` | 运行一次到期任务后退出。 |

## `hermes webhook`

```bash
hermes webhook <subscribe|list|remove|test>
```

管理用于事件驱动 agent 激活的动态 webhook 订阅。需要在配置中启用 webhook 平台——若未配置，将打印配置说明。

| 子命令 | 说明 |
|------------|-------------|
| `subscribe` / `add` | 创建 webhook 路由。返回 URL 和 HMAC secret，用于在你的服务上配置。 |
| `list` / `ls` | 显示所有由 agent 创建的订阅。 |
| `remove` / `rm` | 删除动态订阅。不影响 config.yaml 中的静态路由。 |
| `test` | 发送测试 POST 请求，验证订阅是否正常工作。 |

### `hermes webhook subscribe`

```bash
hermes webhook subscribe <名称> [选项]
```

| 选项 | 说明 |
|--------|-------------|
| `--prompt` | 提示词模板，使用 `{dot.notation}` 引用 payload 字段。 |
| `--events` | 以逗号分隔的接受事件类型（如 `issues,pull_request`）。留空表示接受所有事件。 |
| `--description` | 人类可读的描述。 |
| `--skills` | 以逗号分隔的 skill 名称，供 agent 运行时加载。 |
| `--deliver` | 投递目标：`log`（默认）、`telegram`、`discord`、`slack`、`github_comment`。 |
| `--deliver-chat-id` | 跨平台投递的目标 chat/channel ID。 |
| `--secret` | 自定义 HMAC secret。若省略则自动生成。 |

订阅持久化到 `~/.hermes/webhook_subscriptions.json`，webhook 适配器会热重载，无需重启 gateway。

## `hermes doctor`

```bash
hermes doctor [--fix]
```

| 选项 | 说明 |
|--------|-------------|
| `--fix` | 尝试在可能的情况下自动修复问题。 |

## `hermes config`

```bash
hermes config <子命令>
```

子命令：

| 子命令 | 说明 |
|------------|-------------|
| `show` | 显示当前配置值。 |
| `edit` | 在编辑器中打开 `config.yaml`。 |
| `set <键> <值>` | 设置配置项的值。 |
| `path` | 打印配置文件路径。 |
| `env-path` | 打印 `.env` 文件路径。 |
| `check` | 检查缺失或过时的配置。 |
| `migrate` | 以交互方式添加新引入的配置选项。 |

## `hermes pairing`

```bash
hermes pairing <list|approve|revoke|clear-pending>
```

| 子命令 | 说明 |
|------------|-------------|
| `list` | 显示待审批和已审批的用户。 |
| `approve <代码>` | 审批配对码。 |
| `revoke <用户>` | 撤销用户的访问权限。 |
| `clear-pending` | 清除待处理的配对码。 |

## `hermes skills`

```bash
hermes skills <子命令>
```

子命令：

| 子命令 | 说明 |
|------------|-------------|
| `browse` | 分页浏览 skill 注册表。 |
| `search` | 搜索 skill 注册表。 |
| `install` | 安装 skill。 |
| `inspect` | 预览 skill 而不安装。 |
| `list` | 列出已安装的 skill。 |
| `check` | 检查已安装的 hub skill 是否有上游更新。 |
| `update` | 重新安装有上游变更的 hub skill。 |
| `audit` | 重新扫描已安装的 hub skill。 |
| `uninstall` | 移除通过 hub 安装的 skill。 |
| `publish` | 将 skill 发布到注册表。 |
| `snapshot` | 导出/导入 skill 配置。 |
| `tap` | 管理自定义 skill 来源。 |
| `config` | 按平台交互式启用/禁用 skill 配置。 |

常用示例：

```bash
hermes skills browse
hermes skills browse --source official
hermes skills search react --source skills-sh
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect official/security/1password
hermes skills inspect skills-sh/vercel-labs/json-render/json-render-react
hermes skills install official/migration/openclaw-migration
hermes skills install skills-sh/anthropics/skills/pdf --force
hermes skills check
hermes skills update
hermes skills config
```

注意事项：
- `--force` 可覆盖第三方/社区 skill 的非危险性策略拦截。
- `--force` 不能覆盖 `dangerous`（危险）扫描结论。
- `--source skills-sh` 搜索公开的 `skills.sh` 目录。
- `--source well-known` 让 Hermes 访问暴露了 `/.well-known/skills/index.json` 的站点。

## `hermes honcho`

```bash
hermes honcho [--target-profile 名称] <子命令>
```

管理 Honcho 跨 session 记忆集成。本命令由 Honcho memory provider 插件提供，仅在 config 中将 `memory.provider` 设置为 `honcho` 时可用。

`--target-profile` 标志允许在不切换 profile 的情况下管理另一个 profile 的 Honcho 配置。

子命令：

| 子命令 | 说明 |
|------------|-------------|
| `setup` | 跳转到 `hermes memory setup`（统一配置入口）。 |
| `status [--all]` | 显示当前 Honcho 配置和连接状态。`--all` 显示跨 profile 的概览。 |
| `peers` | 显示所有 profile 的对等身份标识。 |
| `sessions` | 列出已知的 Honcho session 映射。 |
| `map [名称]` | 将当前目录映射到 Honcho session 名称。省略 `名称` 则列出当前映射。 |
| `peer` | 显示或更新对等名称和辩证推理级别。选项：`--user 名称`、`--ai 名称`、`--reasoning 级别`。 |
| `mode [模式]` | 显示或设置召回模式：`hybrid`、`context` 或 `tools`。省略则显示当前模式。 |
| `tokens` | 显示或设置上下文和辩证推理的 token 预算。选项：`--context N`、`--dialectic N`。 |
| `identity [文件] [--show]` | 初始化或显示 AI 对等身份表示。 |
| `enable` | 为当前活跃 profile 启用 Honcho。 |
| `disable` | 为当前活跃 profile 禁用 Honcho。 |
| `sync` | 将 Honcho 配置同步到所有已有 profile（为缺失的 host 块创建条目）。 |
| `migrate` | 从 openclaw-honcho 迁移到 Hermes Honcho 的分步指南。 |

## `hermes memory`

```bash
hermes memory <子命令>
```

配置和管理外部 memory provider 插件。可用 provider：honcho、openviking、mem0、hindsight、holographic、retaindb、byterover、supermemory。同一时间只能激活一个外部 provider。内置 memory（MEMORY.md/USER.md）始终处于激活状态。

子命令：

| 子命令 | 说明 |
|------------|-------------|
| `setup` | 交互式 provider 选择和配置。 |
| `status` | 显示当前 memory provider 配置。 |
| `off` | 禁用外部 provider（仅使用内置 memory）。 |

## `hermes acp`

```bash
hermes acp
```

将 Hermes 作为 ACP（Agent Client Protocol）stdio 服务器启动，用于编辑器集成。

相关入口命令：

```bash
hermes-acp
python -m acp_adapter
```

首先安装支持组件：

```bash
pip install -e '.[acp]'
```

参见 [ACP 编辑器集成](/user-guide/features/acp) 和 [ACP 内部机制](/developer-guide/acp-internals)。

## `hermes mcp`

```bash
hermes mcp <子命令>
```

管理 MCP（Model Context Protocol）服务器配置，并将 Hermes 作为 MCP 服务器运行。

| 子命令 | 说明 |
|------------|-------------|
| `serve [-v\|--verbose]` | 将 Hermes 作为 MCP 服务器运行——将对话暴露给其他 agent。 |
| `add <名称> [--url URL] [--command CMD] [--args ...] [--auth oauth\|header]` | 添加 MCP 服务器并自动发现工具。 |
| `remove <名称>`（别名：`rm`） | 从配置中移除 MCP 服务器。 |
| `list`（别名：`ls`） | 列出已配置的 MCP 服务器。 |
| `test <名称>` | 测试与 MCP 服务器的连接。 |
| `configure <名称>`（别名：`config`） | 切换服务器的工具选择。 |

参见 [MCP 配置参考](/reference/mcp-config-reference)、[在 Hermes 中使用 MCP](/guides/use-mcp-with-hermes) 和 [MCP 服务器模式](/user-guide/features/mcp#running-hermes-as-an-mcp-server)。

## `hermes plugins`

```bash
hermes plugins [子命令]
```

管理 Hermes Agent 插件。不带子命令运行 `hermes plugins` 时，将启动交互式 curses 复选列表，用于启用/禁用已安装的插件。

| 子命令 | 说明 |
|------------|-------------|
| *（无）* | 交互式切换界面——使用方向键和空格键启用/禁用插件。 |
| `install <URL 或 owner/repo> [--force]` | 从 Git URL 或 `owner/repo` 安装插件。 |
| `update <名称>` | 拉取已安装插件的最新变更。 |
| `remove <名称>`（别名：`rm`、`uninstall`） | 移除已安装的插件。 |
| `enable <名称>` | 启用已禁用的插件。 |
| `disable <名称>` | 禁用插件而不移除。 |
| `list`（别名：`ls`） | 列出已安装插件及其启用/禁用状态。 |

已禁用的插件存储在 `config.yaml` 的 `plugins.disabled` 下，加载时将被跳过。

参见 [插件](/user-guide/features/plugins) 和 [构建 Hermes 插件](/guides/build-a-hermes-plugin)。

## `hermes tools`

```bash
hermes tools [--summary]
```

| 选项 | 说明 |
|--------|-------------|
| `--summary` | 打印当前已启用工具的摘要并退出。 |

不带 `--summary` 时，将启动交互式的按平台工具配置界面。

## `hermes sessions`

```bash
hermes sessions <子命令>
```

子命令：

| 子命令 | 说明 |
|------------|-------------|
| `list` | 列出最近的 session。 |
| `browse` | 带搜索和恢复功能的交互式 session 选择器。 |
| `export <路径> [--session-id ID]` | 将 session 导出为 JSONL 格式。 |
| `delete <ID>` | 删除单个 session。 |
| `prune` | 删除旧 session。 |
| `stats` | 显示 session 存储统计信息。 |
| `rename <ID> <标题>` | 设置或修改 session 标题。 |

## `hermes insights`

```bash
hermes insights [--days N] [--source 平台]
```

| 选项 | 说明 |
|--------|-------------|
| `--days <N>` | 分析最近 `n` 天的数据（默认：30）。 |
| `--source <名称>` | 按来源过滤，如 `cli`、`telegram` 或 `discord`。 |

## `hermes claw`

```bash
hermes claw migrate [选项]
```

将 OpenClaw 配置迁移到 Hermes。从 `~/.openclaw`（或自定义路径）读取数据，写入 `~/.hermes`。自动检测历史目录名（`~/.clawdbot`、`~/.moldbot`）和配置文件名（`clawdbot.json`、`moldbot.json`）。

| 选项 | 说明 |
|--------|-------------|
| `--dry-run` | 预览将迁移的内容，不实际写入任何数据。 |
| `--preset <预设>` | 迁移预设：`full`（默认，包含 secret）或 `user-data`（排除 API key）。 |
| `--overwrite` | 发生冲突时覆盖现有 Hermes 文件（默认：跳过）。 |
| `--migrate-secrets` | 在迁移中包含 API key（使用 `--preset full` 时默认启用）。 |
| `--source <路径>` | 自定义 OpenClaw 目录（默认：`~/.openclaw`）。 |
| `--workspace-target <路径>` | 工作区指令（AGENTS.md）的目标目录。 |
| `--skill-conflict <策略>` | 处理 skill 名称冲突：`skip`（默认）、`overwrite` 或 `rename`。 |
| `--yes` | 跳过确认提示。 |

### 迁移内容

迁移涵盖 30 余个类别，包括 persona、memory、skill、model provider、消息平台、agent 行为、session 策略、MCP 服务器、TTS 等。各条目会被**直接导入**到 Hermes 对应配置，或**归档**以供人工审查。

**直接导入：** SOUL.md、MEMORY.md、USER.md、AGENTS.md、skill（4 个来源目录）、默认模型、自定义 provider、MCP 服务器、消息平台 token 和白名单（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost）、agent 默认值（推理力度、压缩、人工延迟、时区、sandbox）、session 重置策略、审批规则、TTS 配置、浏览器设置、工具设置、执行超时、命令白名单、gateway 配置，以及来自 3 个来源的 API key。

**归档以供人工审查：** Cron 任务、插件、hooks/webhook、memory 后端（QMD）、skill 注册表配置、UI/身份、日志、多 agent 配置、频道绑定、IDENTITY.md、TOOLS.md、HEARTBEAT.md、BOOTSTRAP.md。

**API key 解析**按优先级顺序检查三个来源：config 值 → `~/.openclaw/.env` → `auth-profiles.json`。所有 token 字段均支持纯字符串、环境变量模板（`${VAR}`）和 SecretRef 对象。

完整的配置键映射、SecretRef 处理详情和迁移后检查清单，请参见**[完整迁移指南](/guides/migrate-from-openclaw)**。

### 示例

```bash
# 预览将迁移的内容
hermes claw migrate --dry-run

# 完整迁移，包含 API key
hermes claw migrate --preset full

# 仅迁移用户数据（不含 secret），覆盖冲突
hermes claw migrate --preset user-data --overwrite

# 从自定义 OpenClaw 路径迁移
hermes claw migrate --source /home/user/old-openclaw
```

## `hermes profile`

```bash
hermes profile <子命令>
```

管理 profile——多个相互隔离的 Hermes 实例，每个实例拥有独立的配置、session、skill 和主目录。

| 子命令 | 说明 |
|------------|-------------|
| `list` | 列出所有 profile。 |
| `use <名称>` | 设置默认 profile（持久生效）。 |
| `create <名称> [--clone] [--clone-all] [--clone-from <来源>] [--no-alias]` | 创建新 profile。`--clone` 从当前活跃 profile 复制 config、`.env` 和 `SOUL.md`；`--clone-all` 复制所有状态；`--clone-from` 指定来源 profile。 |
| `delete <名称> [-y]` | 删除 profile。 |
| `show <名称>` | 显示 profile 详情（主目录、配置等）。 |
| `alias <名称> [--remove] [--name 别名]` | 管理用于快速访问 profile 的包装脚本。 |
| `rename <旧名称> <新名称>` | 重命名 profile。 |
| `export <名称> [-o 文件]` | 将 profile 导出为 `.tar.gz` 归档。 |
| `import <文件> [--name 名称]` | 从 `.tar.gz` 归档导入 profile。 |

示例：

```bash
hermes profile list
hermes profile create work --clone
hermes profile use work
hermes profile alias work --name h-work
hermes profile export work -o work-backup.tar.gz
hermes profile import work-backup.tar.gz --name restored
hermes -p work chat -q "Hello from work profile"
```

## `hermes completion`

```bash
hermes completion [bash|zsh]
```

将 shell 补全脚本输出到标准输出。将输出添加到你的 shell 配置文件，即可为 Hermes 命令、子命令和 profile 名称启用 Tab 补全。

示例：

```bash
# Bash
hermes completion bash >> ~/.bashrc

# Zsh
hermes completion zsh >> ~/.zshrc
```

## 维护命令

| 命令 | 说明 |
|---------|-------------|
| `hermes version` | 打印版本信息。 |
| `hermes update` | 拉取最新变更并重新安装依赖。 |
| `hermes uninstall [--full] [--yes]` | 移除 Hermes，可选择同时删除所有配置和数据。 |

## 参见

- [斜杠命令参考](/reference/slash-commands)
- [CLI 界面](/user-guide/cli)
- [Sessions](/user-guide/sessions)
- [Skill 系统](/user-guide/features/skills)
- [外观与主题](/user-guide/features/skins)
