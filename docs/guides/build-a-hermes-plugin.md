---
title: "构建 Hermes 插件"
---
# 构建 Hermes 插件

本指南演示如何从头构建一个完整的 Hermes 插件。完成后你会得到一个可运行的插件，包含多个工具、生命周期钩子、随包分发的数据文件，以及捆绑的技能——插件系统支持的功能全部覆盖。

## 我们要做什么

一个**计算器**插件，包含两个工具：
- `calculate` — 计算数学表达式（`2**16`、`sqrt(144)`、`pi * 5**2`）
- `unit_convert` — 单位换算（`100 F → 37.78 C`、`5 km → 3.11 mi`）

外加一个记录每次工具调用的钩子，以及一个捆绑的技能文件。

## 第 1 步：创建插件目录

```bash
mkdir -p ~/.hermes/plugins/calculator
cd ~/.hermes/plugins/calculator
```

## 第 2 步：编写清单文件

创建 `plugin.yaml`：

```yaml
name: calculator
version: 1.0.0
description: Math calculator — evaluate expressions and convert units
provides_tools:
  - calculate
  - unit_convert
provides_hooks:
  - post_tool_call
```

这告诉 Hermes："我是一个叫 calculator 的插件，我提供工具和钩子。" `provides_tools` 和 `provides_hooks` 是插件注册内容的列表。

可选字段示例：
```yaml
author: Your Name
requires_env:          # 按环境变量控制是否加载；安装时会提示用户
  - SOME_API_KEY       # 简单格式——变量缺失则禁用插件
  - name: OTHER_KEY    # 富格式——安装时显示描述和链接
    description: "Key for the Other service"
    url: "https://other.com/keys"
    secret: true
```

## 第 3 步：编写工具 Schema

创建 `schemas.py`——LLM 读取这个文件来判断何时调用你的工具：

```python
"""工具 Schema——LLM 看到的是这些内容。"""

CALCULATE = {
    "name": "calculate",
    "description": (
        "Evaluate a mathematical expression and return the result. "
        "Supports arithmetic (+, -, *, /, **), functions (sqrt, sin, cos, "
        "log, abs, round, floor, ceil), and constants (pi, e). "
        "Use this for any math the user asks about."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Math expression to evaluate (e.g., '2**10', 'sqrt(144)')",
            },
        },
        "required": ["expression"],
    },
}

UNIT_CONVERT = {
    "name": "unit_convert",
    "description": (
        "Convert a value between units. Supports length (m, km, mi, ft, in), "
        "weight (kg, lb, oz, g), temperature (C, F, K), data (B, KB, MB, GB, TB), "
        "and time (s, min, hr, day)."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "value": {
                "type": "number",
                "description": "The numeric value to convert",
            },
            "from_unit": {
                "type": "string",
                "description": "Source unit (e.g., 'km', 'lb', 'F', 'GB')",
            },
            "to_unit": {
                "type": "string",
                "description": "Target unit (e.g., 'mi', 'kg', 'C', 'MB')",
            },
        },
        "required": ["value", "from_unit", "to_unit"],
    },
}
```

**Schema 为什么重要：** `description` 字段决定 LLM 何时调用你的工具。写清楚它做什么、适用什么场景。`parameters` 定义 LLM 传入的参数。

## 第 4 步：编写工具处理函数

创建 `tools.py`——LLM 调用工具时实际执行的代码：

```python
"""工具处理函数——LLM 调用各工具时运行的代码。"""

import json
import math

# eval 的安全全局变量——禁止文件和网络访问
_SAFE_MATH = {
    "abs": abs, "round": round, "min": min, "max": max,
    "pow": pow, "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos,
    "tan": math.tan, "log": math.log, "log2": math.log2, "log10": math.log10,
    "floor": math.floor, "ceil": math.ceil,
    "pi": math.pi, "e": math.e,
    "factorial": math.factorial,
}


def calculate(args: dict, **kwargs) -> str:
    """安全地计算数学表达式。

    处理函数规范：
    1. 接收 args（dict）——LLM 传入的参数
    2. 执行逻辑
    3. 返回 JSON 字符串——无论成功还是出错都必须返回
    4. 接受 **kwargs 以保持前向兼容
    """
    expression = args.get("expression", "").strip()
    if not expression:
        return json.dumps({"error": "No expression provided"})

    try:
        result = eval(expression, {"__builtins__": {}}, _SAFE_MATH)
        return json.dumps({"expression": expression, "result": result})
    except ZeroDivisionError:
        return json.dumps({"expression": expression, "error": "Division by zero"})
    except Exception as e:
        return json.dumps({"expression": expression, "error": f"Invalid: {e}"})


# 换算表——值为基准单位倍数
_LENGTH = {"m": 1, "km": 1000, "mi": 1609.34, "ft": 0.3048, "in": 0.0254, "cm": 0.01}
_WEIGHT = {"kg": 1, "g": 0.001, "lb": 0.453592, "oz": 0.0283495}
_DATA = {"B": 1, "KB": 1024, "MB": 1024**2, "GB": 1024**3, "TB": 1024**4}
_TIME = {"s": 1, "ms": 0.001, "min": 60, "hr": 3600, "day": 86400}


def _convert_temp(value, from_u, to_u):
    # 先统一换算到摄氏度
    c = {"F": (value - 32) * 5/9, "K": value - 273.15}.get(from_u, value)
    # 再换算到目标单位
    return {"F": c * 9/5 + 32, "K": c + 273.15}.get(to_u, c)


def unit_convert(args: dict, **kwargs) -> str:
    """单位换算。"""
    value = args.get("value")
    from_unit = args.get("from_unit", "").strip()
    to_unit = args.get("to_unit", "").strip()

    if value is None or not from_unit or not to_unit:
        return json.dumps({"error": "Need value, from_unit, and to_unit"})

    try:
        # 温度换算
        if from_unit.upper() in {"C","F","K"} and to_unit.upper() in {"C","F","K"}:
            result = _convert_temp(float(value), from_unit.upper(), to_unit.upper())
            return json.dumps({"input": f"{value} {from_unit}", "result": round(result, 4),
                             "output": f"{round(result, 4)} {to_unit}"})

        # 比例换算
        for table in (_LENGTH, _WEIGHT, _DATA, _TIME):
            lc = {k.lower(): v for k, v in table.items()}
            if from_unit.lower() in lc and to_unit.lower() in lc:
                result = float(value) * lc[from_unit.lower()] / lc[to_unit.lower()]
                return json.dumps({"input": f"{value} {from_unit}",
                                 "result": round(result, 6),
                                 "output": f"{round(result, 6)} {to_unit}"})

        return json.dumps({"error": f"Cannot convert {from_unit} → {to_unit}"})
    except Exception as e:
        return json.dumps({"error": f"Conversion failed: {e}"})
```

**处理函数的关键规范：**
1. **函数签名：** `def my_handler(args: dict, **kwargs) -> str`
2. **返回值：** 必须是 JSON 字符串，成功和错误都一样
3. **不能抛出异常：** 捕获所有异常，改为返回错误 JSON
4. **接受 `**kwargs`：** Hermes 将来可能会传入额外上下文

## 第 5 步：编写注册入口

创建 `__init__.py`——将 Schema 与处理函数连接起来：

```python
"""Calculator 插件——注册入口。"""

import logging

from . import schemas, tools

logger = logging.getLogger(__name__)

# 通过钩子追踪工具使用情况
_call_log = []

def _on_post_tool_call(tool_name, args, result, task_id, **kwargs):
    """钩子：每次工具调用后触发（不限于本插件的工具）。"""
    _call_log.append({"tool": tool_name, "session": task_id})
    if len(_call_log) > 100:
        _call_log.pop(0)
    logger.debug("Tool called: %s (session %s)", tool_name, task_id)


def register(ctx):
    """将 Schema 绑定到处理函数，并注册钩子。"""
    ctx.register_tool(name="calculate",    toolset="calculator",
                      schema=schemas.CALCULATE,    handler=tools.calculate)
    ctx.register_tool(name="unit_convert", toolset="calculator",
                      schema=schemas.UNIT_CONVERT, handler=tools.unit_convert)

    # 此钩子对所有工具调用触发，不只是本插件的工具
    ctx.register_hook("post_tool_call", _on_post_tool_call)
```

**`register()` 做了什么：**
- 启动时只调用一次
- `ctx.register_tool()` 将工具写入注册表——模型立刻可以看到
- `ctx.register_hook()` 订阅生命周期事件
- `ctx.register_cli_command()` 注册 CLI 子命令（如 `hermes my-plugin <subcommand>`）
- 此函数崩溃时，该插件会被禁用，Hermes 继续正常运行

## 第 6 步：测试

启动 Hermes：

```bash
hermes
```

启动信息栏的工具列表里应该能看到 `calculator: calculate, unit_convert`。

试试这几个提示词：
```
What's 2 to the power of 16?
Convert 100 fahrenheit to celsius
What's the square root of 2 times pi?
How many gigabytes is 1.5 terabytes?
```

查看插件状态：
```
/plugins
```

输出：
```
Plugins (1):
  ✓ calculator v1.0.0 (2 tools, 1 hooks)
```

## 插件的最终结构

```
~/.hermes/plugins/calculator/
├── plugin.yaml      # "我是 calculator，我提供工具和钩子"
├── __init__.py      # 连接：Schema → 处理函数，注册钩子
├── schemas.py       # LLM 读取的内容（描述 + 参数规格）
└── tools.py         # 实际运行的代码（calculate、unit_convert 函数）
```

四个文件，职责清晰：
- **清单** 声明插件是什么
- **Schema** 向 LLM 描述工具
- **处理函数** 实现具体逻辑
- **注册入口** 把一切串联起来

## 插件还能做什么？

### 随包分发数据文件

把文件放进插件目录，导入时读取即可：

```python
# 在 tools.py 或 __init__.py 中
from pathlib import Path

_PLUGIN_DIR = Path(__file__).parent
_DATA_FILE = _PLUGIN_DIR / "data" / "languages.yaml"

with open(_DATA_FILE) as f:
    _DATA = yaml.safe_load(f)
```

### 捆绑技能文件

包含一个 `skill.md` 文件，在注册时安装：

```python
import shutil
from pathlib import Path

def _install_skill():
    """首次加载时将技能复制到 ~/.hermes/skills/。"""
    try:
        from hermes_cli.config import get_hermes_home
        dest = get_hermes_home() / "skills" / "my-plugin" / "SKILL.md"
    except Exception:
        dest = Path.home() / ".hermes" / "skills" / "my-plugin" / "SKILL.md"

    if dest.exists():
        return  # 不覆盖用户的自定义修改

    source = Path(__file__).parent / "skill.md"
    if source.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, dest)

def register(ctx):
    ctx.register_tool(...)
    _install_skill()
```

### 通过环境变量控制加载

插件需要 API 密钥时：

```yaml
# plugin.yaml——简单格式（向后兼容）
requires_env:
  - WEATHER_API_KEY
```

`WEATHER_API_KEY` 未设置时，插件会被禁用并给出清晰提示，不会崩溃，Agent 也不会报错——只会显示 "Plugin weather disabled (missing: WEATHER_API_KEY)"。

用户运行 `hermes plugins install` 时，会**交互式地**提示填写 `requires_env` 中缺少的变量，并自动保存到 `.env`。

想要更好的安装体验，可以用富格式，带上描述和注册链接：

```yaml
# plugin.yaml——富格式
requires_env:
  - name: WEATHER_API_KEY
    description: "API key for OpenWeather"
    url: "https://openweathermap.org/api"
    secret: true
```

| 字段 | 是否必填 | 说明 |
|------|----------|------|
| `name` | 是 | 环境变量名 |
| `description` | 否 | 安装提示时显示给用户 |
| `url` | 否 | 获取凭据的链接 |
| `secret` | 否 | 为 `true` 时输入内容隐藏（类似密码框） |

两种格式可以在同一列表中混用。已设置的变量会被静默跳过。

### 条件性工具可用性

对依赖可选库的工具：

```python
ctx.register_tool(
    name="my_tool",
    schema={...},
    handler=my_handler,
    check_fn=lambda: _has_optional_lib(),  # 返回 False 则工具对模型不可见
)
```

### 注册多个钩子

```python
def register(ctx):
    ctx.register_hook("pre_tool_call", before_any_tool)
    ctx.register_hook("post_tool_call", after_any_tool)
    ctx.register_hook("pre_llm_call", inject_memory)
    ctx.register_hook("on_session_start", on_new_session)
    ctx.register_hook("on_session_end", on_session_end)
```

### 钩子参考

每个钩子的完整文档见 **[事件钩子参考](/user-guide/features/hooks#plugin-hooks)**——回调签名、参数表、触发时机和示例都在那里。下面是摘要：

| 钩子 | 触发时机 | 回调签名 | 返回值 |
|------|---------|---------|--------|
| [`pre_tool_call`](/user-guide/features/hooks#pre_tool_call) | 任意工具执行前 | `tool_name: str, args: dict, task_id: str` | 忽略 |
| [`post_tool_call`](/user-guide/features/hooks#post_tool_call) | 任意工具返回后 | `tool_name: str, args: dict, result: str, task_id: str` | 忽略 |
| [`pre_llm_call`](/user-guide/features/hooks#pre_llm_call) | 每轮一次，工具调用循环开始前 | `session_id: str, user_message: str, conversation_history: list, is_first_turn: bool, model: str, platform: str` | [上下文注入](#pre_llm_call-context-injection) |
| [`post_llm_call`](/user-guide/features/hooks#post_llm_call) | 每轮一次，工具调用循环结束后（仅成功轮次） | `session_id: str, user_message: str, assistant_response: str, conversation_history: list, model: str, platform: str` | 忽略 |
| [`on_session_start`](/user-guide/features/hooks#on_session_start) | 新会话创建（仅第一轮） | `session_id: str, model: str, platform: str` | 忽略 |
| [`on_session_end`](/user-guide/features/hooks#on_session_end) | 每次 `run_conversation` 调用结束 + CLI 退出 | `session_id: str, completed: bool, interrupted: bool, model: str, platform: str` | 忽略 |
| [`pre_api_request`](/user-guide/features/hooks#pre_api_request) | 每次向 LLM 提供商发起 HTTP 请求前 | `method: str, url: str, headers: dict, body: dict` | 忽略 |
| [`post_api_request`](/user-guide/features/hooks#post_api_request) | 每次收到 LLM 提供商的 HTTP 响应后 | `method: str, url: str, status_code: int, response: dict` | 忽略 |

绝大多数钩子是只读观察者——返回值被忽略。唯一例外是 `pre_llm_call`，它可以向对话注入上下文。

所有回调都应接受 `**kwargs` 以保持前向兼容。某个钩子回调崩溃时，会被记录日志并跳过，其他钩子和 Agent 继续正常运行。

### `pre_llm_call` 上下文注入

这是唯一返回值有意义的钩子。`pre_llm_call` 回调返回带有 `"context"` 键的 dict（或纯字符串）时，Hermes 会将该文本追加到**当前轮的用户消息**中。记忆插件、RAG 集成、护栏，以及任何需要向模型提供额外上下文的插件，都依赖这个机制。

#### 返回格式

```python
# 带 context 键的 dict
return {"context": "Recalled memories:\n- User prefers dark mode\n- Last project: hermes-agent"}

# 纯字符串（等同于上面的 dict 形式）
return "Recalled memories:\n- User prefers dark mode"

# 返回 None 或不返回 → 不注入（纯观察模式）
return None
```

任何非 None、非空、带有 `"context"` 键（或为非空纯字符串）的返回值，都会被收集并追加到当前轮的用户消息中。

#### 注入机制说明

注入的上下文追加在**用户消息**中，而不是系统提示里。这是有意为之的设计：

- **保留提示词缓存**——系统提示在每轮之间保持不变。Anthropic 和 OpenRouter 会缓存系统提示前缀，保持稳定可以在多轮对话中节省 75% 以上的输入 token。如果插件修改系统提示，每轮都会导致缓存失效。
- **临时性**——注入只在 API 调用时发生，对话历史中的原始用户消息不会被修改，也不会持久化到会话数据库。
- **系统提示是 Hermes 的领地**——其中包含针对特定模型的指引、工具执行规则、个性化指令和缓存的技能内容。插件在用户输入旁边提供上下文，而不是修改 Agent 的核心指令。

#### 示例：记忆召回插件

```python
"""记忆插件——从向量库中召回相关上下文。"""

import httpx

MEMORY_API = "https://your-memory-api.example.com"


def recall_context(session_id, user_message, is_first_turn, **kwargs):
    """每轮 LLM 调用前触发，返回召回的记忆。"""
    try:
        resp = httpx.post(f"{MEMORY_API}/recall", json={
            "session_id": session_id,
            "query": user_message,
        }, timeout=3)
        memories = resp.json().get("results", [])
        if not memories:
            return None  # 没有可注入的内容

        text = "Recalled context from previous sessions:\n"
        text += "\n".join(f"- {m['text']}" for m in memories)
        return {"context": text}
    except Exception:
        return None  # 静默失败，不影响 Agent

def register(ctx):
    ctx.register_hook("pre_llm_call", recall_context)
```

#### 示例：护栏插件

```python
"""护栏插件——强制执行内容策略。"""

POLICY = """You MUST follow these content policies for this session:
- Never generate code that accesses the filesystem outside the working directory
- Always warn before executing destructive operations
- Refuse requests involving personal data extraction"""

def inject_guardrails(**kwargs):
    """每轮都注入策略文本。"""
    return {"context": POLICY}

def register(ctx):
    ctx.register_hook("pre_llm_call", inject_guardrails)
```

#### 示例：纯观察模式钩子（不注入）

```python
"""数据分析插件——追踪轮次元数据，不注入上下文。"""

import logging
logger = logging.getLogger(__name__)

def log_turn(session_id, user_message, model, is_first_turn, **kwargs):
    """每次 LLM 调用前触发，返回 None——不注入上下文。"""
    logger.info("Turn: session=%s model=%s first=%s msg_len=%d",
                session_id, model, is_first_turn, len(user_message or ""))
    # 不返回 → 不注入

def register(ctx):
    ctx.register_hook("pre_llm_call", log_turn)
```

#### 多个插件同时返回上下文

多个插件都从 `pre_llm_call` 返回上下文时，它们的输出会以双换行符拼接，一起追加到用户消息中。顺序按插件目录名的字母顺序排列。

### 注册 CLI 命令

插件可以添加自己的 `hermes <plugin>` 子命令树：

```python
def _my_command(args):
    """hermes my-plugin <subcommand> 的处理函数。"""
    sub = getattr(args, "my_command", None)
    if sub == "status":
        print("All good!")
    elif sub == "config":
        print("Current config: ...")
    else:
        print("Usage: hermes my-plugin <status|config>")

def _setup_argparse(subparser):
    """构建 hermes my-plugin 的 argparse 子命令树。"""
    subs = subparser.add_subparsers(dest="my_command")
    subs.add_parser("status", help="Show plugin status")
    subs.add_parser("config", help="Show plugin config")
    subparser.set_defaults(func=_my_command)

def register(ctx):
    ctx.register_tool(...)
    ctx.register_cli_command(
        name="my-plugin",
        help="Manage my plugin",
        setup_fn=_setup_argparse,
        handler_fn=_my_command,
    )
```

注册完成后，用户可以运行 `hermes my-plugin status`、`hermes my-plugin config` 等命令。

**记忆提供商插件**不走这套，而是用基于约定的方式：在插件的 `cli.py` 文件中添加 `register_cli(subparser)` 函数，记忆插件发现系统会自动找到它，不需要调用 `ctx.register_cli_command()`。详见[记忆提供商插件指南](/developer-guide/memory-provider-plugin#adding-cli-commands)。

**活跃提供商隔离：** 记忆插件的 CLI 命令只在该提供商是配置中激活的 `memory.provider` 时才显示。用户没有设置你的提供商时，你的 CLI 命令不会出现在帮助输出中。

### 通过 pip 分发

公开分享插件时，在 Python 包中添加入口点：

```toml
# pyproject.toml
[project.entry-points."hermes_agent.plugins"]
my-plugin = "my_plugin_package"
```

```bash
pip install hermes-plugin-calculator
# 下次启动 hermes 时自动发现插件
```

## 常见错误

**处理函数未返回 JSON 字符串：**
```python
# 错误——返回了 dict
def handler(args, **kwargs):
    return {"result": 42}

# 正确——返回 JSON 字符串
def handler(args, **kwargs):
    return json.dumps({"result": 42})
```

**函数签名缺少 `**kwargs`：**
```python
# 错误——Hermes 传入额外上下文时会报错
def handler(args):
    ...

# 正确
def handler(args, **kwargs):
    ...
```

**处理函数抛出异常：**
```python
# 错误——异常向上传播，工具调用失败
def handler(args, **kwargs):
    result = 1 / int(args["value"])  # ZeroDivisionError!
    return json.dumps({"result": result})

# 正确——捕获异常，返回错误 JSON
def handler(args, **kwargs):
    try:
        result = 1 / int(args.get("value", 0))
        return json.dumps({"result": result})
    except Exception as e:
        return json.dumps({"error": str(e)})
```

**Schema 描述过于模糊：**
```python
# 差——模型不知道什么时候用
"description": "Does stuff"

# 好——模型清楚知道何时使用、如何使用
"description": "Evaluate a mathematical expression. Use for arithmetic, trig, logarithms. Supports: +, -, *, /, **, sqrt, sin, cos, log, pi, e."
```
