---
title: "批量处理"
---
# 批量处理

批量处理让你可以在数百甚至数千个提示词上并行运行 Hermes Agent，生成结构化的轨迹数据。这主要用于**训练数据生成**——产出包含工具使用统计信息的 ShareGPT 格式轨迹，可用于微调或评估。

## 概述

批量运行器（`batch_runner.py`）处理一个包含提示词的 JSONL 数据集，将每个提示词在带有工具访问权限的完整智能体会话中独立运行。每个提示词拥有自己的隔离环境。输出为结构化的轨迹数据，包含完整的对话历史、工具调用统计和推理覆盖率指标。

## 快速开始

```bash
# 基本批量运行
python batch_runner.py \
    --dataset_file=data/prompts.jsonl \
    --batch_size=10 \
    --run_name=my_first_run \
    --model=anthropic/claude-sonnet-4.6 \
    --num_workers=4

# 恢复中断的运行
python batch_runner.py \
    --dataset_file=data/prompts.jsonl \
    --batch_size=10 \
    --run_name=my_first_run \
    --resume

# 列出可用的工具集分布
python batch_runner.py --list_distributions
```

## 数据集格式

输入数据集是一个 JSONL 文件（每行一个 JSON 对象）。每条记录必须包含 `prompt` 字段：

```jsonl
{"prompt": "Write a Python function that finds the longest palindromic substring"}
{"prompt": "Create a REST API endpoint for user authentication using Flask"}
{"prompt": "Debug this error: TypeError: cannot unpack non-iterable NoneType object"}
```

记录还可以包含以下可选字段：

- `image` 或 `docker_image`：该提示词沙箱所使用的容器镜像（支持 Docker、Modal 和 Singularity 后端）
- `cwd`：该任务终端会话的工作目录覆盖

## 配置选项

| 参数 | 默认值 | 描述 |
|-----------|---------|-------------|
| `--dataset_file` | （必填） | JSONL 数据集路径 |
| `--batch_size` | （必填） | 每批次的提示词数量 |
| `--run_name` | （必填） | 本次运行名称（用于输出目录和检查点） |
| `--distribution` | `"default"` | 采样使用的工具集分布 |
| `--model` | `claude-sonnet-4.6` | 使用的模型 |
| `--base_url` | `https://openrouter.ai/api/v1` | API 基础 URL |
| `--api_key` | （环境变量） | 模型的 API 密钥 |
| `--max_turns` | `10` | 每个提示词的最大工具调用轮次 |
| `--num_workers` | `4` | 并行工作进程数 |
| `--resume` | `false` | 从检查点恢复 |
| `--verbose` | `false` | 启用详细日志 |
| `--max_samples` | 全部 | 仅处理数据集中的前 N 个样本 |
| `--max_tokens` | 模型默认值 | 每次模型响应的最大 token 数 |

### 服务商路由（OpenRouter）

| 参数 | 描述 |
|-----------|-------------|
| `--providers_allowed` | 允许的服务商列表，逗号分隔（如 `"anthropic,openai"`） |
| `--providers_ignored` | 忽略的服务商列表，逗号分隔（如 `"together,deepinfra"`） |
| `--providers_order` | 首选服务商顺序，逗号分隔 |
| `--provider_sort` | 排序依据：`"price"`（价格）、`"throughput"`（吞吐量）或 `"latency"`（延迟） |

### 推理控制

| 参数 | 描述 |
|-----------|-------------|
| `--reasoning_effort` | 推理强度：`xhigh`、`high`、`medium`、`low`、`minimal`、`none` |
| `--reasoning_disabled` | 完全禁用推理/思考 token |

### 高级选项

| 参数 | 描述 |
|-----------|-------------|
| `--ephemeral_system_prompt` | 执行时使用但不保存到轨迹中的系统提示词 |
| `--log_prefix_chars` | 日志预览中显示的字符数（默认：100） |
| `--prefill_messages_file` | 含有预填充消息的 JSON 文件路径，用于 few-shot 引导 |

## 工具集分布

每个提示词会从某个**分布**中随机采样一组工具集。这确保训练数据覆盖多样化的工具组合。使用 `--list_distributions` 查看所有可用分布。

在当前实现中，分布为**每个独立工具集**分配一个概率。采样器对每个工具集独立进行随机采样，并保证至少启用一个工具集。这与人工预先设计的工具组合列表不同。

## 输出格式

所有输出保存到 `data/<run_name>/`：

```text
data/my_run/
├── trajectories.jsonl    # 合并后的最终输出（所有批次合并）
├── batch_0.jsonl         # 各批次结果
├── batch_1.jsonl
├── ...
├── checkpoint.json       # 恢复检查点
└── statistics.json       # 汇总工具使用统计
```

### 轨迹格式

`trajectories.jsonl` 中的每一行是一个 JSON 对象：

```json
{
  "prompt_index": 42,
  "conversations": [
    {"from": "human", "value": "Write a function..."},
    {"from": "gpt", "value": "I'll create that function...",
     "tool_calls": [...]},
    {"from": "tool", "value": "..."},
    {"from": "gpt", "value": "Here's the completed function..."}
  ],
  "metadata": {
    "batch_num": 2,
    "timestamp": "2026-01-15T10:30:00",
    "model": "anthropic/claude-sonnet-4.6"
  },
  "completed": true,
  "partial": false,
  "api_calls": 3,
  "toolsets_used": ["terminal", "file"],
  "tool_stats": {
    "terminal": {"count": 2, "success": 2, "failure": 0},
    "read_file": {"count": 1, "success": 1, "failure": 0}
  },
  "tool_error_counts": {
    "terminal": 0,
    "read_file": 0
  }
}
```

`conversations` 字段采用类 ShareGPT 格式，包含 `from` 和 `value` 字段。工具统计信息已做标准化处理，所有可能的工具均以零值作为默认统计，确保各条目具有一致的数据结构，以兼容 HuggingFace 数据集。

## 检查点机制

批量运行器具备健全的检查点机制以实现容错：

- **检查点文件：** 每批次完成后保存，追踪已完成的提示词索引
- **基于内容的恢复：** 使用 `--resume` 时，运行器扫描现有批次文件，通过实际文本内容（而非索引）匹配已完成的提示词，即使数据集顺序发生变化也能正确恢复
- **失败的提示词：** 只有成功完成的提示词才会被标记为已完成——失败的提示词将在恢复时重试
- **批次合并：** 完成时，所有批次文件（包括之前运行的）会被合并为一个 `trajectories.jsonl`

### 恢复流程

1. 扫描所有 `batch_*.jsonl` 文件，以内容匹配方式找出已完成的提示词
2. 过滤数据集，排除已完成的提示词
3. 对剩余提示词重新分批
4. 仅处理剩余的提示词
5. 将所有批次文件（旧的和新的）合并为最终输出

## 质量过滤

批量运行器会自动进行质量过滤：

- **无推理过滤：** 零个助手轮次包含推理（无 `<think>` 标签或原生思考 token）的样本将被丢弃
- **损坏条目过滤：** 含有幻觉工具名称（不在有效工具列表中）的条目在最终合并时会被过滤掉
- **推理统计：** 追踪整个运行过程中包含推理与不含推理的轮次占比

## 统计信息

完成后，运行器会输出全面的统计信息：

- **工具使用：** 每个工具的调用次数、成功/失败率
- **推理覆盖率：** 含有推理的助手轮次百分比
- **丢弃的样本：** 因缺乏推理而被过滤的样本数量
- **耗时：** 总处理时间

统计信息也会保存到 `statistics.json`，便于程序化分析。

## 使用场景

### 训练数据生成

为微调生成多样化的工具使用轨迹：

```bash
python batch_runner.py \
    --dataset_file=data/coding_prompts.jsonl \
    --batch_size=20 \
    --run_name=coding_v1 \
    --model=anthropic/claude-sonnet-4.6 \
    --num_workers=8 \
    --distribution=default \
    --max_turns=15
```

### 模型评估

评估模型在标准化提示词集上使用工具的能力：

```bash
python batch_runner.py \
    --dataset_file=data/eval_suite.jsonl \
    --batch_size=10 \
    --run_name=eval_gpt4 \
    --model=openai/gpt-4o \
    --num_workers=4 \
    --max_turns=10
```

### 按提示词指定容器镜像

对于需要特定环境的基准测试，每个提示词可以指定自己的容器镜像：

```jsonl
{"prompt": "Install numpy and compute eigenvalues of a 3x3 matrix", "image": "python:3.11-slim"}
{"prompt": "Compile this Rust program and run it", "image": "rust:1.75"}
{"prompt": "Set up a Node.js Express server", "image": "node:20-alpine", "cwd": "/app"}
```

批量运行器会在运行每个提示词前，验证对应 Docker 镜像是否可访问。
