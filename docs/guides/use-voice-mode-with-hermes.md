---
title: "在 Hermes 中使用语音模式"
---
# 在 Hermes 中使用语音模式

本指南是[语音模式功能参考](/user-guide/features/voice-mode)的实操配套文档。

功能页面说明语音模式能做什么，本指南则展示如何用好它。

## 语音模式适用场景

语音模式在以下场景尤为适用：
- 在 CLI 中解放双手，无需打字
- 在 Telegram 或 Discord 中获取语音回复
- 让 Hermes 在 Discord 语音频道中进行实时对话
- 走动时快速记录想法、调试问题或来回交流，不必坐在键盘前

## 选择适合你的语音模式方案

Hermes 提供三种不同的语音体验。

| 模式 | 最适合场景 | 平台 |
|---|---|---|
| 交互式麦克风循环 | 编码或研究时的个人免手持使用 | CLI |
| 聊天中的语音回复 | 在普通消息旁附带语音回复 | Telegram、Discord |
| 实时语音频道 Bot | 在语音频道中进行群组或个人实时对话 | Discord 语音频道 |

推荐路径：
1. 先确保文字模式正常运行
2. 再启用语音回复
3. 最后再考虑 Discord 语音频道（如需完整体验）

## 第 1 步：确保普通 Hermes 正常运行

在启用语音模式之前，请先验证：
- Hermes 可以正常启动
- 已配置好提供商
- 智能体能够正常响应文字提示词

```bash
hermes
```

输入一个简单问题：

```text
What tools do you have available?
```

如果文字模式还有问题，请先解决，再继续。

## 第 2 步：安装所需扩展包

### CLI 麦克风 + 音频播放

```bash
pip install "hermes-agent[voice]"
```

### 消息平台

```bash
pip install "hermes-agent[messaging]"
```

### 高级 ElevenLabs TTS

```bash
pip install "hermes-agent[tts-premium]"
```

### 本地 NeuTTS（可选）

```bash
python -m pip install -U neutts[all]
```

### 安装全部

```bash
pip install "hermes-agent[all]"
```

## 第 3 步：安装系统依赖项

### macOS

```bash
brew install portaudio ffmpeg opus
brew install espeak-ng
```

### Ubuntu / Debian

```bash
sudo apt install portaudio19-dev ffmpeg libopus0
sudo apt install espeak-ng
```

各依赖项的作用：
- `portaudio` → CLI 语音模式的麦克风输入 / 音频播放
- `ffmpeg` → TTS（文字转语音）和消息投递的音频格式转换
- `opus` → Discord 语音编解码器支持
- `espeak-ng` → NeuTTS 的音素化后端

## 第 4 步：选择 STT 和 TTS 提供商

Hermes 同时支持本地和云端语音处理方案。

### 最简单 / 最低成本方案

使用本地 STT（语音转文字）和免费 Edge TTS（文字转语音）：
- STT 提供商：`local`
- TTS 提供商：`edge`

通常这是最推荐的入门方式。

### 环境变量文件示例

添加到 `~/.hermes/.env`：

```bash
# 云端 STT 选项（本地模式无需密钥）
GROQ_API_KEY=***
VOICE_TOOLS_OPENAI_KEY=***

# 高级 TTS（可选）
ELEVENLABS_API_KEY=***
```

### 提供商推荐

#### 语音转文字（STT）

- `local` → 隐私保护和零成本使用的最佳默认选项
- `groq` → 极速云端转录
- `openai` → 可靠的付费备选方案

#### 文字转语音（TTS）

- `edge` → 免费，对大多数用户而言效果足够好
- `neutts` → 免费的本地/设备端 TTS
- `elevenlabs` → 最高音质
- `openai` → 性价比均衡的中间选项

### 如果使用 `hermes setup`

如果你在安装向导中选择了 NeuTTS，Hermes 会检查 `neutts` 是否已安装。若未安装，向导会提示你 NeuTTS 需要 Python 包 `neutts` 和系统包 `espeak-ng`，并询问是否自动安装，然后用平台包管理器安装 `espeak-ng`，再运行：

```bash
python -m pip install -U neutts[all]
```

如果你跳过了安装或安装失败，向导会自动回退到 Edge TTS。

## 第 5 步：推荐配置

```yaml
voice:
  record_key: "ctrl+b"
  max_recording_seconds: 120
  auto_tts: false
  silence_threshold: 200
  silence_duration: 3.0

stt:
  provider: "local"
  local:
    model: "base"

tts:
  provider: "edge"
  edge:
    voice: "en-US-AriaNeural"
```

这是适合大多数用户的保守默认配置。

如果你想改用本地 TTS，将 `tts` 配置块替换为：

```yaml
tts:
  provider: "neutts"
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
```

## 用例 1：CLI 语音模式

### 开启语音模式

启动 Hermes：

```bash
hermes
```

在 CLI 中执行：

```text
/voice on
```

### 录音流程

默认按键：
- `Ctrl+B`

工作流程：
1. 按下 `Ctrl+B`
2. 说话
3. 等待静音检测自动停止录音
4. Hermes 进行转录并给出回复
5. 如果 TTS 已开启，会朗读回复内容
6. 循环可自动重启以支持连续使用

### 常用命令

```text
/voice
/voice on
/voice off
/voice tts
/voice status
```

### 实用 CLI 工作流

#### 随走随调试

说：

```text
I keep getting a docker permission error. Help me debug it.
```

然后继续免手持交流：
- "再读一遍最后的报错"
- "用更简单的语言解释根本原因"
- "现在给我精确的修复方案"

#### 研究 / 头脑风暴

非常适合：
- 边走边思考
- 口述半成形的想法
- 让 Hermes 实时帮你整理思路

#### 无障碍 / 减少打字的场景

如果打字不便，语音模式是保持与 Hermes 完整交互最快的方式之一。

## 调整 CLI 行为

### 静音阈值

如果 Hermes 的录音启停过于灵敏，可调整：

```yaml
voice:
  silence_threshold: 250
```

阈值越高，灵敏度越低。

### 静音持续时间

如果你说话时句子间停顿较多，可适当增大：

```yaml
voice:
  silence_duration: 4.0
```

### 录音键

如果 `Ctrl+B` 与你的终端或 tmux 快捷键冲突，可修改：

```yaml
voice:
  record_key: "ctrl+space"
```

## 用例 2：Telegram 或 Discord 语音回复

此模式比完整语音频道模式更简单。

Hermes 仍作为普通聊天机器人运行，但可以语音形式发送回复。

### 启动网关

```bash
hermes gateway
```

### 开启语音回复

在 Telegram 或 Discord 中执行：

```text
/voice on
```

或

```text
/voice tts
```

### 模式说明

| 模式 | 含义 |
|---|---|
| `off` | 仅文字 |
| `voice_only` | 仅在用户发送语音时才语音回复 |
| `all` | 每次回复都使用语音 |

### 何时选择哪种模式

- `/voice on`：仅对语音来源的消息给出语音回复
- `/voice tts`：始终使用完整语音助手模式

### 实用消息平台工作流

#### 手机上的 Telegram 助手

适用场景：
- 不在电脑旁时
- 发送语音备忘录并获取快速语音回复
- 将 Hermes 用作便携式研究或运维助手

#### Discord 私信中的语音输出

适合需要私密交互、不希望在服务器频道中被 @ 提及的场景。

## 用例 3：Discord 语音频道

这是最高级的模式。

Hermes 加入 Discord 语音频道（VC），监听用户语音并转录，运行标准智能体流水线，然后将语音回复播放回频道。

## Discord 所需权限

除了普通文字机器人的配置外，请确保机器人拥有以下权限：
- Connect（连接）
- Speak（发言）
- 推荐启用 Use Voice Activity（语音活动检测）

同时在 Discord 开发者门户中启用特权意图（Privileged Intents）：
- Presence Intent（存在意图）
- Server Members Intent（服务器成员意图）
- Message Content Intent（消息内容意图）

## 加入与离开

在机器人所在的 Discord 文字频道中执行：

```text
/voice join
/voice leave
/voice status
```

### 加入后的行为

- 用户在语音频道中说话
- Hermes 检测语音边界
- 转录文本发布到关联文字频道
- Hermes 同时以文字和音频形式回复
- 文字频道即执行 `/voice join` 命令的频道

### Discord 语音频道使用建议

- 严格限制 `DISCORD_ALLOWED_USERS` 中的用户范围
- 初期使用专用测试机器人频道
- 在尝试语音频道模式前，先确认 STT 和 TTS 在普通文字聊天语音模式下工作正常

## 语音质量推荐方案

### 最高音质方案

- STT：本地 `large-v3` 或 Groq `whisper-large-v3`
- TTS：ElevenLabs

### 速度 / 便利性最佳方案

- STT：本地 `base` 或 Groq
- TTS：Edge

### 零成本方案

- STT：本地（local）
- TTS：Edge

## 常见故障排查

### "No audio device found"（未找到音频设备）

安装 `portaudio`。

### "Bot joins but hears nothing"（机器人加入但听不到声音）

检查：
- 你的 Discord 用户 ID 是否在 `DISCORD_ALLOWED_USERS` 中
- 你是否处于静音状态
- 特权意图是否已启用
- 机器人是否拥有 Connect/Speak 权限

### "It transcribes but does not speak"（能转录但不说话）

检查：
- TTS 提供商配置
- ElevenLabs 或 OpenAI 的 API 密钥 / 配额
- Edge 转换路径所需的 `ffmpeg` 安装情况

### "Whisper outputs garbage"（Whisper 输出乱码）

尝试：
- 减少环境噪音
- 调高 `silence_threshold`
- 更换 STT 提供商或模型
- 说话更简短、更清晰

### "It works in DMs but not in server channels"（私信正常但服务器频道不行）

这通常是 @提及策略问题。

默认情况下，除非另行配置，机器人在 Discord 服务器文字频道中需要被 `@提及` 才会响应。

## 第一周入门建议

最短路径：

1. 先确保文字版 Hermes 正常运行
2. 安装 `hermes-agent[voice]`
3. 使用本地 STT + Edge TTS 体验 CLI 语音模式
4. 然后在 Telegram 或 Discord 中启用 `/voice on`
5. 最后再尝试 Discord 语音频道模式

这样的递进顺序能让排错范围保持在最小。

## 延伸阅读

- [语音模式功能参考](/user-guide/features/voice-mode)
- [消息网关](/user-guide/messaging)
- [Discord 配置](/user-guide/messaging/discord)
- [Telegram 配置](/user-guide/messaging/telegram)
- [配置说明](/user-guide/configuration)
