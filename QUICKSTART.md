# Quick Start Guide

## Testing the Extension Locally

### 1. Open in VS Code

```bash
code /Users/dryzhov/work/tools/agent-ref
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

### 4. Configure the prompt and references

Open Command Palette (`Cmd+Shift+P`) and search for:
- "Preferences: Open Settings (UI)"
- Search for "agentRef"
- Editor references always use the absolute format `<absolutePath>:<line>` or `<absolutePath>:<start>-<end>` (with optional columns when `agentRef.includeColumnRange` is enabled).
- Edit `agentRef.prompt` to set the prompt sent to an Explorer agent.

Use `<PATH>` wherever the selected absolute file or folder path should appear. Every literal `<PATH>` is replaced. If it is omitted, the extension appends exactly `\n path: ${absolutePath}`. The complete prompt is passed as one shell argument.

### 5. Test Different Commands

Open Command Palette and try:
- "Agent Ref: Copy and Send Reference" (default)
- "Agent Ref: Copy Reference Only"
- "Agent Ref: Send to Terminal Only"

### 6. Test the Explorer agent menu

Before testing, install the CLI for every agent you plan to use and make each executable available on the integrated terminal's `PATH`:

- Codex CLI (`codex`)
- OpenCode CLI (`opencode`)
- Claude Code CLI (`claude`)
- Cursor CLI (`cursor`)

Configure the `context-menu-loader` skill for each CLI that uses it; the extension does not install or configure these prerequisites.

In the Extension Development Host:

1. Right-click a local file or folder in Explorer.
2. Open **Send to Agent**.
3. Choose **in Codex**, **in OpenCode**, **in Claude Code**, or **in Cursor**. By default, matching direct actions also appear immediately below the flyout.
4. Confirm that a new, focused terminal titled with the Git repository folder from `git rev-parse --show-toplevel` (or `parentFolder/filename` for a file / the selected folder path when Git reports that the path is not a repository) appears and runs the command immediately.

The clicked resource is sent as an absolute path. This menu is limited to local `file` resources and POSIX-compatible integrated-terminal shells such as zsh or bash. Paths are shell-quoted as one prompt argument, including paths containing spaces, quotes, apostrophes, or shell metacharacters. If the CLI is missing, the terminal opens but reports the shell's normal command-not-found error.

The **Send to Agent** submenu always contains all four agents. To hide a direct action, set its matching preference to `false`; changes take effect without reloading VS Code:

- `agentRef.showCodexInTopLevelMenu`
- `agentRef.showOpenCodeInTopLevelMenu`
- `agentRef.showClaudeCodeInTopLevelMenu`
- `agentRef.showCursorInTopLevelMenu`

The invocation syntax verified in the release environment on 2026-09-03 is:

```bash
codex '<PROMPT>'
opencode --prompt '<PROMPT>'
claude '<PROMPT>'
cursor '<PROMPT>'
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

### Explorer agent prompt and menu visibility

```json
{
  "agentRef.prompt": "Review this resource: <PATH>",
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

- Run `codex --version`, `opencode --version`, `claude --version`, or `cursor --version` in the integrated terminal to confirm the selected CLI is installed and on `PATH`.
- Confirm that `context-menu-loader` is available to the selected CLI.
- The Explorer menu intentionally supports only local files and folders; it is hidden for remote or virtual resources.

## Next Steps

1. Use the extension in your daily workflow
2. Adjust the prompt and direct-menu visibility settings to your preference
3. Consider publishing to VS Code Marketplace (optional)
4. Report issues or suggest features
