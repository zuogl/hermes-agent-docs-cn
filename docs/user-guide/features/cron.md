---
title: "定时任务（Cron）"
---
# 定时任务（Cron）

用自然语言或 cron 表达式调度任务，让其自动运行。Hermes 通过单一的 `cronjob` 工具，以 `action` 参数区分各类操作，而非分散为独立的调度/列表/删除工具。

## Cron 目前能做什么

定时任务可以：

- 调度一次性或周期性任务
- 暂停、恢复、编辑、触发和删除任务
- 为任务附加零个、一个或多个技能
- 将结果投递至原始对话、本地文件或配置好的平台目标
- 在全新的智能体会话中以默认静态工具集运行

:::caution
Cron 运行的会话不能递归创建更多定时任务。Hermes 会在 cron 执行内部禁用 cron 管理工具，以防止出现失控的调度循环。
:::

## 创建定时任务

### 在聊天中使用 `/cron`

```bash
/cron add 30m "Remind me to check the build"
/cron add "every 2h" "Check server status"
/cron add "every 1h" "Summarize new feed items" --skill blogwatcher
/cron add "every 1h" "Use both skills and combine the result" --skill blogwatcher --skill find-nearby
```

### 使用独立 CLI

```bash
hermes cron create "every 2h" "Check server status"
hermes cron create "every 1h" "Summarize new feed items" --skill blogwatcher
hermes cron create "every 1h" "Use both skills and combine the result" \
  --skill blogwatcher \
  --skill find-nearby \
  --name "Skill combo"
```

### 通过自然对话

直接向 Hermes 描述：

```text
Every morning at 9am, check Hacker News for AI news and send me a summary on Telegram.
```

Hermes 会在内部使用统一的 `cronjob` 工具。

## 附加技能的定时任务

定时任务可以在运行提示前加载一个或多个技能。

### 单个技能

```python
cronjob(
    action="create",
    skill="blogwatcher",
    prompt="Check the configured feeds and summarize anything new.",
    schedule="0 9 * * *",
    name="Morning feeds",
)
```

### 多个技能

技能按顺序加载，提示词作为任务指令叠加在这些技能之上。

```python
cronjob(
    action="create",
    skills=["blogwatcher", "find-nearby"],
    prompt="Look for new local events and interesting nearby places, then combine them into one short brief.",
    schedule="every 6h",
    name="Local brief",
)
```

当你希望定时智能体继承可复用的工作流，又不想把完整的技能文本嵌入 cron 提示词本身时，这非常有用。

## 编辑任务

修改任务不需要先删除再重建。

### 聊天

```bash
/cron edit <job_id> --schedule "every 4h"
/cron edit <job_id> --prompt "Use the revised task"
/cron edit <job_id> --skill blogwatcher --skill find-nearby
/cron edit <job_id> --remove-skill blogwatcher
/cron edit <job_id> --clear-skills
```

### 独立 CLI

```bash
hermes cron edit <job_id> --schedule "every 4h"
hermes cron edit <job_id> --prompt "Use the revised task"
hermes cron edit <job_id> --skill blogwatcher --skill find-nearby
hermes cron edit <job_id> --add-skill find-nearby
hermes cron edit <job_id> --remove-skill blogwatcher
hermes cron edit <job_id> --clear-skills
```

说明：

- 重复使用 `--skill` 会替换任务当前附加的技能列表
- `--add-skill` 在现有列表基础上追加，不会替换
- `--remove-skill` 移除指定的附加技能
- `--clear-skills` 移除所有附加技能

## 生命周期操作

定时任务现在拥有比创建/删除更完整的生命周期。

### 聊天

```bash
/cron list
/cron pause <job_id>
/cron resume <job_id>
/cron run <job_id>
/cron remove <job_id>
```

### 独立 CLI

```bash
hermes cron list
hermes cron pause <job_id>
hermes cron resume <job_id>
hermes cron run <job_id>
hermes cron remove <job_id>
hermes cron status
hermes cron tick
```

各操作说明：

- `pause` — 保留任务但停止调度
- `resume` — 重新启用任务并计算下一次运行时间
- `run` — 在下一个调度周期触发任务
- `remove` — 彻底删除任务

## 工作原理

**Cron 执行由网关守护进程处理。** 网关每 60 秒触发一次调度器，在隔离的智能体会话中运行所有到期任务。

```bash
hermes gateway install     # 安装为用户服务
sudo hermes gateway install --system   # Linux：服务器开机自启的系统服务
hermes gateway             # 或在前台运行

hermes cron list
hermes cron status
```

### 网关调度器行为

每次触发时，Hermes 会：

1. 从 `~/.hermes/cron/jobs.json` 加载任务
2. 对照当前时间检查 `next_run_at`
3. 为每个到期任务启动全新的 `AIAgent` 会话
4. 可选地将一个或多个附加技能注入该全新会话
5. 运行提示词直到完成
6. 投递最终响应
7. 更新运行元数据和下次调度时间

`~/.hermes/cron/.tick.lock` 文件锁防止调度周期重叠时对同一批任务重复执行。

## 投递选项

调度任务时，你需要指定输出的发送目标：

| 选项 | 描述 | 示例 |
|--------|-------------|---------|
| `"origin"` | 发回任务创建处 | 消息平台默认值 |
| `"local"` | 仅保存到本地文件（`~/.hermes/cron/output/`） | CLI 默认值 |
| `"telegram"` | Telegram 主频道 | 使用 `TELEGRAM_HOME_CHANNEL` |
| `"telegram:123456"` | 按 ID 指定的 Telegram 对话 | 直接投递 |
| `"telegram:-100123:17585"` | 指定 Telegram 话题 | `chat_id:thread_id` 格式 |
| `"discord"` | Discord 主频道 | 使用 `DISCORD_HOME_CHANNEL` |
| `"discord:#engineering"` | 按名称指定的 Discord 频道 | 按频道名 |
| `"slack"` | Slack 主频道 | |
| `"whatsapp"` | WhatsApp 主账号 | |
| `"signal"` | Signal | |
| `"matrix"` | Matrix 主房间 | |
| `"mattermost"` | Mattermost 主频道 | |
| `"email"` | 电子邮件 | |
| `"sms"` | 通过 Twilio 发送短信 | |
| `"homeassistant"` | Home Assistant | |
| `"dingtalk"` | 钉钉 | |
| `"feishu"` | 飞书/Lark | |
| `"wecom"` | 企业微信 | |

智能体的最终响应会自动投递，无需在 cron 提示词中调用 `send_message`。

### 响应包装

默认情况下，已投递的 cron 输出会附加页眉和页脚，以便接收方知道这是来自定时任务的内容：

```
Cronjob Response: Morning feeds
-------------

<agent output here>

Note: The agent cannot see this message, and therefore cannot respond to it.
```

若要不带包装直接投递原始智能体输出，将 `cron.wrap_response` 设为 `false`：

```yaml
# ~/.hermes/config.yaml
cron:
  wrap_response: false
```

### 静默抑制

如果智能体的最终响应以 `[SILENT]` 开头，投递将被完全抑制。输出仍会保存到本地供审计（位于 `~/.hermes/cron/output/`），但不会向投递目标发送任何消息。

这对于只需在出现问题时才报告的监控任务非常有用：

```text
Check if nginx is running. If everything is healthy, respond with only [SILENT].
Otherwise, report the issue.
```

失败的任务无论 `[SILENT]` 标记如何都会强制投递——只有成功的运行才能被静默。

## 调度格式

智能体的最终响应会自动投递——**无需**在 cron 提示词中为同一目标调用 `send_message`。如果 cron 运行调用了 `send_message`，且目标与调度器已投递的目标完全相同，Hermes 会跳过该重复发送，并告知模型将面向用户的内容放在最终响应中。`send_message` 仅用于额外或不同的目标。

### 相对延迟（一次性）

```text
30m     → 30 分钟后运行一次
2h      → 2 小时后运行一次
1d      → 1 天后运行一次
```

### 间隔（周期性）

```text
every 30m    → 每 30 分钟
every 2h     → 每 2 小时
every 1d     → 每天
```

### Cron 表达式

```text
0 9 * * *       → 每天上午 9:00
0 9 * * 1-5     → 工作日上午 9:00
0 */6 * * *     → 每 6 小时
30 8 1 * *      → 每月 1 日上午 8:30
0 0 * * 0       → 每周日午夜
```

### ISO 时间戳

```text
2026-03-15T09:00:00    → 2026 年 3 月 15 日上午 9:00 运行一次
```

## 重复行为

| 调度类型 | 默认重复次数 | 行为 |
|--------------|----------------|----------|
| 一次性（`30m`、时间戳） | 1 | 运行一次 |
| 间隔（`every 2h`） | 永久 | 持续运行直到删除 |
| Cron 表达式 | 永久 | 持续运行直到删除 |

可以手动覆盖：

```python
cronjob(
    action="create",
    prompt="...",
    schedule="every 2h",
    repeat=5,
)
```

## 以编程方式管理任务

智能体侧 API 只有一个工具：

```python
cronjob(action="create", ...)
cronjob(action="list")
cronjob(action="update", job_id="...")
cronjob(action="pause", job_id="...")
cronjob(action="resume", job_id="...")
cronjob(action="run", job_id="...")
cronjob(action="remove", job_id="...")
```

对于 `update` 操作，传入 `skills=[]` 可移除所有附加技能。

## 任务存储

任务存储在 `~/.hermes/cron/jobs.json` 中。任务运行的输出保存至 `~/.hermes/cron/output/{job_id}/{timestamp}.md`。

存储采用原子文件写入，确保写入中断不会留下不完整的任务文件。

## 提示词必须自给自足

> ⚠️ **重要提示**：定时任务在全新的智能体会话中运行。提示词必须包含智能体所需的一切，附加技能未提供的内容均需在提示词中明确给出。

**错误示例：** `"Check on that server issue"`

**正确示例：** `"SSH into server 192.168.1.100 as user 'deploy', check if nginx is running with 'systemctl status nginx', and verify https://example.com returns HTTP 200."`

## 安全性

定时任务的提示词会在创建和更新时扫描提示注入和凭据外泄模式。包含不可见 Unicode 技巧、SSH 后门尝试或明显凭据窃取载荷的提示词将被拦截。
