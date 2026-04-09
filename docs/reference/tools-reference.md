---
title: "内置工具参考"
---
# 内置工具参考

本页记录了 Hermes 工具注册表中全部 47 个内置工具，按 toolset 分组。可用性因平台、凭证及已启用的 toolset 而异。

**工具数量概览：** 10 个 browser 工具、4 个 file 工具、10 个 RL 工具、4 个 Home Assistant 工具、2 个 terminal 工具、2 个 web 工具，以及其他 toolset 中的 15 个独立工具。

:::tip
MCP 工具
除内置工具外，Hermes 还可以从 MCP server 动态加载工具。MCP 工具以 server 名称为前缀（例如，`github` MCP server 对应 `github_create_issue`）。配置方式请参阅 [MCP 集成](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)。
:::

## `browser` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `browser_back` | 在浏览器历史记录中导航到上一页。需要先调用 browser_navigate。 | — |
| `browser_click` | 点击快照中通过 ref ID（如 '@e5'）识别的元素。ref ID 显示在快照输出的方括号内。需要先调用 browser_navigate 和 browser_snapshot。 | — |
| `browser_console` | 获取当前页面的浏览器控制台输出和 JavaScript 错误。返回 console.log/warn/error/info 消息及未捕获的 JS 异常。可用于检测静默 JavaScript 错误、失败的 API 调用和应用警告。需要先调用… | — |
| `browser_get_images` | 获取当前页面所有图片的列表，包含 URL 和 alt 文本。适合查找用视觉工具分析的图片。需要先调用 browser_navigate。 | — |
| `browser_navigate` | 在浏览器中导航到某个 URL。初始化 session 并加载页面。必须在其他 browser 工具之前调用。对于简单的信息检索，优先使用 web_search 或 web_extract（更快、成本更低）。当需要交互式操作时再使用 browser 工具。 | — |
| `browser_press` | 按下键盘按键。适用于提交表单（Enter）、导航（Tab）或触发键盘快捷键。需要先调用 browser_navigate。 | — |
| `browser_scroll` | 在页面上滚动。用于显示当前视口上方或下方的更多内容。需要先调用 browser_navigate。 | — |
| `browser_snapshot` | 获取当前页面无障碍树的文本快照。返回带有 ref ID（如 @e1、@e2）的交互元素，供 browser_click 和 browser_type 使用。full=false（默认）：仅含交互元素的紧凑视图。full=true：完整… | — |
| `browser_type` | 向通过 ref ID 识别的输入框输入文本。先清空字段，再输入新文本。需要先调用 browser_navigate 和 browser_snapshot。 | — |
| `browser_vision` | 对当前页面截图并使用视觉 AI 进行分析。当需要直观理解页面内容时使用——尤其适用于 CAPTCHA、视觉验证挑战、复杂布局，或文本快照不足以呈现信息时。 | — |

## `clarify` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `clarify` | 当需要澄清、反馈或在继续前需要用户做出决策时，向用户提问。支持两种模式：1. **多选** — 提供最多 4 个选项，用户可选择其中一项或通过第 5 个"其他"选项输入自定义答案。2.… | — |

## `code_execution` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `execute_code` | 运行可编程方式调用 Hermes 工具的 Python 脚本。当需要 3 次以上工具调用且调用之间有处理逻辑、需要在大量工具输出进入上下文前进行过滤/压缩、需要条件分支…时使用。 | — |

## `cronjob` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `cronjob` | 统一的定时任务管理器。使用 `action="create"`、`"list"`、`"update"`、`"pause"`、`"resume"`、`"run"` 或 `"remove"` 来管理任务。支持绑定一个或多个 skill 的 skill-backed 任务，在 update 时设置 `skills=[]` 可清除已绑定的 skill。Cron 任务在全新 session 中运行，不含当前聊天上下文。 | — |

## `delegation` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `delegate_task` | 生成一个或多个子 agent，在隔离上下文中处理任务。每个子 agent 拥有独立的对话、终端 session 和 toolset。仅返回最终摘要——中间工具结果不会进入你的上下文窗口。两种…… | — |

## `file` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `patch` | 对文件进行精准的查找替换编辑。在终端中用此替代 sed/awk。使用模糊匹配（9 种策略），因此细微的空白/缩进差异不会导致失败。返回统一 diff 格式。编辑后自动运行语法检查… | — |
| `read_file` | 以行号和分页方式读取文本文件。在终端中用此替代 cat/head/tail。输出格式：'行号\|内容'。若未找到文件，会提示相似文件名。使用 offset 和 limit 处理大文件。注意：无法读取图片或… | — |
| `search_files` | 搜索文件内容或按名称查找文件。在终端中用此替代 grep/rg/find/ls。基于 Ripgrep，比 shell 等效命令更快。内容搜索（target='content'）：对文件内部进行正则搜索。输出模式：带行号的完整匹配… | — |
| `write_file` | 将内容写入文件，完全替换现有内容。在终端中用此替代 echo/cat heredoc。自动创建父目录。会覆盖整个文件——如需精准编辑请使用 'patch'。 | — |

## `homeassistant` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `ha_call_service` | 调用 Home Assistant 服务以控制设备。使用 ha_list_services 发现每个域可用的服务及其参数。 | — |
| `ha_get_state` | 获取单个 Home Assistant 实体的详细状态，包括所有属性（亮度、颜色、温度设定值、传感器读数等）。 | — |
| `ha_list_entities` | 列出 Home Assistant 实体。可选按域（light、switch、climate、sensor、binary_sensor、cover、fan 等）或区域名称（客厅、厨房、卧室等）过滤。 | — |
| `ha_list_services` | 列出用于设备控制的可用 Home Assistant 服务（动作）。显示每种设备类型可执行的操作及其参数。配合 ha_list_entities 发现的设备使用，以了解具体控制方式。 | — |

:::note
**Honcho 工具**（`honcho_conclude`、`honcho_context`、`honcho_profile`、`honcho_search`）不再作为内置工具提供。它们可通过 `plugins/memory/honcho/` 的 Honcho memory provider 插件获取。安装和使用方式请参阅 [插件文档](/user-guide/features/plugins)。
:::

## `image_gen` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `image_generate` | 使用 FLUX 2 Pro 模型从文本提示生成高质量图片，并自动进行 2 倍超分辨率放大。创建精细的艺术图片并自动放大以获得高清结果。返回单张放大后的图片 URL。使用…显示。 | FAL_KEY |

## `memory` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `memory` | 将重要信息保存到跨 session 持久存在的 memory 中。你的 memory 在 session 开始时出现在系统提示中——这是你在对话之间记住用户和环境信息的方式。何时保存… | — |

## `messaging` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `send_message` | 向已连接的消息平台发送消息，或列出可用目标。重要提示：当用户要求发送到特定频道或人员（而非仅指定平台名称）时，请先调用 send_message(action='list') 查看可用目标… | — |

## `moa` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `mixture_of_agents` | 将难题通过多个前沿 LLM 协作处理。调用 5 次 API（4 个参考模型 + 1 个聚合器），以最大推理能力运行——请谨慎用于真正困难的问题。最适合：复杂数学、高级算法… | OPENROUTER_API_KEY |

## `rl` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `rl_check_status` | 获取训练运行的状态和指标。有频率限制：同一运行每次检查间隔至少 30 分钟。返回 WandB 指标：step、state、reward_mean、loss、percent_correct。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_edit_config` | 更新配置字段。先使用 rl_get_current_config() 查看所选环境的所有可用字段。每个环境有不同的可配置选项。基础设施设置（tokenizer、URLs、lora_rank、learning_ra…）已固定。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_get_current_config` | 获取当前环境配置。仅返回可修改的字段：group_size、max_token_length、total_steps、steps_per_eval、use_wandb、wandb_name、max_num_workers。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_get_results` | 获取已完成训练运行的最终结果和指标。返回最终指标及训练权重路径。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_list_environments` | 列出所有可用的 RL 环境。返回环境名称、路径和描述。提示：使用文件工具读取 file_path，以了解每个环境的工作原理（验证器、数据加载、奖励）。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_list_runs` | 列出所有训练运行（活跃和已完成）及其状态。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_select_environment` | 选择用于训练的 RL 环境。加载环境的默认配置。选择后，使用 rl_get_current_config() 查看设置，使用 rl_edit_config() 修改。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_start_training` | 使用当前环境和配置启动新的 RL 训练运行。大多数训练参数（lora_rank、learning_rate 等）已固定。在启动前使用 rl_edit_config() 设置 group_size、batch_size、wandb_project。警告：训练… | TINKER_API_KEY, WANDB_API_KEY |
| `rl_stop_training` | 停止正在运行的训练任务。当指标异常、训练停滞或希望尝试不同设置时使用。 | TINKER_API_KEY, WANDB_API_KEY |
| `rl_test_inference` | 对任意环境进行快速推理测试。使用 OpenRouter 运行若干步推理 + 评分。默认：3 步 × 16 次补全 = 每个模型 48 次 rollout，测试 3 个模型共 144 次。测试环境加载、提示构建、推理… | TINKER_API_KEY, WANDB_API_KEY |

## `session_search` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `session_search` | 搜索过去对话的长期 memory。这是你的回忆能力——每次过去的 session 都可被搜索，此工具会汇总发生的内容。在以下情况请主动使用：- 用户说"我们以前做过这个"、"还记得吗"、"上次…" | — |

## `skills` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `skill_manage` | 管理 skill（创建、更新、删除）。Skill 是你的程序性 memory——用于处理重复任务类型的可复用方案。新 skill 保存到 ~/.hermes/skills/；现有 skill 可在任意位置修改。操作：create（完整 SKILL.m…） | — |
| `skill_view` | Skill 支持加载特定任务和工作流的相关信息，以及脚本和模板。加载 skill 的完整内容或访问其关联文件（参考资料、模板、脚本）。第一次调用返回 SKILL.md 内容及… | — |
| `skills_list` | 列出可用 skill（名称 + 描述）。使用 skill_view(name) 加载完整内容。 | — |

## `terminal` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `process` | 管理通过 terminal(background=true) 启动的后台进程。操作：'list'（显示全部）、'poll'（检查状态 + 新输出）、'log'（带分页的完整输出）、'wait'（阻塞直到完成或超时）、'kill'（终止）、'write'（发送… | — |
| `terminal` | 在 Linux 环境中执行 shell 命令。文件系统在调用之间保持持久。长时间运行的服务器请设置 `background=true`。设置 `notify_on_complete=true`（配合 `background=true`）可在进程完成时自动收到通知——无需轮询。请勿使用 cat/head/tail——请使用 read_file。请勿使用 grep/rg/find——请使用 search_files。 | — |

## `todo` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `todo` | 管理当前 session 的任务列表。适用于有 3 步以上的复杂任务，或用户提供多项任务时。无参数调用即可读取当前列表。写入方式：- 提供 'todos' 数组以创建/更新项目 - merge=… | — |

## `vision` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `vision_analyze` | 使用 AI 视觉分析图片。提供全面描述并回答关于图片内容的特定问题。 | — |

## `web` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `web_search` | 搜索网络上任何主题的信息。最多返回 5 条相关结果，包含标题、URL 和描述。 | EXA_API_KEY 或 PARALLEL_API_KEY 或 FIRECRAWL_API_KEY 或 TAVILY_API_KEY |
| `web_extract` | 从网页 URL 中提取内容。以 Markdown 格式返回页面内容。也支持 PDF URL——直接传入 PDF 链接并将其转换为 Markdown 文本。5000 字符以下的页面返回完整 Markdown；较大的页面由 LLM 汇总。 | EXA_API_KEY 或 PARALLEL_API_KEY 或 FIRECRAWL_API_KEY 或 TAVILY_API_KEY |

## `tts` toolset

| 工具 | 描述 | 所需环境 |
|------|------|----------|
| `text_to_speech` | 将文本转换为语音音频。返回平台以语音消息形式传递的 MEDIA: 路径。在 Telegram 上以语音气泡播放，在 Discord/WhatsApp 上作为音频附件。在 CLI 模式下保存到 ~/voice-memos/。语音和 provider… | — |
