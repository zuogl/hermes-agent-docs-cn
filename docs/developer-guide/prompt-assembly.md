---
title: "提示词组装"
---
# 提示词组装

Hermes 刻意将以下内容分离：

- **缓存的系统提示词状态**
- **API 调用时临时添加的内容**

这是项目中最重要的设计决策之一，因为它影响到：

- token 用量
- 提示词缓存效果
- 会话连贯性
- 记忆正确性

主要文件：

- `run_agent.py`
- `agent/prompt_builder.py`
- `tools/memory_tool.py`

## 缓存的系统提示词层次

缓存的系统提示词大致按以下顺序组装：

1. 智能体身份 —— 优先使用 `HERMES_HOME` 中的 `SOUL.md`，不存在时回退到 `prompt_builder.py` 中的 `DEFAULT_AGENT_IDENTITY`
2. 工具感知行为指导
3. Honcho 静态块（激活时）
4. 可选系统消息
5. 冻结的记忆（MEMORY）快照
6. 冻结的用户（USER）档案快照
7. 技能索引
8. 上下文文件（`AGENTS.md`、`.cursorrules`、`.cursor/rules/*.mdc`）—— 若 SOUL.md 已在步骤 1 中作为身份加载，则此处**不再**包含 SOUL.md
9. 时间戳 / 可选会话 ID
10. 平台提示

当 `skip_context_files` 被设置时（例如子智能体委托场景），不会加载 SOUL.md，而是使用硬编码的 `DEFAULT_AGENT_IDENTITY`。

### 具体示例：组装后的系统提示词

以下是所有层次均存在时，最终系统提示词的简化示意（注释说明了每部分的来源）：

```
# 第 1 层：智能体身份（来自 ~/.hermes/SOUL.md）
You are Hermes, an AI assistant created by Nous Research.
You are an expert software engineer and researcher.
You value correctness, clarity, and efficiency.
...

# 第 2 层：工具感知行为指导
You have persistent memory across sessions. Save durable facts using
the memory tool: user preferences, environment details, tool quirks,
and stable conventions. Memory is injected into every turn, so keep
it compact and focused on facts that will still matter later.
...
When the user references something from a past conversation or you
suspect relevant cross-session context exists, use session_search
to recall it before asking them to repeat themselves.

# 工具使用约束（仅适用于 GPT/Codex 模型）
You MUST use your tools to take action — do not describe what you
would do or plan to do without actually doing it.
...

# 第 3 层：Honcho 静态块（激活时）
[Honcho personality/context data]

# 第 4 层：可选系统消息（来自配置或 API）
[User-configured system message override]

# 第 5 层：冻结的记忆（MEMORY）快照
## Persistent Memory
- User prefers Python 3.12, uses pyproject.toml
- Default editor is nvim
- Working on project "atlas" in ~/code/atlas
- Timezone: US/Pacific

# 第 6 层：冻结的用户（USER）档案快照
## User Profile
- Name: Alice
- GitHub: alice-dev

# 第 7 层：技能索引
## Skills (mandatory)
Before replying, scan the skills below. If one clearly matches
your task, load it with skill_view(name) and follow its instructions.
...
<available_skills>
  software-development:
    - code-review: Structured code review workflow
    - test-driven-development: TDD methodology
  research:
    - arxiv: Search and summarize arXiv papers
</available_skills>

# 第 8 层：上下文文件（来自项目目录）
# Project Context
The following project context files have been loaded and should be followed:

## AGENTS.md
This is the atlas project. Use pytest for testing. The main
entry point is src/atlas/main.py. Always run `make lint` before
committing.

# 第 9 层：时间戳 + 会话
Current time: 2026-03-30T14:30:00-07:00
Session: abc123

# 第 10 层：平台提示
You are a CLI AI Agent. Try not to use markdown but simple text
renderable inside a terminal.
```

## SOUL.md 在提示词中的呈现方式

`SOUL.md` 位于 `~/.hermes/SOUL.md`，作为智能体的身份标识，是系统提示词的最前一部分。`prompt_builder.py` 中的加载逻辑如下：

```python
# 来自 agent/prompt_builder.py（简化版）
def load_soul_md() -> Optional[str]:
    soul_path = get_hermes_home() / "SOUL.md"
    if not soul_path.exists():
        return None
    content = soul_path.read_text(encoding="utf-8").strip()
    content = _scan_context_content(content, "SOUL.md")  # 安全扫描
    content = _truncate_content(content, "SOUL.md")       # 截断至 2 万字符
    return content
```

当 `load_soul_md()` 返回内容时，它会替换硬编码的 `DEFAULT_AGENT_IDENTITY`。随后调用 `build_context_files_prompt(skip_soul=True)` 以防止 SOUL.md 被重复注入（一次作为身份标识，一次作为上下文文件）。

如果 `SOUL.md` 不存在，系统将回退到以下内容：

```
You are Hermes Agent, an intelligent AI assistant created by Nous Research.
You are helpful, knowledgeable, and direct. You assist users with a wide
range of tasks including answering questions, writing and editing code,
analyzing information, creative work, and executing actions via your tools.
You communicate clearly, admit uncertainty when appropriate, and prioritize
being genuinely useful over being verbose unless otherwise directed below.
Be targeted and efficient in your exploration and investigations.
```

## 上下文文件的注入方式

`build_context_files_prompt()` 使用**优先级系统**——只加载一种项目上下文类型（先匹配者优先）：

```python
# 来自 agent/prompt_builder.py（简化版）
def build_context_files_prompt(cwd=None, skip_soul=False):
    cwd_path = Path(cwd).resolve()

    # 优先级：先匹配者优先——只加载一种项目上下文
    project_context = (
        _load_hermes_md(cwd_path)       # 1. .hermes.md / HERMES.md（向上查找至 git 根目录）
        or _load_agents_md(cwd_path)    # 2. AGENTS.md（仅当前目录）
        or _load_claude_md(cwd_path)    # 3. CLAUDE.md（仅当前目录）
        or _load_cursorrules(cwd_path)  # 4. .cursorrules / .cursor/rules/*.mdc
    )

    sections = []
    if project_context:
        sections.append(project_context)

    # 来自 HERMES_HOME 的 SOUL.md（独立于项目上下文）
    if not skip_soul:
        soul_content = load_soul_md()
        if soul_content:
            sections.append(soul_content)

    if not sections:
        return ""

    return (
        "# Project Context\n\n"
        "The following project context files have been loaded "
        "and should be followed:\n\n"
        + "\n".join(sections)
    )
```

### 上下文文件发现细节

| 优先级 | 文件 | 搜索范围 | 备注 |
|--------|------|----------|------|
| 1 | `.hermes.md`、`HERMES.md` | 从当前目录向上查找至 git 根目录 | Hermes 原生项目配置 |
| 2 | `AGENTS.md` | 仅当前目录 | 通用智能体指令文件 |
| 3 | `CLAUDE.md` | 仅当前目录 | 兼容 Claude Code |
| 4 | `.cursorrules`、`.cursor/rules/*.mdc` | 仅当前目录 | 兼容 Cursor |

所有上下文文件均会：

- **安全扫描** —— 检查提示词注入模式（不可见 Unicode 字符、"忽略之前的指令"、凭证外泄尝试）
- **截断处理** —— 以 70/20 的头尾比例截断至 20,000 字符，并附带截断标记
- **去除 YAML frontmatter** —— `.hermes.md` 的 frontmatter 会被移除（为未来的配置覆盖功能预留）

## 仅 API 调用时注入的层次

以下内容刻意**不**作为缓存系统提示词的一部分持久化：

- `ephemeral_system_prompt`（临时系统提示词）
- 预填充消息
- 网关派生的会话上下文覆盖
- 后续轮次中注入到当前轮次用户消息的 Honcho 召回内容

这种分离确保稳定前缀不被修改，从而有效利用缓存。

## 记忆快照

本地记忆和用户档案数据在会话开始时作为冻结快照注入。会话中途的写入操作只更新磁盘状态，不会修改当前已构建的系统提示词。需等到新会话启动或强制重建，改动才会生效。

## 上下文文件

`agent/prompt_builder.py` 使用**优先级系统**扫描并清理项目上下文文件——只加载一种类型（先匹配者优先）：

1. `.hermes.md` / `HERMES.md`（向上查找至 git 根目录）
2. `AGENTS.md`（启动时的当前目录；会话期间通过 `agent/subdirectory_hints.py` 逐步发现子目录）
3. `CLAUDE.md`（仅当前目录）
4. `.cursorrules` / `.cursor/rules/*.mdc`（仅当前目录）

`SOUL.md` 通过 `load_soul_md()` 单独加载，用于身份标识槽位。成功加载后，`build_context_files_prompt(skip_soul=True)` 可防止其被重复注入。

长文件在注入前会被截断。

## 技能索引

当技能工具可用时，技能系统会向提示词贡献一个紧凑的技能索引。

## 为何提示词组装要如此拆分

该架构经过刻意优化，旨在：

- 保留提供商侧的提示词缓存
- 避免不必要地修改历史记录
- 保持记忆语义的可理解性
- 允许网关 / ACP（Agent Control Protocol，智能体控制协议）/ CLI 添加上下文，而不污染持久化的提示词状态

## 相关文档

- [上下文压缩与提示词缓存](/developer-guide/context-compression-and-caching)
- [会话存储](/developer-guide/session-storage)
- [网关内部机制](/developer-guide/gateway-internals)
