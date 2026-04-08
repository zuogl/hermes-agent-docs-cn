---
title: "安全"
---
# 安全

Hermes Agent 采用纵深防御（defense-in-depth）的安全模型设计。本页覆盖它的全部安全边界，从命令审批、容器隔离，到消息平台中的用户授权。

## 概览

这套安全模型由七层组成：

1. **用户授权**：谁可以与智能体交互（允许列表、私聊配对）
2. **危险命令审批**：对破坏性操作保持人在回路
3. **容器隔离**：通过加固配置使用 Docker / Singularity / Modal 沙盒
4. **MCP 凭据过滤**：对 MCP 子进程隔离环境变量
5. **上下文文件扫描**：检测项目文件中的提示词注入
6. **跨会话隔离**：不同会话不能互相访问数据或状态；cron 作业的存储路径也针对路径穿越攻击做了加固
7. **输入净化**：终端工具后端中的工作目录参数会按允许列表校验，防止 shell 注入

## 危险命令审批

在执行任意命令之前，Hermes 会先将其与一组经过整理的危险模式进行匹配。如果命中，用户必须显式批准。

### 审批模式

审批系统支持三种模式，通过 `~/.hermes/config.yaml` 中的 `approvals.mode` 配置：

```yaml
approvals:
  mode: manual    # manual | smart | off
  timeout: 60     # 等待用户响应的秒数（默认：60）
```

| 模式 | 行为 |
|------|------|
| **manual**（默认） | 对危险命令始终提示用户审批 |
| **smart** | 使用辅助 LLM 评估风险。低风险命令（例如 `python -c "print('hello')"`）会自动批准；真正危险的命令会自动拒绝；无法确定的情况会升级为手动审批。 |
| **off** | 关闭全部审批检查，等同于使用 `--yolo`。所有命令都不会弹出确认。 |

:::caution
将 `approvals.mode: off` 设为关闭，会禁用所有安全提示。只应在受信任的环境中使用，例如 CI/CD 或隔离容器。
:::

### YOLO 模式

YOLO 模式会为当前会话跳过**全部**危险命令审批提示。它有三种开启方式：

1. **CLI 参数**：使用 `hermes --yolo` 或 `hermes chat --yolo` 启动会话
2. **斜杠命令**：在会话中输入 `/yolo` 进行开关切换
3. **环境变量**：设置 `HERMES_YOLO_MODE=1`

`/yolo` 是一个**切换开关**，每执行一次就在开启与关闭之间切换：

```
> /yolo
  ⚡ YOLO mode ON — all commands auto-approved. Use with caution.

> /yolo
  ⚠ YOLO mode OFF — dangerous commands will require approval.
```

YOLO 模式在 CLI 会话和 gateway 会话中都可用。它在内部通过设置 `HERMES_YOLO_MODE` 环境变量实现，系统会在每次执行命令前检查这个变量。

> 🚫 **危险**
> YOLO 模式会为当前会话关闭**所有**危险命令安全检查。只有在你完全信任将被生成的命令时才应使用，例如在一次性环境中运行经过充分测试的自动化脚本。

### 审批超时

当危险命令审批提示出现后，用户有一段可配置的时间作出回应。如果在超时前没有响应，命令会默认**被拒绝**，也就是 fail-closed。

在 `~/.hermes/config.yaml` 中这样配置：

```yaml
approvals:
  timeout: 60  # 秒（默认：60）
```

### 哪些内容会触发审批

以下模式会触发审批提示（定义于 `tools/approval.py`）：

| 模式 | 说明 |
|------|------|
| `rm -r` / `rm --recursive` | 递归删除 |
| `rm ... /` | 删除根路径中的内容 |
| `chmod 777/666` / `o+w` / `a+w` | 向所有用户 / 其他用户开放可写权限 |
| `chmod --recursive` with unsafe perms | 递归设置不安全的全局可写权限（长参数形式） |
| `chown -R root` / `chown --recursive root` | 递归把属主改为 root |
| `mkfs` | 格式化文件系统 |
| `dd if=` | 磁盘复制 |
| `> /dev/sd` | 向块设备写入 |
| `DROP TABLE/DATABASE` | SQL DROP |
| `DELETE FROM`（无 `WHERE`） | 无条件 SQL DELETE |
| `TRUNCATE TABLE` | SQL TRUNCATE |
| `> /etc/` | 覆盖系统配置 |
| `systemctl stop/disable/mask` | 停止 / 禁用系统服务 |
| `kill -9 -1` | 杀死所有进程 |
| `pkill -9` | 强制杀进程 |
| Fork bomb patterns | fork bomb 模式 |
| `bash -c` / `sh -c` / `zsh -c` / `ksh -c` | 通过 `-c` 参数执行 shell 命令（含 `-lc` 这类组合参数） |
| `python -e` / `perl -e` / `ruby -e` / `node -c` | 通过 `-e` / `-c` 参数执行脚本 |
| `curl ... \| sh` / `wget ... \| sh` | 将远程内容直接管道给 shell |
| `bash <(curl ...)` / `sh <(wget ...)` | 通过进程替换执行远程脚本 |
| `tee` 到 `/etc/`、`~/.ssh/`、`~/.hermes/.env` | 通过 tee 覆盖敏感文件 |
| `>` / `>>` 到 `/etc/`、`~/.ssh/`、`~/.hermes/.env` | 通过重定向覆盖敏感文件 |
| `xargs rm` | 使用 xargs 调用 rm |
| `find -exec rm` / `find -delete` | 通过 find 执行破坏性删除 |
| `cp` / `mv` / `install` 到 `/etc/` | 将文件写入系统配置目录 |
| `sed -i` / `sed --in-place` 在 `/etc/` 上 | 原地修改系统配置 |
| `pkill` / `killall` hermes/gateway | 防止自杀式终止 |
| `gateway run` 配合 `&` / `disown` / `nohup` / `setsid` | 防止在服务管理器之外启动 gateway |

:::info
**容器绕过**：当运行在 `docker`、`singularity`、`modal` 或 `daytona` 后端时，危险命令检查会被**跳过**，因为容器本身就是安全边界。容器内的破坏性命令无法直接伤害宿主机。
:::

### 审批流程（CLI）

在交互式 CLI 中，危险命令会显示内联审批提示：

```
  ⚠️  DANGEROUS COMMAND: recursive delete
      rm -rf /tmp/old-project

      [o]nce  |  [s]ession  |  [a]lways  |  [d]eny

      Choice [o/s/a/D]:
```

四个选项分别是：

- **once**：仅允许这一次执行
- **session**：在当前会话的剩余时间内允许这一模式
- **always**：加入永久允许列表（保存到 `config.yaml`）
- **deny**（默认）：阻止该命令

### 审批流程（Gateway / Messaging）

在消息平台中，智能体会把危险命令的详情发送到聊天窗口，并等待用户回复：

- 回复 **yes**、**y**、**approve**、**ok** 或 **go** 表示批准
- 回复 **no**、**n**、**deny** 或 **cancel** 表示拒绝

运行 gateway 时会自动设置 `HERMES_EXEC_ASK=1` 环境变量。

### 永久允许列表

通过“always”批准的命令会写入 `~/.hermes/config.yaml`：

```yaml
# 永久允许的危险命令模式
command_allowlist:
  - rm
  - systemctl
```

这些模式会在启动时加载，并在将来的所有会话中静默放行。

:::tip
你可以用 `hermes config edit` 检查或删除永久允许列表中的模式。
:::

## 用户授权（Gateway）

当你运行消息网关时，Hermes 会通过分层授权系统决定谁可以与机器人交互。

### 授权检查顺序

`_is_user_authorized()` 方法按下面顺序检查：

1. **按平台启用的 allow-all 开关**（例如 `DISCORD_ALLOW_ALL_USERS=true`）
2. **私聊配对通过列表**（通过配对码批准的用户）
3. **平台专用允许列表**（例如 `TELEGRAM_ALLOWED_USERS=12345,67890`）
4. **全局允许列表**（`GATEWAY_ALLOWED_USERS=12345,67890`）
5. **全局 allow-all**（`GATEWAY_ALLOW_ALL_USERS=true`）
6. **默认：拒绝**

### 平台允许列表

可在 `~/.hermes/.env` 中使用逗号分隔的用户 ID 列表：

```bash
# 平台专用允许列表
TELEGRAM_ALLOWED_USERS=123456789,987654321
DISCORD_ALLOWED_USERS=111222333444555666
WHATSAPP_ALLOWED_USERS=15551234567
SLACK_ALLOWED_USERS=U01ABC123

# 跨平台允许列表（对所有平台生效）
GATEWAY_ALLOWED_USERS=123456789

# 单平台 allow-all（谨慎使用）
DISCORD_ALLOW_ALL_USERS=true

# 全局 allow-all（极其谨慎）
GATEWAY_ALLOW_ALL_USERS=true
```

:::caution
如果**没有配置任何允许列表**，且 `GATEWAY_ALLOW_ALL_USERS` 也没有设置，则**所有用户都会被拒绝**。gateway 会在启动时记录警告：

```
No user allowlists configured. All unauthorized users will be denied.
Set GATEWAY_ALLOW_ALL_USERS=true in ~/.hermes/.env to allow open access,
or configure platform allowlists (e.g., TELEGRAM_ALLOWED_USERS=your_id).
```
:::

### 私聊配对系统

为了提供更灵活的授权方式，Hermes 内置了基于配对码的授权系统。你无需提前知道用户 ID；未知用户在私聊中会收到一个一次性配对码，由机器人所有者在 CLI 中批准。

**工作方式：**

1. 未知用户向机器人发送私聊消息
2. 机器人回复一个 8 字符的配对码
3. 机器人所有者在 CLI 中运行 `hermes pairing approve ...`
4. 该用户会被永久批准用于对应平台

你可以在 `~/.hermes/config.yaml` 中控制未授权私聊的处理方式：

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` 是默认值。未授权私聊会收到配对码回复。
- `ignore` 会静默丢弃未授权私聊。
- 平台级配置会覆盖全局默认值，所以你可以在 Telegram 上保持配对，在 WhatsApp 上保持安静。

**安全特性**（参考 OWASP 与 NIST SP 800-63-4）：

| 特性 | 细节 |
|------|------|
| 代码格式 | 8 字符，来自 32 字符且无歧义的字母表（不含 0/O/1/I） |
| 随机性 | 加密安全随机（`secrets.choice()`） |
| 代码 TTL | 1 小时过期 |
| 限流 | 每个用户每 10 分钟最多 1 次请求 |
| 待处理上限 | 每个平台最多 3 个待处理配对码 |
| 锁定 | 审批失败 5 次后锁定 1 小时 |
| 文件安全 | 所有配对数据文件均使用 `chmod 0600` |
| 日志 | 配对码永不打印到 stdout |

**配对 CLI 命令：**

```bash
# 查看待处理和已批准用户
hermes pairing list

# 批准配对码
hermes pairing approve telegram ABC12DEF

# 撤销用户访问权限
hermes pairing revoke telegram 123456789

# 清空所有待处理配对码
hermes pairing clear-pending
```

**存储位置：** 配对数据保存在 `~/.hermes/pairing/` 中，每个平台各自有一个 JSON 文件：

- `{platform}-pending.json`：待处理的配对请求
- `{platform}-approved.json`：已批准用户
- `_rate_limits.json`：限流与锁定跟踪数据

## 容器隔离

当使用 `docker` 终端后端时，Hermes 会对每个容器应用严格的安全加固。

### Docker 安全参数

每个容器都带着这些参数运行（定义在 `tools/environments/docker.py`）：

```python
_SECURITY_ARGS = [
    "--cap-drop", "ALL",                          # 丢弃全部 Linux capability
    "--cap-add", "DAC_OVERRIDE",                  # 允许 root 写入 bind mount 目录
    "--cap-add", "CHOWN",                         # 包管理器需要修改文件属主
    "--cap-add", "FOWNER",                        # 包管理器需要操作文件所有权
    "--security-opt", "no-new-privileges",        # 禁止提权
    "--pids-limit", "256",                        # 限制进程数量
    "--tmpfs", "/tmp:rw,nosuid,size=512m",        # 有大小限制的 /tmp
    "--tmpfs", "/var/tmp:rw,noexec,nosuid,size=256m",  # 禁止执行的 /var/tmp
    "--tmpfs", "/run:rw,noexec,nosuid,size=64m",  # 禁止执行的 /run
]
```

### 资源限制

容器资源可在 `~/.hermes/config.yaml` 中配置：

```yaml
terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_forward_env: []  # 仅显式允许列表；留空即可避免把机密带进容器
  container_cpu: 1        # CPU 核数
  container_memory: 5120  # MB（默认 5GB）
  container_disk: 51200   # MB（默认 50GB，要求 overlay2 + XFS）
  container_persistent: true  # 跨会话保留文件系统
```

### 文件系统持久化

- **持久模式**（`container_persistent: true`）：把 `~/.hermes/sandboxes/docker//` 中的 `/workspace` 和 `/root` bind mount 进容器
- **临时模式**（`container_persistent: false`）：工作目录使用 tmpfs，清理后所有内容都会消失

:::tip
对于生产环境中的 gateway 部署，推荐使用 `docker`、`modal` 或 `daytona` 后端，将智能体命令与宿主系统隔离。这样通常也就不再需要危险命令审批。
:::

:::caution
如果你把变量名加入 `terminal.docker_forward_env`，这些变量会被**有意**注入容器，供终端命令读取。这对 `GITHUB_TOKEN` 这类任务专用凭据很有用，但也意味着容器中的代码可以读取并外传它们。
:::

## 终端后端安全对比

| 后端 | 隔离级别 | 危险命令检查 | 适用场景 |
|------|----------|--------------|----------|
| **local** | 无，直接运行在宿主机 | ✅ 是 | 开发环境、受信任用户 |
| **ssh** | 远程机器 | ✅ 是 | 单独的执行服务器 |
| **docker** | 容器 | ❌ 跳过（容器就是边界） | 生产网关 |
| **singularity** | 容器 | ❌ 跳过 | HPC 环境 |
| **modal** | 云沙盒 | ❌ 跳过 | 可扩展的云隔离 |
| **daytona** | 云沙盒 | ❌ 跳过 | 持久化云工作区 |

## 环境变量透传 {#environment-variable-passthrough}

`execute_code` 和 `terminal` 都会从子进程环境中剥离敏感变量，防止 LLM 生成的代码窃取凭据。不过，有些技能通过 `required_environment_variables` 正常声明了依赖，这些变量需要被合法透传。

### 工作原理

有两种机制可以让特定变量穿过沙盒过滤器：

**1. 按技能作用域透传（自动）**

当某个技能被加载（通过 `skill_view` 或 `/skill` 命令），且在 frontmatter 中声明了 `required_environment_variables` 时，凡是当前环境里真实存在的变量，都会自动登记为可透传。缺失变量（仍处于待配置状态）不会被登记。

```yaml
# 某个技能的 SKILL.md frontmatter
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
```

加载这个技能之后，`TENOR_API_KEY` 会自动透传到 `execute_code`、本地 `terminal`，以及**远端后端（Docker、Modal）**，无需手动配置。

:::info
Docker 与 Modal
在 v0.5.1 之前，Docker 的 `forward_env` 与技能透传是两套系统。现在它们已经合并，技能声明的环境变量会自动转发进 Docker 容器和 Modal 沙盒，不再需要手动写入 `docker_forward_env`。
:::

**2. 基于配置的透传（手动）**

如果某些变量不是由任何技能声明的，可以把它们写进 `config.yaml` 中的 `terminal.env_passthrough`：

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_KEY
    - ANOTHER_TOKEN
```

### 凭据文件透传（OAuth token 等） {#credential-file-passthrough}

有些技能需要的不是环境变量，而是**文件**。例如，Google Workspace 会把 OAuth token 以 `google_token.json` 的形式保存在当前 profile 的 `HERMES_HOME` 下。技能可以在 frontmatter 中这样声明：

```yaml
required_credential_files:
  - path: google_token.json
    description: Google OAuth2 token (created by setup script)
  - path: google_client_secret.json
    description: Google OAuth2 client credentials
```

技能加载时，Hermes 会检查这些文件是否存在于当前 profile 的 `HERMES_HOME` 下，并登记为需要挂载的凭据文件：

- **Docker**：只读 bind mount（`-v host:container:ro`）
- **Modal**：创建沙盒时挂载，并在每次命令执行前同步一次（支持会话中途完成 OAuth 设置）
- **Local**：无需额外处理，文件本来就可访问

你也可以在 `config.yaml` 中手动列出凭据文件：

```yaml
terminal:
  credential_files:
    - google_token.json
    - my_custom_oauth_token.json
```

这些路径都是相对 `~/.hermes/` 的。文件会挂载到容器中的 `/root/.hermes/`。

### 各沙盒默认过滤什么

| 沙盒 | 默认过滤策略 | 透传覆盖 |
|------|--------------|----------|
| **execute_code** | 默认拦截变量名中包含 `KEY`、`TOKEN`、`SECRET`、`PASSWORD`、`CREDENTIAL`、`PASSWD`、`AUTH` 的变量；只允许安全前缀变量通过 | ✅ 透传变量可绕过两层检查 |
| **terminal**（local） | 屏蔽 Hermes 基础设施相关变量（提供商密钥、gateway token、工具 API key） | ✅ 透传变量可绕过 blocklist |
| **terminal**（Docker） | 默认不继承宿主机环境变量 | ✅ 透传变量和 `docker_forward_env` 会通过 `-e` 注入 |
| **terminal**（Modal） | 默认不继承宿主机环境变量和文件 | ✅ 凭据文件会挂载，环境变量通过同步进入 |
| **MCP** | 除安全系统变量和显式配置的 `env` 外，其余全部剥离 | ❌ 不受透传影响，需使用 MCP 的 `env` 配置 |

### 安全注意事项

- 透传只对你或技能**显式声明**的变量生效，不会改变任意 LLM 代码的默认安全姿态
- 凭据文件挂载到 Docker 时是**只读**
- Skills Guard 会在安装前扫描技能内容中是否存在可疑的环境变量访问模式
- 未设置 / 不存在的变量永远不会被登记
- Hermes 基础设施密钥（提供商 API key、gateway token 等）不应加入 `env_passthrough`；它们有独立机制

## MCP 凭据处理

MCP（Model Context Protocol）服务器子进程收到的是**过滤后的环境变量**，以防凭据被意外泄漏。

### 安全环境变量

只有这些变量会从宿主机透传给 MCP 的 stdio 子进程：

```
PATH, HOME, USER, LANG, LC_ALL, TERM, SHELL, TMPDIR
```

以及任意 `XDG_*` 变量。其余环境变量（API key、token、secret 等）都会被**剥离**。

若 MCP 服务器配置中显式声明了 `env`，这些变量会被透传：

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_..."  # 只有这个变量会被传入
```

### 凭据脱敏

MCP 工具返回的错误信息会先脱敏，再交给 LLM。以下模式会被替换为 `[REDACTED]`：

- GitHub PAT（`ghp_...`）
- OpenAI 风格密钥（`sk-...`）
- Bearer token
- `token=`、`key=`、`API_KEY=`、`password=`、`secret=` 这类参数

### 网站访问策略

你可以限制智能体通过网页与浏览器工具访问哪些网站。这对阻止它访问内部服务、管理后台或其他敏感 URL 很有用。

```yaml
# 写入 ~/.hermes/config.yaml
security:
  website_blocklist:
    enabled: true
    domains:
      - "*.internal.company.com"
      - "admin.example.com"
    shared_files:
      - "/etc/hermes/blocked-sites.txt"
```

当请求的 URL 命中规则时，工具会返回错误，说明该域名被策略阻止。这个 blocklist 会对 `web_search`、`web_extract`、`browser_navigate` 以及其他所有可访问 URL 的工具生效。

完整说明请参见配置指南中的 [Website Blocklist](https://hermes-agent.nousresearch.com/docs/user-guide/configuration#website-blocklist)。

### SSRF 防护

所有可访问 URL 的工具（网页搜索、网页提取、vision、browser）都会在请求前校验 URL，以防止 SSRF（服务器端请求伪造）攻击。以下地址会被阻止：

- **私有网段**（RFC 1918）：`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`
- **回环地址**：`127.0.0.0/8`、`::1`
- **链路本地地址**：`169.254.0.0/16`（包含云元数据地址 `169.254.169.254`）
- **CGNAT / 共享地址空间**（RFC 6598）：`100.64.0.0/10`（例如 Tailscale、WireGuard VPN）
- **云元数据主机名**：`metadata.google.internal`、`metadata.goog`
- **保留地址、多播地址和未指定地址**

SSRF 防护始终开启，且不能禁用。DNS 解析失败会按阻止处理，也就是 fail-closed。每一次重定向跳转都会重新校验，避免通过重定向绕过限制。

### Tirith 执行前安全扫描

Hermes 集成了 [tirith](https://github.com/sheeki03/tirith)，在命令执行前进行内容级安全扫描。Tirith 能发现单纯模式匹配容易漏掉的威胁，例如：

- 同形异义字符 URL 欺骗（国际化域名攻击）
- 管道到解释器的执行模式（`curl | bash`、`wget | sh`）
- 终端注入攻击

首次使用时，Tirith 会从 GitHub Releases 自动安装，并校验 SHA-256 校验和；如果系统安装了 cosign，还会校验 provenance。

```yaml
# 写入 ~/.hermes/config.yaml
security:
  tirith_enabled: true       # 启用 / 禁用 tirith 扫描（默认：true）
  tirith_path: "tirith"      # tirith 二进制路径（默认从 PATH 查找）
  tirith_timeout: 5          # 子进程超时秒数
  tirith_fail_open: true     # tirith 不可用时仍允许执行（默认：true）
```

当 `tirith_fail_open` 为 `true`（默认）时，如果 tirith 没装、不可用或超时，命令仍会继续。高安全场景下可以把它设为 `false`，这样 tirith 无法验证时命令会被阻止。

Tirith 的扫描结论会接入审批流程：安全命令直接通过；可疑命令与已阻止命令都会触发用户审批，并附带 tirith 的完整发现结果（严重级别、标题、说明、更安全的替代方案）。用户可自行批准或拒绝，默认选项是拒绝，以保护无人值守场景。

### 上下文文件注入防护

上下文文件（`AGENTS.md`、`.cursorrules`、`SOUL.md`）在被纳入 system prompt 之前，会先接受提示词注入扫描。扫描器会检查：

- 指示忽略 / 无视先前指令的内容
- 带可疑关键词的隐藏 HTML 注释
- 读取密钥文件的尝试（`.env`、`credentials`、`.netrc`）
- 通过 `curl` 外传凭据的模式
- 不可见 Unicode 字符（零宽空格、双向覆盖字符）

若文件被拦截，会显示类似下面的警告：

```
[BLOCKED: AGENTS.md contained potential prompt injection (prompt_injection). Content not loaded.]
```

## 生产部署最佳实践

### Gateway 部署检查清单

1. **设置明确的允许列表**：生产环境中不要使用 `GATEWAY_ALLOW_ALL_USERS=true`
2. **使用容器后端**：在 `config.yaml` 中设置 `terminal.backend: docker`
3. **限制资源配额**：设置合适的 CPU、内存和磁盘限制
4. **安全存储密钥**：将 API key 保存到 `~/.hermes/.env`，并设置正确的文件权限
5. **启用私聊配对**：尽量用配对码，而不是硬编码用户 ID
6. **审查命令允许列表**：定期检查 `config.yaml` 中的 `command_allowlist`
7. **设置 `MESSAGING_CWD`**：不要让智能体在敏感目录中运行
8. **避免用 root 运行**：gateway 不要以 root 身份启动
9. **监控日志**：检查 `~/.hermes/logs/` 中的未授权访问记录
10. **保持更新**：定期执行 `hermes update` 获取安全修复

### 保护 API 密钥

```bash
# 为 .env 文件设置正确权限
chmod 600 ~/.hermes/.env

# 不同服务使用不同密钥
# 不要把 .env 提交到版本控制
```

### 网络隔离

如果需要更高安全级别，可以把 gateway 运行在单独的机器或虚拟机上：

```yaml
terminal:
  backend: ssh
  ssh_host: "agent-worker.local"
  ssh_user: "hermes"
  ssh_key: "~/.ssh/hermes_agent_key"
```

这样可以把 gateway 的消息连接与智能体的命令执行隔离开来。
