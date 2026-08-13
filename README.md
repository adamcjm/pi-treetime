# pi-treetime

`/treetime` — session tree navigation for [pi](https://github.com/earendil-works/pi), **identical to the built-in `/tree`**, except every entry shows a **human-readable timestamp**. [中文](docs/README.zh-CN.md)

<table>
  <tr>
    <td align="center"><b>Built-in <code>/tree</code></b><br><img src="https://raw.githubusercontent.com/adamcjm/pi-treetime/main/docs/tree-no-timestamps.en.webp" width="480" alt="/tree without timestamps"></td>
    <td align="center"><b><code>/treetime</code></b><br><img src="https://raw.githubusercontent.com/adamcjm/pi-treetime/main/docs/treetime-with-timestamps.en.webp" width="480" alt="/treetime with timestamps"></td>
  </tr>
</table>

## Features

- **100% identical to `/tree`** — same navigation, filters, search, folding, labels, copy, and branch summarization flow:
  - `↑`/`↓` move, `←`/`→` page
  - `Ctrl+←`/`Ctrl+→` (or `Alt+←`/`Alt+→`) fold branch / jump between branch segments
  - `Enter` select (with the same "Summarize branch?" prompt, honoring the `branchSummary.skipPrompt` setting)
  - `Copy message` in the summary prompt: copies the selected message and closes directly, without navigating or touching session state
  - `Shift+L` set/clear a label, `Shift+T` toggle label timestamps
  - `Ctrl+X` copy the selected message
  - `Ctrl+O` cycle filters (default / no-tools / user-only / labeled-only / all), or jump directly with `Ctrl+D/T/U/L/A`
  - Type to search
  - Fires the standard `session_before_tree` / `session_tree` extension hooks
- **Timestamps on every entry**, in a smart human-readable format:
  - today → `HH:MM` (e.g. `10:30`)
  - this year → `M/D HH:MM` (e.g. `8/5 16:20`)
  - older → `YY/M/D HH:MM` (e.g. `25/12/30 09:01`)

## Install

```bash
pi install npm:pi-treetime
```

Or copy `extensions/pi-treetime` into `~/.pi/agent/extensions/` (or `.pi/extensions/` for a project).

After installing, run `/reload` (or restart pi) to activate.

### Local development

```bash
pi -e ~/.pi/dev/pi-treetime/extensions/pi-treetime/index.ts
```

## Usage

Inside pi, type:

```
/treetime
```

A session tree opens — the same interface as `/tree`, with a timestamp on every row. Navigate exactly as you would in `/tree`: `Enter` jumps to the selected point (optionally summarizing the abandoned branch), `Esc` closes.

## How it works

- The tree rendering logic is a faithful port of pi's built-in `tree-selector.js` (horizontal viewport clipping, folding, search, label editing, filter modes), with `theme`/`keybindings` injected and timestamp rendering added.
- Timestamps come from each session entry's own `timestamp` field (Unix ms or ISO string), displayed in local time.
- Since the extension API cannot modify the built-in `/tree` rendering, the extension draws an equivalent selector via `ctx.ui.custom()` and navigates through `ctx.navigateTree()`, so branch summaries and event hooks behave exactly like the built-in.
- Notifications (e.g. "Navigated to selected point") appear via the standard status UI.

## License

MIT
