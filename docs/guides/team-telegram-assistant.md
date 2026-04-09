---
title: "教程：团队 Telegram 助手"
---
# 教程：团队 Telegram 助手

本教程将引导你搭建一个由 Hermes Agent 驱动的 Telegram 机器人，供多位团队成员共同使用。完成后，团队将拥有一个共享的 AI 助手，可以随时发消息寻求代码、研究、系统管理等方面的帮助——并通过按用户授权的方式保障安全。

## 我们在构建什么

一个 Telegram 机器人，具备以下能力：

- **任何已授权的团队成员**都可以私信求助——代码审查、研究、Shell 命令、调试
- **运行在你的服务器上**，具备完整工具访问权限——终端、文件编辑、网页搜索、代码执行
- **独立会话**——每个人拥有各自的对话上下文
- **默认安全**——只有经过审批的用户才能交互，支持两种授权方式
- **定时任务**——每日站会摘要、健康检查和提醒消息会发送到团队频道

---

## 前提条件

开始之前，请确保你已准备好：

- **已在服务器或 VPS 上安装 Hermes Agent**（不是你的笔记本——机器人需要持续运行）。如尚未安装，请参阅[安装指南](/getting-started/installation)。
- **一个 Telegram 账号**（机器人所有者）
- **已配置 LLM 提供商**——至少在 `~/.hermes/.env` 中填写了 OpenAI、Anthropic 或其他支持的提供商的 API 密钥

:::tip
5 美元/月的 VPS 就足以运行网关。Hermes 本身非常轻量——真正花钱的是 LLM API 调用，而这些调用发生在远端。
:::

---

## 步骤 1：创建 Telegram 机器人

每个 Telegram 机器人都从 **@BotFather** 开始——这是 Telegram 官方用于创建机器人的账号。

1. **打开 Telegram**，搜索 `@BotFather`，或访问 [t.me/BotFather](https://t.me/BotFather)

2. **发送 `/newbot`**——BotFather 会询问两件事：
   - **显示名称**——用户看到的名字（例如 `Team Hermes Assistant`）
   - **用户名**——必须以 `bot` 结尾（例如 `myteam_hermes_bot`）

3. **复制机器人 Token**——BotFather 会回复类似以下内容：
   ```
   Use this token to access the HTTP API:
   7123456789:AAH1bGciOiJSUzI1NiIsInR5cCI6Ikp...
   ```
   保存好这个 Token，下一步需要用到。

4. **设置描述**（可选，但建议设置）：
   ```
   /setdescription
   ```
   选择你的机器人，然后输入类似以下内容：
   ```
   Team AI assistant powered by Hermes Agent. DM me for help with code, research, debugging, and more.
   ```

5. **设置机器人命令**（可选——为用户提供命令菜单）：
   ```
   /setcommands
   ```
   选择你的机器人，然后粘贴（命令描述保持英文，这是 Telegram 界面显示的格式）：
   ```
   new - Start a fresh conversation
   model - Show or change the AI model
   status - Show session info
   help - Show available commands
   stop - Stop the current task
   ```

:::caution
请妥善保管机器人 Token。任何持有该 Token 的人都可以控制你的机器人。如果 Token 泄露，请在 BotFather 中使用 `/revoke` 生成新的 Token。
:::

---

## 步骤 2：配置网关

你有两种选择：交互式设置向导（推荐）或手动配置。

### 选项 A：交互式设置（推荐）

```bash
hermes gateway setup
```

这将通过方向键选择引导你完成所有配置。选择 **Telegram**，粘贴你的机器人 Token，并在提示时输入你的用户 ID。

### 选项 B：手动配置

在 `~/.hermes/.env` 中添加以下内容：

```bash
# 从 BotFather 获取的 Telegram 机器人 Token
TELEGRAM_BOT_TOKEN=7123456789:AAH1bGciOiJSUzI1NiIsInR5cCI6Ikp...

# 你的 Telegram 用户 ID（数字格式）
TELEGRAM_ALLOWED_USERS=123456789
```

### 查找你的用户 ID

Telegram 用户 ID 是一个数字值（不是你的用户名）。查找方式：

1. 在 Telegram 上发消息给 [@userinfobot](https://t.me/userinfobot)
2. 它会立即回复你的数字用户 ID
3. 将该数字填入 `TELEGRAM_ALLOWED_USERS`

:::info
Telegram 用户 ID 是类似 `123456789` 的永久数字，与可以更改的 `@用户名` 不同。白名单中请务必使用数字 ID。
:::

---

## 步骤 3：启动网关

### 快速测试

先在前台运行网关，确认一切正常：

```bash
hermes gateway
```

你应该看到类似以下的输出：

```
[Gateway] Starting Hermes Gateway...
[Gateway] Telegram adapter connected
[Gateway] Cron scheduler started (tick every 60s)
```

打开 Telegram，找到你的机器人，发送一条消息。如果它回复了，说明一切正常。按 `Ctrl+C` 停止。

### 生产环境：安装为系统服务

如需在重启后依然持续运行的持久化部署：

```bash
hermes gateway install
sudo hermes gateway install --system   # 仅限 Linux：开机自启的系统服务
```

这将创建一个后台服务：Linux 默认为用户级 **systemd** 服务，macOS 为 **launchd** 服务，加上 `--system` 参数则为 Linux 开机级系统服务。

```bash
# Linux——管理默认用户服务
hermes gateway start
hermes gateway stop
hermes gateway status

# 查看实时日志
journalctl --user -u hermes-gateway -f

# SSH 退出后保持运行
sudo loginctl enable-linger $USER

# Linux 服务器——显式系统服务命令
sudo hermes gateway start --system
sudo hermes gateway status --system
journalctl -u hermes-gateway -f
```

```bash
# macOS——管理服务
hermes gateway start
hermes gateway stop
tail -f ~/.hermes/logs/gateway.log
```

> 💡 **提示（macOS PATH）**：launchd plist 在安装时会捕获你的 Shell PATH，以便网关子进程能找到 Node.js、ffmpeg 等工具。如果你后续安装了新工具，请重新运行 `hermes gateway install` 以更新 plist。

### 验证运行状态

```bash
hermes gateway status
```

然后在 Telegram 上向你的机器人发送一条测试消息，应在几秒内收到回复。

---

## 步骤 4：设置团队访问权限

接下来，让你的队友获得访问权限。有两种方式。

### 方式 A：静态白名单

收集每位团队成员的 Telegram 用户 ID（让他们发消息给 [@userinfobot](https://t.me/userinfobot)），以逗号分隔添加：

```bash
# 在 ~/.hermes/.env 中
TELEGRAM_ALLOWED_USERS=123456789,987654321,555555555
```

修改后重启网关：

```bash
hermes gateway stop && hermes gateway start
```

### 方式 B：私信配对（推荐用于团队）

私信配对更灵活——无需提前收集用户 ID。工作流程如下：

1. **队友私信机器人**——由于不在白名单中，机器人会回复一次性配对码：
   ```
   🔐 Pairing code: XKGH5N7P
   Send this code to the bot owner for approval.
   ```

2. **队友将配对码发给你**（通过任意渠道——Slack、邮件、当面）

3. **你在服务器上批准**：
   ```bash
   hermes pairing approve telegram XKGH5N7P
   ```

4. **配对完成**——机器人立即开始响应他们的消息

**管理已配对用户：**

```bash
# 查看所有待审批和已审批的用户
hermes pairing list

# 撤销某人的访问权限
hermes pairing revoke telegram 987654321

# 清除已过期的待审批配对码
hermes pairing clear-pending
```

:::tip
私信配对非常适合团队使用，因为添加新用户时无需重启网关，审批立即生效。
:::

### 安全注意事项

- **切勿在具有终端访问权限的机器人上将 `GATEWAY_ALLOW_ALL_USERS` 设为 `true`**——任何找到你机器人的人都可以在你的服务器上运行命令
- 配对码在 **1 小时**后过期，使用密码学随机数生成
- 速率限制防止暴力破解攻击：每用户每 10 分钟 1 次请求，每个平台最多 3 个待审批配对码
- 连续 5 次批准失败后，该平台将进入 1 小时锁定期
- 所有配对数据以 `chmod 0600` 权限存储

---

## 步骤 5：配置机器人

### 设置主频道

**主频道**是机器人发送定时任务结果和主动推送消息的地方。没有主频道时，定时任务的输出将无处发送。

**选项 1：** 在机器人所在的任意 Telegram 群组或聊天中使用 `/sethome` 命令。

**选项 2：** 在 `~/.hermes/.env` 中手动设置：

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="Team Updates"
```

要获取频道 ID，可将 [@userinfobot](https://t.me/userinfobot) 添加到群组——它会报告群组的聊天 ID。

### 配置工具进度显示

控制机器人在使用工具时展示的详细程度。在 `~/.hermes/config.yaml` 中：

```yaml
display:
  tool_progress: new    # off | new | all | verbose
```

| 模式 | 你将看到的内容 |
|------|--------------|
| `off` | 仅显示干净的回复——不显示工具活动 |
| `new` | 每次新工具调用的简短状态（推荐用于消息场景） |
| `all` | 每次工具调用的详细信息 |
| `verbose` | 包含命令结果的完整工具输出 |

用户也可以在聊天中使用 `/verbose` 命令按会话更改此设置。

### 通过 SOUL.md 设置个性

编辑 `~/.hermes/SOUL.md` 来自定义机器人的沟通方式：

完整指南请参阅[将 SOUL.md 与 Hermes 配合使用](/guides/use-soul-with-hermes)。

```markdown
# Soul
You are a helpful team assistant. Be concise and technical.
Use code blocks for any code. Skip pleasantries — the team
values directness. When debugging, always ask for error logs
before guessing at solutions.
```

### 添加项目上下文

如果你的团队在特定项目上工作，可以创建上下文文件，让机器人了解你们的技术栈：

```markdown
<!-- ~/.hermes/AGENTS.md -->
# Team Context
- We use Python 3.12 with FastAPI and SQLAlchemy
- Frontend is React with TypeScript
- CI/CD runs on GitHub Actions
- Production deploys to AWS ECS
- Always suggest writing tests for new code
```

:::info
上下文文件会注入每个会话的系统提示中。请保持简洁——每个字符都会占用你的 Token 预算。
:::

---

## 步骤 6：设置定时任务

网关运行后，你可以设置将结果发送到团队频道的周期性任务。

### 每日站会摘要

直接将以下内容发送给机器人：

```
Every weekday at 9am, check the GitHub repository at
github.com/myorg/myproject for:
1. Pull requests opened/merged in the last 24 hours
2. Issues created or closed
3. Any CI/CD failures on the main branch
Format as a brief standup-style summary.
```

Agent 会自动创建定时任务，并将结果发送到你发起请求的聊天（或主频道）。

### 服务器健康检查

```
Every 6 hours, check disk usage with 'df -h', memory with 'free -h',
and Docker container status with 'docker ps'. Report anything unusual —
partitions above 80%, containers that have restarted, or high memory usage.
```

### 管理定时任务

```bash
# 通过 CLI
hermes cron list          # 查看所有定时任务
hermes cron status        # 检查调度器是否运行中

# 通过 Telegram 聊天
/cron list                # 查看任务
/cron remove <job_id>     # 删除某个任务
```

:::caution
定时任务的提示词在全新会话中运行，不保留任何历史对话记忆。请确保每个提示词包含 **所有** Agent 所需的上下文——文件路径、URL、服务器地址以及明确的指令。
:::

---

## 生产环境建议

### 使用 Docker 提升安全性

在共享团队机器人中，使用 Docker 作为终端后端，使 Agent 命令在容器中运行而非直接在宿主机上运行：

```bash
# 在 ~/.hermes/.env 中
TERMINAL_BACKEND=docker
TERMINAL_DOCKER_IMAGE=nikolaik/python-nodejs:python3.11-nodejs20
```

或在 `~/.hermes/config.yaml` 中：

```yaml
terminal:
  backend: docker
  container_cpu: 1
  container_memory: 5120
  container_persistent: true
```

这样即使有人让机器人运行破坏性命令，你的宿主机系统也能得到保护。

### 监控网关

```bash
# 检查网关是否运行中
hermes gateway status

# 查看实时日志（Linux）
journalctl --user -u hermes-gateway -f

# 查看实时日志（macOS）
tail -f ~/.hermes/logs/gateway.log
```

### 保持 Hermes 更新

在 Telegram 上向机器人发送 `/update`——它将拉取最新版本并重启。或在服务器上执行：

```bash
hermes update
hermes gateway stop && hermes gateway start
```

### 日志位置

| 内容 | 位置 |
|------|------|
| 网关日志 | `journalctl --user -u hermes-gateway`（Linux）或 `~/.hermes/logs/gateway.log`（macOS） |
| 定时任务输出 | `~/.hermes/cron/output/{job_id}/{timestamp}.md` |
| 定时任务定义 | `~/.hermes/cron/jobs.json` |
| 配对数据 | `~/.hermes/pairing/` |
| 会话历史 | `~/.hermes/sessions/` |

---

## 深入探索

你已拥有一个可运行的团队 Telegram 助手。以下是一些后续步骤：

- **[安全指南](/user-guide/security)**——深入了解授权、容器隔离和命令审批
- **[消息网关](/user-guide/messaging)**——网关架构、会话管理和聊天命令完整参考
- **[Telegram 配置](/user-guide/messaging/telegram)**——平台特定详情，包括语音消息和 TTS
- **[定时任务](/user-guide/features/cron)**——高级定时调度，含投递选项和 Cron 表达式
- **[上下文文件](/user-guide/features/context-files)**——用于项目知识的 AGENTS.md、SOUL.md 和 .cursorrules
- **[个性化](/user-guide/features/personality)**——内置个性预设和自定义角色定义
- **添加更多平台**——同一网关可同时运行 [Discord](/user-guide/messaging/discord)、[Slack](/user-guide/messaging/slack) 和 [WhatsApp](/user-guide/messaging/whatsapp)

---

*有问题或遇到故障？在 GitHub 上提交 Issue——欢迎贡献。*
