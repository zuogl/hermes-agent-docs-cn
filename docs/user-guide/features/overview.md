---
title: "功能概览"
---
# 功能概览

Hermes Agent 拥有一套远超基础对话的丰富功能体系。从持久记忆、上下文感知，到浏览器自动化和语音对话，这些功能协同配合，使 Hermes 成为强大的自主智能体（agent）。

## 核心功能

- **[工具与工具集](/user-guide/features/tools)** — 工具（tool）是扩展智能体能力的函数，按逻辑分组为工具集（toolset），可按平台启用或禁用，涵盖网页搜索、终端执行、文件编辑、记忆、委派等功能。
- **[技能系统](/user-guide/features/skills)** — 智能体按需加载的知识文档。技能（skill）采用渐进式披露模式以减少 token 消耗，并兼容 [agentskills.io](https://agentskills.io/specification) 开放标准。
- **[持久记忆](/user-guide/features/memory)** — 有限且经过精选的跨会话持久记忆。Hermes 通过 `MEMORY.md` 和 `USER.md` 记住你的偏好、项目、环境及已学内容。
- **[上下文文件](/user-guide/features/context-files)** — Hermes 自动发现并加载项目上下文文件（`.hermes.md`、`AGENTS.md`、`CLAUDE.md`、`SOUL.md`、`.cursorrules`），这些文件塑造了它在项目中的行为方式。
- **[上下文引用](/user-guide/features/context-references)** — 输入 `@` 后跟引用内容，可将文件、文件夹、git diff 和 URL 直接注入消息。Hermes 会内联展开引用并自动追加内容。
- **[检查点](/user-guide/checkpoints-and-rollback)** — Hermes 在修改文件前自动为工作目录创建快照，作为安全网——出现问题时可通过 `/rollback` 命令回滚。

## 自动化

- **[定时任务（Cron）](/user-guide/features/cron)** — 使用自然语言或 cron 表达式调度自动执行的任务。任务可附加技能、将结果推送至任意平台，并支持暂停/恢复/编辑操作。
- **[子智能体委派](/user-guide/features/delegation)** — `delegate_task` 工具可创建拥有独立上下文、受限工具集和独立终端会话的子智能体实例，最多支持 3 个并发子智能体，实现并行工作流。
- **[代码执行](/user-guide/features/code-execution)** — `execute_code` 工具让智能体编写可调用 Hermes 工具的 Python 脚本，通过沙盒（sandbox）RPC 执行，将多步骤工作流压缩为单次 LLM 调用。
- **[事件钩子](/user-guide/features/hooks)** — 在关键生命周期节点运行自定义代码。网关钩子处理日志、告警和 webhook；插件钩子处理工具拦截、指标采集和安全护栏。
- **[批处理](/user-guide/features/batch-processing)** — 跨数百乃至数千个提示词并行运行 Hermes 智能体，生成结构化 ShareGPT 格式的轨迹数据，用于训练数据生成或模型评估。

## 媒体与网页

- **[语音模式](/user-guide/features/voice-mode)** — 在 CLI 和消息平台上的完整语音交互。通过麦克风与智能体对话、听取语音回复，并在 Discord 语音频道中进行实时语音对话。
- **[浏览器自动化](/user-guide/features/browser)** — 支持多种后端的完整浏览器自动化：Browserbase 云服务、Browser Use 云服务、通过 CDP（Chrome DevTools Protocol）控制本地 Chrome，或使用本地 Chromium。可导航网站、填写表单、提取信息。
- **[视觉与图片粘贴](/user-guide/features/vision)** — 多模态视觉支持。将图片从剪贴板粘贴到 CLI，让智能体使用任意支持视觉的模型对其进行分析、描述或处理。
- **[图片生成](/user-guide/features/image-generation)** — 使用 FAL.ai 的 FLUX 2 Pro 模型根据文本提示词生成图片，并通过 Clarity Upscaler 自动进行 2 倍超分辨率放大。
- **[语音与 TTS](/user-guide/features/tts)** — 在所有消息平台上提供文本转语音（TTS）输出和语音消息转录，支持五种提供商：Edge TTS（免费）、ElevenLabs、OpenAI TTS、MiniMax 和 NeuTTS。

## 集成

- **[MCP 集成](/user-guide/features/mcp)** — 连接任意 MCP（模型上下文协议，Model Context Protocol）服务器，支持 stdio 或 HTTP 传输。无需编写原生 Hermes 工具，即可访问来自 GitHub、数据库、文件系统和内部 API 的外部工具。支持按服务器过滤工具及采样功能。
- **[提供商路由](/user-guide/features/provider-routing)** — 对 AI 提供商处理请求的方式进行精细控制。通过排序规则、白名单、黑名单和优先级配置，在成本、速度和质量之间自由取舍。
- **[备用提供商](/user-guide/features/fallback-providers)** — 当主模型遇到错误时，自动故障转移至备用 LLM 提供商，视觉和压缩等辅助任务支持独立故障转移。
- **[凭证池](/user-guide/features/credential-pools)** — 将 API 调用分散到同一提供商的多个密钥上，遇到速率限制或故障时自动轮换。
- **[记忆提供商](/user-guide/features/memory-providers)** — 接入外部记忆后端（Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover），实现跨会话用户建模和超越内置记忆系统的个性化能力。
- **[API 服务器](/user-guide/features/api-server)** — 将 Hermes 作为兼容 OpenAI 格式的 HTTP 端点对外暴露，可接入任何支持 OpenAI 格式的前端——Open WebUI、LobeChat、LibreChat 等。
- **[IDE 集成（ACP）](/user-guide/features/acp)** — 在兼容 ACP（智能体控制协议，Agent Control Protocol）的编辑器中使用 Hermes，包括 VS Code、Zed 和 JetBrains。聊天、工具活动、文件 diff 和终端命令均在编辑器内渲染。
- **[RL 训练](/user-guide/features/rl-training)** — 从智能体会话中生成轨迹数据，用于强化学习（RL）和模型微调。

## 自定义

- **[个性与 SOUL.md](/user-guide/features/personality)** — 完全可定制的智能体个性。`SOUL.md` 是主身份文件——系统提示词（system prompt）中的第一项内容——你可以在每次会话中切换内置或自定义的 `/personality` 预设。
- **[外观与主题](/user-guide/features/skins)** — 自定义 CLI 的视觉呈现：横幅颜色、旋转器样式和动词、响应框标签、品牌文字以及工具活动前缀。
- **[插件](/user-guide/features/plugins)** — 无需修改核心代码即可添加自定义工具、钩子和集成。将包含 `plugin.yaml` 和 Python 代码的目录放入 `~/.hermes/plugins/` 即可。
