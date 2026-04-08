---
title: "配置文件：运行多个智能体"
---
# 配置文件：运行多个智能体

在同一台机器上运行多个相互独立的 Hermes Agent，各自拥有独立的配置、API 密钥、记忆、会话、技能和网关。

## 什么是配置文件？

配置文件（profile）是一个完全隔离的 Hermes 运行环境。每个配置文件拥有独立的目录，包含各自的 `config.yaml`、`.env`、`SOUL.md`、记忆、会话、技能、定时任务和状态数据库。通过配置文件，你可以为不同用途运行互不干扰的独立智能体——编程助手、个人机器人、研究智能体——彼此完全隔离。

创建名为 `coder` 的配置文件后，你会立即获得 `coder chat`、`coder setup`、`coder gateway start` 等命令。

## 快速开始

```bash
hermes profile create coder       # 创建配置文件并生成 "coder" 命令别名
coder setup                       # 配置 API 密钥和模型
coder chat                        # 开始对话
```

就这些。`coder` 现在是一个完全独立的智能体，拥有自己的配置、记忆和一切。

## 创建配置文件

### 空白配置文件

```bash
hermes profile create mybot
```

创建一个内置技能已就绪的全新配置文件。运行 `mybot setup` 配置 API 密钥、模型和网关 token。

### 仅克隆配置（`--clone`）

```bash
hermes profile create work --clone
```

将当前配置文件的 `config.yaml`、`.env` 和 `SOUL.md` 复制到新配置文件中。API 密钥和模型保持不变，但会话和记忆是全新的。如需使用不同的 API 密钥，编辑 `~/.hermes/profiles/work/.env`；如需不同的人格设定，编辑 `~/.hermes/profiles/work/SOUL.md`。

### 完整克隆（`--clone-all`）

```bash
hermes profile create backup --clone-all
```

复制**所有内容**——配置、API 密钥、人格设定、所有记忆、完整会话历史、技能、定时任务、插件。这是一个完整快照，适合备份，或将已积累上下文的智能体复刻一份。

### 从指定配置文件克隆

```bash
hermes profile create work --clone --clone-from coder
```

:::tip
Honcho 记忆与配置文件
启用 Honcho 后，`--clone` 会自动为新配置文件创建专属 AI 伙伴，同时共享同一用户工作区。每个配置文件会建立各自的观察记录和身份信息。详见 [Honcho——多智能体/配置文件](/user-guide/features/memory-providers#honcho)。
:::

## 使用配置文件

### 命令别名

每个配置文件会自动在 `~/.local/bin/<name>` 创建一个命令别名：

```bash
coder chat                    # 与 coder 智能体对话
coder setup                   # 配置 coder 的设置
coder gateway start           # 启动 coder 的网关
coder doctor                  # 检查 coder 的健康状态
coder skills list             # 列出 coder 的技能
coder config set model.model anthropic/claude-sonnet-4
```

别名支持所有 hermes 子命令，本质上就是 `hermes -p <name>` 的快捷方式。

### `-p` 标志

也可以通过 `-p` 标志显式指定配置文件：

```bash
hermes -p coder chat
hermes --profile=coder doctor
hermes chat -p coder -q "hello"    # 可放在任意位置
```

### 设置默认配置文件（`hermes profile use`）

```bash
hermes profile use coder
hermes chat                   # 现在指向 coder
hermes tools                  # 配置 coder 的工具
hermes profile use default    # 切换回默认
```

设置后，不带参数的 `hermes` 命令将指向该配置文件。类似于 `kubectl config use-context`。

### 确认当前配置文件

CLI 始终显示当前激活的配置文件：

- **提示符**：显示 `coder ❯` 而非 `❯`
- **启动横幅**：显示 `Profile: coder`
- **`hermes profile`**：显示当前配置文件名称、路径、模型和网关状态

## 运行网关

每个配置文件以独立进程运行自己的网关，使用各自的机器人 token：

```bash
coder gateway start           # 启动 coder 的网关
assistant gateway start       # 启动 assistant 的网关（独立进程）
```

### 不同的机器人 token

每个配置文件有独立的 `.env` 文件，可在其中配置不同的 Telegram/Discord/Slack 机器人 token：

```bash
# 编辑 coder 的 token
nano ~/.hermes/profiles/coder/.env

# 编辑 assistant 的 token
nano ~/.hermes/profiles/assistant/.env
```

### 安全机制：token 锁

如果两个配置文件误用了相同的机器人 token，第二个网关会被阻止启动，并显示明确的错误信息，指出冲突的配置文件名称。支持 Telegram、Discord、Slack、WhatsApp 和 Signal。

### 持久服务

```bash
coder gateway install         # 创建 hermes-gateway-coder systemd/launchd 服务
assistant gateway install     # 创建 hermes-gateway-assistant 服务
```

每个配置文件有独立的服务名称，彼此独立运行。

## 配置各配置文件

每个配置文件都有独立的：

- **`config.yaml`** — 模型、提供商、工具集及所有设置
- **`.env`** — API 密钥、机器人 token
- **`SOUL.md`** — 人格设定和指令

```bash
coder config set model.model anthropic/claude-sonnet-4
echo "You are a focused coding assistant." > ~/.hermes/profiles/coder/SOUL.md
```

## 更新

`hermes update` 拉取一次共享代码库，并自动将新的内置技能同步到**所有**配置文件：

```bash
hermes update
# → Code updated (12 commits)
# → Skills synced: default (up to date), coder (+2 new), assistant (+2 new)
```

用户修改过的技能不会被覆盖。

## 管理配置文件

```bash
hermes profile list           # 显示所有配置文件及状态
hermes profile show coder     # 显示指定配置文件的详细信息
hermes profile rename coder dev-bot   # 重命名（同步更新别名和服务）
hermes profile export coder   # 导出为 coder.tar.gz
hermes profile import coder.tar.gz   # 从归档文件导入
```

## 删除配置文件

```bash
hermes profile delete coder
```

此操作会停止网关、移除 systemd/launchd 服务、删除命令别名，并清除所有配置文件数据。执行前需要输入配置文件名称进行确认。

使用 `--yes` 跳过确认：`hermes profile delete coder --yes`

:::note
无法删除默认配置文件（`~/.hermes`）。如需删除所有内容，请使用 `hermes uninstall`。
:::

## Tab 补全

```bash
# Bash
eval "$(hermes completion bash)"

# Zsh
eval "$(hermes completion zsh)"
```

将上述命令添加到 `~/.bashrc` 或 `~/.zshrc` 使补全设置永久生效。支持补全 `-p` 后的配置文件名称、配置文件子命令和顶级命令。

## 工作原理

配置文件通过 `HERMES_HOME` 环境变量实现。运行 `coder chat` 时，包装脚本会在启动 hermes 前将 `HERMES_HOME` 设置为 `~/.hermes/profiles/coder`。代码库中 119 个以上的文件通过 `get_hermes_home()` 解析路径，因此所有内容——配置、会话、记忆、技能、状态数据库、网关 PID、日志和定时任务——都会自动指向该配置文件的目录。

默认配置文件就是 `~/.hermes` 本身，无需迁移——现有安装可直接使用。
