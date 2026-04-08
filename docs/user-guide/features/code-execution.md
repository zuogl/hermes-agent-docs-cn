---
title: "代码执行（编程式工具调用）"
---
# 代码执行（编程式工具调用）

`execute_code` 工具允许智能体编写 Python 脚本，以编程方式调用 Hermes 工具，将多步骤工作流压缩为单次 LLM 轮次。脚本在宿主机的沙盒子进程中运行，通过 Unix 域套接字 RPC 进行通信。

## 工作原理

1. 智能体使用 `from hermes_tools import ...` 编写 Python 脚本
2. Hermes 生成包含 RPC 函数的 `hermes_tools.py` 存根模块
3. Hermes 打开 Unix 域套接字，并启动 RPC 监听线程
4. 脚本在子进程中运行——工具调用通过套接字传回 Hermes
5. 只有脚本的 `print()` 输出会返回给 LLM；中间工具结果不会进入上下文窗口

```python
# 智能体可以编写如下脚本：
from hermes_tools import web_search, web_extract

results = web_search("Python 3.13 features", limit=5)
for r in results["data"]["web"]:
    content = web_extract([r["url"]])
    # ... 过滤和处理 ...
print(summary)
```

**沙盒中可用的工具：** `web_search`、`web_extract`、`read_file`、`write_file`、`search_files`、`patch`、`terminal`（仅前台模式）。

## 智能体的使用时机

当满足以下条件时，智能体会使用 `execute_code`：

- **3 个以上工具调用**，且调用之间包含处理逻辑
- 批量数据过滤或条件分支
- 循环遍历结果

核心优势：中间工具结果不会进入上下文窗口——只有最终的 `print()` 输出会返回，从而大幅减少 token 用量。

## 实际示例

### 数据处理流水线

```python
from hermes_tools import search_files, read_file
import json

# 查找所有配置文件并提取数据库设置
matches = search_files("database", path=".", file_glob="*.yaml", limit=20)
configs = []
for match in matches.get("matches", []):
    content = read_file(match["path"])
    configs.append({"file": match["path"], "preview": content["content"][:200]})

print(json.dumps(configs, indent=2))
```

### 多步骤网络调研

```python
from hermes_tools import web_search, web_extract
import json

# 在单次轮次中完成搜索、提取和汇总
results = web_search("Rust async runtime comparison 2025", limit=5)
summaries = []
for r in results["data"]["web"]:
    page = web_extract([r["url"]])
    for p in page.get("results", []):
        if p.get("content"):
            summaries.append({
                "title": r["title"],
                "url": r["url"],
                "excerpt": p["content"][:500]
            })

print(json.dumps(summaries, indent=2))
```

### 批量文件重构

```python
from hermes_tools import search_files, read_file, patch

# 查找所有使用废弃 API 的 Python 文件并修复
matches = search_files("old_api_call", path="src/", file_glob="*.py")
fixed = 0
for match in matches.get("matches", []):
    result = patch(
        path=match["path"],
        old_string="old_api_call(",
        new_string="new_api_call(",
        replace_all=True
    )
    if "error" not in str(result):
        fixed += 1

print(f"Fixed {fixed} files out of {len(matches.get('matches', []))} matches")
```

### 构建与测试流水线

```python
from hermes_tools import terminal, read_file
import json

# 运行测试、解析结果并生成报告
result = terminal("cd /project && python -m pytest --tb=short -q 2>&1", timeout=120)
output = result.get("output", "")

# 解析测试输出
passed = output.count(" passed")
failed = output.count(" failed")
errors = output.count(" error")

report = {
    "passed": passed,
    "failed": failed,
    "errors": errors,
    "exit_code": result.get("exit_code", -1),
    "summary": output[-500:] if len(output) > 500 else output
}

print(json.dumps(report, indent=2))
```

## 资源限制

| 资源 | 限制 | 说明 |
|------|------|------|
| **超时** | 5 分钟（300 秒）| 脚本先收到 SIGTERM，5 秒宽限期后发送 SIGKILL |
| **标准输出** | 50 KB | 超出时附加 `[output truncated at 50KB]` 提示 |
| **标准错误** | 10 KB | 非零退出时包含在输出中，用于调试 |
| **工具调用** | 每次执行 50 次 | 达到限制时返回错误 |

所有限制均可通过 `config.yaml` 配置：

```yaml
# 位于 ~/.hermes/config.yaml
code_execution:
  timeout: 300       # 每个脚本的最大执行时间，单位秒（默认：300）
  max_tool_calls: 50 # 每次执行的最大工具调用次数（默认：50）
```

## 脚本内工具调用的工作方式

当脚本调用 `web_search("query")` 等函数时：

1. 调用被序列化为 JSON，通过 Unix 域套接字发送给父进程
2. 父进程通过标准的 `handle_function_call` 处理器进行分发
3. 结果通过套接字返回
4. 函数返回解析后的结果

这意味着脚本内的工具调用与普通工具调用行为完全一致——速率限制、错误处理、功能均相同。唯一的限制是 `terminal()` 仅支持前台模式（不支持 `background`、`pty` 或 `check_interval` 参数）。

## 错误处理

脚本失败时，智能体会收到结构化的错误信息：

- **非零退出码**：stderr 包含在输出中，智能体可看到完整的 traceback
- **超时**：脚本被终止，智能体收到 `"Script timed out after 300s and was killed."`
- **中断**：若用户在执行期间发送新消息，脚本会被终止，智能体收到 `[execution interrupted — user sent a new message]`
- **工具调用限制**：达到 50 次调用上限后，后续工具调用返回错误消息

响应始终包含 `status`（success/error/timeout/interrupted）、`output`、`tool_calls_made` 和 `duration_seconds`。

## 安全性

> 🚫 **危险**：安全模型
> 子进程以**最小化环境**运行。API 密钥、token 和凭证默认会被剥离。脚本只能通过 RPC 通道访问工具——除非明确允许，否则无法从环境变量中读取密钥。

名称中包含 `KEY`、`TOKEN`、`SECRET`、`PASSWORD`、`CREDENTIAL`、`PASSWD` 或 `AUTH` 的环境变量会被排除。只有安全的系统变量（`PATH`、`HOME`、`LANG`、`SHELL`、`PYTHONPATH`、`VIRTUAL_ENV` 等）会被传入。

### 技能环境变量透传

当某个技能在 frontmatter 中声明了 `required_environment_variables` 时，这些变量会在技能加载后**自动透传**给 `execute_code` 和 `terminal` 沙盒。这让技能可以使用其声明的 API 密钥，同时不会削弱对任意代码的安全防护。

对于非技能场景，你可以在 `config.yaml` 中显式将变量加入允许列表：

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_KEY
    - ANOTHER_TOKEN
```

详情参见[安全指南](https://hermes-agent.nousresearch.com/docs/user-guide/security#environment-variable-passthrough)。

脚本在临时目录中运行，执行完毕后该目录会被清理。子进程在独立的进程组中运行，因此可以在超时或中断时被彻底终止。

## execute_code 与 terminal 对比

| 使用场景 | execute_code | terminal |
|----------|-------------|----------|
| 工具调用之间包含逻辑的多步骤工作流 | ✅ | ❌ |
| 简单 shell 命令 | ❌ | ✅ |
| 过滤/处理大量工具输出 | ✅ | ❌ |
| 运行构建或测试套件 | ❌ | ✅ |
| 循环遍历搜索结果 | ✅ | ❌ |
| 交互式/后台进程 | ❌ | ✅ |
| 需要环境变量中的 API 密钥 | ⚠️ 仅通过[透传](https://hermes-agent.nousresearch.com/docs/user-guide/security#environment-variable-passthrough) | ✅（大多数可透传）|

**经验法则：** 当你需要以编程方式调用 Hermes 工具、且调用之间需要逻辑处理时，使用 `execute_code`。运行 shell 命令、构建任务和进程时，使用 `terminal`。

## 平台支持

代码执行依赖 Unix 域套接字，**仅支持 Linux 和 macOS**。在 Windows 上自动禁用——智能体会回退为常规的顺序工具调用。
