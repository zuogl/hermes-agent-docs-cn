---
title: "钉钉配置"
---
# 钉钉配置

Hermes Agent 支持以钉钉机器人的形式接入，可通过私聊或群聊与 AI 助手交互。机器人经由钉钉 Stream 模式建立连接——一种长连接 WebSocket，无需公网 URL 或 webhook 服务器——并通过钉钉的会话 webhook API 发送 Markdown 格式的回复。

配置之前，先了解大多数人最关心的内容：Hermes 接入钉钉后的实际行为。

## Hermes 的行为模式

| 场景 | 行为 |
|---------|----------|
| **私聊（1:1 聊天）** | Hermes 回复所有消息，无需 `@提及`。每个私聊拥有独立的会话。 |
| **群聊** | Hermes 仅在被 `@提及` 时回复，未提及的消息直接忽略。 |
| **多人共享群聊** | 默认按用户隔离会话历史。同一群聊中的两个用户不共享对话记录，除非你主动关闭该功能。 |

### 钉钉会话模型

默认行为：

- 每个私聊拥有独立会话
- 共享群聊中，每个用户拥有各自独立的会话

通过 `config.yaml` 控制：

```yaml
group_sessions_per_user: true
```

仅当你明确希望整个群共享同一对话时，才将其设为 `false`：

```yaml
group_sessions_per_user: false
```

本指南将带你完成完整的配置流程——从创建钉钉机器人到发送第一条消息。

## 前提条件

安装所需的 Python 包：

```bash
pip install dingtalk-stream httpx
```

- `dingtalk-stream` — 钉钉官方 Stream 模式 SDK（基于 WebSocket 的实时消息）
- `httpx` — 通过会话 webhook 发送回复的异步 HTTP 客户端

## 第一步：创建钉钉应用

1. 访问[钉钉开放平台](https://open-dev.dingtalk.com/)。
2. 使用钉钉管理员账户登录。
3. 点击**应用开发** → **自建应用** → **通过 H5 微应用创建**（或根据控制台版本选择**机器人**）。
4. 填写信息：
   - **应用名称**：例如 `Hermes Agent`
   - **描述**：可选
5. 创建完成后，进入**凭证与基础信息**页面，找到 **Client ID**（AppKey）和 **Client Secret**（AppSecret），复制两者。

:::caution
凭证仅显示一次
Client Secret 仅在创建应用时显示一次。如果丢失，需要重新生成。请勿将这些凭证公开或提交到 Git 仓库。
:::

## 第二步：启用机器人能力

1. 在应用设置页面，前往**添加能力** → **机器人**。
2. 启用机器人能力。
3. 在**消息接收模式**下，选择 **Stream 模式**（推荐——无需公网 URL）。

:::tip
Stream 模式是推荐的接入方式。它通过从本机发起的长连接 WebSocket 工作，无需公网 IP、域名或 webhook 端点，在 NAT、防火墙及本地开发环境下均可正常使用。
:::

## 第三步：获取钉钉用户 ID

Hermes Agent 通过钉钉用户 ID 控制谁可以与机器人交互。用户 ID 是由组织管理员配置的字母数字字符串。

获取方式：

1. 咨询钉钉组织管理员——用户 ID 在钉钉管理后台的**通讯录** → **成员管理**中可查。
2. 也可以直接看日志——机器人会记录每条消息的 `sender_id`。启动网关，给机器人发一条消息，在日志中找到你的 ID。

## 第四步：配置 Hermes Agent

### 方式 A：交互式配置（推荐）

运行引导配置命令：

```bash
hermes gateway setup
```

提示时选择**钉钉**，然后依次输入 Client ID、Client Secret 和允许的用户 ID。

### 方式 B：手动配置

在 `~/.hermes/.env` 中添加以下内容：

```bash
# 必填
DINGTALK_CLIENT_ID=your-app-key
DINGTALK_CLIENT_SECRET=your-app-secret

# 安全限制：指定可与机器人交互的用户
DINGTALK_ALLOWED_USERS=user-id-1

# 多个允许用户（逗号分隔）
# DINGTALK_ALLOWED_USERS=user-id-1,user-id-2
```

`~/.hermes/config.yaml` 中的可选行为配置：

```yaml
group_sessions_per_user: true
```

- `group_sessions_per_user: true` 在共享群聊中隔离每个参与者的上下文

### 启动网关

配置完成后，启动钉钉网关：

```bash
hermes gateway
```

机器人将在几秒内连接至钉钉 Stream 模式。发送一条消息（私聊或在已添加机器人的群聊中）进行测试。

:::tip
可以在后台运行 `hermes gateway`，或配置为 systemd 服务以持久化运行。详见部署文档。
:::

## 故障排查

### 机器人不回复消息

**原因**：机器人能力未启用，或 `DINGTALK_ALLOWED_USERS` 中不含你的用户 ID。

**解决方法**：确认应用设置中已启用机器人能力且选择了 Stream 模式。检查 `DINGTALK_ALLOWED_USERS` 中是否包含你的用户 ID。重启网关。

### "dingtalk-stream not installed" 错误

**原因**：未安装 `dingtalk-stream` Python 包。

**解决方法**：

```bash
pip install dingtalk-stream httpx
```

### "DINGTALK_CLIENT_ID and DINGTALK_CLIENT_SECRET required"

**原因**：环境变量或 `.env` 文件中未配置凭证。

**解决方法**：确认 `DINGTALK_CLIENT_ID` 和 `DINGTALK_CLIENT_SECRET` 已正确写入 `~/.hermes/.env`。Client ID 对应 AppKey，Client Secret 对应钉钉开放平台中的 AppSecret。

### Stream 断连 / 重连循环

**原因**：网络不稳定、钉钉平台维护或凭证问题。

**解决方法**：适配器会自动以指数退避策略重连（2s → 5s → 10s → 30s → 60s）。确认凭证有效且应用未被停用，并检查网络是否允许出站 WebSocket 连接。

### 机器人离线

**原因**：Hermes 网关未运行或连接失败。

**解决方法**：确认 `hermes gateway` 正在运行，查看终端输出的错误信息。常见原因：凭证错误、应用被停用、未安装 `dingtalk-stream` 或 `httpx`。

### "No session_webhook available"

**原因**：机器人尝试回复时无可用的会话 webhook URL。通常发生在 webhook 过期，或机器人在接收消息后、发送回复前被重启的情况下。

**解决方法**：重新给机器人发一条消息——每条收到的消息都会附带一个新的会话 webhook。这是钉钉的正常限制，机器人只能回复最近收到的消息。

## 安全

:::caution
请务必设置 `DINGTALK_ALLOWED_USERS` 来限制可与机器人交互的用户。若未设置，网关默认拒绝所有用户。只添加你信任的用户 ID——已授权用户可完整访问智能体的所有能力，包括工具使用和系统访问。
:::

更多关于保护 Hermes Agent 部署的信息，请参阅[安全指南](/user-guide/security)。

## 注意事项

- **Stream 模式**：无需公网 URL、域名或 webhook 服务器。连接由本机通过 WebSocket 发起，可在 NAT 和防火墙后正常工作。
- **Markdown 回复**：消息以钉钉 Markdown 格式发送，支持富文本显示。
- **消息去重**：适配器在 5 分钟窗口内对消息进行去重，防止同一条消息被处理两次。
- **自动重连**：Stream 连接断开后，适配器以指数退避策略自动重连。
- **消息长度限制**：每条消息最多 20,000 个字符，超出部分将被截断。
