# Quick Start Guide

## Testing the Extension Locally

### 1. Open in VS Code

```bash
code agent-ref
```

### 2. Launch Extension Development Host

Open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`) and run:
- **"Debug: Start Debugging"** or **"Debug: Start Without Debugging"**

This will:
- Compile the TypeScript code
- Launch a new VS Code window (Extension Development Host) with your extension loaded

### 3. Test the editor commands

In the Extension Development Host window:

1. Open any file
2. Select some lines of code (or just place cursor on a line)
3. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
4. Check:
   - Status bar message showing the reference
   - Clipboard contains the reference
   - Terminal receives the reference (without pressing Enter)

### 4. Configure editor references

Open Command Palette (`Cmd+Shift+P`) and choose **Preferences: Open Settings (UI)**, then search for `agentRef`.

- Editor references use `<absolutePath>:<line>` or `<absolutePath>:<start>-<end>`, with optional columns when `agentRef.includeColumnRange` is enabled.
- `agentRef.prompt` and `agentRef.workingDirectory` remain as legacy settings and are inactive for Explorer agent launches. Existing values cannot send an automatic message or override the launch directory.

### 5. Test Different Commands

Open Command Palette and try:
- "Agent Ref: Copy and Send Reference" (default)
- "Agent Ref: Copy Reference Only"
- "Agent Ref: Send to Terminal Only"

### 6. Test the Explorer agent menu and return to the selected file

Install the CLI for each agent you plan to use and make its executable available on the integrated terminal's `PATH`:

- Codex CLI (`codex`)
- OpenCode CLI (`opencode`)
- Claude Code CLI (`claude`)
- Cursor CLI (`agent`)

Before launching the Extension Development Host, export `WORKSPACE_PATH` in the environment used to start VS Code (for example `export WORKSPACE_PATH=/Users/dryzhov/work`). Fully quit and restart VS Code to ensure the extension host inherits it. Use a POSIX integrated shell such as zsh or bash.

In the Extension Development Host:

1. Right-click a local file in Explorer, open **Select Agent**, and choose an **Open in ...** action. Matching direct actions are also available by default.
2. Confirm that a fresh terminal uses the filename as its title. Names beginning with `.meta.` omit that prefix and a trailing `.yml` or `.yaml`; other filenames retain their extensions. It starts the CLI in `WORKSPACE_PATH` and awaits your input, even when the selected file is under another open project root.
3. Assign the task in the agent chat. The extension sends no automatic message or selected path to the agent.
4. Select another terminal, then return to the agent terminal. Confirm that tab selection keeps terminal input focus and does not open a file.
5. Invoke **Agent Ref: Open File for Terminal** from the Command Palette or press `Cmd+Ctrl+E`. Confirm that the editor opens and focuses the exact selected file. Invoke it again with the terminal already active.
6. Repeat with two different files named `spec.md`, a task `.meta` file, and a file in another workspace root. Each terminal returns to its own selected file, even if its title is renamed or its file is an ignored `.work` artifact.

Metadata is optional and is not parsed; ordinary files and `.meta` files follow the same binding behavior. If a bound file is deleted or cannot open, the command reports the failure without opening another similarly named file.

Every launch requires `WORKSPACE_PATH` from the extension host environment to be an absolute existing directory. The same directory is used in multi-root workspaces, for outside-root resources, and with no project open. Missing or invalid values produce an error without creating a terminal. Folder launches use the folder basename as the title and have no text-file binding.

Bindings last only for live extension-created terminals in the current extension session. Closing a terminal removes its binding, and bindings do not persist across reload or follow file moves. Unbound terminals, including folder launches and restored terminals, retain the existing title-based search through filename prefixes, `.meta` files, and `spec.md`.

Only local `file` resources are supported by the Explorer menu. If a CLI is missing, the terminal opens and the shell reports its normal command-not-found error.

The **Select Agent** submenu always contains all four agents. To hide a direct action, set its matching preference to `false`; changes take effect without reloading VS Code:

- `agentRef.showCodexInTopLevelMenu`
- `agentRef.showOpenCodeInTopLevelMenu`
- `agentRef.showClaudeCodeInTopLevelMenu`
- `agentRef.showCursorInTopLevelMenu`

The shell bootstrap explicitly changes to the validated workspace before launching the CLI; if that change fails, the agent is not started. This protects against shell startup files changing directories:

```bash
cd -- '/Users/dryzhov/work' && codex
cd -- '/Users/dryzhov/work' && opencode
cd -- '/Users/dryzhov/work' && claude
cd -- '/Users/dryzhov/work' && agent
```

## Installing Locally

### Build VSIX Package

```bash
npm install -g @vscode/vsce
vsce package
```

This creates `agent-ref-1.0.0.vsix`.

### Install in VS Code

1. Open VS Code
2. Go to Extensions view (`Cmd+Shift+X`)
3. Click "..." menu → "Install from VSIX..."
4. Select the `.vsix` file

## Configuration Examples

### Explorer agent menu visibility

```json
{
  "agentRef.showCursorInTopLevelMenu": false
}
```

### Copy Only (No Terminal)

```json
{
  "agentRef.terminal.send": false,
  "agentRef.copyToClipboard": true
}
```

## Troubleshooting

### Extension Not Loading

- Check the Output panel → "Extension Host"
- Check for compilation errors in Terminal
- Ensure `out/` directory exists with compiled .js files

### Terminal Not Receiving Text

- Check `agentRef.terminal.send` is `true`
- Try opening a terminal manually first
- Check terminal name matches `agentRef.terminal.name`

### Unexpected reference format

- Editor references are always absolute.
- Ensure the selected document has a local file URI.

### Explorer agent command fails

- Ensure `WORKSPACE_PATH` is exported to the environment used to start VS Code and points to an absolute existing directory. Setting it only inside an already-open terminal does not update the extension host; fully quit and restart VS Code after exporting it.
- Run `codex --version`, `opencode --version`, `claude --version`, or `agent --version` in the integrated terminal to confirm the selected CLI is installed and on `PATH`.
- The Explorer menu intentionally supports only local files and folders; it is hidden for remote or virtual resources.

## Next Steps

1. Use the extension in your daily workflow
2. Adjust editor-reference and direct-menu visibility settings to your preference
3. Consider publishing to VS Code Marketplace (optional)
4. Report issues or suggest features
