---
title: "Profile 命令参考"
---
# Profile 命令参考

本页面涵盖所有与 [Hermes profile](/user-guide/profiles) 相关的命令。通用 CLI 命令请参阅 [CLI 命令参考](/reference/cli-commands)。

## `hermes profile`

```bash
hermes profile <subcommand>
```

管理 profile 的顶层命令。不带子命令运行 `hermes profile` 将显示帮助信息。

| 子命令 | 描述 |
|--------|------|
| `list` | 列出所有 profile。 |
| `use` | 设置当前激活（默认）的 profile。 |
| `create` | 创建新 profile。 |
| `delete` | 删除 profile。 |
| `show` | 显示 profile 的详细信息。 |
| `alias` | 重新生成 profile 的 shell 别名。 |
| `rename` | 重命名 profile。 |
| `export` | 将 profile 导出为 tar.gz 压缩包。 |
| `import` | 从 tar.gz 压缩包导入 profile。 |

## `hermes profile list`

```bash
hermes profile list
```

列出所有 profile。当前激活的 profile 以 `*` 标记。

**示例：**

```bash
$ hermes profile list
  default
* work
  dev
  personal
```

无可用选项。

## `hermes profile use`

```bash
hermes profile use <name>
```

将 `<name>` 设置为当前激活的 profile。此后所有不带 `-p` 的 `hermes` 命令都将使用该 profile。

| 参数 | 描述 |
|------|------|
| `<name>` | 要激活的 profile 名称。使用 `default` 可返回基础 profile。 |

**示例：**

```bash
hermes profile use work
hermes profile use default
```

## `hermes profile create`

```bash
hermes profile create <name> [options]
```

创建新 profile。

| 参数 / 选项 | 描述 |
|-------------|------|
| `<name>` | 新 profile 的名称。必须是合法的目录名（字母数字、连字符、下划线）。 |
| `--clone` | 从当前 profile 复制 `config.yaml`、`.env` 和 `SOUL.md`。 |
| `--clone-all` | 从当前 profile 复制全部内容（config、memories、skills、sessions、state）。 |
| `--clone-from <profile>` | 从指定 profile 而非当前 profile 克隆。与 `--clone` 或 `--clone-all` 配合使用。 |

**示例：**

```bash
# 空白 profile——需要完整配置
hermes profile create mybot

# 仅从当前 profile 克隆配置
hermes profile create work --clone

# 从当前 profile 克隆全部内容
hermes profile create backup --clone-all

# 从指定 profile 克隆配置
hermes profile create work2 --clone --clone-from work
```

## `hermes profile delete`

```bash
hermes profile delete <name> [options]
```

删除 profile 并移除其 shell 别名。

| 参数 / 选项 | 描述 |
|-------------|------|
| `<name>` | 要删除的 profile。 |
| `--yes`, `-y` | 跳过确认提示。 |

**示例：**

```bash
hermes profile delete mybot
hermes profile delete mybot --yes
```

:::caution
此操作将永久删除该 profile 的整个目录，包含所有 config、memories、sessions 和 skills，且无法恢复。不能删除当前激活的 profile。
:::

## `hermes profile show`

```bash
hermes profile show <name>
```

显示 profile 的详细信息，包括主目录、已配置的模型、gateway 状态、skills 数量及配置文件状态。

| 参数 | 描述 |
|------|------|
| `<name>` | 要查看的 profile。 |

**示例：**

```bash
$ hermes profile show work
Profile: work
Path:    ~/.hermes/profiles/work
Model:   anthropic/claude-sonnet-4 (anthropic)
Gateway: stopped
Skills:  12
.env:    exists
SOUL.md: exists
Alias:   ~/.local/bin/work
```

## `hermes profile alias`

```bash
hermes profile alias <name> [options]
```

在 `~/.local/bin/` 重新生成 shell 别名脚本。适用于别名被意外删除，或迁移 Hermes 安装目录后需要更新别名的场景。

| 参数 / 选项 | 描述 |
|-------------|------|
| `<name>` | 要创建或更新别名的 profile。 |
| `--remove` | 移除包装脚本而非创建。 |
| `--name <alias>` | 自定义别名名称（默认为 profile 名称）。 |

**示例：**

```bash
hermes profile alias work
# 创建或更新 ~/.local/bin/work

hermes profile alias work --name mywork
# 创建 ~/.local/bin/mywork

hermes profile alias work --remove
# 移除包装脚本
```

## `hermes profile rename`

```bash
hermes profile rename <old-name> <new-name>
```

重命名 profile，同步更新目录名和 shell 别名。

| 参数 | 描述 |
|------|------|
| `<old-name>` | 当前 profile 名称。 |
| `<new-name>` | 新 profile 名称。 |

**示例：**

```bash
hermes profile rename mybot assistant
# ~/.hermes/profiles/mybot → ~/.hermes/profiles/assistant
# ~/.local/bin/mybot → ~/.local/bin/assistant
```

## `hermes profile export`

```bash
hermes profile export <name> [options]
```

将 profile 导出为 tar.gz 压缩包。

| 参数 / 选项 | 描述 |
|-------------|------|
| `<name>` | 要导出的 profile。 |
| `-o`, `--output <file>` | 输出文件路径（默认：`<name>.tar.gz`）。 |

**示例：**

```bash
hermes profile export work
# 在当前目录创建 work.tar.gz

hermes profile export work -o ./work-2026-03-29.tar.gz
```

## `hermes profile import`

```bash
hermes profile import <archive> [options]
```

从 tar.gz 压缩包导入 profile。

| 参数 / 选项 | 描述 |
|-------------|------|
| `<archive>` | 要导入的 tar.gz 压缩包路径。 |
| `--name <name>` | 导入后的 profile 名称（默认从压缩包名称推断）。 |

**示例：**

```bash
hermes profile import ./work-2026-03-29.tar.gz
# 从压缩包名称推断 profile 名称

hermes profile import ./work-2026-03-29.tar.gz --name work-restored
```

## `hermes -p` / `hermes --profile`

```bash
hermes -p <name> <command> [options]
hermes --profile <name> <command> [options]
```

全局标志，用于在指定 profile 下执行任意 Hermes 命令，而不改变已固定的默认 profile。该标志仅在当次命令执行期间覆盖激活的 profile。

| 选项 | 描述 |
|------|------|
| `-p <name>`, `--profile <name>` | 本次命令所使用的 profile。 |

**示例：**

```bash
hermes -p work chat -q "Check the server status"
hermes --profile dev gateway start
hermes -p personal skills list
hermes -p work config edit
```

## `hermes completion`

```bash
hermes completion <shell>
```

生成 shell 补全脚本，支持 profile 名称和 profile 子命令的补全。

| 参数 | 描述 |
|------|------|
| `<shell>` | 目标 shell 类型：`bash` 或 `zsh`。 |

**示例：**

```bash
# 安装补全脚本
hermes completion bash >> ~/.bashrc
hermes completion zsh >> ~/.zshrc

# 重新加载 shell
source ~/.bashrc
```

安装完成后，以下场景支持 Tab 补全：
- `hermes profile <TAB>` — 子命令（list、use、create 等）
- `hermes profile use <TAB>` — profile 名称
- `hermes -p <TAB>` — profile 名称

## 参见

- [Profile 用户指南](/user-guide/profiles)
- [CLI 命令参考](/reference/cli-commands)
- [常见问题——Profile 部分](/reference/faq#profiles)
