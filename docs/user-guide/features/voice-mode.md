---
title: "语音模式"
---
# 语音模式

Hermes Agent 支持在 CLI 和消息平台上进行完整的语音交互。使用麦克风与智能体对话、收听语音回复，并在 Discord 语音频道中进行实时语音对话。

如需了解包含推荐配置和实际使用模式的实践指南，请参阅[通过 Hermes 使用语音模式](https://hermes-agent.nousresearch.com/docs/guides/use-voice-mode-with-hermes)。

## 前置条件

使用语音功能前，请确保已具备：

1. **已安装 Hermes Agent** — `pip install hermes-agent`（参见[安装指南](https://hermes-agent.nousresearch.com/docs/getting-started/installation)）
2. **已配置 LLM 提供商** — 运行 `hermes model`，或在 `~/.hermes/.env` 中设置首选提供商的凭据
3. **基础环境可用** — 运行 `hermes` 验证智能体能正常响应文字消息，再启用语音功能

:::tip
`~/.hermes/` 目录和默认的 `config.yaml` 会在首次运行 `hermes` 时自动创建。你只需手动创建 `~/.hermes/.env` 来配置 API 密钥。
:::

## 概览

| 功能 | 平台 | 描述 |
|---------|----------|-------------|
| **交互式语音** | CLI | 按 Ctrl+B 录音，智能体自动检测静音并回复 |
| **自动语音回复** | Telegram、Discord | 智能体在发送文字回复的同时发送语音音频 |
| **语音频道** | Discord | Bot 加入语音频道，监听用户发言并语音回复 |

## 安装要求

### Python 包

```bash
# CLI 语音模式（麦克风 + 音频播放）
pip install "hermes-agent[voice]"

# Discord + Telegram 消息（含 discord.py[voice] 支持语音频道）
pip install "hermes-agent[messaging]"

# 高级 TTS（ElevenLabs）
pip install "hermes-agent[tts-premium]"

# 本地 TTS（NeuTTS，可选）
python -m pip install -U neutts[all]

# 一次性安装全部
pip install "hermes-agent[all]"
```

| 扩展包 | 包含包 | 适用场景 |
|-------|----------|-------------|
| `voice` | `sounddevice`、`numpy` | CLI 语音模式 |
| `messaging` | `discord.py[voice]`、`python-telegram-bot`、`aiohttp` | Discord 和 Telegram Bot |
| `tts-premium` | `elevenlabs` | ElevenLabs TTS 提供商 |

可选本地 TTS 提供商：通过 `python -m pip install -U neutts[all]` 单独安装 `neutts`。首次使用时会自动下载模型。

:::info
`discord.py[voice]` 会自动安装 **PyNaCl**（用于语音加密）和 **opus 绑定**。Discord 语音频道支持需要此依赖。
:::

### 系统依赖

```bash
# macOS
brew install portaudio ffmpeg opus
brew install espeak-ng   # for NeuTTS

# Ubuntu/Debian
sudo apt install portaudio19-dev ffmpeg libopus0
sudo apt install espeak-ng   # for NeuTTS
```

| 依赖项 | 用途 | 适用场景 |
|-----------|---------|-------------|
| **PortAudio** | 麦克风输入和音频播放 | CLI 语音模式 |
| **ffmpeg** | 音频格式转换（MP3 → Opus、PCM → WAV） | 所有平台 |
| **Opus** | Discord 语音编解码器 | Discord 语音频道 |
| **espeak-ng** | 音素转换后端 | 本地 NeuTTS 提供商 |

### API 密钥

添加到 `~/.hermes/.env`：

```bash
# STT（语音转文字）— 本地提供商无需任何密钥
# pip install faster-whisper          # 免费，本地运行，推荐
GROQ_API_KEY=your-key                 # Groq Whisper — 快速，有免费套餐（云端）
VOICE_TOOLS_OPENAI_KEY=your-key       # OpenAI Whisper — 付费（云端）

# TTS（文字转语音，可选 — Edge TTS 和 NeuTTS 无需任何密钥）
ELEVENLABS_API_KEY=***           # ElevenLabs — 高级音质
# VOICE_TOOLS_OPENAI_KEY 也可同时启用 OpenAI TTS
```

:::tip
如果已安装 `faster-whisper`，语音模式的 STT（语音转文字）功能**无需任何 API 密钥**即可使用。模型（`base` 版本约 150 MB）会在首次使用时自动下载。
:::

---

## CLI 语音模式

### 快速开始

启动 CLI 并启用语音模式：

```bash
hermes                # 启动交互式 CLI
```

然后在 CLI 中使用以下命令：

```
/voice          切换语音模式开/关
/voice on       启用语音模式
/voice off      禁用语音模式
/voice tts      切换 TTS 输出
/voice status   显示当前状态
```

### 工作原理

1. 运行 `hermes` 启动 CLI，并通过 `/voice on` 启用语音模式
2. **按 Ctrl+B** — 响起提示音（880Hz），开始录音
3. **开始说话** — 屏幕上会出现实时音频电平条，显示你的输入音量：`● [▁▂▃▅▇▇▅▂] ❯`
4. **停止说话** — 静音 3 秒后自动停止录音
5. **双响提示音**（660Hz）确认录音结束
6. 音频通过 Whisper 转录并发送给智能体
7. 如果已启用 TTS，智能体的回复将朗读播出
8. 录音**自动重新启动** — 无需按任何键即可继续说话

此循环将持续运行，直到在录音过程中按 **Ctrl+B**（退出连续模式），或连续 3 次录音均未检测到语音为止。

:::tip
录音键可通过 `~/.hermes/config.yaml` 中的 `voice.record_key` 进行配置（默认：`ctrl+b`）。
:::

### 静音检测

采用两阶段算法检测说话结束：

1. **语音确认** — 等待音频 RMS 值超过阈值（200）且持续至少 0.3 秒，可容忍音节间的短暂间断
2. **结束检测** — 语音确认后，连续静音 3.0 秒即触发停止

如果完全没有检测到语音，15 秒后录音自动停止。

`silence_threshold` 和 `silence_duration` 均可在 `config.yaml` 中配置。

### 流式 TTS

启用 TTS 后，智能体会**逐句**朗读回复，无需等待完整响应生成：

1. 将文本增量缓冲为完整句子（最少 20 个字符）
2. 去除 Markdown 格式和代码块内容
3. 实时逐句生成并播放音频

### 幻觉过滤器

Whisper 有时会从静音或背景噪音中生成虚假文本（如 "Thank you for watching"、"Subscribe" 等）。智能体使用包含 26 个已知幻觉短语（覆盖多种语言）的过滤集以及捕捉重复变体的正则表达式模式来过滤这些内容。

---

## 网关语音回复（Telegram 和 Discord）

如果尚未配置消息 Bot，请参阅对应平台的指南：

- [Telegram 配置指南](/user-guide/messaging/telegram)
- [Discord 配置指南](/user-guide/messaging/discord)

启动网关以连接消息平台：

```bash
hermes gateway        # 启动网关（连接已配置的平台）
hermes gateway setup  # 首次配置的交互式设置向导
```

### Discord：频道与私信

Bot 在 Discord 上支持两种交互模式：

| 模式 | 交互方式 | 是否需要 @ | 配置要求 |
|------|------------|-----------------|-------|
| **私信（DM）** | 打开 Bot 主页 → "发消息" | 否 | 开箱即用 |
| **服务器频道** | 在 Bot 所在的文字频道发消息 | 是（`@botname`） | 需先将 Bot 邀请至服务器 |

**私信（个人使用推荐）：** 直接向 Bot 发起私信并发送消息即可，无需 @。语音回复和所有命令的使用方式与频道中完全相同。

**服务器频道：** Bot 仅在被 @ 时响应（例如 `@hermesbyt4 你好`）。请确保从 @ 弹窗中选择 **Bot 用户**，而非同名角色。

:::tip
如需在服务器频道中取消 @ 限制，请在 `~/.hermes/.env` 中添加：
```bash
DISCORD_REQUIRE_MENTION=false
```
或将特定频道设为自由回复（无需 @）：
```bash
DISCORD_FREE_RESPONSE_CHANNELS=123456789,987654321
```
:::

### 命令

以下命令在 Telegram 和 Discord（私信和文字频道）中均可使用：

```
/voice          切换语音模式开/关
/voice on       仅在你发送语音消息时回复语音
/voice tts      对所有消息回复语音
/voice off      禁用语音回复
/voice status   显示当前设置
```

### 模式

| 模式 | 命令 | 行为 |
|------|---------|----------|
| `off` | `/voice off` | 仅文字（默认） |
| `voice_only` | `/voice on` | 仅当你发送语音消息时才语音回复 |
| `all` | `/voice tts` | 对所有消息均语音回复 |

语音模式设置在网关重启后仍保持。

### 平台发送方式

| 平台 | 格式 | 说明 |
|----------|--------|-------|
| **Telegram** | 语音气泡（Opus/OGG） | 在聊天中内联播放。如需要，ffmpeg 会将 MP3 转换为 Opus |
| **Discord** | 原生语音气泡（Opus/OGG） | 像用户语音消息一样内联播放。若语音气泡 API 失败则回退为文件附件 |

---

## Discord 语音频道

最具沉浸感的语音功能：Bot 加入 Discord 语音频道，监听用户发言、转录语音、通过智能体处理，并在语音频道中语音回复。

### 配置

#### 1. Discord Bot 权限

如果你已为文字功能配置了 Discord Bot（参见 [Discord 配置指南](/user-guide/messaging/discord)），需要额外添加语音权限。

前往 [Discord 开发者门户](https://discord.com/developers/applications) → 你的应用 → **Installation** → **Default Install Settings** → **Guild Install**：

**在现有文字权限的基础上添加以下权限：**

| 权限 | 用途 | 是否必需 |
|-----------|---------|----------|
| **Connect** | 加入语音频道 | 是 |
| **Speak** | 在语音频道播放 TTS 音频 | 是 |
| **Use Voice Activity** | 检测用户发言 | 推荐 |

**更新后的权限整数：**

| 级别 | 整数 | 包含内容 |
|-------|---------|----------------|
| 仅文字 | `274878286912` | 查看频道、发送消息、读取历史、嵌入内容、附件、子区、反应 |
| 文字 + 语音 | `274881432640` | 以上全部 + Connect、Speak |

**使用更新后的权限 URL 重新邀请 Bot：**

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=274881432640
```

将 `YOUR_APP_ID` 替换为开发者门户中的 Application ID。

:::caution
将 Bot 重新邀请至已加入的服务器会更新其权限，不会将其移出服务器，也不会丢失任何数据或配置。
:::

#### 2. 特权网关意图

在[开发者门户](https://discord.com/developers/applications) → 你的应用 → **Bot** → **Privileged Gateway Intents** 中，启用全部三项：

| 意图 | 用途 |
|--------|---------|
| **Presence Intent** | 检测用户在线/离线状态 |
| **Server Members Intent** | 将语音 SSRC 标识符映射到 Discord 用户 ID |
| **Message Content Intent** | 读取频道中文字消息的内容 |

三项均为完整语音频道功能所必需。**Server Members Intent** 尤为关键——没有它，Bot 将无法识别语音频道中的发言者。

#### 3. Opus 编解码器

运行网关的机器上必须安装 Opus 编解码器库：

```bash
# macOS（Homebrew）
brew install opus

# Ubuntu/Debian
sudo apt install libopus0
```

Bot 会自动从以下路径加载编解码器：

- **macOS：** `/opt/homebrew/lib/libopus.dylib`
- **Linux：** `libopus.so.0`

#### 4. 环境变量

```bash
# ~/.hermes/.env

# Discord Bot（已为文字功能配置）
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ALLOWED_USERS=your-user-id

# STT — 本地提供商无需密钥（pip install faster-whisper）
# GROQ_API_KEY=your-key            # 备选：云端，快速，有免费套餐

# TTS — 可选。Edge TTS 和 NeuTTS 无需密钥。
# ELEVENLABS_API_KEY=***      # 高级音质
# VOICE_TOOLS_OPENAI_KEY=***  # OpenAI TTS / Whisper
```

### 启动网关

```bash
hermes gateway        # 使用现有配置启动
```

Bot 应在几秒内在 Discord 上线。

### 命令

在 Bot 所在的 Discord 文字频道中使用以下命令：

```
/voice join      Bot 加入你当前所在的语音频道
/voice channel   /voice join 的别名
/voice leave     Bot 断开与语音频道的连接
/voice status    显示语音模式及已连接频道
```

:::info
运行 `/voice join` 前，你必须已在某个语音频道中。Bot 会加入你所在的语音频道。
:::

### 工作原理

Bot 加入语音频道后：

1. **监听**每个用户的独立音频流
2. **检测静音** — 语音持续至少 0.5 秒后，再静音 1.5 秒即触发处理
3. **转录**音频（通过 Whisper STT：本地、Groq 或 OpenAI）
4. **处理**完整的智能体流水线（会话、工具、记忆）
5. **语音回复**通过 TTS 在语音频道中播放

### 文字频道集成

Bot 在语音频道中时：

- 转录内容会出现在文字频道中：`[Voice] @user: what you said`
- 智能体回复以文字形式发送到频道，同时在语音频道中播放
- 文字频道为执行 `/voice join` 命令时所在的频道

### 回声消除

Bot 在播放 TTS 回复期间会自动暂停音频监听，防止听到并重复处理自身输出。

### 访问控制

只有 `DISCORD_ALLOWED_USERS` 中列出的用户才能通过语音进行交互。其他用户的音频会被静默忽略。

```bash
# ~/.hermes/.env
DISCORD_ALLOWED_USERS=284102345871466496
```

---

## 配置参考

### config.yaml

```yaml
# 语音录制（CLI）
voice:
  record_key: "ctrl+b"            # 开始/停止录音的按键
  max_recording_seconds: 120       # 最大录音时长
  auto_tts: false                  # 启用语音模式时自动开启 TTS
  silence_threshold: 200           # RMS 阈值（0-32767），低于此值视为静音
  silence_duration: 3.0            # 自动停止前的静音秒数

# STT（语音转文字）
stt:
  provider: "local"                  # "local"（免费）| "groq" | "openai"
  local:
    model: "base"                    # tiny、base、small、medium、large-v3
  # model: "whisper-1"              # 旧版：未设置 provider 时使用

# TTS（文字转语音）
tts:
  provider: "edge"                 # "edge"（免费）| "elevenlabs" | "openai" | "neutts" | "minimax"
  edge:
    voice: "en-US-AriaNeural"      # 322 种语音，74 种语言
  elevenlabs:
    voice_id: "pNInz6obpgDQGcFmaJgB"    # Adam
    model_id: "eleven_multilingual_v2"
  openai:
    model: "gpt-4o-mini-tts"
    voice: "alloy"                 # alloy、echo、fable、onyx、nova、shimmer
    base_url: "https://api.openai.com/v1"  # 可选：覆盖为自托管或兼容 OpenAI 的端点
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
```

### 环境变量

```bash
# STT 提供商（本地无需密钥）
# pip install faster-whisper        # 免费本地 STT — 无需 API 密钥
GROQ_API_KEY=...                    # Groq Whisper（快速，有免费套餐）
VOICE_TOOLS_OPENAI_KEY=...         # OpenAI Whisper（付费）

# STT 高级覆盖项（可选）
STT_GROQ_MODEL=whisper-large-v3-turbo    # 覆盖默认 Groq STT 模型
STT_OPENAI_MODEL=whisper-1               # 覆盖默认 OpenAI STT 模型
GROQ_BASE_URL=https://api.groq.com/openai/v1     # 自定义 Groq 端点
STT_OPENAI_BASE_URL=https://api.openai.com/v1    # 自定义 OpenAI STT 端点

# TTS 提供商（Edge TTS 和 NeuTTS 无需密钥）
ELEVENLABS_API_KEY=***             # ElevenLabs（高级音质）
# VOICE_TOOLS_OPENAI_KEY 也可同时启用 OpenAI TTS

# Discord 语音频道
DISCORD_BOT_TOKEN=...
DISCORD_ALLOWED_USERS=...
```

### STT 提供商对比

| 提供商 | 模型 | 速度 | 质量 | 费用 | 是否需要 API 密钥 |
|----------|-------|-------|---------|------|---------|
| **本地** | `base` | 快（取决于 CPU/GPU） | 良好 | 免费 | 否 |
| **本地** | `small` | 中等 | 较好 | 免费 | 否 |
| **本地** | `large-v3` | 慢 | 最佳 | 免费 | 否 |
| **Groq** | `whisper-large-v3-turbo` | 极快（约 0.5s） | 良好 | 免费套餐 | 是 |
| **Groq** | `whisper-large-v3` | 快（约 1s） | 较好 | 免费套餐 | 是 |
| **OpenAI** | `whisper-1` | 快（约 1s） | 良好 | 付费 | 是 |
| **OpenAI** | `gpt-4o-transcribe` | 中等（约 2s） | 最佳 | 付费 | 是 |

提供商优先级（自动降级）：**本地** > **Groq** > **OpenAI**

### TTS 提供商对比

| 提供商 | 质量 | 费用 | 延迟 | 是否需要密钥 |
|----------|---------|------|---------|-------------|
| **Edge TTS** | 良好 | 免费 | 约 1s | 否 |
| **ElevenLabs** | 优秀 | 付费 | 约 2s | 是 |
| **OpenAI TTS** | 良好 | 付费 | 约 1.5s | 是 |
| **NeuTTS** | 良好 | 免费 | 取决于 CPU/GPU | 否 |

NeuTTS 使用上述 `tts.neutts` 配置块。

---

## 故障排除

### "No audio device found"（CLI）

未安装 PortAudio：

```bash
brew install portaudio    # macOS
sudo apt install portaudio19-dev  # Ubuntu
```

### Bot 在 Discord 服务器频道中无响应

默认情况下，Bot 在服务器频道中需要被 @。请确保：

1. 输入 `@` 并选择 **Bot 用户**（带 #discriminator），而非同名**角色**
2. 或改用私信 — 无需 @
3. 或在 `~/.hermes/.env` 中设置 `DISCORD_REQUIRE_MENTION=false`

### Bot 加入语音频道但听不到我的声音

- 检查你的 Discord 用户 ID 是否已加入 `DISCORD_ALLOWED_USERS`
- 确认你在 Discord 中未被静音
- Bot 需要来自 Discord 的 SPEAKING 事件才能映射你的音频 — 加入后请在几秒内开始说话

### Bot 听到了我的声音但没有响应

- 确认 STT 可用：安装 `faster-whisper`（无需密钥）或设置 `GROQ_API_KEY` / `VOICE_TOOLS_OPENAI_KEY`
- 检查 LLM 模型是否已配置且可访问
- 查看网关日志：`tail -f ~/.hermes/logs/gateway.log`

### Bot 能文字回复但不在语音频道中发言

- TTS 提供商可能出现故障 — 检查 API 密钥和配额
- Edge TTS（免费，无需密钥）是默认的降级回退选项
- 检查日志中的 TTS 错误

### Whisper 返回乱码文本

幻觉过滤器会自动处理大多数情况。如果仍出现虚假转录：

- 换到更安静的环境
- 在配置中调高 `silence_threshold`（值越高，灵敏度越低）
- 尝试更换 STT 模型
