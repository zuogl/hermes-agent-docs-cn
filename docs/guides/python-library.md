---
title: "将 Hermes 作为 Python 库使用"
---
# 将 Hermes 作为 Python 库使用

Hermes 不仅是一个 CLI 工具。你可以直接导入 `AIAgent`，在自己的 Python 脚本、Web 应用或自动化流水线中以编程方式使用它。本指南将展示如何操作。

---

## 安装

直接从仓库安装 Hermes：

```bash
pip install git+https://github.com/NousResearch/hermes-agent.git
```

或使用 [uv](https://docs.astral.sh/uv/)：

```bash
uv pip install git+https://github.com/NousResearch/hermes-agent.git
```

也可以在 `requirements.txt` 中固定版本：

```text
hermes-agent @ git+https://github.com/NousResearch/hermes-agent.git
```

:::tip
以库方式使用 Hermes 时，CLI 所需的环境变量同样必须配置。至少需要设置 `OPENROUTER_API_KEY`（如果直接访问模型提供商，则设置 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY`）。
:::

---

## 基础用法

使用 Hermes 最简单的方式是 `chat()` 方法——传入一条消息，返回一个字符串：

```python
from run_agent import AIAgent

agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    quiet_mode=True,
)
response = agent.chat("What is the capital of France?")
print(response)
```

`chat()` 在内部处理完整的对话循环——工具调用、重试等——仅返回最终文本回复。

:::caution
嵌入 Hermes 时，务必设置 `quiet_mode=True`。不设置的话，智能体会输出 CLI 的加载动画、进度提示等终端输出，干扰你应用的输出。
:::

---

## 完整对话控制

如需对对话进行更精细的控制，可以直接使用 `run_conversation()`。它返回一个字典，包含完整的响应、消息历史和元数据：

```python
agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    quiet_mode=True,
)

result = agent.run_conversation(
    user_message="Search for recent Python 3.13 features",
    task_id="my-task-1",
)

print(result["final_response"])
print(f"Messages exchanged: {len(result['messages'])}")
```

返回的字典包含：
- **`final_response`** — 智能体的最终文本回复
- **`messages`** — 完整的消息历史（system、user、assistant、工具调用）
- **`task_id`** — 用于 VM 隔离的任务标识符

也可以传入自定义系统消息，覆盖该次调用的系统提示词：

```python
result = agent.run_conversation(
    user_message="Explain quicksort",
    system_message="You are a computer science tutor. Use simple analogies.",
)
```

---

## 配置工具

通过 `enabled_toolsets` 或 `disabled_toolsets` 控制智能体可以访问哪些工具集：

```python
# 只启用 Web 工具（浏览、搜索）
agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    enabled_toolsets=["web"],
    quiet_mode=True,
)

# 启用所有工具，但禁用终端访问
agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    disabled_toolsets=["terminal"],
    quiet_mode=True,
)
```

:::tip
需要构建精简受限的智能体时（例如只用于网络搜索的研究机器人），使用 `enabled_toolsets`。需要保留大部分能力但限制特定功能时（例如在共享环境中禁用终端访问），使用 `disabled_toolsets`。
:::

---

## 多轮对话

将消息历史回传，即可跨多轮保持对话状态：

```python
agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    quiet_mode=True,
)

# 第一轮
result1 = agent.run_conversation("My name is Alice")
history = result1["messages"]

# 第二轮——智能体记得上下文
result2 = agent.run_conversation(
    "What's my name?",
    conversation_history=history,
)
print(result2["final_response"])  # "Your name is Alice."
```

`conversation_history` 参数接受上一次结果中的 `messages` 列表。智能体内部会复制该列表，不会修改你的原始数据。

---

## 保存轨迹

启用轨迹保存，可以将对话以 ShareGPT 格式记录下来——适用于生成训练数据或调试：

```python
agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    save_trajectories=True,
    quiet_mode=True,
)

agent.chat("Write a Python function to sort a list")
# 以 ShareGPT 格式保存到 trajectory_samples.jsonl
```

每次对话以单行 JSONL 格式追加写入，方便从自动化运行中收集数据集。

---

## 自定义系统提示词

使用 `ephemeral_system_prompt` 设置自定义系统提示词，引导智能体行为，但**不会**保存到轨迹文件中（保持训练数据整洁）：

```python
agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    ephemeral_system_prompt="You are a SQL expert. Only answer database questions.",
    quiet_mode=True,
)

response = agent.chat("How do I write a JOIN query?")
print(response)
```

适合构建各类专用智能体——代码审查员、文档撰写员、SQL 助手——复用同一套底层工具体系。

---

## 批处理

Hermes 内置了 `batch_runner.py`，用于并行处理大量提示词，管理并发的 `AIAgent` 实例并提供资源隔离：

```bash
python batch_runner.py --input prompts.jsonl --output results.jsonl
```

每个提示词有独立的 `task_id` 和隔离环境。如需自定义批处理逻辑，可以直接使用 `AIAgent` 实现：

```python
import concurrent.futures
from run_agent import AIAgent

prompts = [
    "Explain recursion",
    "What is a hash table?",
    "How does garbage collection work?",
]

def process_prompt(prompt):
    # 每个任务创建一个新的 agent 实例，确保线程安全
    agent = AIAgent(
        model="anthropic/claude-sonnet-4",
        quiet_mode=True,
        skip_memory=True,
    )
    return agent.chat(prompt)

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(process_prompt, prompts))

for prompt, result in zip(prompts, results):
    print(f"Q: {prompt}\nA: {result}\n")
```

:::caution
务必为**每个线程或任务创建一个新的 `AIAgent` 实例**。智能体维护内部状态（对话历史、工具会话、迭代计数器），不能在并发调用间共享。
:::

---

## 集成示例

### FastAPI 端点

```python
from fastapi import FastAPI
from pydantic import BaseModel
from run_agent import AIAgent

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    model: str = "anthropic/claude-sonnet-4"

@app.post("/chat")
async def chat(request: ChatRequest):
    agent = AIAgent(
        model=request.model,
        quiet_mode=True,
        skip_context_files=True,
        skip_memory=True,
    )
    response = agent.chat(request.message)
    return {"response": response}
```

### Discord 机器人

```python
import discord
from run_agent import AIAgent

client = discord.Client(intents=discord.Intents.default())

@client.event
async def on_message(message):
    if message.author == client.user:
        return
    if message.content.startswith("!hermes "):
        query = message.content[8:]
        agent = AIAgent(
            model="anthropic/claude-sonnet-4",
            quiet_mode=True,
            skip_context_files=True,
            skip_memory=True,
            platform="discord",
        )
        response = agent.chat(query)
        await message.channel.send(response[:2000])

client.run("YOUR_DISCORD_TOKEN")
```

### CI/CD 流水线步骤

```python
#!/usr/bin/env python3
"""CI 步骤：自动审查 PR diff。"""
import subprocess
from run_agent import AIAgent

diff = subprocess.check_output(["git", "diff", "main...HEAD"]).decode()

agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    quiet_mode=True,
    skip_context_files=True,
    skip_memory=True,
    disabled_toolsets=["terminal", "browser"],
)

review = agent.chat(
    f"Review this PR diff for bugs, security issues, and style problems:\n\n{diff}"
)
print(review)
```

---

## 关键构造函数参数

| 参数 | 类型 | 默认值 | 说明 |
|-----------|------|---------|-------------|
| `model` | `str` | `"anthropic/claude-opus-4.6"` | OpenRouter 格式的模型名 |
| `quiet_mode` | `bool` | `False` | 抑制 CLI 输出 |
| `enabled_toolsets` | `List[str]` | `None` | 白名单工具集 |
| `disabled_toolsets` | `List[str]` | `None` | 黑名单工具集 |
| `save_trajectories` | `bool` | `False` | 将对话保存为 JSONL |
| `ephemeral_system_prompt` | `str` | `None` | 自定义系统提示词（不保存到轨迹） |
| `max_iterations` | `int` | `90` | 每次对话最大工具调用迭代次数 |
| `skip_context_files` | `bool` | `False` | 跳过加载 AGENTS.md 文件 |
| `skip_memory` | `bool` | `False` | 禁用持久化记忆的读写 |
| `api_key` | `str` | `None` | API 密钥（回退到环境变量） |
| `base_url` | `str` | `None` | 自定义 API 端点 URL |
| `platform` | `str` | `None` | 平台提示（`"discord"`、`"telegram"` 等） |

---

## 重要说明

:::tip
- 如果不想将工作目录中的 `AGENTS.md` 文件加载到系统提示词，请设置 **`skip_context_files=True`**。
- 如需阻止智能体读写持久化记忆，请设置 **`skip_memory=True`**——推荐在无状态 API 端点中使用。
- `platform` 参数（如 `"discord"`、`"telegram"`）会注入平台特定的格式提示，使智能体适配其输出风格。
:::

:::caution
- **线程安全**：每个线程或任务创建一个 `AIAgent` 实例，不要在并发调用间共享。
- **资源释放**：对话结束时，智能体会自动清理资源（终端会话、浏览器实例）。在长期运行的进程中，确保每次对话正常完成。
- **迭代限制**：默认的 `max_iterations=90` 较为宽松。对于简单的问答场景，建议调低（如 `max_iterations=10`），以防止失控的工具调用循环并控制费用。
:::
