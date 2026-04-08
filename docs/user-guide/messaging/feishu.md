---
title: "飞书 / Lark 配置"
---
# 飞书 / Lark 配置

Hermes Agent 以全功能机器人的形式集成飞书和 Lark。连接成功后，可以在私信或群聊中与智能体对话，在 home chat（指定通知频道）中接收定时任务结果，并通过标准网关流程发送文字、图片、音频和文件附件。

该集成支持两种连接模式：

- `websocket` — 推荐方式；Hermes Agent 主动建立出站连接，无需公开的 Webhook 地址
- `webhook` — 适用于已有可访问 HTTP 端点、需要飞书/Lark 主动推送事件到网关的场景

## Hermes Agent 行为说明

| 上下文 | 行为 |
|--------|------|
| 私信 | Hermes Agent 回复每条消息。 |
| 群聊 | 仅当机器人被 @提及 时才回复。 |
| 共享群聊 | 默认情况下，每个用户的会话历史在共享群中相互隔离。 |

该共享群聊行为由 `config.yaml` 控制：

```yaml
group_sessions_per_user: true
```

仅在明确需要每个群聊共享同一个对话时，才将其设置为 `false`。

## 第一步：创建飞书 / Lark 应用

1. 打开飞书或 Lark 开发者控制台：
   - 飞书：[https://open.feishu.cn/](https://open.feishu.cn/)
   - Lark：[https://open.larksuite.com/](https://open.larksuite.com/)
2. 创建一个新应用。
3. 在**凭证与基础信息**中，复制 **App ID** 和 **App Secret**。
4. 为应用开启**机器人**能力。

:::caution
请妥善保管 App Secret，任何持有它的人都可以冒充你的应用。
:::

## 第二步：选择连接模式

### 推荐：WebSocket 模式

当 Hermes Agent 运行在笔记本、工作站或私有服务器上时，使用 WebSocket 模式。无需公开 URL。官方 Lark SDK 会建立并维持一个持久的出站 WebSocket 连接，并支持自动重连。

```bash
FEISHU_CONNECTION_MODE=websocket
```

**前提条件：** 需要安装 `websockets` Python 包。SDK 内部处理连接生命周期、心跳和自动重连。

**工作原理：** 适配器在后台执行线程中运行 Lark SDK 的 WebSocket 客户端。入站事件（消息、表情回应、卡片操作）被分发到主 asyncio 事件循环。断连后，SDK 会自动尝试重连。

### 可选：Webhook 模式

仅在 Hermes Agent 已经运行在可公开访问的 HTTP 端点后时，才使用 Webhook 模式。

```bash
FEISHU_CONNECTION_MODE=webhook
```

在 Webhook 模式下，Hermes Agent 会通过 `aiohttp` 启动一个 HTTP 服务，并在以下路径提供飞书 Webhook 端点：

```text
/feishu/webhook
```

**前提条件：** 需要安装 `aiohttp` Python 包。

可以自定义 Webhook 服务的绑定地址和路径：

```bash
FEISHU_WEBHOOK_HOST=127.0.0.1   # 默认：127.0.0.1
FEISHU_WEBHOOK_PORT=8765         # 默认：8765
FEISHU_WEBHOOK_PATH=/feishu/webhook  # 默认：/feishu/webhook
```

当飞书发送 URL 验证请求（`type: url_verification`）时，Webhook 会自动响应，以便在飞书开发者控制台完成订阅配置。

## 第三步：配置 Hermes Agent

### 方式 A：交互式配置

```bash
hermes gateway setup
```

选择 **飞书 / Lark** 并按提示填写信息。

### 方式 B：手动配置

在 `~/.hermes/.env` 中添加以下内容：

```bash
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=secret_xxx
FEISHU_DOMAIN=feishu
FEISHU_CONNECTION_MODE=websocket

# 可选，但强烈建议设置
FEISHU_ALLOWED_USERS=ou_xxx,ou_yyy
FEISHU_HOME_CHANNEL=oc_xxx
```

`FEISHU_DOMAIN` 可选值：

- `feishu`：飞书（中国大陆）
- `lark`：Lark（国际版）

## 第四步：启动网关

```bash
hermes gateway
```

在飞书/Lark 中向机器人发送消息，确认连接已建立。

## Home Chat

在飞书/Lark 聊天中使用 `/set-home` 命令，将该会话标记为定时任务结果和跨平台通知的 home channel。

也可以通过环境变量预配置：

```bash
FEISHU_HOME_CHANNEL=oc_xxx
```

## 安全

### 用户白名单

在生产环境中，建议设置飞书 Open ID 白名单：

```bash
FEISHU_ALLOWED_USERS=ou_xxx,ou_yyy
```

留空白名单时，任何能访问机器人的用户都可能使用它。在群聊中，消息处理前会先核查发送者的 `open_id` 是否在白名单内。

### Webhook 加密密钥

在 Webhook 模式下，设置加密密钥以开启入站 Webhook 载荷的签名验证：

```bash
FEISHU_ENCRYPT_KEY=your-encrypt-key
```

该密钥位于飞书应用配置的**事件订阅**页面。设置后，适配器会使用以下签名算法验证每个 Webhook 请求：

```
SHA256(timestamp + nonce + encrypt_key + body)
```

计算出的哈希值与 `x-lark-signature` 请求头进行时序安全比较，签名无效或缺失的请求将返回 HTTP 401。

:::tip
在 WebSocket 模式下，签名验证由 SDK 内部处理，`FEISHU_ENCRYPT_KEY` 为可选配置。在 Webhook 模式下，生产环境强烈建议设置此项。
:::

### 验证令牌

对 Webhook 载荷中 `token` 字段进行检查的额外认证层：

```bash
FEISHU_VERIFICATION_TOKEN=your-verification-token
```

该令牌也在飞书应用的**事件订阅**页面获取。设置后，每个入站 Webhook 载荷的 `header` 对象中必须包含匹配的 `token`，令牌不匹配将返回 HTTP 401。

`FEISHU_ENCRYPT_KEY` 和 `FEISHU_VERIFICATION_TOKEN` 可同时使用，实现纵深防御。

## 群聊消息策略

`FEISHU_GROUP_POLICY` 环境变量控制 Hermes Agent 在群聊中是否响应及如何响应：

```bash
FEISHU_GROUP_POLICY=allowlist   # 默认值
```

| 值 | 行为 |
|----|------|
| `open` | 响应任意群中任意用户的 @提及。 |
| `allowlist` | 仅响应 `FEISHU_ALLOWED_USERS` 白名单中用户的 @提及。 |
| `disabled` | 忽略所有群消息。 |

在所有模式下，消息被处理前，机器人必须被明确 @提及（或 @all）。私信不受此限制。

### 用于 @提及检测的机器人身份

为了在群聊中精确检测 @提及，适配器需要获取机器人的身份信息，可显式配置：

```bash
FEISHU_BOT_OPEN_ID=ou_xxx
FEISHU_BOT_USER_ID=xxx
FEISHU_BOT_NAME=MyBot
```

若均未设置，适配器会在启动时通过应用信息 API 自动获取机器人名称。为此，需授予 `admin:app.info:readonly` 或 `application:application:self_manage` 权限范围。

## 交互式卡片操作

当用户点击机器人发送的交互式卡片上的按钮或进行其他交互时，适配器会将这些操作路由为合成的 `/card` 命令事件：

- 按钮点击变为：`/card button {"key": "value", ...}`
- 卡片定义中操作的 `value` 载荷以 JSON 格式附带。
- 卡片操作在 15 分钟时间窗口内去重，防止重复处理。

卡片操作事件以 `MessageType.COMMAND` 类型分发，流经正常的命令处理流水线。

要使用此功能，请在飞书应用的事件订阅中开启**互动卡片**事件（`card.action.trigger`）。

## 媒体支持

### 入站（接收）

适配器接收并缓存用户发送的以下媒体类型：

| 类型 | 扩展名 | 处理方式 |
|------|--------|----------|
| **图片** | .jpg, .jpeg, .png, .gif, .webp, .bmp | 通过飞书 API 下载并本地缓存 |
| **音频** | .ogg, .mp3, .wav, .m4a, .aac, .flac, .opus, .webm | 下载并缓存；小型文本文件自动提取内容 |
| **视频** | .mp4, .mov, .avi, .mkv, .webm, .m4v, .3gp | 下载并作为文档缓存 |
| **文件** | .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx 等 | 下载并作为文档缓存 |

富文本（post）消息中的媒体，包括内联图片和文件附件，同样会被提取和缓存。

对于小型文本类文档（.txt、.md），文件内容会自动注入消息正文，智能体无需调用工具即可直接读取。

### 出站（发送）

| 方法 | 发送内容 |
|------|----------|
| `send` | 文字或富文本 post 消息（根据 Markdown 内容自动判断） |
| `send_image` / `send_image_file` | 上传图片到飞书，以原生图片气泡发送（可附带说明文字） |
| `send_document` | 通过飞书 API 上传文件，以文件附件形式发送 |
| `send_voice` | 将音频文件作为飞书文件附件上传 |
| `send_video` | 上传视频并以原生媒体消息发送 |
| `send_animation` | GIF 降级为文件附件（飞书不支持原生 GIF 气泡） |

文件上传路由根据扩展名自动判断：

- `.ogg`、`.opus` → 作为 `opus` 音频上传
- `.mp4`、`.mov`、`.avi`、`.m4v` → 作为 `mp4` 媒体上传
- `.pdf`、`.doc(x)`、`.xls(x)`、`.ppt(x)` → 以对应文档类型上传
- 其他所有格式 → 作为通用流文件上传

## Markdown 渲染与 Post 降级

当出站文本包含 Markdown 格式（标题、加粗、列表、代码块、链接等）时，适配器会自动以带有 `md` 标签的飞书 **post** 消息形式发送，而非纯文本，以在飞书客户端中实现富文本渲染。

若飞书 API 拒绝 post 载荷（例如包含不支持的 Markdown 语法），适配器会自动降级为去除 Markdown 标记后的纯文本发送。这一两阶段降级机制确保消息始终能送达。

不含 Markdown 的纯文本消息以简单的 `text` 消息类型发送。

## ACK 表情回应

适配器收到入站消息时，会立即在消息上添加 ✅（OK）表情回应，表示消息已收到并正在处理。这在智能体完成响应前提供视觉反馈。

该回应不会被移除——响应发送后仍保留在消息上，作为已读标记。

用户对机器人消息的表情回应也会被追踪。若用户在机器人发送的消息上添加或移除表情，会被路由为合成文本事件（`reaction:added:EMOJI_TYPE` 或 `reaction:removed:EMOJI_TYPE`），供智能体响应用户反馈。

## 突发保护与批处理

适配器对快速连发消息进行防抖处理，避免智能体过载：

### 文本批处理

用户快速连续发送多条文本消息时，会在分发前合并为单个事件：

| 设置 | 环境变量 | 默认值 |
|------|----------|--------|
| 静默期 | `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` | 0.6s |
| 每批最大消息数 | `HERMES_FEISHU_TEXT_BATCH_MAX_MESSAGES` | 8 |
| 每批最大字符数 | `HERMES_FEISHU_TEXT_BATCH_MAX_CHARS` | 4000 |

### 媒体批处理

快速连续发送的多个媒体附件（例如一次拖入多张图片）会合并为单个事件：

| 设置 | 环境变量 | 默认值 |
|------|----------|--------|
| 静默期 | `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | 0.8s |

### 单会话串行化

同一会话内的消息按顺序逐条处理，以保持对话连贯性。每个会话独立加锁，不同会话的消息可并发处理。

## 频率限制（Webhook 模式）

在 Webhook 模式下，适配器对每个 IP 执行频率限制，防止滥用：

- **时间窗口：** 60 秒滑动窗口
- **限制：** 每个 `(app_id, path, IP)` 三元组每个窗口最多 120 次请求
- **追踪上限：** 最多追踪 4096 个唯一键（防止内存无限增长）

超出限制的请求将收到 HTTP 429（请求过多）响应。

### Webhook 异常追踪

适配器追踪每个 IP 地址的连续错误响应数量。在 6 小时时间窗口内，同一 IP 连续出现 25 次错误后，会记录警告日志。这有助于检测配置错误的客户端或探测行为。

其他 Webhook 防护措施：

- **请求体大小限制：** 最大 1 MB
- **请求体读取超时：** 30 秒
- **Content-Type 强制要求：** 仅接受 `application/json`

## WebSocket 调优

使用 `websocket` 模式时，可通过 `config.yaml` 自定义重连和 ping 行为：

```yaml
platforms:
  feishu:
    extra:
      ws_reconnect_interval: 120   # 重连间隔秒数（默认：120）
      ws_ping_interval: 30         # WebSocket ping 间隔秒数（可选；未设置时使用 SDK 默认值）
```

| 设置 | 配置键 | 默认值 | 说明 |
|------|--------|--------|------|
| 重连间隔 | `ws_reconnect_interval` | 120s | 两次重连尝试之间的等待时间 |
| Ping 间隔 | `ws_ping_interval` | _(SDK 默认)_ | WebSocket 保活 ping 的频率 |

## 群组访问控制

除全局 `FEISHU_GROUP_POLICY` 外，还可通过 `config.yaml` 中的 `group_rules` 对每个群聊设置细粒度规则：

```yaml
platforms:
  feishu:
    extra:
      default_group_policy: "open"     # 未在 group_rules 中列出的群的默认策略
      admins:                          # 可管理机器人设置的用户
        - "ou_admin_open_id"
      group_rules:
        "oc_group_chat_id_1":
          policy: "allowlist"          # open | allowlist | blacklist | admin_only | disabled
          allowlist:
            - "ou_user_open_id_1"
            - "ou_user_open_id_2"
        "oc_group_chat_id_2":
          policy: "admin_only"
        "oc_group_chat_id_3":
          policy: "blacklist"
          blacklist:
            - "ou_blocked_user"
```

| 策略 | 说明 |
|------|------|
| `open` | 群内任何人均可使用机器人 |
| `allowlist` | 仅群组 `allowlist` 中的用户可使用机器人 |
| `blacklist` | 除 `blacklist` 中的用户外，其他人均可使用机器人 |
| `admin_only` | 仅全局 `admins` 列表中的用户可在该群使用机器人 |
| `disabled` | 机器人忽略该群的所有消息 |

未在 `group_rules` 中列出的群回退到 `default_group_policy`（默认为 `FEISHU_GROUP_POLICY` 的值）。

## 去重

入站消息使用消息 ID 去重，TTL 为 24 小时。去重状态持久化保存到 `~/.hermes/feishu_seen_message_ids.json`，重启后依然有效。

| 设置 | 环境变量 | 默认值 |
|------|----------|--------|
| 缓存大小 | `HERMES_FEISHU_DEDUP_CACHE_SIZE` | 2048 条 |

## 所有环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `FEISHU_APP_ID` | ✅ | — | 飞书/Lark App ID |
| `FEISHU_APP_SECRET` | ✅ | — | 飞书/Lark App Secret |
| `FEISHU_DOMAIN` | — | `feishu` | `feishu`（中国大陆）或 `lark`（国际版） |
| `FEISHU_CONNECTION_MODE` | — | `websocket` | `websocket` 或 `webhook` |
| `FEISHU_ALLOWED_USERS` | — | _(空)_ | 逗号分隔的用户白名单 open_id 列表 |
| `FEISHU_HOME_CHANNEL` | — | — | 定时任务/通知输出的会话 ID |
| `FEISHU_ENCRYPT_KEY` | — | _(空)_ | Webhook 签名验证的加密密钥 |
| `FEISHU_VERIFICATION_TOKEN` | — | _(空)_ | Webhook 载荷认证的验证令牌 |
| `FEISHU_GROUP_POLICY` | — | `allowlist` | 群消息策略：`open`、`allowlist`、`disabled` |
| `FEISHU_BOT_OPEN_ID` | — | _(空)_ | 机器人的 open_id（用于 @提及检测） |
| `FEISHU_BOT_USER_ID` | — | _(空)_ | 机器人的 user_id（用于 @提及检测） |
| `FEISHU_BOT_NAME` | — | _(空)_ | 机器人的显示名称（用于 @提及检测） |
| `FEISHU_WEBHOOK_HOST` | — | `127.0.0.1` | Webhook 服务绑定地址 |
| `FEISHU_WEBHOOK_PORT` | — | `8765` | Webhook 服务端口 |
| `FEISHU_WEBHOOK_PATH` | — | `/feishu/webhook` | Webhook 端点路径 |
| `HERMES_FEISHU_DEDUP_CACHE_SIZE` | — | `2048` | 最大去重消息 ID 追踪数量 |
| `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` | — | `0.6` | 文本突发防抖静默期 |
| `HERMES_FEISHU_TEXT_BATCH_MAX_MESSAGES` | — | `8` | 文本批次最大合并消息数 |
| `HERMES_FEISHU_TEXT_BATCH_MAX_CHARS` | — | `4000` | 文本批次最大合并字符数 |
| `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | — | `0.8` | 媒体突发防抖静默期 |

WebSocket 及群组访问控制设置通过 `config.yaml` 的 `platforms.feishu.extra` 配置（参见上方 [WebSocket 调优](#websocket-调优) 和 [群组访问控制](#群组访问控制) 章节）。

## 故障排查

| 问题 | 解决方法 |
|------|----------|
| `lark-oapi not installed` | 安装 SDK：`pip install lark-oapi` |
| `websockets not installed; websocket mode unavailable` | 安装 websockets：`pip install websockets` |
| `aiohttp not installed; webhook mode unavailable` | 安装 aiohttp：`pip install aiohttp` |
| `FEISHU_APP_ID or FEISHU_APP_SECRET not set` | 设置两个环境变量，或通过 `hermes gateway setup` 配置 |
| `Another local Hermes gateway is already using this Feishu app_id` | 同一 app_id 同时只能有一个 Hermes Agent 实例使用，请先停止另一个网关。 |
| 机器人在群聊中不响应 | 确认机器人已被 @提及，检查 `FEISHU_GROUP_POLICY`，若策略为 `allowlist` 则确认发送者在 `FEISHU_ALLOWED_USERS` 中 |
| `Webhook rejected: invalid verification token` | 确认 `FEISHU_VERIFICATION_TOKEN` 与飞书应用事件订阅配置中的令牌一致 |
| `Webhook rejected: invalid signature` | 确认 `FEISHU_ENCRYPT_KEY` 与飞书应用配置中的加密密钥一致 |
| Post 消息显示为纯文本 | 飞书 API 拒绝了 post 载荷，这是正常的降级行为，请查看日志了解详情 |
| 机器人未收到图片或文件 | 为飞书应用授予 `im:message` 和 `im:resource` 权限范围 |
| 机器人身份未自动识别 | 授予 `admin:app.info:readonly` 权限范围，或手动设置 `FEISHU_BOT_OPEN_ID` / `FEISHU_BOT_NAME` |
| `Webhook rate limit exceeded` | 同一 IP 每分钟超过 120 次请求，通常是配置错误或循环调用所致 |

## 工具集

飞书 / Lark 使用 `hermes-feishu` 平台预设，包含与 Telegram 及其他基于网关的消息平台相同的核心工具集。
