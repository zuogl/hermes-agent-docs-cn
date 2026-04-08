---
title: "学习路径"
---
# 学习路径

Hermes Agent 能做很多事——CLI 智能体助手、Telegram/Discord 机器人、任务自动化、强化学习（RL）训练，以及更多。本页面帮助你根据自身经验水平和目标，找到起点和阅读路径。

> 💡 **从这里开始**：如果还没安装 Hermes Agent，请先阅读[安装指南](/getting-started/installation)，再完成[快速入门](/getting-started/quickstart)。以下内容均假设你已有可用的安装环境。

## 如何使用本页面

- **已知自己的水平？** 跳转至[按经验水平](#按经验水平)表格，按你所在层级的顺序阅读。
- **有明确目标？** 跳至[按使用场景](#按使用场景)，找到符合你需求的场景。
- **随便逛逛？** 查看[主要功能一览](#主要功能一览)表格，快速了解 Hermes Agent 的全部能力。

## 按经验水平

| 水平 | 目标 | 推荐阅读 | 预计时间 |
|---|---|---|---|
| **初级** | 快速上手，进行基本对话，使用内置工具 | [安装](/getting-started/installation) → [快速入门](/getting-started/quickstart) → [CLI 使用](/user-guide/cli) → [配置](/user-guide/configuration) | 约 1 小时 |
| **中级** | 搭建消息机器人，使用记忆、定时任务、技能等高级功能 | [会话](/user-guide/sessions) → [消息平台](/user-guide/messaging) → [工具](/user-guide/features/tools) → [技能](/user-guide/features/skills) → [记忆](/user-guide/features/memory) → [Cron](/user-guide/features/cron) | 约 2–3 小时 |
| **高级** | 构建自定义工具、创建技能包、用强化学习训练模型、参与项目贡献 | [架构](/developer-guide/architecture) → [添加工具](/developer-guide/adding-tools) → [创建技能](/developer-guide/creating-skills) → [RL 训练](/user-guide/features/rl-training) → [贡献指南](/developer-guide/contributing) | 约 4–6 小时 |

## 按使用场景

选择符合你需求的场景，每个场景都按阅读顺序链接到相关文档。

### "我想要一个 CLI 编程助手"

将 Hermes Agent 用作交互式终端助手，用于编写、审查和运行代码。

1. [安装](/getting-started/installation)
2. [快速入门](/getting-started/quickstart)
3. [CLI 使用](/user-guide/cli)
4. [代码执行](/user-guide/features/code-execution)
5. [上下文文件](/user-guide/features/context-files)
6. [技巧与窍门](/guides/tips)

:::tip
使用上下文文件（context files）可以将文件直接传入对话。Hermes Agent 能够读取、编辑和运行你项目中的代码。
:::

### "我想搭建 Telegram/Discord 机器人"

将 Hermes Agent 部署为你常用消息平台上的机器人。

1. [安装](/getting-started/installation)
2. [配置](/user-guide/configuration)
3. [消息平台概述](/user-guide/messaging)
4. [Telegram 配置](/user-guide/messaging/telegram)
5. [Discord 配置](/user-guide/messaging/discord)
6. [语音模式](/user-guide/features/voice-mode)
7. [配合 Hermes 使用语音模式](/guides/use-voice-mode-with-hermes)
8. [安全](/user-guide/security)

完整项目示例请参考：
- [每日简报机器人](/guides/daily-briefing-bot)
- [团队 Telegram 助手](/guides/team-telegram-assistant)

### "我想自动化任务"

安排定期任务、运行批量作业，或将多步智能体操作串联执行。

1. [快速入门](/getting-started/quickstart)
2. [Cron 调度](/user-guide/features/cron)
3. [批量处理](/user-guide/features/batch-processing)
4. [委派](/user-guide/features/delegation)
5. [钩子](/user-guide/features/hooks)

:::tip
Cron 任务让 Hermes Agent 按计划运行——每日摘要、周期性检查、自动报告——无需你在场。
:::

### "我想构建自定义工具/技能"

用你自己的工具和可复用技能包扩展 Hermes Agent。

1. [工具概述](/user-guide/features/tools)
2. [技能概述](/user-guide/features/skills)
3. [MCP（模型上下文协议）](/user-guide/features/mcp)
4. [架构](/developer-guide/architecture)
5. [添加工具](/developer-guide/adding-tools)
6. [创建技能](/developer-guide/creating-skills)

:::tip
工具（tools）是智能体可以调用的单个函数；技能（skills）是将工具、提示词和配置打包在一起的集合。建议先从工具入手，再进阶到技能。
:::

### "我想训练模型"

利用 Hermes Agent 内置的强化学习训练流水线，对模型行为进行微调。

1. [快速入门](/getting-started/quickstart)
2. [配置](/user-guide/configuration)
3. [RL 训练](/user-guide/features/rl-training)
4. [提供商路由](/user-guide/features/provider-routing)
5. [架构](/developer-guide/architecture)

:::tip
RL 训练在你已熟悉 Hermes Agent 的对话处理和工具调用机制后效果最佳。如果你是新手，建议先完成初级路径。
:::

### "我想将它用作 Python 库"

用代码将 Hermes Agent 集成到你自己的 Python 应用中。

1. [安装](/getting-started/installation)
2. [快速入门](/getting-started/quickstart)
3. [Python 库指南](/guides/python-library)
4. [架构](/developer-guide/architecture)
5. [工具](/user-guide/features/tools)
6. [会话](/user-guide/sessions)

## 主要功能一览

不确定有哪些功能？以下是主要功能的快速目录：

| 功能 | 说明 | 链接 |
|---|---|---|
| **工具** | 智能体可调用的内置工具（文件 I/O、搜索、Shell 等） | [工具](/user-guide/features/tools) |
| **技能** | 可安装的插件包，用于扩展新能力 | [技能](/user-guide/features/skills) |
| **记忆** | 跨会话的持久记忆 | [记忆](/user-guide/features/memory) |
| **上下文文件** | 将文件和目录传入对话 | [上下文文件](/user-guide/features/context-files) |
| **MCP** | 通过 MCP（模型上下文协议）连接外部工具服务器 | [MCP](/user-guide/features/mcp) |
| **Cron** | 定期调度智能体任务 | [Cron](/user-guide/features/cron) |
| **委派** | 派生子智能体并行处理 | [委派](/user-guide/features/delegation) |
| **代码执行** | 在沙盒环境中运行代码 | [代码执行](/user-guide/features/code-execution) |
| **浏览器** | 网页浏览与抓取 | [浏览器](/user-guide/features/browser) |
| **钩子** | 事件驱动的回调与中间件 | [钩子](/user-guide/features/hooks) |
| **批量处理** | 批量处理多个输入 | [批量处理](/user-guide/features/batch-processing) |
| **RL 训练** | 通过强化学习微调模型 | [RL 训练](/user-guide/features/rl-training) |
| **提供商路由** | 跨多个 LLM 提供商路由请求 | [提供商路由](/user-guide/features/provider-routing) |

## 接下来读什么

根据你目前的进度：

- **刚完成安装？** → 前往[快速入门](/getting-started/quickstart)，开启第一次对话。
- **完成了快速入门？** → 阅读 [CLI 使用](/user-guide/cli)和[配置](/user-guide/configuration)，自定义你的使用环境。
- **已熟悉基础功能？** → 探索[工具](/user-guide/features/tools)、[技能](/user-guide/features/skills)和[记忆](/user-guide/features/memory)，解锁智能体的全部能力。
- **为团队搭建？** → 阅读[安全](/user-guide/security)和[会话](/user-guide/sessions)，了解访问控制和对话管理。
- **准备好动手了？** → 进入[开发者指南](/developer-guide/architecture)，了解内部架构并开始贡献。
- **想看实际案例？** → 查看[技巧与窍门](/guides/tips)页面，获取真实项目示例和使用技巧。

:::tip
不必读完所有内容。选择符合你目标的路径，按顺序跟随链接，你很快就能高效上手。随时可以回到本页面，找到下一步的方向。
:::
