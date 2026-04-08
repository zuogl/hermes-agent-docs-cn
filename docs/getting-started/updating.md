---
title: "更新与卸载"
---
# 更新与卸载

## 更新

使用一条命令更新到最新版本：

```bash
hermes update
```

此命令会拉取最新代码、更新依赖，并在检测到新配置选项时提示你进行设置。

:::tip
`hermes update` 会自动检测新增的配置选项并提示添加。如果跳过了该提示，可以手动运行 `hermes config check` 查看缺失的选项，然后运行 `hermes config migrate` 交互式地添加。
:::

### 更新过程说明

运行 `hermes update` 时，将依次执行以下步骤：

1. **Git 拉取** — 从 `main` 分支拉取最新代码并更新子模块
2. **安装依赖** — 运行 `uv pip install -e ".[all]"` 以获取新增或变更的依赖
3. **配置迁移** — 检测自上次更新以来新增的配置选项，并提示你进行设置
4. **网关自动重启** — 如果网关服务正在运行（Linux 上使用 systemd，macOS 上使用 launchd），更新完成后将**自动重启**，让新代码立即生效

预期输出如下：

```
$ hermes update
Updating Hermes Agent...
📥 Pulling latest code...
Already up to date.  (or: Updating abc1234..def5678)
📦 Updating dependencies...
✅ Dependencies updated
🔍 Checking for new config options...
✅ Config is up to date  (or: Found 2 new options — running migration...)
🔄 Restarting gateway service...
✅ Gateway restarted
✅ Hermes Agent updated successfully!
```

### 更新后建议的验证步骤

`hermes update` 处理主要的更新流程，但简单验证一下可以确认所有内容已正确应用：

1. `git status --short` — 若工作树意外出现修改，请在继续操作前先检查
2. `hermes doctor` — 检查配置、依赖和服务健康状态
3. `hermes --version` — 确认版本号已如预期更新
4. 如果使用了网关：`hermes gateway status`
5. 如果 `doctor` 报告 npm 审计问题：在对应目录中运行 `npm audit fix`

:::caution
更新后工作树有未提交修改
若 `git status --short` 在 `hermes update` 后显示意外的改动，请停下来检查后再继续。这通常意味着本地修改被重新应用到了更新后的代码之上，或依赖安装步骤刷新了锁文件。
:::

### 查看当前版本

```bash
hermes version
```

与 [GitHub Releases 页面](https://github.com/NousResearch/hermes-agent/releases) 上的最新版本进行对比，或检查是否有可用更新：

```bash
hermes update --check
```

### 从消息平台更新

你也可以直接在 Telegram、Discord、Slack 或 WhatsApp 中发送以下命令进行更新：

```
/update
```

此命令会拉取最新代码、更新依赖并重启网关。重启期间（通常为 5–15 秒）机器人会短暂离线，之后自动恢复。

### 手动更新

如果你是手动安装的（未使用快速安装脚本）：

```bash
cd /path/to/hermes-agent
export VIRTUAL_ENV="$(pwd)/venv"

# 拉取最新代码和子模块
git pull origin main
git submodule update --init --recursive

# 重新安装（获取新依赖）
uv pip install -e ".[all]"
uv pip install -e "./tinker-atropos"

# 检查新增配置选项
hermes config check
hermes config migrate   # 交互式添加缺失选项
```

### 回滚说明

如果更新引入了问题，可以回滚到之前的版本：

```bash
cd /path/to/hermes-agent

# 列出近期提交
git log --oneline -10

# 回滚到指定提交
git checkout <commit-hash>
git submodule update --init --recursive
uv pip install -e ".[all]"

# 如果网关正在运行，重启它
hermes gateway restart
```

回滚到特定发布标签：

```bash
git checkout v0.6.0
git submodule update --init --recursive
uv pip install -e ".[all]"
```

:::caution
若新版本新增了配置选项，回滚可能导致配置不兼容。回滚后请运行 `hermes config check`，如遇错误，请从 `config.yaml` 中删除无法识别的选项。
:::

### Nix 用户说明

如果你通过 Nix flake 安装，更新由 Nix 包管理器统一管理：

```bash
# 更新 flake 输入
nix flake update hermes-agent

# 或以最新版本直接重建
nix profile upgrade hermes-agent
```

Nix 安装是不可变的——回滚通过 Nix 的代管理系统（generation system）处理：

```bash
nix profile rollback
```

详见 [Nix 安装](/getting-started/nix-setup)。

---

## 卸载

```bash
hermes uninstall
```

卸载程序会询问是否保留配置文件（`~/.hermes/`），以便将来重新安装时使用。

### 手动卸载

```bash
rm -f ~/.local/bin/hermes
rm -rf /path/to/hermes-agent
rm -rf ~/.hermes            # 可选——如计划重新安装可保留
```

:::info
如果你将网关安装为系统服务，请先停止并禁用它：
:::

```bash
hermes gateway stop
# Linux: systemctl --user disable hermes-gateway
# macOS: launchctl remove ai.hermes.gateway
```
