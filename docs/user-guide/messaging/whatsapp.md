---
title: "WhatsApp 配置"
---
# WhatsApp 配置

Hermes 通过基于 **Baileys** 的内置桥接器连接 WhatsApp。其工作原理是模拟 WhatsApp Web 会话，**而非**通过官方 WhatsApp Business API。无需 Meta 开发者账号或商业认证。

:::caution
非官方 API — 封号风险
WhatsApp **不**官方支持 Business API 以外的第三方机器人。使用第三方桥接器存在一定账号封禁风险。降低风险的建议：
- **使用专用手机号码**作为机器人（而非个人号码）
- **不要发送批量/垃圾消息** — 保持对话式使用
- **不要主动向未主动联系过的用户发送自动消息**
:::

:::caution
WhatsApp Web 协议更新
WhatsApp 会定期更新其 Web 协议，这可能导致与第三方桥接器暂时失去兼容性。发生这种情况时，Hermes 将更新桥接依赖项。如果机器人在 WhatsApp 更新后停止工作，请拉取最新版本的 Hermes 并重新配对。
:::

## 两种模式

| 模式 | 工作原理 | 适用场景 |
|------|---------|---------|
| **独立机器人号码**（推荐） | 为机器人专用一个手机号码，用户直接发消息到该号码。 | 界面简洁、多用户、封号风险低 |
| **个人自聊** | 使用您自己的 WhatsApp，给自己发消息来与智能体交互。 | 快速配置、单用户、测试场景 |

---

## 前提条件

- **Node.js v18+** 和 **npm** — WhatsApp 桥接器以 Node.js 进程运行
- **已安装 WhatsApp 的手机**（用于扫描二维码）

与早期基于浏览器的桥接器不同，当前基于 Baileys 的桥接器**不**需要本地 Chromium 或 Puppeteer 依赖栈。

---

## 步骤 1：运行配置向导

```bash
hermes whatsapp
```

向导将：

1. 询问您想使用哪种模式（**bot** 或 **self-chat**）
2. 如有需要，安装桥接依赖项
3. 在终端显示**二维码**
4. 等待您扫描

**扫描二维码：**

1. 在手机上打开 WhatsApp
2. 进入**设置 → 已关联设备**
3. 点击**关联设备**
4. 将摄像头对准终端中的二维码

配对成功后，向导会确认连接并自动退出。您的会话将自动保存。

:::tip
如果二维码显示乱码，请确保终端宽度至少为 60 列，且支持 Unicode。您也可以尝试其他终端模拟器。
:::

---

## 步骤 2：获取第二个手机号码（机器人模式）

在机器人模式下，您需要一个尚未在 WhatsApp 注册的手机号码。有三种方式：

| 方式 | 费用 | 备注 |
|------|------|------|
| **Google Voice** | 免费 | 仅限美国。在 [voice.google.com](https://voice.google.com) 获取号码。通过 Google Voice 应用以短信方式验证 WhatsApp。 |
| **预付费 SIM 卡** | 一次性 $5–15 | 任意运营商。激活后验证 WhatsApp，SIM 卡即可放置不用。号码需保持活跃（每 90 天拨打一次电话）。 |
| **VoIP 服务** | 免费–$5/月 | TextNow、TextFree 或类似服务。部分 VoIP 号码被 WhatsApp 屏蔽，若首次尝试不成功可多试几个。 |

获取号码后：

1. 在手机上安装 WhatsApp（或使用支持双 SIM 卡的 WhatsApp Business 应用）
2. 用新号码注册 WhatsApp
3. 运行 `hermes whatsapp` 并用该 WhatsApp 账号扫描二维码

---

## 步骤 3：配置 Hermes

在 `~/.hermes/.env` 文件中添加以下内容：

```bash
# 必填
WHATSAPP_ENABLED=true
WHATSAPP_MODE=bot                          # "bot" 或 "self-chat"

# 访问控制 — 选择以下选项之一：
WHATSAPP_ALLOWED_USERS=15551234567         # 逗号分隔的手机号码（含国家代码，不加 +）
# WHATSAPP_ALLOWED_USERS=*                 # 或使用 * 允许所有人
# WHATSAPP_ALLOW_ALL_USERS=true            # 或设置此标志（效果等同于 *）
```

:::tip
Allow-all 简写
设置 `WHATSAPP_ALLOWED_USERS=*` 将允许**所有**发送者（等同于 `WHATSAPP_ALLOW_ALL_USERS=true`）。
这与 [Signal 群组白名单](https://hermes-agent.nousresearch.com/docs/reference/environment-variables) 保持一致。
如需使用配对流程，请移除这两个变量，并依赖 [DM 配对系统](https://hermes-agent.nousresearch.com/docs/user-guide/security#dm-pairing-system)。
:::

`~/.hermes/config.yaml` 中的可选行为设置：

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `unauthorized_dm_behavior: pair` 是全局默认值。未知 DM 发送者将收到配对码。
- `whatsapp.unauthorized_dm_behavior: ignore` 使 WhatsApp 对未授权 DM 保持静默，对于私人号码通常是更好的选择。

然后启动网关：

```bash
hermes gateway              # 前台运行
hermes gateway install      # 安装为用户服务
sudo hermes gateway install --system   # 仅限 Linux：开机启动的系统服务
```

网关会自动使用已保存的会话启动 WhatsApp 桥接器。

---

## 会话持久化

Baileys 桥接器将会话保存在 `~/.hermes/platforms/whatsapp/session` 目录下。这意味着：

- **会话在重启后仍然有效** — 无需每次重新扫描二维码
- 会话数据包含加密密钥和设备凭据
- **请勿共享或提交此会话目录** — 它包含对 WhatsApp 账号的完整访问权限

---

## 重新配对

如果会话中断（手机重置、WhatsApp 更新、手动解除关联），网关日志中会出现连接错误。解决方法：

```bash
hermes whatsapp
```

该命令将生成新的二维码。重新扫描后会话即恢复。网关可自动处理**临时**断线（网络抖动、手机短暂离线），内置自动重连逻辑。

---

## 语音消息

Hermes 在 WhatsApp 上支持语音功能：

- **接收：** 语音消息（`.ogg` opus 格式）将使用配置的 STT 提供商自动转录：本地 `faster-whisper`、Groq Whisper（`GROQ_API_KEY`）或 OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）
- **发送：** TTS 响应以 MP3 音频文件附件形式发送
- 默认情况下，智能体响应以"⚕ **Hermes Agent**"为前缀。您可以在 `config.yaml` 中自定义或禁用：

```yaml
# ~/.hermes/config.yaml
whatsapp:
  reply_prefix: ""                          # 空字符串将禁用消息头
  # reply_prefix: "🤖 *My Bot*\n──────\n"  # 自定义前缀（支持 \n 换行）
```

---

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| **二维码无法扫描** | 确保终端宽度足够（60 列以上）。尝试其他终端。确保从正确的 WhatsApp 账号（机器人号码，非个人号码）扫描。 |
| **二维码过期** | 二维码每约 20 秒刷新一次。如果超时，请重启 `hermes whatsapp`。 |
| **会话无法持久化** | 检查 `~/.hermes/platforms/whatsapp/session` 是否存在且可写。若使用容器，将其挂载为持久卷。 |
| **意外登出** | WhatsApp 会在长时间不活跃后解除设备关联。保持手机开机并联网，必要时用 `hermes whatsapp` 重新配对。 |
| **桥接器崩溃或重连循环** | 重启网关，更新 Hermes；若会话因 WhatsApp 协议变更而失效，请重新配对。 |
| **WhatsApp 更新后机器人停止工作** | 更新 Hermes 以获取最新桥接版本，然后重新配对。 |
| **macOS："Node.js not installed" 但终端中 node 可以正常使用** | launchd 服务不继承您的 shell PATH。运行 `hermes gateway install` 将当前 PATH 重新快照到 plist 文件，然后执行 `hermes gateway start`。详情参见[网关服务文档](/user-guide/messaging/#macos-launchd)。 |
| **收不到消息** | 确认 `WHATSAPP_ALLOWED_USERS` 包含发送者号码（含国家代码，不加 `+` 或空格），或将其设为 `*` 以允许所有人。在 `.env` 中设置 `WHATSAPP_DEBUG=true` 并重启网关，在 `bridge.log` 中查看原始消息事件。 |
| **机器人向陌生人回复配对码** | 如需对未授权 DM 保持静默，在 `~/.hermes/config.yaml` 中设置 `whatsapp.unauthorized_dm_behavior: ignore`。 |

---

## 安全

:::caution
**在上线前配置访问控制。** 通过 `WHATSAPP_ALLOWED_USERS` 指定手机号码（含国家代码，不加 `+`），使用 `*` 允许所有人，或设置 `WHATSAPP_ALLOW_ALL_USERS=true`。若未配置任何这些选项，网关将作为安全措施**拒绝所有传入消息**。
:::

默认情况下，未授权的 DM 仍会收到配对码回复。如果您希望私人 WhatsApp 号码对陌生人完全保持静默，请设置：

```yaml
whatsapp:
  unauthorized_dm_behavior: ignore
```

- `~/.hermes/platforms/whatsapp/session` 目录包含完整的会话凭据 — 请像保护密码一样保护它
- 设置文件权限：`chmod 700 ~/.hermes/platforms/whatsapp/session`
- 使用**专用手机号码**作为机器人，将风险与个人账号隔离
- 如果怀疑账号遭到入侵，在 WhatsApp → 设置 → 已关联设备 中解除设备关联
- 日志中的手机号码已部分脱敏，但请审查您的日志保留策略
