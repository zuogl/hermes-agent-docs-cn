---
title: "持久记忆"
---
# 持久记忆

Hermes Agent 拥有有界、精心维护的记忆，可跨会话持久保存。这使它能够记住你的偏好、你的项目、你的环境，以及它已学到的内容。

## 工作原理

智能体的记忆由两个文件组成：

| 文件 | 用途 | 字符上限 |
|------|------|----------|
| **MEMORY.md** | 智能体的个人笔记——环境事实、规范约定、已学内容 | 2,200 字符（约 800 token） |
| **USER.md** | 用户配置文件——你的偏好、沟通风格、期望 | 1,375 字符（约 500 token） |

两个文件均存储在 `~/.hermes/memories/` 中，并在会话开始时作为冻结快照注入系统提示词。智能体通过 `memory` 工具管理自己的记忆——它可以添加、替换或删除条目。

:::info
字符上限使记忆保持专注。
当记忆已满时，智能体会整合或替换条目，为新信息腾出空间。
:::

## 记忆在系统提示词中的呈现方式

每次会话开始时，记忆条目从磁盘加载，并作为冻结块渲染到系统提示词中：

```
══════════════════════════════════════════════
MEMORY (your personal notes) [67% — 1,474/2,200 chars]
══════════════════════════════════════════════
User's project is a Rust web service at ~/code/myapi using Axum + SQLx
§
This machine runs Ubuntu 22.04, has Docker and Podman installed
§
User prefers concise responses, dislikes verbose explanations
```

格式包含：
- 标头，显示使用的存储（MEMORY 或 USER PROFILE）
- 使用百分比和字符计数，让智能体了解容量
- 以 `§`（分节符）分隔的各个条目
- 条目可以是多行的

**冻结快照模式：** 系统提示词注入在会话开始时一次性捕获，会话期间不会改变。这是有意为之的——它为性能保留了 LLM 的前缀缓存。当智能体在会话期间添加或删除记忆条目时，变更立即持久化到磁盘，但直到下一次会话开始才会出现在系统提示词中。工具响应始终显示实时状态。

## 记忆工具操作

智能体使用 `memory` 工具执行以下操作：

- **add** — 添加新的记忆条目
- **replace** — 将现有条目替换为更新内容（通过 `old_text` 使用子字符串匹配）
- **remove** — 删除不再相关的条目（通过 `old_text` 使用子字符串匹配）

不存在 `read` 操作——记忆内容在会话开始时自动注入系统提示词。智能体将其记忆视为对话上下文的一部分。

### 子字符串匹配

`replace` 和 `remove` 操作使用简短的唯一子字符串匹配——无需提供完整的条目文本。`old_text` 参数只需是能唯一标识某一条目的子字符串：

```python
# 如果记忆中包含 "User prefers dark mode in all editors"
memory(action="replace", target="memory",
       old_text="dark mode",
       content="User prefers light mode in VS Code, dark mode in terminal")
```

如果该子字符串匹配多个条目，则返回错误，要求提供更具体的匹配内容。

## 两个存储目标详解

### `memory` — 智能体个人笔记

用于存储智能体需要记住的环境、工作流和经验教训：

- 环境事实（操作系统、工具、项目结构）
- 项目规范和配置
- 发现的工具特性和变通方案
- 已完成任务的日志条目
- 有效的技能和技巧

### `user` — 用户配置文件

用于存储用户身份、偏好和沟通风格：

- 姓名、角色、时区
- 沟通偏好（简洁 vs 详细、格式偏好）
- 个人雷区和需要回避的事项
- 工作流习惯
- 技术能力水平

## 该保存什么，该跳过什么

### 主动保存这些内容

智能体会自动保存——无需你主动要求。当它了解到以下内容时会保存：

- **用户偏好：** "我更喜欢 TypeScript 而非 JavaScript" → 保存到 `user`
- **环境事实：** "这台服务器运行 Debian 12，使用 PostgreSQL 16" → 保存到 `memory`
- **纠正信息：** "Docker 命令不要用 `sudo`，用户已加入 docker 组" → 保存到 `memory`
- **规范约定：** "项目使用制表符、120 字符行宽、Google 风格文档字符串" → 保存到 `memory`
- **已完成的工作：** "于 2026-01-15 将数据库从 MySQL 迁移至 PostgreSQL" → 保存到 `memory`
- **明确请求：** "记住我的 API 密钥每月轮换一次" → 保存到 `memory`

### 跳过这些内容

- **琐碎/显而易见的信息：** "用户询问了 Python" — 太模糊，没什么用
- **容易重新发现的事实：** "Python 3.12 支持 f-string 嵌套" — 可以网络搜索
- **原始数据转储：** 大型代码块、日志文件、数据表——对记忆来说太大
- **会话特有的临时内容：** 临时文件路径、一次性调试上下文
- **上下文文件中已有的信息：** SOUL.md 和 AGENTS.md 的内容

## 容量管理

记忆有严格的字符上限，以保持系统提示词的规模可控：

| 存储 | 上限 | 典型条目数 |
|------|------|------------|
| memory | 2,200 字符 | 8-15 条 |
| user | 1,375 字符 | 5-10 条 |

### 记忆已满时的处理方式

当你尝试添加超出上限的条目时，工具会返回错误：

```json
{
  "success": false,
  "error": "Memory at 2,100/2,200 chars. Adding this entry (250 chars) would exceed the limit. Replace or remove existing entries first.",
  "current_entries": ["..."],
  "usage": "2,100/2,200"
}
```

智能体应当：
1. 读取当前条目（显示在错误响应中）
2. 确定可删除或合并的条目
3. 使用 `replace` 将相关条目合并为更短的版本
4. 然后 `add` 新条目

**最佳实践：** 当记忆使用率超过 80%（在系统提示词标头中可见）时，应在添加新条目前先整合现有条目。例如，将三个独立的"项目使用 X"条目合并为一个综合性的项目描述条目。

### 优质记忆条目实例

**紧凑、信息密集的条目效果最佳：**

```
# 好：将多个相关事实打包
User runs macOS 14 Sonoma, uses Homebrew, has Docker Desktop and Podman. Shell: zsh with oh-my-zsh. Editor: VS Code with Vim keybindings.

# 好：具体、可操作的规范
Project ~/code/api uses Go 1.22, sqlc for DB queries, chi router. Run tests with 'make test'. CI via GitHub Actions.

# 好：带上下文的经验教训
The staging server (10.0.1.50) needs SSH port 2222, not 22. Key is at ~/.ssh/staging_ed25519.

# 差：太模糊
User has a project.

# 差：太冗长
On January 5th, 2026, the user asked me to look at their project which is
located at ~/code/api. I discovered it uses Go version 1.22 and...
```

## 重复预防

记忆系统自动拒绝完全重复的条目。如果你尝试添加已存在的内容，系统返回成功并提示"未添加重复条目"。

## 安全扫描

记忆条目在写入之前会经过注入攻击和数据外泄模式检测，因为它们会被注入到系统提示词中。匹配威胁模式的内容（提示词注入、凭据外泄、SSH 后门）或包含不可见 Unicode 字符的内容将被拦截。

## 会话搜索

除 MEMORY.md 和 USER.md 外，智能体还可以使用 `session_search` 工具搜索过去的对话：

- 所有 CLI 和消息会话都存储在 SQLite（`~/.hermes/state.db`）中，支持 FTS5 全文搜索
- 搜索查询会返回相关的过去对话，并通过 Gemini Flash 进行摘要
- 智能体可以找到数周前讨论过的内容，即使这些内容不在其活跃记忆中

```bash
hermes sessions list    # 浏览过去的会话
```

### session_search 与记忆的对比

| 特性 | 持久记忆 | 会话搜索 |
|------|----------|----------|
| **容量** | 约 1,300 token 总计 | 无限制（所有会话） |
| **速度** | 即时（在系统提示词中） | 需要搜索 + LLM 摘要 |
| **使用场景** | 始终可用的关键事实 | 查找特定的过去对话 |
| **管理方式** | 由智能体手动维护 | 自动——所有会话均被存储 |
| **token 开销** | 每次会话固定（约 1,300 token） | 按需（需要时搜索） |

**记忆**用于始终需要在上下文中的关键事实。**会话搜索**用于"我们上周讨论过 X 吗？"这类查询，此时智能体需要从过去的对话中回忆具体内容。

## 配置

```yaml
# 在 ~/.hermes/config.yaml 中
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # 约 800 token
  user_char_limit: 1375     # 约 500 token
```

## 外部记忆提供商

对于超出 MEMORY.md 和 USER.md 范围的深度持久记忆，Hermes 内置了 8 个外部记忆提供商插件——包括 Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover 和 Supermemory。

外部提供商与内置记忆**并行运行**（而非替代），并增加了知识图谱、语义搜索、自动事实提取和跨会话用户建模等能力。

```bash
hermes memory setup      # 选择并配置提供商
hermes memory status     # 检查当前活跃状态
```

详见 [记忆提供商](/user-guide/features/memory-providers) 指南，了解每个提供商的完整详情、配置说明和对比。
