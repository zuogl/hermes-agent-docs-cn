---
title: "Git Worktrees"
---
# Git 工作树（Worktrees）

Hermes Agent 常用于大型、长期维护的代码仓库。当你需要：

- 在同一项目中**并行运行多个智能体**，或
- 将实验性重构与主分支完全隔离，

Git **工作树**（worktrees）是最安全的选择。它让每个智能体拥有独立的检出目录，同时无需完整复制整个仓库。

本页介绍如何将工作树与 Hermes 配合使用，使每个会话都能在干净、隔离的工作目录中运行。

## 为什么要将工作树与 Hermes 配合使用？

Hermes 以**当前工作目录**作为项目根目录：

- CLI：运行 `hermes` 或 `hermes chat` 时所在的目录
- 消息网关：由 `MESSAGING_CWD` 指定的目录

如果多个智能体在**同一工作目录**中运行，它们的变更可能会互相干扰：

- 一个智能体可能会删除或重写另一个正在使用的文件。
- 很难追踪哪些变更属于哪个实验。

使用工作树后，每个智能体拥有：

- **独立的分支和检出目录**
- **独立的检查点管理器历史**，用于 `/rollback`

另请参阅：[检查点与 /rollback](/user-guide/checkpoints-and-rollback)。

## 快速开始：创建工作树

在主仓库（包含 `.git/` 的目录）中，为功能分支创建一个新工作树：

```bash
# 进入主仓库根目录
cd /path/to/your/repo

# 在 ../repo-feature 目录中创建新分支和工作树
git worktree add ../repo-feature feature/hermes-experiment
```

执行后将创建：

- 新目录：`../repo-feature`
- 新分支：`feature/hermes-experiment`，已在该目录中检出

进入新工作树后，即可在其中运行 Hermes：

```bash
cd ../repo-feature

# 在工作树中启动 Hermes
hermes
```

Hermes 将：

- 以 `../repo-feature` 作为项目根目录。
- 在该目录中处理上下文文件、代码编辑及工具调用。
- 使用**独立的检查点历史**，`/rollback` 仅作用于当前工作树。

## 并行运行多个智能体

你可以创建多个工作树，每个对应一个独立分支：

```bash
cd /path/to/your/repo

git worktree add ../repo-experiment-a feature/hermes-a
git worktree add ../repo-experiment-b feature/hermes-b
```

在各自的终端中运行：

```bash
# 终端 1
cd ../repo-experiment-a
hermes

# 终端 2
cd ../repo-experiment-b
hermes
```

每个 Hermes 进程：

- 在各自的分支上工作（`feature/hermes-a` 与 `feature/hermes-b`）。
- 在不同的影子仓库哈希下写入检查点（哈希由工作树路径派生）。
- 可独立使用 `/rollback`，互不影响。

以下场景尤为适用：

- 执行批量重构任务。
- 针对同一问题尝试不同的解决思路。
- 让 CLI 会话与网关会话同时作用于同一上游仓库。

## 安全清理工作树

实验结束后：

1. 决定是否保留这部分工作。
2. 如果需要保留，按常规方式将分支合并至主分支。
3. 删除工作树：

```bash
cd /path/to/your/repo

# 删除工作树目录及其引用
git worktree remove ../repo-feature
```

注意事项：

- `git worktree remove` 会拒绝删除存在未提交变更的工作树，除非加上 `--force` 强制执行。
- 删除工作树**不会**自动删除对应分支；可通过普通的 `git branch` 命令决定是否保留该分支。
- `~/.hermes/checkpoints/` 下的 Hermes 检查点数据不会在工作树删除时自动清理，但通常占用空间极小。

## 最佳实践

- **每次 Hermes 实验使用独立的工作树**
  - 为每项重要变更创建专属的分支和工作树。
  - 这样可以让 diff 更聚焦，PR 也更小、更易于审查。
- **以实验内容命名分支**
  - 例如：`feature/hermes-checkpoints-docs`、`feature/hermes-refactor-tests`。
- **频繁提交**
  - 用 git 提交记录高层级里程碑。
  - 使用[检查点与 /rollback](/user-guide/checkpoints-and-rollback) 作为工具驱动编辑过程中的安全保障。
- **使用工作树时，避免在裸仓库根目录运行 Hermes**
  - 优先使用工作树目录，确保每个智能体有明确的作用范围。

## 使用 `hermes -w`（自动工作树模式）

Hermes 内置了 `-w` 标志，可**自动创建临时 git 工作树**及独立分支，无需手动配置——只需进入仓库目录并运行：

```bash
cd /path/to/your/repo
hermes -w
```

Hermes 将：

- 在仓库内的 `.worktrees/` 目录下创建临时工作树。
- 检出一个隔离分支（例如 `hermes/hermes-<hash>`）。
- 在该工作树内运行完整的 CLI 会话。

这是实现工作树隔离最简便的方式。你也可以将其与单次查询结合使用：

```bash
hermes -w -q "Fix issue #123"
```

如需并行运行多个智能体，打开多个终端并分别运行 `hermes -w`，每次运行都会自动获得独立的工作树和分支。

## 总结

- 使用 **git 工作树**，让每个 Hermes 会话拥有干净的独立工作目录。
- 使用**分支**记录每次实验的高层级历史。
- 使用**检查点 + `/rollback`** 在各工作树内从错误中恢复。

三者相互配合，共同带来：

- 不同智能体和实验之间的强隔离保证，互不干扰。
- 快速迭代，轻松从错误编辑中恢复。
- 干净、易于审查的 pull request。
