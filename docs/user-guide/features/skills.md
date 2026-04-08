---
title: "技能系统"
---
# 技能系统

技能（Skills）是智能体按需加载的知识文档，采用**渐进式展开**（Progressive Disclosure）模式，最大程度减少 token 消耗，并兼容 [agentskills.io](https://agentskills.io/specification) 开放标准。

所有技能存储在 **`~/.hermes/skills/`** 目录中——这是唯一的主目录和权威来源。全新安装时，内置（bundled）技能会从代码仓库复制到此目录。通过技能仓库（Skills Hub）安装的技能和智能体创建的技能也保存在这里。智能体可以修改或删除任意技能。

你也可以让 Hermes Agent 扫描**外部技能目录**——这些是与本地目录并行扫描的额外文件夹。详见下方的[外部技能目录](#外部技能目录)章节。

参见：

- [内置技能目录](https://hermes-agent.nousresearch.com/docs/reference/skills-catalog)
- [官方可选技能目录](https://hermes-agent.nousresearch.com/docs/reference/optional-skills-catalog)

## 使用技能

所有已安装的技能都可以作为斜杠命令（Slash Command）直接使用：

```bash
# 在 CLI 或任意消息平台中：
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor
/plan design a rollout for migrating our auth provider

# 仅输入技能名称，智能体会加载技能并询问你的需求：
/excalidraw
```

内置的 `plan` 技能是一个典型示例，展示了技能驱动型斜杠命令的自定义行为。执行 `/plan [请求]` 时，Hermes Agent 会检查当前上下文（如有需要），生成 Markdown 格式的实现计划（而非直接执行任务），并将结果保存到活动工作区/后端工作目录下的 `.hermes/plans/` 中。

你也可以通过自然对话与技能交互：

```bash
hermes chat --toolsets skills -q "What skills do you have?"
hermes chat --toolsets skills -q "Show me the axolotl skill"
```

## 渐进式展开

技能采用节省 token 的分层加载模式：

```
Level 0: skills_list()           → [{name, description, category}, ...]   (~3k tokens)
Level 1: skill_view(name)        → Full content + metadata       (varies)
Level 2: skill_view(name, path)  → Specific reference file       (varies)
```

智能体只在真正需要时才加载技能的完整内容。

## SKILL.md 格式

```markdown
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
platforms: [macos, linux]     # 可选——限制在特定操作系统平台
metadata:
  hermes:
    tags: [python, automation]
    category: devops
    fallback_for_toolsets: [web]    # 可选——条件激活（见下文）
    requires_toolsets: [terminal]   # 可选——条件激活（见下文）
    config:                          # 可选——config.yaml 配置项
      - key: my.setting
        description: "What this controls"
        default: "value"
        prompt: "Prompt for setup"
---

# Skill Title

## When to Use
Trigger conditions for this skill.

## Procedure
1. Step one
2. Step two

## Pitfalls
- Known failure modes and fixes

## Verification
How to confirm it worked.
```

### 平台专属技能

技能可以通过 `platforms` 字段限制自身只在特定操作系统上运行：

| 值 | 匹配系统 |
|-------|---------|
| `macos` | macOS（Darwin） |
| `linux` | Linux |
| `windows` | Windows |

```yaml
platforms: [macos]            # 仅限 macOS（例如 iMessage、Apple 提醒事项、FindMy）
platforms: [macos, linux]     # macOS 和 Linux
```

设置后，该技能在不兼容的平台上会自动从系统提示词、`skills_list()` 和斜杠命令中隐藏。若未设置，技能在所有平台上均可加载。

### 条件激活（回退技能）

技能可以根据当前会话中可用的工具，自动显示或隐藏自身。回退技能（Fallback Skills）最能体现这一机制的价值——当某个付费工具不可用时，才显示免费或本地替代方案。

```yaml
metadata:
  hermes:
    fallback_for_toolsets: [web]      # 仅当这些工具集不可用时显示
    requires_toolsets: [terminal]     # 仅当这些工具集可用时显示
    fallback_for_tools: [web_search]  # 仅当这些特定工具不可用时显示
    requires_tools: [terminal]        # 仅当这些特定工具可用时显示
```

| 字段 | 行为 |
|-------|----------|
| `fallback_for_toolsets` | 列出的工具集**可用时**隐藏技能；不可用时显示。 |
| `fallback_for_tools` | 同上，但检查的是单个工具而非工具集。 |
| `requires_toolsets` | 列出的工具集**不可用时**隐藏技能；可用时显示。 |
| `requires_tools` | 同上，但检查的是单个工具。 |

**示例：** 内置的 `duckduckgo-search` 技能使用了 `fallback_for_toolsets: [web]`。当你设置了 `FIRECRAWL_API_KEY` 时，web 工具集可用，智能体会使用 `web_search`——DuckDuckGo 技能保持隐藏。若 API key 未配置，web 工具集不可用，DuckDuckGo 技能则自动作为回退出现。

没有任何条件字段的技能行为与之前完全相同——始终显示。

## 加载时的安全配置

技能可以声明所需的环境变量，且声明后技能仍正常出现在发现列表中：

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
    required_for: full functionality
```

当检测到缺失的变量时，Hermes Agent 只会在本地 CLI 中实际加载该技能时，才安全地提示你输入。你可以跳过配置，继续使用该技能。在消息平台上，Hermes Agent 绝不会在聊天中要求你输入密钥——它会提示你在本地通过 `hermes setup` 或 `~/.hermes/.env` 完成配置。

配置完成后，声明的环境变量会**自动传递**给 `execute_code` 和 `terminal` 沙盒（Sandbox）——技能脚本可以直接使用 `$TENOR_API_KEY`。对于非技能的环境变量，请使用 `terminal.env_passthrough` 配置项。详见[环境变量传递](https://hermes-agent.nousresearch.com/docs/user-guide/security#environment-variable-passthrough)。

### 技能配置项

技能还可以声明非密钥类配置项（如路径、偏好设置），存储在 `config.yaml` 中：

```yaml
metadata:
  hermes:
    config:
      - key: wiki.path
        description: Path to the wiki directory
        default: "~/wiki"
        prompt: Wiki directory path
```

配置项存储在 `config.yaml` 的 `skills.config` 节点下。`hermes config migrate` 会提示配置未填写的项，`hermes config show` 可以显示当前配置。技能加载时，已解析的配置值会自动注入上下文，智能体因此能自动获知配置内容。

详见[技能配置项](https://hermes-agent.nousresearch.com/docs/user-guide/configuration#skill-settings)和[创建技能——配置项](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills#config-settings-configyaml)。

## 技能目录结构

```text
~/.hermes/skills/                  # 唯一数据源
├── mlops/                         # 分类目录
│   ├── axolotl/
│   │   ├── SKILL.md               # 主要说明（必需）
│   │   ├── references/            # 参考文档
│   │   ├── templates/             # 输出模板
│   │   ├── scripts/               # 可从技能调用的辅助脚本
│   │   └── assets/                # 补充文件
│   └── vllm/
│       └── SKILL.md
├── devops/
│   └── deploy-k8s/                # 智能体自创技能
│       ├── SKILL.md
│       └── references/
├── .hub/                          # 技能仓库状态
│   ├── lock.json
│   ├── quarantine/
│   └── audit.log
└── .bundled_manifest              # 追踪已植入的内置技能
```

## 外部技能目录

如果你在 Hermes Agent 之外维护技能——例如，多个 AI 工具共用的 `~/.agents/skills/` 目录——你可以让 Hermes Agent 扫描这些目录。

在 `~/.hermes/config.yaml` 的 `skills` 节点下添加 `external_dirs`：

```yaml
skills:
  external_dirs:
    - ~/.agents/skills
    - /home/shared/team-skills
    - ${SKILLS_REPO}/skills
```

路径支持 `~` 扩展和 `${VAR}` 环境变量替换。

### 工作原理

- **只读**：外部目录仅用于技能发现，不可写入。智能体创建或编辑技能时，始终写入 `~/.hermes/skills/`。
- **本地优先**：若本地目录和外部目录中存在同名技能，本地版本优先。
- **完整集成**：外部技能会出现在系统提示词索引、`skills_list`、`skill_view` 和 `/skill-name` 斜杠命令中，与本地技能无异。
- **不存在的路径会被静默跳过**：若配置的目录不存在，Hermes Agent 会直接忽略，不报错。适用于可能在部分机器上不存在的可选共享目录。

### 示例

```text
~/.hermes/skills/               # 本地（主目录，可读写）
├── devops/deploy-k8s/
│   └── SKILL.md
└── mlops/axolotl/
    └── SKILL.md

~/.agents/skills/               # 外部（只读，共享）
├── my-custom-workflow/
│   └── SKILL.md
└── team-conventions/
    └── SKILL.md
```

四个技能都会出现在技能索引中。如果你在本地创建了一个名为 `my-custom-workflow` 的技能，它会覆盖外部版本。

## 智能体管理技能（skill_manage 工具）

智能体可以通过 `skill_manage` 工具创建、更新和删除自己的技能。这是智能体的**程序性记忆**（Procedural Memory）——当它找到某个复杂工作流程的有效方法时，会将其保存为技能以便将来复用。

### 智能体何时创建技能

- 成功完成一项复杂任务（5+ 次工具调用）后
- 遇到错误或死路并找到有效路径后
- 用户纠正了它的处理方式后
- 发现了某个有价值的复杂工作流程后

### 操作

| 操作 | 用途 | 关键参数 |
|--------|---------|------------|
| `create` | 从头创建新技能 | `name`、`content`（完整 SKILL.md）、可选 `category` |
| `patch` | 局部修改（推荐） | `name`、`old_string`、`new_string` |
| `edit` | 大规模结构重写 | `name`、`content`（完整 SKILL.md 替换） |
| `delete` | 删除整个技能 | `name` |
| `write_file` | 添加/更新支持文件 | `name`、`file_path`、`file_content` |
| `remove_file` | 删除支持文件 | `name`、`file_path` |

:::tip
对于更新操作，推荐使用 `patch`——它比 `edit` 更节省 token，因为工具调用中只需包含修改的文本部分。
:::

## 技能仓库

浏览、搜索、安装并管理来自在线注册表、`skills.sh`、知名技能端点（Well-Known Skill Endpoints）以及官方可选技能的技能。

### 常用命令

```bash
hermes skills browse                              # 浏览所有仓库技能（官方优先）
hermes skills browse --source official            # 仅浏览官方可选技能
hermes skills search kubernetes                   # 搜索所有来源
hermes skills search react --source skills-sh     # 在 skills.sh 目录中搜索
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect openai/skills/k8s           # 安装前预览
hermes skills install openai/skills/k8s           # 安全扫描后安装
hermes skills install official/security/1password
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills list --source hub                   # 列出通过仓库安装的技能
hermes skills check                               # 检查已安装的仓库技能是否有上游更新
hermes skills update                              # 有更新时重新安装仓库技能
hermes skills audit                               # 对所有仓库技能重新进行安全扫描
hermes skills uninstall k8s                       # 卸载仓库技能
hermes skills publish skills/my-skill --to github --repo owner/repo
hermes skills snapshot export setup.json          # 导出技能配置
hermes skills tap add myorg/skills-repo           # 添加自定义 GitHub 源（tap）
```

### 支持的仓库来源

| 来源 | 示例 | 说明 |
|--------|---------|-------|
| `official` | `official/security/1password` | Hermes Agent 随附的可选技能。 |
| `skills-sh` | `skills-sh/vercel-labs/agent-skills/vercel-react-best-practices` | 可通过 `hermes skills search --source skills-sh` 搜索。Hermes Agent 在 skills.sh 别名与仓库文件夹名称不一致时自动解析。 |
| `well-known` | `well-known:https://mintlify.com/docs/.well-known/skills/mintlify` | 直接从网站的 `/.well-known/skills/index.json` 提供的技能。可用站点或文档 URL 搜索。 |
| `github` | `openai/skills/k8s` | 直接从 GitHub 仓库/路径安装，支持自定义源（tap）。 |
| `clawhub`、`lobehub`、`claude-marketplace` | 各来源特定标识符 | 社区或市场集成。 |

### 集成的仓库与注册表

Hermes Agent 目前集成了以下技能生态系统和发现来源：

#### 1. 官方可选技能（`official`）

这些技能由 Hermes 代码仓库维护，安装时享有内置信任。

- 目录：[官方可选技能目录](/reference/optional-skills-catalog)
- 仓库路径：`optional-skills/`
- 示例：

```bash
hermes skills browse --source official
hermes skills install official/security/1password
```

#### 2. skills.sh（`skills-sh`）

Vercel 的公共技能目录。Hermes Agent 可以直接搜索、查看技能详情页、解析别名式 slug，并从底层源仓库安装。

- 目录：[skills.sh](https://skills.sh/)
- CLI/工具仓库：[vercel-labs/skills](https://github.com/vercel-labs/skills)
- Vercel 官方技能仓库：[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- 示例：

```bash
hermes skills search react --source skills-sh
hermes skills inspect skills-sh/vercel-labs/json-render/json-render-react
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
```

#### 3. 知名端点（`well-known`）

这是一种基于 URL 的发现机制，适用于发布了 `/.well-known/skills/index.json` 的站点。它不是单一的中央仓库，而是一种 Web 发现规范。

- 示例端点：[Mintlify 文档技能索引](https://mintlify.com/docs/.well-known/skills/index.json)
- 参考服务端实现：[vercel-labs/skills-handler](https://github.com/vercel-labs/skills-handler)
- 示例：

```bash
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
```

#### 4. 直接 GitHub 技能（`github`）

Hermes Agent 可直接从 GitHub 仓库安装技能，也支持基于 GitHub 的自定义源（tap）。当你已知仓库路径，或想添加自定义源仓库时，这种方式非常实用。

默认 tap（无需配置即可浏览）：
- [openai/skills](https://github.com/openai/skills)
- [anthropics/skills](https://github.com/anthropics/skills)
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [garrytan/gstack](https://github.com/garrytan/gstack)

示例：

```bash
hermes skills install openai/skills/k8s
hermes skills tap add myorg/skills-repo
```

#### 5. ClawHub（`clawhub`）

作为社区来源集成的第三方技能市场。

- 站点：[clawhub.ai](https://clawhub.ai/)
- Hermes 来源 ID：`clawhub`

#### 6. Claude 市场风格仓库（`claude-marketplace`）

Hermes Agent 支持发布了 Claude 兼容插件/市场清单的仓库。

已知集成来源包括：
- [anthropics/skills](https://github.com/anthropics/skills)
- [aiskillstore/marketplace](https://github.com/aiskillstore/marketplace)

Hermes 来源 ID：`claude-marketplace`

#### 7. LobeHub（`lobehub`）

Hermes Agent 可以搜索 LobeHub 公共目录中的智能体条目，并将其转换为可安装的 Hermes 技能。

- 站点：[LobeHub](https://lobehub.com/)
- 公共智能体索引：[chat-agents.lobehub.com](https://chat-agents.lobehub.com/)
- 底层仓库：[lobehub/lobe-chat-agents](https://github.com/lobehub/lobe-chat-agents)
- Hermes 来源 ID：`lobehub`

### 安全扫描与 `--force`

所有通过仓库安装的技能都会经过**安全扫描器**检查，内容涵盖数据窃取、提示词注入、破坏性命令、供应链风险及其他威胁。

`hermes skills inspect ...` 现在也会显示上游元数据（如有）：
- 仓库 URL
- skills.sh 详情页 URL
- 安装命令
- 每周安装量
- 上游安全审计状态
- 知名端点索引/URL

当你已审查某个第三方技能，并希望覆盖非危险性策略拦截时，可使用 `--force`：

```bash
hermes skills install skills-sh/anthropics/skills/pdf --force
```

重要行为说明：
- `--force` 可覆盖谨慎/警告级别扫描结果的策略拦截。
- `--force` **不能**覆盖 `dangerous`（危险）级别的扫描结论。
- 官方可选技能（`official/...`）享有内置信任，不显示第三方警告面板。

### 信任级别

| 级别 | 来源 | 策略 |
|-------|--------|--------|
| `builtin` | 随 Hermes Agent 发布 | 始终信任 |
| `official` | 仓库中的 `optional-skills/` | 内置信任，无第三方警告 |
| `trusted` | 可信注册表/仓库，如 `openai/skills`、`anthropics/skills` | 比社区来源更宽松的策略 |
| `community` | 其他所有来源（`skills.sh`、well-known 端点、自定义 GitHub 仓库、大多数市场） | 非危险性发现可通过 `--force` 覆盖；`dangerous` 结论保持拦截 |

### 更新生命周期

仓库现在会追踪足够的来源信息，以便重新检查已安装技能的上游副本：

```bash
hermes skills check          # 报告哪些已安装的仓库技能在上游有变更
hermes skills update         # 仅重新安装有可用更新的技能
hermes skills update react   # 更新某个特定的已安装仓库技能
```

系统通过比对存储的来源标识符与上游包内容的当前哈希值，来发现版本差异。

### 聊天内斜杠命令

所有命令同样支持 `/skills` 形式：

```text
/skills browse
/skills search react --source skills-sh
/skills search https://mintlify.com/docs --source well-known
/skills inspect skills-sh/vercel-labs/json-render/json-render-react
/skills install openai/skills/skill-creator --force
/skills check
/skills update
/skills list
```

官方可选技能仍使用 `official/security/1password`、`official/migration/openclaw-migration` 等标识符。
