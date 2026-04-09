---
title: "常见问题与故障排查"
---
# 常见问题与故障排查

针对最常见问题与故障的快速解答和修复方案。

---

## 常见问题

### Hermes 支持哪些 LLM provider？

Hermes Agent 可与任何兼容 OpenAI 的 API 配合使用。支持的 provider 包括：

- **[OpenRouter](https://openrouter.ai/)** — 通过一个 API key 访问数百个模型（推荐，灵活性强）
- **Nous Portal** — Nous Research 自有推理端点
- **OpenAI** — GPT-4o、o1、o3 等
- **Anthropic** — Claude 系列模型（通过 OpenRouter 或兼容代理）
- **Google** — Gemini 系列模型（通过 OpenRouter 或兼容代理）
- **z.ai / ZhipuAI** — GLM 系列模型
- **Kimi / Moonshot AI** — Kimi 系列模型
- **MiniMax** — 国际与国内端点
- **本地模型** — 通过 [Ollama](https://ollama.com/)、[vLLM](https://docs.vllm.ai/)、[llama.cpp](https://github.com/ggerganov/llama.cpp)、[SGLang](https://github.com/sgl-project/sglang) 或任何兼容 OpenAI 的服务器

使用 `hermes model` 命令或编辑 `~/.hermes/.env` 来设置 provider。所有 provider key 的说明，请参阅[环境变量](/reference/environment-variables)参考文档。

### 在 Windows 上可以使用吗？

**原生不支持。** Hermes Agent 需要类 Unix 环境。在 Windows 上，请安装 [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) 并在其中运行 Hermes。标准安装命令在 WSL2 中可以完美运行：

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

### 我的数据会被发送到外部吗？

API 调用**仅发送至您配置的 LLM provider**（例如 OpenRouter 或您本地的 Ollama 实例）。Hermes Agent 不收集任何遥测数据、使用统计或分析信息。您的对话、memory 和 skill 均存储在本地 `~/.hermes/` 目录中。

### 可以离线使用 / 使用本地模型吗？

可以。运行 `hermes model`，选择 **Custom endpoint**，然后输入服务器的 URL：

```bash
hermes model
# 选择：Custom endpoint（手动输入 URL）
# API base URL: http://localhost:11434/v1
# API key: ollama
# Model name: qwen3.5:27b
# Context length: 32768   ← 设置为与服务器实际上下文窗口匹配的值
```

或直接在 `config.yaml` 中配置：

```yaml
model:
  default: qwen3.5:27b
  provider: custom
  base_url: http://localhost:11434/v1
```

Hermes 会将端点、provider 和 base URL 持久化保存到 `config.yaml`，重启后配置依然有效。如果本地服务器只加载了一个模型，`/model custom` 会自动检测到。您也可以在 config.yaml 中设置 `provider: custom`——这是一个独立的 provider，不是其他任何配置的别名。

此方式适用于 Ollama、vLLM、llama.cpp server、SGLang、LocalAI 等。详情请参阅[配置指南](/user-guide/configuration)。

:::tip
Ollama 用户请注意
如果您在 Ollama 中设置了自定义 `num_ctx`（例如 `ollama run --num_ctx 16384`），请确保在 Hermes 中也设置相应的上下文长度——Ollama 的 `/api/show` 返回的是模型的*最大*上下文，而非您实际配置的 `num_ctx`。
:::

### 使用费用是多少？

Hermes Agent 本身**免费且开源**（MIT 协议）。您只需为所选 provider 的 LLM API 调用付费。本地模型完全免费运行。

### 多人可以共用一个实例吗？

可以。[messaging gateway](/user-guide/messaging/) 支持多个用户通过 Telegram、Discord、Slack、WhatsApp 或 Home Assistant 与同一个 Hermes Agent 实例交互。访问权限通过白名单（指定用户 ID）和私信配对（第一个发消息的用户获得访问权）来控制。

### memory 和 skill 有什么区别？

- **Memory** 存储**事实**——agent 了解的关于您、您的项目和偏好的信息。Memory 会根据相关性自动检索。
- **Skill** 存储**流程**——如何完成某件事的分步说明。当 agent 遇到类似任务时，会自动调用相应的 skill。

两者均跨 session 持久保存。详情请参阅 [Memory](/user-guide/features/memory) 和 [Skills](/user-guide/features/skills)。

### 可以在自己的 Python 项目中使用吗？

可以。导入 `AIAgent` 类，以编程方式使用 Hermes：

```python
from run_agent import AIAgent

agent = AIAgent(model="openrouter/nous/hermes-3-llama-3.1-70b")
response = agent.chat("Explain quantum computing briefly")
```

完整 API 用法请参阅 [Python Library 指南](/user-guide/features/code-execution)。

---

## 故障排查

### 安装问题

#### 安装后出现 `hermes: command not found`

**原因：** Shell 未重新加载已更新的 PATH。

**解决方案：**
```bash
# 重新加载 shell 配置文件
source ~/.bashrc    # bash
source ~/.zshrc     # zsh

# 或者重新打开一个终端窗口
```

如果仍不工作，请验证安装位置：
```bash
which hermes
ls ~/.local/bin/hermes
```

:::tip
安装程序会将 `~/.local/bin` 添加到您的 PATH。如果您使用了非标准的 shell 配置，请手动添加：`export PATH="$HOME/.local/bin:$PATH"`。
:::

#### Python 版本过旧

**原因：** Hermes 需要 Python 3.11 或更高版本。

**解决方案：**
```bash
python3 --version   # 查看当前版本

# 安装更高版本的 Python
sudo apt install python3.12   # Ubuntu/Debian
brew install python@3.12      # macOS
```

安装程序会自动处理此问题——若在手动安装时遇到此错误，请先升级 Python。

#### `uv: command not found`

**原因：** `uv` 包管理器未安装或不在 PATH 中。

**解决方案：**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

#### 安装时出现权限拒绝错误

**原因：** 对安装目录没有足够的写入权限。

**解决方案：**
```bash
# 请勿对安装程序使用 sudo——它安装到 ~/.local/bin
# 如果之前使用 sudo 安装过，请先清理：
sudo rm /usr/local/bin/hermes
# 然后重新运行标准安装程序
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

---

### Provider 与模型问题

#### API key 无法使用

**原因：** key 缺失、已过期、设置有误，或与 provider 不匹配。

**解决方案：**
```bash
# 查看当前配置
hermes config show

# 重新配置 provider
hermes model

# 或直接设置
hermes config set OPENROUTER_API_KEY sk-or-v1-xxxxxxxxxxxx
```

:::caution
请确保 key 与 provider 匹配。OpenAI 的 key 无法用于 OpenRouter，反之亦然。请检查 `~/.hermes/.env` 中是否存在冲突条目。
:::

#### 模型不可用 / 找不到模型

**原因：** 模型标识符不正确，或该模型在您的 provider 上不可用。

**解决方案：**
```bash
# 列出 provider 的可用模型
hermes model

# 设置一个有效的模型
hermes config set HERMES_MODEL openrouter/nous/hermes-3-llama-3.1-70b

# 或在单次 session 中指定
hermes chat --model openrouter/meta-llama/llama-3.1-70b-instruct
```

#### 速率限制（429 错误）

**原因：** 您已超出 provider 的速率限制。

**解决方案：** 稍等片刻后重试。对于持续性使用，建议：
- 升级您的 provider 套餐
- 切换到其他模型或 provider
- 使用 `hermes chat --provider ` 路由到其他后端

#### 超出上下文长度

**原因：** 对话内容已超出模型的上下文窗口，或 Hermes 检测到了错误的上下文长度。

**解决方案：**
```bash
# 压缩当前 session
/compress

# 或开启新的 session
hermes chat

# 使用上下文窗口更大的模型
hermes chat --model openrouter/google/gemini-3-flash-preview
```

如果在第一次长对话时就出现此问题，可能是 Hermes 检测到了错误的上下文长度。请查看 CLI 启动行中显示的检测值（例如 `📊 Context limit: 128000 tokens`），也可以在 session 中使用 `/usage` 查看。

要手动修正上下文长度，请显式设置：

```yaml
# 在 ~/.hermes/config.yaml 中
model:
  default: your-model-name
  context_length: 131072  # 您模型的实际上下文窗口大小
```

或对自定义端点按模型单独设置：

```yaml
custom_providers:
  - name: "My Server"
    base_url: "http://localhost:11434/v1"
    models:
      qwen3.5:27b:
        context_length: 32768
```

关于自动检测的工作原理及所有覆盖选项，请参阅[上下文长度检测](/integrations/providers#context-length-detection)。

---

### 终端问题

#### 命令被拦截为危险操作

**原因：** Hermes 检测到潜在破坏性命令（例如 `rm -rf`、`DROP TABLE`）。这是一项安全特性。

**解决方案：** 当出现确认提示时，检查命令内容，然后输入 `y` 进行批准。您也可以：
- 请 agent 使用更安全的替代方案
- 在[安全文档](/user-guide/security)中查看完整的危险模式列表

:::tip
这是按预期运行的——Hermes 绝不会静默执行破坏性命令。确认提示会明确显示将要执行的内容。
:::

#### 通过 messaging gateway 无法使用 `sudo`

**原因：** messaging gateway 在无交互终端的环境下运行，因此 `sudo` 无法弹出密码输入提示。

**解决方案：**
- 在消息场景中避免使用 `sudo`——请 agent 寻找替代方案
- 如果必须使用 `sudo`，请在 `/etc/sudoers` 中为特定命令配置免密 sudo
- 或切换到终端界面执行管理操作：`hermes chat`

#### Docker 后端无法连接

**原因：** Docker daemon 未运行，或当前用户缺少相应权限。

**解决方案：**
```bash
# 检查 Docker 是否在运行
docker info

# 将当前用户加入 docker 组
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker run hello-world
```

---

### 消息问题

#### Bot 不响应消息

**原因：** Bot 未运行、未获授权，或您的用户不在白名单中。

**解决方案：**
```bash
# 检查 gateway 是否在运行
hermes gateway status

# 启动 gateway
hermes gateway start

# 查看日志中的错误
cat ~/.hermes/logs/gateway.log | tail -50
```

#### 消息无法送达

**原因：** 网络问题、bot token 过期，或平台 webhook 配置有误。

**解决方案：**
- 使用 `hermes gateway setup` 验证 bot token 是否有效
- 查看 gateway 日志：`cat ~/.hermes/logs/gateway.log | tail -50`
- 对于基于 webhook 的平台（Slack、WhatsApp），请确保服务器可公开访问

#### 白名单困惑——谁可以与 bot 交互？

**原因：** 授权模式决定了访问权限。

**解决方案：**

| 模式 | 工作方式 |
|------|-------------|
| **白名单（Allowlist）** | 只有配置中列出的用户 ID 才能交互 |
| **私信配对（DM pairing）** | 第一个在私信中发消息的用户获得独占访问权 |
| **开放（Open）** | 任何人均可交互（不建议在生产环境使用） |

在 `~/.hermes/config.yaml` 的 gateway 设置下配置。请参阅[消息文档](/user-guide/messaging/)。

#### Gateway 无法启动

**原因：** 缺少依赖、端口冲突或 token 配置有误。

**解决方案：**
```bash
# 安装消息依赖
pip install "hermes-agent[telegram]"   # 或 [discord]、[slack]、[whatsapp]

# 检查端口冲突
lsof -i :8080

# 验证配置
hermes config show
```

#### macOS：gateway 找不到 Node.js / ffmpeg / 其他工具

**原因：** launchd 服务继承的是最小化 PATH（`/usr/bin:/bin:/usr/sbin:/sbin`），不包含 Homebrew、nvm、cargo 或其他用户安装的工具目录。这通常导致 WhatsApp bridge 报错（`node not found`）或语音转录失败（`ffmpeg not found`）。

**解决方案：** 运行 `hermes gateway install` 时，gateway 会捕获您当前的 shell PATH。如果在设置 gateway 之后安装了新工具，请重新运行安装命令以更新 PATH：

```bash
hermes gateway install    # 重新快照当前 PATH
hermes gateway start      # 检测更新后的 plist 并重新加载
```

可以通过以下命令验证 plist 中的 PATH 是否正确：
```bash
/usr/libexec/PlistBuddy -c "Print :EnvironmentVariables:PATH" \
  ~/Library/LaunchAgents/ai.hermes.gateway.plist
```

---

### 性能问题

#### 响应缓慢

**原因：** 模型体积大、API 服务器距离较远，或系统提示词包含过多工具。

**解决方案：**
- 尝试更快/更小的模型：`hermes chat --model openrouter/meta-llama/llama-3.1-8b-instruct`
- 减少激活的工具集：`hermes chat -t "terminal"`
- 检查与 provider 的网络延迟
- 对于本地模型，确保 GPU 显存充足

#### Token 用量过高

**原因：** 对话过长、系统提示词冗长，或大量工具调用积累了过多上下文。

**解决方案：**
```bash
# 压缩对话以减少 token 用量
/compress

# 查看当前 session 的 token 用量
/usage
```

:::tip
在长 session 中请定期使用 `/compress`。它会对对话历史进行摘要，在保留上下文的同时显著减少 token 用量。
:::

#### Session 过长

**原因：** 长时间对话会积累大量消息和工具输出，逐渐逼近上下文限制。

**解决方案：**
```bash
# 压缩当前 session（保留关键上下文）
/compress

# 开启新 session
hermes chat

# 如需继续之前的 session
hermes chat --continue
```

---

### MCP 问题

#### MCP server 无法连接

**原因：** 找不到 server 可执行文件、命令路径错误，或缺少运行时环境。

**解决方案：**
```bash
# 确保 MCP 依赖已安装（标准安装已包含）
cd ~/.hermes/hermes-agent && uv pip install -e ".[mcp]"

# 对于基于 npm 的 server，确保 Node.js 可用
node --version
npx --version

# 手动测试 server
npx -y @modelcontextprotocol/server-filesystem /tmp
```

验证 `~/.hermes/config.yaml` 中的 MCP 配置：
```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/docs"]
```

#### MCP server 的工具未显示

**原因：** server 已启动但工具发现失败、工具被配置过滤，或 server 不支持您期望的 MCP 能力。

**解决方案：**
- 查看 gateway/agent 日志中的 MCP 连接错误
- 确保 server 能响应 `tools/list` RPC 方法
- 检查该 server 下的 `tools.include`、`tools.exclude`、`tools.resources`、`tools.prompts` 或 `enabled` 设置
- 请注意，资源/提示工具只有在 session 实际支持相应能力时才会注册
- 修改配置后使用 `/reload-mcp` 重新加载

```bash
# 验证 MCP server 已配置
hermes config show | grep -A 12 mcp_servers

# 修改配置后重启 Hermes 或重新加载 MCP
hermes chat
```

另请参阅：
- [MCP（Model Context Protocol）](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)
- [在 Hermes 中使用 MCP](https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes)
- [MCP 配置参考](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference)

#### MCP 超时错误

**原因：** MCP server 响应时间过长，或在执行过程中崩溃。

**解决方案：**
- 如 MCP server 配置支持，请增大超时时间
- 检查 MCP server 进程是否仍在运行
- 对于远程 HTTP MCP server，请检查网络连通性

:::caution
如果 MCP server 在请求中途崩溃，Hermes 将报告超时。请查看 server 自身的日志（而不仅仅是 Hermes 日志）以诊断根本原因。
:::

---

## Profile

### Profile 与直接设置 HERMES_HOME 有何区别？

Profile 是在 `HERMES_HOME` 之上的托管层。您*当然可以*在每次命令前手动设置 `HERMES_HOME=/some/path`，但 profile 会为您处理所有底层工作：创建目录结构、生成 shell 别名（`hermes-work`）、在 `~/.hermes/active_profile` 中跟踪当前激活的 profile，以及自动将 skill 更新同步到所有 profile。它还与 Tab 补全集成，让您无需记忆路径。

### 两个 profile 可以共用同一个 bot token 吗？

不可以。每个消息平台（Telegram、Discord 等）要求独占一个 bot token。如果两个 profile 同时使用同一个 token，第二个 gateway 将无法连接。请为每个 profile 单独创建一个 bot——对于 Telegram，请联系 [@BotFather](https://t.me/BotFather) 创建更多 bot。

### Profile 之间共享 memory 或 session 吗？

不共享。每个 profile 有各自独立的 memory 存储、session 数据库和 skill 目录，完全隔离。如果您希望基于已有 memory 和 session 新建一个 profile，请使用 `hermes profile create newname --clone-all` 从当前 profile 复制所有内容。

### 运行 `hermes update` 时会发生什么？

`hermes update` 会拉取最新代码并**一次性**重新安装依赖（而非按 profile 分别安装），然后自动将更新后的 skill 同步到所有 profile。您只需运行一次 `hermes update`，即可覆盖机器上的所有 profile。

### 可以将 profile 迁移到另一台机器吗？

可以。将 profile 导出为可移植的归档文件，然后在目标机器上导入：

```bash
# 在源机器上
hermes profile export work ./work-backup.tar.gz

# 将文件复制到目标机器后：
hermes profile import ./work-backup.tar.gz work
```

导入的 profile 将包含导出时的所有配置、memory、session 和 skill。如果目标机器的环境不同，您可能需要更新路径或重新向 provider 进行身份验证。

### 可以同时运行多少个 profile？

没有硬性上限。每个 profile 只是 `~/.hermes/profiles/` 下的一个目录。实际限制取决于磁盘空间以及系统可以承载的并发 gateway 数量（每个 gateway 都是一个轻量级 Python 进程）。同时运行数十个 profile 完全没问题；每个空闲的 profile 不占用任何资源。

---

## 工作流与使用模式

### 针对不同任务使用不同模型（多模型工作流）

**场景：** 您日常使用 GPT-5.4，但发现 Gemini 或 Grok 在撰写社交媒体内容方面更出色。每次手动切换模型非常繁琐。

**解决方案：委托配置（Delegation config）。** Hermes 可以自动将子 agent 路由到其他模型。在 `~/.hermes/config.yaml` 中设置：

```yaml
delegation:
  model: "google/gemini-3-flash-preview"   # 子 agent 使用此模型
  provider: "openrouter"                    # 子 agent 的 provider
```

这样，当您告诉 Hermes "帮我写一篇关于 X 的 Twitter 长文"并触发 `delegate_task` 子 agent 时，该子 agent 将运行在 Gemini 而非您的主模型上，而主对话仍使用 GPT-5.4。

您也可以在提示词中明确指定：*"委托一个任务来撰写我们产品发布的社交媒体帖子。请让子 agent 来完成实际写作。"* Agent 会调用 `delegate_task`，并自动应用委托配置。

对于无需委托的一次性模型切换，可在 CLI 中使用 `/model`：

```bash
/model google/gemini-3-flash-preview    # 切换到当前 session
# ... 撰写内容 ...
/model openai/gpt-5.4                   # 切换回来
```

关于委托机制的详细说明，请参阅[子 Agent 委托](/user-guide/features/delegation)。

### 在同一个 WhatsApp 号码上运行多个 agent（按对话绑定）

**场景：** 在 OpenClaw 中，您可以将多个独立 agent 绑定到特定的 WhatsApp 对话——一个用于家庭购物群，另一个用于私聊。Hermes 能做到这一点吗？

**当前限制：** 每个 Hermes profile 都需要独立的 WhatsApp 号码/session。您无法将多个 profile 绑定到同一个 WhatsApp 号码的不同对话——WhatsApp bridge（Baileys）每个号码只使用一个已认证的 session。

**变通方案：**

1. **使用单一 profile 并切换人设。** 创建不同的 `AGENTS.md` 上下文文件，或使用 `/personality` 命令按对话改变行为。Agent 能感知所在的对话并做出适应性调整。

2. **使用 cron 任务处理专项事务。** 对于购物清单追踪器，可以设置一个监控特定对话的 cron 任务来管理清单，无需单独的 agent。

3. **使用独立号码。** 如果确实需要完全独立的 agent，请为每个 profile 绑定一个专属 WhatsApp 号码。Google Voice 等服务提供的虚拟号码适合这种用途。

4. **改用 Telegram 或 Discord。** 这些平台对按对话绑定的支持更为原生——每个 Telegram 群组或 Discord 频道都有独立 session，且可以在同一账户下为不同 profile 运行多个 bot token。

更多详情请参阅 [Profile](/user-guide/profiles) 和 [WhatsApp 设置](/user-guide/messaging/whatsapp)。

### 控制 Telegram 中显示的内容（隐藏日志与推理过程）

**场景：** 您在 Telegram 中看到了 gateway 执行日志、Hermes 推理过程和工具调用详情，而不是只看到最终回复。

**解决方案：** `config.yaml` 中的 `display.tool_progress` 设置控制工具活动的显示级别：

```yaml
display:
  tool_progress: "off"   # 可选值：off、new、all、verbose
```

- **`off`** — 只显示最终回复，不显示工具调用、推理过程或日志。
- **`new`** — 在工具调用发生时实时显示（简短的单行提示）。
- **`all`** — 显示所有工具活动，包括执行结果。
- **`verbose`** — 完整详情，包括工具参数和输出。

对于消息平台，通常建议使用 `off` 或 `new`。编辑 `config.yaml` 后，请重启 gateway 使更改生效。

您也可以通过 `/verbose` 命令在 session 中切换（需先启用）：

```yaml
display:
  tool_progress_command: true   # 在 gateway 中启用 /verbose 命令
```

### 管理 Telegram 上的 skill（斜杠命令数量限制）

**场景：** Telegram 有 100 个斜杠命令的上限，您的 skill 数量已超出该限制。您希望禁用 Telegram 上不需要的 skill，但 `hermes skills config` 设置似乎未生效。

**解决方案：** 使用 `hermes skills config` 按平台禁用 skill。此操作会写入 `config.yaml`：

```yaml
skills:
  disabled: []                    # 全局禁用的 skill
  platform_disabled:
    telegram: [skill-a, skill-b]  # 仅在 telegram 上禁用
```

更改后，请**重启 gateway**（`hermes gateway restart` 或手动终止并重启）。Telegram bot 命令菜单会在启动时重新构建。

:::tip
描述过长的 skill 在 Telegram 菜单中会被截断至 40 个字符，以满足 payload 大小限制。如果 skill 未显示，问题可能出在 payload 总大小而非 100 条命令的数量限制——禁用不常用的 skill 对两者都有帮助。
:::

### 共享线程 session（多用户共享同一对话）

**场景：** 您有一个 Telegram 或 Discord 线程，多人在其中 @ bot。您希望该线程中的所有 @ 消息共享同一个对话，而非每个用户各有独立 session。

**当前行为：** 在大多数平台上，Hermes 以用户 ID 为键创建 session，因此每个人都有各自独立的对话上下文。这是出于隐私和上下文隔离的设计考量。

**变通方案：**

1. **使用 Slack。** Slack 的 session 以线程为键，而非用户。同一线程中的多个用户共享同一对话——这正是您描述的效果，也是最自然的适配方案。

2. **使用单用户群聊。** 指定一人作为"操作员"转达问题，session 保持统一，其他人可以旁听。

3. **使用 Discord 频道。** Discord 的 session 以频道为键，同一频道中的所有用户共享上下文。可以专门开设一个频道用于共享对话。

### 将 Hermes 迁移到另一台机器

**场景：** 您在一台机器上积累了 skill、cron 任务和 memory，希望将所有内容迁移到新的专用 Linux 主机。

**解决方案：**

1. 在新机器上安装 Hermes Agent：
   ```bash
   curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
   ```

2. 复制整个 `~/.hermes/` 目录，**排除** `hermes-agent` 子目录（这是代码仓库，新安装会有独立的版本）：
   ```bash
   # 在源机器上
   rsync -av --exclude='hermes-agent' ~/.hermes/ newmachine:~/.hermes/
   ```

   或使用 profile 导出/导入：
   ```bash
   # 在源机器上
   hermes profile export default ./hermes-backup.tar.gz

   # 在目标机器上
   hermes profile import ./hermes-backup.tar.gz default
   ```

3. 在新机器上运行 `hermes setup`，验证 API key 和 provider 配置是否正常。重新认证所有消息平台（尤其是使用二维码配对的 WhatsApp）。

`~/.hermes/` 目录包含所有内容：`config.yaml`、`.env`、`SOUL.md`、`memories/`、`skills/`、`state.db`（session）、`cron/` 以及任何自定义插件。代码本身存放在 `~/.hermes/hermes-agent/`，会在新机器上全新安装。

### 安装后重新加载 shell 时出现权限拒绝错误

**场景：** 运行 Hermes 安装程序后，执行 `source ~/.zshrc` 报权限拒绝错误。

**原因：** 通常是 `~/.zshrc`（或 `~/.bashrc`）的文件权限不正确，或安装程序未能完整写入。这不是 Hermes 特有的问题，而是 shell 配置文件的权限问题。

**解决方案：**
```bash
# 检查权限
ls -la ~/.zshrc

# 如需修正（应为 -rw-r--r-- 即 644）
chmod 644 ~/.zshrc

# 然后重新加载
source ~/.zshrc

# 或者直接打开新的终端窗口——它会自动应用 PATH 变更
```

如果安装程序已添加 PATH 行但权限有误，可以手动添加：
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

### 首次运行 agent 时出现 400 错误

**场景：** 安装配置一切正常，但第一次尝试对话时失败，提示 HTTP 400。

**原因：** 通常是模型名称不匹配——配置的模型在您的 provider 上不存在，或 API key 没有该模型的访问权限。

**解决方案：**
```bash
# 查看当前配置的模型和 provider
hermes config show | head -20

# 重新选择模型
hermes model

# 或用已知可用的模型测试
hermes chat -q "hello" --model anthropic/claude-sonnet-4.6
```

如果使用 OpenRouter，请确认 API key 有足够余额。OpenRouter 返回 400 通常意味着该模型需要付费套餐，或模型 ID 有拼写错误。

---

## 仍然遇到问题？

如果您的问题未在此处得到解答：

1. **搜索已知 issue：** [GitHub Issues](https://github.com/NousResearch/hermes-agent/issues)
2. **在社区提问：** [Nous Research Discord](https://discord.gg/nousresearch)
3. **提交 bug 报告：** 请附上您的操作系统、Python 版本（`python3 --version`）、Hermes 版本（`hermes --version`）以及完整的错误信息
