---
title: "Nix & NixOS 安装配置"
---
# Nix & NixOS 安装配置

Hermes Agent 提供了一个 Nix flake，支持三种集成级别：

| 级别 | 适用人群 | 你会得到什么 |
|------|---------|-------------|
| **`nix run` / `nix profile install`** | 所有 Nix 用户（macOS、Linux） | 预编译好的二进制文件，包含全部依赖——之后按标准 CLI 工作流使用即可 |
| **NixOS module（原生模式）** | NixOS 服务器部署 | 声明式配置、加固的 systemd 服务、托管的密钥管理 |
| **NixOS module（容器模式）** | 需要自行修改环境的智能体 | 包含上述所有功能，外加一个持久化的 Ubuntu 容器，智能体可以在其中执行 `apt`/`pip`/`npm install` |

:::info
与标准安装方式的区别
`curl | bash` 安装脚本会自行管理 Python、Node 和各种依赖。Nix flake 替代了所有这些——每个 Python 依赖都是由 [uv2nix](https://github.com/pyproject-nix/uv2nix) 构建的 Nix derivation，运行时工具（Node.js、git、ripgrep、ffmpeg）被封装到二进制文件的 PATH 中。不需要运行时 pip，不需要激活 venv，不需要 `npm install`。

**对于非 NixOS 用户**，这只改变了安装步骤。之后的一切操作（`hermes setup`、`hermes gateway install`、编辑配置）与标准安装完全一致。

**对于 NixOS module 用户**，整个生命周期都不同：配置写在 `configuration.nix` 中，密钥通过 sops-nix/agenix 管理，服务是一个 systemd 单元，CLI 配置命令会被阻止。你像管理其他 NixOS 服务一样管理 Hermes。
:::

## 前置条件

- **启用了 flakes 的 Nix** — 推荐使用 [Determinate Nix](https://install.determinate.systems)（默认启用 flakes）
- 你要使用的服务的 **API 密钥**（至少需要一个 OpenRouter 或 Anthropic 密钥）

---

## 快速开始（所有 Nix 用户）

无需克隆仓库。Nix 会自动拉取、构建并运行一切：

```bash
# 直接运行（首次使用时构建，之后使用缓存）
nix run github:NousResearch/hermes-agent -- setup
nix run github:NousResearch/hermes-agent -- chat

# 或者持久化安装
nix profile install github:NousResearch/hermes-agent
hermes setup
hermes chat
```

执行 `nix profile install` 后，`hermes`、`hermes-agent` 和 `hermes-acp` 会出现在你的 PATH 中。接下来的工作流与[标准安装](/getting-started/installation)完全一致——`hermes setup` 引导你完成提供商选择，`hermes gateway install` 设置 launchd（macOS）或 systemd 用户服务，配置文件位于 `~/.hermes/`。

**从本地克隆构建**

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
nix build
./result/bin/hermes setup
```

---

## NixOS Module

该 flake 导出了 `nixosModules.default`——一个完整的 NixOS 服务模块，可以声明式地管理用户创建、目录结构、配置生成、密钥、文档和服务生命周期。

:::note
此模块需要 NixOS。非 NixOS 系统（macOS、其他 Linux 发行版）请使用 `nix profile install` 和上述标准 CLI 工作流。
:::

### 添加 Flake Input

```nix
# /etc/nixos/flake.nix（或你的系统 flake）
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    hermes-agent.url = "github:NousResearch/hermes-agent";
  };

  outputs = { nixpkgs, hermes-agent, ... }: {
    nixosConfigurations.your-host = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        hermes-agent.nixosModules.default
        ./configuration.nix
      ];
    };
  };
}
```

### 最小配置

```nix
# configuration.nix
{ config, ... }: {
  services.hermes-agent = {
    enable = true;
    settings.model.default = "anthropic/claude-sonnet-4";
    environmentFiles = [ config.sops.secrets."hermes-env".path ];
    addToSystemPackages = true;
  };
}
```

就这些。`nixos-rebuild switch` 会创建 `hermes` 用户、生成 `config.yaml`、配置密钥并启动网关（gateway）——一个长期运行的服务，用于将智能体连接到消息平台（Telegram、Discord 等）并监听传入消息。

:::caution
必须配置密钥
上面的 `environmentFiles` 一行假设你已经配置了 [sops-nix](https://github.com/Mic92/sops-nix) 或 [agenix](https://github.com/ryantm/agenix)。该文件应至少包含一个 LLM 提供商密钥（例如 `OPENROUTER_API_KEY=sk-or-...`）。完整设置请参阅[密钥管理](#密钥管理)。如果你还没有密钥管理器，可以先用一个普通文件作为起点——只需确保它不是所有人可读的：

```bash
echo "OPENROUTER_API_KEY=sk-or-your-key" | sudo install -m 0600 -o hermes /dev/stdin /var/lib/hermes/env
```

```nix
services.hermes-agent.environmentFiles = [ "/var/lib/hermes/env" ];
```
:::

:::tip
addToSystemPackages
设置 `addToSystemPackages = true` 有两个效果：将 `hermes` CLI 添加到系统 PATH，**并且**在系统范围内设置 `HERMES_HOME`，使交互式 CLI 与网关服务共享状态（会话、技能、定时任务）。如果不设置，在 shell 中运行 `hermes` 会创建一个独立的 `~/.hermes/` 目录。
:::

### 验证是否正常工作

执行 `nixos-rebuild switch` 后，检查服务是否在运行：

```bash
# 检查服务状态
systemctl status hermes-agent

# 查看日志（Ctrl+C 停止）
journalctl -u hermes-agent -f

# 如果 addToSystemPackages 为 true，测试 CLI
hermes version
hermes config       # 显示生成的配置
```

### 选择部署模式

该模块支持两种模式，通过 `container.enable` 控制：

| | **原生模式**（默认） | **容器模式** |
|---|---|---|
| 运行方式 | 宿主机上的加固 systemd 服务 | 绑定挂载了 `/nix/store` 的持久化 Ubuntu 容器 |
| 安全性 | `NoNewPrivileges`、`ProtectSystem=strict`、`PrivateTmp` | 容器隔离，内部以非特权用户运行 |
| 智能体能否自行安装包 | 不能——只能使用 Nix 提供的 PATH 上的工具 | 可以——`apt`、`pip`、`npm` 安装的内容跨重启持久化 |
| 配置方式 | 相同 | 相同 |
| 适用场景 | 标准部署、最高安全性、可重现性 | 智能体需要运行时安装包、可变环境、实验性工具 |

启用容器模式只需添加一行：

```nix
{
  services.hermes-agent = {
    enable = true;
    container.enable = true;
    # ... 其余配置完全相同
  };
}
```

:::info
容器模式会通过 `mkDefault` 自动启用 `virtualisation.docker.enable`。如果你使用 Podman，请设置 `container.backend = "podman"` 并将 `virtualisation.docker.enable` 设为 `false`。
:::

---

## 配置

### 声明式设置

`settings` 选项接受任意 attrset，渲染为 `config.yaml`。它支持跨多个模块定义的深度合并（通过 `lib.recursiveUpdate`），因此你可以将配置拆分到不同文件中：

```nix
# base.nix
services.hermes-agent.settings = {
  model.default = "anthropic/claude-sonnet-4";
  toolsets = [ "all" ];
  terminal = { backend = "local"; timeout = 180; };
};

# personality.nix
services.hermes-agent.settings = {
  display = { compact = false; personality = "kawaii"; };
  memory = { memory_enabled = true; user_profile_enabled = true; };
};
```

两份配置会在求值时进行深度合并。Nix 中声明的键始终优先于磁盘上 `config.yaml` 中已有的键，但 **Nix 未涉及的用户自定义键会被保留**。也就是说，如果智能体或手动编辑添加了 `skills.disabled` 或 `streaming.enabled` 等键，它们会在 `nixos-rebuild switch` 后继续存在。

:::note
模型命名
`settings.model.default` 使用你的提供商所期望的模型标识符。使用 [OpenRouter](https://openrouter.ai)（默认）时，格式类似 `"anthropic/claude-sonnet-4"` 或 `"google/gemini-3-flash"`。如果你直接使用某个提供商（Anthropic、OpenAI），需要将 `settings.model.base_url` 指向其 API 并使用其原生模型 ID（例如 `"claude-sonnet-4-20250514"`）。未设置 `base_url` 时，Hermes 默认使用 OpenRouter。
:::

:::tip
查看可用配置项
运行 `nix build .#configKeys && cat result` 可以查看从 Python `DEFAULT_CONFIG` 提取的每个叶节点配置项。你可以将现有的 `config.yaml` 直接粘贴到 `settings` attrset 中——结构完全一一对应。
:::

**完整示例：所有常用自定义设置**

```nix
{ config, ... }: {
  services.hermes-agent = {
    enable = true;
    container.enable = true;

    # ── 模型 ──────────────────────────────────────────────────────────
    settings = {
      model = {
        base_url = "https://openrouter.ai/api/v1";
        default = "anthropic/claude-opus-4.6";
      };
      toolsets = [ "all" ];
      max_turns = 100;
      terminal = { backend = "local"; cwd = "."; timeout = 180; };
      compression = {
        enabled = true;
        threshold = 0.85;
        summary_model = "google/gemini-3-flash-preview";
      };
      memory = { memory_enabled = true; user_profile_enabled = true; };
      display = { compact = false; personality = "kawaii"; };
      agent = { max_turns = 60; verbose = false; };
    };

    # ── 密钥 ──────────────────────────────────────────────────────────
    environmentFiles = [ config.sops.secrets."hermes-env".path ];

    # ── 文档 ──────────────────────────────────────────────────────────
    documents = {
      "SOUL.md" = builtins.readFile /home/user/.hermes/SOUL.md;
      "USER.md" = ./documents/USER.md;
    };

    # ── MCP 服务器 ────────────────────────────────────────────────────
    mcpServers.filesystem = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-filesystem" "/data/workspace" ];
    };

    # ── 容器选项 ──────────────────────────────────────────────────────
    container = {
      image = "ubuntu:24.04";
      backend = "docker";
      extraVolumes = [ "/home/user/projects:/projects:rw" ];
      extraOptions = [ "--gpus" "all" ];
    };

    # ── 服务调优 ──────────────────────────────────────────────────────
    addToSystemPackages = true;
    extraArgs = [ "--verbose" ];
    restart = "always";
    restartSec = 5;
  };
}
```

### 备用方案：自带配置文件

如果你更愿意完全在 Nix 之外管理 `config.yaml`，可以使用 `configFile`：

```nix
services.hermes-agent.configFile = /etc/hermes/config.yaml;
```

这会完全绕过 `settings`——不合并、不生成。该文件在每次激活时原样复制到 `$HERMES_HOME/config.yaml`。

### 自定义速查表

Nix 用户最常自定义的配置项快速参考：

| 我想要... | 选项 | 示例 |
|---|---|---|
| 更改 LLM 模型 | `settings.model.default` | `"anthropic/claude-sonnet-4"` |
| 使用其他提供商端点 | `settings.model.base_url` | `"https://openrouter.ai/api/v1"` |
| 添加 API 密钥 | `environmentFiles` | `[ config.sops.secrets."hermes-env".path ]` |
| 赋予智能体个性 | `documents."SOUL.md"` | `builtins.readFile ./my-soul.md` |
| 添加 MCP 工具服务器 | `mcpServers.<name>` | 参阅 [MCP 服务器](#mcp-服务器) |
| 将宿主机目录挂载到容器 | `container.extraVolumes` | `[ "/data:/data:rw" ]` |
| 让容器访问 GPU | `container.extraOptions` | `[ "--gpus" "all" ]` |
| 使用 Podman 替代 Docker | `container.backend` | `"podman"` |
| 向服务 PATH 添加工具（仅原生模式） | `extraPackages` | `[ pkgs.pandoc pkgs.imagemagick ]` |
| 使用自定义基础镜像 | `container.image` | `"ubuntu:24.04"` |
| 覆盖 hermes 包 | `package` | `inputs.hermes-agent.packages.${system}.default.override { ... }` |
| 更改状态目录 | `stateDir` | `"/opt/hermes"` |
| 设置智能体工作目录 | `workingDirectory` | `"/home/user/projects"` |

---

## 密钥管理

> 🚫 **危险**：绝对不要将 API 密钥放在 `settings` 或 `environment` 中
> Nix 表达式中的值最终会进入 `/nix/store`，而该目录所有人可读。请始终使用 `environmentFiles` 配合密钥管理器。

`environment`（非敏感变量）和 `environmentFiles`（密钥文件）在激活时（`nixos-rebuild switch`）会被合并到 `$HERMES_HOME/.env` 中。Hermes 每次启动都会读取该文件，因此修改后只需 `systemctl restart hermes-agent` 即可生效——无需重建容器。

### sops-nix

```nix
{
  sops = {
    defaultSopsFile = ./secrets/hermes.yaml;
    age.keyFile = "/home/user/.config/sops/age/keys.txt";
    secrets."hermes-env" = { format = "yaml"; };
  };

  services.hermes-agent.environmentFiles = [
    config.sops.secrets."hermes-env".path
  ];
}
```

密钥文件包含键值对：

```yaml
# secrets/hermes.yaml（用 sops 加密）
hermes-env: |
    OPENROUTER_API_KEY=sk-or-...
    TELEGRAM_BOT_TOKEN=123456:ABC...
    ANTHROPIC_API_KEY=sk-ant-...
```

### agenix

```nix
{
  age.secrets.hermes-env.file = ./secrets/hermes-env.age;

  services.hermes-agent.environmentFiles = [
    config.age.secrets.hermes-env.path
  ];
}
```

### OAuth / 认证种子

对于需要 OAuth 的平台（例如 Discord），使用 `authFile` 在首次部署时注入凭据：

```nix
{
  services.hermes-agent = {
    authFile = config.sops.secrets."hermes/auth.json".path;
    # authFileForceOverwrite = true;  # 每次激活时覆盖
  };
}
```

只有当 `auth.json` 不存在时，才会复制该文件（除非设置了 `authFileForceOverwrite = true`）。运行时的 OAuth token 刷新结果写入状态目录，跨重建保留。

---

## 文档

`documents` 选项将文件安装到智能体的工作目录（即 `workingDirectory`，智能体将其视为自己的工作区）。Hermes 按约定查找特定文件名：

- **`SOUL.md`** — 智能体的系统提示词/个性设定。Hermes 在启动时读取此文件，将其作为持久化指令来塑造所有对话中的行为。
- **`USER.md`** — 关于智能体交互对象的上下文信息。
- 你放在这里的其他任何文件对智能体来说都是工作区文件。

```nix
{
  services.hermes-agent.documents = {
    "SOUL.md" = ''
      You are a helpful research assistant specializing in NixOS packaging.
      Always cite sources and prefer reproducible solutions.
    '';
    "USER.md" = ./documents/USER.md;  # 路径引用，从 Nix store 复制
  };
}
```

值可以是内联字符串或路径引用。文件在每次 `nixos-rebuild switch` 时安装。

---

## MCP 服务器

`mcpServers` 选项以声明式方式配置 [MCP（Model Context Protocol）](https://modelcontextprotocol.io)服务器。每个服务器使用 **stdio**（本地命令）或 **HTTP**（远程 URL）传输方式。

### Stdio 传输（本地服务器）

```nix
{
  services.hermes-agent.mcpServers = {
    filesystem = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-filesystem" "/data/workspace" ];
    };
    github = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-github" ];
      env.GITHUB_PERSONAL_ACCESS_TOKEN = "\${GITHUB_TOKEN}"; # 从 .env 解析
    };
  };
}
```

:::tip
`env` 值中的环境变量在运行时从 `$HERMES_HOME/.env` 解析。使用 `environmentFiles` 注入密钥——绝对不要将 token 直接写在 Nix 配置中。
:::

### HTTP 传输（远程服务器）

```nix
{
  services.hermes-agent.mcpServers.remote-api = {
    url = "https://mcp.example.com/v1/mcp";
    headers.Authorization = "Bearer \${MCP_REMOTE_API_KEY}";
    timeout = 180;
  };
}
```

### HTTP 传输 + OAuth

为使用 OAuth 2.1 的服务器设置 `auth = "oauth"`。Hermes 实现了完整的 PKCE 流程——元数据发现、动态客户端注册、token 交换和自动刷新。

```nix
{
  services.hermes-agent.mcpServers.my-oauth-server = {
    url = "https://mcp.example.com/mcp";
    auth = "oauth";
  };
}
```

Token 存储在 `$HERMES_HOME/mcp-tokens/<server>.json` 中，跨重启和重建持久化。

**在无头服务器上完成首次 OAuth 授权**

首次 OAuth 授权需要基于浏览器的同意流程。在无头部署环境中，Hermes 会将授权 URL 打印到标准输出/日志，而不是打开浏览器。

**方案 A：交互式引导** — 通过 `docker exec`（容器模式）或 `sudo -u hermes`（原生模式）运行一次授权流程：

```bash
# 容器模式
docker exec -it hermes-agent \
  hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth

# 原生模式
sudo -u hermes HERMES_HOME=/var/lib/hermes/.hermes \
  hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
```

容器使用 `--network=host`，因此 `127.0.0.1` 上的 OAuth 回调监听器可以从宿主机浏览器访问。

**方案 B：预注入 token** — 在工作站上完成授权流程，然后复制 token：

```bash
hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
scp ~/.hermes/mcp-tokens/my-oauth-server{,.client}.json \
    server:/var/lib/hermes/.hermes/mcp-tokens/
# 确保：chown hermes:hermes, chmod 0600
```

### 采样（服务器发起的 LLM 请求）

部分 MCP 服务器可以向智能体请求 LLM 补全：

```nix
{
  services.hermes-agent.mcpServers.analysis = {
    command = "npx";
    args = [ "-y" "analysis-server" ];
    sampling = {
      enabled = true;
      model = "google/gemini-3-flash";
      max_tokens_cap = 4096;
      timeout = 30;
      max_rpm = 10;
    };
  };
}
```

---

## 托管模式

当 Hermes 通过 NixOS module 运行时，以下 CLI 命令会被**阻止**，并显示一条错误信息指引你修改 `configuration.nix`：

| 被阻止的命令 | 原因 |
|---|---|
| `hermes setup` | 配置是声明式的——请修改 Nix 配置中的 `settings` |
| `hermes config edit` | 配置由 `settings` 生成 |
| `hermes config set <key> <value>` | 配置由 `settings` 生成 |
| `hermes gateway install` | systemd 服务由 NixOS 管理 |
| `hermes gateway uninstall` | systemd 服务由 NixOS 管理 |

这样可以防止 Nix 声明的配置与磁盘上的实际状态不一致。检测基于两个信号：

1. **`HERMES_MANAGED=true`** 环境变量 — 由 systemd 服务设置，对网关进程可见
2. **`.managed` 标记文件**，位于 `HERMES_HOME` 中 — 由激活脚本设置，对交互式 shell 可见（例如 `docker exec -it hermes-agent hermes config set ...` 同样会被阻止）

要修改配置，请编辑你的 Nix 配置并运行 `sudo nixos-rebuild switch`。

---

## 容器架构

:::info
本节仅在你使用 `container.enable = true` 时相关。原生模式部署请跳过。
:::

启用容器模式后，Hermes 在一个持久化的 Ubuntu 容器内运行，Nix 构建的二进制文件以只读方式从宿主机绑定挂载：

```
宿主机                                  容器
────                                   ─────────
/nix/store/...-hermes-agent-0.1.0 ──►  /nix/store/... (ro)
/var/lib/hermes/                   ──►  /data/          (rw)
  ├── current-package -> /nix/store/...   (符号链接，每次重建时更新)
  ├── .gc-root -> /nix/store/...          (防止 nix-collect-garbage 回收)
  ├── .container-identity                 (sha256 哈希，触发容器重建)
  ├── .hermes/                            (HERMES_HOME)
  │   ├── .env                            (从 environment + environmentFiles 合并)
  │   ├── config.yaml                     (Nix 生成，激活时深度合并)
  │   ├── .managed                        (标记文件)
  │   ├── state.db, sessions/, memories/  (运行时状态)
  │   └── mcp-tokens/                     (MCP 服务器的 OAuth token)
  ├── home/                               ──►  /home/hermes    (rw)
  └── workspace/                          (MESSAGING_CWD)
      ├── SOUL.md                         (来自 documents 选项)
      └── (智能体创建的文件)

容器可写层（apt/pip/npm）：              /usr, /usr/local, /tmp
```

Nix 构建的二进制文件能在 Ubuntu 容器内工作，是因为 `/nix/store` 被绑定挂载了进来——它自带解释器和所有依赖，不依赖容器的系统库。容器入口点通过 `current-package` 符号链接解析：`/data/current-package/bin/hermes gateway run --replace`。执行 `nixos-rebuild switch` 时，只更新符号链接——容器继续运行。

### 跨事件持久化情况

| 事件 | 容器是否重建？ | `/data`（状态） | `/home/hermes` | 可写层（`apt`/`pip`/`npm`） |
|---|---|---|---|---|
| `systemctl restart hermes-agent` | 否 | 保留 | 保留 | 保留 |
| `nixos-rebuild switch`（代码变更） | 否（更新符号链接） | 保留 | 保留 | 保留 |
| 宿主机重启 | 否 | 保留 | 保留 | 保留 |
| `nix-collect-garbage` | 否（有 GC root） | 保留 | 保留 | 保留 |
| 镜像变更（`container.image`） | **是** | 保留 | 保留 | **丢失** |
| 卷/选项变更 | **是** | 保留 | 保留 | **丢失** |
| `environment`/`environmentFiles` 变更 | 否 | 保留 | 保留 | 保留 |

容器仅在其**身份哈希**发生变化时才会重建。哈希覆盖的内容包括：schema 版本、镜像、`extraVolumes`、`extraOptions` 和入口点脚本。环境变量、设置、文档或 Hermes 包本身的变更**不会**触发重建。

:::caution
可写层丢失
当身份哈希发生变化（镜像升级、新增卷、新增容器选项）时，容器会被销毁并从 `container.image` 重新拉取创建。可写层中通过 `apt install`、`pip install` 或 `npm install` 安装的包会丢失。`/data` 和 `/home/hermes` 中的状态会保留（这些是绑定挂载）。

如果智能体依赖特定的包，建议将它们烘焙到自定义镜像中（`container.image = "my-registry/hermes-base:latest"`），或者在智能体的 SOUL.md 中编写安装脚本。
:::

### GC Root 保护

`preStart` 脚本会在 `${stateDir}/.gc-root` 创建一个 GC root，指向当前的 Hermes 包。这可以防止 `nix-collect-garbage` 删除正在运行的二进制文件。如果 GC root 意外损坏，重启服务即可重新创建。

---

## 开发

### Dev Shell

该 flake 提供了一个开发 shell，包含 Python 3.11、uv、Node.js 和所有运行时工具：

```bash
cd hermes-agent
nix develop

# Shell 提供：
#   - Python 3.11 + uv（首次进入时将依赖安装到 .venv）
#   - Node.js 20、ripgrep、git、openssh、ffmpeg 在 PATH 上
#   - 时间戳文件优化：如果依赖未变更，重新进入几乎是即时的

hermes setup
hermes chat
```

### direnv（推荐）

自带的 `.envrc` 会自动激活 dev shell：

```bash
cd hermes-agent
direnv allow    # 仅需一次
# 后续进入几乎是即时的（时间戳文件跳过依赖安装）
```

### Flake 检查

该 flake 包含构建时验证，可在 CI 和本地运行：

```bash
# 运行所有检查
nix flake check

# 单独运行各项检查
nix build .#checks.x86_64-linux.package-contents   # 二进制文件存在 + 版本号
nix build .#checks.x86_64-linux.entry-points-sync  # pyproject.toml ↔ Nix 包同步
nix build .#checks.x86_64-linux.cli-commands        # gateway/config 子命令
nix build .#checks.x86_64-linux.managed-guard       # HERMES_MANAGED 阻止修改
nix build .#checks.x86_64-linux.bundled-skills      # 技能包含在包中
nix build .#checks.x86_64-linux.config-roundtrip    # 合并脚本保留用户键
```

**各项检查的验证内容**

| 检查项 | 验证内容 |
|---|---|
| `package-contents` | `hermes` 和 `hermes-agent` 二进制文件存在且 `hermes version` 可运行 |
| `entry-points-sync` | `pyproject.toml` 中的每个 `[project.scripts]` 条目在 Nix 包中都有对应的包装二进制文件 |
| `cli-commands` | `hermes --help` 暴露 `gateway` 和 `config` 子命令 |
| `managed-guard` | `HERMES_MANAGED=true hermes config set ...` 输出 NixOS 错误信息 |
| `bundled-skills` | 技能目录存在，包含 SKILL.md 文件，包装器中设置了 `HERMES_BUNDLED_SKILLS` |
| `config-roundtrip` | 7 种合并场景：全新安装、Nix 覆盖、用户键保留、混合合并、MCP 增量合并、嵌套深度合并、幂等性 |

---

## 选项参考

### 核心

| 选项 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `enable` | `bool` | `false` | 启用 hermes-agent 服务 |
| `package` | `package` | `hermes-agent` | 要使用的 hermes-agent 包 |
| `user` | `str` | `"hermes"` | 系统用户 |
| `group` | `str` | `"hermes"` | 系统用户组 |
| `createUser` | `bool` | `true` | 自动创建用户/用户组 |
| `stateDir` | `str` | `"/var/lib/hermes"` | 状态目录（`HERMES_HOME` 的父目录） |
| `workingDirectory` | `str` | `"${stateDir}/workspace"` | 智能体工作目录（`MESSAGING_CWD`） |
| `addToSystemPackages` | `bool` | `false` | 将 `hermes` CLI 添加到系统 PATH 并在系统范围设置 `HERMES_HOME` |

### 配置

| 选项 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `settings` | `attrs`（深度合并） | `{}` | 声明式配置，渲染为 `config.yaml`。支持任意嵌套；多个定义通过 `lib.recursiveUpdate` 合并 |
| `configFile` | `null` 或 `path` | `null` | 指向现有 `config.yaml` 的路径。设置后完全覆盖 `settings` |

### 密钥与环境

| 选项 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `environmentFiles` | `listOf str` | `[]` | 包含密钥的环境文件路径。激活时合并到 `$HERMES_HOME/.env` |
| `environment` | `attrsOf str` | `{}` | 非敏感环境变量。**在 Nix store 中可见**——不要在此存放密钥 |
| `authFile` | `null` 或 `path` | `null` | OAuth 凭据种子。仅在首次部署时复制 |
| `authFileForceOverwrite` | `bool` | `false` | 每次激活时始终从 `authFile` 覆盖 `auth.json` |

### 文档

| 选项 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `documents` | `attrsOf (either str path)` | `{}` | 工作区文件。键为文件名，值为内联字符串或路径。激活时安装到 `workingDirectory` |

### MCP 服务器

| 选项 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `mcpServers` | `attrsOf submodule` | `{}` | MCP 服务器定义，合并到 `settings.mcp_servers` |
| `mcpServers.<name>.command` | `null` 或 `str` | `null` | 服务器命令（stdio 传输） |
| `mcpServers.<name>.args` | `listOf str` | `[]` | 命令参数 |
| `mcpServers.<name>.env` | `attrsOf str` | `{}` | 服务器进程的环境变量 |
| `mcpServers.<name>.url` | `null` 或 `str` | `null` | 服务器端点 URL（HTTP/StreamableHTTP 传输） |
| `mcpServers.<name>.headers` | `attrsOf str` | `{}` | HTTP 头，例如 `Authorization` |
| `mcpServers.<name>.auth` | `null` 或 `"oauth"` | `null` | 认证方式。`"oauth"` 启用 OAuth 2.1 PKCE |
| `mcpServers.<name>.enabled` | `bool` | `true` | 启用或禁用此服务器 |
| `mcpServers.<name>.timeout` | `null` 或 `int` | `null` | 工具调用超时时间（秒），默认 120 |
| `mcpServers.<name>.connect_timeout` | `null` 或 `int` | `null` | 连接超时时间（秒），默认 60 |
| `mcpServers.<name>.tools` | `null` 或 `submodule` | `null` | 工具过滤（`include`/`exclude` 列表） |
| `mcpServers.<name>.sampling` | `null` 或 `submodule` | `null` | 服务器发起 LLM 请求的采样配置 |

### 服务行为

| 选项 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `extraArgs` | `listOf str` | `[]` | `hermes gateway` 的额外参数 |
| `extraPackages` | `listOf package` | `[]` | 服务 PATH 上的额外包（仅原生模式） |
| `restart` | `str` | `"always"` | systemd `Restart=` 策略 |
| `restartSec` | `int` | `5` | systemd `RestartSec=` 值 |

### 容器

| 选项 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `container.enable` | `bool` | `false` | 启用 OCI 容器模式 |
| `container.backend` | `enum ["docker" "podman"]` | `"docker"` | 容器运行时 |
| `container.image` | `str` | `"ubuntu:24.04"` | 基础镜像（运行时拉取） |
| `container.extraVolumes` | `listOf str` | `[]` | 额外卷挂载（`宿主机:容器:模式`） |
| `container.extraOptions` | `listOf str` | `[]` | 传递给 `docker create` 的额外参数 |

---

## 目录布局

### 原生模式

```
/var/lib/hermes/                     # stateDir（hermes:hermes 所有，权限 0750）
├── .hermes/                         # HERMES_HOME
│   ├── config.yaml                  # Nix 生成（每次重建时深度合并）
│   ├── .managed                     # 标记：CLI 配置修改被阻止
│   ├── .env                         # 从 environment + environmentFiles 合并
│   ├── auth.json                    # OAuth 凭据（种子注入后自行管理）
│   ├── gateway.pid
│   ├── state.db
│   ├── mcp-tokens/                  # MCP 服务器的 OAuth token
│   ├── sessions/
│   ├── memories/
│   ├── skills/
│   ├── cron/
│   └── logs/
├── home/                            # 智能体 HOME
└── workspace/                       # MESSAGING_CWD
    ├── SOUL.md                      # 来自 documents 选项
    └── (智能体创建的文件)
```

### 容器模式

相同布局，挂载到容器中：

| 容器路径 | 宿主机路径 | 模式 | 说明 |
|---|---|---|---|
| `/nix/store` | `/nix/store` | `ro` | Hermes 二进制文件 + 所有 Nix 依赖 |
| `/data` | `/var/lib/hermes` | `rw` | 所有状态、配置、工作区 |
| `/home/hermes` | `${stateDir}/home` | `rw` | 持久化智能体主目录——`pip install --user`、工具缓存 |
| `/usr`、`/usr/local`、`/tmp` | （可写层） | `rw` | `apt`/`pip`/`npm` 安装——跨重启保留，重建时丢失 |

---

## 更新

```bash
# 更新 flake input
nix flake update hermes-agent --flake /etc/nixos

# 重建
sudo nixos-rebuild switch
```

在容器模式下，`current-package` 符号链接会被更新，智能体在重启时获取新的二进制文件。不需要重建容器，不会丢失已安装的包。

---

## 故障排除

:::tip
Podman 用户
以下所有 `docker` 命令在 `podman` 下同样适用。如果你设置了 `container.backend = "podman"`，请相应替换。
:::

### 服务日志

```bash
# 两种模式都使用相同的 systemd 单元
journalctl -u hermes-agent -f

# 容器模式：也可以直接查看
docker logs -f hermes-agent
```

### 容器检查

```bash
systemctl status hermes-agent
docker ps -a --filter name=hermes-agent
docker inspect hermes-agent --format='{{.State.Status}}'
docker exec -it hermes-agent bash
docker exec hermes-agent readlink /data/current-package
docker exec hermes-agent cat /data/.container-identity
```

### 强制重建容器

如果你需要重置可写层（全新 Ubuntu）：

```bash
sudo systemctl stop hermes-agent
docker rm -f hermes-agent
sudo rm /var/lib/hermes/.container-identity
sudo systemctl start hermes-agent
```

### 验证密钥是否已加载

如果智能体启动了但无法向 LLM 提供商认证，请检查 `.env` 文件是否正确合并：

```bash
# 原生模式
sudo -u hermes cat /var/lib/hermes/.hermes/.env

# 容器模式
docker exec hermes-agent cat /data/.hermes/.env
```

### GC Root 验证

```bash
nix-store --query --roots $(docker exec hermes-agent readlink /data/current-package)
```

### 常见问题

| 症状 | 原因 | 修复方法 |
|---|---|---|
| `Cannot save configuration: managed by NixOS` | CLI 保护机制已激活 | 编辑 `configuration.nix` 并执行 `nixos-rebuild switch` |
| 容器意外重建 | `extraVolumes`、`extraOptions` 或 `image` 发生变更 | 预期行为——可写层会重置。重新安装包或使用自定义镜像 |
| `hermes version` 显示旧版本 | 容器未重启 | `systemctl restart hermes-agent` |
| `/var/lib/hermes` 权限拒绝 | 状态目录权限为 `0750 hermes:hermes` | 使用 `docker exec` 或 `sudo -u hermes` |
| `nix-collect-garbage` 删除了 hermes | GC root 缺失 | 重启服务（preStart 会重新创建 GC root） |
