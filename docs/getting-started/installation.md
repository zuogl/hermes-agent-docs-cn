---
title: "安装"
---
# 安装

两分钟内完成 Hermes Agent 的安装——使用一键安装脚本快速上手，也可以手动安装以完全掌控过程。

## 快速安装

### Linux / macOS / WSL2

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

:::caution
Windows
不支持原生 Windows。请先安装 [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install)，然后在 WSL2 中运行 Hermes Agent。上述安装命令在 WSL2 中可以正常使用。
:::

### 安装脚本做了什么

安装脚本会自动完成一切——安装全部依赖项（Python、Node.js、ripgrep、ffmpeg）、克隆仓库、创建虚拟环境、配置全局 `hermes` 命令，以及设置 LLM（大语言模型）提供商。完成后即可开始使用。

### 安装完成后

重新加载 shell，然后就可以开始对话了：

```bash
source ~/.bashrc   # 或: source ~/.zshrc
hermes             # 开始对话！
```

如果后续需要调整设置，可以使用以下命令：

```bash
hermes model          # 选择 LLM 提供商和模型
hermes tools          # 配置启用哪些工具
hermes gateway setup  # 设置消息平台
hermes config set     # 设置单个配置项
hermes setup          # 或运行完整的设置向导，一次性配置所有选项
```

---

## 前置依赖

唯一的前置依赖是 **Git**。安装脚本会自动处理其余部分：

- **uv**（高速 Python 包管理器）
- **Python 3.11**（通过 uv 安装，无需 sudo）
- **Node.js v22**（用于浏览器自动化和 WhatsApp 桥接）
- **ripgrep**（高速文件搜索）
- **ffmpeg**（TTS 音频格式转换）

:::info
你**不需要**手动安装 Python、Node.js、ripgrep 或 ffmpeg。安装脚本会检测缺失的组件并自动安装。只需确保 `git` 可用（运行 `git --version` 验证）。
:::

:::tip
Nix 用户
如果你使用 Nix（无论是 NixOS、macOS 还是 Linux），有专门的安装路径，提供 Nix flake、声明式 NixOS 模块和可选的容器模式。详见 **[Nix 与 NixOS 安装指南](/getting-started/nix-setup)**。
:::

---

## 手动安装

如果你需要完全掌控安装过程，请按以下步骤操作。

### 第 1 步：克隆仓库

使用 `--recurse-submodules` 克隆，以拉取所需的子模块：

```bash
git clone --recurse-submodules https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
```

如果之前克隆时没有加 `--recurse-submodules`：

```bash
git submodule update --init --recursive
```

### 第 2 步：安装 uv 并创建虚拟环境

```bash
# 安装 uv（如果尚未安装）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 使用 Python 3.11 创建虚拟环境（uv 会在需要时自动下载——无需 sudo）
uv venv venv --python 3.11
```

:::tip
使用 `hermes` 时**不需要**激活虚拟环境。入口文件的 shebang 已硬编码指向虚拟环境中的 Python，因此创建符号链接后即可全局使用。
:::

### 第 3 步：安装 Python 依赖

```bash
# 告诉 uv 安装到哪个虚拟环境
export VIRTUAL_ENV="$(pwd)/venv"

# 安装全部可选扩展
uv pip install -e ".[all]"
```

如果你只需要核心智能体功能（不含 Telegram/Discord/cron 支持）：

```bash
uv pip install -e "."
```

**可选扩展详情**

| 扩展 | 功能说明 | 安装命令 |
|------|---------|---------|
| `all` | 以下所有扩展 | `uv pip install -e ".[all]"` |
| `messaging` | Telegram 和 Discord 网关 | `uv pip install -e ".[messaging]"` |
| `cron` | cron 表达式解析，用于定时任务 | `uv pip install -e ".[cron]"` |
| `cli` | 设置向导的终端菜单 UI | `uv pip install -e ".[cli]"` |
| `modal` | Modal 云执行后端 | `uv pip install -e ".[modal]"` |
| `tts-premium` | ElevenLabs 高级语音 | `uv pip install -e ".[tts-premium]"` |
| `voice` | CLI 麦克风输入 + 音频播放 | `uv pip install -e ".[voice]"` |
| `pty` | PTY 终端支持 | `uv pip install -e ".[pty]"` |
| `honcho` | AI 原生记忆（Honcho 集成） | `uv pip install -e ".[honcho]"` |
| `mcp` | MCP（Model Context Protocol）支持 | `uv pip install -e ".[mcp]"` |
| `homeassistant` | Home Assistant 集成 | `uv pip install -e ".[homeassistant]"` |
| `acp` | ACP（Agent Control Protocol）编辑器集成支持 | `uv pip install -e ".[acp]"` |
| `slack` | Slack 消息 | `uv pip install -e ".[slack]"` |
| `dev` | pytest 和测试工具 | `uv pip install -e ".[dev]"` |

可以组合多个扩展：`uv pip install -e ".[messaging,cron]"`

### 第 4 步：安装可选子模块

```bash
# RL 训练后端（可选）
uv pip install -e "./tinker-atropos"
```

这是可选的——如果跳过，对应的工具集将不可用。

### 第 5 步：安装 Node.js 依赖（可选）

仅在需要**浏览器自动化**（基于 Browserbase）和 **WhatsApp 桥接**时才需要：

```bash
npm install
```

### 第 6 步：创建配置目录

```bash
# 创建目录结构
mkdir -p ~/.hermes/{cron,sessions,logs,memories,skills,pairing,hooks,image_cache,audio_cache,whatsapp/session}

# 复制示例配置文件
cp cli-config.yaml.example ~/.hermes/config.yaml

# 创建空的 .env 文件用于存放 API 密钥
touch ~/.hermes/.env
```

### 第 7 步：添加 API 密钥

打开 `~/.hermes/.env`，至少添加一个 LLM 提供商的密钥：

```bash
# 必填——至少需要一个 LLM 提供商：
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# 可选——启用额外的工具：
FIRECRAWL_API_KEY=fc-your-key          # 网页搜索和抓取（也可自托管，详见文档）
FAL_KEY=your-fal-key                   # 图像生成（FLUX）
```

也可以通过 CLI 设置：

```bash
hermes config set OPENROUTER_API_KEY sk-or-v1-your-key-here
```

### 第 8 步：将 `hermes` 添加到 PATH

```bash
mkdir -p ~/.local/bin
ln -sf "$(pwd)/venv/bin/hermes" ~/.local/bin/hermes
```

如果 `~/.local/bin` 不在你的 PATH 中，将其添加到 shell 配置文件：

```bash
# Bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc

# Zsh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

# Fish
fish_add_path $HOME/.local/bin
```

### 第 9 步：配置提供商

```bash
hermes model       # 选择 LLM 提供商和模型
```

### 第 10 步：验证安装

```bash
hermes version    # 检查命令是否可用
hermes doctor     # 运行诊断，验证一切是否正常
hermes status     # 检查配置状态
hermes chat -q "Hello! What tools do you have available?"
```

---

## 快速参考：手动安装（精简版）

以下是全部命令：

```bash
# 安装 uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 克隆并进入目录
git clone --recurse-submodules https://github.com/NousResearch/hermes-agent.git
cd hermes-agent

# 使用 Python 3.11 创建虚拟环境
uv venv venv --python 3.11
export VIRTUAL_ENV="$(pwd)/venv"

# 安装所有依赖
uv pip install -e ".[all]"
uv pip install -e "./tinker-atropos"
npm install  # 可选，用于浏览器工具和 WhatsApp

# 配置
mkdir -p ~/.hermes/{cron,sessions,logs,memories,skills,pairing,hooks,image_cache,audio_cache,whatsapp/session}
cp cli-config.yaml.example ~/.hermes/config.yaml
touch ~/.hermes/.env
echo 'OPENROUTER_API_KEY=sk-or-v1-your-key' >> ~/.hermes/.env

# 全局可用
mkdir -p ~/.local/bin
ln -sf "$(pwd)/venv/bin/hermes" ~/.local/bin/hermes

# 验证
hermes doctor
hermes
```

---

## 故障排查

| 问题 | 解决方法 |
|------|---------|
| `hermes: command not found` | 重新加载 shell（`source ~/.bashrc`）或检查 PATH |
| `API key not set` | 运行 `hermes model` 配置提供商，或执行 `hermes config set OPENROUTER_API_KEY your_key` |
| 更新后配置丢失 | 运行 `hermes config check`，然后执行 `hermes config migrate` |

如需更多诊断信息，运行 `hermes doctor`——它会告诉你具体缺少什么以及如何修复。
