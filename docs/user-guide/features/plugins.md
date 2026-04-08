---
title: "插件"
---
# 插件

Hermes Agent 提供了一套插件系统，让你无需修改核心代码就能添加自定义工具、钩子和集成。

**→ [构建 Hermes 插件](https://hermes-agent.nousresearch.com/docs/guides/build-a-hermes-plugin)** — 含完整可运行示例的分步指南。

## 快速概览

在 `~/.hermes/plugins/` 下放入一个包含 `plugin.yaml` 和 Python 代码的目录：

```
~/.hermes/plugins/my-plugin/
├── plugin.yaml      # manifest
├── __init__.py      # register() — 将 schema 绑定到处理函数
├── schemas.py       # 工具 schema（LLM 看到的内容）
└── tools.py         # 工具处理函数（调用时实际执行的代码）
```

启动 Hermes，你的工具会和内置工具一起出现，模型可以立即调用它们。

### 最小可运行示例

下面是一个完整的插件示例，它添加了一个 `hello_world` 工具，并通过钩子记录每次工具调用。

**`~/.hermes/plugins/hello-world/plugin.yaml`**

```yaml
name: hello-world
version: "1.0"
description: A minimal example plugin
```

**`~/.hermes/plugins/hello-world/__init__.py`**

```python
"""最小 Hermes 插件 — 注册一个工具和一个钩子。"""


def register(ctx):
    # --- 工具：hello_world ---
    schema = {
        "name": "hello_world",
        "description": "Returns a friendly greeting for the given name.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name to greet",
                }
            },
            "required": ["name"],
        },
    }

    def handle_hello(params):
        name = params.get("name", "World")
        return f"Hello, {name}! 👋  (from the hello-world plugin)"

    ctx.register_tool("hello_world", schema, handle_hello)

    # --- 钩子：记录每次工具调用 ---
    def on_tool_call(tool_name, params, result):
        print(f"[hello-world] tool called: {tool_name}")

    ctx.register_hook("post_tool_call", on_tool_call)
```

将两个文件都放入 `~/.hermes/plugins/hello-world/`，重启 Hermes，模型即可立即调用 `hello_world`。每次工具调用后，钩子都会打印一行日志。

默认情况下，`./.hermes/plugins/` 下的项目本地插件是禁用的。只有对受信任的仓库，才通过在启动 Hermes 前设置 `HERMES_ENABLE_PROJECT_PLUGINS=true` 来启用它们。

## 插件能做什么

| 能力 | 方式 |
|-----------|-----|
| 添加工具 | `ctx.register_tool(name, schema, handler)` |
| 添加钩子 | `ctx.register_hook("post_tool_call", callback)` |
| 添加 CLI 命令 | `ctx.register_cli_command(name, help, setup_fn, handler_fn)` — 添加 `hermes  ` |
| 注入消息 | `ctx.inject_message(content, role="user")` — 参见 [注入消息](#注入消息) |
| 附带数据文件 | `Path(__file__).parent / "data" / "file.yaml"` |
| 打包技能 | 加载时将 `skill.md` 复制到 `~/.hermes/skills/` |
| 依赖环境变量 | 在 plugin.yaml 中设置 `requires_env: [API_KEY]` — 在 `hermes plugins install` 时提示输入 |
| 通过 pip 分发 | `[project.entry-points."hermes_agent.plugins"]` |

## 插件发现机制

| 来源 | 路径 | 适用场景 |
|--------|------|----------|
| 用户 | `~/.hermes/plugins/` | 个人插件 |
| 项目 | `.hermes/plugins/` | 项目专属插件（需要 `HERMES_ENABLE_PROJECT_PLUGINS=true`） |
| pip | `hermes_agent.plugins` entry_points | 分发包 |

## 可用钩子

插件可以为这些生命周期事件注册回调。完整的细节、回调签名和示例请参见 **[事件钩子页面](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks#plugin-hooks)**。

| 钩子 | 触发时机 |
|------|-----------|
| [`pre_tool_call`](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks#pre_tool_call) | 任意工具执行前 |
| [`post_tool_call`](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks#post_tool_call) | 任意工具返回后 |
| [`pre_llm_call`](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks#pre_llm_call) | 每轮次一次，LLM 循环前 — 可返回 `{"context": "..."}` 以[向用户消息注入上下文](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks#pre_llm_call) |
| [`post_llm_call`](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks#post_llm_call) | 每轮次一次，LLM 循环后（仅成功轮次） |
| [`on_session_start`](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks#on_session_start) | 新会话创建时（仅第一轮次） |
| [`on_session_end`](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks#on_session_end) | 每次 `run_conversation` 调用结束时 + CLI 退出处理器 |

## 管理插件

```bash
hermes plugins                  # 交互式切换 UI — 用复选框启用/禁用
hermes plugins list             # 以表格形式显示启用/禁用状态
hermes plugins install user/repo  # 从 Git 安装
hermes plugins update my-plugin   # 拉取最新版本
hermes plugins remove my-plugin   # 卸载
hermes plugins enable my-plugin   # 重新启用已禁用的插件
hermes plugins disable my-plugin  # 禁用但不删除
```

不带参数运行 `hermes plugins` 会启动一个交互式 curses 复选列表（与 `hermes tools` 的 UI 相同），你可以用方向键和空格键切换插件的启用状态。

禁用的插件保持已安装状态，但在加载时会被跳过。禁用列表存储在 `config.yaml` 的 `plugins.disabled` 下：

```yaml
plugins:
  disabled:
    - my-noisy-plugin
```

在运行中的会话里，`/plugins` 会显示当前已加载的插件。

## 注入消息

插件可以使用 `ctx.inject_message()` 向活跃对话中注入消息：

```python
ctx.inject_message("New data arrived from the webhook", role="user")
```

**签名：** `ctx.inject_message(content: str, role: str = "user") -> bool`

工作原理：

- 如果智能体处于**空闲**状态（等待用户输入），消息会被排队为下一条输入，并开启新的轮次。
- 如果智能体正处于**执行中**（正在运行），消息会中断当前操作 — 效果等同于用户输入新消息并按下回车。
- 对于非 `"user"` 角色，内容会加上 `[role]` 前缀（例如 `[system] ...`）。
- 如果消息成功入队则返回 `True`，如果没有 CLI 引用则返回 `False`（例如在 gateway 模式下）。

这使得远程控制端、消息桥接器、Webhook 接收器等插件能够从外部来源向对话注入消息。

:::note
`inject_message` 仅在 CLI 模式下可用。在 gateway 模式下，没有 CLI 引用，方法返回 `False`。
:::

完整的处理函数契约、schema 格式、钩子行为、错误处理和常见错误，请参见 **[完整指南](https://hermes-agent.nousresearch.com/docs/guides/build-a-hermes-plugin)**。
