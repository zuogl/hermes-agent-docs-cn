---
title: "使用技能"
---
# 使用技能

技能（skill）是按需加载的知识文档，用于教会 Hermes 如何处理特定任务——从生成 ASCII 艺术字到管理 GitHub PR，应有尽有。本指南介绍日常使用的各种方法。

完整的技术参考，请查阅[技能系统](/user-guide/features/skills)。

---

## 查找技能

每个 Hermes 安装都自带一批内置技能。查看可用技能：

```bash
# 在任意聊天会话中：
/skills

# 或通过 CLI：
hermes skills list
```

命令输出包含名称和描述的精简列表：

```
ascii-art         使用 pyfiglet、cowsay、boxes 等生成 ASCII 艺术字...
arxiv             在 arXiv 上搜索和获取学术论文...
github-pr-workflow 完整的 PR 生命周期——创建分支、提交...
plan              计划模式——检查上下文、编写 markdown...
excalidraw        使用 Excalidraw 创建手绘风格图表...
```

### 搜索技能

```bash
# 按关键词搜索
/skills search docker
/skills search music
```

### 技能 Hub

官方可选技能（较重或小众、默认不启用）可通过 Hub 获取：

```bash
# 浏览官方可选技能
/skills browse

# 在 Hub 中搜索
/skills search blockchain
```

---

## 使用技能

所有已安装的技能都会自动成为斜杠命令，直接输入技能名即可触发：

```bash
# 加载技能并指定任务
/ascii-art Make a banner that says "HELLO WORLD"
/plan Design a REST API for a todo app
/github-pr-workflow Create a PR for the auth refactor

# 只输入技能名（不带任务）则加载技能，再描述需求
/excalidraw
```

你也可以通过自然对话触发技能——告诉 Hermes 使用某个技能，它会通过 `skill_view` 工具自动加载。

### 渐进式加载

技能采用节省 token 的按需加载模式，代理不会一次性加载所有内容：

1. **`skills_list()`** — 所有技能的精简列表（约 3k token），会话启动时加载。
2. **`skill_view(name)`** — 单个技能的完整 SKILL.md 内容，在代理判断需要该技能时加载。
3. **`skill_view(name, file_path)`** — 技能内的特定参考文件，仅在实际需要时按需加载。

这意味着技能在真正被使用之前不消耗任何 token。

---

## 从 Hub 安装

官方可选技能随 Hermes 一同发布，但默认不启用，需显式安装：

```bash
# 安装官方可选技能
hermes skills install official/research/arxiv

# 在聊天会话中从 Hub 安装
/skills install official/creative/songwriting-and-ai-music
```

安装流程：
1. 技能目录被复制到 `~/.hermes/skills/`
2. 出现在 `skills_list` 输出中
3. 可作为斜杠命令使用

:::tip
已安装的技能在新会话中生效。若希望在当前会话中立即使用，可用 `/reset` 重新开始，或在命令中加上 `--now` 立即使提示词缓存失效（下一轮会消耗更多 token）。
:::

### 验证安装

```bash
# 检查是否安装成功
hermes skills list | grep arxiv

# 或在聊天中查询
/skills search arxiv
```

---

## 配置技能参数

部分技能会在其 frontmatter 中声明所需的配置项：

```yaml
metadata:
  hermes:
    config:
      - key: tenor.api_key
        description: "Tenor API key for GIF search"
        prompt: "Enter your Tenor API key"
        url: "https://developers.google.com/tenor/guides/quickstart"
```

首次加载带有配置项的技能时，Hermes 会提示你输入相应值，并将其存储到 `config.yaml` 的 `skills.config.*` 路径下。

通过 CLI 管理技能配置：

```bash
# 为特定技能进行交互式配置
hermes skills config gif-search

# 查看所有技能配置
hermes config get skills.config
```

---

## 创建自定义技能

技能本质上是带有 YAML frontmatter 的 Markdown 文件，创建一个技能不超过五分钟。

### 1. 创建目录

```bash
mkdir -p ~/.hermes/skills/my-category/my-skill
```

### 2. 编写 SKILL.md

```markdown title="~/.hermes/skills/my-category/my-skill/SKILL.md"
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
metadata:
  hermes:
    tags: [my-tag, automation]
    category: my-category
---

# My Skill

## When to Use
Use this skill when the user asks about [specific topic] or needs to [specific task].

## Procedure
1. First, check if [prerequisite] is available
2. Run `command --with-flags`
3. Parse the output and present results

## Pitfalls
- Common failure: [description]. Fix: [solution]
- Watch out for [edge case]

## Verification
Run `check-command` to confirm the result is correct.
```

### 3. 添加参考文件（可选）

技能可以包含代理按需加载的辅助文件：

```
my-skill/
├── SKILL.md                    # 技能主文档
├── references/
│   ├── api-docs.md             # 代理可查阅的 API 参考
│   └── examples.md             # 示例输入/输出
├── templates/
│   └── config.yaml             # 代理可使用的模板文件
└── scripts/
    └── setup.sh                # 代理可执行的脚本
```

在 SKILL.md 中引用这些文件：

```markdown
如需 API 详情，加载参考文件：`skill_view("my-skill", "references/api-docs.md")`
```

### 4. 测试技能

启动新会话并测试：

```bash
hermes chat -q "/my-skill help me with the thing"
```

技能会自动出现，无需注册。将其放入 `~/.hermes/skills/` 即刻生效。

:::info
代理本身也可以通过 `skill_manage` 工具创建和更新技能。在解决复杂问题后，Hermes 可能会主动提议将解决方案保存为技能，供下次使用。
:::

---

## 跨平台技能管理

控制哪些平台可以使用哪些技能：

```bash
hermes skills
```

这会打开一个交互式 TUI，可按平台（CLI、Telegram、Discord 等）单独启用或禁用技能。当你希望某些技能只在特定场景下可用时非常实用——例如，不在 Telegram 中暴露开发类技能。

---

## 技能 vs 记忆

两者都在会话之间持久化，但用途不同：

| | 技能 | 记忆 |
|---|---|---|
| **是什么** | 程序性知识——如何做事 | 事实性知识——事物是什么 |
| **触发时机** | 按需加载，仅在相关时 | 每次会话自动注入 |
| **大小** | 可以很大（数百行） | 应保持精简（仅关键事实） |
| **Token 开销** | 未加载时为零 | 少量但持续的 token 开销 |
| **示例** | "如何部署到 Kubernetes" | "用户偏好深色模式，居住在 PST 时区" |
| **由谁创建** | 用户、代理，或从 Hub 安装 | 代理根据对话内容创建 |

**经验法则：** 如果你会把它写进参考文档，它就是技能；如果你会把它贴在便利贴上，它就是记忆。

---

## 使用建议

**保持技能聚焦。** 试图涵盖"全部 DevOps"的技能会过于冗长且模糊。而专注于"将 Python 应用部署到 Fly.io"的技能才足够具体，真正有用。

**让代理来创建技能。** 完成复杂的多步骤任务后，Hermes 通常会主动提议将解决方案保存为技能，接受它——这些由代理编写的技能会完整记录工作流，包括过程中发现的坑。

**善用分类目录。** 将技能组织到子目录中（`~/.hermes/skills/devops/`、`~/.hermes/skills/research/` 等），这样技能列表更易管理，代理也能更快找到相关技能。

**及时更新过时的技能。** 如果使用某个技能时遇到了它未覆盖的问题，告诉 Hermes 将新学到的内容更新进去。缺乏维护的技能会成为负担。

---

*完整的技能参考——frontmatter 字段、条件激活、外部目录等内容——请参阅[技能系统](/user-guide/features/skills)。*
