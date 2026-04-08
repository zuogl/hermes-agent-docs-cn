---
title: "快速入门"
---
# 快速入门

这篇指南帮你完成 Hermes Agent 的安装、提供商配置，并进行第一次对话。读完后，你就能掌握核心功能，知道下一步该做什么。

## 1. 安装 Hermes Agent

运行一行命令即可安装：

```bash
# Linux / macOS / WSL2
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

:::tip
Windows 用户
请先安装 [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install)，然后在 WSL2 终端中运行上述命令。
:::

安装完成后，重新加载 shell：

```bash
source ~/.bashrc   # 或 source ~/.zshrc
```

## 2. 配置提供商

安装程序会自动配置你的 LLM 提供商。如需后续更改，可使用以下命令：

```bash
hermes model       # 选择 LLM 提供商和模型
hermes tools       # 配置启用的工具
hermes setup       # 或一次性配置所有内容
```

`hermes model` 会引导你选择推理提供商：

| 提供商 | 简介 | 配置方式 |
|--------|------|----------|
| **Nous Portal** | 订阅制，零配置 | 通过 `hermes model` 进行 OAuth 登录 |
| **OpenAI Codex** | ChatGPT OAuth，使用 Codex 模型 | 通过 `hermes model` 进行设备码认证 |
| **Anthropic** | 直接使用 Claude 模型（Pro/Max 或 API key） | 通过 `hermes model` 使用 Claude Code 认证，或输入 Anthropic API key |
| **OpenRouter** | 跨多个模型的多提供商路由 | 输入你的 API key |
| **Z.AI** | GLM / 智谱托管模型 | 设置 `GLM_API_KEY` / `ZAI_API_KEY` |
| **Kimi / Moonshot** | Moonshot 托管的编程和对话模型 | 设置 `KIMI_API_KEY` |
| **MiniMax** | MiniMax 国际端点 | 设置 `MINIMAX_API_KEY` |
| **MiniMax China** | MiniMax 中国区端点 | 设置 `MINIMAX_CN_API_KEY` |
| **Alibaba Cloud** | 通过 DashScope 使用 Qwen 模型 | 设置 `DASHSCOPE_API_KEY` |
| **Hugging Face** | 通过统一路由访问 20+ 开源模型（Qwen、DeepSeek、Kimi 等） | 设置 `HF_TOKEN` |
| **Kilo Code** | KiloCode 托管模型 | 设置 `KILOCODE_API_KEY` |
| **OpenCode Zen** | 按量付费，提供精选模型 | 设置 `OPENCODE_ZEN_API_KEY` |
| **OpenCode Go** | $10/月订阅，使用开源模型 | 设置 `OPENCODE_GO_API_KEY` |
| **DeepSeek** | 直接访问 DeepSeek API | 设置 `DEEPSEEK_API_KEY` |
| **GitHub Copilot** | GitHub Copilot 订阅（GPT-5.x、Claude、Gemini 等） | 通过 `hermes model` 进行 OAuth，或设置 `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` |
| **GitHub Copilot ACP** | Copilot ACP（Agent Control Protocol）智能体后端（启动本地 `copilot` CLI） | 通过 `hermes model`（需要安装 `copilot` CLI 并执行 `copilot login`） |
| **Vercel AI Gateway** | Vercel AI Gateway 路由 | 设置 `AI_GATEWAY_API_KEY` |
| **Custom Endpoint** | VLLM、SGLang、Ollama 或任何 OpenAI 兼容 API | 设置 base URL + API key |

:::tip
你可以随时通过 `hermes model` 切换提供商——无需改代码，没有锁定。配置自定义端点时，Hermes 会提示输入上下文窗口大小，并在可能时自动检测。详见[上下文长度检测](/integrations/providers#context-length-detection)。
:::

## 3. 开始对话

```bash
hermes
```

就这么简单！你会看到一个欢迎界面，显示当前模型、可用工具和技能。输入消息按回车即可。

```
❯ 你能帮我做什么？
```

智能体（agent）开箱即用，能使用网页搜索、文件操作、终端命令等多种工具。

## 4. 体验核心功能

### 让它使用终端

```
❯ 我的磁盘使用情况如何？显示占用空间最大的 5 个目录。
```

智能体会代你执行终端命令，并展示结果。

### 使用斜杠命令

输入 `/` 可以看到所有命令的自动补全下拉菜单：

| 命令 | 功能 |
|------|------|
| `/help` | 显示所有可用命令 |
| `/tools` | 列出可用工具 |
| `/model` | 交互式切换模型 |
| `/personality pirate` | 尝试有趣的个性化设定 |
| `/save` | 保存当前对话 |

### 多行输入

按 `Alt+Enter` 或 `Ctrl+J` 可以换行。非常适合粘贴代码或编写详细的提示词。

### 中断智能体

如果智能体响应太慢，直接输入新消息并按回车——它会中断当前任务，转而处理你的新指令。`Ctrl+C` 同样有效。

### 恢复会话

退出时，Hermes 会打印恢复命令：

```bash
hermes --continue    # 恢复最近的会话
hermes -c            # 简写形式
```

## 5. 深入探索

以下是一些值得尝试的功能：

### 配置沙盒终端

为了安全起见，可以在 Docker 容器或远程服务器中运行智能体：

```bash
hermes config set terminal.backend docker    # Docker 隔离
hermes config set terminal.backend ssh       # 远程服务器
```

### 连接消息平台

通过 Telegram、Discord、Slack、WhatsApp、Signal、Email 或 Home Assistant，在手机或其他设备上与 Hermes 对话：

```bash
hermes gateway setup    # 交互式平台配置
```

### 添加语音模式

想在 CLI 中使用麦克风输入，或在消息平台中让 Hermes 语音回复？

```bash
pip install "hermes-agent[voice]"

# 可选但推荐：安装免费的本地语音转文字引擎
pip install faster-whisper
```

然后启动 Hermes，在 CLI 中启用语音：

```text
/voice on
```

按 `Ctrl+B` 录音，或使用 `/voice tts` 让 Hermes 朗读回复。详见[语音模式](/user-guide/features/voice-mode)，了解 CLI、Telegram、Discord 和 Discord 语音频道的完整配置。

### 定时自动任务

```
❯ 每天早上 9 点，查看 Hacker News 上的 AI 新闻，然后在 Telegram 上给我发送摘要。
```

智能体会通过网关设置一个自动运行的定时任务。

### 浏览和安装技能

```bash
hermes skills search kubernetes
hermes skills search react --source skills-sh
hermes skills search https://mintlify.com/docs --source well-known
hermes skills install openai/skills/k8s
hermes skills install official/security/1password
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
```

提示：
- 使用 `--source skills-sh` 搜索公共 `skills.sh` 目录。
- 使用 `--source well-known` 配合文档/网站 URL，从 `/.well-known/skills/index.json` 发现技能。
- 仅在审查第三方技能后使用 `--force`。它可以覆盖非危险的策略限制，但无法覆盖 `dangerous` 扫描判定。

也可以在对话中使用 `/skills` 斜杠命令。

### 在编辑器中通过 ACP 使用 Hermes

Hermes 还可以作为 ACP 服务器运行，支持 VS Code、Zed 和 JetBrains 等兼容编辑器：

```bash
pip install -e '.[acp]'
hermes acp
```

详见 [ACP 编辑器集成](/user-guide/features/acp)。

### 使用 MCP 服务器

通过 MCP（Model Context Protocol）连接外部工具：

```yaml
# 添加到 ~/.hermes/config.yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxx"
```

---

## 快速参考

| 命令 | 说明 |
|------|------|
| `hermes` | 开始对话 |
| `hermes model` | 选择 LLM 提供商和模型 |
| `hermes tools` | 配置各平台启用的工具 |
| `hermes setup` | 完整配置向导（一次性配置所有内容） |
| `hermes doctor` | 诊断问题 |
| `hermes update` | 更新到最新版本 |
| `hermes gateway` | 启动消息网关 |
| `hermes --continue` | 恢复上次会话 |

## 下一步

- **[CLI 指南](/user-guide/cli)** — 掌握终端界面
- **[配置](/user-guide/configuration)** — 自定义你的设置
- **[消息网关](/user-guide/messaging/)** — 连接 Telegram、Discord、Slack、WhatsApp、Signal、Email 或 Home Assistant
- **[工具与工具集](/user-guide/features/tools)** — 探索可用功能
