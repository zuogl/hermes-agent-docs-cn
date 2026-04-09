---
title: "内置技能目录"
---
# 内置技能目录

Hermes 安装时会将大量内置技能库复制到 `~/.hermes/skills/` 目录。本页面列出了仓库 `skills/` 目录下的所有内置技能。

## apple

Apple/macOS 专属技能——iMessage、提醒事项、备忘录、查找我的以及 macOS 自动化。这些技能仅在 macOS 系统上加载。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `apple-notes` | 通过 macOS 上的 memo CLI 管理 Apple 备忘录（创建、查看、搜索、编辑）。 | `apple/apple-notes` |
| `apple-reminders` | 通过 remindctl CLI 管理 Apple 提醒事项（列出、添加、完成、删除）。 | `apple/apple-reminders` |
| `findmy` | 通过 AppleScript 和屏幕截图使用 macOS FindMy.app 追踪 Apple 设备和 AirTag。 | `apple/findmy` |
| `imessage` | 通过 macOS 上的 imsg CLI 发送和接收 iMessage/SMS。 | `apple/imessage` |

## autonomous-ai-agents

用于生成和编排自主 AI 编程智能体及多智能体工作流的技能——运行独立智能体进程、委派任务、协调并行工作流。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `claude-code` | 将编程任务委派给 Claude Code（Anthropic 的 CLI 智能体）。适用于开发功能、重构、PR 审查和迭代编程。需要安装 claude CLI。 | `autonomous-ai-agents/claude-code` |
| `codex` | 将编程任务委派给 OpenAI Codex CLI 智能体。适用于开发功能、重构、PR 审查和批量 issue 修复。需要安装 codex CLI 和 git 仓库。 | `autonomous-ai-agents/codex` |
| `hermes-agent-spawning` | 将额外的 Hermes Agent 实例作为自主子进程启动，用于独立的长时间运行任务。支持非交互式一次性模式（-q）和交互式 PTY 模式以实现多轮协作。与 delegate_task 不同——此模式运行完整独立的 hermes 进程。 | `autonomous-ai-agents/hermes-agent` |
| `opencode` | 将编程任务委派给 OpenCode CLI 智能体，用于功能实现、重构、PR 审查和长时间自主会话。需要安装并认证 opencode CLI。 | `autonomous-ai-agents/opencode` |

## data-science

用于数据科学工作流的技能——交互式探索、Jupyter 笔记本、数据分析与可视化。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `jupyter-live-kernel` | 通过 hamelnb 使用实时 Jupyter 内核进行有状态、迭代式 Python 执行。当任务涉及探索、迭代或检查中间结果时加载此技能。 | `data-science/jupyter-live-kernel` |

## creative

创意内容生成——ASCII 艺术、手绘风格图表和视觉设计工具。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `ascii-art` | 使用 pyfiglet（571 种字体）、cowsay、boxes、toilet、image-to-ascii、远程 API（asciified、ascii.co.uk）以及 LLM 兜底方案生成 ASCII 艺术。无需 API 密钥。 | `creative/ascii-art` |
| `ascii-video` | ASCII 艺术视频生产流水线——支持任意格式。将视频/音频/图像/生成式输入转换为彩色 ASCII 字符视频输出（MP4、GIF、图像序列）。涵盖：视频转 ASCII、音频响应式音乐可视化、生成式 ASCII 艺术动画、混合… | `creative/ascii-video` |
| `excalidraw` | 使用 Excalidraw JSON 格式创建手绘风格图表。生成 .excalidraw 文件，用于架构图、流程图、序列图、概念图等。文件可在 excalidraw.com 打开或上传以获取分享链接。 | `creative/excalidraw` |
| `p5js` | 使用 p5.js 创建交互式和生成式视觉艺术的生产流水线。通过无头浏览器将草图渲染为图像/视频，并提供实时预览。支持 Canvas 动画、数据可视化和创意编程实验。 | `creative/p5js` |

## devops

DevOps 和基础设施自动化技能。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `webhook-subscriptions` | 为事件驱动的智能体激活创建和管理 Webhook 订阅。外部服务（GitHub、Stripe、CI/CD、IoT）通过 POST 事件触发智能体运行。需要启用 Webhook 平台。 | `devops/webhook-subscriptions` |

## dogfood

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `dogfood` | 对 Web 应用进行系统化探索性 QA 测试——发现缺陷、收集证据并生成结构化报告。 | `dogfood/dogfood` |
| `hermes-agent-setup` | 帮助用户配置 Hermes Agent——CLI 用法、设置向导、模型/提供商选择、工具、技能、语音/STT/TTS、网关以及故障排查。 | `dogfood/hermes-agent-setup` |

## email

用于在终端发送、接收、搜索和管理电子邮件的技能。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `himalaya` | 通过 IMAP/SMTP 管理电子邮件的 CLI。使用 himalaya 在终端中列出、阅读、撰写、回复、转发、搜索和整理邮件。支持多账户和使用 MML（MIME Meta Language）撰写邮件。 | `email/himalaya` |

## gaming

用于搭建、配置和管理游戏服务器、模组包及游戏相关基础设施的技能。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `minecraft-modpack-server` | 从 CurseForge/Modrinth 服务器包 zip 文件搭建模组 Minecraft 服务器。涵盖 NeoForge/Forge 安装、Java 版本、JVM 调优、防火墙、局域网配置、备份和启动脚本。 | `gaming/minecraft-modpack-server` |
| `pokemon-player` | 通过无头模拟器自主运行宝可梦游戏。启动游戏服务器、从内存读取结构化游戏状态、做出策略决策并发送按键输入——全部在终端完成。 | `gaming/pokemon-player` |

## github

用于管理仓库、拉取请求、代码审查、issues 和 CI/CD 流水线的 GitHub 工作流技能，通过终端使用 gh CLI 和 git。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `codebase-inspection` | 使用 pygount 进行代码行数统计、语言分布和代码与注释比率分析，检查和分析代码库。当需要统计代码行数、仓库大小、语言构成或代码库数据时使用。 | `github/codebase-inspection` |
| `github-auth` | 使用 git（通用可用）或 gh CLI 为智能体配置 GitHub 身份验证。涵盖 HTTPS token、SSH 密钥、凭据助手和 gh auth——含自动检测流程以选择合适方法。 | `github/github-auth` |
| `github-code-review` | 通过分析 git diff、在 PR 上留下行内评论以及在推送前进行全面审查来审查代码变更。使用 gh CLI 或回退到 git + GitHub REST API via curl。 | `github/github-code-review` |
| `github-issues` | 创建、管理、分类和关闭 GitHub issues。搜索现有 issues、添加标签、分配人员并关联 PR。使用 gh CLI 或回退到 git + GitHub REST API via curl。 | `github/github-issues` |
| `github-pr-workflow` | 完整的拉取请求生命周期——创建分支、提交变更、开启 PR、监控 CI 状态、自动修复失败并合并。使用 gh CLI 或回退到 git + GitHub REST API via curl。 | `github/github-pr-workflow` |
| `github-repo-management` | 克隆、创建、fork、配置和管理 GitHub 仓库。管理远程仓库、密钥、发布版本和工作流。使用 gh CLI 或回退到 git + GitHub REST API via curl。 | `github/github-repo-management` |

## inference-sh

通过 inference.sh 云平台执行 AI 应用的技能。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `inference-sh-cli` | 通过 inference.sh CLI（infsh）运行 150+ AI 应用——图像生成、视频创作、LLM、搜索、3D、社交自动化。 | `inference-sh/cli` |

## leisure

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `find-nearby` | 使用 OpenStreetMap 查找附近地点（餐厅、咖啡馆、酒吧、药店等）。支持坐标、地址、城市、邮政编码或 Telegram 位置图钉。无需 API 密钥。 | `leisure/find-nearby` |

## mcp

用于 MCP（Model Context Protocol，模型上下文协议）服务器、工具和集成的技能。包括内置原生 MCP 客户端（在 config.yaml 中配置服务器以自动发现工具）和用于临时服务器交互的 mcporter CLI 桥接工具。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `mcporter` | 使用 mcporter CLI 直接列出、配置、认证和调用 MCP 服务器/工具（HTTP 或 stdio），包括临时服务器、配置编辑和 CLI/类型生成。 | `mcp/mcporter` |
| `native-mcp` | 内置 MCP 客户端，连接外部 MCP 服务器、发现其工具并将其注册为 Hermes Agent 原生工具。支持 stdio 和 HTTP 传输，具备自动重连、安全过滤和零配置工具注入功能。 | `mcp/native-mcp` |

## media

用于处理媒体内容的技能——YouTube 字幕、GIF 搜索、音乐生成和音频可视化。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `gif-search` | 通过 curl 从 Tenor 搜索和下载 GIF。除 curl 和 jq 外无其他依赖。适用于查找表情 GIF、创建视觉内容和在聊天中发送 GIF。 | `media/gif-search` |
| `heartmula` | 设置并运行 HeartMuLa，这是一个开源音乐生成模型系列（类 Suno）。可从歌词和标签生成完整歌曲，支持多语言。 | `media/heartmula` |
| `songsee` | 通过 CLI 从音频文件生成频谱图和音频特征可视化（mel、chroma、MFCC、tempogram 等）。适用于音频分析、音乐制作调试和视觉文档。 | `media/songsee` |
| `youtube-content` | 获取 YouTube 视频字幕并将其转换为结构化内容（章节、摘要、帖子、博客文章）。 | `media/youtube-content` |

## mlops

通用 ML 运维工具——模型中心管理、数据集操作和工作流编排。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `huggingface-hub` | Hugging Face Hub CLI（hf）——搜索、下载和上传模型与数据集，管理仓库，部署推理端点。 | `mlops/huggingface-hub` |

## mlops/cloud

用于 ML 工作负载的 GPU 云提供商和无服务器计算平台。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `lambda-labs-gpu-cloud` | 用于 ML 训练和推理的按需和预留 GPU 云实例。当需要通过简单 SSH 访问的专用 GPU 实例、持久文件系统或用于大规模训练的高性能多节点集群时使用。 | `mlops/cloud/lambda-labs` |
| `modal-serverless-gpu` | 用于运行 ML 工作负载的无服务器 GPU 云平台。当需要按需 GPU 访问而无需管理基础设施、将 ML 模型部署为 API 或运行自动扩缩容的批处理任务时使用。 | `mlops/cloud/modal` |

## mlops/evaluation

模型评估基准、实验追踪、数据整理、分词器和可解释性工具。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `evaluating-llms-harness` | 在 60+ 学术基准（MMLU、HumanEval、GSM8K、TruthfulQA、HellaSwag）上评估 LLM。适用于对模型质量进行基准测试、比较模型、汇报学术结果或追踪训练进度。业界标准工具，被 EleutherAI、HuggingFace 和主要实验室广泛使用。支持… | `mlops/evaluation/lm-evaluation-harness` |
| `huggingface-tokenizers` | 针对研究和生产优化的高速分词器。基于 Rust 实现，可在 20 秒内分词 1GB 数据。支持 BPE、WordPiece 和 Unigram 算法。可训练自定义词表、追踪对齐信息、处理填充/截断。与 transformers 无缝集成。使用… | `mlops/evaluation/huggingface-tokenizers` |
| `nemo-curator` | 用于 LLM 训练的 GPU 加速数据整理工具。支持文本/图像/视频/音频。具备模糊去重（速度提升 16×）、质量过滤（30+ 启发式规则）、语义去重、PII 脱敏和 NSFW 检测功能。通过 RAPIDS 实现多 GPU 扩展。用于准备高质量训练… | `mlops/evaluation/nemo-curator` |
| `sparse-autoencoder-training` | 提供使用 SAELens 训练和分析稀疏自编码器（SAE）的指导，将神经网络激活分解为可解释特征。适用于发现可解释特征、分析叠加性或研究语言模型中的单语义表示… | `mlops/evaluation/saelens` |
| `weights-and-biases` | 通过自动日志记录追踪 ML 实验，实时可视化训练过程，通过超参数扫描进行优化，并使用 W&B 协作 MLOps 平台管理模型注册表。 | `mlops/evaluation/weights-and-biases` |

## mlops/inference

模型服务、量化（GGUF/GPTQ）、结构化输出、推理优化以及用于部署和运行 LLM 的模型手术工具。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `gguf-quantization` | 用于高效 CPU/GPU 推理的 GGUF 格式和 llama.cpp 量化。适用于在消费级硬件、Apple Silicon 上部署模型，或在无 GPU 要求的情况下进行 2-8 位灵活量化。 | `mlops/inference/gguf` |
| `guidance` | 使用正则表达式和语法控制 LLM 输出，保证生成有效的 JSON/XML/代码，强制执行结构化格式，并使用 Guidance（微软研究院的约束生成框架）构建多步骤工作流。 | `mlops/inference/guidance` |
| `instructor` | 使用 Pydantic 验证从 LLM 响应中提取结构化数据，自动重试失败的提取，安全解析复杂 JSON，并使用 Instructor（经过验证的结构化输出库）流式传输部分结果。 | `mlops/inference/instructor` |
| `llama-cpp` | 在 CPU、Apple Silicon 和消费级 GPU 上运行 LLM 推理，无需 NVIDIA 硬件。适用于边缘部署、M1/M2/M3 Mac、AMD/Intel GPU，或 CUDA 不可用时。支持 GGUF 量化（1.5-8 位），相比 CPU 上的 PyTorch 可减少内存占用并实现 4-10× 加速。 | `mlops/inference/llama-cpp` |
| `obliteratus` | 使用 OBLITERATUS 从开源权重 LLM 中移除拒绝行为——均值差异、SVD、白化 SVD、LEACE、SAE 分解等机理可解释性技术，在保留推理能力的同时去除护栏。9 种 CLI 方法、28 个分析模块、116 种模型预设覆盖… | `mlops/inference/obliteratus` |
| `outlines` | 在生成过程中保证有效的 JSON/XML/代码结构，使用 Pydantic 模型实现类型安全输出，支持本地模型（Transformers、vLLM），并使用 Outlines（dottxt.ai 的结构化生成库）最大化推理速度。 | `mlops/inference/outlines` |
| `serving-llms-vllm` | 使用 vLLM 的 PagedAttention 和连续批处理以高吞吐量服务 LLM。适用于部署生产级 LLM API、优化推理延迟/吞吐量，或在有限 GPU 内存下服务模型。支持兼容 OpenAI 的端点、量化（GPTQ/AWQ/FP8）以及… | `mlops/inference/vllm` |
| `tensorrt-llm` | 使用 NVIDIA TensorRT 优化 LLM 推理，实现最大吞吐量和最低延迟。适用于在 NVIDIA GPU（A100/H100）上进行生产部署、需要比 PyTorch 快 10-100 倍的推理速度，或使用量化（FP8/INT4）、动态批处理和多 GPU 服务模型时… | `mlops/inference/tensorrt-llm` |

## mlops/models

特定模型架构和工具——计算机视觉（CLIP、SAM、Stable Diffusion）、语音（Whisper）、音频生成（AudioCraft）和多模态模型（LLaVA）。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `audiocraft-audio-generation` | 用于音频生成的 PyTorch 库，包括文本转音乐（MusicGen）和文本转音效（AudioGen）。适用于从文本描述生成音乐、创建音效或进行旋律条件化音乐生成。 | `mlops/models/audiocraft` |
| `clip` | OpenAI 的视觉与语言连接模型。支持零样本图像分类、图像-文本匹配和跨模态检索。在 4 亿图像-文本对上训练。适用于图像搜索、内容审核或无需微调的视觉-语言任务。最适合通用… | `mlops/models/clip` |
| `llava` | 大型语言和视觉助手。支持视觉指令微调和基于图像的对话。将 CLIP 视觉编码器与 Vicuna/LLaMA 语言模型结合。支持多轮图像对话、视觉问答和指令跟随。适用于视觉-语言对话… | `mlops/models/llava` |
| `segment-anything-model` | 用于图像分割的基础模型，支持零样本迁移。适用于使用点、框或掩码作为提示词分割图像中的任意对象，或自动生成图像中所有对象的掩码。 | `mlops/models/segment-anything` |
| `stable-diffusion-image-generation` | 通过 HuggingFace Diffusers 使用 Stable Diffusion 模型进行最先进的文本生成图像。适用于从文本提示词生成图像、图像到图像转换、图像修复或构建自定义扩散流水线。 | `mlops/models/stable-diffusion` |
| `whisper` | OpenAI 的通用语音识别模型。支持 99 种语言、转录、翻译成英语和语言识别。六种模型大小，从 tiny（3900 万参数）到 large（15.5 亿参数）。适用于语音转文本、播客转录或多语言音频处理… | `mlops/models/whisper` |

## mlops/research

用于构建和优化 AI 系统的 ML 研究框架，采用声明式编程方式。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `dspy` | 使用声明式编程构建复杂 AI 系统，自动优化提示词，使用 DSPy（斯坦福 NLP 用于系统化语言模型编程的框架）创建模块化 RAG 系统和智能体。 | `mlops/research/dspy` |

## mlops/training

用于 LLM 及其他模型训练的微调、RLHF/DPO/GRPO 训练、分布式训练框架和优化工具。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `axolotl` | 使用 Axolotl 微调 LLM 的专家指导——YAML 配置、100+ 模型、LoRA/QLoRA、DPO/KTO/ORPO/GRPO、多模态支持。 | `mlops/training/axolotl` |
| `distributed-llm-pretraining-torchtitan` | 使用 torchtitan 进行 PyTorch 原生分布式 LLM 预训练，支持 4D 并行（FSDP2、TP、PP、CP）。适用于在 8 到 512+ GPU 上使用 Float8、torch.compile 和分布式检查点预训练 Llama 3.1、DeepSeek V3 或自定义模型。 | `mlops/training/torchtitan` |
| `fine-tuning-with-trl` | 使用 TRL 通过强化学习微调 LLM——SFT 用于指令微调，DPO 用于偏好对齐，PPO/GRPO 用于奖励优化，以及奖励模型训练。适用于需要 RLHF、使模型与偏好对齐或从人类反馈中训练的场景。与 HuggingFace Transformers 无缝配合… | `mlops/training/trl-fine-tuning` |
| `grpo-rl-training` | 针对推理和特定任务模型训练，使用 TRL 进行 GRPO/RL 微调的专家指导。 | `mlops/training/grpo-rl-training` |
| `hermes-atropos-environments` | 构建、测试和调试用于 Atropos 训练的 Hermes Agent RL 环境。涵盖 HermesAgentBaseEnv 接口、奖励函数、智能体循环集成、工具评估、wandb 日志记录以及三种 CLI 模式（serve/process/evaluate）。适用于创建、审查或调试… | `mlops/training/hermes-atropos-environments` |
| `huggingface-accelerate` | 最简单的分布式训练 API。仅需 4 行代码即可为任意 PyTorch 脚本添加分布式支持。提供 DeepSpeed/FSDP/Megatron/DDP 的统一 API。自动设备放置、混合精度（FP16/BF16/FP8）。交互式配置、单一启动命令。HuggingFace 生态系统标准。 | `mlops/training/accelerate` |
| `optimizing-attention-flash` | 使用 Flash Attention 优化 Transformer 注意力机制，实现 2-4× 加速和 10-20× 内存减少。适用于训练/运行具有长序列（>512 token）的 Transformer、遇到注意力 GPU 内存问题或需要更快推理时。支持 PyTorch 原生 SDPA… | `mlops/training/flash-attention` |
| `peft-fine-tuning` | 使用 LoRA、QLoRA 和 25+ 方法进行 LLM 参数高效微调。适用于在有限 GPU 内存下微调大型模型（7B-70B）、需要以最小精度损失训练不到 1% 参数，或进行多适配器服务时。HuggingFace 官方库… | `mlops/training/peft` |
| `pytorch-fsdp` | PyTorch FSDP 全分片数据并行训练的专家指导——参数分片、混合精度、CPU 卸载、FSDP2。 | `mlops/training/pytorch-fsdp` |
| `pytorch-lightning` | 带有 Trainer 类的高级 PyTorch 框架，具备自动分布式训练（DDP/FSDP/DeepSpeed）、回调系统和极少样板代码。使用相同代码从笔记本电脑扩展到超级计算机。适用于需要内置最佳实践的简洁训练循环时使用。 | `mlops/training/pytorch-lightning` |
| `simpo-training` | 用于 LLM 对齐的简单偏好优化。DPO 的无参考替代方案，性能更优（在 AlpacaEval 2.0 上提升 +6.4 分）。无需参考模型，比 DPO 更高效。适用于需要比 DPO/PPO 更简单、更快速训练的偏好对齐场景。 | `mlops/training/simpo` |
| `slime-rl-training` | 使用 slime（Megatron+SGLang 框架）进行 LLM 强化学习后训练的指导。适用于训练 GLM 模型、实现自定义数据生成工作流或需要紧密 Megatron-LM 集成以进行 RL 扩展时。 | `mlops/training/slime` |
| `unsloth` | 使用 Unsloth 进行快速微调的专家指导——训练速度提升 2-5×，内存减少 50-80%，LoRA/QLoRA 优化。 | `mlops/training/unsloth` |

## mlops/vector-databases

用于 RAG、语义搜索和 AI 应用后端的向量相似度搜索和嵌入数据库。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `chroma` | 用于 AI 应用的开源嵌入数据库。存储嵌入和元数据，执行向量和全文搜索，按元数据过滤。简单的 4 函数 API。可从笔记本扩展到生产集群。适用于语义搜索、RAG 应用或文档检索。最适合… | `mlops/vector-databases/chroma` |
| `faiss` | Facebook 用于密集向量高效相似度搜索和聚类的库。支持数十亿向量、GPU 加速和多种索引类型（Flat、IVF、HNSW）。适用于快速 k-NN 搜索、大规模向量检索，或仅需纯相似度搜索时… | `mlops/vector-databases/faiss` |
| `pinecone` | 用于生产级 AI 应用的托管向量数据库。全托管、自动扩缩容，具备混合搜索（密集 + 稀疏）、元数据过滤和命名空间功能。低延迟（p95 < 100ms）。适用于生产 RAG、推荐系统或大规模语义搜索。最适合服务器… | `mlops/vector-databases/pinecone` |
| `qdrant-vector-search` | 高性能向量相似度搜索引擎，用于 RAG 和语义搜索。适用于构建需要快速近邻搜索、带过滤的混合搜索，或使用 Rust 驱动性能的可扩展向量存储的生产级 RAG 系统。 | `mlops/vector-databases/qdrant` |

## note-taking

用于保存信息、辅助研究，以及在多会话中协作规划和共享信息的笔记技能。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `obsidian` | 在 Obsidian 库中读取、搜索和创建笔记。 | `note-taking/obsidian` |

## productivity

用于文档创建、演示文稿、电子表格和其他生产力工作流的技能。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `google-workspace` | 通过 Python 集成 Gmail、日历、云端硬盘、联系人、表格和文档。使用 OAuth2 并自动刷新 token。无需外部二进制文件——完全在 Hermes venv 中使用 Google Python 客户端库运行。 | `productivity/google-workspace` |
| `linear` | 通过 GraphQL API 管理 Linear issues、项目和团队。创建、更新、搜索和整理 issues。 | `productivity/linear` |
| `nano-pdf` | 使用 nano-pdf CLI 通过自然语言指令编辑 PDF。修改文本、修正错别字、更新标题，以及在无需手动编辑的情况下对特定页面进行内容修改。 | `productivity/nano-pdf` |
| `notion` | 通过 curl 使用 Notion API 创建和管理页面、数据库和块。直接从终端搜索、创建、更新和查询 Notion 工作区。 | `productivity/notion` |
| `ocr-and-documents` | 从 PDF 和扫描文档中提取文本。对远程 URL 使用 web_extract，对本地文本型 PDF 使用 pymupdf，对 OCR/扫描文档使用 marker-pdf。对于 DOCX 使用 python-docx，对于 PPTX 参见 powerpoint 技能。 | `productivity/ocr-and-documents` |
| `powerpoint` | 任何涉及 .pptx 文件的场景都使用此技能——无论作为输入、输出还是两者兼有。包括：创建幻灯片组、演示文稿或演讲稿；读取、解析或从任意 .pptx 文件中提取文本（即使提取的内容将在别处使用，例如在… | `productivity/powerpoint` |

## research

用于学术研究、论文发现、文献综述、领域侦察、市场数据、内容监控和科学知识检索的技能。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `arxiv` | 使用 arXiv 免费 REST API 搜索和检索学术论文。无需 API 密钥。可按关键词、作者、类别或 ID 搜索。与 web_extract 或 ocr-and-documents 技能结合使用可阅读论文全文。 | `research/arxiv` |
| `blogwatcher` | 使用 blogwatcher CLI 监控博客和 RSS/Atom feed 的更新。添加博客、扫描新文章并追踪阅读记录。 | `research/blogwatcher` |
| `llm-wiki` | Karpathy 的 LLM Wiki——构建和维护持久化的互联 Markdown 知识库。摄取来源、查询汇编知识并检查一致性。与 RAG 不同，该 Wiki 一次性汇编知识并保持更新。可作为 Obsidian vault 使用。通过 `skills.config.wiki.path` 配置。 | `research/llm-wiki` |
| `domain-intel` | 使用 Python 标准库进行被动域名侦察。子域名发现、SSL 证书检查、WHOIS 查询、DNS 记录、域名可用性检查和批量多域名分析。无需 API 密钥。 | `research/domain-intel` |
| `duckduckgo-search` | 通过 DuckDuckGo 进行免费网络搜索——文字、新闻、图片、视频。无需 API 密钥。优先使用已安装的 `ddgs` CLI；仅在确认当前运行时中 `ddgs` 可用后，才使用 Python DDGS 库。 | `research/duckduckgo-search` |
| `ml-paper-writing` | 为 NeurIPS、ICML、ICLR、ACL、AAAI、COLM 撰写可发表的 ML/AI 论文。适用于从研究代码库起草论文、构建论点、验证引用或准备最终提交版本。包含 LaTeX 模板、审稿人指南和引用验证… | `research/ml-paper-writing` |
| `polymarket` | 查询 Polymarket 预测市场数据——搜索市场、获取价格、订单簿和历史价格。通过公开 REST API 只读访问，无需 API 密钥。 | `research/polymarket` |

## red-teaming

用于 LLM 红队测试、越狱和安全过滤器绕过研究的技能。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `godmode` | 使用 G0DM0D3 技术越狱通过 API 提供的 LLM——Parseltongue 输入混淆（33 种技术）、GODMODE CLASSIC 系统提示词模板、ULTRAPLINIAN 多模型竞速、编码升级以及 Hermes 原生预填充/系统提示词集成。适用于任何可通过 API 访问的模型，包括闭源模型。 | `red-teaming/godmode` |

## smart-home

用于控制智能家居设备的技能——灯光、开关、传感器和家庭自动化系统。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `openhue` | 通过 OpenHue CLI 控制飞利浦 Hue 灯光、房间和场景。开关灯光、调节亮度、颜色、色温，以及激活场景。 | `smart-home/openhue` |

## social-media

用于与社交平台交互的技能——发帖、阅读、监控和账户操作。

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `xitter` | 通过 x-cli 终端客户端使用官方 X API 凭据与 X/Twitter 交互。 | `social-media/xitter` |

## software-development

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `code-review` | 以安全和质量为重点进行彻底代码审查的指导原则。 | `software-development/code-review` |
| `plan` | Hermes 计划模式——检查上下文，将 Markdown 计划写入活动工作区/后端工作目录的 `.hermes/plans/` 中，不执行实际工作。 | `software-development/plan` |
| `requesting-code-review` | 在完成任务、实现主要功能或合并前使用。通过系统化审查流程验证工作是否满足需求。 | `software-development/requesting-code-review` |
| `subagent-driven-development` | 在执行包含独立任务的实现计划时使用。为每个任务分派全新的 delegate_task，并进行两阶段审查（规范合规性检查和代码质量检查）。 | `software-development/subagent-driven-development` |
| `systematic-debugging` | 遇到任何 bug、测试失败或意外行为时使用。4 阶段根本原因调查——在理解问题之前不要修复。 | `software-development/systematic-debugging` |
| `test-driven-development` | 在实现任何功能或修复 bug 之前，编写实现代码前使用。强制执行测试优先的红-绿-重构循环。 | `software-development/test-driven-development` |
| `writing-plans` | 当有规范或多步骤任务需求时使用。创建包含小粒度任务、精确文件路径和完整代码示例的综合实现计划。 | `software-development/writing-plans` |

---

# 可选技能

可选技能随仓库一起在 `optional-skills/` 目录下提供，但**默认未激活**。它们涵盖更重量级或小众的使用场景。通过以下命令安装：

```bash
hermes skills install official/<category>/<skill>
```

## autonomous-ai-agents

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `blackbox` | 将编程任务委派给 Blackbox AI CLI 智能体。内置裁判的多模型智能体，通过多个 LLM 运行任务并选出最佳结果。需要安装 blackbox CLI 和 Blackbox AI API 密钥。 | `autonomous-ai-agents/blackbox` |

## blockchain

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `base` | 查询 Base（以太坊 L2）区块链数据并附带 USD 定价——钱包余额、代币信息、交易详情、Gas 分析、合约检查、巨鲸检测和实时网络统计。使用 Base RPC + CoinGecko。无需 API 密钥。 | `blockchain/base` |
| `solana` | 查询 Solana 区块链数据并附带 USD 定价——钱包余额、带估值的代币组合、交易详情、NFT、巨鲸检测和实时网络统计。使用 Solana RPC + CoinGecko。无需 API 密钥。 | `blockchain/solana` |

## creative

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `blender-mcp` | 通过 blender-mcp 插件的 Socket 连接直接从 Hermes 控制 Blender。创建 3D 对象、材质、动画，并运行任意 Blender Python（bpy）代码。 | `creative/blender-mcp` |
| `meme-generation` | 通过选择模板并使用 Pillow 叠加文字生成真实的表情包图像。生成实际的 .png 表情包文件。 | `creative/meme-generation` |

## devops

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `docker-management` | 管理 Docker 容器、镜像、卷、网络和 Compose 堆栈——生命周期操作、调试、清理和 Dockerfile 优化。 | `devops/docker-management` |

## email

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `agentmail` | 通过 AgentMail 为智能体提供专属电子邮件收件箱。使用智能体拥有的邮箱地址（例如 hermes-agent@agentmail.to）自主发送、接收和管理电子邮件。 | `email/agentmail` |

## health

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `neuroskill-bci` | 连接到正在运行的 NeuroSkill 实例，将用户的实时认知和情感状态（专注度、放松度、情绪、认知负荷、困倦度、心率、HRV、睡眠分期以及 40+ 衍生 EXG 评分）融入响应。需要 BCI 可穿戴设备（Muse 2/S 或 OpenBCI）和 NeuroSkill 桌面应用。 | `health/neuroskill-bci` |

## mcp

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `fastmcp` | 使用 Python 中的 FastMCP 构建、测试、检查、安装和部署 MCP 服务器。适用于创建新 MCP 服务器、将 API 或数据库封装为 MCP 工具、暴露资源或提示词，或准备用于 HTTP 部署的 FastMCP 服务器。 | `mcp/fastmcp` |

## migration

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `openclaw-migration` | 将用户的 OpenClaw 自定义配置迁移到 Hermes Agent。从 ~/.openclaw 导入与 Hermes 兼容的记忆、SOUL.md、命令允许列表、用户技能和选定的工作区资产，然后报告无法迁移的内容及原因。 | `migration/openclaw-migration` |

## productivity

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `telephony` | 为 Hermes 提供电话能力——配置并持久化 Twilio 号码，发送和接收 SMS/MMS，拨打直接电话，以及通过 Bland.ai 或 Vapi 进行 AI 驱动的外呼。 | `productivity/telephony` |

## research

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `bioinformatics` | 来自 bioSkills 和 ClawBio 的 400+ 生物信息学技能门户。涵盖基因组学、转录组学、单细胞分析、变异检测、药物基因组学、宏基因组学、结构生物学等更多领域。 | `research/bioinformatics` |
| `qmd` | 使用 qmd（支持 BM25、向量搜索和 LLM 重排序的混合检索引擎）在本地搜索个人知识库、笔记、文档和会议记录。支持 CLI 和 MCP 集成。 | `research/qmd` |

## security

| 技能 | 描述 | 路径 |
|-------|-------------|------|
| `1password` | 设置并使用 1Password CLI（op）。适用于安装 CLI、启用桌面应用集成、登录以及为命令读取/注入密钥。 | `security/1password` |
| `oss-forensics` | GitHub 仓库的供应链调查、证据恢复和取证分析。涵盖已删除提交恢复、强制推送检测、IOC 提取、多源证据收集和结构化取证报告。 | `security/oss-forensics` |
| `sherlock` | 跨 400+ 社交网络的 OSINT 用户名搜索。通过用户名追踪社交媒体账户。 | `security/sherlock` |
