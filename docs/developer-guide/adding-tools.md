---
title: "添加工具"
---
# 添加工具

在开始编写工具之前，先问自己：**这个能力是否应该实现为[技能](/developer-guide/creating-skills)？**

如果能力可通过指令 + Shell 命令 + 现有工具来实现（如 arXiv 搜索、git 工作流、Docker 管理、PDF 处理），选用**技能**。

如果能力需要端到端集成 API 密钥、自定义处理逻辑、二进制数据处理或流式传输（如浏览器自动化、TTS、视觉分析），选用**工具**。

## 概述

添加一个工具需要修改 **3 个文件**：

1. **`tools/your_tool.py`** — 处理函数、Schema、可用性检查函数及 `registry.register()` 调用
2. **`toolsets.py`** — 将工具名称添加到 `_HERMES_CORE_TOOLS`（或某个特定工具集）
3. **`model_tools.py`** — 在 `_discover_tools()` 列表中添加 `"tools.your_tool"`

## 第一步：创建工具文件

每个工具文件都遵循相同的结构：

```python
# tools/weather_tool.py
"""Weather Tool -- look up current weather for a location."""

import json
import os
import logging

logger = logging.getLogger(__name__)


# --- 可用性检查 ---

def check_weather_requirements() -> bool:
    """如果工具依赖已就绪，返回 True。"""
    return bool(os.getenv("WEATHER_API_KEY"))


# --- 处理函数 ---

def weather_tool(location: str, units: str = "metric") -> str:
    """获取指定地点的天气，返回 JSON 字符串。"""
    api_key = os.getenv("WEATHER_API_KEY")
    if not api_key:
        return json.dumps({"error": "WEATHER_API_KEY not configured"})
    try:
        # ... 调用天气 API ...
        return json.dumps({"location": location, "temp": 22, "units": units})
    except Exception as e:
        return json.dumps({"error": str(e)})


# --- Schema ---

WEATHER_SCHEMA = {
    "name": "weather",
    "description": "Get current weather for a location.",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "City name or coordinates (e.g. 'London' or '51.5,-0.1')"
            },
            "units": {
                "type": "string",
                "enum": ["metric", "imperial"],
                "description": "Temperature units (default: metric)",
                "default": "metric"
            }
        },
        "required": ["location"]
    }
}


# --- 注册 ---

from tools.registry import registry

registry.register(
    name="weather",
    toolset="weather",
    schema=WEATHER_SCHEMA,
    handler=lambda args, **kw: weather_tool(
        location=args.get("location", ""),
        units=args.get("units", "metric")),
    check_fn=check_weather_requirements,
    requires_env=["WEATHER_API_KEY"],
)
```

### 关键规则

> ⚠️ **重要**：
> - 处理函数**必须**通过 `json.dumps()` 返回 JSON 字符串，不可返回原始字典
> - 错误**必须**以 `{"error": "message"}` 形式返回，不可抛出异常
> - `check_fn` 在构建工具定义时被调用——若返回 `False`，该工具会被静默跳过
> - `handler` 接收 `(args: dict, **kwargs)`，其中 `args` 是 LLM 的工具调用参数

## 第二步：添加到工具集

在 `toolsets.py` 中添加工具名称：

```python
# 如果需要在所有平台（CLI + 消息）上可用：
_HERMES_CORE_TOOLS = [
    ...
    "weather",  # <-- 在此添加
]

# 或者创建一个新的独立工具集：
"weather": {
    "description": "Weather lookup tools",
    "tools": ["weather"],
    "includes": []
},
```

## 第三步：添加发现导入

在 `model_tools.py` 中，将模块添加到 `_discover_tools()` 列表：

```python
def _discover_tools():
    _modules = [
        ...
        "tools.weather_tool",  # <-- 在此添加
    ]
```

该导入会触发工具文件末尾的 `registry.register()` 注册调用。

## 异步处理函数

如果处理函数需要使用异步代码，在注册时添加 `is_async=True`：

```python
async def weather_tool_async(location: str) -> str:
    async with aiohttp.ClientSession() as session:
        ...
    return json.dumps(result)

registry.register(
    name="weather",
    toolset="weather",
    schema=WEATHER_SCHEMA,
    handler=lambda args, **kw: weather_tool_async(args.get("location", "")),
    check_fn=check_weather_requirements,
    is_async=True,  # 注册表会自动调用 _run_async()
)
```

注册表会透明地处理异步桥接——你无需自行调用 `asyncio.run()`。

## 需要 task_id 的处理函数

管理会话级状态的工具可以通过 `**kwargs` 接收 `task_id`：

```python
def _handle_weather(args, **kw):
    task_id = kw.get("task_id")
    return weather_tool(args.get("location", ""), task_id=task_id)

registry.register(
    name="weather",
    ...
    handler=_handle_weather,
)
```

## 由 Agent 循环拦截的工具

部分工具（`todo`、`memory`、`session_search`、`delegate_task`）需要访问会话级 agent 状态，它们会在到达注册表之前被 `run_agent.py` 拦截。注册表中仍保有这些工具的 Schema，但若绕过拦截直接调用 `dispatch()`，将返回回退错误响应。

## 可选：配置向导集成

如果工具需要 API 密钥，在 `hermes_cli/config.py` 中添加相应配置：

```python
OPTIONAL_ENV_VARS = {
    ...
    "WEATHER_API_KEY": {
        "description": "Weather API key for weather lookup",
        "prompt": "Weather API key",
        "url": "https://weatherapi.com/",
        "tools": ["weather"],
        "password": True,
    },
}
```

## 检查清单

- [ ] 工具文件已创建，包含处理函数、Schema、可用性检查函数和注册代码
- [ ] 已在 `toolsets.py` 中添加到合适的工具集
- [ ] 已在 `model_tools.py` 中添加发现导入
- [ ] 处理函数返回 JSON 字符串，错误以 `{"error": "..."}` 形式返回
- [ ] 可选：已在 `hermes_cli/config.py` 的 `OPTIONAL_ENV_VARS` 中添加 API 密钥配置
- [ ] 可选：已在 `toolset_distributions.py` 中添加批量处理支持
- [ ] 已通过 `hermes chat -q "Use the weather tool for London"` 完成测试
