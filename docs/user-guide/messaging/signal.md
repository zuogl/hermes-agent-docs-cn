---
title: "Signal 配置"
---
# Signal 配置

Hermes 通过运行在 HTTP 模式下的 [signal-cli](https://github.com/AsamK/signal-cli) 守护进程连接 Signal。适配器通过 SSE（服务器推送事件）实时接收消息，并通过 JSON-RPC 发送响应。

Signal 是隐私保护最严格的主流即时通讯工具——默认端对端加密、开源协议、几乎不收集元数据。这使其成为注重隐私与安全的智能体工作流的理想平台。

:::info
无需新增 Python 依赖
Signal 适配器使用 `httpx`（Hermes 的核心依赖之一）处理所有通信，无需安装额外的 Python 包。只需在外部安装 signal-cli 即可。
:::

---

## 前置条件

- **signal-cli** — 基于 Java 的 Signal 客户端（[GitHub](https://github.com/AsamK/signal-cli)）
- **Java 17+** 运行时 — signal-cli 所需
- **一个可用 Signal 的手机号**（用于关联为辅助设备）

### 安装 signal-cli

```bash
# macOS
brew install signal-cli

# Linux（下载最新版本）
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} \
  https://github.com/AsamK/signal-cli/releases/latest | sed 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}.tar.gz"
sudo tar xf "signal-cli-${VERSION}.tar.gz" -C /opt
sudo ln -sf "/opt/signal-cli-${VERSION}/bin/signal-cli" /usr/local/bin/
```

:::caution
signal-cli **未收录**于 apt 或 snap 仓库。上方 Linux 安装命令直接从 [GitHub releases](https://github.com/AsamK/signal-cli/releases) 下载。
:::

---

## 第一步：关联 Signal 账号

signal-cli 以**关联设备**方式运行——类似 WhatsApp Web，但用于 Signal。手机保持为主设备。

```bash
# 生成关联 URI（显示二维码或链接）
signal-cli link -n "HermesAgent"
```

1. 在手机上打开 **Signal**
2. 进入 **设置 → 关联设备**
3. 点击**关联新设备**
4. 扫描二维码或输入 URI

---

## 第二步：启动 signal-cli 守护进程

```bash
# 将 +1234567890 替换为你的 Signal 手机号（E.164 格式）
signal-cli --account +1234567890 daemon --http 127.0.0.1:8080
```

:::tip
让它在后台持续运行。可以使用 `systemd`、`tmux`、`screen`，或将其注册为服务。
:::

验证运行状态：

```bash
curl http://127.0.0.1:8080/api/v1/check
# 应返回：{"versions":{"signal-cli":...}}
```

---

## 第三步：配置 Hermes

最简单的方式：

```bash
hermes gateway setup
```

在平台菜单中选择 **Signal**。向导将依次：

1. 检查 signal-cli 是否已安装
2. 提示输入 HTTP URL（默认：`http://127.0.0.1:8080`）
3. 测试与守护进程的连接
4. 询问你的账号手机号
5. 配置允许访问的用户和访问策略

### 手动配置

在 `~/.hermes/.env` 中添加：

```bash
# 必填
SIGNAL_HTTP_URL=http://127.0.0.1:8080
SIGNAL_ACCOUNT=+1234567890

# 安全配置（推荐）
SIGNAL_ALLOWED_USERS=+1234567890,+0987654321    # 逗号分隔的 E.164 号码或 UUID

# 可选
SIGNAL_GROUP_ALLOWED_USERS=groupId1,groupId2     # 启用群组（留空则禁用，* 表示全部）
SIGNAL_HOME_CHANNEL=+1234567890                  # 定时任务的默认投递目标
```

然后启动网关：

```bash
hermes gateway              # 前台运行
hermes gateway install      # 安装为用户服务
sudo hermes gateway install --system   # 仅 Linux：开机自启系统服务
```

---

## 访问控制

### 私信访问

私信访问遵循与其他 Hermes 平台相同的模式：

1. **已设置 `SIGNAL_ALLOWED_USERS`** → 只有列表中的用户可以发送消息
2. **未设置允许列表** → 未知用户收到私信配对码（通过 `hermes pairing approve signal CODE` 审批）
3. **`SIGNAL_ALLOW_ALL_USERS=true`** → 任何人均可发送消息（谨慎使用）

### 群组访问

群组访问由环境变量 `SIGNAL_GROUP_ALLOWED_USERS` 控制：

| 配置 | 行为 |
|------|------|
| 未设置（默认） | 忽略所有群组消息，机器人仅响应私信。 |
| 设置群组 ID | 仅监听指定群组（如 `groupId1,groupId2`）。 |
| 设置为 `*` | 机器人响应其所在的任意群组。 |

---

## 功能

### 附件

适配器支持双向发送和接收媒体文件。

**接收**（用户 → 智能体）：

- **图片** — PNG、JPEG、GIF、WebP（通过魔数字节自动识别格式）
- **音频** — MP3、OGG、WAV、M4A（若已配置 Whisper，语音消息将自动转录）
- **文档** — PDF、ZIP 及其他文件类型

**发送**（智能体 → 用户）：

智能体可在响应中通过 `MEDIA:` 标签发送媒体文件，支持以下发送方式：

- **图片** — `send_image_file` 以原生 Signal 附件形式发送 PNG、JPEG、GIF、WebP
- **语音** — `send_voice` 发送音频文件（OGG、MP3、WAV、M4A、AAC）作为附件
- **视频** — `send_video` 发送 MP4 视频文件
- **文档** — `send_document` 发送任意类型文件（PDF、ZIP 等）

所有出站媒体均通过 Signal 的标准附件 API 发送。与某些平台不同，Signal 在协议层面不区分语音消息和文件附件。

附件大小限制：**100 MB**（双向均适用）。

### 正在输入提示

机器人在处理消息期间发送"正在输入"提示，每 8 秒刷新一次。

### 电话号码脱敏

所有电话号码在日志中自动脱敏：

- `+15551234567` → `+155****4567`
- 适用于 Hermes 网关日志和全局脱敏系统

### 写给自己（单号码模式）

如果你将 signal-cli 作为自己手机号的**关联辅助设备**运行（而非单独的机器人号码），可以通过 Signal 的"写给自己"功能与 Hermes 交互。

只需从手机给自己发一条消息——signal-cli 会接收到它，Hermes 则在同一对话中回复。

**工作原理：**

- "写给自己"的消息以 `syncMessage.sentMessage` 信封格式到达
- 适配器检测到这些消息是发送给机器人自身账号时，将其作为普通入站消息处理
- 回环保护机制（已发送时间戳追踪）防止无限循环——机器人自身的回复会被自动过滤

**无需额外配置。** 只要 `SIGNAL_ACCOUNT` 与你的手机号一致，该功能即自动生效。

### 健康监测

适配器持续监控 SSE 连接，在以下情况下自动重连：

- 连接断开（采用指数退避策略：2 秒 → 60 秒）
- 120 秒内无任何活动（向 signal-cli 发送 ping 进行验证）

---

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 配置时提示**"无法连接 signal-cli"** | 确认 signal-cli 守护进程正在运行：`signal-cli --account +YOUR_NUMBER daemon --http 127.0.0.1:8080` |
| **消息未被接收** | 检查 `SIGNAL_ALLOWED_USERS` 是否包含发送方号码（E.164 格式，带 `+` 前缀） |
| **"signal-cli not found on PATH"** | 安装 signal-cli 并确保其在 PATH 中，或使用 Docker |
| **连接频繁断开** | 查看 signal-cli 日志排查错误，确认已安装 Java 17+ |
| **群组消息被忽略** | 在 `SIGNAL_GROUP_ALLOWED_USERS` 中配置特定群组 ID，或设为 `*` 允许所有群组 |
| **机器人不响应任何人** | 配置 `SIGNAL_ALLOWED_USERS`，使用私信配对，或通过网关策略明确允许所有用户 |
| **消息重复** | 确保只有一个 signal-cli 实例在监听你的手机号 |

---

## 安全

:::caution
**务必配置访问控制。** 机器人默认拥有终端访问权限。若未设置 `SIGNAL_ALLOWED_USERS` 或私信配对，网关将拒绝所有入站消息作为安全措施。
:::

- 所有日志输出中的电话号码均已脱敏
- 使用私信配对或显式允许列表来安全地接入新用户
- 除非确实需要群组支持，否则保持群组功能禁用状态，或仅将可信群组加入允许列表
- Signal 的端对端加密保护传输中的消息内容
- `~/.local/share/signal-cli/` 中的 signal-cli 会话数据包含账号凭证——请像对待密码一样保管

---

## 环境变量参考

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `SIGNAL_HTTP_URL` | 是 | — | signal-cli HTTP 端点 |
| `SIGNAL_ACCOUNT` | 是 | — | 机器人手机号（E.164 格式） |
| `SIGNAL_ALLOWED_USERS` | 否 | — | 逗号分隔的手机号/UUID |
| `SIGNAL_GROUP_ALLOWED_USERS` | 否 | — | 监听的群组 ID，或 `*` 表示全部（留空禁用群组） |
| `SIGNAL_ALLOW_ALL_USERS` | 否 | `false` | 允许任意用户交互（跳过允许列表） |
| `SIGNAL_HOME_CHANNEL` | 否 | — | 定时任务的默认投递目标 |
