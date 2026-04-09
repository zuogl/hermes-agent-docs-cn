---
title: "贡献指南"
---
# 贡献指南

感谢你为 Hermes Agent 贡献代码！本指南涵盖开发环境搭建、代码库结构，以及如何让 PR 顺利合并。

## 贡献优先级

我们优先处理以下类型的贡献：

1. **Bug 修复** — 崩溃、行为错误、数据丢失
2. **跨平台兼容性** — macOS、不同 Linux 发行版、WSL2
3. **安全加固** — shell 注入、提示词注入、路径穿越
4. **性能与健壮性** — 重试逻辑、错误处理、优雅降级
5. **新技能** — 通用性强的技能（参见[创建技能](/developer-guide/creating-skills)）
6. **新工具** — 很少需要；大多数功能应以技能形式实现
7. **文档** — 修复、说明、新增示例

## 常见贡献路径

- 想开发新工具？从[添加工具](/developer-guide/adding-tools)开始
- 想开发新技能？从[创建技能](/developer-guide/creating-skills)开始
- 想接入新推理提供商？从[添加提供商](/developer-guide/adding-providers)开始

## 开发环境搭建

### 前提条件

| 要求 | 说明 |
|------|------|
| **Git** | 需支持 `--recurse-submodules` |
| **Python 3.11+** | uv 会在缺失时自动安装 |
| **uv** | 高速 Python 包管理器（[安装说明](https://docs.astral.sh/uv/)）|
| **Node.js 18+** | 可选——浏览器工具和 WhatsApp 桥接需要 |

### 克隆与安装

```bash
git clone --recurse-submodules https://github.com/NousResearch/hermes-agent.git
cd hermes-agent

# 使用 Python 3.11 创建虚拟环境
uv venv venv --python 3.11
export VIRTUAL_ENV="$(pwd)/venv"

# 安装所有扩展（消息、定时任务、CLI 菜单、开发工具）
uv pip install -e ".[all,dev]"
uv pip install -e "./tinker-atropos"

# 可选：浏览器工具
npm install
```

### 配置开发环境

```bash
mkdir -p ~/.hermes/{cron,sessions,logs,memories,skills}
cp cli-config.yaml.example ~/.hermes/config.yaml
touch ~/.hermes/.env

# 至少需要配置一个 LLM 提供商密钥：
echo 'OPENROUTER_API_KEY=sk-or-v1-your-key' >> ~/.hermes/.env
```

### 运行

```bash
# 创建符号链接以全局访问
mkdir -p ~/.local/bin
ln -sf "$(pwd)/venv/bin/hermes" ~/.local/bin/hermes

# 验证
hermes doctor
hermes chat -q "Hello"
```

### 运行测试

```bash
pytest tests/ -v
```

## 代码风格

- **PEP 8**，但不强制限制行长度
- **注释**：只在解释非显然意图、权衡取舍或 API 特殊行为时添加
- **错误处理**：捕获具体异常；对意外错误使用 `logger.warning()` / `logger.error()`，并传入 `exc_info=True`
- **跨平台**：不要假设运行在 Unix 上（详见下文）
- **配置文件安全路径（profile-safe paths）**：不要硬编码 `~/.hermes`——代码中使用 `hermes_constants` 的 `get_hermes_home()`，用户界面使用 `display_hermes_home()`。完整规则参见 [AGENTS.md](https://github.com/NousResearch/hermes-agent/blob/main/AGENTS.md#profiles-multi-instance-support)

## 跨平台兼容性

Hermes 官方支持 Linux、macOS 和 WSL2，不支持原生 Windows，但代码库包含一些防御性编码模式以避免边缘情况下的崩溃。关键规则如下：

### 1. `termios` 和 `fcntl` 仅限 Unix

始终同时捕获 `ImportError` 和 `NotImplementedError`：

```python
try:
    from simple_term_menu import TerminalMenu
    menu = TerminalMenu(options)
    idx = menu.show()
except (ImportError, NotImplementedError):
    # 降级：数字菜单
    for i, opt in enumerate(options):
        print(f"  {i+1}. {opt}")
    idx = int(input("Choice: ")) - 1
```

### 2. 文件编码

部分环境可能以非 UTF-8 编码保存 `.env` 文件：

```python
try:
    load_dotenv(env_path)
except UnicodeDecodeError:
    load_dotenv(env_path, encoding="latin-1")
```

### 3. 进程管理

`os.setsid()`、`os.killpg()` 及信号处理在不同平台表现不同：

```python
import platform
if platform.system() != "Windows":
    kwargs["preexec_fn"] = os.setsid
```

### 4. 路径分隔符

使用 `pathlib.Path`，而不是用 `/` 拼接字符串。

## 安全注意事项

Hermes 拥有终端访问权限，安全至关重要。

### 现有防护措施

| 层级 | 实现方式 |
|------|---------|
| **sudo 密码传递** | 使用 `shlex.quote()` 防止 shell 注入 |
| **危险命令检测** | `tools/approval.py` 中的正则模式 + 用户确认流程 |
| **定时任务提示词注入防护** | 扫描器阻断指令覆盖模式 |
| **写入拒绝名单** | 通过 `os.path.realpath()` 解析受保护路径，防止符号链接绕过 |
| **技能安全检查** | 对 Hub 安装的技能进行安全扫描 |
| **代码执行沙盒** | 子进程运行时剥离 API 密钥 |
| **容器加固** | Docker：移除所有特权能力，禁止权限提升，限制 PID 数量 |

### 安全相关代码的贡献规范

- 在 shell 命令中插入用户输入时，始终使用 `shlex.quote()`
- 访问控制检查前，用 `os.path.realpath()` 解析符号链接
- 不要记录（log）密钥信息
- 在工具执行代码中捕获宽泛异常
- 若改动涉及文件路径或进程，请在所有平台上测试

## Pull Request 流程

### 分支命名

```
fix/description        # Bug 修复
feat/description       # 新功能
docs/description       # 文档
test/description       # 测试
refactor/description   # 代码重构
```

### 提交前检查

1. **运行测试**：`pytest tests/ -v`
2. **手动测试**：运行 `hermes`，实际走一遍你修改的代码路径
3. **评估跨平台影响**：考虑 macOS 和不同 Linux 发行版的情况
4. **保持 PR 聚焦**：一个 PR 只包含一个逻辑变更

### PR 描述

请包含以下内容：
- **改了什么**以及**为什么改**
- **如何测试**
- **在哪些平台上**测试过
- 关联的相关 Issue

### Commit 信息

我们遵循[约定式提交（Conventional Commits）](https://www.conventionalcommits.org/)规范：

```
<type>(<scope>): <description>
```

| Type | 用途 |
|------|------|
| `fix` | Bug 修复 |
| `feat` | 新功能 |
| `docs` | 文档 |
| `test` | 测试 |
| `refactor` | 代码重构 |
| `chore` | 构建、CI（持续集成）、依赖更新 |

Scope 范围：`cli`、`gateway`、`tools`、`skills`、`agent`、`install`、`whatsapp`、`security`

示例：
```
fix(cli): prevent crash in save_config_value when model is a string
feat(gateway): add WhatsApp multi-user session isolation
fix(security): prevent shell injection in sudo password piping
```

## 报告 Issue

- 使用 [GitHub Issues](https://github.com/NousResearch/hermes-agent/issues)
- 请包含：操作系统、Python 版本、Hermes 版本（`hermes version`）、完整错误堆栈
- 附上复现步骤
- 创建新 Issue 前先检查是否已有重复
- 安全漏洞请私下报告

## 社区

- **Discord**：[discord.gg/NousResearch](https://discord.gg/NousResearch)
- **GitHub Discussions**：用于设计提案和架构讨论
- **技能 Hub**：上传并与社区分享专属技能

## 许可证

提交贡献即表示你同意将其以 [MIT 许可证](https://github.com/NousResearch/hermes-agent/blob/main/LICENSE)授权。
