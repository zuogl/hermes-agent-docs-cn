---
title: "添加 Provider"
---
# 添加 Provider

Hermes 已经可以通过自定义 provider 路径对接任意 OpenAI 兼容的 endpoint。除非你需要为某个服务提供一流的用户体验，否则不必添加内置 provider：

- provider 特有的 auth 或 token 刷新
- 精选模型目录
- `hermes model` 菜单中的 setup / 入口项
- `provider:model` 语法所需的 provider 别名
- 需要适配器的非 OpenAI API 格式

如果该 provider 只是"另一个 OpenAI 兼容的 base URL 加 API key"，一个命名的自定义 provider 通常就足够了。

## 心智模型

内置 provider 需要在几个层次上保持一致：

1. `hermes_cli/auth.py` 负责查找凭据。
2. `hermes_cli/runtime_provider.py` 将凭据转换为 runtime 数据：
   - `provider`
   - `api_mode`
   - `base_url`
   - `api_key`
   - `source`
3. `run_agent.py` 使用 `api_mode` 决定如何构建和发送请求。
4. `hermes_cli/models.py` 和 `hermes_cli/main.py` 让 provider 在 CLI 中可见。（`hermes_cli/setup.py` 自动委托给 `main.py`，无需修改。）
5. `agent/auxiliary_client.py` 和 `agent/model_metadata.py` 保证辅助任务和 token 预算正常运作。

核心抽象是 `api_mode`：

- 大多数 provider 使用 `chat_completions`。
- Codex 使用 `codex_responses`。
- Anthropic 使用 `anthropic_messages`。
- 新的非 OpenAI 协议通常意味着需要添加新的适配器和新的 `api_mode` 分支。

## 首先选择实现路径

### 路径 A — OpenAI 兼容 provider

当 provider 接受标准 chat completions 风格的请求时使用此路径。

典型工作：

- 添加 auth 元数据
- 添加模型目录 / 别名
- 添加 runtime 解析
- 添加 CLI 菜单接入
- 添加辅助模型默认值
- 添加测试和用户文档

通常不需要新的适配器或新的 `api_mode`。

### 路径 B — 原生 provider

当 provider 的行为与 OpenAI chat completions 不同时使用此路径。

代码库中现有示例：

- `codex_responses`
- `anthropic_messages`

此路径包含路径 A 的全部内容，并额外需要：

- `agent/` 中的 provider 适配器
- `run_agent.py` 中针对请求构建、调度、usage 提取、中断处理和响应规范化的分支
- 适配器测试

## 文件清单

### 每个内置 provider 必须修改的文件

1. `hermes_cli/auth.py`
2. `hermes_cli/models.py`
3. `hermes_cli/runtime_provider.py`
4. `hermes_cli/main.py`
5. `agent/auxiliary_client.py`
6. `agent/model_metadata.py`
7. 测试
8. `website/docs/` 下的用户文档

:::tip
`hermes_cli/setup.py` **无需**修改。setup 向导将 provider/model 选择委托给 `main.py` 中的 `select_provider_and_model()`——在那里添加的任何 provider 都会自动出现在 `hermes setup` 中。
:::

### 原生 / 非 OpenAI provider 额外需要修改的文件

10. `agent/_adapter.py`
11. `run_agent.py`
12. 如需引入 provider SDK，还需修改 `pyproject.toml`

## 第 1 步：选定一个规范的 provider id

选择唯一的 provider id，并在所有地方统一使用。

代码库中的示例：

- `openai-codex`
- `kimi-coding`
- `minimax-cn`

该 id 应出现在：

- `hermes_cli/auth.py` 中的 `PROVIDER_REGISTRY`
- `hermes_cli/models.py` 中的 `_PROVIDER_LABELS`
- `hermes_cli/auth.py` 和 `hermes_cli/models.py` 中的 `_PROVIDER_ALIASES`
- `hermes_cli/main.py` 中 CLI 的 `--provider` 选项
- setup / 模型选择分支
- 辅助模型默认值
- 测试

如果各文件中的 id 不一致，provider 将处于"半接入"状态：auth 可能正常，但 `/model`、setup 或 runtime 解析会悄无声息地遗漏它。

## 第 2 步：在 `hermes_cli/auth.py` 中添加 auth 元数据

对于 API key 类型的 provider，在 `PROVIDER_REGISTRY` 中添加一个 `ProviderConfig` 条目，包含：

- `id`
- `name`
- `auth_type="api_key"`
- `inference_base_url`
- `api_key_env_vars`
- 可选的 `base_url_env_var`

同时将别名添加到 `_PROVIDER_ALIASES`。

参考现有 provider 作为模板：

- 简单 API key 路径：Z.AI、MiniMax
- 带 endpoint 探测的 API key 路径：Kimi、Z.AI
- 原生 token 解析：Anthropic
- OAuth / auth-store 路径：Nous、OpenAI Codex

需要回答的问题：

- Hermes 应检查哪些环境变量，优先级顺序如何？
- provider 是否需要 base URL 覆盖？
- 是否需要 endpoint 探测或 token 刷新？
- 凭据缺失时，auth 错误信息应提示什么？

如果 provider 需要的不只是"查找 API key"，请添加专用的凭据解析器，而不是将逻辑塞进不相关的分支中。

## 第 3 步：在 `hermes_cli/models.py` 中添加模型目录和别名

更新 provider 目录，使 provider 在菜单和 `provider:model` 语法中均可使用。

典型修改：

- `_PROVIDER_MODELS`
- `_PROVIDER_LABELS`
- `_PROVIDER_ALIASES`
- `list_available_providers()` 中的 provider 展示顺序
- 如果 provider 支持实时 `/models` 接口，还需修改 `provider_model_ids()`

如果 provider 提供实时模型列表，优先使用，并将 `_PROVIDER_MODELS` 作为静态 fallback。

此文件也让以下输入能正常工作：

```text
anthropic:claude-sonnet-4-6
kimi:model-name
```

如果别名在此处缺失，provider 可能 auth 正常但 `/model` 解析仍然失败。

## 第 4 步：在 `hermes_cli/runtime_provider.py` 中解析 runtime 数据

`resolve_runtime_provider()` 是 CLI、gateway、cron、ACP 和辅助客户端共用的路径。

添加一个分支，返回至少包含以下字段的字典：

```python
{
    "provider": "your-provider",
    "api_mode": "chat_completions",  # 或你的原生模式
    "base_url": "https://...",
    "api_key": "...",
    "source": "env|portal|auth-store|explicit",
    "requested_provider": requested_provider,
}
```

如果 provider 兼容 OpenAI，`api_mode` 通常应保持 `chat_completions`。

注意 API key 优先级。Hermes 已有逻辑防止 OpenRouter 的 key 泄漏到无关的 endpoint。新 provider 应同样明确地将哪个 key 用于哪个 base URL。

## 第 5 步：在 `hermes_cli/main.py` 中接入 CLI

provider 必须出现在交互式 `hermes model` 流程中才能被用户发现。

在 `hermes_cli/main.py` 中更新：

- `provider_labels` 字典
- `select_provider_and_model()` 中的 `providers` 列表
- provider 分发逻辑（`if selected_provider == ...`）
- `--provider` 参数的选项
- 如果 provider 支持 login/logout 流程，更新相应选项
- 添加 `_model_flow_()` 函数，或在适用时复用 `_model_flow_api_key_provider()`

:::tip
`hermes_cli/setup.py` 无需修改——它调用 `main.py` 中的 `select_provider_and_model()`，因此你的新 provider 会自动出现在 `hermes model` 和 `hermes setup` 中。
:::

## 第 6 步：保证辅助调用正常工作

这里涉及两个文件：

### `agent/auxiliary_client.py`

如果这是一个直接 API key 类型的 provider，在 `_API_KEY_PROVIDER_AUX_MODELS` 中为其添加一个廉价/快速的默认辅助模型。

辅助任务包括：

- 视觉摘要
- 网页内容提取摘要
- 上下文压缩摘要
- session 搜索摘要
- memory 刷新

如果 provider 没有合理的辅助默认值，辅助任务可能 fallback 异常，或意外使用代价高昂的主模型。

### `agent/model_metadata.py`

为该 provider 的模型添加上下文长度，确保 token 预算、压缩阈值和限制保持合理。

## 第 7 步：若为原生 provider，添加适配器并在 `run_agent.py` 中提供支持

如果 provider 不是标准 chat completions，请将 provider 特有的逻辑隔离在 `agent/_adapter.py` 中。

保持 `run_agent.py` 专注于编排逻辑，让它调用适配器辅助函数，而不是在文件各处内联构建 provider 请求负载。

原生 provider 通常需要在以下位置做修改：

### 新建适配器文件

典型职责：

- 构建 SDK / HTTP 客户端
- 解析 token
- 将 OpenAI 风格的会话消息转换为 provider 的请求格式
- 如有需要，转换工具 schema
- 将 provider 响应规范化为 `run_agent.py` 期望的格式
- 提取 usage 和 finish-reason 数据

### `run_agent.py`

搜索 `api_mode` 并审查每个分支点。至少验证：

- `__init__` 选择了新的 `api_mode`
- 客户端构建对该 provider 有效
- `_build_api_kwargs()` 能正确格式化请求
- `_api_call_with_interrupt()` 正确分发到对应的客户端调用
- 中断 / 客户端重建路径正常工作
- 响应校验能接受该 provider 的响应格式
- finish-reason 提取正确
- token usage 提取正确
- fallback 模型激活能干净地切换到新 provider
- 摘要生成和 memory 刷新路径仍然正常

同时搜索 `run_agent.py` 中的 `self.client.`。任何假设标准 OpenAI 客户端存在的代码路径，在原生 provider 使用不同客户端对象或 `self.client = None` 时都可能出错。

### 提示词缓存与 provider 特有请求字段

提示词缓存和 provider 特有的配置项很容易出现回归。

代码库中的现有示例：

- Anthropic 有原生的提示词缓存路径
- OpenRouter 获取 provider 路由字段
- 并非每个 provider 都应接收每个请求端选项

添加原生 provider 时，仔细确认 Hermes 只向该 provider 发送其实际支持的字段。

## 第 8 步：测试

至少修改用于保护 provider 接入的测试。

常见位置：

- `tests/test_runtime_provider_resolution.py`
- `tests/test_cli_provider_resolution.py`
- `tests/test_cli_model_command.py`
- `tests/test_setup_model_selection.py`
- `tests/test_provider_parity.py`
- `tests/test_run_agent.py`
- 原生 provider 还需要 `tests/test__adapter.py`

对于仅作示例的文档，具体文件集可能有所不同。关键是覆盖以下方面：

- auth 解析
- CLI 菜单 / provider 选择
- runtime provider 解析
- agent 执行路径
- `provider:model` 解析
- 适配器特有的消息转换（如有）

禁用 xdist 运行测试：

```bash
source venv/bin/activate
python -m pytest tests/test_runtime_provider_resolution.py tests/test_cli_provider_resolution.py tests/test_cli_model_command.py tests/test_setup_model_selection.py -n0 -q
```

对于影响较深的改动，推送前运行完整测试套件：

```bash
source venv/bin/activate
python -m pytest tests/ -n0 -q
```

## 第 9 步：线上验证

测试通过后，进行真实冒烟测试。

```bash
source venv/bin/activate
python -m hermes_cli.main chat -q "Say hello" --provider your-provider --model your-model
```

如果修改了菜单，也要测试交互式流程：

```bash
source venv/bin/activate
python -m hermes_cli.main model
python -m hermes_cli.main setup
```

对于原生 provider，除纯文本响应外，还需至少验证一次工具调用。

## 第 10 步：更新用户文档

如果该 provider 计划作为一流选项发布，同时更新用户文档：

- `website/docs/getting-started/quickstart.md`
- `website/docs/user-guide/configuration.md`
- `website/docs/reference/environment-variables.md`

开发者可以完美地接入 provider，却让用户无法发现所需的环境变量或 setup 流程。

## OpenAI 兼容 provider 检查清单

适用于标准 chat completions provider。

- [ ] 在 `hermes_cli/auth.py` 中添加 `ProviderConfig`
- [ ] 在 `hermes_cli/auth.py` 和 `hermes_cli/models.py` 中添加别名
- [ ] 在 `hermes_cli/models.py` 中添加模型目录
- [ ] 在 `hermes_cli/runtime_provider.py` 中添加 runtime 分支
- [ ] 在 `hermes_cli/main.py` 中完成 CLI 接入（setup.py 自动继承）
- [ ] 在 `agent/auxiliary_client.py` 中添加辅助模型
- [ ] 在 `agent/model_metadata.py` 中添加上下文长度
- [ ] 更新 runtime / CLI 测试
- [ ] 更新用户文档

## 原生 provider 检查清单

适用于需要新协议路径的 provider。

- [ ] OpenAI 兼容检查清单中的全部内容
- [ ] 在 `agent/_adapter.py` 中添加适配器
- [ ] 在 `run_agent.py` 中支持新的 `api_mode`
- [ ] 中断 / 重建路径正常工作
- [ ] usage 和 finish-reason 提取正常工作
- [ ] fallback 路径正常工作
- [ ] 添加适配器测试
- [ ] 线上冒烟测试通过

## 常见坑点

### 1. 将 provider 添加到 auth 但未添加到模型解析

这会导致凭据解析正确，但 `/model` 和 `provider:model` 输入失败。

### 2. 忘记 `config["model"]` 可以是字符串或字典

大量 provider 选择代码需要对这两种形式进行规范化处理。

### 3. 误以为必须添加内置 provider

如果该服务只是 OpenAI 兼容的，自定义 provider 通常已能解决用户问题，且维护成本更低。

### 4. 忘记辅助路径

主聊天路径可能正常，但摘要、memory 刷新或视觉辅助功能却失败，原因是辅助路由从未更新。

### 5. 原生 provider 分支隐藏在 `run_agent.py` 中

搜索 `api_mode` 和 `self.client.`，不要认为显而易见的请求路径是唯一的。

### 6. 将 OpenRouter 专有字段发送给其他 provider

provider 路由等字段只应发送给支持它们的 provider。

### 7. 更新了 `hermes model` 但未更新 `hermes setup`

两个流程都需要感知到该 provider。

## 实现时的搜索目标

如果你要查找 provider 涉及的所有位置，搜索以下符号：

- `PROVIDER_REGISTRY`
- `_PROVIDER_ALIASES`
- `_PROVIDER_MODELS`
- `resolve_runtime_provider`
- `_model_flow_`
- `select_provider_and_model`
- `api_mode`
- `_API_KEY_PROVIDER_AUX_MODELS`
- `self.client.`

## 相关文档

- [Provider Runtime 解析](/developer-guide/provider-runtime)
- [架构](/developer-guide/architecture)
- [贡献指南](/developer-guide/contributing)
