---
title: "语音与 TTS"
---
# 语音与 TTS

Hermes Agent 支持在所有消息平台上进行文字转语音输出和语音消息转录。

## 文字转语音

支持通过以下五个提供商进行文字转语音：

| 提供商 | 质量 | 费用 | API 密钥 |
|----------|---------|------|---------|
| **Edge TTS**（默认）| 良好 | 免费 | 无需 |
| **ElevenLabs** | 优秀 | 付费 | `ELEVENLABS_API_KEY` |
| **OpenAI TTS** | 良好 | 付费 | `VOICE_TOOLS_OPENAI_KEY` |
| **MiniMax TTS** | 优秀 | 付费 | `MINIMAX_API_KEY` |
| **NeuTTS** | 良好 | 免费 | 无需 |

### 平台发送方式

| 平台 | 发送方式 | 格式 |
|----------|----------|--------|
| Telegram | 语音气泡（内嵌播放）| Opus `.ogg` |
| Discord | 语音气泡（Opus/OGG），不可用时回退为文件附件 | Opus/MP3 |
| WhatsApp | 音频文件附件 | MP3 |
| CLI | 保存至 `~/.hermes/audio_cache/` | MP3 |

### 配置

```yaml
# 在 ~/.hermes/config.yaml 中
tts:
  provider: "edge"              # "edge" | "elevenlabs" | "openai" | "minimax" | "neutts"
  edge:
    voice: "en-US-AriaNeural"   # 322 种声音，74 种语言
  elevenlabs:
    voice_id: "pNInz6obpgDQGcFmaJgB"  # Adam
    model_id: "eleven_multilingual_v2"
  openai:
    model: "gpt-4o-mini-tts"
    voice: "alloy"              # alloy, echo, fable, onyx, nova, shimmer
    base_url: "https://api.openai.com/v1"  # 可覆盖以使用兼容 OpenAI 的 TTS 端点
  minimax:
    model: "speech-2.8-hd"     # speech-2.8-hd（默认），speech-2.8-turbo
    voice_id: "English_Graceful_Lady"  # 参见 https://platform.minimax.io/faq/system-voice-id
    speed: 1                    # 0.5 - 2.0
    vol: 1                      # 0 - 10
    pitch: 0                    # -12 - 12
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
```

### Telegram 语音气泡与 ffmpeg

Telegram 语音气泡需要 Opus/OGG 音频格式：

- **OpenAI 和 ElevenLabs** 原生输出 Opus 格式，无需额外配置
- **Edge TTS**（默认）输出 MP3，需要 **ffmpeg** 进行转换
- **MiniMax TTS** 输出 MP3，需要 **ffmpeg** 才能转换为 Telegram 语音气泡格式
- **NeuTTS** 输出 WAV，也需要 **ffmpeg** 才能转换为 Telegram 语音气泡格式

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Fedora
sudo dnf install ffmpeg
```

若未安装 ffmpeg，Edge TTS、MiniMax TTS 和 NeuTTS 的音频将作为普通音频文件发送（可播放，但显示为矩形播放器而非语音气泡）。

:::tip
如果你想使用语音气泡但不想安装 ffmpeg，可切换至 OpenAI 或 ElevenLabs 提供商。
:::

## 语音消息转录（STT）

在 Telegram、Discord、WhatsApp、Slack 或 Signal 上发送的语音消息会被自动转录，并以文本形式注入对话。智能体将转录文本视为普通文本处理。

| 提供商 | 质量 | 费用 | API 密钥 |
|----------|---------|------|---------|
| **本地 Whisper**（默认）| 良好 | 免费 | 无需 |
| **Groq Whisper API** | 良好—最佳 | 免费版 | `GROQ_API_KEY` |
| **OpenAI Whisper API** | 良好—最佳 | 付费 | `VOICE_TOOLS_OPENAI_KEY` 或 `OPENAI_API_KEY` |

:::info
零配置
安装 `faster-whisper` 后，本地转录开箱即用。若无法使用，Hermes 也可调用常见安装路径（如 `/opt/homebrew/bin`）下的本地 `whisper` CLI，或通过 `HERMES_LOCAL_STT_COMMAND` 指定自定义命令。
:::

### 配置

```yaml
# 在 ~/.hermes/config.yaml 中
stt:
  provider: "local"           # "local" | "groq" | "openai"
  local:
    model: "base"             # tiny, base, small, medium, large-v3
  openai:
    model: "whisper-1"        # whisper-1, gpt-4o-mini-transcribe, gpt-4o-transcribe
```

### 提供商详情

**本地（faster-whisper）** — 通过 [faster-whisper](https://github.com/SYSTRAN/faster-whisper) 在本地运行 Whisper。默认使用 CPU，若有 GPU 则自动使用。模型大小：

| 模型 | 大小 | 速度 | 质量 |
|-------|------|-------|---------|
| `tiny` | ~75 MB | 最快 | 基础 |
| `base` | ~150 MB | 快 | 良好（默认）|
| `small` | ~500 MB | 中等 | 较好 |
| `medium` | ~1.5 GB | 较慢 | 很好 |
| `large-v3` | ~3 GB | 最慢 | 最佳 |

**Groq API** — 需要 `GROQ_API_KEY`。适合在需要免费托管 STT 方案时作为云端备选。

**OpenAI API** — 优先使用 `VOICE_TOOLS_OPENAI_KEY`，若未设置则回退至 `OPENAI_API_KEY`。支持 `whisper-1`、`gpt-4o-mini-transcribe` 和 `gpt-4o-transcribe`。

**自定义本地 CLI 兜底** — 若需要 Hermes 直接调用本地转录命令，可设置 `HERMES_LOCAL_STT_COMMAND`。命令模板支持 `{input_path}`、`{output_dir}`、`{language}` 和 `{model}` 占位符。

### 回退行为

若配置的提供商不可用，Hermes 会自动回退：

- **本地 faster-whisper 不可用** → 在切换至云端提供商之前，先尝试本地 `whisper` CLI 或 `HERMES_LOCAL_STT_COMMAND`
- **未设置 Groq 密钥** → 回退至本地转录，再回退至 OpenAI
- **未设置 OpenAI 密钥** → 回退至本地转录，再回退至 Groq
- **均不可用** → 语音消息原样透传，并附上准确的提示信息
