---
title: "视觉与图像粘贴"
---
# 视觉与图像粘贴

Hermes Agent 支持**多模态视觉**——你可以直接将剪贴板中的图像粘贴到 CLI 中，让智能体对其进行分析、描述或处理。图像以 base64 编码的内容块形式发送给模型，因此所有支持视觉的模型均可处理。

## 工作原理

1. 将图像复制到剪贴板（截图、浏览器图像等）
2. 使用以下任一方式附加图像
3. 输入你的问题并按 Enter
4. 图像会以 `[📎 Image #1]` 标记显示在输入框上方
5. 提交后，图像以视觉内容块的形式发送给模型

你可以在发送前附加多张图像——每张都会有自己的标记。按 `Ctrl+C` 可清除所有已附加的图像。

图像保存在 `~/.hermes/images/` 目录下，文件名为带时间戳的 PNG 文件。

## 粘贴方式

附加图像的方式取决于你的终端环境。并非所有方式都在所有环境下有效——完整说明如下：

### `/paste` 命令

**最可靠的方式，在所有环境下均可用。**

```
/paste
```

输入 `/paste` 并按 Enter，Hermes 会检查剪贴板中是否有图像并附加。这在所有环境下均有效，因为它会直接调用剪贴板后端，无需担心终端快捷键拦截问题。

### Ctrl+V / Cmd+V（括号粘贴）

当剪贴板中同时存在文本和图像时，粘贴文本后 Hermes 会自动检测是否存在图像。以下情况下有效：
- 剪贴板同时包含**文本和图像**（某些应用在复制时会同时写入两种格式）
- 你的终端支持括号粘贴（bracketed paste）（大多数现代终端均支持）

:::caution
如果剪贴板中**只有图像**（无文本），Ctrl+V 在大多数终端下不会有任何响应。终端只能粘贴文本——没有标准机制可以粘贴二进制图像数据。请改用 `/paste` 或 Alt+V。
:::

### Alt+V

Alt 键组合在大多数终端模拟器中可以透传（作为 ESC + 按键序列发送给应用，而不会被终端模拟器拦截）。按 `Alt+V` 可检查剪贴板中的图像。

:::caution
**在 VSCode 集成终端中不可用。** VSCode 会拦截许多 Alt+键组合用于自身 UI 操作。请改用 `/paste`。
:::

### Ctrl+V（原始模式——仅限 Linux）

在 Linux 桌面终端（GNOME Terminal、Konsole、Alacritty 等）上，`Ctrl+V` **不是**粘贴快捷键——`Ctrl+Shift+V` 才是。因此 `Ctrl+V` 会向应用发送一个原始字节，Hermes 捕获该字节后检查剪贴板。此方式仅在具有 X11 或 Wayland 剪贴板访问权限的 Linux 桌面终端上有效。

## 平台兼容性

| 环境 | `/paste` | Ctrl+V（文本+图像） | Alt+V | 备注 |
|---|:---:|:---:|:---:|---|
| **macOS Terminal / iTerm2** | ✅ | ✅ | ✅ | 最佳体验——`osascript` 始终可用 |
| **Linux X11 桌面** | ✅ | ✅ | ✅ | 需要 `xclip`（`apt install xclip`） |
| **Linux Wayland 桌面** | ✅ | ✅ | ✅ | 需要 `wl-paste`（`apt install wl-clipboard`） |
| **WSL2（Windows Terminal）** | ✅ | ✅¹ | ✅ | 使用 `powershell.exe`——无需额外安装 |
| **VSCode 终端（本地）** | ✅ | ✅¹ | ❌ | VSCode 拦截 Alt+键 |
| **VSCode 终端（SSH）** | ❌² | ❌² | ❌ | 无法访问远程剪贴板 |
| **SSH 终端（任意）** | ❌² | ❌² | ❌² | 无法访问远程剪贴板 |

¹ 仅在剪贴板同时包含文本和图像时有效（纯图像剪贴板无响应）
² 参见下方 [SSH 与远程会话](#ssh--remote-sessions)

## 各平台安装配置

### macOS

**无需配置。** Hermes 使用 macOS 内置的 `osascript` 读取剪贴板。如需更快的速度，可选择安装 `pngpaste`：

```bash
brew install pngpaste
```

### Linux（X11）

安装 `xclip`：

```bash
# Ubuntu/Debian
sudo apt install xclip

# Fedora
sudo dnf install xclip

# Arch
sudo pacman -S xclip
```

### Linux（Wayland）

Ubuntu 22.04+、Fedora 34+ 等现代 Linux 桌面系统默认使用 Wayland。安装 `wl-clipboard`：

```bash
# Ubuntu/Debian
sudo apt install wl-clipboard

# Fedora
sudo dnf install wl-clipboard

# Arch
sudo pacman -S wl-clipboard
```

:::tip
如何检查你是否在使用 Wayland
```bash
echo $XDG_SESSION_TYPE
# "wayland" = Wayland，"x11" = X11，"tty" = 无显示服务器
```
:::

### WSL2

**无需额外配置。** Hermes 会自动识别 WSL2（通过 `/proc/version`），并使用 `powershell.exe` 通过 .NET 的 `System.Windows.Forms.Clipboard` 访问 Windows 剪贴板。这是 WSL2 Windows 互操作的内置功能——`powershell.exe` 默认可用。

剪贴板数据以 base64 编码的 PNG 通过 stdout 传输，无需文件路径转换或临时文件。

:::info
WSLg 说明
如果你使用的是 WSLg（带 GUI 支持的 WSL2），Hermes 会优先尝试 PowerShell 路径，失败后回退到 `wl-paste`。WSLg 的剪贴板桥接仅支持 BMP 格式的图像——Hermes 会使用 Pillow（如已安装）或 ImageMagick 的 `convert` 命令自动将 BMP 转换为 PNG。
:::

#### 验证 WSL2 剪贴板访问

```bash
# 1. 检查 WSL 检测
grep -i microsoft /proc/version

# 2. 检查 PowerShell 是否可访问
which powershell.exe

# 3. 复制一张图像，然后检查
powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::ContainsImage()"
# 应输出 "True"
```

## SSH 与远程会话

**SSH 连接下无法使用剪贴板粘贴。** 通过 SSH 连接到远程主机时，Hermes CLI 运行在远程主机上。所有剪贴板工具（`xclip`、`wl-paste`、`powershell.exe`、`osascript`）读取的是运行它们的机器的剪贴板——即远程服务器，而不是你的本地机器。远程端无法访问本地剪贴板。

### SSH 变通方案

1. **上传图像文件**——将图像保存到本地，通过 `scp`、VSCode 文件浏览器（拖放）或其他文件传输方式上传到远程服务器，然后通过路径引用。*（计划在未来版本中提供 `/attach` 命令。）*

2. **使用 URL**——如果图像可以在线访问，直接在消息中粘贴 URL。智能体可以使用 `vision_analyze` 直接查看任何图像 URL。

3. **X11 转发**——使用 `ssh -X` 连接以转发 X11。这样远程机器上的 `xclip` 就可以访问你本地的 X11 剪贴板。需要在本地运行 X 服务器（macOS 上使用 XQuartz，Linux X11 桌面内置）。大图像传输速度较慢。

4. **使用消息平台**——通过 Telegram、Discord、Slack 或 WhatsApp 向 Hermes 发送图像。这些平台原生支持图像上传，不受剪贴板/终端限制的影响。

## 为什么终端无法粘贴图像

这是一个常见的困惑来源，以下是技术层面的解释：

终端是**基于文本**的界面。当你按下 Ctrl+V（或 Cmd+V）时，终端模拟器会：

1. 从剪贴板读取**文本内容**
2. 将其包装在[括号粘贴](https://en.wikipedia.org/wiki/Bracketed-paste)转义序列中
3. 通过终端的文本流将其发送给应用程序

如果剪贴板中只有图像（无文本），终端没有内容可发送。终端没有用于二进制图像数据的标准转义序列，因此不会有任何响应。

这就是为什么 Hermes 使用独立的剪贴板检查机制——它不依赖终端粘贴事件接收图像数据，而是通过子进程直接调用操作系统级别的工具（`osascript`、`powershell.exe`、`xclip`、`wl-paste`）来独立读取剪贴板。

## 支持的模型

图像粘贴功能适用于所有支持视觉的模型。图像以 base64 编码的 data URL 形式，按 OpenAI 视觉内容格式发送：

```json
{
  "type": "image_url",
  "image_url": {
    "url": "data:image/png;base64,..."
  }
}
```

大多数现代模型均支持此格式，包括 GPT-4 Vision、Claude（含视觉能力）、Gemini，以及通过 OpenRouter 提供服务的开源多模态模型。
