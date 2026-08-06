# pi-treetime

`/treetime` — pi 的会话树导航，与内置 `/tree` 功能完全一致，只是每条消息都带上了人类可读的时间戳。

## 特性

- 与 `/tree` 完全相同的交互与功能：
  - `↑`/`↓` 移动，`←`/`→` 翻页
  - `Ctrl+←`/`Ctrl+→`（或 `Alt+←`/`Alt+→`）折叠分支 / 跳转分支段
  - `Enter` 选择（含分支摘要询问流程，尊重 `branchSummary.skipPrompt` 设置）
  - `Shift+L` 打标签，`Shift+T` 显示标签时间戳
  - `Ctrl+X` 复制选中消息
  - `Ctrl+O` 循环过滤（default / no-tools / user-only / labeled-only / all），`Ctrl+D/T/U/L/A` 直达
  - 直接输入文字搜索
  - 完整走 `session_before_tree` / `session_tree` 事件钩子
- 每条消息额外显示时间戳，格式智能：
  - 今天 → `HH:MM`（如 `14:32`）
  - 今年 → `M/D HH:MM`（如 `8/5 09:15`）
  - 跨年 → `YY/M/D HH:MM`

## 安装

```bash
pi install git:github.com/<your-org>/pi-treetime
```

或手动放入 `~/.pi/agent/extensions/pi-treetime/`（含 `index.ts`），重启 pi 或执行 `/reload`。

## 使用

在 pi 中输入：

```
/treetime
```

## 开发

```
~/.pi/dev/pi-treetime/
├── package.json                          # pi 包清单
└── extensions/pi-treetime/
    ├── index.ts                          # /treetime 命令入口（复刻内置 /tree 流程）
    └── src/tree-selector.ts              # 内置 TreeSelectorComponent 的移植 + 时间戳
```

本地调试：

```bash
pi -e ~/.pi/dev/pi-treetime/extensions/pi-treetime/index.ts
```

## 说明

- 时间取自会话条目自身的 `timestamp`（Unix 毫秒或 ISO 字符串均可），显示为本地时区。
- 树渲染逻辑完整移植自 pi 内置 `tree-selector.js`（含水平视口裁剪、分支折叠、搜索、标签编辑等），仅注入 `theme`/`keybindings` 并加入时间戳渲染。
- 由于扩展 API 无法修改内置 `/tree` 的渲染，本扩展以 `ctx.ui.custom()` 自绘等价选择器，并通过 `ctx.navigateTree()` 完成导航（摘要、事件钩子与内置一致）。
