---
title: "个性与 SOUL.md"
---
# 个性与 SOUL.md

Hermes Agent 的个性完全可定制。`SOUL.md` 是**主要身份标识**——它是系统提示词中的第一个内容，定义了智能体是谁。

- `SOUL.md` — 一个持久化的配置文件，存放在 `HERMES_HOME` 中，作为智能体的身份标识（系统提示词的第 1 个槽位）
- 内置或自定义的 `/personality` 预设 — 会话级别的系统提示词叠加层

如果你想改变 Hermes 的身份，或将其替换为完全不同的智能体角色，请编辑 `SOUL.md`。

## SOUL.md 现在的工作原理

Hermes 现在会自动在以下路径创建默认的 `SOUL.md`：

```text
~/.hermes/SOUL.md
```

更准确地说，它使用当前实例的 `HERMES_HOME`，所以如果你使用自定义主目录运行 Hermes，它将使用：

```text
$HERMES_HOME/SOUL.md
```

### 重要行为

- **SOUL.md 是智能体的主要身份标识。** 它占据系统提示词的第 1 个槽位，替换了硬编码的默认身份。
- 如果 `SOUL.md` 不存在，Hermes 会自动创建一个初始 SOUL.md 文件
- 已有的用户 `SOUL.md` 文件不会被覆盖
- Hermes 只从 `HERMES_HOME` 加载 `SOUL.md`
- Hermes 不会在当前工作目录中查找 `SOUL.md`
- 如果 `SOUL.md` 存在但为空，或无法加载，Hermes 会回退到内置的默认身份
- 如果 `SOUL.md` 有内容，该内容在经过安全扫描和截断处理后会原样写入
- SOUL.md **不会**在上下文文件部分重复出现——它只作为身份标识出现一次

这使得 `SOUL.md` 成为真正的每用户或每实例身份标识，而不仅仅是一个叠加层。

## 这样设计的原因

这样可以保持个性的可预测性。

如果 Hermes 从你恰好启动它的任意目录加载 `SOUL.md`，你的个性可能会在不同项目之间意外变化。通过只从 `HERMES_HOME` 加载，个性归属于 Hermes 实例本身。

这也让教导用户变得更简单：
- "编辑 `~/.hermes/SOUL.md` 可以改变 Hermes 的默认个性。"

## 在哪里编辑

对于大多数用户：

```bash
~/.hermes/SOUL.md
```

如果你使用自定义主目录：

```bash
$HERMES_HOME/SOUL.md
```

## SOUL.md 应该写什么？

将其用于持久化的声音和个性指导，例如：
- 语调
- 沟通风格
- 直接程度
- 默认互动方式
- 风格上需要避免的内容
- Hermes 应如何处理不确定性、分歧或模糊性

不适合写入的内容：
- 一次性项目指令
- 文件路径
- 代码库规范
- 临时工作流详情

这些内容应放在 `AGENTS.md` 而不是 `SOUL.md` 中。

## 优质 SOUL.md 内容

一个好的 SOUL 文件具有以下特点：
- 在不同上下文中保持稳定
- 足够广泛，适用于多种对话场景
- 足够具体，能够实质性地塑造声音
- 专注于沟通和身份，而非具体任务指令

### 示例

```markdown
# 个性

你是一个有品味的务实资深工程师。
你优先追求真实、清晰和实用，而非表演式的礼貌。

## 风格
- 直接但不冷漠
- 更注重实质而非废话
- 遇到烂主意要反驳
- 坦率承认不确定性
- 保持解释简洁，除非深入讲解有价值

## 需要避免的
- 谄媚
- 夸大宣传的语言
- 重复用户有误的表述
- 过度解释显而易见的事情

## 技术立场
- 偏好简单系统，而非聪明系统
- 关注运营现实，而非理想化架构
- 将边缘案例视为设计的一部分，而非后期清理
```

## Hermes 注入提示词的方式

`SOUL.md` 内容直接写入系统提示词的第 1 个槽位——智能体身份位置。其周围不会添加任何包装语言。

内容会经过：
- 提示词注入扫描
- 如果内容过大则截断

如果文件为空、仅含空白字符或无法读取，Hermes 会回退到内置默认身份（"You are Hermes Agent, an intelligent AI assistant created by Nous Research..."）。当 `skip_context_files` 被设置时（例如在子智能体/委托上下文中），也会应用此回退。

## 安全扫描

`SOUL.md` 与其他携带上下文的文件一样，在被包含前会进行提示词注入模式扫描。

这意味着你应该让它专注于角色/声音定义，而不是试图夹带奇怪的元指令。

## SOUL.md vs AGENTS.md

这是最重要的区别。

### SOUL.md
适合：
- 身份
- 语调
- 风格
- 沟通默认值
- 个性层面的行为

### AGENTS.md
适合：
- 项目架构
- 编码规范
- 工具偏好
- 代码库特定工作流
- 命令、端口、路径、部署说明

一个实用的判断规则：
- 如果它应该随时跟随你，放在 `SOUL.md`
- 如果它属于某个项目，放在 `AGENTS.md`

## SOUL.md vs `/personality`

`SOUL.md` 是你持久化的默认个性。

`/personality` 是会话级别的叠加层，用于改变或补充当前系统提示词。

因此：
- `SOUL.md` = 基础声音
- `/personality` = 临时模式切换

示例：
- 保持务实的默认 SOUL，在辅导对话时使用 `/personality teacher`
- 保持简洁的 SOUL，在头脑风暴时使用 `/personality creative`

## 内置个性

Hermes 内置了多种个性，可通过 `/personality` 切换。

| 名称 | 描述 |
|------|------|
| **helpful** | 友好的通用助手 |
| **concise** | 简短、直击要点的回复 |
| **technical** | 详细、准确的技术专家 |
| **creative** | 创新、突破常规的思维 |
| **teacher** | 耐心的教育者，配有清晰示例 |
| **kawaii** | 可爱表达、闪光和热情 ★ |
| **catgirl** | Neko-chan 风格，带猫咪表达，nya~ |
| **pirate** | 船长 Hermes，精通技术的海盗 |
| **shakespeare** | 莎士比亚式散文，充满戏剧张力 |
| **surfer** | 极度放松的兄弟风格 |
| **noir** | 黑色电影硬派侦探叙事 |
| **uwu** | 极致可爱的 uwu 风格 |
| **philosopher** | 对每个问题深度沉思 |
| **hype** | 最大能量和热情！！！ |

## 用命令切换个性

### CLI

```text
/personality
/personality concise
/personality technical
```

### 消息平台

```text
/personality teacher
```

这些是便捷的叠加层，但你全局的 `SOUL.md` 仍然赋予 Hermes 持久的默认个性，除非叠加层对其有实质性的改变。

## 在配置中自定义个性

你也可以在 `~/.hermes/config.yaml` 的 `agent.personalities` 下定义命名的自定义个性。

```yaml
agent:
  personalities:
    codereviewer: >
      You are a meticulous code reviewer. Identify bugs, security issues,
      performance concerns, and unclear design choices. Be precise and constructive.
```

然后通过以下命令切换：

```text
/personality codereviewer
```

## 推荐工作流

一个强大的默认配置是：

1. 在 `~/.hermes/SOUL.md` 中维护一个经过深思熟虑的全局 `SOUL.md`
2. 将项目指令放在 `AGENTS.md` 中
3. 只在需要临时模式切换时使用 `/personality`

这样你将获得：
- 稳定的声音
- 项目特定行为各归其位
- 需要时的临时控制权

## 个性如何与完整提示词交互

从高层来看，提示词栈包括：
1. **SOUL.md**（智能体身份——如果 SOUL.md 不可用则使用内置回退）
2. 工具感知行为指导
3. 记忆/用户上下文
4. 技能指导
5. 上下文文件（`AGENTS.md`、`.cursorrules`）
6. 时间戳
7. 平台特定格式提示
8. 可选的系统提示词叠加层，例如 `/personality`

`SOUL.md` 是基础——其他所有内容都建立在它之上。

## 相关文档

- [上下文文件](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files)
- [配置](https://hermes-agent.nousresearch.com/docs/user-guide/configuration)
- [技巧与最佳实践](https://hermes-agent.nousresearch.com/docs/guides/tips)
- [SOUL.md 指南](https://hermes-agent.nousresearch.com/docs/guides/use-soul-with-hermes)

## CLI 外观 vs 对话个性

对话个性与 CLI 外观是分开的：

- `SOUL.md`、`agent.system_prompt` 和 `/personality` 影响 Hermes 的说话方式
- `display.skin` 和 `/skin` 影响 Hermes 在终端中的显示外观

有关终端外观，请参见[皮肤与主题](/user-guide/features/skins)。
