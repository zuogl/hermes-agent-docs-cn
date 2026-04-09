---
title: "环境变量参考"
---
# 环境变量参考

所有变量均存放于 `~/.hermes/.env`。也可以通过 `hermes config set VAR value` 命令来设置。

## LLM Providers（语言模型提供商）

| 变量 | 说明 |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API 密钥（推荐，灵活性强） |
| `OPENROUTER_BASE_URL` | 覆盖 OpenRouter 兼容的 base URL |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway API 密钥（[ai-gateway.vercel.sh](https://ai-gateway.vercel.sh)） |
| `AI_GATEWAY_BASE_URL` | 覆盖 AI Gateway base URL（默认：`https://ai-gateway.vercel.sh/v1`） |
| `OPENAI_API_KEY` | 自定义 OpenAI 兼容端点的 API 密钥（与 `OPENAI_BASE_URL` 配合使用） |
| `OPENAI_BASE_URL` | 自定义端点的 base URL（VLLM、SGLang 等） |
| `COPILOT_GITHUB_TOKEN` | 用于 Copilot API 的 GitHub token，最高优先级（OAuth `gho_*` 或细粒度 PAT `github_pat_*`；经典 PAT `ghp_*` **不支持**） |
| `GH_TOKEN` | GitHub token，Copilot 第二优先级（同时供 `gh` CLI 使用） |
| `GITHUB_TOKEN` | GitHub token，Copilot 第三优先级 |
| `HERMES_COPILOT_ACP_COMMAND` | 覆盖 Copilot ACP CLI 二进制文件路径（默认：`copilot`） |
| `COPILOT_CLI_PATH` | `HERMES_COPILOT_ACP_COMMAND` 的别名 |
| `HERMES_COPILOT_ACP_ARGS` | 覆盖 Copilot ACP 参数（默认：`--acp --stdio`） |
| `COPILOT_ACP_BASE_URL` | 覆盖 Copilot ACP base URL |
| `GLM_API_KEY` | z.ai / ZhipuAI GLM API 密钥（[z.ai](https://z.ai)） |
| `ZAI_API_KEY` | `GLM_API_KEY` 的别名 |
| `Z_AI_API_KEY` | `GLM_API_KEY` 的别名 |
| `GLM_BASE_URL` | 覆盖 z.ai base URL（默认：`https://api.z.ai/api/paas/v4`） |
| `KIMI_API_KEY` | Kimi / Moonshot AI API 密钥（[moonshot.ai](https://platform.moonshot.ai)） |
| `KIMI_BASE_URL` | 覆盖 Kimi base URL（默认：`https://api.moonshot.ai/v1`） |
| `MINIMAX_API_KEY` | MiniMax API 密钥，全球端点（[minimax.io](https://www.minimax.io)） |
| `MINIMAX_BASE_URL` | 覆盖 MiniMax base URL（默认：`https://api.minimax.io/v1`） |
| `MINIMAX_CN_API_KEY` | MiniMax API 密钥，中国端点（[minimaxi.com](https://www.minimaxi.com)） |
| `MINIMAX_CN_BASE_URL` | 覆盖 MiniMax 中国端点 base URL（默认：`https://api.minimaxi.com/v1`） |
| `KILOCODE_API_KEY` | Kilo Code API 密钥（[kilo.ai](https://kilo.ai)） |
| `KILOCODE_BASE_URL` | 覆盖 Kilo Code base URL（默认：`https://api.kilo.ai/api/gateway`） |
| `HF_TOKEN` | Hugging Face token，用于 Inference Providers（[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)） |
| `HF_BASE_URL` | 覆盖 Hugging Face base URL（默认：`https://router.huggingface.co/v1`） |
| `GOOGLE_API_KEY` | Google AI Studio API 密钥（[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)） |
| `GEMINI_API_KEY` | `GOOGLE_API_KEY` 的别名 |
| `GEMINI_BASE_URL` | 覆盖 Google AI Studio base URL |
| `ANTHROPIC_API_KEY` | Anthropic Console API 密钥（[console.anthropic.com](https://console.anthropic.com/)） |
| `ANTHROPIC_TOKEN` | 手动或旧版 Anthropic OAuth/setup-token 覆盖 |
| `DASHSCOPE_API_KEY` | 阿里云 DashScope API 密钥，用于 Qwen 系列模型（[modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)） |
| `DASHSCOPE_BASE_URL` | 自定义 DashScope base URL（默认：`https://coding-intl.dashscope.aliyuncs.com/v1`） |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥，直接访问 DeepSeek（[platform.deepseek.com](https://platform.deepseek.com/api_keys)） |
| `DEEPSEEK_BASE_URL` | 自定义 DeepSeek API base URL |
| `OPENCODE_ZEN_API_KEY` | OpenCode Zen API 密钥，按需付费访问精选模型（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_ZEN_BASE_URL` | 覆盖 OpenCode Zen base URL |
| `OPENCODE_GO_API_KEY` | OpenCode Go API 密钥，10 美元/月订阅可访问开源模型（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_GO_BASE_URL` | 覆盖 OpenCode Go base URL |
| `CLAUDE_CODE_OAUTH_TOKEN` | 手动导出 Claude Code token 后的显式覆盖 |
| `HERMES_MODEL` | 首选模型名称（优先于 `LLM_MODEL`，供 gateway 使用） |
| `LLM_MODEL` | 默认模型名称（当 config.yaml 中未设置时作为回退） |
| `VOICE_TOOLS_OPENAI_KEY` | OpenAI 语音转文字和文字转语音 provider 的首选 OpenAI 密钥 |
| `HERMES_LOCAL_STT_COMMAND` | 可选的本地语音转文字命令模板，支持 `{input_path}`、`{output_dir}`、`{language}`、`{model}` 占位符 |
| `HERMES_LOCAL_STT_LANGUAGE` | 传递给 `HERMES_LOCAL_STT_COMMAND` 的默认语言，或本地 `whisper` CLI 自动检测的回退语言（默认：`en`） |
| `HERMES_HOME` | 覆盖 Hermes 配置目录（默认：`~/.hermes`）。同时作用于 gateway PID 文件和 systemd 服务名称，支持多实例并发运行 |

## Provider Auth（OAuth 认证）

对于原生 Anthropic 认证，Hermes 优先使用 Claude Code 自身的凭据文件（若存在），因为这些凭据可自动刷新。`ANTHROPIC_TOKEN` 等环境变量仍可用作手动覆盖，但不再是 Claude Pro/Max 登录的推荐方式。

| 变量 | 说明 |
|----------|-------------|
| `HERMES_INFERENCE_PROVIDER` | 覆盖 provider 选择：`auto`、`openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`huggingface`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`、`kilocode`、`alibaba`、`deepseek`、`opencode-zen`、`opencode-go`、`ai-gateway`（默认：`auto`） |
| `HERMES_PORTAL_BASE_URL` | 覆盖 Nous Portal URL（用于开发/测试） |
| `NOUS_INFERENCE_BASE_URL` | 覆盖 Nous 推理 API URL |
| `HERMES_NOUS_MIN_KEY_TTL_SECONDS` | agent key 重新签发前的最短 TTL（默认：1800 = 30 分钟） |
| `HERMES_NOUS_TIMEOUT_SECONDS` | Nous 凭据/token 流程的 HTTP 超时时间 |
| `HERMES_DUMP_REQUESTS` | 将 API 请求 payload 转储到日志文件（`true`/`false`） |
| `HERMES_PREFILL_MESSAGES_FILE` | 指向 JSON 文件的路径，该文件包含在 API 调用时注入的临时预填充消息 |
| `HERMES_TIMEZONE` | IANA 时区覆盖（例如 `America/New_York`） |

## 工具 API

| 变量 | 说明 |
|----------|-------------|
| `PARALLEL_API_KEY` | AI 原生网页搜索（[parallel.ai](https://parallel.ai/)） |
| `FIRECRAWL_API_KEY` | 网页抓取与云端浏览器（[firecrawl.dev](https://firecrawl.dev/)） |
| `FIRECRAWL_API_URL` | 自托管实例的自定义 Firecrawl API 端点（可选） |
| `TAVILY_API_KEY` | Tavily API 密钥，用于 AI 原生网页搜索、内容抽取和爬取（[app.tavily.com](https://app.tavily.com/home)） |
| `EXA_API_KEY` | Exa API 密钥，用于 AI 原生网页搜索和内容获取（[exa.ai](https://exa.ai/)） |
| `BROWSERBASE_API_KEY` | 浏览器自动化（[browserbase.com](https://browserbase.com/)） |
| `BROWSERBASE_PROJECT_ID` | Browserbase 项目 ID |
| `BROWSER_USE_API_KEY` | Browser Use 云端浏览器 API 密钥（[browser-use.com](https://browser-use.com/)） |
| `FIRECRAWL_BROWSER_TTL` | Firecrawl 浏览器 session TTL（秒，默认：300） |
| `BROWSER_CDP_URL` | 本地浏览器的 Chrome DevTools Protocol URL（通过 `/browser connect` 设置，例如 `ws://localhost:9222`） |
| `CAMOFOX_URL` | Camofox 本地反检测浏览器 URL（默认：`http://localhost:9377`） |
| `BROWSER_INACTIVITY_TIMEOUT` | 浏览器 session 空闲超时时间（秒） |
| `FAL_KEY` | 图像生成（[fal.ai](https://fal.ai/)） |
| `GROQ_API_KEY` | Groq Whisper 语音转文字 API 密钥（[groq.com](https://groq.com/)） |
| `ELEVENLABS_API_KEY` | ElevenLabs 高级文字转语音 API 密钥（[elevenlabs.io](https://elevenlabs.io/)） |
| `STT_GROQ_MODEL` | 覆盖 Groq STT 模型（默认：`whisper-large-v3-turbo`） |
| `GROQ_BASE_URL` | 覆盖 Groq OpenAI 兼容 STT 端点 |
| `STT_OPENAI_MODEL` | 覆盖 OpenAI STT 模型（默认：`whisper-1`） |
| `STT_OPENAI_BASE_URL` | 覆盖 OpenAI 兼容 STT 端点 |
| `GITHUB_TOKEN` | Skills Hub 的 GitHub token（提高 API 速率限制，支持 skill 发布） |
| `HONCHO_API_KEY` | 跨 session 用户建模（[honcho.dev](https://honcho.dev/)） |
| `HONCHO_BASE_URL` | 自托管 Honcho 实例的 base URL（默认：Honcho 云端）。本地实例无需 API 密钥 |
| `SUPERMEMORY_API_KEY` | 支持用户画像回调和 session 摄入的语义长期记忆（[supermemory.ai](https://supermemory.ai)） |
| `TINKER_API_KEY` | 强化学习训练（[tinker-console.thinkingmachines.ai](https://tinker-console.thinkingmachines.ai/)） |
| `WANDB_API_KEY` | 强化学习训练指标（[wandb.ai](https://wandb.ai/)） |
| `DAYTONA_API_KEY` | Daytona 云端沙箱（[daytona.io](https://daytona.io/)） |

## 终端后端

| 变量 | 说明 |
|----------|-------------|
| `TERMINAL_ENV` | 后端类型：`local`、`docker`、`ssh`、`singularity`、`modal`、`daytona` |
| `TERMINAL_DOCKER_IMAGE` | Docker 镜像（默认：`nikolaik/python-nodejs:python3.11-nodejs20`） |
| `TERMINAL_DOCKER_FORWARD_ENV` | 需要显式转发到 Docker 终端 session 的环境变量名 JSON 数组。注意：skill 声明的 `required_environment_variables` 会自动转发，此变量仅用于未被任何 skill 声明的变量。 |
| `TERMINAL_DOCKER_VOLUMES` | 额外的 Docker 卷挂载（逗号分隔的 `host:container` 对） |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | 高级选项：将启动时的工作目录挂载到 Docker `/workspace`（`true`/`false`，默认：`false`） |
| `TERMINAL_SINGULARITY_IMAGE` | Singularity 镜像或 `.sif` 路径 |
| `TERMINAL_MODAL_IMAGE` | Modal 容器镜像 |
| `TERMINAL_DAYTONA_IMAGE` | Daytona 沙箱镜像 |
| `TERMINAL_TIMEOUT` | 命令超时时间（秒） |
| `TERMINAL_LIFETIME_SECONDS` | 终端 session 最大存活时间（秒） |
| `TERMINAL_CWD` | 所有终端 session 的工作目录 |
| `SUDO_PASSWORD` | 无需交互提示即可使用 sudo |

对于云端沙箱后端，持久化基于文件系统实现。`TERMINAL_LIFETIME_SECONDS` 控制 Hermes 清理空闲终端 session 的时机，后续恢复时可能重建沙箱，而非保持原有进程运行。

## SSH 后端

| 变量 | 说明 |
|----------|-------------|
| `TERMINAL_SSH_HOST` | 远程服务器主机名 |
| `TERMINAL_SSH_USER` | SSH 用户名 |
| `TERMINAL_SSH_PORT` | SSH 端口（默认：22） |
| `TERMINAL_SSH_KEY` | 私钥路径 |
| `TERMINAL_SSH_PERSISTENT` | 覆盖 SSH 的持久化 shell 设置（默认：跟随 `TERMINAL_PERSISTENT_SHELL`） |

## 容器资源（Docker、Singularity、Modal、Daytona）

| 变量 | 说明 |
|----------|-------------|
| `TERMINAL_CONTAINER_CPU` | CPU 核数（默认：1） |
| `TERMINAL_CONTAINER_MEMORY` | 内存（MB，默认：5120） |
| `TERMINAL_CONTAINER_DISK` | 磁盘（MB，默认：51200） |
| `TERMINAL_CONTAINER_PERSISTENT` | 跨 session 持久化容器文件系统（默认：`true`） |
| `TERMINAL_SANDBOX_DIR` | 工作区和 overlay 的宿主机目录（默认：`~/.hermes/sandboxes/`） |

## 持久化 Shell

| 变量 | 说明 |
|----------|-------------|
| `TERMINAL_PERSISTENT_SHELL` | 为非本地后端启用持久化 shell（默认：`true`）。也可在 config.yaml 中通过 `terminal.persistent_shell` 设置 |
| `TERMINAL_LOCAL_PERSISTENT` | 为本地后端启用持久化 shell（默认：`false`） |
| `TERMINAL_SSH_PERSISTENT` | 覆盖 SSH 后端的持久化 shell 设置（默认：跟随 `TERMINAL_PERSISTENT_SHELL`） |

## 消息平台

| 变量 | 说明 |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token（来自 @BotFather） |
| `TELEGRAM_ALLOWED_USERS` | 允许使用 bot 的用户 ID（逗号分隔） |
| `TELEGRAM_HOME_CHANNEL` | 定时任务推送的默认 Telegram 聊天/频道 |
| `TELEGRAM_HOME_CHANNEL_NAME` | Telegram 主频道的显示名称 |
| `TELEGRAM_WEBHOOK_URL` | webhook 模式的公网 HTTPS URL（启用后改为 webhook 而非轮询） |
| `TELEGRAM_WEBHOOK_PORT` | webhook 服务器本地监听端口（默认：`8443`） |
| `TELEGRAM_WEBHOOK_SECRET` | 用于验证 Telegram 推送来源的 secret token |
| `TELEGRAM_REACTIONS` | 处理消息时启用表情回应（默认：`false`） |
| `DISCORD_BOT_TOKEN` | Discord bot token |
| `DISCORD_ALLOWED_USERS` | 允许使用 bot 的 Discord 用户 ID（逗号分隔） |
| `DISCORD_HOME_CHANNEL` | 定时任务推送的默认 Discord 频道 |
| `DISCORD_HOME_CHANNEL_NAME` | Discord 主频道的显示名称 |
| `DISCORD_REQUIRE_MENTION` | 在服务器频道中回复前需要 @提及 |
| `DISCORD_FREE_RESPONSE_CHANNELS` | 无需 @提及即可响应的频道 ID（逗号分隔） |
| `DISCORD_AUTO_THREAD` | 支持时自动为长回复创建子话题 |
| `DISCORD_REACTIONS` | 处理消息时启用表情回应（默认：`true`） |
| `DISCORD_IGNORED_CHANNELS` | bot 永不响应的频道 ID（逗号分隔） |
| `DISCORD_NO_THREAD_CHANNELS` | bot 不自动创建子话题而直接回复的频道 ID（逗号分隔） |
| `DISCORD_REPLY_TO_MODE` | 回复引用行为：`off`、`first`（默认）或 `all` |
| `SLACK_BOT_TOKEN` | Slack bot token（`xoxb-...`） |
| `SLACK_APP_TOKEN` | Slack 应用级 token（`xapp-...`，Socket Mode 必需） |
| `SLACK_ALLOWED_USERS` | 允许使用的 Slack 用户 ID（逗号分隔） |
| `SLACK_HOME_CHANNEL` | 定时任务推送的默认 Slack 频道 |
| `SLACK_HOME_CHANNEL_NAME` | Slack 主频道的显示名称 |
| `WHATSAPP_ENABLED` | 启用 WhatsApp 桥接（`true`/`false`） |
| `WHATSAPP_MODE` | `bot`（独立号码）或 `self-chat`（给自己发消息） |
| `WHATSAPP_ALLOWED_USERS` | 允许的手机号码（含国家代码，不含 `+`），或 `*` 允许所有发件人（逗号分隔） |
| `WHATSAPP_ALLOW_ALL_USERS` | 无需白名单允许所有 WhatsApp 发件人（`true`/`false`） |
| `WHATSAPP_DEBUG` | 在桥接中记录原始消息事件用于排查（`true`/`false`） |
| `SIGNAL_HTTP_URL` | signal-cli 守护进程 HTTP 端点（例如 `http://127.0.0.1:8080`） |
| `SIGNAL_ACCOUNT` | E.164 格式的 bot 手机号码 |
| `SIGNAL_ALLOWED_USERS` | 允许的 E.164 手机号码或 UUID（逗号分隔） |
| `SIGNAL_GROUP_ALLOWED_USERS` | 允许的群组 ID，或 `*` 允许所有群组（逗号分隔） |
| `SIGNAL_HOME_CHANNEL_NAME` | Signal 主频道的显示名称 |
| `SIGNAL_IGNORE_STORIES` | 忽略 Signal 故事/状态更新 |
| `SIGNAL_ALLOW_ALL_USERS` | 无需白名单允许所有 Signal 用户 |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID（与电话 skill 共享） |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token（与电话 skill 共享） |
| `TWILIO_PHONE_NUMBER` | E.164 格式的 Twilio 手机号码（与电话 skill 共享） |
| `SMS_WEBHOOK_PORT` | 入站短信的 webhook 监听端口（默认：`8080`） |
| `SMS_ALLOWED_USERS` | 允许聊天的 E.164 手机号码（逗号分隔） |
| `SMS_ALLOW_ALL_USERS` | 无需白名单允许所有短信发件人 |
| `SMS_HOME_CHANNEL` | 定时任务/通知推送的手机号码 |
| `SMS_HOME_CHANNEL_NAME` | 短信主频道的显示名称 |
| `EMAIL_ADDRESS` | Email 网关适配器的邮件地址 |
| `EMAIL_PASSWORD` | 邮件账户的密码或应用专用密码 |
| `EMAIL_IMAP_HOST` | Email 适配器的 IMAP 主机名 |
| `EMAIL_IMAP_PORT` | IMAP 端口 |
| `EMAIL_SMTP_HOST` | Email 适配器的 SMTP 主机名 |
| `EMAIL_SMTP_PORT` | SMTP 端口 |
| `EMAIL_ALLOWED_USERS` | 允许向 bot 发送消息的邮件地址（逗号分隔） |
| `EMAIL_HOME_ADDRESS` | 主动发送邮件的默认收件人 |
| `EMAIL_HOME_ADDRESS_NAME` | 邮件主目标的显示名称 |
| `EMAIL_POLL_INTERVAL` | 邮件轮询间隔（秒） |
| `EMAIL_ALLOW_ALL_USERS` | 允许所有入站邮件发件人 |
| `DINGTALK_CLIENT_ID` | 开发者平台的钉钉 bot AppKey（[open.dingtalk.com](https://open.dingtalk.com)） |
| `DINGTALK_CLIENT_SECRET` | 开发者平台的钉钉 bot AppSecret |
| `DINGTALK_ALLOWED_USERS` | 允许向 bot 发送消息的钉钉用户 ID（逗号分隔） |
| `FEISHU_APP_ID` | [open.feishu.cn](https://open.feishu.cn/) 的飞书/Lark bot App ID |
| `FEISHU_APP_SECRET` | 飞书/Lark bot App Secret |
| `FEISHU_DOMAIN` | `feishu`（中国大陆）或 `lark`（国际版）。默认：`feishu` |
| `FEISHU_CONNECTION_MODE` | `websocket`（推荐）或 `webhook`。默认：`websocket` |
| `FEISHU_ENCRYPT_KEY` | webhook 模式的可选加密密钥 |
| `FEISHU_VERIFICATION_TOKEN` | webhook 模式的可选验证 token |
| `FEISHU_ALLOWED_USERS` | 允许向 bot 发送消息的飞书用户 ID（逗号分隔） |
| `FEISHU_HOME_CHANNEL` | 定时任务和通知推送的飞书聊天 ID |
| `WECOM_BOT_ID` | 管理控制台的企业微信 AI Bot ID |
| `WECOM_SECRET` | 企业微信 AI Bot Secret |
| `WECOM_WEBSOCKET_URL` | 自定义 WebSocket URL（默认：`wss://openws.work.weixin.qq.com`） |
| `WECOM_ALLOWED_USERS` | 允许向 bot 发送消息的企业微信用户 ID（逗号分隔） |
| `WECOM_HOME_CHANNEL` | 定时任务和通知推送的企业微信聊天 ID |
| `BLUEBUBBLES_SERVER_URL` | BlueBubbles 服务器 URL（例如 `http://192.168.1.10:1234`） |
| `BLUEBUBBLES_PASSWORD` | BlueBubbles 服务器密码 |
| `BLUEBUBBLES_WEBHOOK_HOST` | webhook 监听器绑定地址（默认：`127.0.0.1`） |
| `BLUEBUBBLES_WEBHOOK_PORT` | webhook 监听器端口（默认：`8645`） |
| `BLUEBUBBLES_HOME_CHANNEL` | 定时任务/通知推送的手机/邮件 |
| `BLUEBUBBLES_ALLOWED_USERS` | 授权用户（逗号分隔） |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | 允许所有用户（`true`/`false`） |
| `MATTERMOST_URL` | Mattermost 服务器 URL（例如 `https://mm.example.com`） |
| `MATTERMOST_TOKEN` | Mattermost 的 bot token 或个人访问 token |
| `MATTERMOST_ALLOWED_USERS` | 允许向 bot 发送消息的 Mattermost 用户 ID（逗号分隔） |
| `MATTERMOST_HOME_CHANNEL` | 主动消息推送（定时任务、通知）的频道 ID |
| `MATTERMOST_REQUIRE_MENTION` | 在频道中需要 `@提及`（默认：`true`）。设为 `false` 则响应所有消息。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | bot 无需 `@提及` 即响应的频道 ID（逗号分隔） |
| `MATTERMOST_REPLY_MODE` | 回复风格：`thread`（线程回复）或 `off`（平铺消息，默认） |
| `MATRIX_HOMESERVER` | Matrix 家庭服务器 URL（例如 `https://matrix.org`） |
| `MATRIX_ACCESS_TOKEN` | bot 认证的 Matrix access token |
| `MATRIX_USER_ID` | Matrix 用户 ID（例如 `@hermes:matrix.org`）——密码登录时必需，使用 access token 时可选 |
| `MATRIX_PASSWORD` | Matrix 密码（access token 的替代方式） |
| `MATRIX_ALLOWED_USERS` | 允许向 bot 发送消息的 Matrix 用户 ID（例如 `@alice:matrix.org`，逗号分隔） |
| `MATRIX_HOME_ROOM` | 主动消息推送的房间 ID（例如 `!abc123:matrix.org`） |
| `MATRIX_ENCRYPTION` | 启用端到端加密（`true`/`false`，默认：`false`） |
| `MATRIX_REQUIRE_MENTION` | 在房间中需要 `@提及`（默认：`true`）。设为 `false` 则响应所有消息。 |
| `MATRIX_FREE_RESPONSE_ROOMS` | bot 无需 `@提及` 即响应的房间 ID（逗号分隔） |
| `MATRIX_AUTO_THREAD` | 自动为房间消息创建线程（默认：`true`） |
| `HASS_TOKEN` | Home Assistant 长期访问 token（启用 HA 平台及工具） |
| `HASS_URL` | Home Assistant URL（默认：`http://homeassistant.local:8123`） |
| `WEBHOOK_ENABLED` | 启用 webhook 平台适配器（`true`/`false`） |
| `WEBHOOK_PORT` | 接收 webhook 的 HTTP 服务器端口（默认：`8644`） |
| `WEBHOOK_SECRET` | webhook 签名验证的全局 HMAC secret（未指定自有 secret 的路由的回退值） |
| `API_SERVER_ENABLED` | 启用 OpenAI 兼容的 API 服务器（`true`/`false`）。与其他平台并行运行。 |
| `API_SERVER_KEY` | API 服务器认证的 Bearer token。强烈建议设置；任何可网络访问的部署都必须设置。 |
| `API_SERVER_CORS_ORIGINS` | 允许直接调用 API 服务器的浏览器来源（例如 `http://localhost:3000,http://127.0.0.1:3000`），逗号分隔。默认：禁用。 |
| `API_SERVER_PORT` | API 服务器端口（默认：`8642`） |
| `API_SERVER_HOST` | API 服务器的宿主机/绑定地址（默认：`127.0.0.1`）。仅在同时配置了 `API_SERVER_KEY` 和严格的 `API_SERVER_CORS_ORIGINS` 白名单时，才使用 `0.0.0.0` 开放网络访问。 |
| `MESSAGING_CWD` | 消息模式下终端命令的工作目录（默认：`~`） |
| `GATEWAY_ALLOWED_USERS` | 所有平台共享的允许用户 ID（逗号分隔） |
| `GATEWAY_ALLOW_ALL_USERS` | 无需白名单允许所有用户（`true`/`false`，默认：`false`） |

## Agent 行为

| 变量 | 说明 |
|----------|-------------|
| `HERMES_MAX_ITERATIONS` | 每次对话的最大工具调用轮数（默认：90） |
| `HERMES_TOOL_PROGRESS` | 已弃用的兼容性变量，用于工具进度显示。推荐改用 `config.yaml` 中的 `display.tool_progress`。 |
| `HERMES_TOOL_PROGRESS_MODE` | 已弃用的兼容性变量，用于工具进度模式。推荐改用 `config.yaml` 中的 `display.tool_progress`。 |
| `HERMES_HUMAN_DELAY_MODE` | 响应节奏：`off`/`natural`/`custom` |
| `HERMES_HUMAN_DELAY_MIN_MS` | 自定义延迟范围最小值（毫秒） |
| `HERMES_HUMAN_DELAY_MAX_MS` | 自定义延迟范围最大值（毫秒） |
| `HERMES_QUIET` | 抑制非必要输出（`true`/`false`） |
| `HERMES_API_TIMEOUT` | LLM API 调用超时时间（秒，默认：`1800`） |
| `HERMES_EXEC_ASK` | 在 gateway 模式下启用执行确认提示（`true`/`false`） |
| `HERMES_ENABLE_PROJECT_PLUGINS` | 启用从 `./.hermes/plugins/` 自动发现仓库本地插件（`true`/`false`，默认：`false`） |
| `HERMES_BACKGROUND_NOTIFICATIONS` | gateway 中后台进程通知模式：`all`（默认）、`result`、`error`、`off` |
| `HERMES_EPHEMERAL_SYSTEM_PROMPT` | 在 API 调用时注入的临时系统提示（不会持久化到 session） |

## Session 设置

| 变量 | 说明 |
|----------|-------------|
| `SESSION_IDLE_MINUTES` | 空闲 N 分钟后重置 session（默认：1440） |
| `SESSION_RESET_HOUR` | 每日重置小时（24 小时制，默认：4 = 凌晨 4 点） |

## 上下文压缩（仅限 config.yaml）

上下文压缩仅通过 `config.yaml` 中的 `compression` 部分配置，不提供环境变量。

```yaml
compression:
  enabled: true
  threshold: 0.50
  summary_model: ""                            # 空值 = 使用主配置模型
  summary_provider: auto
  summary_base_url: null  # 摘要的自定义 OpenAI 兼容端点
```

## 辅助任务覆盖

| 变量 | 说明 |
|----------|-------------|
| `AUXILIARY_VISION_PROVIDER` | 覆盖视觉任务的 provider |
| `AUXILIARY_VISION_MODEL` | 覆盖视觉任务的模型 |
| `AUXILIARY_VISION_BASE_URL` | 视觉任务的直连 OpenAI 兼容端点 |
| `AUXILIARY_VISION_API_KEY` | 与 `AUXILIARY_VISION_BASE_URL` 配对的 API 密钥 |
| `AUXILIARY_WEB_EXTRACT_PROVIDER` | 覆盖网页抽取/摘要任务的 provider |
| `AUXILIARY_WEB_EXTRACT_MODEL` | 覆盖网页抽取/摘要任务的模型 |
| `AUXILIARY_WEB_EXTRACT_BASE_URL` | 网页抽取/摘要任务的直连 OpenAI 兼容端点 |
| `AUXILIARY_WEB_EXTRACT_API_KEY` | 与 `AUXILIARY_WEB_EXTRACT_BASE_URL` 配对的 API 密钥 |

对于特定任务的直连端点，Hermes 使用该任务配置的 API 密钥或 `OPENAI_API_KEY`，不会为这些自定义端点复用 `OPENROUTER_API_KEY`。

## 回退模型（仅限 config.yaml）

主模型回退仅通过 `config.yaml` 配置，不提供环境变量。在 `fallback_model` 部分中添加 `provider` 和 `model` 键，即可在主模型遇到错误时自动切换。

```yaml
fallback_model:
  provider: openrouter
  model: anthropic/claude-sonnet-4
```

详见 [Fallback Providers](https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers)。

## Provider 路由（仅限 config.yaml）

以下配置写入 `~/.hermes/config.yaml` 的 `provider_routing` 部分：

| 键 | 说明 |
|-----|-------------|
| `sort` | provider 排序方式：`"price"`（默认）、`"throughput"` 或 `"latency"` |
| `only` | 允许使用的 provider slug 列表（例如 `["anthropic", "google"]`） |
| `ignore` | 跳过的 provider slug 列表 |
| `order` | 按顺序尝试的 provider slug 列表 |
| `require_parameters` | 仅使用支持所有请求参数的 provider（`true`/`false`） |
| `data_collection` | `"allow"`（默认）或 `"deny"` 以排除会存储数据的 provider |

:::tip
使用 `hermes config set` 设置环境变量——它会自动将配置保存到正确的文件（密钥保存到 `.env`，其余配置保存到 `config.yaml`）。
:::
