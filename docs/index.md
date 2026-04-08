---
title: "Hermes Agent 中文文档"
---
# Hermes Agent

由 [Nous Research](https://nousresearch.com) 打造的自我进化 AI 智能体。唯一内置学习闭环的智能体——它能从经验中创建技能、在使用过程中改进技能、主动持久化知识，并在多次会话中建立对你的深入理解。

<div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
  <a href="/getting-started/installation" style={{display: 'inline-block', padding: '0.6rem 1.2rem', backgroundColor: '#FFD700', color: '#07070d', borderRadius: '8px', fontWeight: 600, textDecoration: 'none'}}>开始使用 →</a>
  <a href="https://github.com/NousResearch/hermes-agent" style={{display: 'inline-block', padding: '0.6rem 1.2rem', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '8px', textDecoration: 'none'}}>在 GitHub 上查看</a>
</div>

## 什么是 Hermes Agent？

它不是绑定在 IDE 上的编程助手，也不是单个 API 的聊天包装器。它是一个**自主智能体**，运行时间越长越强大。你可以把它部署在任何地方——一台 $5 的 VPS、GPU 集群，或者在闲置时几乎零成本的无服务器基础设施（Daytona、Modal）。通过 Telegram 与它交流，让它在云端 VM 上工作，而你无需自己 SSH 登录。它不依赖你的笔记本电脑。

## 快速链接

| | |
|---|---|
| 🚀 **[安装指南](/getting-started/installation)** | 在 Linux、macOS 或 WSL2 上 60 秒完成安装 |
| 📖 **[快速入门](/getting-started/quickstart)** | 你的第一次对话和值得尝试的核心功能 |
| 🗺️ **[学习路径](/getting-started/learning-path)** | 根据你的经验水平找到合适的文档 |
| ⚙️ **[配置](/user-guide/configuration)** | 配置文件、提供商、模型和选项 |
| 💬 **[消息网关](/user-guide/messaging/)** | 设置 Telegram、Discord、Slack 或 WhatsApp |
| 🔧 **[工具与工具集](/user-guide/features/tools)** | 47 个内置工具及其配置方式 |
| 🧠 **[记忆系统](/user-guide/features/memory)** | 跨会话持久增长的记忆 |
| 📚 **[技能系统](/user-guide/features/skills)** | 智能体创建和复用的过程性记忆 |
| 🔌 **[MCP 集成](/user-guide/features/mcp)** | 连接 MCP 服务器，过滤工具，安全扩展 Hermes |
| 🧭 **[使用 MCP 与 Hermes](/guides/use-mcp-with-hermes)** | 实用的 MCP 配置模式、示例和教程 |
| 🎙️ **[语音模式](/user-guide/features/voice-mode)** | CLI、Telegram、Discord 和 Discord 语音频道中的实时语音交互 |
| 🗣️ **[使用语音模式](/guides/use-voice-mode-with-hermes)** | 上手操作和 Hermes 语音工作流模式 |
| 🎭 **[个性化与 SOUL.md](/user-guide/features/personality)** | 通过全局 SOUL.md 定义 Hermes 的默认语气 |
| 📄 **[上下文文件](/user-guide/features/context-files)** | 影响每次对话的项目上下文文件 |
| 🔒 **[安全](/user-guide/security)** | 命令审批、授权、容器隔离 |
| 💡 **[技巧与最佳实践](/guides/tips)** | 快速提升 Hermes 使用效率的方法 |
| 🏗️ **[架构](/developer-guide/architecture)** | 底层工作原理 |
| ❓ **[常见问题](/reference/faq)** | 常见问题与解决方案 |

## 核心特性

- **闭环学习系统** — 智能体自主管理记忆和定期回顾、自主创建技能、在使用中自我改进技能、FTS5 跨会话检索与 LLM 摘要、以及 [Honcho](https://github.com/plastic-labs/honcho) 辩证法用户建模
- **随处运行，不限于你的笔记本** — 6 种终端后端：本地、Docker、SSH、Daytona、Singularity、Modal。Daytona 和 Modal 提供无服务器持久化——环境在空闲时休眠，成本接近零
- **你在哪，它就在哪** — CLI、Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost、Email、SMS、钉钉、飞书、企业微信、Home Assistant — 14+ 平台一个网关搞定
- **由模型训练者打造** — 由 [Nous Research](https://nousresearch.com) 创建，Hermes、Nomos、Psyche 模型背后的实验室。支持 [Nous Portal](https://portal.nousresearch.com)、[OpenRouter](https://openrouter.ai)、OpenAI 或任何端点
- **定时自动化** — 内置 cron 调度，可投递到任何平台
- **委派与并行** — 生成隔离的子智能体进行并行工作流。通过 `execute_code` 实现编程式工具调用，将多步骤管道压缩为单次推理调用
- **开放标准技能** — 兼容 [agentskills.io](https://agentskills.io)。技能可移植、可共享，通过 Skills Hub 社区贡献
- **完整的 Web 控制** — 搜索、提取、浏览、视觉、图像生成、TTS
- **MCP 支持** — 连接任何 MCP 服务器以扩展工具能力
- **面向研究** — 批量处理、轨迹导出、使用 Atropos 进行 RL 训练。由 [Nous Research](https://nousresearch.com) 构建——Hermes、Nomos、Psyche 模型背后的实验室
