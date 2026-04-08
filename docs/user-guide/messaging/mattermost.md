---
title: "Mattermost 配置"
---
# Mattermost 配置

Hermes Agent 以机器人的形式接入 Mattermost，让你可以通过私信（DM）或团队频道与 AI 助手对话。Mattermost 是一款自托管的开源 Slack 替代品——部署在自己的基础设施上，数据完全自主可控。机器人通过 Mattermost REST API（v4）和 WebSocket 连接服务器，经由 Hermes Agent 流水线（包含工具调用、记忆和推理）处理消息，并实时响应。支持文本、文件附件、图片和斜线命令。

无需额外安装 Mattermost 客户端库——适配器使用 `aiohttp`，这是 Hermes Agent 已有的依赖项。

开始配置前，先了解 Hermes Agent 接入 Mattermost 后的行为逻辑。

## Hermes Agent 的行为

| 场景 | 行为 |
|------|------|
| **私信（DM）** | Hermes Agent 响应所有消息，无需 `@提及`。每个私信对话有独立的会话。 |
| **公开/私有频道** | 只有被 `@提及` 时才会响应，否则忽略消息。 |
| **话题（Thread）** | 若设置 `MATTERMOST_REPLY_MODE=thread`，Hermes Agent 以话题方式在原消息下回复，话题上下文与所属频道隔离。 |
| **多用户共享频道** | 默认按用户隔离会话历史。除非主动关闭该设置，同一频道中的不同用户不会共享对话记录。 |

:::tip
如需 Hermes Agent 以话题方式回复（嵌套在原消息下），请设置 `MATTERMOST_REPLY_MODE=thread`。默认值为 `off`，即在频道中发送普通消息。
:::

### Mattermost 中的会话模型

默认情况下：

- 每个私信对话有独立的会话
- 每个话题有独立的会话命名空间
- 共享频道中每位用户有各自的会话

此行为由 `config.yaml` 控制：

```yaml
group_sessions_per_user: true
```

仅当你明确希望频道内所有成员共享同一个对话时，才将其设为 `false`：

```yaml
group_sessions_per_user: false
```

共享会话对协作频道可能有用，但也带来一些副作用：

- 所有用户共享上下文增长和 token 消耗
- 某个用户的耗时工具任务会撑大其他所有人的上下文
- 某个用户的任务执行过程中，可能干扰同一频道中其他人接下来的请求

本指南将带你完成完整的配置流程——从在 Mattermost 上创建机器人账户，到发送第一条消息。

## 步骤 1：启用机器人账户

创建机器人账户前，需先在 Mattermost 服务器上启用该功能。

1. 以**系统管理员**身份登录 Mattermost。
2. 进入**系统控制台** → **集成** → **机器人账户**。
3. 将**启用机器人账户创建**设为 **true**。
4. 点击**保存**。

:::info
如无系统管理员权限，请联系 Mattermost 管理员为你启用机器人账户功能并创建账户。
:::

## 步骤 2：创建机器人账户

1. 在 Mattermost 中，点击左上角 **☰** 菜单 → **集成** → **机器人账户**。
2. 点击**添加机器人账户**。
3. 填写相关信息：
   - **用户名**：例如 `hermes`
   - **显示名称**：例如 `Hermes Agent`
   - **描述**：可选
   - **角色**：`Member` 即可
4. 点击**创建机器人账户**。
5. Mattermost 将显示**机器人 token**，**立即复制**。

:::caution
token 仅显示一次
机器人 token 仅在创建账户时显示一次，丢失后需在机器人账户设置中重新生成。请勿公开分享 token，也不要提交到 Git 仓库——持有该 token 的人可完全控制机器人。
:::

请将 token 保存到安全位置（如密码管理器），步骤 5 中会用到。

:::tip
也可以使用**个人访问 token** 替代机器人账户。进入**个人资料** → **安全** → **个人访问 Token** → **创建 Token**。如果希望 Hermes Agent 以你自己的用户身份发消息而非独立的机器人用户，这种方式很实用。
:::

## 步骤 3：将机器人添加到频道

机器人需要加入目标频道才能在其中响应消息：

1. 打开目标频道。
2. 点击频道名称 → **添加成员**。
3. 搜索机器人用户名（例如 `hermes`）并添加。

私信则无需手动添加——直接向机器人发送私信即可立即开始对话。

## 步骤 4：查找 Mattermost 用户 ID

Hermes Agent 通过 Mattermost 用户 ID 控制谁可以与机器人交互。查找方法如下：

1. 点击左上角**头像** → **个人资料**。
2. 用户 ID 显示在个人资料对话框中，点击即可复制。

用户 ID 是一个 26 位字母数字字符串，例如 `3uo8dkh1p7g1mfk49ear5fzs5c`。

:::caution
用户 ID **不是**用户名。用户名是 `@` 后面的部分（例如 `@alice`），用户 ID 是 Mattermost 内部使用的长字符串标识符。
:::

**另一种方式**：也可以通过 API 获取：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-mattermost-server/api/v4/users/me | jq .id
```

:::tip
获取**频道 ID**：点击频道名称 → **查看信息**，频道 ID 显示在信息面板中。手动设置主频道时需要用到。
:::

## 步骤 5：配置 Hermes Agent

### 方式 A：交互式配置（推荐）

运行交互式配置命令：

```bash
hermes gateway setup
```

按提示选择 **Mattermost**，依次粘贴服务器 URL、机器人 token 和用户 ID。

### 方式 B：手动配置

在 `~/.hermes/.env` 文件中添加以下内容：

```bash
# 必填
MATTERMOST_URL=https://mm.example.com
MATTERMOST_TOKEN=***
MATTERMOST_ALLOWED_USERS=3uo8dkh1p7g1mfk49ear5fzs5c

# 允许多个用户（逗号分隔）
# MATTERMOST_ALLOWED_USERS=3uo8dkh1p7g1mfk49ear5fzs5c,8fk2jd9s0a7bncm1xqw4tp6r3e

# 可选：回复模式（thread 或 off，默认：off）
# MATTERMOST_REPLY_MODE=thread

# 可选：无需 @提及 即可响应（默认：true = 需要 @提及）
# MATTERMOST_REQUIRE_MENTION=false

# 可选：无需 @提及 即可响应的频道（逗号分隔的频道 ID）
# MATTERMOST_FREE_RESPONSE_CHANNELS=channel_id_1,channel_id_2
```

`~/.hermes/config.yaml` 中的可选行为配置：

```yaml
group_sessions_per_user: true
```

- `group_sessions_per_user: true`：在共享频道和话题中为每位用户保持独立的上下文隔离

### 启动网关

配置完成后，启动 Mattermost 网关：

```bash
hermes gateway
```

几秒内机器人将连接到 Mattermost 服务器。通过私信或在已添加机器人的频道中发送消息进行测试。

:::tip
可在后台运行 `hermes gateway`，或配置为 systemd 服务以持续运行。详情参见部署文档。
:::

## 主频道

可以指定一个"主频道"，让机器人在其中主动发送消息（如定时任务输出、提醒和通知）。配置方式有两种：

### 使用斜线命令

在机器人所在的任意频道中输入 `/sethome`，该频道即成为主频道。

### 手动配置

在 `~/.hermes/.env` 中添加：

```bash
MATTERMOST_HOME_CHANNEL=abc123def456ghi789jkl012mn
```

将 ID 替换为实际的频道 ID（点击频道名称 → 查看信息 → 复制 ID）。

## 回复模式

`MATTERMOST_REPLY_MODE` 控制 Hermes Agent 的响应发送方式：

| 模式 | 行为 |
|------|------|
| `off`（默认） | 在频道中发送普通消息，与普通用户无异。 |
| `thread` | 以话题方式在原消息下回复，多轮对话时有助于保持频道整洁。 |

在 `~/.hermes/.env` 中设置：

```bash
MATTERMOST_REPLY_MODE=thread
```

## @提及行为

默认情况下，机器人在频道中只有被 `@提及` 才会响应。可按如下方式修改：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MATTERMOST_REQUIRE_MENTION` | `true` | 设为 `false` 后，机器人响应频道中的所有消息（私信始终有效）。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | _（无）_ | 逗号分隔的频道 ID，在这些频道中无需 `@提及` 即可响应，即使 `MATTERMOST_REQUIRE_MENTION` 为 `true`。 |

在 Mattermost 中查找频道 ID：打开频道，点击频道名称标题，在 URL 或频道详情中查看 ID。

机器人被 `@提及` 时，消息中的 `@提及` 标记会在处理前自动剥除。

## 故障排查

### 机器人不响应消息

**原因**：机器人未加入频道，或 `MATTERMOST_ALLOWED_USERS` 中不包含你的用户 ID。

**解决方案**：将机器人添加到频道（频道名称 → 添加成员 → 搜索机器人）。确认用户 ID 已写入 `MATTERMOST_ALLOWED_USERS`。重启网关。

### 403 Forbidden 错误

**原因**：机器人 token 无效，或机器人无权在频道中发消息。

**解决方案**：检查 `.env` 文件中的 `MATTERMOST_TOKEN` 是否正确。确认机器人账户未被停用，且已加入目标频道。如使用个人访问 token，请确保账户拥有所需权限。

### WebSocket 断开连接 / 重连循环

**原因**：网络不稳定、Mattermost 服务器重启，或防火墙/代理对 WebSocket 连接的限制。

**解决方案**：适配器会以指数退避方式（2s → 60s）自动重连。检查服务器的 WebSocket 配置——反向代理（nginx、Apache）需要配置 WebSocket 升级请求头，并确认防火墙未阻断 WebSocket 连接。

对于 nginx，确保配置中包含：

```nginx
location /api/v4/websocket {
    proxy_pass http://mattermost-backend;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 600s;
}
```

### 启动时提示 "Failed to authenticate"

**原因**：token 或服务器 URL 不正确。

**解决方案**：确认 `MATTERMOST_URL` 指向你的 Mattermost 服务器（包含 `https://`，末尾无斜杠）。用 curl 验证 token 是否有效：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-server/api/v4/users/me
```

返回用户信息则 token 有效，返回错误则需重新生成 token。

### 机器人离线

**原因**：Hermes Agent 网关未运行，或连接失败。

**解决方案**：确认 `hermes gateway` 正在运行，查看终端输出中的错误信息。常见原因：URL 错误、token 过期、Mattermost 服务器不可达。

### "User not allowed" / 机器人忽略你

**原因**：你的用户 ID 不在 `MATTERMOST_ALLOWED_USERS` 中。

**解决方案**：将用户 ID 添加到 `~/.hermes/.env` 的 `MATTERMOST_ALLOWED_USERS` 中并重启网关。注意：用户 ID 是 26 位字母数字字符串，不是 `@用户名`。

## 安全

:::caution
务必设置 `MATTERMOST_ALLOWED_USERS` 以限制可与机器人交互的用户。若未设置，网关默认拒绝所有用户，这是出于安全考虑的保护机制。只添加可信用户的用户 ID——被授权的用户可完全访问智能体的所有功能，包括工具调用和系统访问。
:::

有关 Hermes Agent 部署安全的更多信息，参见[安全指南](/user-guide/security)。

## 备注

- **友好的自托管支持**：兼容任何自托管的 Mattermost 实例，无需 Mattermost Cloud 账号或订阅。
- **无额外依赖**：适配器使用 `aiohttp` 处理 HTTP 和 WebSocket，该库已包含在 Hermes Agent 中。
- **兼容团队版**：同时支持 Mattermost 团队版（免费）和企业版。
