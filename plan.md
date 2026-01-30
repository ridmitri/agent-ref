## Goal

Create a VS Code extension with a single hotkey that outputs a reference like:

* **Universal:** `src/components/Button.tsx:120-137`
* **Claude-friendly:** `@src/components/Button.tsx#120-137`

…and then either:

* **copy to clipboard** (always), and/or
* **send to integrated terminal input** (recommended; avoids fragile “paste” commands)

---

## UX and Commands

### Primary command

**`agentRef.copySend`** (bound to a hotkey)

Behavior:

1. Read active editor + current selection
2. Compute `{relativePath, absolutePath, startLine, endLine}`
3. Format string (configurable)
4. Write to clipboard
5. Optionally focus terminal
6. Optionally send text to terminal (no newline by default)

### Optional secondary commands (nice-to-have)

* `agentRef.copyOnly` (clipboard only)
* `agentRef.sendOnly` (send without clipboard)
* `agentRef.copyAsClaude` / `agentRef.copyAsUniversal` (explicit formats)

---

## Output Formats (for Claude Code + Codex)

Implement a setting `agentRef.format` with enum:

* `"universal"` → `rel/path/file.ts:120-137`
* `"claude"` → `@rel/path/file.ts#120-137`
* `"abs"` → `/abs/path/file.ts:120-137`
* `"markdown"` → `` `rel/path/file.ts:120-137` ``

Default: **`"universal"`** (works everywhere), with an option to switch to `"claude"` if you mostly paste into Claude Code.

---

## Line Range Computation

### Rules (simple, predictable)

* Use VS Code `Selection` from `editor.selection`
* Convert to 1-based line numbers:

  * `start = selection.start.line + 1`
  * `end = selection.end.line + 1`
* If selection is empty:

  * Use current cursor line as `start=end`
* If selection ends at column 0 of a later line (common for “line selection”):

  * Treat end as previous line (so it doesn’t over-count)
  * Example: selection from line 10 start to line 12 col 0 → range `10-11`

### Multi-selection

Start with **only primary selection** (first). Add multi-cursor support later if you want.

---

## Path Resolution

### Prefer workspace-relative paths

* `uri = editor.document.uri`
* `wsFolder = vscode.workspace.getWorkspaceFolder(uri)`
* If found: relative path from `wsFolder.uri.fsPath`
* If not found: fall back to absolute

Normalize to forward slashes in output (agents handle it better):

* `relPath.replaceAll('\\', '/')`

Add setting:

* `agentRef.pathStyle`: `"relative"` | `"absolute"` | `"auto"`

  * `"auto"` uses relative when possible, else absolute

---

## Terminal Integration (best approach)

Avoid sequencing “toggle terminal” + “paste”. Instead:

* Ensure a terminal exists:

  * `const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal("Agent");`
* Focus:

  * `terminal.show(true)`
* Insert:

  * `terminal.sendText(refString, /* addNewLine */ true)`

Settings:

* `agentRef.terminal.focus`: boolean (default `true`)
* `agentRef.terminal.send`: boolean (default `true`)
* `agentRef.terminal.addNewLine`: boolean (default `true`)
* `agentRef.terminal.name`: string (default `"Agent"`)

---

## Configuration Surface

Contribute settings in `package.json`:

* `agentRef.format` (enum above)
* `agentRef.pathStyle` (`auto|relative|absolute`)
* `agentRef.terminal.focus` (bool)
* `agentRef.terminal.send` (bool)
* `agentRef.terminal.addNewLine` (bool)
* `agentRef.copyToClipboard` (bool; default `true`)
* `agentRef.includeColumnRange` (bool; default `false`)

  * Later: output `:120:5-137:20` if you decide you want columns too

---

## Project Structure

```
agent-ref/
  package.json
  tsconfig.json
  src/
    extension.ts         // activate, register commands
    formatter.ts         // build output string
    selection.ts         // compute line range rules
    path.ts              // resolve rel/abs path
    terminal.ts          // focus/create/send
  README.md
```

---

## Implementation Steps (for a coding agent)

1. **Scaffold**

   * `npx --package yo --package generator-code -- yo code` → “New Extension (TypeScript)”
   * Name: `agent-ref`

2. **Register commands**

   * Add `agentRef.copySend` to `contributes.commands`
   * Add a default keybinding (optional)

3. **Implement core logic**

   * `getActiveEditorOrWarn()`
   * `computeLineRange(editor)`
   * `resolvePath(editor.document.uri)`
   * `formatRef({path, start, end}, config)`
   * clipboard write
   * terminal send

4. **Edge case handling**

   * No editor open → info message
   * Untitled file not saved → use absolute from URI if possible; else warn
   * Multi-root workspace → use correct folder for that file

5. **Testing**

   * Unit tests for:

     * range logic (empty selection, end-at-col0)
     * path normalization (Windows slashes)
     * formatting variants
   * Manual test checklist (below)

6. **Packaging**

   * `vsce package` (optional)
   * Or run locally via Extension Host

---

## Acceptance Criteria Checklist

* [ ] Hotkey produces `src/file.ts:10-12` for a multi-line selection
* [ ] Empty selection produces `src/file.ts:10-10`
* [ ] End-at-col0 selection doesn’t add an extra line
* [ ] Output is **workspace-relative by default**, absolute if no workspace folder
* [ ] Clipboard always contains the output (unless disabled)
* [ ] Terminal focuses and receives the text (without newline by default)
* [ ] Format switch works (`universal` vs `claude`)

---

## Nice-to-haves (after v1)

* Multi-cursor support: output comma-separated ranges
* Include columns optionally
* Add prefix text template like:

  * `agentRef.template = "{ref} — {instruction}"` (with `{ref}` placeholder)
* Detect repo root more robustly (git) when workspace folder isn’t root

---

If you want, I can also paste a **minimal `extension.ts` skeleton** that matches this plan (no dependencies, just VS Code APIs) so your coding agent can implement it in one pass.
