---
title: "在 Hermes 中使用 SOUL.md"
---
# 在 Hermes 中使用 SOUL.md

`SOUL.md` 是你的 Hermes 实例的**主要身份**文件。它是系统提示词的首位内容——定义这个智能体是谁、如何说话，以及应该避免什么。

如果你希望每次与 Hermes 对话时都有一致的助手体验，或者想用自己定义的人格完全替换默认的 Hermes 人格，这就是你需要编辑的文件。

## SOUL.md 的用途

`SOUL.md` 适合用于：
- 语气
- 个性
- 沟通风格
- Hermes 应保持多直接或多亲和
- Hermes 在风格上应避免什么
- Hermes 面对不确定性、分歧和模糊时的应对方式

简而言之：
- `SOUL.md` 定义 Hermes 是谁、如何说话

## SOUL.md 不适合的内容

不要用它来存放：
- 特定代码库的编码规范
- 文件路径
- 命令
- 服务端口
- 架构说明
- 项目工作流程指引

这些内容应放在 `AGENTS.md`。

一条简单的判断规则：
- 凡是需要在所有地方普遍生效的规则，放到 `SOUL.md`
- 只属于某个具体项目的规则，放到 `AGENTS.md`

## 文件位置

Hermes 目前只使用当前实例的全局 SOUL 文件：

```text
~/.hermes/SOUL.md
```

如果你使用了自定义的 home 目录启动 Hermes，路径变为：

```text
$HERMES_HOME/SOUL.md
```

## 首次运行行为

如果 `SOUL.md` 不存在，Hermes 会自动为你生成一个初始模板。这意味着大多数用户一开始就有一个真实可用的文件，可以立即查看和编辑。

注意：
- 如果你已有 `SOUL.md`，Hermes 不会覆盖它
- 如果文件存在但内容为空，Hermes 不会将任何内容加入提示词

## Hermes 如何使用它

Hermes 启动会话时，会从 `HERMES_HOME` 读取 `SOUL.md`，扫描其中是否存在提示词注入模式，必要时进行截断，然后将其作为**智能体身份**使用——这是系统提示词中的第一个位置（插槽 #1）。这意味着 SOUL.md 会完全替换内置的默认身份文本。

如果 SOUL.md 缺失、为空或无法加载，Hermes 会回退到内置的默认身份。

Hermes 不会在文件内容外添加任何包装文字。内容本身才是关键——想让智能体怎样思考和表达，就怎样写。

## 第一次编辑建议

如果你不知道从哪里开始，就打开文件，改几行让它更像你自己的风格。

例如：

```markdown
You are direct, calm, and technically precise.
Prefer substance over politeness theater.
Push back clearly when an idea is weak.
Keep answers compact unless deeper detail is useful.
```

仅凭这几行，就能明显改变 Hermes 的感觉。

## 风格示例

### 1. 务实工程师

```markdown
You are a pragmatic senior engineer.
You care more about correctness and operational reality than sounding impressive.

## Style
- Be direct
- Be concise unless complexity requires depth
- Say when something is a bad idea
- Prefer practical tradeoffs over idealized abstractions

## Avoid
- Sycophancy
- Hype language
- Overexplaining obvious things
```

### 2. 研究伙伴

```markdown
You are a thoughtful research collaborator.
You are curious, honest about uncertainty, and excited by unusual ideas.

## Style
- Explore possibilities without pretending certainty
- Distinguish speculation from evidence
- Ask clarifying questions when the idea space is underspecified
- Prefer conceptual depth over shallow completeness
```

### 3. 教学型

```markdown
You are a patient technical teacher.
You care about understanding, not performance.

## Style
- Explain clearly
- Use examples when they help
- Do not assume prior knowledge unless the user signals it
- Build from intuition to details
```

### 4. 严格审阅者

```markdown
You are a rigorous reviewer.
You are fair, but you do not soften important criticism.

## Style
- Point out weak assumptions directly
- Prioritize correctness over harmony
- Be explicit about risks and tradeoffs
- Prefer blunt clarity to vague diplomacy
```

## 什么是好的 SOUL.md？

好的 `SOUL.md`：
- 稳定
- 广泛适用
- 在风格上具体明确
- 不包含临时性指令

弱的 `SOUL.md`：
- 充斥项目细节
- 前后矛盾
- 试图管控每一种回复的形式
- 大多是空洞的通用说法，比如"有帮助"和"清晰表达"

Hermes 本来就会尽力做到有用且清晰。`SOUL.md` 应该赋予它真实的个性和风格，而不是重复那些显而易见的默认行为。

## 建议结构

不需要使用标题，但标题有助于组织内容。

一个实用的结构：

```markdown
# Identity
Who Hermes is.

# Style
How Hermes should sound.

# Avoid
What Hermes should not do.

# Defaults
How Hermes should behave when ambiguity appears.
```

## SOUL.md 与 /personality

两者是互补的。

用 `SOUL.md` 定义你的稳定基准风格。
用 `/personality` 进行临时模式切换。

示例：
- 你的默认 SOUL.md 是务实而直接的
- 然后在某次会话中使用 `/personality teacher`
- 会话结束后切换回来，无需修改基础风格文件

## SOUL.md 与 AGENTS.md

这是最常见的错误。

### 应放入 SOUL.md
- "保持直接。"
- "避免夸大宣传的措辞。"
- "需要深入时再展开，否则保持简短。"
- "用户说错时要指出来。"

### 应放入 AGENTS.md
- "使用 pytest，不用 unittest。"
- "前端代码在 `frontend/` 目录。"
- "永远不要直接编辑数据库迁移文件。"
- "API 运行在 8000 端口。"

## 如何编辑

```bash
nano ~/.hermes/SOUL.md
```

或

```bash
vim ~/.hermes/SOUL.md
```

编辑完成后，重启 Hermes 或开始新会话。

## 实用工作流

1. 从自动生成的初始默认文件开始
2. 删掉不符合你期望风格的内容
3. 添加 4–8 行清晰定义语气和默认行为的内容
4. 与 Hermes 对话一段时间
5. 根据仍然不对劲的地方进行调整

这种迭代方式比一次性设计出完美人格更有效。

## 排错

### 我编辑了 SOUL.md，但 Hermes 听起来还是一样

检查：
- 你编辑的是 `~/.hermes/SOUL.md` 或 `$HERMES_HOME/SOUL.md`
- 不是某个仓库本地的 `SOUL.md`
- 文件不为空
- 编辑后已重启会话
- 没有 `/personality` 临时覆盖在主导结果

### Hermes 忽略了 SOUL.md 中的部分内容

可能原因：
- 更高优先级的指令覆盖了它
- 文件中存在相互矛盾的指引
- 文件过长，被截断了
- 部分文本类似提示词注入内容，可能被扫描器拦截或修改

### 我的 SOUL.md 变得过于项目特定

将项目指令移到 `AGENTS.md`，保持 `SOUL.md` 专注于身份和风格。

## 相关文档

- [人格与 SOUL.md](/user-guide/features/personality)
- [上下文文件](/user-guide/features/context-files)
- [配置说明](/user-guide/configuration)
- [技巧与最佳实践](/guides/tips)
