---
title: "用 Cron 自动化一切"
---
# 用 Cron 自动化一切

[每日简报机器人教程](/guides/daily-briefing-bot) 涵盖了基础知识。本指南更进一步——五种真实的自动化模式，可供你灵活应用于自己的工作流。

完整功能参考，请参阅 [定时任务（Cron）](/user-guide/features/cron)。

> ℹ️ **核心概念**：Cron（定时任务）在全新的 Agent 会话中运行，不保留任何当前对话记忆。提示词必须**完全自给自足**——包含 Agent 执行任务所需的一切信息。

---

## 模式一：网站变更监控

监听某个 URL 的变化，仅在内容发生变更时发送通知。

`script` 参数是这里的秘密武器。Python 脚本在每次执行前先运行，其标准输出作为上下文传给 Agent。脚本负责机械性工作（抓取、比较差异）；Agent 负责推理判断（这个变更是否值得关注？）。

创建监控脚本：

```bash
mkdir -p ~/.hermes/scripts
```

```python title="~/.hermes/scripts/watch-site.py"
import hashlib, json, os, urllib.request

URL = "https://example.com/pricing"
STATE_FILE = os.path.expanduser("~/.hermes/scripts/.watch-site-state.json")

# 获取当前内容
req = urllib.request.Request(URL, headers={"User-Agent": "Hermes-Monitor/1.0"})
content = urllib.request.urlopen(req, timeout=30).read().decode()
current_hash = hashlib.sha256(content.encode()).hexdigest()

# 加载上次状态
prev_hash = None
if os.path.exists(STATE_FILE):
    with open(STATE_FILE) as f:
        prev_hash = json.load(f).get("hash")

# 保存当前状态
with open(STATE_FILE, "w") as f:
    json.dump({"hash": current_hash, "url": URL}, f)

# 输出给 Agent
if prev_hash and prev_hash != current_hash:
    print(f"CHANGE DETECTED on {URL}")
    print(f"Previous hash: {prev_hash}")
    print(f"Current hash: {current_hash}")
    print(f"\nCurrent content (first 2000 chars):\n{content[:2000]}")
else:
    print("NO_CHANGE")
```

设置 cron 定时任务：

```bash
/cron add "every 1h" "If the script output says CHANGE DETECTED, summarize what changed on the page and why it might matter. If it says NO_CHANGE, respond with just [SILENT]." --script ~/.hermes/scripts/watch-site.py --name "Pricing monitor" --deliver telegram
```

> 💡 **提示：[SILENT] 技巧**
> 当 Agent 最终回复中包含 `[SILENT]` 时，推送通知将被静默处理。这意味着只有真正发生变化时才会收到通知——静默时段不会产生无效消息。

---

## 模式二：每周报告

汇聚多个数据源，生成格式化摘要。此任务每周运行一次，并推送到你的主频道。

```bash
/cron add "0 9 * * 1" "Generate a weekly report covering:

1. Search the web for the top 5 AI news stories from the past week
2. Search GitHub for trending repositories in the 'machine-learning' topic
3. Check Hacker News for the most discussed AI/ML posts

Format as a clean summary with sections for each source. Include links.
Keep it under 500 words — highlight only what matters." --name "Weekly AI digest" --deliver telegram
```

通过 CLI 使用：

```bash
hermes cron create "0 9 * * 1" \
  "Generate a weekly report covering the top AI news, trending ML GitHub repos, and most-discussed HN posts. Format with sections, include links, keep under 500 words." \
  --name "Weekly AI digest" \
  --deliver telegram
```

`0 9 * * 1` 是标准 cron 表达式：每周一上午 9:00。

---

## 模式三：GitHub 仓库监控

监控仓库中新增的 Issue、PR 或发布版本。

```bash
/cron add "every 6h" "Check the GitHub repository NousResearch/hermes-agent for:
- New issues opened in the last 6 hours
- New PRs opened or merged in the last 6 hours
- Any new releases

Use the terminal to run gh commands:
  gh issue list --repo NousResearch/hermes-agent --state open --json number,title,author,createdAt --limit 10
  gh pr list --repo NousResearch/hermes-agent --state all --json number,title,author,createdAt,mergedAt --limit 10

Filter to only items from the last 6 hours. If nothing new, respond with [SILENT].
Otherwise, provide a concise summary of the activity." --name "Repo watcher" --deliver discord
```

> ⚠️ **注意：提示词须自给自足**
> 注意提示词中包含了完整的 `gh` 命令。Cron Agent 不记得之前的运行情况或你的偏好设置——所有内容都须明确写出。

---

## 模式四：数据采集流水线

定期抓取数据并保存到文件，随时间积累，分析数据趋势。此模式将脚本（负责采集）与 Agent（负责分析）结合使用。

```python title="~/.hermes/scripts/collect-prices.py"
import json, os, urllib.request
from datetime import datetime

DATA_DIR = os.path.expanduser("~/.hermes/data/prices")
os.makedirs(DATA_DIR, exist_ok=True)

# 获取当前数据（示例：加密货币价格）
url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
data = json.loads(urllib.request.urlopen(url, timeout=30).read())

# 追加到历史文件
entry = {"timestamp": datetime.now().isoformat(), "prices": data}
history_file = os.path.join(DATA_DIR, "history.jsonl")
with open(history_file, "a") as f:
    f.write(json.dumps(entry) + "\n")

# 加载近期历史数据供分析
lines = open(history_file).readlines()
recent = [json.loads(l) for l in lines[-24:]]  # 最近 24 个数据点

# 输出给 Agent
print(f"Current: BTC=${data['bitcoin']['usd']}, ETH=${data['ethereum']['usd']}")
print(f"Data points collected: {len(lines)} total, showing last {len(recent)}")
print(f"\nRecent history:")
for r in recent[-6:]:
    print(f"  {r['timestamp']}: BTC=${r['prices']['bitcoin']['usd']}, ETH=${r['prices']['ethereum']['usd']}")
```

```bash
/cron add "every 1h" "Analyze the price data from the script output. Report:
1. Current prices
2. Trend direction over the last 6 data points (up/down/flat)
3. Any notable movements (>5% change)

If prices are flat and nothing notable, respond with [SILENT].
If there's a significant move, explain what happened." \
  --script ~/.hermes/scripts/collect-prices.py \
  --name "Price tracker" \
  --deliver telegram
```

脚本负责机械性的数据采集；Agent 在此基础上增加推理分析层。

---

## 模式五：多技能工作流

将多个技能串联在一起，完成复杂的定时任务。技能按顺序加载，完成后才执行提示词。

```bash
# 使用 arxiv 技能查找论文，再用 obsidian 技能保存笔记
/cron add "0 8 * * *" "Search arXiv for the 3 most interesting papers on 'language model reasoning' from the past day. For each paper, create an Obsidian note with the title, authors, abstract summary, and key contribution." \
  --skill arxiv \
  --skill obsidian \
  --name "Paper digest"
```

直接通过工具调用：

```python
cronjob(
    action="create",
    skills=["arxiv", "obsidian"],
    prompt="Search arXiv for papers on 'language model reasoning' from the past day. Save the top 3 as Obsidian notes.",
    schedule="0 8 * * *",
    name="Paper digest",
    deliver="local"
)
```

技能按顺序加载——先加载 `arxiv`（教会 Agent 如何检索论文），再加载 `obsidian`（教会如何写笔记）。提示词将二者串联起来。

---

## 管理定时任务

```bash
# 列出所有活跃任务
/cron list

# 立即触发某个任务（用于测试）
/cron run <job_id>

# 暂停某个任务但不删除
/cron pause <job_id>

# 修改运行中任务的调度或提示词
/cron edit <job_id> --schedule "every 4h"
/cron edit <job_id> --prompt "Updated task description"

# 为现有任务添加或移除技能
/cron edit <job_id> --skill arxiv --skill obsidian
/cron edit <job_id> --clear-skills

# 永久删除某个任务
/cron remove <job_id>
```

---

## 推送目标

`--deliver` 标志控制结果的推送位置：

| 目标 | 示例 | 使用场景 |
|--------|---------|----------|
| `origin` | `--deliver origin` | 创建该任务的原始对话（默认） |
| `local` | `--deliver local` | 仅保存到本地文件 |
| `telegram` | `--deliver telegram` | 你的 Telegram 主频道 |
| `discord` | `--deliver discord` | 你的 Discord 主频道 |
| `slack` | `--deliver slack` | 你的 Slack 主频道 |
| 指定对话 | `--deliver telegram:-1001234567890` | 指定的 Telegram 群组 |
| 话题线程 | `--deliver telegram:-1001234567890:17585` | 指定的 Telegram 话题线程 |

---

## 使用技巧

**确保提示词完整独立。** Cron 任务中的 Agent 没有对话记忆。请在提示词中直接写明 URL、仓库名、格式要求和推送指令。

**多用 `[SILENT]`。** 对于监控类任务，始终加上"如果没有变化，回复 `[SILENT]`"之类的说明，以避免无效通知。

**用脚本做数据采集。** `script` 参数让 Python 脚本承担繁琐工作（HTTP 请求、文件读写、状态追踪）。Agent 只看到脚本的标准输出，并在此基础上进行推理分析。这比让 Agent 自己做抓取更经济、更可靠。

**用 `/cron run` 测试。** 在等待调度触发之前，用 `/cron run <job_id>` 立即执行，验证输出是否符合预期。

**调度表达式。** 人类可读格式（如 `every 2h`、`30m`、`daily at 9am`）与标准 cron 表达式（如 `0 9 * * *`）均可使用。

---

*完整的 cron 参考文档——所有参数、边界情况和内部机制——请参阅 [定时任务（Cron）](/user-guide/features/cron)。*
