---
title: "CLI 界面"
---
# CLI 界面

Hermes Agent 的 CLI 是一个完整的终端用户界面（TUI，Terminal User Interface）——而非 Web UI。它支持多行编辑、斜杠命令自动补全、对话历史、中断并重定向，以及流式工具输出。专为"活在终端里"的人而生。

## 启动 CLI

```bash
# 启动交互式会话（默认）
hermes

# 单次查询模式（非交互式）
hermes chat -q "Hello"

# 指定模型
hermes chat --model "anthropic/claude-sonnet-4"

# 指定提供商
hermes chat --provider nous        # 使用 Nous Portal
hermes chat --provider openrouter  # 强制使用 OpenRouter

# 指定工具集
hermes chat --toolsets "web,terminal,skills"

# 启动时预加载一个或多个技能
hermes -s hermes-agent-dev,github-auth
hermes chat -s github-pr-workflow -q "open a draft PR"

# 恢复之前的会话
hermes --continue             # 恢复最近一次 CLI 会话（-c）
hermes --resume <session_id>  # 按 ID 恢复指定会话（-r）

# 详细模式（调试输出）
hermes chat --verbose

# 独立 git 工作树（用于并行运行多个智能体）
hermes -w                         # 在工作树中以交互模式运行
hermes -w -q "Fix issue #123"     # 在工作树中以单次查询模式运行
```

## 界面布局

欢迎横幅一目了然地展示当前模型、终端后端、工作目录、可用工具和已安装技能。

### 状态栏

输入区上方有一个实时更新的持久状态栏：

```
 ⚕ claude-sonnet-4-20250514 │ 12.4K/200K │ [██████░░░░] 6% │ $0.06 │ 15m
```

| 元素 | 说明 |
|------|------|
| 模型名称 | 当前模型（超过 26 个字符时截断显示） |
| Token 计数 | 已用上下文 token 数 / 最大上下文窗口 |
| 上下文进度条 | 带颜色阈值的可视化填充指示器 |
| 费用 | 预估会话费用（免费或无定价模型显示 `n/a`） |
| 时长 | 会话已用时间 |

状态栏自适应终端宽度：≥ 76 列显示完整布局，52–75 列显示紧凑布局，低于 52 列仅显示最简信息（模型 + 时长）。

**上下文颜色编码：**

| 颜色 | 阈值 | 含义 |
|------|------|------|
| 绿色 | < 50% | 空间充足 |
| 黄色 | 50–80% | 逐渐变满 |
| 橙色 | 80–95% | 接近上限 |
| 红色 | ≥ 95% | 濒临溢出——建议执行 `/compress` |

使用 `/usage` 可查看详细用量，包括各类别费用（输入 token 与输出 token 分开显示）。

### 会话恢复显示

恢复之前的会话时（`hermes -c` 或 `hermes --resume <id>`），横幅与输入提示之间会出现一个"历史对话"面板，以精简形式展示对话历史记录。详见 [Sessions — 恢复时的对话摘要](/user-guide/sessions#conversation-recap-on-resume)，其中包含配置说明。

## 快捷键

| 按键 | 操作 |
|------|------|
| `Enter` | 发送消息 |
| `Alt+Enter` 或 `Ctrl+J` | 换行（多行输入） |
| `Alt+V` | 终端支持时从剪贴板粘贴图片 |
| `Ctrl+V` | 粘贴文本，并自动附加剪贴板中的图片 |
| `Ctrl+B` | 启用语音模式时开始/停止录音（`voice.record_key`，默认：`ctrl+b`） |
| `Ctrl+C` | 中断智能体（2 秒内双击强制退出） |
| `Ctrl+D` | 退出 |
| `Ctrl+Z` | 将 Hermes 挂起到后台（仅限 Unix）。在 shell 中运行 `fg` 可恢复。 |
| `Tab` | 接受自动建议（幽灵文本）或自动补全斜杠命令 |

## 斜杠命令

输入 `/` 可显示自动补全下拉菜单。Hermes 支持大量 CLI 斜杠命令、动态技能命令和用户自定义快捷命令。

常用示例：

| 命令 | 说明 |
|------|------|
| `/help` | 显示命令帮助 |
| `/model` | 查看或更改当前模型 |
| `/tools` | 列出当前可用工具 |
| `/skills browse` | 浏览技能中心和官方可选技能 |
| `/background <prompt>` | 在独立后台会话中运行提示词 |
| `/skin` | 查看或切换当前 CLI 皮肤 |
| `/voice on` | 启用 CLI 语音模式（按 `Ctrl+B` 录音） |
| `/voice tts` | 切换 Hermes 回复的语音朗读功能 |
| `/reasoning high` | 提高推理强度 |
| `/title My Session` | 为当前会话命名 |

完整内置 CLI 及消息命令列表，请参阅[斜杠命令参考](/reference/slash-commands)。

语音模式的设置、提供商配置、静音调节及消息/Discord 语音使用说明，请参阅[语音模式](/user-guide/features/voice-mode)。

:::tip
命令不区分大小写——`/HELP` 与 `/help` 效果相同。已安装的技能也会自动注册为斜杠命令。
:::

## 快捷命令

你可以定义自定义命令，无需调用大语言模型即可即时执行 shell 命令。这些命令在 CLI 和消息平台（Telegram、Discord 等）中均可使用。

```yaml
# ~/.hermes/config.yaml
quick_commands:
  status:
    type: exec
    command: systemctl status hermes-agent
  gpu:
    type: exec
    command: nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader
```

之后在任意聊天界面输入 `/status` 或 `/gpu` 即可直接调用。更多示例请参阅[配置指南](/user-guide/configuration#quick-commands)。

## 启动时预加载技能

如果你已知道本次会话需要哪些技能，可以在启动时直接传入：

```bash
hermes -s hermes-agent-dev,github-auth
hermes chat -s github-pr-workflow -s github-auth
```

Hermes 会在首轮对话开始前，将每个指定技能加载到会话提示词中。无论交互模式还是单次查询模式，都可以使用此参数。

## 技能斜杠命令

`~/.hermes/skills/` 目录下所有已安装的技能都会自动注册为斜杠命令，技能名即命令名：

```
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor

# 只输入技能名可加载技能，由智能体询问你的需求：
/excalidraw
```

## 人格风格

设置预定义人格以改变智能体的语气风格：

```
/personality pirate
/personality kawaii
/personality concise
```

内置人格包括：`helpful`、`concise`、`technical`、`creative`、`teacher`、`kawaii`、`catgirl`、`pirate`、`shakespeare`、`surfer`、`noir`、`uwu`、`philosopher`、`hype`。

你也可以在 `~/.hermes/config.yaml` 中自定义人格：

```yaml
personalities:
  helpful: "You are a helpful, friendly AI assistant."
  kawaii: "You are a kawaii assistant! Use cute expressions..."
  pirate: "Arrr! Ye be talkin' to Captain Hermes..."
  # 添加你自己的！
```

## 多行输入

有两种方式输入多行消息：

1. **`Alt+Enter` 或 `Ctrl+J`** — 插入换行符
2. **反斜杠续行** — 在行末输入 `\` 继续下一行：

```
❯ Write a function that:\
  1. Takes a list of numbers\
  2. Returns the sum
```

:::info
支持粘贴多行文本——使用 `Alt+Enter` 或 `Ctrl+J` 插入换行，或直接粘贴内容。
:::

## 中断智能体

你可以在任意时刻中断智能体：

- **在智能体工作时输入新消息并按 Enter** — 立即中断并处理你的新指令
- **`Ctrl+C`** — 中断当前操作（2 秒内双击强制退出）
- 正在执行的终端命令会立即终止（先发送 SIGTERM，1 秒后发送 SIGKILL）
- 中断期间输入的多条消息会合并为一个提示词

### 忙碌输入模式

`display.busy_input_mode` 配置项控制在智能体工作时按下 Enter 的行为：

| 模式 | 行为 |
|------|------|
| `"interrupt"`（默认） | 你的消息立即中断当前操作并进行处理 |
| `"queue"` | 你的消息静默入队，等智能体完成当前任务后作为下一轮发送 |

```yaml
# ~/.hermes/config.yaml
display:
  busy_input_mode: "queue"   # 或 "interrupt"（默认）
```

队列模式适合在不想意外取消正在进行的任务时提前准备后续消息。未知值会回退到 `"interrupt"`。

### 挂起到后台

在 Unix 系统上，按 **`Ctrl+Z`** 可将 Hermes 挂起到后台——与普通终端进程一样。shell 会打印确认信息：

```
Hermes Agent has been suspended. Run `fg` to bring Hermes Agent back.
```

在 shell 中输入 `fg` 即可从中断处继续会话。Windows 不支持此功能。

## 工具执行进度

CLI 在智能体工作时会显示动态反馈：

**思考动画**（API 调用期间）：

```
  ◜ (｡•́︿•̀｡) pondering... (1.2s)
  ◠ (⊙_⊙) contemplating... (2.4s)
  ✧٩(ˊᗜˋ*)و✧ got it! (3.1s)
```

**工具执行流**：

```
  ┊ 💻 terminal `ls -la` (0.3s)
  ┊ 🔍 web_search (1.2s)
  ┊ 📄 web_extract (2.1s)
```

使用 `/verbose` 可循环切换显示模式：`off → new → all → verbose`。此命令同样适用于消息平台——详见[配置说明](/user-guide/configuration#display-settings)。

### 工具预览长度

`display.tool_preview_length` 配置项控制工具调用预览行（如文件路径、终端命令）显示的最大字符数。默认值为 `0`，表示不限制——完整路径和命令全部显示。

```yaml
# ~/.hermes/config.yaml
display:
  tool_preview_length: 80   # 将工具预览截断为 80 个字符（0 表示不限制）
```

当终端较窄或工具参数包含很长的文件路径时，此配置非常实用。

## 会话管理

### 恢复会话

退出 CLI 会话时，会打印恢复命令：

```
Resume this session with:
  hermes --resume 20260225_143052_a1b2c3

Session:        20260225_143052_a1b2c3
Duration:       12m 34s
Messages:       28 (5 user, 18 tool calls)
```

恢复选项：

```bash
hermes --continue                          # 恢复最近一次 CLI 会话
hermes -c                                  # 简写形式
hermes -c "my project"                     # 恢复指定名称的会话（同一脉络中最新的）
hermes --resume 20260225_143052_a1b2c3     # 按 ID 恢复指定会话
hermes --resume "refactoring auth"         # 按标题恢复
hermes -r 20260225_143052_a1b2c3           # 简写形式
```

恢复时会从 SQLite 数据库完整还原对话历史。智能体可以看到之前所有的消息、工具调用和响应——就像你从未离开一样。

在聊天中使用 `/title 会话名称` 为当前会话命名，或在命令行执行 `hermes sessions rename <id> <title>`。使用 `hermes sessions list` 可浏览历史会话。

### 会话存储

CLI 会话存储在 Hermes 的 SQLite 状态数据库 `~/.hermes/state.db` 中，数据库保存：

- 会话元数据（ID、标题、时间戳、token 计数器）
- 消息历史
- 跨压缩/恢复会话的脉络关系
- `session_search` 使用的全文搜索索引

部分消息适配器还会在数据库旁保存各平台的对话记录文件，但 CLI 本身通过 SQLite 会话存储来恢复会话。

### 上下文压缩

长对话在接近上下文限制时会自动进行摘要压缩：

```yaml
# 在 ~/.hermes/config.yaml 中
compression:
  enabled: true
  threshold: 0.50    # 默认在达到上下文限制的 50% 时触发压缩
  summary_model: "google/gemini-3-flash-preview"  # 用于摘要的模型
```

压缩触发时，中间轮次会被摘要，前 3 轮和后 4 轮始终保留。

## 后台会话

在独立的后台会话中运行提示词，同时继续在 CLI 中处理其他工作：

```
/background Analyze the logs in /var/log and summarize any errors from today
```

Hermes 立即确认任务并返回输入提示：

```
🔄 Background task #1 started: "Analyze the logs in /var/log and summarize..."
   Task ID: bg_143022_a1b2c3
```

### 工作原理

每个 `/background` 提示词会在一个守护线程（daemon thread）中生成一个**完全独立的智能体会话**：

- **独立对话** — 后台智能体对当前会话历史一无所知，仅接收你提供的提示词。
- **相同配置** — 后台智能体继承当前会话的模型、提供商、工具集、推理设置和备用模型。
- **非阻塞** — 前台会话保持完全交互状态。你可以继续聊天、执行命令，甚至启动更多后台任务。
- **多任务并行** — 可同时运行多个后台任务，每个任务都有编号 ID。

### 结果

后台任务完成时，结果会以面板形式出现在终端中：

```
╭─ ⚕ Hermes (background #1) ──────────────────────────────────╮
│ Found 3 errors in syslog from today:                         │
│ 1. OOM killer invoked at 03:22 — killed process nginx        │
│ 2. Disk I/O error on /dev/sda1 at 07:15                      │
│ 3. Failed SSH login attempts from 192.168.1.50 at 14:30      │
╰──────────────────────────────────────────────────────────────╯
```

任务失败时会显示错误通知。若配置中启用了 `display.bell_on_complete`，终端会在任务完成时发出提示音。

### 使用场景

- **长时间研究** — 在编写代码的同时执行"/background 研究量子纠错的最新进展"
- **文件处理** — 在继续对话的同时执行"/background 分析此仓库中所有 Python 文件并列出安全问题"
- **并行探索** — 同时启动多个后台任务，从不同角度同步调研

:::info
后台会话不会出现在你的主对话历史中，它们是拥有独立任务 ID（如 `bg_143022_a1b2c3`）的独立会话。
:::

## 安静模式

默认情况下，CLI 以安静模式运行，该模式会：

- 抑制工具产生的冗余日志
- 启用 kawaii 风格的动态反馈
- 保持输出整洁、用户友好

如需调试输出：

```bash
hermes chat --verbose
```
