---
title: "凭证池"
---
# 凭证池

凭证池允许你为同一个 provider 注册多个 API key 或 OAuth token。当某个 key 触发速率限制或计费配额时，Hermes 会自动轮换到下一个可用 key，在不切换 provider 的情况下保持 session 持续运行。

这与[备用 provider](/user-guide/features/fallback-providers)不同——备用 provider 会切换到*另一个* provider。凭证池是同一 provider 内的 key 轮换；备用 provider 是跨 provider 的故障转移。系统优先尝试池中的 key——只有当池中所有 key 都耗尽后，才会激活备用 provider。

## 工作原理

```
你的请求
  → 从池中选取 key（round_robin / least_used / fill_first / random）
  → 发送到 provider
  → 遇到 429 速率限制？
      → 对同一 key 重试一次（短暂波动）
      → 第二次 429 → 轮换到下一个池中的 key
      → 所有 key 已耗尽 → 切换到 fallback_model（其他 provider）
  → 遇到 402 计费错误？
      → 立即轮换到下一个池中的 key（冷却 24 小时）
  → 遇到 401 认证过期？
      → 尝试刷新 token（OAuth）
      → 刷新失败 → 轮换到下一个池中的 key
  → 成功 → 正常继续
```

## 快速开始

如果你已在 `.env` 中设置了 API key，Hermes 会自动将其识别为单 key 池。若要充分利用池化功能，可添加更多 key：

```bash
# 添加第二个 OpenRouter key
hermes auth add openrouter --api-key sk-or-v1-your-second-key

# 添加第二个 Anthropic key
hermes auth add anthropic --type api-key --api-key sk-ant-api03-your-second-key

# 添加 Anthropic OAuth 凭证（Claude Code 订阅）
hermes auth add anthropic --type oauth
# 将在浏览器中打开 OAuth 登录页面
```

查看你的凭证池：

```bash
hermes auth list
```

输出示例：
```
openrouter (2 credentials):
  #1  OPENROUTER_API_KEY   api_key env:OPENROUTER_API_KEY ←
  #2  backup-key           api_key manual

anthropic (3 credentials):
  #1  hermes_pkce          oauth   hermes_pkce ←
  #2  claude_code          oauth   claude_code
  #3  ANTHROPIC_API_KEY    api_key env:ANTHROPIC_API_KEY
```

`←` 标记当前正在使用的凭证。

## 交互式管理

不带子命令运行 `hermes auth`，进入交互式向导：

```bash
hermes auth
```

该向导会显示完整的池状态，并提供操作菜单：

```
What would you like to do?
  1. Add a credential
  2. Remove a credential
  3. Reset cooldowns for a provider
  4. Set rotation strategy for a provider
  5. Exit
```

对于同时支持 API key 和 OAuth 的 provider（Anthropic、Nous、Codex），添加流程会询问凭证类型：

```
anthropic supports both API keys and OAuth login.
  1. API key (paste a key from the provider dashboard)
  2. OAuth login (authenticate via browser)
Type [1/2]:
```

## CLI 命令

| 命令 | 说明 |
|------|------|
| `hermes auth` | 交互式凭证池管理向导 |
| `hermes auth list` | 显示所有池和凭证 |
| `hermes auth list <provider>` | 显示指定 provider 的凭证池 |
| `hermes auth add <provider>` | 添加凭证（交互式选择类型和 key） |
| `hermes auth add <provider> --type api-key --api-key <key>` | 非交互式添加 API key |
| `hermes auth add <provider> --type oauth` | 通过浏览器登录添加 OAuth 凭证 |
| `hermes auth remove <provider> <index>` | 按 1-based 序号删除凭证 |
| `hermes auth reset <provider>` | 清除所有冷却/耗尽状态 |

## 轮换策略

可通过 `hermes auth` → "Set rotation strategy" 配置，或直接在 `config.yaml` 中设置：

```yaml
credential_pool_strategies:
  openrouter: round_robin
  anthropic: least_used
```

| 策略 | 行为 |
|------|------|
| `fill_first`（默认） | 持续使用第一个可用 key，直到耗尽，再切换到下一个 |
| `round_robin` | 均匀循环所有 key，每次选取后轮换 |
| `least_used` | 始终选取请求次数最少的 key |
| `random` | 从可用 key 中随机选取 |

## 错误恢复

凭证池针对不同错误采用不同的处理方式：

| 错误 | 行为 | 冷却时间 |
|------|------|----------|
| **429 速率限制** | 对同一 key 重试一次（短暂波动）。连续第二次 429 则轮换到下一个 key | 1 小时 |
| **402 计费/配额不足** | 立即轮换到下一个 key | 24 小时 |
| **401 认证过期** | 优先尝试刷新 OAuth token，仅在刷新失败时才轮换 | — |
| **所有 key 已耗尽** | 若已配置 `fallback_model`，则切换至备用 provider | — |

`has_retried_429` 标志在每次 API 调用成功后重置，因此单次短暂的 429 不会触发轮换。

## 自定义端点池

兼容 OpenAI 接口的自定义端点（Together.ai、RunPod、本地服务器等）拥有独立的凭证池，以 `config.yaml` 中 `custom_providers` 里的端点名称作为池的标识符。

通过 `hermes model` 设置自定义端点时，系统会自动生成名称，如"Together.ai"或"Local (localhost:8080)"，该名称即为池的 key。

```bash
# 通过 hermes model 设置自定义端点后：
hermes auth list
# 输出：
#   Together.ai (1 credential):
#     #1  config key    api_key config:Together.ai ←

# 为同一端点添加第二个 key：
hermes auth add Together.ai --api-key sk-together-second-key
```

自定义端点的凭证池存储在 `auth.json` 的 `credential_pool` 下，使用 `custom:` 前缀：

```json
{
  "credential_pool": {
    "openrouter": [...],
    "custom:together.ai": [...]
  }
}
```

## 自动发现

Hermes 在启动时会自动从多个来源发现凭证并初始化凭证池：

| 来源 | 示例 | 自动载入？ |
|------|------|-----------|
| 环境变量 | `OPENROUTER_API_KEY`、`ANTHROPIC_API_KEY` | 是 |
| OAuth token（auth.json） | Codex device code、Nous device code | 是 |
| Claude Code 凭证 | `~/.claude/.credentials.json` | 是（Anthropic） |
| Hermes PKCE OAuth | `~/.hermes/auth.json` | 是（Anthropic） |
| 自定义端点配置 | `config.yaml` 中的 `model.api_key` | 是（自定义端点） |
| 手动条目 | 通过 `hermes auth add` 添加 | 持久化至 auth.json |

自动载入的条目在每次加载凭证池时更新——若删除某个环境变量，对应的池条目会自动清除。通过 `hermes auth add` 手动添加的条目永远不会被自动清除。

## 委托与子 Agent 共享

当 agent 通过 `delegate_task` 创建子 agent 时，父 agent 的凭证池会自动共享给子 agent：

- **相同 provider** — 子 agent 继承父 agent 的完整凭证池，在触发速率限制时可进行 key 轮换
- **不同 provider** — 子 agent 加载该 provider 自身的凭证池（如已配置）
- **未配置凭证池** — 子 agent 回退到继承的单个 API key

这意味着子 agent 无需额外配置，即可享有与父 agent 相同的速率限制容错能力。按任务分配凭证租约，确保多个子 agent 并发轮换 key 时不会相互冲突。

## 线程安全

凭证池对所有状态变更操作（`select()`、`mark_exhausted_and_rotate()`、`try_refresh_current()`、`mark_used()`）均使用线程锁，确保 gateway 同时处理多个 chat session 时的并发安全性。

## 架构

完整数据流程图请参见仓库中的 [`docs/credential-pool-flow.excalidraw`](https://excalidraw.com/#json=2Ycqhqpi6f12E_3ITyiwh,c7u9jSt5BwrmiVzHGbm87g)。

凭证池集成在 provider 解析层：

1. **`agent/credential_pool.py`** — 池管理器：存储、选取、轮换、冷却时间
2. **`hermes_cli/auth_commands.py`** — CLI 命令与交互式向导
3. **`hermes_cli/runtime_provider.py`** — 感知凭证池的凭证解析逻辑
4. **`run_agent.py`** — 错误恢复：429/402/401 → 池轮换 → 备用 provider

## 存储

池状态存储在 `~/.hermes/auth.json` 的 `credential_pool` 键下：

```json
{
  "version": 1,
  "credential_pool": {
    "openrouter": [
      {
        "id": "abc123",
        "label": "OPENROUTER_API_KEY",
        "auth_type": "api_key",
        "priority": 0,
        "source": "env:OPENROUTER_API_KEY",
        "access_token": "sk-or-v1-...",
        "last_status": "ok",
        "request_count": 142
      }
    ]
  },
}
```

轮换策略存储在 `config.yaml`（而非 `auth.json`）中：

```yaml
credential_pool_strategies:
  openrouter: round_robin
  anthropic: least_used
```
