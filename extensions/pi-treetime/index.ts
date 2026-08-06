/**
 * pi-treetime: `/treetime` — session tree navigation identical to `/tree`,
 * with a human-readable timestamp on every entry.
 *
 * All built-in `/tree` behaviors are preserved:
 *   - ↑/↓ navigate, ←/→ page, Ctrl+←/→ or Alt+←/→ fold/branch jump
 *   - Enter select (with optional branch summarization prompt)
 *   - Shift+L label, Shift+T label timestamps, Ctrl+X copy
 *   - Ctrl+O / direct keys cycle filters, type to search
 *   - Branch navigation via session_before_tree / session_tree hooks
 *
 * The only difference: each row shows its entry's timestamp in a smart
 * human-readable format (HH:MM today, M/D HH:MM this year, YY/M/D HH:MM older).
 */
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { CONFIG_DIR_NAME, copyToClipboard, getAgentDir } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TreetimeSelectorComponent, type FilterMode } from "./src/tree-selector.ts";

const FILTER_MODES: FilterMode[] = ["default", "no-tools", "user-only", "labeled-only", "all"];

interface SettingsFile {
  treeFilterMode?: string;
  branchSummary?: { skipPrompt?: boolean };
}

/** Read merged global + project settings.json (project overrides global). */
function readSettings(ctx: ExtensionCommandContext): SettingsFile {
  let merged: SettingsFile = {};
  for (const path of [join(getAgentDir(), "settings.json"), join(ctx.cwd, CONFIG_DIR_NAME, "settings.json")]) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as SettingsFile;
      merged = { ...merged, ...parsed };
    } catch {
      // ignore missing/unreadable settings files
    }
  }
  return merged;
}

function readTreeFilterMode(ctx: ExtensionCommandContext): FilterMode {
  const value = readSettings(ctx).treeFilterMode;
  return (FILTER_MODES as string[]).includes(value ?? "") ? (value as FilterMode) : "default";
}

function readSkipSummaryPrompt(ctx: ExtensionCommandContext): boolean {
  return readSettings(ctx).branchSummary?.skipPrompt === true;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Show the treetime selector and handle selection, mirroring the built-in
 * `/tree` flow: select → close selector → (optionally) ask about branch
 * summarization → navigate. Re-invoked with initialSelectedId when the user
 * backs out of the summarization prompt.
 */
async function openTree(ctx: ExtensionCommandContext, initialSelectedId?: string) {
  const sessionManager = ctx.sessionManager;
  const tree = sessionManager.getTree();
  const leafId = sessionManager.getLeafId();
  if (tree.length === 0) {
    ctx.ui.notify("No entries in session", "warning");
    return;
  }

  // Stop any in-flight response first, like the built-in /tree does.
  if (!ctx.isIdle()) {
    ctx.abort();
    const started = Date.now();
    while (!ctx.isIdle() && Date.now() - started < 5000) {
      await sleep(50);
    }
  }

  const initialFilterMode = readTreeFilterMode(ctx);

  await ctx.ui.custom((tui, theme, keybindings, done) => {
    const selector = new TreetimeSelectorComponent(
      tree,
      leafId,
      tui.terminal.rows,
      theme,
      keybindings,
      (entryId) => {
        void handleSelect(ctx, done, entryId);
      },
      () => done(null),
      (entryId, label) => {
        try {
          sessionManager.appendLabelChange(entryId, label);
        } catch (error) {
          ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
        }
        tui.requestRender();
      },
      initialSelectedId,
      initialFilterMode,
    );
    selector.onCopy = async (text) => {
      if (!text) {
        ctx.ui.notify("Selected entry has no text to copy", "warning");
        return;
      }
      try {
        await copyToClipboard(text);
        ctx.ui.notify("Copied selected message to clipboard", "info");
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    };
    return selector;
  });
}

async function handleSelect(
  ctx: ExtensionCommandContext,
  done: (result: null) => void,
  entryId: string,
) {
  const sessionManager = ctx.sessionManager;

  // Selecting the current leaf is a no-op (already there)
  if (entryId === sessionManager.getLeafId()) {
    done(null);
    ctx.ui.notify("Already at this point", "info");
    return;
  }

  // Close selector first, then run the summarization flow, like the built-in.
  done(null);

  // Ask about summarization (unless the user prefers to always skip the prompt)
  let wantsSummary = false;
  let customInstructions: string | undefined;
  if (!readSkipSummaryPrompt(ctx)) {
    while (true) {
      const summaryChoice = await ctx.ui.select("Summarize branch?", [
        "No summary",
        "Summarize",
        "Summarize with custom prompt",
      ]);
      if (summaryChoice === undefined) {
        // User pressed escape - re-show tree selector with same selection
        await openTree(ctx, entryId);
        return;
      }
      wantsSummary = summaryChoice !== "No summary";
      if (summaryChoice === "Summarize with custom prompt") {
        customInstructions = await ctx.ui.editor("Custom summarization instructions");
        if (customInstructions === undefined) {
          // User cancelled - loop back to summary selector
          continue;
        }
      }
      // User made a complete choice
      break;
    }
  }

  try {
    const result = await ctx.navigateTree(entryId, {
      summarize: wantsSummary,
      customInstructions,
    });
    if (result.cancelled) {
      ctx.ui.notify("Navigation cancelled", "warning");
      return;
    }
    ctx.ui.notify("Navigated to selected point", "info");
  } catch (error) {
    ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("treetime", {
    description: "Navigate the session tree with human-readable timestamps",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/treetime requires interactive TUI mode", "error");
        return;
      }
      await openTree(ctx);
    },
  });
}
