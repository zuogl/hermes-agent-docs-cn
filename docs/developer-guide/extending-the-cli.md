---
title: "扩展 CLI"
---
# 扩展 CLI

Hermes 在 `HermesCLI` 上暴露了受保护的扩展钩子，使包装 CLI 能够添加 widget、快捷键绑定和布局自定义，而无需覆写超过 1000 行的 `run()` 方法。这使你的扩展与内部变更保持解耦。

## 扩展点

共有五个可用的扩展接入点：

| 钩子 | 用途 | 何时覆写 |
|------|------|----------|
| `_get_extra_tui_widgets()` | 向布局中注入 widget | 需要持久化 UI 元素（面板、状态栏、迷你播放器）时 |
| `_register_extra_tui_keybindings(kb, *, input_area)` | 添加快捷键绑定 | 需要热键（切换面板、传输控制、模态快捷键）时 |
| `_build_tui_layout_children(**widgets)` | 完全控制 widget 排序 | 需要对现有 widget 重新排序或包装时（较少用） |
| `process_command()` | 添加自定义斜线命令 | 需要处理 `/mycommand` 时（已有钩子） |
| `_build_tui_style_dict()` | 自定义 prompt_toolkit 样式 | 需要自定义颜色或样式时（已有钩子） |

前三个是新增的受保护钩子，后两个已存在。

## 快速上手：包装 CLI

```python
#!/usr/bin/env python3
"""my_cli.py — 扩展 Hermes 的示例包装 CLI。"""

from cli import HermesCLI
from prompt_toolkit.layout import FormattedTextControl, Window
from prompt_toolkit.filters import Condition


class MyCLI(HermesCLI):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._panel_visible = False

    def _get_extra_tui_widgets(self):
        """在状态栏上方添加一个可切换的信息面板。"""
        cli_ref = self
        return [
            Window(
                FormattedTextControl(lambda: "📊 My custom panel content"),
                height=1,
                filter=Condition(lambda: cli_ref._panel_visible),
            ),
        ]

    def _register_extra_tui_keybindings(self, kb, *, input_area):
        """F2 切换自定义面板。"""
        cli_ref = self

        @kb.add("f2")
        def _toggle_panel(event):
            cli_ref._panel_visible = not cli_ref._panel_visible

    def process_command(self, cmd: str) -> bool:
        """添加 /panel 斜线命令。"""
        if cmd.strip().lower() == "/panel":
            self._panel_visible = not self._panel_visible
            state = "visible" if self._panel_visible else "hidden"
            print(f"Panel is now {state}")
            return True
        return super().process_command(cmd)


if __name__ == "__main__":
    cli = MyCLI()
    cli.run()
```

运行：

```bash
cd ~/.hermes/hermes-agent
source .venv/bin/activate
python my_cli.py
```

## 钩子参考

### `_get_extra_tui_widgets()`

返回要插入 TUI 布局的 prompt_toolkit widget 列表。Widget 出现在**空白区域与状态栏之间**——位于输入区域上方、主输出区域下方。

```python
def _get_extra_tui_widgets(self) -> list:
    return []  # 默认：无额外 widget
```

每个 widget 应为 prompt_toolkit 容器（如 `Window`、`ConditionalContainer`、`HSplit`）。使用 `ConditionalContainer` 或 `filter=Condition(...)` 使 widget 可切换。

```python
from prompt_toolkit.layout import ConditionalContainer, Window, FormattedTextControl
from prompt_toolkit.filters import Condition

def _get_extra_tui_widgets(self):
    return [
        ConditionalContainer(
            Window(FormattedTextControl("Status: connected"), height=1),
            filter=Condition(lambda: self._show_status),
        ),
    ]
```

### `_register_extra_tui_keybindings(kb, *, input_area)`

在 Hermes 注册自身快捷键绑定之后、布局构建之前调用。将你的快捷键绑定添加到 `kb`。

```python
def _register_extra_tui_keybindings(self, kb, *, input_area):
    pass  # 默认：无额外快捷键绑定
```

参数：
- **`kb`** — prompt_toolkit 应用的 `KeyBindings` 实例
- **`input_area`** — 主 `TextArea` widget，用于读取或操作用户输入

```python
def _register_extra_tui_keybindings(self, kb, *, input_area):
    cli_ref = self

    @kb.add("f3")
    def _clear_input(event):
        input_area.text = ""

    @kb.add("f4")
    def _insert_template(event):
        input_area.text = "/search "
```

**避免与内置快捷键冲突**：`Enter`（提交）、`Escape Enter`（换行）、`Ctrl-C`（中断）、`Ctrl-D`（退出）、`Tab`（接受自动建议）。F2+ 功能键和 Ctrl 组合键通常是安全的。

### `_build_tui_layout_children(**widgets)`

仅在需要完全控制 widget 排序时覆写此方法。大多数扩展应改用 `_get_extra_tui_widgets()`。

```python
def _build_tui_layout_children(self, *, sudo_widget, secret_widget,
    approval_widget, clarify_widget, spinner_widget, spacer,
    status_bar, input_rule_top, image_bar, input_area,
    input_rule_bot, voice_status_bar, completions_menu) -> list:
```

默认实现返回：

```python
[
    Window(height=0),       # 锚点
    sudo_widget,            # sudo 密码提示（条件显示）
    secret_widget,          # 密钥输入提示（条件显示）
    approval_widget,        # 危险命令审批（条件显示）
    clarify_widget,         # 澄清问题 UI（条件显示）
    spinner_widget,         # 思考中转圈动画（条件显示）
    spacer,                 # 填充剩余垂直空间
    *self._get_extra_tui_widgets(),  # 你的 WIDGET 放在这里
    status_bar,             # 模型/token/上下文状态栏
    input_rule_top,         # ─── 输入框上方分隔线
    image_bar,              # 已附加图片指示栏
    input_area,             # 用户文本输入区
    input_rule_bot,         # ─── 输入框下方分隔线
    voice_status_bar,       # 语音模式状态（条件显示）
    completions_menu,       # 自动补全下拉菜单
]
```

## 布局示意图

默认布局从上到下：

1. **输出区域** — 可滚动的对话历史
2. **空白区域**
3. **额外 widget** — 来自 `_get_extra_tui_widgets()`
4. **状态栏** — 模型、上下文百分比、已用时间
5. **图片栏** — 已附加图片数量
6. **输入区域** — 用户提示输入
7. **语音状态** — 录音指示
8. **补全菜单** — 自动补全建议

## 使用提示

- **状态变更后刷新显示**：调用 `self._invalidate()` 触发 prompt_toolkit 重绘。
- **访问 agent 状态**：`self.agent`、`self.model`、`self.conversation_history` 均可访问。
- **自定义样式**：覆写 `_build_tui_style_dict()` 并为自定义样式类添加条目。
- **斜线命令**：覆写 `process_command()`，处理自己的命令，其余命令调用 `super().process_command(cmd)`。
- **不要覆写 `run()`**，除非绝对必要——扩展钩子的存在正是为了避免这种耦合。
