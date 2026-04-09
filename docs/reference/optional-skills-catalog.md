---
title: "可选 Skill 目录"
---
# 可选 Skill 目录

官方可选 skill 随 hermes-agent 仓库一同发布，位于 `optional-skills/` 目录下，但**默认不启用**。需要手动安装：

```bash
hermes skills install official/<category>/<skill>
```

例如：

```bash
hermes skills install official/blockchain/solana
hermes skills install official/mlops/flash-attention
```

安装后，该 skill 将出现在 agent 的 skill 列表中，并可在检测到相关任务时自动加载。

卸载方式：

```bash
hermes skills uninstall <skill-name>
```

---

## 自主 AI 代理

| Skill | 描述 |
|-------|------|
| **blackbox** | 将编码任务委托给 Blackbox AI CLI agent。这是一个内置裁判机制的多模型 agent，能将任务交由多个 LLM 并行处理，并选出最优结果。 |
| **honcho** | 在 Hermes 中配置和使用 Honcho memory —— 跨 session 用户建模、多 profile 隔离、观测配置及辩证推理。 |

## 区块链

| Skill | 描述 |
|-------|------|
| **base** | 查询 Base（以太坊 L2）区块链数据（含 USD 定价）—— 钱包余额、token 信息、交易详情、gas 分析、合约检查、巨鲸检测及实时网络统计。无需 API 密钥。 |
| **solana** | 查询 Solana 区块链数据（含 USD 定价）—— 钱包余额、token 持仓、交易详情、NFT、巨鲸检测及实时网络统计。无需 API 密钥。 |

## 沟通交流

| Skill | 描述 |
|-------|------|
| **one-three-one-rule** | 用于提案与决策的结构化沟通框架。 |

## 创意创作

| Skill | 描述 |
|-------|------|
| **blender-mcp** | 通过 socket 连接 blender-mcp 插件，直接从 Hermes 控制 Blender。可创建 3D 对象、材质、动画，并运行任意 Blender Python（bpy）代码。 |
| **meme-generation** | 通过选取模板并使用 Pillow 叠加文字来生成真实的表情包图片，输出实际的 `.png` 文件。 |

## 运维部署

| Skill | 描述 |
|-------|------|
| **cli** | 通过 inference.sh CLI（infsh）运行 150+ 款 AI 应用 —— 图像生成、视频创作、LLM、搜索、3D 及社交自动化。 |
| **docker-management** | 管理 Docker 容器、镜像、数据卷、网络及 Compose 栈 —— 生命周期操作、调试、清理及 Dockerfile 优化。 |

## 邮件

| Skill | 描述 |
|-------|------|
| **agentmail** | 通过 AgentMail 为 agent 配备专属邮箱。使用 agent 专属邮件地址自主收发和管理邮件。 |

## 健康

| Skill | 描述 |
|-------|------|
| **neuroskill-bci** | 面向神经科学研究工作流的脑机接口（BCI）集成。 |

## MCP

| Skill | 描述 |
|-------|------|
| **fastmcp** | 使用 Python FastMCP 构建、测试、检查、安装和部署 MCP 服务器。涵盖将 API 或数据库封装为 MCP 工具、暴露资源或 prompt，以及部署流程。 |

## 迁移

| Skill | 描述 |
|-------|------|
| **openclaw-migration** | 将用户的 OpenClaw 个性化配置迁移至 Hermes Agent。可导入 memory、SOUL.md、命令白名单、用户 skill 及所选工作区资产。 |

## MLOps

这是最大的可选类别，覆盖从数据整理到生产推理的完整 ML 流水线。

| Skill | 描述 |
|-------|------|
| **accelerate** | 最简单的分布式训练 API。只需 4 行代码即可为任意 PyTorch 脚本添加分布式支持。统一支持 DeepSpeed/FSDP/Megatron/DDP。 |
| **chroma** | 开源 embedding 数据库。存储 embedding 和元数据，支持向量搜索与全文搜索。提供简洁的 4 函数 API，适用于 RAG 和语义搜索。 |
| **faiss** | Facebook 推出的高效稠密向量相似性搜索与聚类库。支持十亿级向量、GPU 加速及多种索引类型（Flat、IVF、HNSW）。 |
| **flash-attention** | 使用 Flash Attention 优化 transformer 注意力机制，实现 2-4 倍加速及 10-20 倍显存减少。支持 PyTorch SDPA、flash-attn 库、H100 FP8 及滑动窗口。 |
| **hermes-atropos-environments** | 为 Atropos 训练构建、测试和调试 Hermes Agent RL 环境。涵盖 HermesAgentBaseEnv 接口、奖励函数、agent 循环集成及评估。 |
| **huggingface-tokenizers** | 基于 Rust 的高速 tokenizer，适用于研究和生产环境。可在 20 秒内完成 1GB 数据的 tokenization。支持 BPE、WordPiece 和 Unigram 算法。 |
| **instructor** | 使用 Pydantic 验证从 LLM 响应中提取结构化数据，自动重试失败的提取，并支持流式传输部分结果。 |
| **lambda-labs** | 面向 ML 训练和推理的按需与预留 GPU 云实例。支持 SSH 访问、持久化文件系统及多节点集群。 |
| **llava** | 大型语言与视觉助手（LLaVA）—— 视觉指令微调及图像对话，将 CLIP 视觉模型与 LLaMA 语言模型相结合。 |
| **nemo-curator** | 面向 LLM 训练的 GPU 加速数据整理工具。支持模糊去重（速度提升 16 倍）、质量过滤（30+ 启发式规则）、语义去重及 PII 脱敏。基于 RAPIDS 横向扩展。 |
| **pinecone** | 面向生产 AI 的托管向量数据库。支持自动扩缩容、混合搜索（稠密 + 稀疏）、元数据过滤，p95 延迟低于 100ms。 |
| **pytorch-lightning** | 高层 PyTorch 框架，提供 Trainer 类、自动分布式训练（DDP/FSDP/DeepSpeed）、回调机制及极简样板代码。 |
| **qdrant** | 高性能向量相似性搜索引擎。基于 Rust 实现，支持快速近邻搜索、带过滤的混合搜索及可扩展的向量存储。 |
| **saelens** | 使用 SAELens 训练和分析稀疏自编码器（SAE），将神经网络激活分解为可解释的特征。 |
| **simpo** | 简单偏好优化（SimPO）—— 无需参考模型的 DPO 替代方案，性能更优（AlpacaEval 2.0 提升 +6.4 分）。 |
| **slime** | 基于 Megatron+SGLang 框架使用 RL 进行 LLM 后训练。支持自定义数据生成工作流，与 Megatron-LM 深度集成，可扩展 RL 训练规模。 |
| **tensorrt-llm** | 使用 NVIDIA TensorRT 优化 LLM 推理以最大化吞吐量。在 A100/H100 上比 PyTorch 快 10-100 倍，支持量化（FP8/INT4）和 in-flight batching。 |
| **torchtitan** | PyTorch 原生分布式 LLM 预训练框架，支持 4D 并行（FSDP2、TP、PP、CP）。可从 8 扩展至 512+ GPU，兼容 Float8 和 torch.compile。 |

## 生产力

| Skill | 描述 |
|-------|------|
| **canvas** | Canvas LMS 集成 —— 通过 API token 认证获取已选课程和作业信息。 |
| **memento-flashcards** | 基于间隔重复的闪卡系统，用于学习和知识巩固。 |
| **siyuan** | 思源笔记 API，用于在自托管知识库中搜索、读取、创建和管理块与文档。 |
| **telephony** | 为 Hermes 赋予电话能力 —— 通过 Twilio 配置电话号码，收发 SMS/MMS、拨打电话，并通过 Bland.ai 或 Vapi 发起 AI 驱动的外呼。 |

## 研究调研

| Skill | 描述 |
|-------|------|
| **bioinformatics** | 通往 bioSkills 和 ClawBio 400+ 生物信息学 skill 的入口。涵盖基因组学、转录组学、单细胞分析、变异检测、药物基因组学、宏基因组学及结构生物学。 |
| **domain-intel** | 使用 Python 标准库进行被动域名侦察。支持子域名发现、SSL 证书检查、WHOIS 查询、DNS 记录及批量多域名分析。无需 API 密钥。 |
| **duckduckgo-search** | 通过 DuckDuckGo 免费网络搜索 —— 文本、新闻、图片、视频。无需 API 密钥。 |
| **gitnexus-explorer** | 使用 GitNexus 为代码库建立索引，并通过 Web UI 和 Cloudflare 隧道提供交互式知识图谱服务。 |
| **parallel-cli** | Parallel CLI 的厂商 skill —— 原生支持 agent 的网络搜索、内容抓取、深度研究、数据丰富及监控。 |
| **qmd** | 使用 qmd 在本地搜索个人知识库、笔记、文档及会议记录 —— 一款集 BM25、向量搜索和 LLM 重排序于一体的混合检索引擎。 |
| **scrapling** | 使用 Scrapling 进行网页抓取 —— HTTP 请求、隐身浏览器自动化、Cloudflare 绕过及通过 CLI 和 Python 进行爬虫抓取。 |

## 安全

| Skill | 描述 |
|-------|------|
| **1password** | 配置和使用 1Password CLI（op）。安装 CLI、启用桌面应用集成、登录，并为命令读取/注入密钥。 |
| **oss-forensics** | 开源软件取证 —— 分析软件包、依赖项及供应链风险。 |
| **sherlock** | 跨 400+ 社交网络的 OSINT 用户名搜索。通过用户名追踪社交媒体账号。 |

---

## 贡献可选 Skill

向仓库添加新的可选 skill：

1. 在 `optional-skills///` 下创建目录
2. 添加包含标准 frontmatter 的 `SKILL.md`（name、description、version、author）
3. 在 `references/`、`templates/` 或 `scripts/` 子目录中添加所有支持文件
4. 提交 pull request —— skill 合并后将出现在本目录中
