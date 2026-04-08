---
title: "浏览器自动化"
---
# 浏览器自动化

Hermes Agent 内置完整的浏览器自动化工具集，支持多种后端选项：

- **Browserbase 云端模式**：通过 [Browserbase](https://browserbase.com) 使用托管云端浏览器和反机器人工具
- **Browser Use 云端模式**：通过 [Browser Use](https://browser-use.com) 作为备选云端浏览器提供商
- **Firecrawl 云端模式**：通过 [Firecrawl](https://firecrawl.dev) 使用内置网页抓取功能的云端浏览器
- **Camofox 本地模式**：通过 [Camofox](https://github.com/jo-inc/camofox-browser) 实现本地反检测浏览（基于 Firefox 的指纹伪造）
- **通过 CDP 连接本地 Chrome**：使用 `/browser connect` 将浏览器工具连接到自己的 Chrome 实例
- **本地浏览器模式**：通过 `agent-browser` CLI 和本地 Chromium 安装使用

在所有模式下，Hermes Agent 均可浏览网站、与页面元素交互、填写表单以及提取信息。

## 概述

页面以**无障碍树**（accessibility tree，基于文本的快照）形式呈现，非常适合 LLM 智能体使用。可交互元素会获得引用 ID（如 `@e1`、`@e2`），Hermes Agent 通过这些 ID 执行点击和输入操作。

核心能力：

- **多提供商云端执行**：支持 Browserbase、Browser Use 或 Firecrawl，无需本地浏览器
- **本地 Chrome 集成**：通过 CDP 连接正在运行的 Chrome，实现实时操控
- **内置隐身功能**：随机指纹、验证码破解、住宅代理（Browserbase）
- **会话隔离**：每个任务独享独立的浏览器会话
- **自动清理**：超时后自动关闭非活跃会话
- **视觉分析**：截图 + AI 分析，实现视觉内容理解

## 配置

### Browserbase 云端模式

要使用 Browserbase 托管的云端浏览器，请添加：

```bash
# 添加到 ~/.hermes/.env
BROWSERBASE_API_KEY=***
BROWSERBASE_PROJECT_ID=your-project-id-here
```

请在 [browserbase.com](https://browserbase.com) 获取凭据。

### Browser Use 云端模式

要将 Browser Use 作为云端浏览器提供商，请添加：

```bash
# 添加到 ~/.hermes/.env
BROWSER_USE_API_KEY=***
```

请在 [browser-use.com](https://browser-use.com) 获取 API 密钥。Browser Use 通过其 REST API 提供云端浏览器。若同时设置了 Browserbase 和 Browser Use 的凭据，Browserbase 优先生效。

### Firecrawl 云端模式

要将 Firecrawl 作为云端浏览器提供商，请添加：

```bash
# 添加到 ~/.hermes/.env
FIRECRAWL_API_KEY=fc-***
```

请在 [firecrawl.dev](https://firecrawl.dev) 获取 API 密钥，然后选择 Firecrawl 作为浏览器提供商：

```bash
hermes setup tools
# → Browser Automation → Firecrawl
```

可选配置：

```bash
# 自托管 Firecrawl 实例（默认：https://api.firecrawl.dev）
FIRECRAWL_API_URL=http://localhost:3002

# 会话 TTL，单位秒（默认：300）
FIRECRAWL_BROWSER_TTL=600
```

### Camofox 本地模式

[Camofox](https://github.com/jo-inc/camofox-browser) 是一个自托管的 Node.js 服务器，封装了 Camoufox（一个带有 C++ 指纹伪造功能的 Firefox 分支）。它无需云端依赖，即可实现本地反检测浏览。

```bash
# 安装并运行
git clone https://github.com/jo-inc/camofox-browser && cd camofox-browser
npm install && npm start   # 首次运行时下载 Camoufox（约 300MB）

# 或通过 Docker 运行
docker run -d --network host -e CAMOFOX_PORT=9377 jo-inc/camofox-browser
```

然后在 `~/.hermes/.env` 中设置：

```bash
CAMOFOX_URL=http://localhost:9377
```

或通过 `hermes tools` → Browser Automation → Camofox 进行配置。

设置 `CAMOFOX_URL` 后，所有浏览器工具将自动通过 Camofox 路由，而非使用 Browserbase 或 agent-browser。

#### 持久化浏览器会话

默认情况下，每个 Camofox 会话都会获得一个随机身份——Cookie 和登录状态在 Hermes Agent 重启后不会保留。要启用持久化浏览器会话：

```yaml
# 在 ~/.hermes/config.yaml 中
browser:
  camofox:
    managed_persistence: true
```

启用后，Hermes 会向 Camofox 发送一个稳定的、与配置文件绑定的身份标识。Camofox 服务器将此身份映射到持久化的浏览器配置文件目录，使 Cookie、登录状态和 localStorage 在重启后依然保留。不同的 Hermes 配置文件对应不同的浏览器配置文件（配置文件隔离）。

:::note
Camofox 服务器端还需配置 `CAMOFOX_PROFILE_DIR` 才能使持久化功能生效。
:::

#### VNC 实时查看

当 Camofox 以有头模式（显示浏览器窗口）运行时，它会在健康检查响应中暴露 VNC 端口。Hermes 会自动发现此端口，并在导航响应中附带 VNC URL，方便 Hermes Agent 分享链接，让你实时观看浏览器操作。

### 通过 CDP 连接本地 Chrome（`/browser connect`）

你可以不使用云端提供商，而是通过 Chrome DevTools Protocol（CDP）将 Hermes 浏览器工具连接到自己正在运行的 Chrome 实例。这在以下场景中非常有用：需要实时查看 Hermes Agent 的操作、与需要自己 Cookie/会话的页面交互，或者希望避免云端浏览器费用。

在 CLI 中使用：

```
/browser connect              # 连接到 ws://localhost:9222 的 Chrome
/browser connect ws://host:port  # 连接到指定 CDP 端点
/browser status               # 检查当前连接状态
/browser disconnect            # 断开连接，返回云端/本地模式
```

如果 Chrome 尚未以远程调试模式运行，Hermes 会尝试以 `--remote-debugging-port=9222` 参数自动启动 Chrome。

:::tip
手动启动支持 CDP 的 Chrome：
```bash
# Linux
google-chrome --remote-debugging-port=9222

# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222
```
:::

通过 CDP 连接后，所有浏览器工具（`browser_navigate`、`browser_click` 等）将在你的实际 Chrome 实例上运行，而非创建云端会话。

### 本地浏览器模式

如果你**没有**设置任何云端凭据，也不使用 `/browser connect`，Hermes 仍可通过由 `agent-browser` 驱动的本地 Chromium 安装使用浏览器工具。

### 可选环境变量

```bash
# 住宅代理，提升验证码破解效果（默认："true"）
BROWSERBASE_PROXIES=true

# 高级隐身模式，使用自定义 Chromium——需要 Scale 计划（默认："false"）
BROWSERBASE_ADVANCED_STEALTH=false

# 断线后重连会话——需要付费计划（默认："true"）
BROWSERBASE_KEEP_ALIVE=true

# 自定义会话超时，单位毫秒（默认：项目默认值）
# 示例：600000（10 分钟）、1800000（30 分钟）
BROWSERBASE_SESSION_TIMEOUT=600000

# 不活跃超时后自动清理，单位秒（默认：120）
BROWSER_INACTIVITY_TIMEOUT=120
```

### 安装 agent-browser CLI

```bash
npm install -g agent-browser
# 或在项目本地安装：
npm install
```

:::info
必须在配置的 `toolsets` 列表中包含 `browser` 工具集，或通过 `hermes config set toolsets '["hermes-cli", "browser"]'` 启用。
:::

## 可用工具

### `browser_navigate`

导航到指定 URL。必须在使用任何其他浏览器工具之前调用此工具，它会初始化 Browserbase 会话。

```
Navigate to https://github.com/NousResearch
```

:::tip
如果只是获取简单信息，优先使用 `web_search` 或 `web_extract`——它们更快、成本更低。仅在需要与页面**交互**时（点击按钮、填写表单、处理动态内容）才使用浏览器工具。
:::

### `browser_snapshot`

获取当前页面无障碍树的文本快照。返回带有引用 ID（如 `@e1`、`@e2`）的可交互元素，可用于 `browser_click` 和 `browser_type`。

- **`full=false`**（默认）：仅显示可交互元素的紧凑视图
- **`full=true`**：显示完整页面内容

超过 8000 个字符的快照会由 LLM 自动摘要。

### `browser_click`

根据快照中的引用 ID 点击元素。

```
Click @e5 to press the "Sign In" button
```

### `browser_type`

在输入框中输入文本。先清空输入框，再输入新文本。

```
Type "hermes agent" into the search field @e3
```

### `browser_scroll`

向上或向下滚动页面以显示更多内容。

```
Scroll down to see more results
```

### `browser_press`

按下键盘按键，适用于提交表单或页面导航。

```
Press Enter to submit the form
```

支持的按键：`Enter`、`Tab`、`Escape`、`ArrowDown`、`ArrowUp` 等。

### `browser_back`

在浏览器历史记录中返回上一页。

### `browser_get_images`

列出当前页面上的所有图片及其 URL 和 alt 文字，适用于查找待分析的图片。

### `browser_vision`

截图并使用视觉 AI 进行分析。当文本快照无法捕获重要视觉信息时使用——尤其适用于验证码、复杂布局或视觉验证挑战。

截图会被持久化保存，并将文件路径连同 AI 分析结果一并返回。在消息平台（Telegram、Discord、Slack、WhatsApp）上，你可以让 Hermes Agent 分享截图——它将通过 `MEDIA:` 机制以原生图片附件的形式发送。

```
What does the chart on this page show?
```

截图保存在 `~/.hermes/cache/screenshots/`，24 小时后自动清理。

### `browser_console`

获取当前页面的浏览器控制台输出（log/warn/error 消息）及未捕获的 JavaScript 异常。对于检测无障碍树中不可见的静默 JS 错误，此工具必不可少。

```
Check the browser console for any JavaScript errors
```

使用 `clear=True` 可在读取后清空控制台，这样后续调用只显示新消息。

## 实践示例

### 填写网页表单

```
User: Sign up for an account on example.com with my email john@example.com

Agent workflow:
1. browser_navigate("https://example.com/signup")
2. browser_snapshot()  → sees form fields with refs
3. browser_type(ref="@e3", text="john@example.com")
4. browser_type(ref="@e5", text="SecurePass123")
5. browser_click(ref="@e8")  → clicks "Create Account"
6. browser_snapshot()  → confirms success
```

### 研究动态内容

```
User: What are the top trending repos on GitHub right now?

Agent workflow:
1. browser_navigate("https://github.com/trending")
2. browser_snapshot(full=true)  → reads trending repo list
3. Returns formatted results
```

## 会话录制

自动将浏览器会话录制为 WebM 视频文件：

```yaml
browser:
  record_sessions: true  # 默认：false
```

启用后，录制在首次调用 `browser_navigate` 时自动开始，会话关闭时保存至 `~/.hermes/browser_recordings/`。本地模式和云端模式（Browserbase）均支持。超过 72 小时的录制文件会自动清理。

## 隐身功能

Browserbase 提供自动隐身能力：

| 功能 | 默认状态 | 说明 |
|------|----------|------|
| 基础隐身 | 始终开启 | 随机指纹、视口随机化、验证码破解 |
| 住宅代理 | 开启 | 通过住宅 IP 路由，提升访问成功率 |
| 高级隐身 | 关闭 | 自定义 Chromium 构建，需要 Scale 计划 |
| Keep Alive | 开启 | 网络抖动后自动重连会话 |

:::note
若你的计划不支持付费功能，Hermes 会自动降级——先禁用 `keepAlive`，再禁用代理——确保免费计划下浏览功能仍可正常使用。
:::

## 会话管理

- 每个任务通过 Browserbase 获得独立的浏览器会话
- 不活跃超时后（默认 2 分钟）自动清理会话
- 后台线程每 30 秒检查一次过期会话
- 进程退出时执行紧急清理，防止产生孤立会话
- 会话通过 Browserbase API 释放（`REQUEST_RELEASE` 状态）

## 限制

- **基于文本的交互**：依赖无障碍树，而非像素坐标
- **快照大小限制**：大型页面在 8000 字符处可能被截断或由 LLM 摘要
- **会话超时**：云端会话根据提供商的计划设置而过期
- **费用**：云端会话消耗提供商额度；对话结束或不活跃后会自动清理。使用 `/browser connect` 可免费使用本地浏览器
- **不支持文件下载**：无法从浏览器下载文件
