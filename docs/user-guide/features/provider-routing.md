---
title: "提供商路由"
---
# 提供商路由

使用 [OpenRouter](https://openrouter.ai) 作为 LLM 提供商时，Hermes Agent 支持**提供商路由**——对底层 AI 提供商进行精细控制，包括哪些提供商可以处理请求、以什么优先级排列。

OpenRouter 将请求路由到多个提供商（如 Anthropic、Google、AWS Bedrock、Together AI 等）。提供商路由让您能够针对成本、速度、质量进行优化，或强制指定特定提供商要求。

## 配置

在 `~/.hermes/config.yaml` 中添加 `provider_routing` 配置段：

```yaml
provider_routing:
  sort: "price"           # 提供商的排序方式
  only: []                # 白名单：仅使用这些提供商
  ignore: []              # 黑名单：永不使用这些提供商
  order: []               # 明确指定提供商优先级顺序
  require_parameters: false  # 仅使用支持所有参数的提供商
  data_collection: null   # 控制数据收集（"allow" 或 "deny"）
```

:::info
提供商路由仅在使用 OpenRouter 时生效，对直连提供商（如直接连接 Anthropic API）无效。
:::

## 选项

### `sort`

控制 OpenRouter 对可用提供商的排序方式。

| 值 | 说明 |
|-------|-------------|
| `"price"` | 优先选择最低价提供商 |
| `"throughput"` | 优先选择每秒 token 数最高的提供商 |
| `"latency"` | 优先选择首 token 响应时间最短的提供商 |

```yaml
provider_routing:
  sort: "price"
```

### `only`

提供商名称白名单。设置后，**仅**使用列出的提供商，其余全部排除。

```yaml
provider_routing:
  only:
    - "Anthropic"
    - "Google"
```

### `ignore`

提供商名称黑名单。这些提供商**永远不会**被使用，即使它们提供最低价或最快速度也不例外。

```yaml
provider_routing:
  ignore:
    - "Together"
    - "DeepInfra"
```

### `order`

按照列表顺序优先选用提供商，未列出的提供商作为回退选项。

```yaml
provider_routing:
  order:
    - "Anthropic"
    - "Google"
    - "AWS Bedrock"
```

### `require_parameters`

设为 `true` 时，OpenRouter 仅将请求路由到支持请求中**所有**参数（如 `temperature`、`top_p`、`tools` 等）的提供商，避免参数被静默丢弃。

```yaml
provider_routing:
  require_parameters: true
```

### `data_collection`

控制提供商是否可将您的提示词用于训练。可选值为 `"allow"` 或 `"deny"`。

```yaml
provider_routing:
  data_collection: "deny"
```

## 实用示例

### 优化成本

路由到价格最低的可用提供商，适合高频使用和开发场景：

```yaml
provider_routing:
  sort: "price"
```

### 优化速度

优先选择低延迟提供商，适合交互式场景：

```yaml
provider_routing:
  sort: "latency"
```

### 优化吞吐量

适合长文本生成场景，每秒 token 数在此类场景中尤为关键：

```yaml
provider_routing:
  sort: "throughput"
```

### 锁定特定提供商

确保所有请求都经由特定提供商处理，保证一致性：

```yaml
provider_routing:
  only:
    - "Anthropic"
```

### 排除特定提供商

排除不希望使用的提供商（例如出于数据隐私考虑）：

```yaml
provider_routing:
  ignore:
    - "Together"
    - "Lepton"
  data_collection: "deny"
```

### 指定优先顺序并设置回退

优先尝试首选提供商，不可用时回退到其他提供商：

```yaml
provider_routing:
  order:
    - "Anthropic"
    - "Google"
  require_parameters: true
```

## 工作原理

提供商路由偏好通过每次 API 调用中的 `extra_body.provider` 字段传递给 OpenRouter API，适用于以下两种模式：

- **CLI 模式** — 配置于 `~/.hermes/config.yaml`，启动时加载
- **网关模式** — 同一配置文件，网关启动时加载

路由配置从 `config.yaml` 读取，并在创建 `AIAgent` 时作为参数传入：

```
providers_allowed  ← 来自 provider_routing.only
providers_ignored  ← 来自 provider_routing.ignore
providers_order    ← 来自 provider_routing.order
provider_sort      ← 来自 provider_routing.sort
provider_require_parameters ← 来自 provider_routing.require_parameters
provider_data_collection    ← 来自 provider_routing.data_collection
```

:::tip
可以组合使用多个选项。例如，按价格排序、排除特定提供商，并要求参数完整支持：

```yaml
provider_routing:
  sort: "price"
  ignore: ["Together"]
  require_parameters: true
  data_collection: "deny"
```
:::

## 默认行为

未配置 `provider_routing` 段时（默认情况），OpenRouter 使用其自身的默认路由逻辑，通常会自动在成本和可用性之间取得平衡。

> 💡 **提示 — 提供商路由 vs. 备用提供商**：提供商路由控制 **OpenRouter 内部的子提供商**如何处理请求。若需要在主模型失败时自动切换到完全不同的提供商，请参阅[备用提供商](/user-guide/features/fallback-providers)。
