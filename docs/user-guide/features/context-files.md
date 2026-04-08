---
title: "上下文文件"
---
# 上下文文件

Hermes Agent 会自动发现并加载上下文文件，以塑造其行为方式。其中一些是项目本地文件，从工作目录中发现。`SOUL.md` 现在对 Hermes 实例是全局的，仅从 `HERMES_HOME` 加载。

## 支持的上下文文件

| 文件 | 用途 | 发现方式 |
|------|------|---------|
| **.hermes.md** / **HERMES.md** | 项目指令（最高优先级） | 向上遍历至 git 根目录 |
| **AGENTS.md** | 项目指令、规范、架构 | 启动时工作目录 + 子目录渐进式发现 |
| **CLAUDE.md** | Claude Code 上下文文件（也会被检测） | 启动时工作目录 + 子目录渐进式发现 |
| **SOUL.md** | 本 Hermes 实例的全局个性与语气定制 | 仅 `HERMES_HOME/SOUL.md` |
| **.cursorrules** | Cursor IDE 编码规范 | 仅工作目录 |
| **.cursor/rules/*.mdc** | Cursor IDE 规则模块 | 仅工作目录 |

:::info
优先级系统
每个会话只加载**一种**项目上下文类型（先匹配者优先）：`.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。**SOUL.md** 始终作为智能体身份（槽位 #1）独立加载。
:::

## AGENTS.md

`AGENTS.md` 是主要的项目上下文文件。它告知智能体项目的结构、应遵循的规范以及任何特殊指令。

### 渐进式子目录发现

会话开始时，Hermes 将工作目录中的 `AGENTS.md` 加载到系统提示词中。在会话期间，当智能体通过 `read_file`、`terminal`、`search_files` 等工具进入子目录时，它会**渐进式发现**这些目录中的上下文文件，并在变得相关时即时注入到对话中。

```
my-project/
├── AGENTS.md              ← 启动时加载（系统提示词）
├── frontend/
│   └── AGENTS.md          ← 当智能体读取 frontend/ 文件时发现
├── backend/
│   └── AGENTS.md          ← 当智能体读取 backend/ 文件时发现
└── shared/
    └── AGENTS.md          ← 当智能体读取 shared/ 文件时发现
```

这种方式相比启动时加载全部内容有两个优势：
- **无系统提示词膨胀** — 子目录提示仅在需要时出现
- **保留提示缓存** — 系统提示词在各轮次间保持稳定

每个子目录每个会话最多检查一次。发现机制同样会向上遍历父目录，因此读取 `backend/src/main.py` 时，即使 `backend/src/` 没有自己的上下文文件，也会发现 `backend/AGENTS.md`。

:::info
子目录上下文文件会经过与启动上下文文件相同的[安全扫描](#安全提示注入防护)。恶意文件会被拦截。
:::

### AGENTS.md 示例

```markdown
# 项目上下文

这是一个使用 Python FastAPI 后端的 Next.js 14 Web 应用。

## 架构
- 前端：`/frontend` 中使用 App Router 的 Next.js 14
- 后端：`/backend` 中的 FastAPI，使用 SQLAlchemy ORM
- 数据库：PostgreSQL 16
- 部署：Hetzner VPS 上的 Docker Compose

## 规范
- 所有前端代码使用 TypeScript 严格模式
- Python 代码遵循 PEP 8，全处使用类型注解
- 所有 API 端点返回格式为 `{data, error, meta}` 的 JSON
- 测试放在 `__tests__/` 目录（前端）或 `tests/`（后端）

## 重要说明
- 切勿直接修改迁移文件 — 使用 Alembic 命令
- `.env.local` 文件包含真实 API 密钥，不要提交
- 前端端口 3000，后端 8000，数据库 5432
```

## SOUL.md

`SOUL.md` 控制智能体的个性、语气和沟通风格。详见[个性](https://hermes-agent.nousresearch.com/docs/user-guide/features/personality)页面。

**位置：**

- `~/.hermes/SOUL.md`
- 或 `$HERMES_HOME/SOUL.md`（若使用自定义 home 目录运行 Hermes）

重要细节：

- 若 `SOUL.md` 不存在，Hermes 会自动创建默认的 `SOUL.md`
- Hermes 仅从 `HERMES_HOME` 加载 `SOUL.md`
- Hermes 不会在工作目录中探测 `SOUL.md`
- 若文件为空，`SOUL.md` 中的内容不会添加到提示词中
- 若文件有内容，内容经扫描和截断处理后原样注入

## .cursorrules

Hermes 兼容 Cursor IDE 的 `.cursorrules` 文件和 `.cursor/rules/*.mdc` 规则模块。若这些文件存在于项目根目录，且未找到更高优先级的上下文文件（`.hermes.md`、`AGENTS.md` 或 `CLAUDE.md`），则会将其作为项目上下文加载。

这意味着使用 Hermes 时，你现有的 Cursor 规范会自动生效。

## 上下文文件的加载方式

### 启动时（系统提示词）

上下文文件由 `agent/prompt_builder.py` 中的 `build_context_files_prompt()` 加载：

1. **扫描工作目录** — 检查 `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`（先匹配者优先）
2. **读取内容** — 以 UTF-8 文本读取每个文件
3. **安全扫描** — 检查内容是否存在提示注入模式
4. **截断** — 超过 20,000 个字符的文件将进行首尾截断（头部保留 70%，尾部保留 20%，中间插入截断标记）
5. **组装** — 所有部分合并到 `# Project Context` 标头下
6. **注入** — 组装后的内容添加到系统提示词

### 会话期间（渐进式发现）

`agent/subdirectory_hints.py` 中的 `SubdirectoryHintTracker` 监视工具调用参数中的文件路径：

1. **路径提取** — 每次工具调用后，从参数（`path`、`workdir`、shell 命令）中提取文件路径
2. **向上遍历** — 检查该目录及最多 5 个父目录（遇到已访问目录则停止）
3. **提示加载** — 若找到 `AGENTS.md`、`CLAUDE.md` 或 `.cursorrules`，则加载（每个目录先匹配者优先）
4. **安全扫描** — 与启动文件相同的提示注入扫描
5. **截断** — 每个文件最多 8,000 个字符
6. **注入** — 追加到工具结果中，使模型在上下文中自然看到

最终提示词部分大致如下：

```text
# Project Context

The following project context files have been loaded and should be followed:

## AGENTS.md

[Your AGENTS.md content here]

## .cursorrules

[Your .cursorrules content here]

[Your SOUL.md content here]
```

注意，SOUL 内容是直接插入的，没有额外的包装文本。

## 安全：提示注入防护

所有上下文文件在被包含之前都会扫描潜在的提示注入。扫描器检查以下内容：

- **指令覆盖尝试**："ignore previous instructions"、"disregard your rules"
- **欺骗模式**："do not tell the user"
- **系统提示词覆盖**："system prompt override"
- **隐藏 HTML 注释**：`<!-- ignore instructions -->`
- **隐藏 div 元素**：``
- **凭证泄露**：`curl ... $API_KEY`
- **密钥文件访问**：`cat .env`、`cat credentials`
- **不可见字符**：零宽空格、双向覆盖符、单词连接符

若检测到任何威胁模式，该文件将被拦截：

```
[BLOCKED: AGENTS.md contained potential prompt injection (prompt_injection). Content not loaded.]
```

:::caution
此扫描器可防护常见注入模式，但不能替代对共享仓库中上下文文件的人工审查。在非自己创建的项目中，务必验证 AGENTS.md 的内容。
:::

## 大小限制

| 限制 | 值 |
|------|-------|
| 每文件最大字符数 | 20,000（约 7,000 个 token） |
| 头部截断比例 | 70% |
| 尾部截断比例 | 20% |
| 截断标记 | 10%（显示字符数并建议使用文件工具） |

当文件超过 20,000 个字符时，截断消息如下：

```
[...truncated AGENTS.md: kept 14000+4000 of 25000 chars. Use file tools to read the full file.]
```

## 有效使用上下文文件的技巧

:::tip
AGENTS.md 最佳实践
1. **保持简洁** — 远低于 20K 字符；智能体每轮都会读取
2. **使用标头组织结构** — 用 `##` 分节描述架构、规范、重要说明
3. **包含具体示例** — 展示首选的代码模式、API 结构、命名规范
4. **说明不该做什么** — "切勿直接修改迁移文件"
5. **列出关键路径和端口** — 智能体用于终端命令
6. **随项目演进更新** — 过时的上下文比没有上下文更糟
:::

### 子目录上下文

对于单体仓库（monorepo），将子目录专属指令放在嵌套的 AGENTS.md 文件中：

```markdown
<!-- frontend/AGENTS.md -->
# 前端上下文

- 使用 `pnpm` 而非 `npm` 进行包管理
- 组件放在 `src/components/`，页面放在 `src/app/`
- 使用 Tailwind CSS，永远不要使用行内样式
- 使用 `pnpm test` 运行测试
```

```markdown
<!-- backend/AGENTS.md -->
# 后端上下文

- 使用 `poetry` 进行依赖管理
- 使用 `poetry run uvicorn main:app --reload` 启动开发服务器
- 所有端点需要 OpenAPI 文档字符串
- 数据库模型在 `models/` 中，schema 在 `schemas/` 中
```
