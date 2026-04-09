---
title: "在 Mac 上运行本地 LLM"
---
# 在 Mac 上运行本地 LLM

本指南将带您在 macOS 上搭建一个具备 OpenAI 兼容 API 的本地 LLM 服务器。完全私密、零 API 费用，加上 Apple Silicon 上超乎预期的优秀性能——三者兼得。

本指南涵盖两种后端：

| 后端 | 安装方式 | 最擅长 | 格式 |
|---------|---------|---------|--------|
| **llama.cpp** | `brew install llama.cpp` | 最短的首 token 延迟，量化 KV cache 节省内存 | GGUF |
| **omlx** | [omlx.ai](https://omlx.ai) | 最快的 token 生成速度，原生 Metal 优化 | MLX (safetensors) |

两者均提供 OpenAI 兼容的 `/v1/chat/completions` 端点。Hermes Agent 兼容两种后端——只需将其指向 `http://localhost:8080` 或 `http://localhost:8000` 即可。

> ℹ️ **注意**：本指南面向搭载 Apple Silicon（M1 及更新版本）的 Mac。Intel Mac 也可使用 llama.cpp，但不支持 GPU 加速——性能会明显较慢。

---

## 选择模型

入门推荐 **Qwen3.5-9B**——这是一个强大的推理模型，经过量化后可在 8 GB 及以上统一内存中稳定运行。

| 版本 | 磁盘占用 | 所需内存（128K 上下文） | 后端 |
|---------|-------------|---------------------------|---------|
| Qwen3.5-9B-Q4_K_M (GGUF) | 5.3 GB | ~10 GB（量化 KV cache） | llama.cpp |
| Qwen3.5-9B-mlx-lm-mxfp4 (MLX) | ~5 GB | ~12 GB | omlx |

**内存经验法则：** 模型大小 + KV cache。9B Q4 模型约 5 GB；128K 上下文下，Q4 量化的 KV cache 额外占用约 4-5 GB。若使用默认的 f16 KV cache，总占用会膨胀至约 16 GB。llama.cpp 的量化 KV cache 参数是内存受限系统最关键的优化手段。

对于更大的模型（27B、35B），需要 32 GB 及以上的统一内存。9B 是 8-16 GB 设备的最佳选择。

---

## 方案 A：llama.cpp

llama.cpp 是移植性最好的本地 LLM 运行时，在 macOS 上默认通过 Metal 进行 GPU 加速。

### 安装

```bash
brew install llama.cpp
```

这将全局安装 `llama-server` 命令。

### 下载模型

您需要 GGUF 格式的模型。最便捷的方式是通过 `huggingface-cli` 从 Hugging Face 下载：

```bash
brew install huggingface-cli
```

然后下载模型：

```bash
huggingface-cli download unsloth/Qwen3.5-9B-GGUF Qwen3.5-9B-Q4_K_M.gguf --local-dir ~/models
```

:::tip
Hugging Face 上的部分模型需要身份验证。如果遇到 401 或 404 错误，请先运行 `huggingface-cli login`。
:::

### 启动服务器

```bash
llama-server -m ~/models/Qwen3.5-9B-Q4_K_M.gguf \
  -ngl 99 \
  -c 131072 \
  -np 1 \
  -fa on \
  --cache-type-k q4_0 \
  --cache-type-v q4_0 \
  --host 0.0.0.0
```

各参数说明：

| 参数 | 用途 |
|------|---------|
| `-ngl 99` | 将所有层卸载到 GPU（Metal）。设置较大数值以确保无层留在 CPU 上。 |
| `-c 131072` | 上下文窗口大小（128K token）。内存不足时可适当减小。 |
| `-np 1` | 并行槽数量。单用户使用时保持为 1——更多并行槽会分摊内存预算。 |
| `-fa on` | Flash attention。减少内存占用，加速长上下文推理。 |
| `--cache-type-k q4_0` | 将键缓存量化为 4 位。**这是最重要的内存节省手段。** |
| `--cache-type-v q4_0` | 将值缓存量化为 4 位。与上一项配合，可将 KV cache 内存相比 f16 减少约 75%。 |
| `--host 0.0.0.0` | 监听所有网络接口。如不需要网络访问，请使用 `127.0.0.1`。 |

看到以下输出时，服务器已就绪：

```
main: server is listening on http://0.0.0.0:8080
srv  update_slots: all slots are idle
```

### 内存受限系统的优化

`--cache-type-k q4_0 --cache-type-v q4_0` 是内存受限系统最重要的优化参数。以下是 128K 上下文下的内存占用对比：

| KV cache 类型 | KV cache 内存（128K 上下文，9B 模型） |
|---------------|--------------------------------------|
| f16（默认） | ~16 GB |
| q8_0 | ~8 GB |
| **q4_0** | **~4 GB** |

8 GB Mac：使用 `q4_0` KV cache，并将上下文缩减至 `-c 32768`（32K）。16 GB：可轻松支持 128K 上下文。32 GB 及以上：可运行更大模型或开启多个并行槽。

如果仍出现内存不足，优先减小上下文大小（`-c`），再考虑使用更小的量化（Q3_K_M 替代 Q4_K_M）。

### 测试

```bash
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.5-9B-Q4_K_M.gguf",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }' | jq .choices[0].message.content
```

### 获取模型名称

如果忘记了模型名称，可查询 models 端点：

```bash
curl -s http://localhost:8080/v1/models | jq '.data[].id'
```

---

## 方案 B：MLX（通过 omlx）

[omlx](https://omlx.ai) 是一款原生 macOS 应用，提供图形化模型管理界面和内置服务器，用于管理和运行 MLX 模型。MLX 是 Apple 自研的机器学习框架，专为 Apple Silicon 统一内存架构优化。

### 安装

从 [omlx.ai](https://omlx.ai) 下载并安装。

### 下载模型

使用 omlx 应用浏览并下载模型。搜索 `Qwen3.5-9B-mlx-lm-mxfp4` 并下载。模型默认存储在本地（通常位于 `~/.omlx/models/`）。

### 启动服务器

omlx 默认在 `http://127.0.0.1:8000` 提供服务。从应用界面启动服务，或使用 CLI（如可用）。

### 测试

```bash
curl -s http://127.0.0.1:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.5-9B-mlx-lm-mxfp4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }' | jq .choices[0].message.content
```

### 查看可用模型

omlx 支持同时提供多个模型服务：

```bash
curl -s http://127.0.0.1:8000/v1/models | jq '.data[].id'
```

---

## 基准测试：llama.cpp vs MLX

两种后端均在同一台机器（Apple M5 Max，128 GB 统一内存）上，使用相同模型（Qwen3.5-9B）和相近量化级别（GGUF 使用 Q4_K_M，MLX 使用 mxfp4）进行测试。各使用 5 个不同提示词，每个运行 3 次，顺序测试两种后端以避免资源争用。

### 测试结果

| 指标 | llama.cpp (Q4_K_M) | MLX (mxfp4) | 胜出 |
|--------|-------------------|-------------|--------|
| **TTFT（平均）** | **67 ms** | 289 ms | llama.cpp（快 4.3 倍） |
| **TTFT（p50）** | **66 ms** | 286 ms | llama.cpp（快 4.3 倍） |
| **生成速度（平均）** | 70 tok/s | **96 tok/s** | MLX（快 37%） |
| **生成速度（p50）** | 70 tok/s | **96 tok/s** | MLX（快 37%） |
| **总耗时（512 token）** | 7.3s | **5.5s** | MLX（快 25%） |

### 结果解读

- **llama.cpp** 在提示词处理方面表现突出——其 flash attention + 量化 KV cache 流水线可将首 token 延迟（TTFT）控制在约 66ms。如果您正在构建需要即时响应感的交互式应用（聊天机器人、自动补全），这是显著的优势。

- **MLX** 一旦开始生成，token 生成速度约快 37%。对于批量处理、长文本生成，或任何总完成时间比初始延迟更重要的场景，MLX 总耗时更短。

- 两种后端都**极为稳定**——多次运行的方差可忽略不计，这些数据具有高度可信度。

### 如何选择？

| 使用场景 | 推荐 |
|----------|---------------|
| 交互式聊天、低延迟工具 | llama.cpp |
| 长文本生成、批量处理 | MLX (omlx) |
| 内存受限（8-16 GB） | llama.cpp（量化 KV cache 无可匹敌） |
| 同时提供多个模型服务 | omlx（内置多模型支持） |
| 最大兼容性（含 Linux） | llama.cpp |

---

## 连接到 Hermes Agent

本地服务器运行后：

```bash
hermes model
```

选择**自定义端点**，按提示操作。系统会询问 base URL 和模型名称——填入您所配置后端的对应值即可。
