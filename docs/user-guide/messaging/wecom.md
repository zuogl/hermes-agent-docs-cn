---
title: "企业微信（WeCom）"
---
# 企业微信（WeCom）

将 Hermes Agent 连接到[企业微信](https://work.weixin.qq.com/)（WeCom），腾讯面向企业的即时通讯平台。该适配器使用企业微信 AI Bot WebSocket 网关实现实时双向通信——无需公网端点或 Webhook。

## 前置条件

- 企业微信组织账号
- 在企业微信管理后台创建的 AI Bot
- Bot 凭证页面中的 Bot ID 和 Secret
- Python 包：`aiohttp` 和 `httpx`

## 配置

### 1. 创建 AI Bot

1. 登录[企业微信管理后台](https://work.weixin.qq.com/wework_admin/frame)
2. 导航至**应用管理（Applications）**→ **创建应用（Create Application）**→ **AI Bot**
3. 配置 Bot 名称和描述
4. 从凭证页面复制 **Bot ID** 和 **Secret**

### 2. 配置 Hermes

运行交互式配置向导：

```bash
hermes gateway setup
```

选择 **WeCom（企业微信）**，然后输入 Bot ID 和 Secret。

或在 `~/.hermes/.env` 中设置环境变量：

```bash
WECOM_BOT_ID=your-bot-id
WECOM_SECRET=your-secret

# 可选：限制访问用户
WECOM_ALLOWED_USERS=user_id_1,user_id_2

# 可选：定时任务/通知的默认频道
WECOM_HOME_CHANNEL=chat_id
```

### 3. 启动网关

```bash
hermes gateway
```

## 功能特性

- **WebSocket 传输** — 持久连接，无需公网端点
- **私聊与群组消息** — 可配置的访问策略
- **群组级别发送者白名单** — 精细控制各群组中可交互的用户
- **媒体支持** — 图片、文件、语音、视频的上传与下载
- **AES 加密媒体** — 自动解密入站附件
- **引用上下文** — 保留回复消息的线程关系
- **Markdown 渲染** — 富文本响应
- **回复模式流式传输** — 将响应与对应的入站消息关联
- **自动重连** — 连接断开时使用指数退避策略

## 配置选项

在 `config.yaml` 的 `platforms.wecom.extra` 下设置以下选项：

| 参数 | 默认值 | 说明 |
|-----|---------|-------------|
| `bot_id` | — | 企业微信 AI Bot ID（必填） |
| `secret` | — | 企业微信 AI Bot Secret（必填） |
| `websocket_url` | `wss://openws.work.weixin.qq.com` | WebSocket 网关 URL |
| `dm_policy` | `open` | 私聊访问策略（`open` / `allowlist` / `disabled` / `pairing`） |
| `group_policy` | `open` | 群组访问策略（`open` / `allowlist` / `disabled`） |
| `allow_from` | `[]` | 允许私聊的用户 ID 列表（当 dm_policy=allowlist 时生效） |
| `group_allow_from` | `[]` | 允许的群组 ID 列表（当 group_policy=allowlist 时生效） |
| `groups` | `{}` | 群组级别配置（见下文） |

## 访问策略

### 私聊策略

控制哪些用户可以向 Bot 发送私信：

| 值 | 行为 |
|-------|----------|
| `open` | 任何人均可私聊 Bot（默认） |
| `allowlist` | 仅 `allow_from` 中的用户 ID 可私聊 |
| `disabled` | 忽略所有私聊消息 |
| `pairing` | 配对模式（用于初始设置） |

```bash
WECOM_DM_POLICY=allowlist
```

### 群组策略

控制 Bot 在哪些群组中响应消息：

| 值 | 行为 |
|-------|----------|
| `open` | Bot 在所有群组中响应（默认） |
| `allowlist` | Bot 仅在 `group_allow_from` 列出的群组 ID 中响应 |
| `disabled` | 忽略所有群组消息 |

```bash
WECOM_GROUP_POLICY=allowlist
```

### 群组级别发送者白名单

如需精细控制，可以限制特定群组中哪些用户可与 Bot 交互。在 `config.yaml` 中配置：

```yaml
platforms:
  wecom:
    enabled: true
    extra:
      bot_id: "your-bot-id"
      secret: "your-secret"
      group_policy: "allowlist"
      group_allow_from:
        - "group_id_1"
        - "group_id_2"
      groups:
        group_id_1:
          allow_from:
            - "user_alice"
            - "user_bob"
        group_id_2:
          allow_from:
            - "user_charlie"
        "*":
          allow_from:
            - "user_admin"
```

**工作原理：**

1. `group_policy` 和 `group_allow_from` 决定群组本身是否被允许访问。
2. 若群组通过了顶层检查，`groups.<group_id>.allow_from` 列表（如已配置）将进一步限制该群组内哪些发送者可与 Bot 交互。
3. 通配符 `"*"` 群组条目用作未明确列出的群组的默认配置。
4. 白名单条目支持 `*` 通配符以允许所有用户，且条目不区分大小写。
5. 条目可选择使用 `wecom:user:` 或 `wecom:group:` 前缀格式——前缀会被自动去除。

若某个群组未配置 `allow_from`，则该群组内所有用户均被允许（前提是群组本身通过了顶层策略检查）。

## 媒体支持

### 接收（入站媒体）

适配器接收用户发送的媒体附件，并将其缓存到本地供智能体处理：

| 类型 | 处理方式 |
|------|-----------------|
| **图片** | 下载并缓存到本地，支持基于 URL 和 Base64 编码两种图片格式。 |
| **文件** | 下载并缓存，文件名从原始消息中保留。 |
| **语音** | 如可用，则提取语音消息的文字转录内容。 |
| **混合消息** | 解析企业微信混合类型消息（文本 + 图片），提取所有组件。 |

**引用消息：** 被引用（回复）消息中的媒体也会被提取，以便智能体了解用户回复内容的上下文。

### AES 加密媒体解密

企业微信会对部分入站媒体附件使用 AES-256-CBC 加密，适配器可自动处理：

- 当入站媒体包含 `aeskey` 字段时，适配器会下载加密字节，并使用带 PKCS#7 填充的 AES-256-CBC 进行解密。
- AES 密钥为 `aeskey` 字段的 Base64 解码值（必须恰好为 32 字节）。
- IV 取密钥的前 16 字节派生而来。
- 此功能需要安装 `cryptography` Python 包（`pip install cryptography`）。

无需任何配置——收到加密媒体时，解密操作将自动完成。

### 发送（出站媒体）

| 方法 | 发送内容 | 大小限制 |
|--------|--------------|------------|
| `send` | Markdown 文本消息 | 4000 字符 |
| `send_image` / `send_image_file` | 原生图片消息 | 10 MB |
| `send_document` | 文件附件 | 20 MB |
| `send_voice` | 语音消息（原生语音仅支持 AMR 格式） | 2 MB |
| `send_video` | 视频消息 | 10 MB |

**分块上传：** 文件通过三步协议（初始化 → 分块传输 → 完成）以 512 KB 为单位分块上传，适配器自动处理此过程。

**自动降级：** 当媒体超过原生类型的大小限制，但未超过 20 MB 绝对上限时，将自动作为通用文件附件发送：

- 图片 > 10 MB → 作为文件发送
- 视频 > 10 MB → 作为文件发送
- 语音 > 2 MB → 作为文件发送
- 非 AMR 音频 → 作为文件发送（企业微信原生语音仅支持 AMR 格式）

超过 20 MB 绝对上限的文件将被拒绝，并向聊天发送一条提示消息。

## 回复模式流式响应

当 Bot 通过企业微信回调收到消息时，适配器会记录入站请求 ID。若响应在请求上下文仍然有效期间发出，适配器将使用企业微信的回复模式（`aibot_respond_msg`）进行流式传输，将响应直接关联到对应的入站消息，在企业微信客户端中提供更自然的会话体验。

若入站请求上下文已过期或不可用，适配器将回退到通过 `aibot_send_msg` 主动发送消息。

回复模式同样适用于媒体：已上传的媒体可作为对原始消息的回复发送。

## 连接与重连

适配器与企业微信网关 `wss://openws.work.weixin.qq.com` 维持持久 WebSocket 连接。

### 连接生命周期

1. **建立连接：** 打开 WebSocket 连接，并发送包含 `bot_id` 和 `secret` 的 `aibot_subscribe` 认证帧。
2. **心跳：** 每 30 秒发送一次应用层 ping 帧，保持连接活跃。
3. **监听：** 持续读取入站帧并分发消息回调。

### 重连行为

连接断开后，适配器使用指数退避策略进行重连：

| 重试次序 | 延迟 |
|---------|-------|
| 第 1 次重试 | 2 秒 |
| 第 2 次重试 | 5 秒 |
| 第 3 次重试 | 10 秒 |
| 第 4 次重试 | 30 秒 |
| 第 5 次及以后 | 60 秒 |

每次重连成功后，退避计数器归零。断开连接时，所有待处理的请求 Future 均会被标记为失败，避免调用方无限期挂起。

### 消息去重

入站消息使用消息 ID 进行去重，去重时间窗口为 5 分钟，最大缓存 1000 条，防止在重连或网络抖动期间重复处理消息。

## 环境变量一览

| 变量 | 是否必填 | 默认值 | 说明 |
|----------|----------|---------|-------------|
| `WECOM_BOT_ID` | ✅ | — | 企业微信 AI Bot ID |
| `WECOM_SECRET` | ✅ | — | 企业微信 AI Bot Secret |
| `WECOM_ALLOWED_USERS` | — | _(空)_ | 网关级别白名单，逗号分隔的用户 ID |
| `WECOM_HOME_CHANNEL` | — | — | 定时任务/通知输出的聊天 ID |
| `WECOM_WEBSOCKET_URL` | — | `wss://openws.work.weixin.qq.com` | WebSocket 网关 URL |
| `WECOM_DM_POLICY` | — | `open` | 私聊访问策略 |
| `WECOM_GROUP_POLICY` | — | `open` | 群组访问策略 |

## 故障排查

| 问题 | 解决方案 |
|---------|-----|
| `WECOM_BOT_ID and WECOM_SECRET are required` | 设置两个环境变量，或通过配置向导完成配置 |
| `WeCom startup failed: aiohttp not installed` | 安装 aiohttp：`pip install aiohttp` |
| `WeCom startup failed: httpx not installed` | 安装 httpx：`pip install httpx` |
| `invalid secret (errcode=40013)` | 验证 secret 是否与 Bot 凭证一致 |
| `Timed out waiting for subscribe acknowledgement` | 检查到 `openws.work.weixin.qq.com` 的网络连通性 |
| Bot 在群组中不响应 | 检查 `group_policy` 设置，并确保群组 ID 已添加到 `group_allow_from` |
| Bot 忽略群组中的某些用户 | 检查 `groups` 配置节中各群组的 `allow_from` 列表 |
| 媒体解密失败 | 安装 `cryptography`：`pip install cryptography` |
| `cryptography is required for WeCom media decryption` | 入站媒体使用了 AES 加密，请安装：`pip install cryptography` |
| 语音消息以文件形式发送 | 企业微信原生语音仅支持 AMR 格式，其他格式将自动降级为文件 |
| `File too large` 错误 | 企业微信对所有文件上传有 20 MB 的绝对限制，请压缩或拆分文件 |
| 图片以文件形式发送 | 图片 > 10 MB 超过原生图片大小限制，将自动降级为文件附件 |
| `Timeout sending message to WeCom` | WebSocket 可能已断开，请检查日志中的重连信息 |
| `WeCom websocket closed during authentication` | 网络问题或凭证不正确，请验证 bot_id 和 secret |
