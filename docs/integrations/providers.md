---
title: "AI 提供商"
---
# AI 提供商

本页介绍如何为 Hermes Agent 配置推理提供商——从 OpenRouter、Anthropic 等云端 API，到 Ollama、vLLM 等自托管端点，再到高级路由与回退配置。使用 Hermes 前，你需要至少配置一个提供商。

## 推理提供商

你需要至少一种方式连接到 LLM。使用 `hermes model` 交互式切换提供商和模型，或直接配置：

| 提供商 | 配置方式 |
|--------|---------|
| **Nous Portal** | `hermes model`（OAuth，订阅制） |
| **OpenAI Codex** | `hermes model`（ChatGPT OAuth，使用 Codex 模型） |
| **GitHub Copilot** | `hermes model`（OAuth 设备码流，`COPILOT_GITHUB_TOKEN`、`GH_TOKEN` 或 `gh auth token`） |
| **GitHub Copilot ACP** | `hermes model`（在本地启动 `copilot --acp --stdio`） |
| **Anthropic** | `hermes model`（通过 Claude Code 认证使用 Claude Pro/Max，或使用 Anthropic API key，或手动设置 setup-token） |
| **OpenRouter** | 在 `~/.hermes/.env` 中设置 `OPENROUTER_API_KEY` |
| **AI Gateway** | 在 `~/.hermes/.env` 中设置 `AI_GATEWAY_API_KEY`（provider: `ai-gateway`） |
| **z.ai / GLM** | 在 `~/.hermes/.env` 中设置 `GLM_API_KEY`（provider: `zai`） |
| **Kimi / Moonshot** | 在 `~/.hermes/.env` 中设置 `KIMI_API_KEY`（provider: `kimi-coding`） |
| **MiniMax** | 在 `~/.hermes/.env` 中设置 `MINIMAX_API_KEY`（provider: `minimax`） |
| **MiniMax China** | 在 `~/.hermes/.env` 中设置 `MINIMAX_CN_API_KEY`（provider: `minimax-cn`） |
| **阿里云** | 在 `~/.hermes/.env` 中设置 `DASHSCOPE_API_KEY`（provider: `alibaba`，别名：`dashscope`、`qwen`） |
| **Kilo Code** | 在 `~/.hermes/.env` 中设置 `KILOCODE_API_KEY`（provider: `kilocode`） |
| **OpenCode Zen** | 在 `~/.hermes/.env` 中设置 `OPENCODE_ZEN_API_KEY`（provider: `opencode-zen`） |
| **OpenCode Go** | 在 `~/.hermes/.env` 中设置 `OPENCODE_GO_API_KEY`（provider: `opencode-go`） |
| **DeepSeek** | 在 `~/.hermes/.env` 中设置 `DEEPSEEK_API_KEY`（provider: `deepseek`） |
| **Hugging Face** | 在 `~/.hermes/.env` 中设置 `HF_TOKEN`（provider: `huggingface`，别名：`hf`） |
| **Google / Gemini** | 在 `~/.hermes/.env` 中设置 `GOOGLE_API_KEY`（或 `GEMINI_API_KEY`）（provider: `gemini`） |
| **自定义端点** | `hermes model` → 选择"Custom endpoint"（保存在 `config.yaml` 中） |

> 💡 **提示（模型键别名）**：在 `model:` 配置节中，你可以用 `default:` 或 `model:` 作为模型 ID 的键名，两者完全等价。`model: { default: my-model }` 和 `model: { model: my-model }` 效果相同。

> ℹ️ **信息（Codex 说明）**：OpenAI Codex 提供商通过设备码认证（打开 URL，输入验证码）。Hermes 将生成的凭证存储在 `~/.hermes/auth.json` 中，如果 `~/.codex/auth.json` 存在，还会自动导入现有的 Codex CLI 凭证。无需安装 Codex CLI。

:::caution
即使使用 Nous Portal、Codex 或自定义端点，某些工具（视觉、网页摘要、MoA）也会使用单独的"辅助"模型——默认为通过 OpenRouter 访问的 Gemini Flash。配置 `OPENROUTER_API_KEY` 后这些工具会自动启用。你也可以配置这些工具使用的模型和提供商——参见[辅助模型](/user-guide/configuration#auxiliary-models)。
:::

### Anthropic（原生）

直接通过 Anthropic API 使用 Claude 模型，无需 OpenRouter 代理。支持三种认证方式：

```bash
# 使用 API key（按 token 计费）
export ANTHROPIC_API_KEY=***
hermes chat --provider anthropic --model claude-sonnet-4-6

# 推荐方式：通过 `hermes model` 认证
# 如果已安装 Claude Code，Hermes 会直接使用其凭证存储
hermes model

# 手动使用 setup-token 覆盖（回退 / 旧版方式）
export ANTHROPIC_TOKEN=***  # setup-token 或手动 OAuth token
hermes chat --provider anthropic

# 自动检测 Claude Code 凭证（如果你已在使用 Claude Code）
hermes chat --provider anthropic  # 自动读取 Claude Code 的凭证文件
```

当你通过 `hermes model` 选择 Anthropic OAuth 时，Hermes 优先使用 Claude Code 自身的凭证存储，而非将 token 复制到 `~/.hermes/.env`。这样可以保持 Claude 凭证的可刷新性。

或永久设置：
```yaml
model:
  provider: "anthropic"
  default: "claude-sonnet-4-6"
```

> 💡 **提示（别名）**：`--provider claude` 和 `--provider claude-code` 也可作为 `--provider anthropic` 的简写。

### GitHub Copilot

Hermes 将 GitHub Copilot 作为原生提供商支持，提供两种模式：

**`copilot` — 直接 Copilot API**（推荐）。使用你的 GitHub Copilot 订阅，通过 Copilot API 访问 GPT-5.x、Claude、Gemini 及其他模型。

```bash
hermes chat --provider copilot --model gpt-5.4
```

**认证方式**（按以下顺序检测）：

1. `COPILOT_GITHUB_TOKEN` 环境变量
2. `GH_TOKEN` 环境变量
3. `GITHUB_TOKEN` 环境变量
4. `gh auth token` CLI 回退

如果未找到 token，`hermes model` 会提供 **OAuth 设备码登录**——与 Copilot CLI 和 opencode 使用相同的流程。

> ⚠️ **警告（token 类型）**：Copilot API **不**支持经典个人访问令牌（`ghp_*`）。支持的 token 类型：
>
> | 类型 | 前缀 | 获取方式 |
> |------|------|---------|
> | OAuth token | `gho_` | `hermes model` → GitHub Copilot → 使用 GitHub 登录 |
> | 细粒度 PAT | `github_pat_` | GitHub 设置 → 开发者设置 → 细粒度 token（需要 **Copilot Requests** 权限） |
> | GitHub App token | `ghu_` | 通过 GitHub App 安装 |
>
> 如果你的 `gh auth token` 返回 `ghp_*` token，请改用 `hermes model` 通过 OAuth 认证。

**API 路由**：GPT-5+ 模型（`gpt-5-mini` 除外）自动使用 Responses API。其他所有模型（GPT-4o、Claude、Gemini 等）使用 Chat Completions。模型从 Copilot 实时目录中自动检测。

**`copilot-acp` — Copilot ACP 代理后端**。将本地 Copilot CLI 作为子进程启动：

```bash
hermes chat --provider copilot-acp --model copilot-acp
# 需要 PATH 中有 GitHub Copilot CLI，且已通过 `copilot login` 登录
```

**永久配置：**
```yaml
model:
  provider: "copilot"
  default: "gpt-5.4"
```

| 环境变量 | 说明 |
|---------|------|
| `COPILOT_GITHUB_TOKEN` | 用于 Copilot API 的 GitHub token（优先级最高） |
| `HERMES_COPILOT_ACP_COMMAND` | 覆盖 Copilot CLI 可执行文件路径（默认：`copilot`） |
| `HERMES_COPILOT_ACP_ARGS` | 覆盖 ACP 参数（默认：`--acp --stdio`） |

### 原生支持的中文 AI 提供商

以下提供商具有内置支持和专用 provider ID。设置 API key 后，用 `--provider` 选择：

```bash
# z.ai / ZhipuAI GLM
hermes chat --provider zai --model glm-5
# 需要：在 ~/.hermes/.env 中设置 GLM_API_KEY

# Kimi / Moonshot AI
hermes chat --provider kimi-coding --model kimi-for-coding
# 需要：在 ~/.hermes/.env 中设置 KIMI_API_KEY

# MiniMax（全球端点）
hermes chat --provider minimax --model MiniMax-M2.7
# 需要：在 ~/.hermes/.env 中设置 MINIMAX_API_KEY

# MiniMax（国内端点）
hermes chat --provider minimax-cn --model MiniMax-M2.7
# 需要：在 ~/.hermes/.env 中设置 MINIMAX_CN_API_KEY

# 阿里云 / DashScope（Qwen 系列模型）
hermes chat --provider alibaba --model qwen3.5-plus
# 需要：在 ~/.hermes/.env 中设置 DASHSCOPE_API_KEY
```

或在 `config.yaml` 中永久设置提供商：
```yaml
model:
  provider: "zai"       # 或：kimi-coding、minimax、minimax-cn、alibaba
  default: "glm-5"
```

可通过 `GLM_BASE_URL`、`KIMI_BASE_URL`、`MINIMAX_BASE_URL`、`MINIMAX_CN_BASE_URL` 或 `DASHSCOPE_BASE_URL` 环境变量覆盖默认 Base URL。

> 📝 **说明（Z.AI 端点自动检测）**：使用 Z.AI / GLM 提供商时，Hermes 会自动探测多个端点（全球、国内、编程变体），找到接受你 API key 的那个。你无需手动设置 `GLM_BASE_URL`——可用端点会被自动检测并缓存。

### xAI（Grok）提示缓存

当使用 xAI 作为提供商时（任何包含 `x.ai` 的 Base URL），Hermes 会自动通过在每个 API 请求中发送 `x-grok-conv-id` 请求头来启用提示缓存。这会将同一会话内的请求路由到同一服务器，使 xAI 的基础设施能够复用缓存的系统提示和对话历史。

无需任何配置——当检测到 xAI 端点且会话 ID 可用时，缓存会自动激活。这可以降低多轮对话的延迟和成本。

### Hugging Face 推理提供商

[Hugging Face 推理提供商](https://huggingface.co/docs/inference-providers) 通过统一的 OpenAI 兼容端点（`router.huggingface.co/v1`）路由到 20 多个开源模型。请求会自动路由到最快的可用后端（Groq、Together、SambaNova 等），并支持自动故障转移。

```bash
# 使用任何可用模型
hermes chat --provider huggingface --model Qwen/Qwen3-235B-A22B-Thinking-2507
# 需要：在 ~/.hermes/.env 中设置 HF_TOKEN

# 简短别名
hermes chat --provider hf --model deepseek-ai/DeepSeek-V3.2
```

或在 `config.yaml` 中永久设置：
```yaml
model:
  provider: "huggingface"
  default: "Qwen/Qwen3-235B-A22B-Thinking-2507"
```

在 [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) 获取你的 token——请确保启用"Make calls to Inference Providers"权限。免费套餐包含每月 $0.10 额度，按提供商原价计算，无加价。

你可以在模型名称后追加路由后缀：`:fastest`（默认）、`:cheapest`，或 `:provider_name` 强制指定后端。

Base URL 可通过 `HF_BASE_URL` 覆盖。

## 自定义与自托管 LLM 提供商

Hermes Agent 兼容**任何 OpenAI 兼容的 API 端点**。只要服务器实现了 `/v1/chat/completions`，你就可以将 Hermes 指向它。这意味着你可以使用本地模型、GPU 推理服务器、多提供商路由器或任何第三方 API。

### 通用配置

配置自定义端点的三种方式：

**交互式配置（推荐）：**
```bash
hermes model
# 选择"Custom endpoint (self-hosted / VLLM / etc.)"
# 输入：API Base URL、API key、模型名称
```

**手动配置（`config.yaml`）：**
```yaml
# 在 ~/.hermes/config.yaml 中
model:
  default: your-model-name
  provider: custom
  base_url: http://localhost:8000/v1
  api_key: your-key-or-leave-empty-for-local
```

> ⚠️ **警告（旧版环境变量）**：`.env` 中的 `OPENAI_BASE_URL` 和 `LLM_MODEL` 已**废弃**。`OPENAI_BASE_URL` 不再用于端点解析——`config.yaml` 是唯一的配置来源。CLI 完全忽略 `LLM_MODEL`（仅网关在回退时读取它）。请使用 `hermes model` 或直接编辑 `config.yaml`——两者都能在重启和 Docker 容器中正确持久化。

两种方式都会持久化到 `config.yaml`，该文件是模型、提供商和 Base URL 的唯一配置来源。

### 用 `/model` 切换模型

配置好自定义端点后，你可以在会话中途切换模型：

```
/model custom:qwen-2.5          # 切换到自定义端点上的某个模型
/model custom                    # 从端点自动检测模型
/model openrouter:claude-sonnet-4 # 切换回云端提供商
```

如果你配置了**命名自定义提供商**（见下文），请使用三段式语法：

```
/model custom:local:qwen-2.5    # 使用"local"自定义提供商和模型 qwen-2.5
/model custom:work:llama3       # 使用"work"自定义提供商和 llama3
```

切换提供商时，Hermes 会将 Base URL 和提供商持久化到配置中，使更改在重启后依然有效。从自定义端点切换到内置提供商时，过时的 Base URL 会自动清除。

:::tip
`/model custom`（不带模型名称）会查询端点的 `/models` API，如果只加载了一个模型则自动选择。适用于只运行单个模型的本地服务器。
:::

以下所有配置均遵循同样的模式——只需更改 URL、key 和模型名称即可。

---

### Ollama — 本地模型，零配置

[Ollama](https://ollama.com/) 用一条命令在本地运行开源模型。适用场景：快速本地实验、隐私敏感场景、离线使用。通过 OpenAI 兼容 API 支持工具调用。

```bash
# 安装并运行模型
ollama pull qwen2.5-coder:32b
ollama serve   # 在 11434 端口启动
```

然后配置 Hermes：

```bash
hermes model
# 选择"Custom endpoint (self-hosted / VLLM / etc.)"
# 输入 URL：http://localhost:11434/v1
# 跳过 API key（Ollama 不需要）
# 输入模型名称（如 qwen2.5-coder:32b）
```

或直接配置 `config.yaml`：

```yaml
model:
  default: qwen2.5-coder:32b
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 32768   # 见下方注意
```

> ⚠️ **注意（Ollama 默认上下文长度很短）**：Ollama 默认**不**使用模型的完整上下文窗口。根据你的显存，默认值为：
>
> | 可用显存 | 默认上下文 |
> |---------|-----------|
> | 小于 24 GB | **4,096 tokens** |
> | 24–48 GB | 32,768 tokens |
> | 48 GB 以上 | 256,000 tokens |
>
> 对于带工具的 Agent 使用，**至少需要 16k–32k 上下文**。在 4k 上下文下，系统提示加工具 schema 就能填满窗口，没有任何对话空间。
>
> **增加上下文的方法**（选其一）：

```bash
# 方式 1：通过环境变量全局设置（推荐）
OLLAMA_CONTEXT_LENGTH=32768 ollama serve

# 方式 2：对于 systemd 管理的 Ollama
sudo systemctl edit ollama.service
# 添加：Environment="OLLAMA_CONTEXT_LENGTH=32768"
# 然后：sudo systemctl daemon-reload && sudo systemctl restart ollama

# 方式 3：烘焙到自定义模型中（每个模型持久有效）
echo -e "FROM qwen2.5-coder:32b\nPARAMETER num_ctx 32768" > Modelfile
ollama create qwen2.5-coder-32k -f Modelfile
```

> **无法通过 OpenAI 兼容 API**（`/v1/chat/completions`）设置上下文长度。必须在服务端或通过 Modelfile 配置。这是将 Ollama 与 Hermes 等工具集成时最常见的困惑来源。

**验证上下文设置是否正确：**

```bash
ollama ps
# 查看 CONTEXT 列——应显示你配置的值
```

:::tip
用 `ollama list` 查看可用模型。从 [Ollama 库](https://ollama.com/library) 用 `ollama pull <model>` 拉取任意模型。Ollama 自动处理 GPU 卸载——大多数情况下无需配置。
:::

---

### vLLM — 高性能 GPU 推理

[vLLM](https://docs.vllm.ai/) 是生产级 LLM 服务的标准方案。适用场景：GPU 硬件上的最大吞吐量、服务大型模型、连续批处理。

```bash
pip install vllm
vllm serve meta-llama/Llama-3.1-70B-Instruct \
  --port 8000 \
  --max-model-len 65536 \
  --tensor-parallel-size 2 \
  --enable-auto-tool-choice \
  --tool-call-parser hermes
```

然后配置 Hermes：

```bash
hermes model
# 选择"Custom endpoint (self-hosted / VLLM / etc.)"
# 输入 URL：http://localhost:8000/v1
# 跳过 API key（或者如果你配置了 vLLM --api-key，则输入）
# 输入模型名称：meta-llama/Llama-3.1-70B-Instruct
```

**上下文长度：** vLLM 默认读取模型的 `max_position_embeddings`。如果超过显存容量，会报错并要求你设置更低的 `--max-model-len`。你也可以使用 `--max-model-len auto` 自动找到最大可用值。设置 `--gpu-memory-utilization 0.95`（默认 0.9）可以在显存中塞入更多上下文。

**工具调用需要明确的标志：**

| 标志 | 用途 |
|------|------|
| `--enable-auto-tool-choice` | Hermes 默认使用 `tool_choice: "auto"` 时必须设置 |
| `--tool-call-parser <name>` | 模型工具调用格式的解析器 |

支持的解析器：`hermes`（Qwen 2.5、Hermes 2/3）、`llama3_json`（Llama 3.x）、`mistral`、`deepseek_v3`、`deepseek_v31`、`xlam`、`pythonic`。不设置这些标志，工具调用将无法工作——模型会将工具调用作为文本输出。

:::tip
vLLM 支持人类可读的尺寸：`--max-model-len 64k`（小写 k = 1000，大写 K = 1024）。
:::

---

### SGLang — 带 RadixAttention 的快速服务

[SGLang](https://github.com/sgl-project/sglang) 是 vLLM 的替代方案，具有用于 KV 缓存复用的 RadixAttention。适用场景：多轮对话（前缀缓存）、受限解码、结构化输出。

```bash
pip install "sglang[all]"
python -m sglang.launch_server \
  --model meta-llama/Llama-3.1-70B-Instruct \
  --port 30000 \
  --context-length 65536 \
  --tp 2 \
  --tool-call-parser qwen
```

然后配置 Hermes：

```bash
hermes model
# 选择"Custom endpoint (self-hosted / VLLM / etc.)"
# 输入 URL：http://localhost:30000/v1
# 输入模型名称：meta-llama/Llama-3.1-70B-Instruct
```

**上下文长度：** SGLang 默认从模型配置中读取。使用 `--context-length` 覆盖。如需超过模型声明的最大值，设置 `SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1`。

**工具调用：** 使用 `--tool-call-parser` 并为你的模型家族选择合适的解析器：`qwen`（Qwen 2.5）、`llama3`、`llama4`、`deepseekv3`、`mistral`、`glm`。不设置此标志，工具调用会以纯文本返回。

> ⚠️ **注意（SGLang 默认最大输出 128 tokens）**：如果响应看起来被截断，请在请求中添加 `max_tokens`，或在服务端设置 `--default-max-tokens`。SGLang 的默认值仅为每次响应 128 tokens。

---

### llama.cpp / llama-server — CPU 与 Metal 推理

[llama.cpp](https://github.com/ggml-org/llama.cpp) 在 CPU、Apple Silicon（Metal）和消费级 GPU 上运行量化模型。适用场景：没有数据中心 GPU 的情况下运行模型、Mac 用户、边缘部署。

```bash
# 构建并启动 llama-server
cmake -B build && cmake --build build --config Release
./build/bin/llama-server \
  --jinja -fa \
  -c 32768 \
  -ngl 99 \
  -m models/qwen2.5-coder-32b-instruct-Q4_K_M.gguf \
  --port 8080 --host 0.0.0.0
```

**上下文长度（`-c`）：** 新版本默认值为 `0`，会从 GGUF 元数据中读取模型训练时的上下文。对于训练上下文超过 128k 的模型，这可能导致在分配完整 KV 缓存时出现 OOM。请明确设置 `-c` 为你实际需要的值（32k–64k 是 Agent 使用的合理范围）。如果使用并行槽位（`-np`），总上下文会在槽位间分配——`-c 32768 -np 4` 时每个槽位只有 8k。

然后配置 Hermes 指向它：

```bash
hermes model
# 选择"Custom endpoint (self-hosted / VLLM / etc.)"
# 输入 URL：http://localhost:8080/v1
# 跳过 API key（本地服务器不需要）
# 输入模型名称——如果只加载了一个模型，留空可自动检测
```

配置将保存到 `config.yaml`，跨会话持久有效。

> ⚠️ **注意（`--jinja` 是工具调用所必需的）**：不加 `--jinja`，llama-server 会完全忽略 `tools` 参数。模型会尝试通过在响应文本中写 JSON 来调用工具，但 Hermes 不会将其识别为工具调用——你会看到原始 JSON（如 `{"name": "web_search", ...}`）作为消息打印出来，而不是实际的搜索操作。
>
> 原生工具调用支持（最佳性能）：Llama 3.x、Qwen 2.5（包括 Coder）、Hermes 2/3、Mistral、DeepSeek、Functionary。其他所有模型使用通用处理器，可用但可能效率较低。详见 [llama.cpp 函数调用文档](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)。
>
> 你可以通过检查 `http://localhost:8080/props` 来验证工具支持是否已激活——`chat_template` 字段应该存在。

:::tip
从 [Hugging Face](https://huggingface.co/models?library=gguf) 下载 GGUF 模型。Q4_K_M 量化在质量与内存使用之间提供最佳平衡。
:::

---

### LM Studio — 带本地模型的桌面应用

[LM Studio](https://lmstudio.ai/) 是一款用于运行本地模型的桌面应用，提供 GUI 界面。适用场景：偏好可视化界面的用户、快速模型测试、macOS/Windows/Linux 上的开发者。

从 LM Studio 应用启动服务器（开发者标签 → 启动服务器），或使用 CLI：

```bash
lms server start                        # 在 1234 端口启动
lms load qwen2.5-coder --context-length 32768
```

然后配置 Hermes：

```bash
hermes model
# 选择"Custom endpoint (self-hosted / VLLM / etc.)"
# 输入 URL：http://localhost:1234/v1
# 跳过 API key（LM Studio 不需要）
# 输入模型名称
```

> ⚠️ **注意（上下文长度默认为 2048）**：LM Studio 从模型元数据读取上下文长度，但许多 GGUF 模型报告的默认值很低（2048 或 4096）。**请在 LM Studio 模型设置中明确设置上下文长度**：
>
> 1. 点击模型选择器旁的齿轮图标
> 2. 将"Context Length"设置为至少 16384（最好是 32768）
> 3. 重新加载模型使更改生效
>
> 也可以使用 CLI：`lms load model-name --context-length 32768`
>
> 设置每个模型的持久默认值：我的模型标签 → 模型上的齿轮图标 → 设置上下文大小。

**工具调用：** LM Studio 0.3.6 起支持。具有原生工具调用训练的模型（Qwen 2.5、Llama 3.x、Mistral、Hermes）会被自动检测并显示工具徽章。其他模型使用通用回退，可靠性可能较低。

---

### WSL2 网络配置（Windows 用户）

由于 Hermes Agent 需要 Unix 环境，Windows 用户需要在 WSL2 中运行它。如果你的模型服务器（Ollama、LM Studio 等）运行在 **Windows 宿主机**上，你需要桥接网络——WSL2 使用独立子网的虚拟网络适配器，因此 WSL2 内部的 `localhost` 指向 Linux 虚拟机，**而不是** Windows 宿主机。

> 💡 **提示（两者都在 WSL2 中？没问题）**：如果你的模型服务器也在 WSL2 中运行（vLLM、SGLang 和 llama-server 常见情况），`localhost` 可以正常使用——它们共享同一个网络命名空间。跳过本节。

#### 方式 1：镜像网络模式（推荐）

**Windows 11 22H2+** 提供镜像模式，使 `localhost` 在 Windows 和 WSL2 之间双向可用——这是最简单的解决方案。

1. 创建或编辑 `%USERPROFILE%\.wslconfig`（如 `C:\Users\你的用户名\.wslconfig`）：
   ```ini
   [wsl2]
   networkingMode=mirrored
   ```

2. 在 PowerShell 中重启 WSL：
   ```powershell
   wsl --shutdown
   ```

3. 重新打开 WSL2 终端。`localhost` 现在可以访问 Windows 服务：
   ```bash
   curl http://localhost:11434/v1/models   # Windows 上的 Ollama——可用
   ```

> 📝 **说明（Hyper-V 防火墙）**：在某些 Windows 11 版本上，Hyper-V 防火墙默认会阻止镜像连接。如果启用镜像模式后 `localhost` 仍然不通，在**管理员 PowerShell** 中运行：

```powershell
Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow
```

#### 方式 2：使用 Windows 宿主机 IP（Windows 10 / 旧版本）

如果无法使用镜像模式，从 WSL2 内部获取 Windows 宿主机 IP，用它代替 `localhost`：

```bash
# 获取 Windows 宿主机 IP（WSL2 虚拟网络的默认网关）
ip route show | grep -i default | awk '{ print $3 }'
# 示例输出：172.29.192.1
```

在 Hermes 配置中使用该 IP：

```yaml
model:
  default: qwen2.5-coder:32b
  provider: custom
  base_url: http://172.29.192.1:11434/v1   # Windows 宿主机 IP，不是 localhost
```

> 💡 **提示（动态获取）**：WSL2 重启后宿主机 IP 可能会变化。你可以在 shell 中动态获取：
>
> ```bash
> export WSL_HOST=$(ip route show | grep -i default | awk '{ print $3 }')
> echo "Windows 宿主机地址：$WSL_HOST"
> curl http://$WSL_HOST:11434/v1/models   # 测试 Ollama
> ```
>
> 或使用机器的 mDNS 名称（需要在 WSL2 中安装 `libnss-mdns`）：
> ```bash
> sudo apt install libnss-mdns
> curl http://$(hostname).local:11434/v1/models
> ```

#### 服务端绑定地址（NAT 模式必需）

如果你使用**方式 2**（NAT 模式 + 宿主机 IP），Windows 上的模型服务器必须接受来自 `127.0.0.1` 以外的连接。默认情况下，大多数服务器只监听 localhost——NAT 模式下 WSL2 连接来自不同的虚拟子网，会被拒绝。镜像模式下，`localhost` 直接映射，因此默认的 `127.0.0.1` 绑定可以正常工作。

| 服务器 | 默认绑定 | 修复方式 |
|--------|---------|---------|
| **Ollama** | `127.0.0.1` | 启动 Ollama 前设置 `OLLAMA_HOST=0.0.0.0` 环境变量（Windows 系统设置 → 环境变量，或编辑 Ollama 服务） |
| **LM Studio** | `127.0.0.1` | 在开发者标签 → 服务器设置中启用**"Serve on Network"** |
| **llama-server** | `127.0.0.1` | 在启动命令中添加 `--host 0.0.0.0` |
| **vLLM** | `0.0.0.0` | 默认已绑定所有接口 |
| **SGLang** | `127.0.0.1` | 在启动命令中添加 `--host 0.0.0.0` |

**Windows 上的 Ollama（详细步骤）：** Ollama 以 Windows 服务运行。设置 `OLLAMA_HOST`：
1. 打开**系统属性** → **环境变量**
2. 添加新的**系统变量**：`OLLAMA_HOST` = `0.0.0.0`
3. 重启 Ollama 服务（或重启计算机）

#### Windows 防火墙

Windows 防火墙将 WSL2 视为独立网络（NAT 模式和镜像模式均如此）。如果以上步骤后连接仍然失败，为你的模型服务器端口添加防火墙规则：

```powershell
# 在管理员 PowerShell 中运行——将 PORT 替换为你的服务器端口
New-NetFirewallRule -DisplayName "Allow WSL2 to Model Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 11434
```

常用端口：Ollama `11434`、vLLM `8000`、SGLang `30000`、llama-server `8080`、LM Studio `1234`。

#### 快速验证

在 WSL2 内部，测试你是否能访问模型服务器：

```bash
# 将 URL 替换为你的服务器地址和端口
curl http://localhost:11434/v1/models          # 镜像模式
curl http://172.29.192.1:11434/v1/models       # NAT 模式（使用你的实际宿主机 IP）
```

如果收到列出模型的 JSON 响应，说明配置成功。将同样的 URL 作为 Hermes 配置中的 `base_url`。

---

### 本地模型故障排查

以下问题影响与 Hermes 配合使用的**所有**本地推理服务器。

#### WSL2 无法连接到 Windows 宿主机上的模型服务器（"Connection refused"）

如果你在 WSL2 中运行 Hermes 且模型服务器在 Windows 宿主机上，`http://localhost:<port>` 在 WSL2 默认 NAT 网络模式下不可用。参见上方的 [WSL2 网络配置](#wsl2-networking-windows-users)。

#### 工具调用以文本形式出现而非执行

模型输出类似 `{"name": "web_search", "arguments": {...}}` 的消息，而不是实际调用工具。

**原因：** 你的服务器未启用工具调用，或模型不支持服务器的工具调用实现。

| 服务器 | 修复方式 |
|--------|---------|
| **llama.cpp** | 在启动命令中添加 `--jinja` |
| **vLLM** | 添加 `--enable-auto-tool-choice --tool-call-parser hermes` |
| **SGLang** | 添加 `--tool-call-parser qwen`（或合适的解析器） |
| **Ollama** | 工具调用默认已启用——确保你的模型支持它（用 `ollama show model-name` 检查） |
| **LM Studio** | 升级到 0.3.6+ 并使用具有原生工具支持的模型 |

#### 模型似乎忘记上下文或给出不连贯的响应

**原因：** 上下文窗口太小。当对话超过上下文限制时，大多数服务器会静默丢弃较早的消息。Hermes 的系统提示加工具 schema 单独就可能占用 4k–8k tokens。

**诊断：**

```bash
# 检查 Hermes 认为的上下文大小
# 查看启动行："Context limit: X tokens"

# 检查你的服务器实际上下文
# Ollama: ollama ps（查看 CONTEXT 列）
# llama.cpp: curl http://localhost:8080/props | jq '.default_generation_settings.n_ctx'
# vLLM: 检查启动参数中的 --max-model-len
```

**修复：** 将上下文设置为至少 **32,768 tokens** 用于 Agent 场景。具体标志参见上方各服务器的章节。

#### 启动时显示"Context limit: 2048 tokens"

Hermes 从服务器的 `/v1/models` 端点自动检测上下文长度。如果服务器报告的值很低（或根本不报告），Hermes 使用模型声明的限制，该值可能不正确。

**修复：** 在 `config.yaml` 中明确设置：

```yaml
model:
  default: your-model
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 32768
```

#### 响应在句子中途被截断

**可能原因：**
1. **服务器 `max_tokens` 过低** — SGLang 默认每次响应 128 tokens。在服务端设置 `--default-max-tokens`，或在 config.yaml 的 `model.max_tokens` 中配置 Hermes。
2. **上下文耗尽** — 模型填满了上下文窗口。增加上下文长度或在 Hermes 中启用[上下文压缩](/user-guide/configuration#context-compression)。

---

### LiteLLM Proxy — 多提供商网关

[LiteLLM](https://docs.litellm.ai/) 是一个 OpenAI 兼容代理，将 100 多个 LLM 提供商统一在单一 API 后面。适用场景：无需更改配置即可在提供商间切换、负载均衡、回退链、预算控制。

```bash
# 安装并启动
pip install "litellm[proxy]"
litellm --model anthropic/claude-sonnet-4 --port 4000

# 或使用配置文件支持多个模型：
litellm --config litellm_config.yaml --port 4000
```

然后用 `hermes model` → 自定义端点 → `http://localhost:4000/v1` 配置 Hermes。

带回退的 `litellm_config.yaml` 示例：
```yaml
model_list:
  - model_name: "best"
    litellm_params:
      model: anthropic/claude-sonnet-4
      api_key: sk-ant-...
  - model_name: "best"
    litellm_params:
      model: openai/gpt-4o
      api_key: sk-...
router_settings:
  routing_strategy: "latency-based-routing"
```

---

### ClawRouter — 成本优化路由

[ClawRouter](https://github.com/BlockRunAI/ClawRouter) 由 BlockRunAI 开发，是一个根据查询复杂度自动选择模型的本地路由代理。它从 14 个维度对请求进行分类，并路由到能够处理该任务的最便宜模型。支付方式为 USDC 加密货币（无需 API key）。

```bash
# 安装并启动
npx @blockrun/clawrouter    # 在 8402 端口启动
```

然后用 `hermes model` → 自定义端点 → `http://localhost:8402/v1` → 模型名称 `blockrun/auto` 配置 Hermes。

路由策略：
| 配置 | 策略 | 节省 |
|------|------|------|
| `blockrun/auto` | 质量/成本均衡 | 74-100% |
| `blockrun/eco` | 尽可能便宜 | 95-100% |
| `blockrun/premium` | 最佳质量模型 | 0% |
| `blockrun/free` | 仅免费模型 | 100% |
| `blockrun/agentic` | 针对工具使用优化 | 不定 |

> 📝 **说明**：ClawRouter 需要在 Base 或 Solana 上有 USDC 余额的钱包用于支付。所有请求通过 BlockRun 的后端 API 路由。运行 `npx @blockrun/clawrouter doctor` 检查钱包状态。

---

### 其他兼容提供商

任何具有 OpenAI 兼容 API 的服务均可使用。一些常见选项：

| 提供商 | Base URL | 说明 |
|--------|---------|------|
| [Together AI](https://together.ai) | `https://api.together.xyz/v1` | 云托管开源模型 |
| [Groq](https://groq.com) | `https://api.groq.com/openai/v1` | 超高速推理 |
| [DeepSeek](https://deepseek.com) | `https://api.deepseek.com/v1` | DeepSeek 模型 |
| [Fireworks AI](https://fireworks.ai) | `https://api.fireworks.ai/inference/v1` | 快速开源模型托管 |
| [Cerebras](https://cerebras.ai) | `https://api.cerebras.ai/v1` | 晶圆级芯片推理 |
| [Mistral AI](https://mistral.ai) | `https://api.mistral.ai/v1` | Mistral 模型 |
| [OpenAI](https://openai.com) | `https://api.openai.com/v1` | 直接访问 OpenAI |
| [Azure OpenAI](https://azure.microsoft.com) | `https://YOUR.openai.azure.com/` | 企业级 OpenAI |
| [LocalAI](https://localai.io) | `http://localhost:8080/v1` | 自托管，多模型 |
| [Jan](https://jan.ai) | `http://localhost:1337/v1` | 带本地模型的桌面应用 |

用 `hermes model` → 自定义端点配置，或在 `config.yaml` 中：

```yaml
model:
  default: meta-llama/Llama-3.1-70B-Instruct-Turbo
  provider: custom
  base_url: https://api.together.xyz/v1
  api_key: your-together-key
```

---

### 上下文长度检测

Hermes 使用多来源解析链来检测你的模型和提供商的正确上下文窗口：

1. **配置覆盖** — config.yaml 中的 `model.context_length`（最高优先级）
2. **自定义提供商按模型配置** — `custom_providers[].models.<id>.context_length`
3. **持久化缓存** — 之前发现的值（跨重启保留）
4. **端点 `/models`** — 查询服务器 API（本地/自定义端点）
5. **Anthropic `/v1/models`** — 为 `max_input_tokens` 查询 Anthropic API（仅 API key 用户）
6. **OpenRouter API** — 来自 OpenRouter 的实时模型元数据
7. **Nous Portal** — 将 Nous 模型 ID 与 OpenRouter 元数据进行后缀匹配
8. **[models.dev](https://models.dev)** — 社区维护的注册表，收录了 100 多个提供商共 3800 多个模型的上下文长度数据
9. **默认回退** — 广泛的模型家族匹配模式（默认 128K）

大多数情况下开箱即用。该系统具有提供商感知能力——同一模型在不同服务者处可能有不同的上下文限制（例如，`claude-opus-4.6` 在 Anthropic 直连时为 1M，在 GitHub Copilot 上为 128K）。

要明确设置上下文长度，在模型配置中添加 `context_length`：

```yaml
model:
  default: "qwen3.5:9b"
  base_url: "http://localhost:8080/v1"
  context_length: 131072  # tokens
```

对于自定义端点，也可以按模型设置上下文长度：

```yaml
custom_providers:
  - name: "My Local LLM"
    base_url: "http://localhost:11434/v1"
    models:
      qwen3.5:27b:
        context_length: 32768
      deepseek-r1:70b:
        context_length: 65536
```

配置自定义端点时，`hermes model` 会提示输入上下文长度。留空则自动检测。

> 💡 **提示（何时手动设置）**：
> - 你正在使用 Ollama，且自定义的 `num_ctx` 低于模型最大值
> - 你希望将上下文限制在模型最大值以下（如在 128k 模型上设置 8k 以节省显存）
> - 你通过不暴露 `/v1/models` 的代理运行

---

### 命名自定义提供商

如果你使用多个自定义端点（如本地开发服务器和远程 GPU 服务器），可以在 `config.yaml` 中将它们定义为命名自定义提供商：

```yaml
custom_providers:
  - name: local
    base_url: http://localhost:8080/v1
    # api_key 省略——Hermes 对无需 key 的本地服务器使用"no-key-required"
  - name: work
    base_url: https://gpu-server.internal.corp/v1
    api_key: corp-api-key
    api_mode: chat_completions   # 可选，从 URL 自动检测
  - name: anthropic-proxy
    base_url: https://proxy.example.com/anthropic
    api_key: proxy-key
    api_mode: anthropic_messages  # 用于 Anthropic 兼容代理
```

使用三段式语法在会话中切换：

```
/model custom:local:qwen-2.5       # 使用"local"端点和 qwen-2.5
/model custom:work:llama3-70b      # 使用"work"端点和 llama3-70b
/model custom:anthropic-proxy:claude-sonnet-4  # 使用代理
```

你也可以从交互式 `hermes model` 菜单中选择命名自定义提供商。

---

### 选型建议

| 使用场景 | 推荐方案 |
|---------|---------|
| **只想快速上手** | OpenRouter（默认）或 Nous Portal |
| **本地模型，简单配置** | Ollama |
| **生产级 GPU 服务** | vLLM 或 SGLang |
| **Mac / 无 GPU** | Ollama 或 llama.cpp |
| **多提供商路由** | LiteLLM Proxy 或 OpenRouter |
| **成本优化** | ClawRouter 或 OpenRouter（使用 `sort: "price"`） |
| **最大隐私保护** | Ollama、vLLM 或 llama.cpp（完全本地） |
| **企业 / Azure** | Azure OpenAI + 自定义端点 |
| **国内 AI 模型** | z.ai（GLM）、Kimi/Moonshot 或 MiniMax（原生支持提供商） |

:::tip
你可以随时使用 `hermes model` 切换提供商——无需重启。无论使用哪个提供商，你的对话历史、记忆和技能都会保留。
:::

## 可选 API Keys

| 功能 | 提供商 | 环境变量 |
|------|--------|---------|
| 网页抓取 | [Firecrawl](https://firecrawl.dev/) | `FIRECRAWL_API_KEY`、`FIRECRAWL_API_URL` |
| 浏览器自动化 | [Browserbase](https://browserbase.com/) | `BROWSERBASE_API_KEY`、`BROWSERBASE_PROJECT_ID` |
| 图像生成 | [FAL](https://fal.ai/) | `FAL_KEY` |
| 高质量 TTS 声音 | [ElevenLabs](https://elevenlabs.io/) | `ELEVENLABS_API_KEY` |
| OpenAI TTS + 语音转录 | [OpenAI](https://platform.openai.com/api-keys) | `VOICE_TOOLS_OPENAI_KEY` |
| 强化学习训练 | [Tinker](https://tinker-console.thinkingmachines.ai/) + [WandB](https://wandb.ai/) | `TINKER_API_KEY`、`WANDB_API_KEY` |
| 跨会话用户建模 | [Honcho](https://honcho.dev/) | `HONCHO_API_KEY` |
| 语义长期记忆 | [Supermemory](https://supermemory.ai) | `SUPERMEMORY_API_KEY` |

### 自托管 Firecrawl

默认情况下，Hermes 使用 [Firecrawl 云 API](https://firecrawl.dev/) 进行网页搜索和抓取。如果你希望在本地运行 Firecrawl，可以将 Hermes 指向自托管实例。完整安装说明参见 Firecrawl 的 [SELF_HOST.md](https://github.com/firecrawl/firecrawl/blob/main/SELF_HOST.md)。

**你将获得：** 无需 API key，无速率限制，无按页计费，完全的数据主权。

**你将失去：** 云版本使用 Firecrawl 专有的"Fire-engine"进行高级反机器人绕过（Cloudflare、验证码、IP 轮换）。自托管版本使用基础 fetch + Playwright，因此某些受保护的网站可能无法访问。搜索使用 DuckDuckGo 而非 Google。

**配置步骤：**

1. 克隆并启动 Firecrawl Docker 栈（5 个容器：API、Playwright、Redis、RabbitMQ、PostgreSQL——需要约 4–8 GB 内存）：
   ```bash
   git clone https://github.com/firecrawl/firecrawl
   cd firecrawl
   # 在 .env 中设置：USE_DB_AUTHENTICATION=false，HOST=0.0.0.0，PORT=3002
   docker compose up -d
   ```

2. 将 Hermes 指向你的实例（无需 API key）：
   ```bash
   hermes config set FIRECRAWL_API_URL http://localhost:3002
   ```

如果你的自托管实例启用了认证，也可以同时设置 `FIRECRAWL_API_KEY` 和 `FIRECRAWL_API_URL`。

## OpenRouter 提供商路由

使用 OpenRouter 时，你可以控制请求如何在各提供商之间路由。在 `~/.hermes/config.yaml` 中添加 `provider_routing` 节：

```yaml
provider_routing:
  sort: "throughput"          # "price"（默认）、"throughput" 或 "latency"
  # only: ["anthropic"]      # 仅使用这些提供商
  # ignore: ["deepinfra"]    # 跳过这些提供商
  # order: ["anthropic", "google"]  # 按此顺序尝试提供商
  # require_parameters: true  # 仅使用支持所有请求参数的提供商
  # data_collection: "deny"   # 排除可能存储/训练数据的提供商
```

**快捷方式：** 在任意模型名称后追加 `:nitro` 以启用吞吐量排序（如 `anthropic/claude-sonnet-4:nitro`），或追加 `:floor` 以启用价格排序。

## 回退模型

配置备用提供商:模型，当主模型失败时（速率限制、服务器错误、认证失败），Hermes 会自动切换到它：

```yaml
fallback_model:
  provider: openrouter                    # 必填
  model: anthropic/claude-sonnet-4        # 必填
  # base_url: http://localhost:8000/v1    # 可选，用于自定义端点
  # api_key_env: MY_CUSTOM_KEY           # 可选，自定义端点 API key 的环境变量名
```

激活时，回退会在不丢失对话的情况下在会话中途切换模型和提供商。每个会话**最多触发一次**。

支持的提供商：`openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`huggingface`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`、`deepseek`、`ai-gateway`、`opencode-zen`、`opencode-go`、`kilocode`、`alibaba`、`custom`。

:::tip
回退仅通过 `config.yaml` 配置——没有对应的环境变量。有关触发时机、支持的提供商以及与辅助任务和委托的交互方式的详细信息，参见[回退提供商](/user-guide/features/fallback-providers)。
:::

## 智能模型路由

可选的廉价/强力分级路由让 Hermes 将主模型保留给复杂工作，同时将非常短/简单的轮次发送到更便宜的模型。

```yaml
smart_model_routing:
  enabled: true
  max_simple_chars: 160
  max_simple_words: 28
  cheap_model:
    provider: openrouter
    model: google/gemini-2.5-flash
    # base_url: http://localhost:8000/v1  # 可选自定义端点
    # api_key_env: MY_CUSTOM_KEY          # 可选，该端点 API key 的环境变量名
```

工作原理：
- 如果某个轮次很短、单行，且看起来不是代码/工具/调试类工作，Hermes 可能会将其路由到 `cheap_model`
- 如果轮次看起来很复杂，Hermes 保持在主模型/提供商上
- 如果廉价路由无法顺利解析，Hermes 自动回退到主模型

这是有意设计的保守策略，面向快速、低风险的轮次，例如：
- 简短的事实性问题
- 快速改写
- 轻量级摘要

以下类型的提示会避免路由：
- 编码/调试工作
- 工具密集型请求
- 长篇或多行分析需求

当你希望在不完全更换默认模型的情况下降低延迟或成本时，使用此功能。

---

## 参见

- [配置](/user-guide/configuration) — 通用配置（目录结构、配置优先级、终端后端、记忆、压缩等）
- [环境变量](/reference/environment-variables) — 所有环境变量的完整参考
