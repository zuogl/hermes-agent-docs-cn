---
title: "Docker"
---
# Hermes Agent — Docker

Docker 与 Hermes Agent 有两种不同的交互方式：

1. **在 Docker 中运行 Hermes** — agent 本身在容器内运行（本页的主要内容）
2. **Docker 作为终端后端** — agent 在宿主机上运行，但在 Docker 沙盒内执行命令（详见 [配置 → terminal.backend](/user-guide/configuration)）

本页介绍第一种方式。容器将所有用户数据（配置、API 密钥、会话、技能、记忆）存储在单个目录中，从宿主机挂载至 `/opt/data`。镜像本身是无状态的，拉取新版本即可升级，不会丢失任何配置。

## 快速开始

如果你是第一次运行 Hermes Agent，先在宿主机上创建数据目录，然后以交互方式启动容器运行设置向导：

```sh
mkdir -p ~/.hermes
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent setup
```

进入设置向导后，向导会提示你输入 API 密钥并将其写入 `~/.hermes/.env`。这个操作只需执行一次。强烈建议此时为网关配置好聊天系统（Telegram、Discord 等），以便网关正常使用。

## 以网关模式运行

配置完成后，在后台将容器作为持久化网关运行（支持 Telegram、Discord、Slack、WhatsApp 等）：

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

## 交互式运行（CLI 聊天）

针对已有数据目录开启交互式聊天会话：

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent
```

## 持久化卷

`/opt/data` 卷是所有 Hermes 状态的唯一数据来源，映射到宿主机的 `~/.hermes/` 目录，包含以下内容：

| 路径 | 内容 |
|------|------|
| `.env` | API 密钥和密钥信息 |
| `config.yaml` | 所有 Hermes 配置 |
| `SOUL.md` | Agent 个性/身份设定 |
| `sessions/` | 对话历史 |
| `memories/` | 持久化记忆存储 |
| `skills/` | 已安装的技能 |
| `cron/` | 定时任务定义 |
| `hooks/` | 事件钩子 |
| `logs/` | 运行日志 |
| `skins/` | 自定义 CLI 皮肤 |

:::caution
不要同时将两个 Hermes 容器指向同一数据目录——会话文件和记忆存储不支持并发访问。
:::

## 环境变量转发

API 密钥从容器内的 `/opt/data/.env` 读取。也可以直接传入环境变量：

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e OPENAI_API_KEY="sk-..." \
  nousresearch/hermes-agent
```

`-e` 参数会覆盖 `.env` 文件中的同名值。在不希望将密钥写入磁盘的 CI/CD 或密钥管理集成场景中很有用。

## Docker Compose 示例

对于持久化网关部署，使用 `docker-compose.yaml` 更为便捷：

```yaml
version: "3.8"
services:
  hermes:
    image: nousresearch/hermes-agent:latest
    container_name: hermes
    restart: unless-stopped
    command: gateway run
    volumes:
      - ~/.hermes:/opt/data
    # 取消注释可直接传入环境变量，而不使用 .env 文件：
    # environment:
    #   - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    #   - OPENAI_API_KEY=${OPENAI_API_KEY}
    #   - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2.0"
```

使用 `docker compose up -d` 启动，使用 `docker compose logs -f hermes` 查看日志。

## 资源限制

Hermes 容器需要适中的资源。推荐最低配置：

| 资源 | 最低 | 推荐 |
|------|------|------|
| 内存 | 1 GB | 2–4 GB |
| CPU | 1 核 | 2 核 |
| 磁盘（数据卷） | 500 MB | 2+ GB（随会话/技能增长） |

浏览器自动化（Playwright/Chromium）是最消耗内存的功能。不需要浏览器工具时，1 GB 即可满足需求。启用浏览器工具时，请至少分配 2 GB。

通过以下命令设置 Docker 资源限制：

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  --memory=4g --cpus=2 \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

## Dockerfile 说明

官方镜像基于 `debian:13.4`，包含以下内容：

- Python 3 及所有 Hermes 依赖（`pip install -e ".[all]"`）
- Node.js + npm（用于浏览器自动化和 WhatsApp 桥接）
- 带 Chromium 的 Playwright（`npx playwright install --with-deps chromium`）
- ripgrep 和 ffmpeg 系统工具
- WhatsApp 桥接（`scripts/whatsapp-bridge/`）

入口脚本（`docker/entrypoint.sh`）在首次运行时初始化数据卷：

- 创建目录结构（`sessions/`、`memories/`、`skills/` 等）
- 若不存在 `.env`，则将 `.env.example` 复制为 `.env`
- 若缺少默认 `config.yaml`，则复制默认配置
- 若缺少默认 `SOUL.md`，则复制默认文件
- 使用基于 manifest 的方式同步随附技能（保留用户自定义修改）
- 最后以你传入的参数运行 `hermes`

## 升级

拉取最新镜像并重建容器，你的数据目录不会受到影响：

```sh
docker pull nousresearch/hermes-agent:latest
docker rm -f hermes
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

使用 Docker Compose 升级：

```sh
docker compose pull
docker compose up -d
```

## 技能与凭证文件

将 Docker 用作执行环境时（非上述运行方式，而是 agent 在 Docker 沙盒内执行命令时），Hermes 会自动将技能目录（`~/.hermes/skills/`）及技能声明的凭证文件以只读方式挂载（bind mount）到容器中。这意味着技能脚本、模板和引用文件无需手动配置即可在沙盒内使用。

SSH 和 Modal 后端的同步机制类似——技能和凭证文件会在每次命令执行前通过 rsync 或 Modal mount API 上传。

## 故障排查

### 容器立即退出

检查日志：`docker logs hermes`。常见原因：

- `.env` 文件缺失或无效——先以交互方式运行，完成设置
- 端口冲突（如有暴露端口）

### "Permission denied" 错误

容器默认以 root 运行。如果宿主机的 `~/.hermes/` 由非 root 用户创建，权限通常不会有问题。若仍报错，确保数据目录可写：

```sh
chmod -R 755 ~/.hermes
```

### 浏览器工具无法使用

Playwright 需要共享内存。在 Docker run 命令中添加 `--shm-size=1g`：

```sh
docker run -d \
  --name hermes \
  --shm-size=1g \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

### 网关在网络故障后无法重连

`--restart unless-stopped` 参数可处理大多数瞬时故障。如果网关卡住，重启容器：

```sh
docker restart hermes
```

### 检查容器健康状态

```sh
docker logs --tail 50 hermes          # 查看最近日志
docker exec hermes hermes version     # 验证版本
docker stats hermes                    # 查看资源使用情况
```
