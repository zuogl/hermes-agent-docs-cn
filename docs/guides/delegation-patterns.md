---
title: "委派与并行工作"
---
# 委派与并行工作

Hermes 可以派生隔离的子 Agent 并行处理任务。每个子 Agent 各自拥有独立的对话、终端会话和工具集，最终只有摘要结果会返回给你——中间的工具调用不会进入你的上下文窗口。

完整功能参考，请参阅[子 Agent 委派](/user-guide/features/delegation)。

---

## 何时进行委派

**适合委派的任务：**
- 推理密集型子任务（调试、代码审查、研究综合分析）
- 会产生大量中间数据、将上下文窗口塞满的任务
- 互相独立、可并行的任务流（同时推进研究 A 和研究 B）
- 需要全新视角、不受对话历史偏见影响的任务

**改用其他方式的情况：**
- 单次工具调用 → 直接使用工具即可
- 步骤间需要逻辑判断的机械性多步工作 → 使用 `execute_code`
- 需要用户交互的任务 → 子 Agent 无法使用 `clarify`
- 快速文件编辑 → 直接操作即可

---

## 模式：并行研究

同时研究三个主题，获取结构化摘要：

```
Research these three topics in parallel:
1. Current state of WebAssembly outside the browser
2. RISC-V server chip adoption in 2025
3. Practical quantum computing applications

Focus on recent developments and key players.
```

Hermes 在后台执行的是：

```python
delegate_task(tasks=[
    {
        "goal": "Research WebAssembly outside the browser in 2025",
        "context": "Focus on: runtimes (Wasmtime, Wasmer), cloud/edge use cases, WASI progress",
        "toolsets": ["web"]
    },
    {
        "goal": "Research RISC-V server chip adoption",
        "context": "Focus on: server chips shipping, cloud providers adopting, software ecosystem",
        "toolsets": ["web"]
    },
    {
        "goal": "Research practical quantum computing applications",
        "context": "Focus on: error correction breakthroughs, real-world use cases, key companies",
        "toolsets": ["web"]
    }
])
```

三个任务并发执行，每个子 Agent 独立搜索网络并返回摘要，父 Agent 随后将三份摘要汇总为一份连贯的简报。

---

## 模式：代码审查

将安全审查委派给拥有全新上下文的子 Agent，让它在没有先入之见的情况下审查代码：

```
Review the authentication module at src/auth/ for security issues.
Check for SQL injection, JWT validation problems, password handling,
and session management. Fix anything you find and run the tests.
```

关键在于 `context` 字段——它必须包含子 Agent 所需的一切信息：

```python
delegate_task(
    goal="Review src/auth/ for security issues and fix any found",
    context="""Project at /home/user/webapp. Python 3.11, Flask, PyJWT, bcrypt.
    Auth files: src/auth/login.py, src/auth/jwt.py, src/auth/middleware.py
    Test command: pytest tests/auth/ -v
    Focus on: SQL injection, JWT validation, password hashing, session management.
    Fix issues found and verify tests pass.""",
    toolsets=["terminal", "file"]
)
```

:::caution
上下文问题
子 Agent 对你们之间的对话**一无所知**，它们从全新状态启动，毫无上下文。如果你委派"修复刚才提到的那个 Bug"，子 Agent 根本不知道你说的是哪个 Bug。务必显式传入文件路径、错误信息、项目结构和约束条件。
:::

---

## 模式：比较方案

并行评估同一问题的多种解决方案，再择优选择：

```
I need to add full-text search to our Django app. Evaluate three approaches
in parallel:
1. PostgreSQL tsvector (built-in)
2. Elasticsearch via django-elasticsearch-dsl
3. Meilisearch via meilisearch-python

For each: setup complexity, query capabilities, resource requirements,
and maintenance overhead. Compare them and recommend one.
```

每个子 Agent 独立研究一个方案。由于彼此完全隔离，每项评估结果互不影响——每个方案凭自身优劣独立接受审视。父 Agent 拿到三份摘要后再进行比较。

---

## 模式：多文件重构

将大型重构任务拆分给多个并行子 Agent，每个子 Agent 负责代码库的不同部分：

```python
delegate_task(tasks=[
    {
        "goal": "Refactor all API endpoint handlers to use the new response format",
        "context": """Project at /home/user/api-server.
        Files: src/handlers/users.py, src/handlers/auth.py, src/handlers/billing.py
        Old format: return {"data": result, "status": "ok"}
        New format: return APIResponse(data=result, status=200).to_dict()
        Import: from src.responses import APIResponse
        Run tests after: pytest tests/handlers/ -v""",
        "toolsets": ["terminal", "file"]
    },
    {
        "goal": "Update all client SDK methods to handle the new response format",
        "context": """Project at /home/user/api-server.
        Files: sdk/python/client.py, sdk/python/models.py
        Old parsing: result = response.json()["data"]
        New parsing: result = response.json()["data"] (same key, but add status code checking)
        Also update sdk/python/tests/test_client.py""",
        "toolsets": ["terminal", "file"]
    },
    {
        "goal": "Update API documentation to reflect the new response format",
        "context": """Project at /home/user/api-server.
        Docs at: docs/api/. Format: Markdown with code examples.
        Update all response examples from old format to new format.
        Add a 'Response Format' section to docs/api/overview.md explaining the schema.""",
        "toolsets": ["terminal", "file"]
    }
])
```

:::tip
每个子 Agent 拥有独立的终端会话，可以在同一项目目录下工作而互不干扰——前提是它们编辑的是不同文件。如果两个子 Agent 可能操作同一个文件，请等并行工作完成后再自行处理该文件。
:::

---

## 模式：先收集后分析

用 `execute_code` 进行机械性数据收集，再委派给子 Agent 完成推理密集型分析：

```python
# 第一步：机械性收集（execute_code 更合适——此处无需推理）
execute_code("""
from hermes_tools import web_search, web_extract

results = []
for query in ["AI funding Q1 2026", "AI startup acquisitions 2026", "AI IPOs 2026"]:
    r = web_search(query, limit=5)
    for item in r["data"]["web"]:
        results.append({"title": item["title"], "url": item["url"], "desc": item["description"]})

# 提取前 5 个最相关结果的完整内容
urls = [r["url"] for r in results[:5]]
content = web_extract(urls)

# 保存供分析步骤使用
import json
with open("/tmp/ai-funding-data.json", "w") as f:
    json.dump({"search_results": results, "extracted": content["results"]}, f)
print(f"Collected {len(results)} results, extracted {len(content['results'])} pages")
""")

# 第二步：推理密集型分析（委派更合适）
delegate_task(
    goal="Analyze AI funding data and write a market report",
    context="""Raw data at /tmp/ai-funding-data.json contains search results and
    extracted web pages about AI funding, acquisitions, and IPOs in Q1 2026.
    Write a structured market report: key deals, trends, notable players,
    and outlook. Focus on deals over $100M.""",
    toolsets=["terminal", "file"]
)
```

这往往是最高效的模式：`execute_code` 低成本地完成十余次顺序工具调用，子 Agent 则在干净的上下文中专注完成单次高价值推理任务。

---

## 工具集选择

根据子 Agent 所需功能选择工具集：

| 任务类型 | 工具集 | 原因 |
|----------|--------|------|
| 网络研究 | `["web"]` | 仅需 web_search + web_extract |
| 代码工作 | `["terminal", "file"]` | Shell 访问 + 文件操作 |
| 综合任务 | `["terminal", "file", "web"]` | 除通讯功能外的所有工具 |
| 只读分析 | `["file"]` | 只能读取文件，无 Shell 权限 |

限制工具集可以让子 Agent 保持专注，防止意外副作用（例如研究类子 Agent 误执行 Shell 命令）。

---

## 约束

- **最多 3 个并行任务**——每批次最多 3 个并发子 Agent
- **不支持嵌套**——子 Agent 不能调用 `delegate_task`、`clarify`、`memory`、`send_message` 或 `execute_code`
- **独立终端**——每个子 Agent 拥有独立的终端会话，工作目录和状态各自隔离
- **无对话历史**——子 Agent 只能看到你在 `goal` 和 `context` 中提供的内容
- **默认 50 次迭代**——对于简单任务，可调低 `max_iterations` 以节省费用

---

## 使用建议

**目标描述要具体。** "修复 Bug"太模糊。"修复 api/handlers.py 第 47 行的 TypeError，process_request() 从 parse_body() 收到 None 值"才能给子 Agent 足够的信息展开工作。

**提供文件路径。** 子 Agent 不了解你的项目结构，务必提供相关文件的绝对路径、项目根目录以及测试命令。

**利用委派实现上下文隔离。** 有时你需要一个全新的视角。委派迫使你把问题说清楚，而子 Agent 不会带着对话中积累的假设和偏见去处理问题。

**核验结果。** 子 Agent 的摘要终究只是摘要。如果子 Agent 称"已修复 Bug 且测试通过"，请自行运行测试或查看 diff 加以验证。

---

*完整委派参考——所有参数、ACP 集成和高级配置——请参阅[子 Agent 委派](/user-guide/features/delegation)。*
