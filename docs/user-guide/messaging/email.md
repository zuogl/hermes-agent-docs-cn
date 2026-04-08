---
title: "邮件设置"
---
# 邮件设置

Hermes Agent 支持通过标准 IMAP 和 SMTP 协议收发邮件。向智能体的邮件地址发送一封邮件后，它会在同一线程中直接回复——无需特殊客户端或 Bot API。支持 Gmail、Outlook、Yahoo、Fastmail，以及任何支持 IMAP/SMTP 的提供商。

:::info
无外部依赖
邮件适配器使用 Python 内置的 `imaplib`、`smtplib` 和 `email` 模块，无需安装额外的软件包或外部服务。
:::

---

## 前提条件

- **专用邮件账户**：为 Hermes Agent 创建一个专用账户（不要使用个人邮箱）
- **启用 IMAP**：在该邮件账户上开启 IMAP 功能
- **应用专用密码**：如果使用 Gmail 或其他启用了双重验证的提供商，需要创建应用专用密码

### Gmail 设置

1. 为 Google 账户启用双重验证（2FA）
2. 前往 [应用专用密码](https://myaccount.google.com/apppasswords)
3. 创建新的应用专用密码（选择"邮件"或"其他"）
4. 复制 16 位密码——登录时使用此密码，而非普通密码

### Outlook / Microsoft 365

1. 前往 [安全设置](https://account.microsoft.com/security)
2. 如未启用双重验证，请先开启
3. 在"其他安全选项"中创建应用专用密码
4. IMAP 主机：`outlook.office365.com`，SMTP 主机：`smtp.office365.com`

### 其他提供商

大多数邮件提供商都支持 IMAP/SMTP。请查阅提供商文档，了解以下信息：

- IMAP 主机和端口（通常为端口 993，使用 SSL）
- SMTP 主机和端口（通常为端口 587，使用 STARTTLS）
- 是否需要应用专用密码

---

## 第一步：配置 Hermes

最简便的方式：

```bash
hermes gateway setup
```

从平台菜单中选择 **邮件**。向导会提示你输入邮件地址、密码、IMAP/SMTP 主机以及允许的发件人。

### 手动配置

在 `~/.hermes/.env` 中添加以下内容：

```bash
# 必填
EMAIL_ADDRESS=hermes@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop    # 应用专用密码（非普通密码）
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_SMTP_HOST=smtp.gmail.com

# 安全设置（推荐）
EMAIL_ALLOWED_USERS=your@email.com,colleague@work.com

# 可选
EMAIL_IMAP_PORT=993                    # 默认：993（IMAP SSL）
EMAIL_SMTP_PORT=587                    # 默认：587（SMTP STARTTLS）
EMAIL_POLL_INTERVAL=15                 # 检查收件箱的间隔秒数（默认：15）
EMAIL_HOME_ADDRESS=your@email.com      # 定时任务的默认投递目标
```

---

## 第二步：启动网关

```bash
hermes gateway              # 在前台运行
hermes gateway install      # 安装为用户服务
sudo hermes gateway install --system   # 仅限 Linux：开机自启的系统服务
```

启动时，适配器会依次执行：

1. 测试 IMAP 和 SMTP 连接
2. 将收件箱中所有现有邮件标记为"已读"（仅处理新邮件）
3. 开始轮询新邮件

---

## 工作原理

### 接收邮件

适配器以可配置的时间间隔（默认 15 秒）轮询 IMAP 收件箱中的未读邮件。对于每封新邮件：

- **主题行**会作为上下文一并传入（例如 `[Subject: Deploy to production]`）
- **回复邮件**（主题以 `Re:` 开头）会跳过主题前缀——线程上下文已经建立
- **附件**会在本地缓存：
  - 图片（JPEG、PNG、GIF、WebP）→ 可供视觉工具使用
  - 文档（PDF、ZIP 等）→ 可供文件访问工具使用
- **纯 HTML 邮件**会剥离标签以提取纯文本
- **智能体自身发出的邮件**会被过滤，防止回复循环
- **自动化/无回复发件人**会被自动忽略——包括以 `noreply@`、`mailer-daemon@`、`bounce@`、`no-reply@` 开头的地址，以及带有 `Auto-Submitted`、`Precedence: bulk` 或 `List-Unsubscribe` 头部的邮件

### 发送回复

回复通过 SMTP 发送，并正确维护邮件线程：

- **In-Reply-To** 和 **References** 头部用于维持邮件线程
- **主题行**保留并加 `Re:` 前缀（不会出现重复的 `Re: Re:`）
- **Message-ID** 使用智能体的域名生成
- 回复以纯文本（UTF-8）发送

### 文件附件

智能体可以在回复中发送文件附件。在响应中包含 `MEDIA:/path/to/file`，该文件会被作为附件添加到发出的邮件中。

### 跳过附件

如需忽略所有传入附件（用于防范恶意软件或节省带宽），在 `config.yaml` 中添加：

```yaml
platforms:
  email:
    skip_attachments: true
```

启用后，在解析邮件内容之前，附件和内联部分会被直接跳过。邮件正文文本仍会正常处理。

---

## 访问控制

邮件访问控制遵循与所有其他 Hermes 平台相同的模式：

1. **设置了 `EMAIL_ALLOWED_USERS`** → 只处理来自这些地址的邮件
2. **未设置白名单** → 未知发件人会收到配对码
3. **`EMAIL_ALLOW_ALL_USERS=true`** → 接受任意发件人（谨慎使用）

:::caution
务必配置 `EMAIL_ALLOWED_USERS`。
若不配置，任何知道智能体邮件地址的人都可以向其发送命令。智能体默认拥有终端访问权限。
:::

---

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 启动时出现 **"IMAP connection failed"** | 检查 `EMAIL_IMAP_HOST` 和 `EMAIL_IMAP_PORT`。确认账户已启用 IMAP。Gmail 用户需在"设置 → 转发和 POP/IMAP"中开启。 |
| 启动时出现 **"SMTP connection failed"** | 检查 `EMAIL_SMTP_HOST` 和 `EMAIL_SMTP_PORT`。确认密码正确（Gmail 请使用应用专用密码）。 |
| **未收到邮件** | 检查 `EMAIL_ALLOWED_USERS` 是否包含发件人地址。检查垃圾邮件文件夹——部分提供商会将自动回复标记为垃圾邮件。 |
| **"Authentication failed"** | Gmail 必须使用应用专用密码，而非普通密码。请先确保已启用双重验证。 |
| **重复回复** | 确保只有一个网关实例在运行。可通过 `hermes gateway status` 检查。 |
| **响应缓慢** | 默认轮询间隔为 15 秒。将 `EMAIL_POLL_INTERVAL` 设为 `5` 可加快响应（但会增加 IMAP 连接数）。 |
| **回复未进入线程** | 适配器使用 In-Reply-To 头部维持线程。部分邮件客户端（尤其是网页端）可能无法正确对自动回复进行线程化。 |

---

## 安全注意事项

:::caution
使用专用邮件账户。
不要使用个人邮箱——智能体会将密码存储在 `.env` 中，并经由 IMAP 获得完整的收件箱访问权限。
:::

- 使用**应用专用密码**代替主密码（Gmail 开启双重验证后必须使用）
- 设置 `EMAIL_ALLOWED_USERS` 以限制可与智能体交互的人员
- 密码存储在 `~/.hermes/.env` 中——请保护此文件（`chmod 600`）
- IMAP 默认使用 SSL（端口 993），SMTP 默认使用 STARTTLS（端口 587）——连接已加密

---

## 环境变量参考

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `EMAIL_ADDRESS` | 是 | — | 智能体的邮件地址 |
| `EMAIL_PASSWORD` | 是 | — | 邮件密码或应用专用密码 |
| `EMAIL_IMAP_HOST` | 是 | — | IMAP 服务器主机（如 `imap.gmail.com`） |
| `EMAIL_SMTP_HOST` | 是 | — | SMTP 服务器主机（如 `smtp.gmail.com`） |
| `EMAIL_IMAP_PORT` | 否 | `993` | IMAP 服务器端口 |
| `EMAIL_SMTP_PORT` | 否 | `587` | SMTP 服务器端口 |
| `EMAIL_POLL_INTERVAL` | 否 | `15` | 检查收件箱的间隔秒数 |
| `EMAIL_ALLOWED_USERS` | 否 | — | 逗号分隔的允许发件人地址列表 |
| `EMAIL_HOME_ADDRESS` | 否 | — | 定时任务的默认投递目标 |
| `EMAIL_ALLOW_ALL_USERS` | 否 | `false` | 允许所有发件人（不推荐） |
