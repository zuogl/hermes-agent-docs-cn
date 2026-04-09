---
title: "Session 存储"
---
# Session 存储

Hermes Agent 使用 SQLite 数据库（`~/.hermes/state.db`）跨 CLI 和 gateway session
持久化保存 session 元数据、完整消息历史及模型配置。该方案取代了此前基于每个 session 独立 JSONL 文件的做法。

源文件：`hermes_state.py`


## 架构概览

```
~/.hermes/state.db（SQLite，WAL 模式）
├── sessions          — Session 元数据、token 计数、计费信息
├── messages          — 每个 session 的完整消息历史
├── messages_fts      — FTS5 虚拟表，用于全文搜索
└── schema_version    — 单行表，记录迁移状态
```

关键设计决策：
- **WAL 模式**：支持多读单写并发（gateway 多平台场景）
- **FTS5 虚拟表**：跨所有 session 消息进行快速文本搜索
- **Session 谱系**：通过 `parent_session_id` 链实现（压缩触发分裂时使用）
- **来源标记**（`cli`、`telegram`、`discord` 等）：用于按平台过滤
- Batch runner 和 RL 轨迹不存储于此（属于独立系统）


## SQLite Schema

### sessions 表

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    user_id TEXT,
    model TEXT,
    model_config TEXT,
    system_prompt TEXT,
    parent_session_id TEXT,
    started_at REAL NOT NULL,
    ended_at REAL,
    end_reason TEXT,
    message_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    reasoning_tokens INTEGER DEFAULT 0,
    billing_provider TEXT,
    billing_base_url TEXT,
    billing_mode TEXT,
    estimated_cost_usd REAL,
    actual_cost_usd REAL,
    cost_status TEXT,
    cost_source TEXT,
    pricing_version TEXT,
    title TEXT,
    FOREIGN KEY (parent_session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_source ON sessions(source);
CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_title_unique
    ON sessions(title) WHERE title IS NOT NULL;
```

### messages 表

```sql
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,
    content TEXT,
    tool_call_id TEXT,
    tool_calls TEXT,
    tool_name TEXT,
    timestamp REAL NOT NULL,
    token_count INTEGER,
    finish_reason TEXT,
    reasoning TEXT,
    reasoning_details TEXT,
    codex_reasoning_items TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, timestamp);
```

说明：
- `tool_calls` 以 JSON 字符串存储（工具调用对象列表的序列化形式）
- `reasoning_details` 和 `codex_reasoning_items` 以 JSON 字符串存储
- `reasoning` 存储 provider 暴露的原始推理文本
- 时间戳为 Unix epoch 浮点数（`time.time()`）

### FTS5 全文搜索

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    content=messages,
    content_rowid=id
);
```

FTS5 表通过三个触发器与 `messages` 表保持同步，分别在 INSERT、UPDATE 和 DELETE 时触发：

```sql
CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content)
        VALUES('delete', old.id, old.content);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content)
        VALUES('delete', old.id, old.content);
    INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
END;
```


## Schema 版本与迁移

当前 schema 版本：**6**

`schema_version` 表存储单个整数。初始化时，`_init_schema()` 检查当前版本并按顺序执行迁移：

| 版本 | 变更内容 |
|------|---------|
| 1 | 初始 schema（sessions、messages、FTS5） |
| 2 | 在 messages 表中添加 `finish_reason` 列 |
| 3 | 在 sessions 表中添加 `title` 列 |
| 4 | 在 `title` 上添加唯一索引（允许 NULL，非 NULL 值必须唯一） |
| 5 | 添加计费相关列：`cache_read_tokens`、`cache_write_tokens`、`reasoning_tokens`、`billing_provider`、`billing_base_url`、`billing_mode`、`estimated_cost_usd`、`actual_cost_usd`、`cost_status`、`cost_source`、`pricing_version` |
| 6 | 在 messages 表中添加推理相关列：`reasoning`、`reasoning_details`、`codex_reasoning_items` |

每次迁移均使用 `ALTER TABLE ADD COLUMN`，并通过 try/except 处理列已存在的情况（幂等操作）。每个迁移块成功执行后，版本号自动递增。


## 写入竞争处理

多个 hermes 进程（gateway + CLI session + worktree agent）共享同一个 `state.db`。
`SessionDB` 类通过以下机制处理写入竞争：

- **较短的 SQLite 超时时间**（1 秒），而非默认的 30 秒
- **应用层重试**，带随机抖动（20–150ms，最多重试 15 次）
- **BEGIN IMMEDIATE** 事务，在事务开始时即暴露锁竞争
- **定期 WAL checkpoint**，每 50 次成功写入执行一次（PASSIVE 模式）

此方案可避免 SQLite 确定性内部退避引发的"护航效应"——即所有竞争写入方在相同时间间隔集中重试。

```
_WRITE_MAX_RETRIES = 15
_WRITE_RETRY_MIN_S = 0.020   # 20ms
_WRITE_RETRY_MAX_S = 0.150   # 150ms
_CHECKPOINT_EVERY_N_WRITES = 50
```


## 常用操作

### 初始化

```python
from hermes_state import SessionDB

db = SessionDB()                           # 默认路径：~/.hermes/state.db
db = SessionDB(db_path=Path("/tmp/test.db"))  # 自定义路径
```

### 创建与管理 Session

```python
# 创建新 session
db.create_session(
    session_id="sess_abc123",
    source="cli",
    model="anthropic/claude-sonnet-4.6",
    user_id="user_1",
    parent_session_id=None,  # 或传入上一个 session ID 以建立谱系
)

# 结束 session
db.end_session("sess_abc123", end_reason="user_exit")

# 重新打开 session（清除 ended_at 和 end_reason）
db.reopen_session("sess_abc123")
```

### 存储消息

```python
msg_id = db.append_message(
    session_id="sess_abc123",
    role="assistant",
    content="Here's the answer...",
    tool_calls=[{"id": "call_1", "function": {"name": "terminal", "arguments": "{}"}}],
    token_count=150,
    finish_reason="stop",
    reasoning="Let me think about this...",
)
```

### 检索消息

```python
# 获取包含所有元数据的原始消息
messages = db.get_messages("sess_abc123")

# 获取 OpenAI 对话格式（用于 API 回放）
conversation = db.get_messages_as_conversation("sess_abc123")
# 返回：[{"role": "user", "content": "..."}, {"role": "assistant", ...}]
```

### Session 标题

```python
# 设置标题（非 NULL 标题在所有 session 中必须唯一）
db.set_session_title("sess_abc123", "Fix Docker Build")

# 通过标题查找（返回谱系中最新的 session）
session_id = db.resolve_session_by_title("Fix Docker Build")

# 自动生成谱系中的下一个标题
next_title = db.get_next_title_in_lineage("Fix Docker Build")
# 返回："Fix Docker Build #2"
```


## 全文搜索

`search_messages()` 方法支持 FTS5 查询语法，并对用户输入进行自动净化处理。

### 基本搜索

```python
results = db.search_messages("docker deployment")
```

### FTS5 查询语法

| 语法 | 示例 | 含义 |
|------|------|------|
| 关键词 | `docker deployment` | 两个词均包含（隐式 AND） |
| 短语引用 | `"exact phrase"` | 精确短语匹配 |
| 布尔 OR | `docker OR kubernetes` | 任一词匹配 |
| 布尔 NOT | `python NOT java` | 排除指定词 |
| 前缀匹配 | `deploy*` | 前缀匹配 |

### 过滤搜索

```python
# 仅搜索 CLI session
results = db.search_messages("error", source_filter=["cli"])

# 排除 gateway session
results = db.search_messages("bug", exclude_sources=["telegram", "discord"])

# 仅搜索用户消息
results = db.search_messages("help", role_filter=["user"])
```

### 搜索结果格式

每条结果包含：
- `id`、`session_id`、`role`、`timestamp`
- `snippet`——FTS5 生成的摘要，使用 `>>>match<<<` 标记匹配位置
- `context`——匹配消息前后各 1 条消息（内容截断至 200 字符）
- `source`、`model`、`session_started`——来自父 session

`_sanitize_fts5_query()` 方法处理边界情况：
- 去除不匹配的引号和特殊字符
- 将带连字符的词汇加引号（`chat-send` → `"chat-send"`）
- 移除悬空的布尔运算符（`hello AND` → `hello`）


## Session 谱系

Session 可通过 `parent_session_id` 形成链式结构。这发生在 gateway 中上下文压缩触发 session 分裂时。

### 查询：查找 Session 谱系

```sql
-- 查找某 session 的所有祖先
WITH RECURSIVE lineage AS (
    SELECT * FROM sessions WHERE id = ?
    UNION ALL
    SELECT s.* FROM sessions s
    JOIN lineage l ON s.id = l.parent_session_id
)
SELECT id, title, started_at, parent_session_id FROM lineage;

-- 查找某 session 的所有后代
WITH RECURSIVE descendants AS (
    SELECT * FROM sessions WHERE id = ?
    UNION ALL
    SELECT s.* FROM sessions s
    JOIN descendants d ON s.parent_session_id = d.id
)
SELECT id, title, started_at FROM descendants;
```

### 查询：最近 Session 及预览

```sql
SELECT s.*,
    COALESCE(
        (SELECT SUBSTR(m.content, 1, 63)
         FROM messages m
         WHERE m.session_id = s.id AND m.role = 'user' AND m.content IS NOT NULL
         ORDER BY m.timestamp, m.id LIMIT 1),
        ''
    ) AS preview,
    COALESCE(
        (SELECT MAX(m2.timestamp) FROM messages m2 WHERE m2.session_id = s.id),
        s.started_at
    ) AS last_active
FROM sessions s
ORDER BY s.started_at DESC
LIMIT 20;
```

### 查询：Token 使用统计

```sql
-- 按模型统计 token 用量
SELECT model,
       COUNT(*) as session_count,
       SUM(input_tokens) as total_input,
       SUM(output_tokens) as total_output,
       SUM(estimated_cost_usd) as total_cost
FROM sessions
WHERE model IS NOT NULL
GROUP BY model
ORDER BY total_cost DESC;

-- token 用量最高的 session
SELECT id, title, model, input_tokens + output_tokens AS total_tokens,
       estimated_cost_usd
FROM sessions
ORDER BY total_tokens DESC
LIMIT 10;
```


## 导出与清理

```python
# 导出单个 session 及其消息
data = db.export_session("sess_abc123")

# 导出所有 session（含消息），返回字典列表
all_data = db.export_all(source="cli")

# 删除旧 session（仅删除已结束的 session）
deleted_count = db.prune_sessions(older_than_days=90)
deleted_count = db.prune_sessions(older_than_days=30, source="telegram")

# 清除消息但保留 session 记录
db.clear_messages("sess_abc123")

# 删除 session 及其所有消息
db.delete_session("sess_abc123")
```


## 数据库位置

默认路径：`~/.hermes/state.db`

该路径由 `hermes_constants.get_hermes_home()` 解析得出，默认为 `~/.hermes/`，
也可通过环境变量 `HERMES_HOME` 自定义。

数据库文件、WAL 文件（`state.db-wal`）及共享内存文件（`state.db-shm`）均位于同一目录下。
