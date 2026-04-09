---
title: "Honcho 记忆"
---
# Honcho 记忆

[Honcho](https://github.com/plastic-labs/honcho) 是一个 AI 原生的记忆后端，在 Hermes 内置记忆系统之上引入了辩证推理（dialectic reasoning）和深度用户建模能力。与简单的键值存储不同，Honcho 在对话发生后对其进行推理，持续维护一个关于用户的动态模型——涵盖用户的偏好、沟通风格、目标与行为模式。

> ℹ️ **说明：Honcho 是一个记忆提供商插件**
>
> Honcho 已集成到[记忆提供商](/user-guide/features/memory-providers)系统中。以下所有功能均可通过统一的记忆提供商接口使用。

## Honcho 新增了什么

| 能力 | 内置记忆 | Honcho |
|------|---------|--------|
| 跨会话持久化 | ✔ 基于文件的 MEMORY.md/USER.md | ✔ 服务端存储，通过 API 访问 |
| 用户画像 | ✔ 由 Agent 手动维护 | ✔ 辩证推理自动生成 |
| 多智能体隔离 | — | ✔ 对端（Peer）画像独立存储 |
| 观测模式 | — | ✔ 统一模式或方向性模式 |
| "结论"（推导洞察） | — | ✔ 服务端对行为模式进行推理 |
| 历史搜索 | ✔ FTS5 会话搜索 | ✔ 对"结论"的语义搜索 |

**辩证推理**：每次对话结束后，Honcho 分析整个对话交流，推导出"结论"——关于用户偏好、习惯和目标的洞察。这些结论随时间不断累积，使 Agent 对用户的理解逐步加深，远超用户明确表达的内容。

**多智能体画像**：当多个 Hermes 实例与同一用户交互时（例如，一个代码助手和一个个人助手），Honcho 为每个实例维护独立的对端画像。每个对端只能看到自己的观测记录与结论，防止不同 Agent 之间发生上下文交叉污染。

## 安装配置

```bash
hermes memory setup    # 从提供商列表中选择"honcho"
```

或手动配置：

```yaml
# ~/.hermes/config.yaml
memory:
  provider: honcho
```

```bash
echo "HONCHO_API_KEY=your-key" >> ~/.hermes/.env
```

在 [honcho.dev](https://honcho.dev) 获取 API Key。

## 配置项

```yaml
# ~/.hermes/config.yaml
honcho:
  observation: directional    # "unified"（新安装默认值）或 "directional"
  peer_name: ""               # 自动从平台检测，或手动设置
```

**观测模式：**
- `unified` — 所有观测记录汇总到同一集合中，更简单，适合单智能体场景。
- `directional` — 观测记录按方向打标签（用户→Agent，Agent→用户），可对会话动态进行更丰富的分析。

## 工具

当 Honcho 作为记忆提供商激活后，四个额外工具将变为可用：

| 工具 | 用途 |
|------|------|
| `honcho_conclude` | 对近期对话触发服务端辩证推理 |
| `honcho_context` | 从 Honcho 记忆中检索当前对话的相关上下文 |
| `honcho_profile` | 查看或更新用户的 Honcho 画像 |
| `honcho_search` | 对所有已存储的"结论"和观测记录进行语义搜索 |

## CLI 命令

```bash
hermes honcho status          # 显示连接状态和配置
hermes honcho peer            # 为多智能体场景更新对端名称
```

## 从 `hermes honcho` 迁移

如果之前使用的是独立命令 `hermes honcho setup`：

1. 现有配置文件（`honcho.json` 或 `~/.honcho/config.json`）不受影响
2. 服务端数据（记忆、"结论"、用户画像）完好无损
3. 在 config.yaml 中设置 `memory.provider: honcho` 即可重新激活

无需重新登录或重新配置。运行 `hermes memory setup` 并选择"honcho"——向导会自动检测到已有配置。

## 完整文档

完整参考文档见[记忆提供商——Honcho](/user-guide/features/memory-providers#honcho)。
