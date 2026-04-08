---
title: "配置"
---
# 配置

所有配置都保存在 `~/.hermes/` 目录下，便于统一查看和管理。

## 目录结构

```text
~/.hermes/
├── config.yaml     # 设置（模型、终端、TTS、压缩等）
├── .env            # API 密钥与机密信息
├── auth.json       # OAuth 提供商凭据（Nous Portal 等）
├── SOUL.md         # 智能体主身份（system prompt 的第 1 槽位）
├── memories/       # 持久记忆（MEMORY.md、USER.md）
├── skills/         # 智能体创建的技能（通过 skill_manage 工具管理）
├── cron/           # 定时任务
├── sessions/       # Gateway 会话
└── logs/           # 日志（errors.log、gateway.log，机密会自动脱敏）
```

## 管理配置

```bash
hermes config              # 查看当前配置
hermes config edit         # 在编辑器中打开 config.yaml
hermes config set KEY VAL  # 设置指定值
hermes config check        # 检查缺失的选项（更新后常用）
hermes config migrate      # 交互式补齐缺失选项

# 示例：
hermes config set model anthropic/claude-opus-4
hermes config set terminal.backend docker
hermes config set OPENROUTER_API_KEY sk-or-...  # 写入 .env
```

:::tip
`hermes config set` 会自动把值写入正确的文件：API key 进入 `.env`，其他内容进入 `config.yaml`。
:::

## 配置优先级

配置按以下顺序解析，越靠前优先级越高：

1. **CLI 参数**：例如 `hermes chat --model anthropic/claude-sonnet-4`，只对本次调用生效
2. **`~/.hermes/config.yaml`**：所有非机密配置的主文件
3. **`~/.hermes/.env`**：环境变量回退来源；对机密（API key、token、密码）来说是**必须**位置
4. **内置默认值**：当用户未设置任何值时使用的安全默认配置

:::info
经验法则
机密信息（API key、机器人 token、密码）放进 `.env`。其他内容（模型、终端后端、压缩设置、记忆限制、工具集）放进 `config.yaml`。若同一非机密配置两边都设置了，以 `config.yaml` 为准。
:::

## 环境变量替换

你可以在 `config.yaml` 中通过 `${VAR_NAME}` 语法引用环境变量：

```yaml
auxiliary:
  vision:
    api_key: ${GOOGLE_API_KEY}
    base_url: ${CUSTOM_VISION_URL}

delegation:
  api_key: ${DELEGATION_KEY}
```

单个值中可以出现多个引用，例如：`url: "${HOST}:${PORT}"`。如果某个变量不存在，占位符会原样保留（例如 `${UNDEFINED_VAR}` 不会展开）。只支持 `${VAR}` 这种语法，裸写的 `$VAR` 不会展开。

关于 AI 提供商配置（OpenRouter、Anthropic、Copilot、自定义端点、自托管 LLM、备用模型等），请参见 [AI Providers](https://hermes-agent.nousresearch.com/docs/integrations/providers)。

## 终端后端配置

Hermes 支持六种终端后端，用来决定智能体的 shell 命令实际在哪里运行：本机、Docker 容器、SSH 远程主机、Modal 云沙盒、Daytona 工作区，或 Singularity / Apptainer 容器。

```yaml
terminal:
  backend: local    # local | docker | ssh | modal | daytona | singularity
  cwd: "."          # 工作目录（local 中 "." 表示当前目录，容器中默认是 "/root"）
  timeout: 180      # 单条命令超时秒数
  env_passthrough: []  # 透传给沙盒执行的环境变量名（terminal + execute_code）
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  modal_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  daytona_image: "nikolaik/python-nodejs:python3.11-nodejs20"
```

对于 Modal、Daytona 这类云沙盒，`container_persistent: true` 表示 Hermes 会尽量保留沙盒重建前的文件系统状态，但这**不保证**仍是同一个活跃沙盒、同一个 PID 空间，或原先的后台进程仍在运行。

### 后端概览

| 后端 | 命令运行位置 | 隔离级别 | 适用场景 |
|------|--------------|----------|----------|
| **local** | 直接在你的机器上运行 | 无 | 开发、本地个人使用 |
| **docker** | Docker 容器 | 完整（namespace、cap-drop） | 安全沙盒、CI/CD |
| **ssh** | 通过 SSH 连接的远程服务器 | 网络边界 | 远程开发、强算力主机 |
| **modal** | Modal 云沙盒 | 完整（云 VM） | 一次性云算力、评测 |
| **daytona** | Daytona 工作区 | 完整（云容器） | 托管开发环境 |
| **singularity** | Singularity / Apptainer 容器 | namespace 隔离（`--containall`） | HPC 集群、共享机器 |

### Local 后端

默认后端。命令直接在你的机器上执行，不做任何隔离，也不需要额外安装。

```yaml
terminal:
  backend: local
```

:::caution
智能体拥有与你的用户账号相同的文件系统访问权限。若你不希望暴露这些能力，可使用 `hermes tools` 禁用相应工具，或改用 Docker 获得沙盒隔离。
:::

### Docker 后端

命令在 Docker 容器中执行，并启用安全加固：丢弃 capability、禁止提权、限制 PID 数量。

```yaml
terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_mount_cwd_to_workspace: false  # 将启动目录挂载到 /workspace
  docker_forward_env:                   # 透传到容器中的环境变量
    - "GITHUB_TOKEN"
  docker_volumes:                      # 主机目录挂载
    - "/home/user/projects:/workspace/projects"
    - "/home/user/data:/data:ro"       # :ro 表示只读

  # 资源限制
  container_cpu: 1
  container_memory: 5120
  container_disk: 51200
  container_persistent: true
```

**要求：** 已安装并启动 Docker Desktop 或 Docker Engine。Hermes 会在 `$PATH` 以及常见 macOS 安装路径中查找 Docker。

**容器生命周期：** 每个会话会先启动一个长寿命容器（如 `docker run -d ... sleep 2h`），后续命令通过 `docker exec` 在登录 shell 中运行。清理时会停止并删除容器。

**安全加固：**

- `--cap-drop ALL`，仅补回 `DAC_OVERRIDE`、`CHOWN`、`FOWNER`
- `--security-opt no-new-privileges`
- `--pids-limit 256`
- 为 `/tmp`、`/var/tmp`、`/run` 使用限额 tmpfs

**凭据转发：** `docker_forward_env` 中列出的变量会优先从当前 shell 环境读取；若未命中，再回退到 `~/.hermes/.env`。技能声明的 `required_environment_variables` 也会自动并入。

### SSH 后端

通过 SSH 在远程主机上执行命令。使用 ControlMaster 复用连接，空闲保活 5 分钟。默认启用持久 shell，因此工作目录、环境变量等状态可跨命令保留。

```yaml
terminal:
  backend: ssh
  persistent_shell: true
```

**必需环境变量：**

```bash
TERMINAL_SSH_HOST=my-server.example.com
TERMINAL_SSH_USER=ubuntu
```

**可选项：**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TERMINAL_SSH_PORT` | `22` | SSH 端口 |
| `TERMINAL_SSH_KEY` | 系统默认值 | SSH 私钥路径 |
| `TERMINAL_SSH_PERSISTENT` | `true` | 是否启用持久 shell |

**工作方式：** 初始化时使用 `BatchMode=yes` 与 `StrictHostKeyChecking=accept-new` 建立连接。持久 shell 会在远端保留一个 `bash -l` 进程，通过临时文件与本地通信。需要 `stdin_data` 或 `sudo` 的命令会自动回退到一次性执行模式。

### Modal 后端

在 [Modal](https://modal.com) 云沙盒中执行命令。每个任务都拥有独立 VM，可配置 CPU、内存和磁盘，还可在会话之间快照 / 恢复文件系统。

```yaml
terminal:
  backend: modal
  container_cpu: 1
  container_memory: 5120
  container_disk: 51200
  container_persistent: true
```

**要求：** 需要 `MODAL_TOKEN_ID` 和 `MODAL_TOKEN_SECRET` 环境变量，或 `~/.modal.toml` 配置文件。

**持久化：** 启用后，清理时会快照文件系统，并在下次会话恢复。快照记录保存在 `~/.hermes/modal_snapshots.json`。这只保留文件系统状态，不保留进程、PID 空间或后台任务。

**凭据文件：** `~/.hermes/` 下的 OAuth token 等文件会自动挂载，并在每次命令前同步。

### Daytona 后端

在 [Daytona](https://daytona.io) 托管工作区中执行命令，支持停止 / 恢复来保留状态。

```yaml
terminal:
  backend: daytona
  container_cpu: 1
  container_memory: 5120
  container_disk: 10240
  container_persistent: true
```

**要求：** 设置 `DAYTONA_API_KEY`。

**持久化：** 启用后，沙盒在清理时会停止而不是删除，下次会话会被恢复。沙盒名称形如 `hermes-{task_id}`。

**磁盘上限：** Daytona 最多支持 10 GiB 磁盘，因此更高请求会被自动截断并给出警告。

### Singularity / Apptainer 后端

在 [Singularity / Apptainer](https://apptainer.org) 容器中执行命令，适合没有 Docker 的 HPC 集群或共享机器。

```yaml
terminal:
  backend: singularity
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  container_cpu: 1
  container_memory: 5120
  container_persistent: true
```

**要求：** 系统中存在 `apptainer` 或 `singularity` 可执行文件。

**镜像处理：** `docker://...` 形式的镜像 URL 会自动转换为 SIF 文件并缓存。已有 `.sif` 文件会直接使用。

**暂存目录：** 解析顺序为：`TERMINAL_SCRATCH_DIR` → `TERMINAL_SANDBOX_DIR/singularity` → `/scratch/$USER/hermes-agent` → `~/.hermes/sandboxes/singularity`。

**隔离方式：** 使用 `--containall --no-home`，在不挂载宿主机 home 目录的前提下提供完整 namespace 隔离。

### 终端后端常见问题

如果终端命令立刻失败，或 `terminal` 工具显示被禁用，可按下面方向排查：

- **Local**：不需要额外依赖，是最安全的起步选择。
- **Docker**：先执行 `docker version` 验证 Docker 是否可用。若失败，修复 Docker，或执行 `hermes config set terminal.backend local`。
- **SSH**：`TERMINAL_SSH_HOST` 和 `TERMINAL_SSH_USER` 都必须设置。缺失时 Hermes 会记录明确错误。
- **Modal**：需要 `MODAL_TOKEN_ID` 或 `~/.modal.toml`。可运行 `hermes doctor` 检查。
- **Daytona**：需要 `DAYTONA_API_KEY`。服务端 URL 配置由 Daytona SDK 处理。
- **Singularity**：需要 `apptainer` 或 `singularity` 在 `$PATH` 中，常见于 HPC 环境。

如果不确定哪里出了问题，先把 `terminal.backend` 切回 `local`，确认命令至少能在本地正常执行。

### Docker 卷挂载

使用 Docker 后端时，可通过 `docker_volumes` 把主机目录共享给容器。每一项都采用标准 Docker `-v` 语法：`host_path:container_path[:options]`。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/projects:/workspace/projects"
    - "/home/user/datasets:/data:ro"
    - "/home/user/outputs:/outputs"
```

这种方式适合：

- **向智能体提供文件**：数据集、配置、参考代码
- **从智能体接收输出**：生成的代码、报告、导出文件
- **共享工作区**：你与智能体同时访问同一批文件

也可以通过环境变量设置：`TERMINAL_DOCKER_VOLUMES='["/host:/container"]'`。

### Docker 凭据转发

默认情况下，Docker 终端会话不会继承宿主机的任意凭据。如果你确实需要把某个 token 传入容器，请把它加入 `terminal.docker_forward_env`：

```yaml
terminal:
  backend: docker
  docker_forward_env:
    - "GITHUB_TOKEN"
    - "NPM_TOKEN"
```

Hermes 会优先从当前 shell 读取这些变量；如果没找到，再回退到通过 `hermes config set` 存进 `~/.hermes/.env` 的值。

:::caution
`docker_forward_env` 中列出的变量会对容器中的命令可见。只有当你愿意让当前终端会话访问这些凭据时，才应进行转发。
:::

### 可选：把启动目录挂载到 `/workspace`

Docker 沙盒默认是隔离的。除非你显式启用，否则 Hermes **不会**把当前宿主机工作目录带进容器。

在 `config.yaml` 中启用：

```yaml
terminal:
  backend: docker
  docker_mount_cwd_to_workspace: true
```

启用后：

- 如果你在 `~/projects/my-app` 目录启动 Hermes，这个目录会被 bind mount 到容器中的 `/workspace`
- Docker 后端会从 `/workspace` 启动
- 文件工具与终端命令都会看到同一份已挂载项目

关闭时，`/workspace` 仍归容器自身所有，除非你通过 `docker_volumes` 另行挂载。

安全权衡：

- `false`：保留沙盒边界
- `true`：允许沙盒直接访问你启动 Hermes 时所在的目录

只有在你明确希望容器操作宿主机实时文件时才建议开启。

### 持久 shell

默认情况下，每条终端命令都在独立子进程里运行，因此工作目录、环境变量和 shell 变量不会跨命令保留。启用**持久 shell** 后，Hermes 会在多次 `execute()` 调用之间维持一个长寿命 bash 进程，状态也会跟着保留下来。

这对 **SSH 后端** 尤其有价值，因为还能消除每条命令都重新建立连接的开销。SSH 默认启用持久 shell，本地后端默认关闭。

```yaml
terminal:
  persistent_shell: true
```

关闭方式：

```bash
hermes config set terminal.persistent_shell false
```

**会被保留的状态：**

- 工作目录（例如 `cd /tmp`）
- 已导出的环境变量（例如 `export FOO=bar`）
- shell 变量（例如 `MY_VAR=hello`）

**优先级：**

| 层级 | 变量 | 默认值 |
|------|------|--------|
| 配置 | `terminal.persistent_shell` | `true` |
| SSH 覆盖 | `TERMINAL_SSH_PERSISTENT` | 跟随配置 |
| Local 覆盖 | `TERMINAL_LOCAL_PERSISTENT` | `false` |

按后端的环境变量覆盖优先级最高。如果你也希望在本地后端启用持久 shell：

```bash
export TERMINAL_LOCAL_PERSISTENT=true
```

:::note
对于需要 `stdin_data` 或 `sudo` 的命令，Hermes 会自动回退到一次性执行模式，因为持久 shell 的 stdin 已被内部通信协议占用。
:::

关于每种后端的详细行为，可参见 [Code Execution](/user-guide/features/code-execution) 和 [Tools 文档中的 Terminal 章节](/user-guide/features/tools)。

## 技能设置

技能可以在其 `SKILL.md` frontmatter 中声明自己的配置项。这些是非机密值（例如路径、偏好或业务域设置），会保存在 `config.yaml` 的 `skills.config` 命名空间下。

```yaml
skills:
  config:
    wiki:
      path: ~/wiki
```

**技能配置的工作方式：**

- `hermes config migrate` 会扫描所有启用的技能，找出尚未配置的项并提示你填写
- `hermes config show` 会在 “Skill Settings” 区域展示所有技能配置
- 技能加载时，解析后的配置值会自动注入技能上下文

**手动设置：**

```bash
hermes config set skills.config.wiki.path ~/my-research-wiki
```

关于如何在你自己的技能里声明配置项，请参见 [Creating Skills — Config Settings](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills#config-settings-configyaml)。

## 记忆配置

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200
  user_char_limit: 1375
```

## 文件读取安全

`file_read_max_chars` 用来限制单次 `read_file` 调用最多返回多少字符。若请求内容超限，工具会报错，并要求智能体改用 `offset` 与 `limit` 读取更小范围，避免一次性把大文件或压缩后的 JS bundle 全塞进上下文窗口。

```yaml
file_read_max_chars: 100000  # 默认值，约等于 25K-35K token
```

如果你使用超大上下文模型，且经常需要读大文件，可以适当调高；若使用小上下文模型，则可以调低以减少浪费：

```yaml
# 大上下文模型（200K+）
file_read_max_chars: 200000

# 小型本地模型（16K 上下文）
file_read_max_chars: 30000
```

Hermes 还会自动对文件读取做去重：如果同一文件区域被重复读取且文件没有变化，系统只会返回轻量占位，而不会再次发送完整内容。发生上下文压缩后，这个去重缓存会重置，智能体可以重新读取先前已被摘要掉的内容。

## Git 工作树隔离

如果你想在同一个仓库中并行运行多个智能体，可以启用隔离的 git 工作树：

```yaml
worktree: true    # 始终创建工作树（等同于 hermes -w）
# worktree: false # 默认，仅在传入 -w 时启用
```

启用后，每个 CLI 会话都会在 `.worktrees/` 下创建一个新的工作树，并拥有独立分支。多个智能体可以同时编辑、提交、推送和创建 PR，而不会互相踩踏。干净的工作树会在退出时自动删除；脏工作树会被保留，便于人工恢复。

你还可以在仓库根目录通过 `.worktreeinclude` 指定要一并复制进工作树的 gitignored 文件：

```text
# .worktreeinclude
.env
.venv/
node_modules/
```

## 上下文压缩

Hermes 会自动压缩长对话，使其保持在模型的上下文窗口范围内。压缩摘要是一次单独的 LLM 调用，因此你可以把它指向任意提供商或自定义端点。

所有相关设置都在 `config.yaml` 中，不使用环境变量。

### 完整参考

```yaml
compression:
  enabled: true
  threshold: 0.50
  target_ratio: 0.20
  protect_last_n: 20
  summary_model: "google/gemini-3-flash-preview"
  summary_provider: "auto"
  summary_base_url: null
```

### 常见配置方式

**默认自动检测：**

```yaml
compression:
  enabled: true
  threshold: 0.50
```

这种方式会优先选择可用提供商链中的第一个（OpenRouter → Nous → Codex），并使用 Gemini Flash。

**强制指定提供商：**

```yaml
compression:
  summary_provider: nous
  summary_model: gemini-3-flash
```

可与 `nous`、`openrouter`、`codex`、`anthropic`、`main` 等任意提供商配合使用。

**使用自定义端点：**

```yaml
compression:
  summary_model: glm-4.7
  summary_base_url: https://api.z.ai/api/coding/paas/v4
```

当 `summary_base_url` 存在时，会直接调用这个 OpenAI 兼容端点，并用 `OPENAI_API_KEY` 认证。

### 三个关键旋钮的关系

| `summary_provider` | `summary_base_url` | 结果 |
|--------------------|--------------------|------|
| `auto`（默认） | 未设置 | 自动探测最佳可用提供商 |
| `nous` / `openrouter` / 其他 | 未设置 | 强制使用该提供商及其认证 |
| 任意值 | 已设置 | 直接使用自定义端点，忽略 provider |

`summary_model` 的上下文长度至少应与主模型相当，因为压缩时它会接收整段待压缩的中间对话。

## 迭代预算压力

复杂任务在大量工具调用下，智能体可能在不自觉的情况下接近迭代上限（默认 90 次）。预算压力机制会在接近上限时自动提醒模型：

| 阈值 | 级别 | 模型看到的提示 |
|------|------|----------------|
| **70%** | Caution | `[BUDGET: 63/90. 27 iterations left. Start consolidating.]` |
| **90%** | Warning | `[BUDGET WARNING: 81/90. Only 9 left. Respond NOW.]` |

这些提醒不是单独插入一条消息，而是写进最近一次工具结果的 JSON 中（`_budget_warning` 字段），这样既能保留 prompt cache，也不会打乱原始对话结构。

```yaml
agent:
  max_turns: 90
```

预算压力默认启用。模型会把这些提醒自然地视作工具结果的一部分，从而在即将耗尽预算前收敛工作并给出答复。

## 上下文压力提示

它与迭代预算不同，用于提示当前对话距离**压缩阈值**还有多远，也就是离上下文压缩将要触发还有多近。

| 进度 | 级别 | 行为 |
|------|------|------|
| **≥ 60%** 到阈值 | Info | CLI 显示青色进度条；gateway 发送提示信息 |
| **≥ 85%** 到阈值 | Warning | CLI 显示醒目的黄色进度条；gateway 警告压缩即将发生 |

在 CLI 中，它会显示为工具输出中的进度条：

```
  ◐ context ████████████░░░░░░░░ 62% to compaction  48k threshold (50%) · approaching compaction
```

在消息平台上，它会显示为纯文本通知：

```
◐ Context: ████████████░░░░░░░░ 62% to compaction (threshold: 50% of window).
```

若自动压缩已禁用，提示会改为说明上下文可能被截断。这个机制始终自动生效，不需要额外配置；它只面向用户展示，不会修改消息流，也不会额外把提示塞进模型上下文。

## 凭据池策略

如果同一提供商下配置了多组 API key 或 OAuth token，可以通过下面的设置控制轮换策略：

```yaml
credential_pool_strategies:
  openrouter: round_robin
  anthropic: least_used
```

可选值有：`fill_first`（默认）、`round_robin`、`least_used`、`random`。完整说明参见 [Credential Pools](https://hermes-agent.nousresearch.com/docs/user-guide/features/credential-pools)。

## 辅助模型

Hermes 会用较轻量的“辅助模型”处理旁路任务，例如图像分析、网页摘要和浏览器截图分析。默认情况下，这些任务使用自动探测到的 **Gemini Flash**，通常无需额外配置。

### 通用配置模式

Hermes 中的所有模型槽位，无论是辅助任务、压缩还是备用模型，都遵循同一套三要素：

| 键 | 含义 | 默认值 |
|----|------|--------|
| `provider` | 使用哪个提供商进行认证与路由 | `"auto"` |
| `model` | 请求哪个模型 | 提供商默认值 |
| `base_url` | 自定义 OpenAI 兼容端点 | 未设置 |

当设置了 `base_url` 时，Hermes 会忽略 provider，直接调用该端点，并使用 `api_key` 或 `OPENAI_API_KEY`。若只设置 `provider`，则使用该提供商自带的认证方式与默认 base URL。

可用提供商包括：`auto`、`openrouter`、`nous`、`codex`、`copilot`、`anthropic`、`main`、`zai`、`kimi-coding`、`minimax`，以及 provider registry 中注册的任意提供商，或你在 `custom_providers` 中声明的自定义提供商。

### 辅助模型完整参考

```yaml
auxiliary:
  vision:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30
    download_timeout: 30

  web_extract:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 360

  approval:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30

  compression:
    timeout: 120

  session_search:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30

  skills_hub:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30

  mcp:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30

  flush_memories:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30
```

:::tip
每类辅助任务都有可配置的 `timeout`。默认值分别是：vision 30 秒、web_extract 360 秒、approval 30 秒、compression 120 秒。若你使用较慢的本地模型，可适当调大。vision 还单独提供 `download_timeout`，用于图像 HTTP 下载。
:::

:::info
上下文压缩本身还拥有顶层 `compression:` 配置块，其中包括 `summary_provider`、`summary_model` 与 `summary_base_url`。备用模型则使用 `fallback_model:` 块。三者都遵循同样的 provider / model / base_url 模式。
:::

### 更换 Vision 模型

如果你想在图像分析中使用 GPT-4o 而不是 Gemini Flash：

```yaml
auxiliary:
  vision:
    model: "openai/gpt-4o"
```

或通过环境变量：

```bash
AUXILIARY_VISION_MODEL=openai/gpt-4o
```

### 提供商选项

| Provider | 说明 | 要求 |
|----------|------|------|
| `"auto"` | 自动选择最佳可用路径（默认）。vision 会按 OpenRouter → Nous → Codex 的顺序尝试。 | 无 |
| `"openrouter"` | 强制使用 OpenRouter，可路由到 Gemini、GPT-4o、Claude 等任意模型 | `OPENROUTER_API_KEY` |
| `"nous"` | 强制使用 Nous Portal | `hermes auth` |
| `"codex"` | 强制使用 Codex OAuth（ChatGPT 账号），支持 vision（`gpt-5.3-codex`） | `hermes model` → Codex |
| `"main"` | 使用当前激活的主端点，可来自 `OPENAI_BASE_URL` + `OPENAI_API_KEY`，或通过 `hermes model` / `config.yaml` 保存的自定义端点 | 需要自定义端点的凭据与 base URL |

### 常见配置

**直接使用自定义端点：**

```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

由于 `base_url` 的优先级高于 `provider`，这是最明确的路由方式。对于这种直接覆盖端点的场景，Hermes 使用配置中的 `api_key`，若未设置则回退到 `OPENAI_API_KEY`；不会复用 `OPENROUTER_API_KEY`。

**使用 OpenAI API key 做 vision：**

```yaml
# 写入 ~/.hermes/.env:
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_API_KEY=sk-...

auxiliary:
  vision:
    provider: "main"
    model: "gpt-4o"
```

**使用 OpenRouter 做 vision：**

```yaml
auxiliary:
  vision:
    provider: "openrouter"
    model: "openai/gpt-4o"
```

**使用 Codex OAuth：**

```yaml
auxiliary:
  vision:
    provider: "codex"
    # 默认模型为 gpt-5.3-codex
```

**使用本地 / 自托管模型：**

```yaml
auxiliary:
  vision:
    provider: "main"
    model: "my-local-model"
```

`provider: "main"` 会沿用 Hermes 普通对话正在使用的主提供商配置，无论它是自定义 provider、OpenRouter 还是传统的 `OPENAI_BASE_URL` 端点。

:::tip
如果你的主模型提供商本身就是 Codex OAuth，那么 vision 通常无需单独配置即可工作，因为 Codex 已包含在自动检测链中。
:::

:::caution
**Vision 必须使用多模态模型。** 如果你把 `provider: "main"` 指向了不支持视觉输入的端点，图像分析会失败。
:::

### 旧版环境变量

辅助模型也能通过环境变量配置，但更推荐使用 `config.yaml`，因为更清晰，也支持 `base_url`、`api_key` 这类完整选项。

| 设置项 | 环境变量 |
|--------|----------|
| Vision provider | `AUXILIARY_VISION_PROVIDER` |
| Vision model | `AUXILIARY_VISION_MODEL` |
| Vision endpoint | `AUXILIARY_VISION_BASE_URL` |
| Vision API key | `AUXILIARY_VISION_API_KEY` |
| Web extract provider | `AUXILIARY_WEB_EXTRACT_PROVIDER` |
| Web extract model | `AUXILIARY_WEB_EXTRACT_MODEL` |
| Web extract endpoint | `AUXILIARY_WEB_EXTRACT_BASE_URL` |
| Web extract API key | `AUXILIARY_WEB_EXTRACT_API_KEY` |

压缩和备用模型配置仅支持 `config.yaml`。

:::tip
可运行 `hermes config` 查看当前辅助模型配置。只有与默认值不同的覆盖项才会显示出来。
:::

## 推理强度

你可以控制模型在回答前投入多少“思考”：

```yaml
agent:
  reasoning_effort: ""   # 留空表示 medium（默认）；可选 xhigh、high、medium、low、minimal、none
```

如果不设置，默认是 `medium`，适合大多数任务。设得越高，复杂任务表现通常越好，但 token 消耗和延迟也会上升。

运行时也可以通过 `/reasoning` 动态调整：

```
/reasoning
/reasoning high
/reasoning none
/reasoning show
/reasoning hide
```

## 工具调用强制引导

有些模型，尤其是 GPT 系列，偶尔会“描述它打算做什么”，而不是实际发出工具调用。工具调用强制机制会在 prompt 中补充引导，提醒模型真的去调用工具。

```yaml
agent:
  tool_use_enforcement: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 值 | 行为 |
|----|------|
| `"auto"`（默认） | 对 GPT 模型（`gpt-`、`openai/gpt-`）启用，对其他模型关闭 |
| `true` | 对所有模型都启用 |
| `false` | 完全关闭 |
| `["gpt-", "o1-", "custom-model"]` | 仅当模型名包含这些子串时启用 |

启用后，system prompt 会提醒模型不要只描述动作，而要真正发起工具调用。对本来就能稳定调用工具的模型而言，这个配置对用户几乎透明。

## TTS 配置

```yaml
tts:
  provider: "edge"
  edge:
    voice: "en-US-AriaNeural"
  elevenlabs:
    voice_id: "pNInz6obpgDQGcFmaJgB"
    model_id: "eleven_multilingual_v2"
  openai:
    model: "gpt-4o-mini-tts"
    voice: "alloy"
    base_url: "https://api.openai.com/v1"
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
```

这个配置同时影响 `text_to_speech` 工具，以及语音模式中的播报功能（CLI 中的 `/voice tts` 或消息网关中的语音回复）。

## 显示设置

```yaml
display:
  tool_progress: all
  tool_progress_command: false
  skin: default
  personality: "kawaii"
  compact: false
  resume_display: full
  bell_on_complete: false
  show_reasoning: false
  streaming: false
  show_cost: false
  tool_preview_length: 0
```

| 模式 | 你会看到什么 |
|------|--------------|
| `off` | 静默，只显示最终回答 |
| `new` | 仅在工具发生切换时显示提示 |
| `all` | 显示每一次工具调用和简短预览（默认） |
| `verbose` | 显示完整参数、结果和调试日志 |

在 CLI 中可以通过 `/verbose` 在这些模式间循环切换。如果你也希望在 Telegram、Discord、Slack 等消息平台中使用 `/verbose`，就把 `display.tool_progress_command` 设为 `true`。

## 隐私

```yaml
privacy:
  redact_pii: false  # 从 LLM 上下文中去除个人身份信息（仅 gateway）
```

当 `redact_pii` 为 `true` 时，在受支持的平台上，gateway 会在把系统提示发送给 LLM 前，对其中的个人身份信息进行脱敏：

| 字段 | 处理方式 |
|------|----------|
| 电话号码（例如 WhatsApp / Signal 中的用户 ID） | 哈希为 `user_<12-char-sha256>` |
| 用户 ID | 哈希为 `user_<12-char-sha256>` |
| Chat ID | 仅哈希其中的数字部分，保留平台前缀 |
| Home channel ID | 仅哈希数字部分 |
| 用户名 / 昵称 | **不处理**，因为通常由用户自定义且公开可见 |

**平台支持：** 脱敏适用于 WhatsApp、Signal 和 Telegram。Discord 与 Slack 不支持，因为它们的 mention 语法（如 `<@user_id>`）需要保留真实 ID 才能工作。

哈希是确定性的，因此同一用户在不同消息中会映射为同一个哈希值，模型仍然可以区分群聊里的不同用户。内部路由和消息投递依旧使用原始值。

## 语音转文本（STT）

```yaml
stt:
  provider: "local"            # "local" | "groq" | "openai"
  local:
    model: "base"              # tiny, base, small, medium, large-v3
  openai:
    model: "whisper-1"         # whisper-1 | gpt-4o-mini-transcribe | gpt-4o-transcribe
  # model: "whisper-1"         # 仍兼容旧版 fallback 键
```

提供商行为：

- `local`：使用本机上的 `faster-whisper`，需单独安装 `pip install faster-whisper`
- `groq`：使用 Groq 的 Whisper 兼容端点，读取 `GROQ_API_KEY`
- `openai`：使用 OpenAI speech API，读取 `VOICE_TOOLS_OPENAI_KEY`

若指定提供商不可用，Hermes 会自动按 `local` → `groq` → `openai` 的顺序回退。

Groq 与 OpenAI 的模型覆盖仍通过环境变量配置：

```bash
STT_GROQ_MODEL=whisper-large-v3-turbo
STT_OPENAI_MODEL=whisper-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_BASE_URL=https://api.openai.com/v1
```

## 语音模式（CLI）

```yaml
voice:
  record_key: "ctrl+b"
  max_recording_seconds: 120
  auto_tts: false
  silence_threshold: 200
  silence_duration: 3.0
```

在 CLI 中使用 `/voice on` 启用麦克风模式，用 `record_key` 开始 / 停止录音，用 `/voice tts` 切换语音播报。完整流程见 [Voice Mode](https://hermes-agent.nousresearch.com/docs/user-guide/features/voice-mode)。

## 流式输出

让响应随着 token 到达实时显示，而不是等整段生成完毕再输出。

### CLI 流式输出

```yaml
display:
  streaming: true
  show_reasoning: true
```

启用后，回复会在一个流式输出框里逐 token 显示。工具调用仍会静默执行；若提供商不支持 streaming，会自动回退到普通显示方式。

### Gateway 流式输出（Telegram、Discord、Slack）

```yaml
streaming:
  enabled: true
  transport: edit
  edit_interval: 0.3
  buffer_threshold: 40
  cursor: " ▉"
```

开启后，机器人会在收到第一个 token 时先发送消息，然后随着内容增长不断编辑该消息。对不支持消息编辑的平台（如 Signal、Email、Home Assistant），Hermes 会在第一次尝试后自动检测，并在当前会话里优雅地禁用流式输出，而不是刷出一堆消息。

**超长处理：** 如果流式内容超过平台消息长度上限（约 4096 字符），当前消息会被定稿，并自动续写到下一条消息里。

:::note
流式输出默认关闭，需要手动在 `~/.hermes/config.yaml` 中启用。
:::

## 群聊会话隔离

控制群聊 / 频道场景下，是“每个房间一条会话”，还是“每个参与者一条会话”：

```yaml
group_sessions_per_user: true
```

- `true` 是默认且推荐设置。在 Discord 频道、Telegram 群组、Slack 频道等共享上下文中，只要平台能提供用户 ID，每个发送者都会获得独立会话。
- `false` 则恢复旧版“整间房共享同一会话”的行为。适合你明确希望所有人共用一个上下文的情况，但也意味着大家会共享上下文、token 成本和中断状态。
- 私聊不受影响，仍按 DM / chat ID 正常建会话。
- 线程始终与父频道隔离；在 `true` 模式下，线程中的不同参与者仍各有独立会话。

更多行为细节见 [Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions) 和 [Discord 指南](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord)。

## 未授权私聊行为

控制未知用户向机器人发送私聊时 Hermes 的默认处理方式：

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` 是默认值。Hermes 会拒绝访问，但会在私聊中回复一次性配对码。
- `ignore` 会静默丢弃未授权私聊。
- 平台级配置会覆盖全局默认值，因此你可以整体启用配对，但让某个特定平台更安静。

## 快捷命令

你可以定义自定义命令，直接执行 shell 命令而不调用 LLM：零 token 成本，几乎即时返回。它特别适合在 Telegram、Discord 等消息平台上做快速服务器检查或运行常用脚本。

```yaml
quick_commands:
  status:
    type: exec
    command: systemctl status hermes-agent
  disk:
    type: exec
    command: df -h /
  update:
    type: exec
    command: cd ~/.hermes/hermes-agent && git pull && pip install -e .
  gpu:
    type: exec
    command: nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total --format=csv,noheader
```

用法是在 CLI 或消息平台里直接输入 `/status`、`/disk`、`/update`、`/gpu`。命令会在宿主机本地执行，并把输出原样返回，不会调用 LLM，也不会消耗 token。

- **30 秒超时**：长时间运行的命令会被终止并返回错误
- **优先级高**：快捷命令在技能命令前检查，因此你可以覆盖技能名
- **自动补全行为**：它们在派发时解析，不会预先出现在内置斜杠命令自动补全表中
- **类型限制**：目前只支持 `exec`
- **适用范围广**：CLI、Telegram、Discord、Slack、WhatsApp、Signal、Email、Home Assistant 均可用

## Human Delay

为消息平台模拟更像真人的回复节奏：

```yaml
human_delay:
  mode: "off"                  # off | natural | custom
  min_ms: 800
  max_ms: 2500
```

## 代码执行

配置沙盒化的 Python 代码执行工具：

```yaml
code_execution:
  timeout: 300
  max_tool_calls: 50
```

## Web 搜索后端

`web_search`、`web_extract` 和 `web_crawl` 支持四种后端提供商。可在 `config.yaml` 或 `hermes tools` 中配置：

```yaml
web:
  backend: firecrawl    # firecrawl | parallel | tavily | exa
```

| 后端 | 环境变量 | Search | Extract | Crawl |
|------|----------|--------|---------|-------|
| **Firecrawl**（默认） | `FIRECRAWL_API_KEY` | ✔ | ✔ | ✔ |
| **Parallel** | `PARALLEL_API_KEY` | ✔ | ✔ | — |
| **Tavily** | `TAVILY_API_KEY` | ✔ | ✔ | ✔ |
| **Exa** | `EXA_API_KEY` | ✔ | ✔ | — |

**后端选择逻辑：** 如果未设置 `web.backend`，Hermes 会按可用 API key 自动检测。只有 `EXA_API_KEY` 时选 Exa；只有 `TAVILY_API_KEY` 时选 Tavily；只有 `PARALLEL_API_KEY` 时选 Parallel；其他情况下默认选 Firecrawl。

**自托管 Firecrawl：** 设置 `FIRECRAWL_API_URL` 指向你的实例。使用自定义 URL 时，API key 可以是可选的（需在服务端设置 `USE_DB_AUTHENTICATION=false`）。

**Parallel 搜索模式：** 通过 `PARALLEL_SEARCH_MODE` 控制行为，可选 `fast`、`one-shot`、`agentic`（默认）。

## 浏览器

配置浏览器自动化行为：

```yaml
browser:
  inactivity_timeout: 120
  command_timeout: 30
  record_sessions: false
  camofox:
    managed_persistence: false
```

浏览器工具集支持多个提供商。关于 Browserbase、Browser Use、本地 Chrome CDP 等模式，请参见 [Browser 功能页](https://hermes-agent.nousresearch.com/docs/user-guide/features/browser)。

## 时区

使用 IANA 时区字符串覆盖服务器本地时区。它会影响日志时间戳、cron 调度和 system prompt 中的时间注入。

```yaml
timezone: "America/New_York"
```

支持任意 IANA 时区标识，例如 `America/New_York`、`Europe/London`、`Asia/Kolkata`、`UTC`。留空则使用服务器本地时区。

## Discord

配置消息网关中的 Discord 特定行为：

```yaml
discord:
  require_mention: true
  free_response_channels: ""
  auto_thread: true
```

- `require_mention`：为 `true` 时（默认），机器人在服务器频道里只有被 `@BotName` 提及时才会回复；私聊不受影响
- `free_response_channels`：逗号分隔的频道 ID 列表，在这些频道中机器人会对所有消息自由回复
- `auto_thread`：为 `true` 时（默认），在频道中被提及时自动开线程，保持主频道整洁

## 安全

执行前安全扫描与机密脱敏：

```yaml
security:
  redact_secrets: true
  tirith_enabled: true
  tirith_path: "tirith"
  tirith_timeout: 5
  tirith_fail_open: true
  website_blocklist:
    enabled: false
    domains: []
    shared_files: []
```

- `redact_secrets`：在工具输出和日志进入对话上下文之前，自动检测并脱敏看起来像 API key、token、密码的内容
- `tirith_enabled`：为 `true` 时，终端命令在执行前会通过 [Tirith](https://github.com/StackGuardian/tirith) 扫描潜在危险
- `tirith_path`：Tirith 二进制路径；若安装在非标准位置，需要手动指定
- `tirith_timeout`：等待 Tirith 扫描的最长秒数，超时后命令会继续执行
- `tirith_fail_open`：默认为 `true`，表示 Tirith 不可用或失败时仍允许执行；设为 `false` 则会阻止无法验证的命令

## Website Blocklist

阻止智能体通过网页和浏览器工具访问特定域名：

```yaml
security:
  website_blocklist:
    enabled: false
    domains:
      - "*.internal.company.com"
      - "admin.example.com"
      - "*.local"
    shared_files:
      - "/etc/hermes/blocked-sites.txt"
```

启用后，只要 URL 命中阻止规则，就会在网页或浏览器工具执行前被拒绝。这个规则适用于 `web_search`、`web_extract`、`browser_navigate` 以及其他任何可访问 URL 的工具。

规则支持：

- 精确域名：`admin.example.com`
- 通配子域名：`*.internal.company.com`
- 顶级域名通配：`*.local`

共享文件里每行写一条规则；空行和以 `#` 开头的注释会被忽略。文件缺失或不可读只会记录警告，不会让其他网页工具失效。策略缓存时间为 30 秒，因此修改后通常很快生效。

## 智能审批

控制 Hermes 如何处理潜在危险命令：

```yaml
approvals:
  mode: manual   # manual | smart | off
```

| 模式 | 行为 |
|------|------|
| `manual`（默认） | 在执行所有被标记的命令前向用户确认。CLI 中显示交互式审批对话框；消息平台中则创建待处理审批。 |
| `smart` | 借助辅助 LLM 判断某条被标记命令是否真的危险。低风险命令会自动批准并带有会话级持久化；高风险命令则升级给用户处理。 |
| `off` | 跳过全部审批检查，等同于 `HERMES_YOLO_MODE=true`。**务必谨慎。** |

智能模式有助于减少审批疲劳，让智能体在安全操作上更自主，同时仍拦住真正具破坏性的命令。

:::caution
`approvals.mode: off` 会关闭终端命令的全部安全检查。只应在受信任且经过沙盒隔离的环境中使用。
:::

## 检查点

在执行破坏性文件操作前自动做文件系统快照。详见 [Checkpoints & Rollback](https://hermes-agent.nousresearch.com/docs/user-guide/checkpoints-and-rollback)。

```yaml
checkpoints:
  enabled: true
  max_snapshots: 50
```

## 委派

配置 delegate 工具的子智能体行为：

```yaml
delegation:
  # model: "google/gemini-3-flash-preview"
  # provider: "openrouter"
  # base_url: "http://localhost:1234/v1"
  # api_key: "local-key"
```

**子智能体 provider:model 覆盖：** 默认情况下，子智能体继承父智能体的提供商与模型。你可以设置 `delegation.provider` 与 `delegation.model`，把子任务路由到另一组 provider:model，例如让主智能体使用高成本的强推理模型，而子智能体使用更便宜、更快的模型处理边缘任务。

**直接端点覆盖：** 如果你更想显式指定 OpenAI 兼容端点，就同时设置 `delegation.base_url`、`delegation.api_key` 与 `delegation.model`。这样会直接把子智能体请求发送到该端点，并优先于 `delegation.provider`。如果未设置 `delegation.api_key`，仅会回退到 `OPENAI_API_KEY`。

委派提供商使用与 CLI / gateway 启动相同的凭据解析机制。所有已配置提供商都受支持，包括 `openrouter`、`nous`、`copilot`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`。一旦指定 provider，系统会自动解析对应的 base URL、API key 与 API 模式，无需手动拼接。

**优先级：** `delegation.base_url` → `delegation.provider` → 继承父提供商；`delegation.model` → 继承父模型。若只设置 `model` 而不设置 `provider`，就表示在沿用父提供商凭据的前提下仅切换模型。

## Clarify

配置需要用户澄清时的等待时长：

```yaml
clarify:
  timeout: 120
```

## 上下文文件（SOUL.md、AGENTS.md）

Hermes 使用两类上下文作用域：

| 文件 | 用途 | 作用范围 |
|------|------|----------|
| `SOUL.md` | **主智能体身份**，定义“这个智能体是谁” | `~/.hermes/SOUL.md` 或 `$HERMES_HOME/SOUL.md` |
| `.hermes.md` / `HERMES.md` | 项目级说明，优先级最高 | 递归向上查找到 git 根目录 |
| `AGENTS.md` | 项目级说明、编码规范 | 按目录层级递归收集 |
| `CLAUDE.md` | Claude Code 上下文文件 | 仅当前工作目录 |
| `.cursorrules` | Cursor IDE 规则 | 仅当前工作目录 |
| `.cursor/rules/*.mdc` | Cursor 规则文件 | 仅当前工作目录 |

- **SOUL.md** 是智能体的主身份文件，会占据 system prompt 的第 1 槽位，完全替换内置默认身份
- 若 SOUL.md 缺失、为空或无法加载，Hermes 会退回到内置默认身份
- **项目上下文文件采用优先级机制**：同一时刻只加载一种类型，匹配顺序为 `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。SOUL.md 始终独立加载
- **AGENTS.md** 具有层级性：如果子目录也有 AGENTS.md，系统会将其一并合并
- 若系统发现还没有 SOUL.md，会自动生成一个默认版本
- 所有加载进来的上下文文件都限制在 20,000 字符以内，并采用智能截断

另见：

- [Personality & SOUL.md](https://hermes-agent.nousresearch.com/docs/user-guide/features/personality)
- [Context Files](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files)

## 工作目录

| 场景 | 默认值 |
|------|--------|
| **CLI（`hermes`）** | 你运行命令时所在的当前目录 |
| **消息网关** | 家目录 `~`（可通过 `MESSAGING_CWD` 覆盖） |
| **Docker / Singularity / Modal / SSH** | 容器或远程主机中的用户 home 目录 |

覆盖方式：

```bash
# 写入 ~/.hermes/.env 或 ~/.hermes/config.yaml
MESSAGING_CWD=/home/myuser/projects
TERMINAL_CWD=/workspace
```
