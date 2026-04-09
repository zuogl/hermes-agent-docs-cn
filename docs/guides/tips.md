---
title: "技巧与最佳实践"
---
# 技巧与最佳实践

实用技巧精选，帮助你立即更高效地使用 Hermes Agent。每个章节针对不同方面 — 浏览各节标题，跳转到相关内容。

---

## 获取最佳结果

### 明确说明你的需求

模糊的提示词只能产生模糊的结果。与其说"修复代码"，不如说"修复 `api/handlers.py` 第 47 行的 TypeError — `process_request()` 函数从 `parse_body()` 收到了 `None`。"提供的上下文越充分，需要的迭代次数就越少。

### 预先提供上下文

在请求开头就提供相关细节：文件路径、错误信息、预期行为。一条精心撰写的消息胜过三轮反复确认。直接粘贴错误堆栈跟踪 — 智能体能够解析它们。

### 使用上下文文件存放重复指令

如果你发现自己不断重复相同的指令（"使用制表符而非空格"、"我们使用 pytest"、"API 地址是 `/api/v2`"），将它们写入 `AGENTS.md` 文件。智能体在每次会话时都会自动读取它 — 设置一次，从此无需额外操作。

### 让智能体使用它的工具

不要试图手把手指导每一步。说"找出并修复失败的测试"，而不是"打开 `tests/test_foo.py`，看第 42 行，然后……"智能体拥有文件搜索、终端访问和代码执行能力 — 让它自行探索和迭代。

### 使用技能处理复杂工作流

在撰写长篇提示词解释某件事怎么做之前，先看看有没有现成的技能。输入 `/skills` 浏览可用技能，或直接调用某个技能，例如 `/axolotl` 或 `/github-pr-workflow`。

## CLI 高级用户技巧

### 多行输入

按 **Alt+Enter**（或 **Ctrl+J**）插入换行而不发送。这让你可以撰写多行提示词、粘贴代码块，或在按回车键发送之前将复杂请求整理完整。

### 粘贴检测

CLI 会自动检测多行粘贴。直接粘贴代码块或错误堆栈跟踪 — 它不会把每行作为单独消息发送。粘贴的内容会被缓冲后作为一条消息统一发送。

### 中断与重定向

按 **Ctrl+C** 一次可中断智能体当前的响应。然后输入新消息进行重定向。在 2 秒内再次按 Ctrl+C 可强制退出。当智能体开始走偏时，这个功能非常有用。

### 使用 `-c` 恢复会话

忘记了上次会话中的某些内容？运行 `hermes -c` 可从上次中断处精确恢复，完整的对话历史会被还原。也可以按标题恢复：`hermes -r "my research project"`。

### 剪贴板图片粘贴

按 **Ctrl+V** 可将剪贴板中的图片直接粘贴到对话中。智能体利用视觉功能分析截图、图表、错误弹窗或 UI 原型 — 无需先保存为文件。

### 斜杠命令自动补全

输入 `/` 然后按 **Tab** 可查看所有可用命令，包括内置命令（`/compress`、`/model`、`/title`）和所有已安装技能。不需要记住任何内容 — Tab 补全帮你搞定一切。

:::tip
使用 `/verbose` 循环切换工具输出显示模式：**off（关闭）→ new（新增）→ all（全部）→ verbose（详细）**。"all"模式非常适合观察智能体的操作；"off"模式在简单问答时界面最为整洁。
:::

## 上下文文件

### AGENTS.md：你的项目大脑

在项目根目录创建 `AGENTS.md`，写入架构决策、编码规范和项目特定指令。它会在每次会话时自动注入，让智能体始终了解你的项目规则。

```markdown
# Project Context
- This is a FastAPI backend with SQLAlchemy ORM
- Always use async/await for database operations
- Tests go in tests/ and use pytest-asyncio
- Never commit .env files
```

### SOUL.md：自定义个性

希望 Hermes 拥有稳定的默认风格？编辑 `~/.hermes/SOUL.md`（若使用自定义 Hermes 主目录，则编辑 `$HERMES_HOME/SOUL.md`）。Hermes 现在会自动预置一个初始 SOUL 文件，并将该全局文件作为实例级别的个性来源。

完整使用指南，请参阅[在 Hermes 中使用 SOUL.md](https://hermes-agent.nousresearch.com/docs/guides/use-soul-with-hermes)。

```markdown
# Soul
You are a senior backend engineer. Be terse and direct.
Skip explanations unless asked. Prefer one-liners over verbose solutions.
Always consider error handling and edge cases.
```

使用 `SOUL.md` 设定持久个性，使用 `AGENTS.md` 存放项目特定指令。

### .cursorrules 兼容性

已有 `.cursorrules` 或 `.cursor/rules/*.mdc` 文件？Hermes 也会读取这些文件。无需复制你的编码规范 — 它们会从工作目录自动加载。

### 发现机制

Hermes 在会话开始时从当前工作目录加载顶层 `AGENTS.md`。子目录中的 `AGENTS.md` 文件会在工具调用期间（通过 `subdirectory_hints.py`）延迟发现并注入工具结果 — 它们不会在启动时预先加载到系统提示词中。

:::tip
保持上下文文件简洁专注。每个字符都会消耗你的 token 预算，因为它们会被注入到每条消息中。
:::

## 记忆与技能

### 记忆与技能：各司其职

**记忆**用于存放事实：你的环境、偏好、项目位置，以及智能体已了解的关于你的信息。**技能**用于存放流程：多步骤工作流、特定工具的指令和可复用的方案。用记忆存"是什么"，用技能存"怎么做"。

### 何时创建技能

如果某项任务需要 5 步以上且你会反复执行，让智能体为它创建一个技能。说"把你刚才做的保存为名为 `deploy-staging` 的技能。"下次只需输入 `/deploy-staging`，智能体便会自动加载完整流程。

### 管理记忆容量

记忆大小有意设限（`MEMORY.md` 约 2,200 个字符，`USER.md` 约 1,375 个字符）。容量接近上限时，智能体会自动整合条目。你可以主动协助：说"清理你的记忆"或"把旧的 Python 3.9 说明替换掉 — 我们现在用 3.12 了。"

### 让智能体记住信息

在一次富有成效的会话结束后，说"记住这些，下次用"，智能体就会保存关键要点。也可以更具体：说"保存到记忆：我们的 CI 使用 GitHub Actions 的 `deploy.yml` 工作流。"

:::caution
记忆是冻结的快照 — 会话期间所做的更改在下次会话开始前不会出现在系统提示词中。智能体会立即写入磁盘，但提示词缓存不会在会话中途失效。
:::

## 性能与成本

### 不要破坏提示词缓存

大多数 LLM 服务商会缓存系统提示词前缀。保持系统提示词稳定（相同的上下文文件、相同的记忆），会话中后续消息就能获得**缓存命中**，成本显著降低。避免在会话中途更换模型或系统提示词。

### 在触达限制前使用 /compress

长时间会话会积累大量 token。当响应变慢或被截断时，运行 `/compress`。它会对对话历史进行摘要，在大幅减少 token 数量的同时保留关键上下文。使用 `/usage` 查看当前使用情况。

### 使用委托实现并行工作

需要同时研究三个主题？让智能体使用 `delegate_task` 并行执行子任务。每个子智能体独立运行，拥有自己的上下文，最终只有摘要结果返回 — 大幅减少主对话的 token 消耗。

### 使用 execute_code 执行批量操作

与其逐个运行终端命令，不如让智能体编写一个脚本，一次性完成所有操作。"编写一个 Python 脚本将所有 `.jpeg` 文件重命名为 `.jpg` 并运行"比逐个重命名文件既便宜又快捷。

### 选择合适的模型

使用 `/model` 在会话中途切换模型。对复杂推理和架构决策使用前沿模型（Claude Sonnet/Opus、GPT-4o）；对格式化、重命名或样板代码生成等简单任务切换到更快的模型。

:::tip
定期运行 `/usage` 查看 token 消耗情况。运行 `/insights` 可查看过去 30 天的用量模式概览。
:::

## 消息传递技巧

### 设置主频道

在你偏好的 Telegram 或 Discord 聊天中使用 `/sethome` 将其指定为主频道。定时任务结果和计划任务输出将发送至此。没有主频道，智能体将无处发送主动消息。

### 使用 /title 整理会话

用 `/title auth-refactor` 或 `/title research-llm-quantization` 为会话命名。已命名的会话通过 `hermes sessions list` 很容易找到，用 `hermes -r "auth-refactor"` 也可以快速恢复。未命名的会话会不断堆积，最终无法区分。

### DM 配对用于团队访问

与其手动收集用户 ID 来维护白名单，不如启用 DM 配对。当团队成员私信机器人时，他们会获得一个一次性配对码。你通过 `hermes pairing approve telegram XKGH5N7P` 审批 — 简单又安全。

### 工具进度显示模式

使用 `/verbose` 控制你看到的工具活动量。在消息平台上，少即是多 — 保持"new"模式只查看新工具调用。在 CLI 中，"all"模式可以实时查看智能体的所有操作。

:::tip
在消息平台上，会话在空闲一段时间后会自动重置（默认：24 小时），或在每天凌晨 4 点重置。如需更长的会话时间，可在 `~/.hermes/config.yaml` 中按平台调整。
:::

## 安全性

### 使用 Docker 处理不可信代码

当处理不可信的代码仓库或运行陌生代码时，使用 Docker 或 Daytona 作为终端后端。在 `.env` 中设置 `TERMINAL_BACKEND=docker`。容器内的破坏性命令无法伤害宿主系统。

```bash
# 在 .env 中：
TERMINAL_BACKEND=docker
TERMINAL_DOCKER_IMAGE=hermes-sandbox:latest
```

### 避免 Windows 编码陷阱

在 Windows 上，某些默认编码（如 `cp125x`）无法表示所有 Unicode 字符，这可能在测试或脚本中写入文件时导致 `UnicodeEncodeError`。

- 建议使用显式 UTF-8 编码打开文件：

```python
with open("results.txt", "w", encoding="utf-8") as f:
    f.write("✓ All good\n")
```

- 在 PowerShell 中，也可将当前会话切换到 UTF-8 以用于控制台和原生命令输出：

```powershell
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
```

这可以让 PowerShell 和子进程保持 UTF-8，有助于避免仅在 Windows 上出现的失败。

### 选择"始终"前先审慎确认

当智能体触发危险命令审批（`rm -rf`、`DROP TABLE` 等）时，你会看到四个选项：**单次**、**会话**、**始终**、**拒绝**。在选择"始终"之前要仔细考虑 — 它会永久将该模式加入白名单。在熟悉之前，先选择"会话"。

### 命令审批是你的安全网

Hermes 在执行前会对照一份精心整理的危险模式列表检查每条命令。这包括递归删除、SQL 删除、将 curl 管道到 shell 等。在生产环境中不要禁用它 — 它的存在有充分理由。

:::caution
在容器后端（Docker、Singularity、Modal、Daytona）中运行时，危险命令检查会被**跳过**，因为容器本身就是安全边界。请确保你的容器镜像已妥善锁定。
:::

### 对消息机器人使用白名单

永远不要在拥有终端访问权限的机器人上设置 `GATEWAY_ALLOW_ALL_USERS=true`。始终使用平台特定的白名单（`TELEGRAM_ALLOWED_USERS`、`DISCORD_ALLOWED_USERS`）或 DM 配对来控制谁可以与你的智能体交互。

```bash
# 推荐：为每个平台设置明确的白名单
TELEGRAM_ALLOWED_USERS=123456789,987654321
DISCORD_ALLOWED_USERS=123456789012345678

# 或使用跨平台白名单
GATEWAY_ALLOWED_USERS=123456789,987654321
```

---

*有好的技巧想补充进来？欢迎提交 issue 或 PR — 我们欢迎社区贡献。*
