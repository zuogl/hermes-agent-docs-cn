---
title: "工具集参考"
---
# 工具集参考

工具集是按名称分组的工具包，用于控制 agent 可执行的操作。它是按平台、按 session 或按任务配置工具可用性的主要机制。

## 工具集的工作原理

每个工具都属于且仅属于一个工具集。启用某个工具集后，该包中的所有工具对 agent 即可用。工具集分为三种类型：

- **核心（Core）** —— 一组相关工具的逻辑集合（例如，`file` 包含 `read_file`、`write_file`、`patch`、`search_files`）
- **复合（Composite）** —— 为常见场景组合多个核心工具集（例如，`debugging` 包含文件、终端和 Web 工具）
- **平台（Platform）** —— 面向特定部署场景的完整工具配置（例如，`hermes-cli` 是交互式 CLI 会话的默认配置）

## 配置工具集

### 按 session（CLI）

```bash
hermes chat --toolsets web,file,terminal
hermes chat --toolsets debugging        # 复合 —— 展开为 file + terminal + web
hermes chat --toolsets all              # 全部工具集
```

### 按平台（config.yaml）

```yaml
toolsets:
  - hermes-cli          # CLI 的默认配置
  # - hermes-telegram   # Telegram 网关的覆盖配置
```

### 交互式管理

```bash
hermes tools                            # curses 界面，按平台启用/禁用工具集
```

或在 session 中执行命令：

```
/tools list
/tools disable browser
/tools enable rl
```

## 核心工具集

| 工具集 | 工具 | 用途 |
|---------|-------|---------|
| `browser` | `browser_back`, `browser_click`, `browser_console`, `browser_get_images`, `browser_navigate`, `browser_press`, `browser_scroll`, `browser_snapshot`, `browser_type`, `browser_vision`, `web_search` | 完整的浏览器自动化。包含 `web_search` 作为快速查找的备用方案。 |
| `clarify` | `clarify` | 当 agent 需要进一步说明时，向用户提问。 |
| `code_execution` | `execute_code` | 以编程方式运行调用 Hermes 工具的 Python 脚本。 |
| `cronjob` | `cronjob` | 调度和管理定期任务。 |
| `delegation` | `delegate_task` | 生成隔离的子 agent 实例以并行执行任务。 |
| `file` | `patch`, `read_file`, `search_files`, `write_file` | 文件的读取、写入、搜索和编辑。 |
| `homeassistant` | `ha_call_service`, `ha_get_state`, `ha_list_entities`, `ha_list_services` | 通过 Home Assistant 控制智能家居。仅在设置 `HASS_TOKEN` 时可用。 |
| `image_gen` | `image_generate` | 通过 FAL.ai 进行文字生图。 |
| `memory` | `memory` | 跨 session 的持久化 memory 管理。 |
| `messaging` | `send_message` | 在 session 内向其他平台（Telegram、Discord 等）发送消息。 |
| `moa` | `mixture_of_agents` | 通过 Mixture of Agents 实现多模型共识。 |
| `rl` | `rl_check_status`, `rl_edit_config`, `rl_get_current_config`, `rl_get_results`, `rl_list_environments`, `rl_list_runs`, `rl_select_environment`, `rl_start_training`, `rl_stop_training`, `rl_test_inference` | RL 训练环境管理（Atropos）。 |
| `search` | `web_search` | 仅 Web 搜索（不含内容提取）。 |
| `session_search` | `session_search` | 搜索历史会话记录。 |
| `skills` | `skill_manage`, `skill_view`, `skills_list` | skill 的增删改查与浏览。 |
| `terminal` | `process`, `terminal` | Shell 命令执行和后台进程管理。 |
| `todo` | `todo` | session 内的任务列表管理。 |
| `tts` | `text_to_speech` | 文字转语音音频生成。 |
| `vision` | `vision_analyze` | 通过具备视觉能力的模型进行图像分析。 |
| `web` | `web_extract`, `web_search` | Web 搜索和页面内容提取。 |

## 复合工具集

以下工具集会展开为多个核心工具集，为常见场景提供便捷的简写：

| 工具集 | 展开为 | 适用场景 |
|---------|-----------|----------|
| `debugging` | `patch`, `process`, `read_file`, `search_files`, `terminal`, `web_extract`, `web_search`, `write_file` | 调试 session —— 支持文件访问、终端和 Web 搜索，不含浏览器或委托代理的额外开销。 |
| `safe` | `image_generate`, `mixture_of_agents`, `vision_analyze`, `web_extract`, `web_search` | 只读研究和媒体生成。不可写文件、不可访问终端、不可执行代码。适用于不受信任或受限环境。 |

## 平台工具集

平台工具集为部署目标定义了完整的工具配置。大多数消息平台使用与 `hermes-cli` 相同的工具集：

| 工具集 | 与 `hermes-cli` 的差异 |
|---------|-------------------------------|
| `hermes-cli` | 完整工具集 —— 包含 38 个工具，含 `clarify`。交互式 CLI 会话的默认配置。 |
| `hermes-acp` | 去除了 `clarify`、`cronjob`、`image_generate`、`mixture_of_agents`、`send_message`、`text_to_speech` 及 homeassistant 工具。专注于 IDE 环境中的编码任务。 |
| `hermes-api-server` | 去除了 `clarify`、`send_message` 和 `text_to_speech`，保留其他所有工具 —— 适用于无法进行用户交互的程序化访问场景。 |
| `hermes-telegram` | 与 `hermes-cli` 相同。 |
| `hermes-discord` | 与 `hermes-cli` 相同。 |
| `hermes-slack` | 与 `hermes-cli` 相同。 |
| `hermes-whatsapp` | 与 `hermes-cli` 相同。 |
| `hermes-signal` | 与 `hermes-cli` 相同。 |
| `hermes-matrix` | 与 `hermes-cli` 相同。 |
| `hermes-mattermost` | 与 `hermes-cli` 相同。 |
| `hermes-email` | 与 `hermes-cli` 相同。 |
| `hermes-sms` | 与 `hermes-cli` 相同。 |
| `hermes-dingtalk` | 与 `hermes-cli` 相同。 |
| `hermes-feishu` | 与 `hermes-cli` 相同。 |
| `hermes-wecom` | 与 `hermes-cli` 相同。 |
| `hermes-bluebubbles` | 与 `hermes-cli` 相同。 |
| `hermes-homeassistant` | 与 `hermes-cli` 相同。 |
| `hermes-webhook` | 与 `hermes-cli` 相同。 |
| `hermes-gateway` | 所有消息平台工具集的并集。当网关需要最广泛的工具集时内部使用。 |

## 动态工具集

### MCP server 工具集

每个已配置的 MCP server 会在运行时生成一个 `mcp-` 工具集。例如，配置 `github` MCP server 后，会创建一个包含该服务器所有工具的 `mcp-github` 工具集。

```yaml
# config.yaml
mcp:
  servers:
    github:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-github"]
```

这将创建一个 `mcp-github` 工具集，可在 `--toolsets` 参数或平台配置中引用。

### 插件工具集

插件可在初始化期间通过 `ctx.register_tool()` 注册自己的工具集。这些工具集与内置工具集并列显示，可以用相同的方式启用或禁用。

### 自定义工具集

在 `config.yaml` 中定义自定义工具集，以创建项目专属的工具包：

```yaml
toolsets:
  - hermes-cli
custom_toolsets:
  data-science:
    - file
    - terminal
    - code_execution
    - web
    - vision
```

### 通配符

- `all` 或 `*` —— 展开为所有已注册的工具集（内置 + 动态 + 插件）

## 与 `hermes tools` 的关系

`hermes tools` 命令提供基于 curses 的界面，用于按平台切换单个工具的启用/禁用状态。此操作在工具级别生效（粒度比工具集更细），并持久化到 `config.yaml`。即使其所属工具集已启用，被禁用的工具仍会被过滤掉。

另请参阅：[工具参考](/reference/tools-reference)，了解所有单个工具及其参数的完整列表。
