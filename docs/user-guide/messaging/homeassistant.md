---
title: "Home Assistant 集成"
---
# Home Assistant 集成

Hermes Agent 通过两种方式与 [Home Assistant](https://www.home-assistant.io/) 集成：

1. **网关平台** — 通过 WebSocket 订阅实时状态变化并响应事件
2. **智能家居工具** — 四个可供 LLM 调用的工具，通过 REST API 查询和控制设备

## 配置

### 1. 创建长期访问 Token

1. 打开你的 Home Assistant 实例
2. 进入**个人资料**（点击侧边栏中的用户名）
3. 向下滚动至**长期访问 Token**
4. 点击**创建 Token**，命名为 "Hermes Agent" 等
5. 复制 Token

### 2. 配置环境变量

```bash
# 添加至 ~/.hermes/.env

# 必填：你的长期访问 Token
HASS_TOKEN=your-long-lived-access-token

# 可选：HA URL（默认：http://homeassistant.local:8123）
HASS_URL=http://192.168.1.100:8123
```

:::info
设置 `HASS_TOKEN` 后，`homeassistant` 工具集将自动启用。网关平台和设备控制工具均通过这一个 Token 激活。
:::

### 3. 启动网关

```bash
hermes gateway
```

Home Assistant 将作为已连接平台出现，与其他消息平台（Telegram、Discord 等）并列显示。

## 可用工具

Hermes Agent 注册了四个用于智能家居控制的工具：

### `ha_list_entities`

列出 Home Assistant 实体，可选择按域或区域过滤。

**参数：**
- `domain` *（可选）* — 按实体域过滤：`light`、`switch`、`climate`、`sensor`、`binary_sensor`、`cover`、`fan`、`media_player` 等
- `area` *（可选）* — 按区域/房间名称过滤（与友好名称匹配）：`living room`、`kitchen`、`bedroom` 等

**示例：**
```
List all lights in the living room
```

返回实体 ID、状态及友好名称。

### `ha_get_state`

获取单个实体的详细状态，包括所有属性（亮度、颜色、温度设定值、传感器读数等）。

**参数：**
- `entity_id` *（必填）* — 要查询的实体，例如 `light.living_room`、`climate.thermostat`、`sensor.temperature`

**示例：**
```
What's the current state of climate.thermostat?
```

返回：状态、所有属性、最后变更/更新时间戳。

### `ha_list_services`

列出可用于设备控制的服务（动作），显示每种设备类型可执行的操作及其接受的参数。

**参数：**
- `domain` *（可选）* — 按域过滤，例如 `light`、`climate`、`switch`

**示例：**
```
What services are available for climate devices?
```

### `ha_call_service`

调用 Home Assistant 服务以控制设备。

**参数：**
- `domain` *（必填）* — 服务域：`light`、`switch`、`climate`、`cover`、`media_player`、`fan`、`scene`、`script`
- `service` *（必填）* — 服务名称：`turn_on`、`turn_off`、`toggle`、`set_temperature`、`set_hvac_mode`、`open_cover`、`close_cover`、`set_volume_level`
- `entity_id` *（可选）* — 目标实体，例如 `light.living_room`
- `data` *（可选）* — 以 JSON 对象形式提供的附加参数

**示例：**

```
Turn on the living room lights
→ ha_call_service(domain="light", service="turn_on", entity_id="light.living_room")
```

```
Set the thermostat to 22 degrees in heat mode
→ ha_call_service(domain="climate", service="set_temperature",
    entity_id="climate.thermostat", data={"temperature": 22, "hvac_mode": "heat"})
```

```
Set living room lights to blue at 50% brightness
→ ha_call_service(domain="light", service="turn_on",
    entity_id="light.living_room", data={"brightness": 128, "color_name": "blue"})
```

## 网关平台：实时事件

Home Assistant 网关适配器通过 WebSocket 连接，并订阅 `state_changed` 事件。当设备状态发生变化且匹配过滤规则时，该事件将作为消息转发给智能体。

### 事件过滤

:::caution
必须配置事件过滤

默认情况下，**不转发任何事件**。必须至少配置 `watch_domains`、`watch_entities` 或 `watch_all` 之一才能接收事件。若未设置过滤规则，启动时将记录警告日志，且所有状态变更将被静默丢弃。
:::

在 `~/.hermes/config.yaml` 中 Home Assistant 平台的 `extra` 部分配置智能体接收的事件：

```yaml
platforms:
  homeassistant:
    enabled: true
    extra:
      watch_domains:
        - climate
        - binary_sensor
        - alarm_control_panel
        - light
      watch_entities:
        - sensor.front_door_battery
      ignore_entities:
        - sensor.uptime
        - sensor.cpu_usage
        - sensor.memory_usage
      cooldown_seconds: 30
```

| 设置 | 默认值 | 描述 |
|------|--------|------|
| `watch_domains` | *（无）* | 仅监听这些实体域（如 `climate`、`light`、`binary_sensor`） |
| `watch_entities` | *（无）* | 仅监听这些特定实体 ID |
| `watch_all` | `false` | 设为 `true` 以接收**所有**状态变更（大多数场景不推荐） |
| `ignore_entities` | *（无）* | 始终忽略这些实体（在域/实体过滤之前生效） |
| `cooldown_seconds` | `30` | 同一实体两次事件之间的最短间隔秒数 |

:::tip
从少量域开始——`climate`、`binary_sensor` 和 `alarm_control_panel` 覆盖了最常用的自动化场景。按需添加更多域。使用 `ignore_entities` 屏蔽高频噪声传感器，如 CPU 温度或运行时间计数器。
:::

### 事件格式化

状态变更将根据域格式化为可读消息：

| 域 | 格式 |
|----|------|
| `climate` | "HVAC mode changed from 'off' to 'heat' (current: 21, target: 23)" |
| `sensor` | "changed from 21°C to 22°C" |
| `binary_sensor` | "triggered" / "cleared" |
| `light`、`switch`、`fan` | "turned on" / "turned off" |
| `alarm_control_panel` | "alarm state changed from 'armed_away' to 'triggered'" |
| *（其他）* | "changed from 'old' to 'new'" |

### 智能体响应

智能体发出的消息以 **Home Assistant 持久通知**形式送达（通过 `persistent_notification.create`），显示在 HA 通知面板中，标题为 "Hermes Agent"。

### 连接管理

- **WebSocket**：30 秒心跳，用于实时事件
- **自动重连**：退避策略 5s → 10s → 30s → 60s
- **REST API**：用于出站通知（独立会话，避免与 WebSocket 冲突）
- **授权** — HA 事件始终已授权（无需用户白名单，`HASS_TOKEN` 已对连接进行身份验证）

## 安全性

Home Assistant 工具强制执行以下安全限制：

:::caution
以下服务域已被**封锁**，以防止在 HA 主机上执行任意代码：

- `shell_command` — 任意 Shell 命令
- `command_line` — 执行命令的传感器/开关
- `python_script` — 脚本化 Python 执行
- `pyscript` — 更广泛的脚本集成
- `hassio` — 插件控制、主机关机/重启
- `rest_command` — 从 HA 服务器发起的 HTTP 请求（SSRF 向量）

尝试调用这些域中的服务将返回错误。
:::

实体 ID 须通过正则表达式 `^[a-z_][a-z0-9_]*\.[a-z0-9_]+$` 验证，以防止注入攻击。

## 示例自动化

### 晨间例程

```
用户：开始我的晨间例程

智能体：
1. ha_call_service(domain="light", service="turn_on",
     entity_id="light.bedroom", data={"brightness": 128})
2. ha_call_service(domain="climate", service="set_temperature",
     entity_id="climate.thermostat", data={"temperature": 22})
3. ha_call_service(domain="media_player", service="turn_on",
     entity_id="media_player.kitchen_speaker")
```

### 安全检查

```
用户：房子安全吗？

智能体：
1. ha_list_entities(domain="binary_sensor")
     → 检查门窗传感器
2. ha_get_state(entity_id="alarm_control_panel.home")
     → 检查报警状态
3. ha_list_entities(domain="lock")
     → 检查门锁状态
4. 报告："所有门已关闭，报警器处于 armed_away 状态，所有锁已锁定。"
```

### 响应式自动化（通过网关事件）

当作为网关平台连接时，智能体可以对事件作出响应：

```
[Home Assistant] Front Door: triggered (was cleared)

智能体自动执行：
1. ha_get_state(entity_id="binary_sensor.front_door")
2. ha_call_service(domain="light", service="turn_on",
     entity_id="light.hallway")
3. 发送通知："前门已开启，走廊灯已打开。"
```
