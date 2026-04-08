---
title: "工具与工具集"
---
# 工具与工具集

工具（tool）是扩展智能体（agent）能力的函数，按功能分组为**工具集**（toolset），可按平台启用或禁用。

## 可用工具

Hermes Agent 内置了覆盖网页搜索、浏览器自动化、终端执行、文件编辑、记忆、任务委派、强化学习训练、消息推送、Home Assistant 等场景的丰富工具注册表。

:::note
**Honcho 跨会话记忆**以记忆提供商（memory provider）插件形式提供（`plugins/memory/honcho/`），而非内置工具集。安装方法参见 [插件](/user-guide/features/plugins)。
:::

主要分类：

| 分类 | 示例 | 说明 |
|------|------|------|
| **网页** | `web_search`、`web_extract` | 搜索网页并提取页面内容。 |
| **终端与文件** | `terminal`、`process`、`read_file`、`patch` | 执行命令并操作文件。 |
| **浏览器** | `browser_navigate`、`browser_snapshot`、`browser_vision` | 交互式浏览器自动化，支持文本与视觉模式。 |
| **媒体** | `vision_analyze`、`image_generate`、`text_to_speech` | 多模态分析与生成。 |
| **智能体编排** | `todo`、`clarify`、`execute_code`、`delegate_task` | 任务规划、澄清、代码执行与子智能体委派。 |
| **记忆与检索** | `memory`、`session_search` | 持久化记忆与会话搜索。 |
| **自动化与推送** | `cronjob`、`send_message` | 定时任务（支持创建/列出/更新/暂停/恢复/运行/删除操作）及消息外发推送。 |
| **集成** | `ha_*`、MCP 服务工具、`rl_*` | Home Assistant、MCP（Model Context Protocol）、强化学习训练及其他集成。 |

以代码为准的权威工具注册表请参见 [内置工具参考](https://hermes-agent.nousresearch.com/docs/reference/tools-reference) 和 [工具集参考](https://hermes-agent.nousresearch.com/docs/reference/toolsets-reference)。

## 使用工具集

```bash
# 使用指定工具集
hermes chat --toolsets "web,terminal"

# 查看所有可用工具
hermes tools

# 按平台配置工具（交互式）
hermes tools
```

常用工具集包括：`web`、`terminal`、`file`、`browser`、`vision`、`image_gen`、`moa`、`skills`、`tts`、`todo`、`memory`、`session_search`、`cronjob`、`code_execution`、`delegation`、`clarify`、`homeassistant`、`rl`。

完整工具集（含 `hermes-cli`、`hermes-telegram` 等平台预设，以及 `mcp-` 前缀的动态 MCP 工具集）请参见 [工具集参考](https://hermes-agent.nousresearch.com/docs/reference/toolsets-reference)。

## 终端后端

终端工具可在不同环境中执行命令：

| 后端 | 说明 | 适用场景 |
|------|------|---------|
| `local` | 在本机执行（默认） | 开发、可信任务 |
| `docker` | 隔离容器 | 安全隔离、可复现性 |
| `ssh` | 远程服务器 | 沙盒化、避免智能体修改自身代码 |
| `singularity` | HPC 容器 | 集群计算、无需 root 权限 |
| `modal` | 云端执行 | 无服务器、弹性扩缩容 |
| `daytona` | 云沙盒工作区 | 持久化远程开发环境 |

### 配置

```yaml
# 写入 ~/.hermes/config.yaml
terminal:
  backend: local    # 可选：docker、ssh、singularity、modal、daytona
  cwd: "."          # 工作目录
  timeout: 180      # 命令超时（秒）
```

### Docker 后端

```yaml
terminal:
  backend: docker
  docker_image: python:3.11-slim
```

### SSH 后端

推荐用于安全场景——智能体被隔离，无法修改自身代码：

```yaml
terminal:
  backend: ssh
```
```bash
# 在 ~/.hermes/.env 中设置凭据
TERMINAL_SSH_HOST=my-server.example.com
TERMINAL_SSH_USER=myuser
TERMINAL_SSH_KEY=~/.ssh/id_rsa
```

### Singularity/Apptainer

```bash
# 预构建 SIF 以支持并行 worker
apptainer build ~/python.sif docker://python:3.11-slim

# 配置
hermes config set terminal.backend singularity
hermes config set terminal.singularity_image ~/python.sif
```

### Modal（无服务器云）

```bash
uv pip install modal
modal setup
hermes config set terminal.backend modal
```

### 容器资源

为所有容器后端配置 CPU、内存、磁盘和持久化：

```yaml
terminal:
  backend: docker  # 或 singularity、modal、daytona
  container_cpu: 1              # CPU 核数（默认：1）
  container_memory: 5120        # 内存，单位 MB（默认：5GB）
  container_disk: 51200         # 磁盘，单位 MB（默认：50GB）
  container_persistent: true    # 跨会话持久化文件系统（默认：true）
```

设置 `container_persistent: true` 后，已安装的软件包、文件和配置将跨会话保留。

### 容器安全

所有容器后端均启用安全加固：

- 只读根文件系统（Docker）
- 丢弃全部 Linux capabilities
- 禁止权限提升
- PID 数量限制（256 个进程）
- 完整命名空间隔离
- 通过卷挂载实现持久化工作区，不使用可写根层

Docker 可通过 `terminal.docker_forward_env` 配置显式环境变量白名单。注意，转发的变量对容器内命令可见，应视为向该会话暴露。

## 后台进程管理

启动后台进程并对其进行管理：

```python
terminal(command="pytest -v tests/", background=true)
# 返回：{"session_id": "proc_abc123", "pid": 12345}

# 使用 process 工具管理进程：
process(action="list")       # 列出所有运行中的进程
process(action="poll", session_id="proc_abc123")   # 检查状态
process(action="wait", session_id="proc_abc123")   # 阻塞等待完成
process(action="log", session_id="proc_abc123")    # 获取完整输出
process(action="kill", session_id="proc_abc123")   # 终止进程
process(action="write", session_id="proc_abc123", data="y")  # 发送输入
```

PTY 模式（`pty=true`）支持 Codex、Claude Code 等交互式 CLI 工具。

## Sudo 支持

如果命令需要 sudo 权限，系统会提示你输入密码（密码在会话期间缓存）。也可在 `~/.hermes/.env` 中设置 `SUDO_PASSWORD`。

:::caution
在消息平台上，如果 sudo 失败，输出中会提示你将 `SUDO_PASSWORD` 添加到 `~/.hermes/.env`。
:::
