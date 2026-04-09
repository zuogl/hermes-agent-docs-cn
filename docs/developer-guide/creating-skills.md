---
title: "创建 Skill"
---
# 创建 Skill

Skill 是为 Hermes Agent 添加新能力的首选方式。它们比工具（tool）更容易创建，无需修改 agent 代码，且可以与社区分享。

## 应该创建 Skill 还是 Tool？

选择创建 **Skill** 的情况：
- 该能力可以通过指令 + shell 命令 + 现有工具来实现
- 它封装了 agent 可以通过 `terminal` 或 `web_extract` 调用的外部 CLI 或 API
- 不需要在 agent 中内置自定义 Python 集成或 API 密钥管理
- 示例：arXiv 搜索、git 工作流、Docker 管理、PDF 处理、通过 CLI 工具发送邮件

选择创建 **Tool** 的情况：
- 需要与 API 密钥、认证流程或多组件配置进行端到端集成
- 需要每次都精确执行的自定义处理逻辑
- 处理二进制数据、流式传输或实时事件
- 示例：浏览器自动化、TTS、视觉分析

## Skill 目录结构

内置 skill 存放在 `skills/` 目录下，按类别组织。官方可选 skill 在 `optional-skills/` 中使用相同结构：

```text
skills/
├── research/
│   └── arxiv/
│       ├── SKILL.md              # 必须：主要指令文件
│       └── scripts/              # 可选：辅助脚本
│           └── search_arxiv.py
├── productivity/
│   └── ocr-and-documents/
│       ├── SKILL.md
│       ├── scripts/
│       └── references/
└── ...
```

## SKILL.md 格式

```markdown
---
name: my-skill
description: 简要描述（显示在 skill 搜索结果中）
version: 1.0.0
author: 你的名字
license: MIT
platforms: [macos, linux]          # 可选 — 限制为特定操作系统平台
                                   #   有效值：macos, linux, windows
                                   #   省略则在所有平台加载（默认）
metadata:
  hermes:
    tags: [Category, Subcategory, Keywords]
    related_skills: [other-skill-name]
    requires_toolsets: [web]            # 可选 — 仅在这些 toolset 激活时显示
    requires_tools: [web_search]        # 可选 — 仅在这些工具可用时显示
    fallback_for_toolsets: [browser]    # 可选 — 当这些 toolset 激活时隐藏
    fallback_for_tools: [browser_navigate]  # 可选 — 当这些工具存在时隐藏
    config:                              # 可选 — skill 所需的 config.yaml 设置
      - key: my.setting
        description: "该设置控制的内容"
        default: "合理的默认值"
        prompt: "设置向导中显示的提示"
required_environment_variables:          # 可选 — skill 所需的环境变量
  - name: MY_API_KEY
    prompt: "请输入你的 API 密钥"
    help: "在 https://example.com 获取"
    required_for: "API 访问"
---

# Skill 标题

简短介绍。

## 使用场景
触发条件 — agent 应在何时加载此 skill？

## 快速参考
常用命令或 API 调用的对照表。

## 操作步骤
agent 遵循的分步指令。

## 注意事项
已知的失败模式及处理方法。

## 验证
agent 如何确认操作成功。
```

### 平台专属 Skill

Skill 可以使用 `platforms` 字段将自身限制在特定操作系统上：

```yaml
platforms: [macos]            # 仅限 macOS（例如 iMessage、Apple 提醒事项）
platforms: [macos, linux]     # macOS 和 Linux
platforms: [windows]          # 仅限 Windows
```

设置后，该 skill 会在不兼容的平台上自动从系统提示词、`skills_list()` 和斜杠命令中隐藏。若省略或留空，则在所有平台加载（向后兼容）。

### 条件激活 Skill

Skill 可以声明对特定工具或 toolset 的依赖，从而控制该 skill 是否出现在当前 session 的系统提示词中。

```yaml
metadata:
  hermes:
    requires_toolsets: [web]           # 如果 web toolset 未激活则隐藏
    requires_tools: [web_search]       # 如果 web_search 工具不可用则隐藏
    fallback_for_toolsets: [browser]   # 如果 browser toolset 已激活则隐藏
    fallback_for_tools: [browser_navigate]  # 如果 browser_navigate 可用则隐藏
```

| 字段 | 行为 |
|------|------|
| `requires_toolsets` | 当任意列出的 toolset **不可用**时，skill **隐藏** |
| `requires_tools` | 当任意列出的工具**不可用**时，skill **隐藏** |
| `fallback_for_toolsets` | 当任意列出的 toolset **可用**时，skill **隐藏** |
| `fallback_for_tools` | 当任意列出的工具**可用**时，skill **隐藏** |

**`fallback_for_*` 的使用场景：** 创建一个在主要工具不可用时作为替代方案的 skill。例如，设置了 `fallback_for_tools: [web_search]` 的 `duckduckgo-search` skill，仅在未配置 API 密钥的 web 搜索工具不可用时才显示。

**`requires_*` 的使用场景：** 创建只有在特定工具存在时才有意义的 skill。例如，设置了 `requires_toolsets: [web]` 的网页抓取工作流 skill，在 web 工具被禁用时不会出现在提示词中。

### 环境变量需求声明

Skill 可以声明所需的环境变量。当通过 `skill_view` 加载 skill 时，其声明的必需环境变量会自动注册，以便透传到沙箱执行环境（terminal、execute_code）。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: "Tenor API 密钥"               # 提示用户时显示
    help: "在 https://tenor.com 获取密钥"  # 帮助文字或 URL
    required_for: "GIF 搜索功能"           # 说明哪个功能需要此变量
```

每个条目支持：
- `name`（必填）— 环境变量名称
- `prompt`（可选）— 向用户询问值时的提示文字
- `help`（可选）— 获取该值的帮助文字或 URL
- `required_for`（可选）— 描述哪个功能需要此变量

用户也可以在 `config.yaml` 中手动配置透传变量：

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_VAR
    - ANOTHER_VAR
```

macOS 专属 skill 示例请参见 `skills/apple/`。

## 加载时安全设置

当 skill 需要 API 密钥或 token 时，请使用 `required_environment_variables`。缺少值**不会**让 skill 从发现列表中隐藏。Hermes 会在本地 CLI 加载 skill 时安全地提示用户输入。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API 密钥
    help: 从 https://developers.google.com/tenor 获取密钥
    required_for: 完整功能
```

用户可以跳过设置并继续加载 skill。Hermes 不会向模型暴露原始密钥值。Gateway 和消息 session 会显示本地设置指引，而不是在通信过程中收集密钥。

:::tip
沙箱透传
当 skill 加载时，所有已设置的 `required_environment_variables` 声明变量都会**自动透传**到 `execute_code` 和 `terminal` 沙箱——包括 Docker 和 Modal 等远程后端。Skill 的脚本可以直接访问 `$TENOR_API_KEY`（或 Python 中的 `os.environ["TENOR_API_KEY"]`），无需用户额外配置任何内容。详见 [环境变量透传](https://hermes-agent.nousresearch.com/docs/user-guide/security#environment-variable-passthrough)。
:::

旧版 `prerequisites.env_vars` 作为向后兼容的别名仍受支持。

### 配置项设置（config.yaml）

Skill 可以声明非敏感配置项，这些配置项存储在 `config.yaml` 的 `skills.config` 命名空间下。与存储在 `.env` 中的密钥型环境变量不同，config 配置项用于存储路径、偏好设置及其他非敏感值。

```yaml
metadata:
  hermes:
    config:
      - key: wiki.path
        description: LLM Wiki 知识库目录路径
        default: "~/wiki"
        prompt: Wiki 目录路径
      - key: wiki.domain
        description: Wiki 所涵盖的领域
        default: ""
        prompt: Wiki 领域（例如 AI/ML 研究）
```

每个条目支持：
- `key`（必填）— 设置的点路径（例如 `wiki.path`）
- `description`（必填）— 说明该设置的用途
- `default`（可选）— 用户未配置时的默认值
- `prompt`（可选）— 执行 `hermes config migrate` 时显示的提示文字；若未填写则回退为 `description`

**工作原理：**

1. **存储：** 值被写入 `config.yaml` 的 `skills.config.` 下：
   ```yaml
   skills:
     config:
       wiki:
         path: ~/my-research
   ```

2. **发现：** `hermes config migrate` 会扫描所有已启用的 skill，找出未配置的设置，并提示用户输入。设置也会在 `hermes config show` 的"Skill 设置"下显示。

3. **运行时注入：** skill 加载时，其配置值会被解析并附加到 skill 消息中：
   ```
   [Skill config (from ~/.hermes/config.yaml):
     wiki.path = /home/user/my-research
   ]
   ```
   agent 可以看到已配置的值，无需自行读取 `config.yaml`。

4. **手动设置：** 用户也可以直接设置值：
   ```bash
   hermes config set skills.config.wiki.path ~/my-wiki
   ```

:::tip
如何选择
使用 `required_environment_variables` 存储 API 密钥、token 等**密钥**（存储在 `~/.hermes/.env`，不会暴露给模型）。使用 `config` 存储**路径、偏好设置及非敏感配置**（存储在 `config.yaml`，可在 config show 中查看）。
:::

### 凭证文件需求（OAuth token 等）

使用 OAuth 或基于文件的凭证的 skill，可以声明需要挂载到远程沙箱中的文件。适用于以**文件**形式存储的凭证（而非环境变量）——通常是设置脚本生成的 OAuth token 文件。

```yaml
required_credential_files:
  - path: google_token.json
    description: Google OAuth2 token（由设置脚本创建）
  - path: google_client_secret.json
    description: Google OAuth2 客户端凭证
```

每个条目支持：
- `path`（必填）— 相对于 `~/.hermes/` 的文件路径
- `description`（可选）— 说明文件的用途及创建方式

加载时，Hermes 会检查这些文件是否存在。缺少文件会触发 `setup_needed`。已存在的文件会自动：
- **挂载到 Docker** 容器中（只读绑定挂载）
- **同步到 Modal** 沙箱（创建时及每次命令执行前同步，因此 session 中途的 OAuth 也能正常工作）
- 在**本地**后端无需任何特殊处理即可访问

:::tip
如何选择
使用 `required_environment_variables` 存储简单的 API 密钥和 token（字符串，存储在 `~/.hermes/.env`）。使用 `required_credential_files` 存储 OAuth token 文件、客户端密钥、服务账号 JSON、证书，或任何以磁盘文件形式存在的凭证。
:::

完整示例（同时使用两者）请参见 `skills/productivity/google-workspace/SKILL.md`。

## Skill 编写指南

### 无外部依赖

优先使用标准库 Python、curl 和现有 Hermes 工具（`web_extract`、`terminal`、`read_file`）。如确实需要依赖，请在 skill 中说明安装步骤。

### 渐进式披露

将最常见的工作流放在最前面。边缘情况和高级用法放在末尾。这样可以在处理常见任务时降低 token 消耗。

### 包含辅助脚本

对于 XML/JSON 解析或复杂逻辑，请在 `scripts/` 中包含辅助脚本——不要每次都期望 LLM 内联编写解析器。

### 测试

运行 skill 并验证 agent 是否正确遵循指令：

```bash
hermes chat --toolsets skills -q "Use the X skill to do Y"
```

## Skill 应该放在哪里？

内置 skill（位于 `skills/`）随每次 Hermes 安装一起发布，应该对**大多数用户普遍有用**：

- 文档处理、网页研究、常见开发工作流、系统管理
- 被广泛人群定期使用

如果你的 skill 是官方的、有用的，但并非所有人都需要（例如付费服务集成、重量级依赖），请放入 **`optional-skills/`**——它随仓库一起发布，可通过 `hermes skills browse` 发现（标注为"official"），并以内置信任级别安装。

如果你的 skill 比较专业、由社区贡献或面向特定场景，更适合放到 **Skills Hub**——将其上传到注册表，并通过 `hermes skills install` 分享。

## 发布 Skill

### 发布到 Skills Hub

```bash
hermes skills publish skills/my-skill --to github --repo owner/repo
```

### 发布到自定义仓库

将你的仓库添加为 tap：

```bash
hermes skills tap add owner/repo
```

用户可以从你的仓库中搜索和安装 skill。

## 安全扫描

所有从 hub 安装的 skill 都会经过安全扫描，检查以下内容：

- 数据泄露模式
- 提示注入尝试
- 破坏性命令
- Shell 注入

信任级别：
- `builtin` — 随 Hermes 一起发布（始终受信任）
- `official` — 来自仓库中的 `optional-skills/`（内置信任，无第三方警告）
- `trusted` — 来自 openai/skills、anthropics/skills
- `community` — 非危险发现可通过 `--force` 覆盖；`dangerous` 判定仍会被阻止

Hermes 现在可以从多种外部发现模型中使用第三方 skill：
- 直接 GitHub 标识符（例如 `openai/skills/k8s`）
- `skills.sh` 标识符（例如 `skills-sh/vercel-labs/json-render/json-render-react`）
- 从 `/.well-known/skills/index.json` 提供的知名端点

如果你希望 skill 在不依赖 GitHub 特定安装程序的情况下也能被发现，可以考虑通过知名端点提供服务，同时在仓库或市场中发布。
