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

### 4. Try Different Formats

Open Command Palette (`Cmd+Shift+P`) and search for:
- "Preferences: Open Settings (UI)"
- Search for "agentRef"
- Change `agentRef.format` to try different formats:
  - `universal` (default): `src/file.ts:10-12`
  - `claude`: `@src/file.ts#10-12`
  - `markdown`: `` `src/file.ts:10-12` ``

### 5. Test Different Commands

Open Command Palette and try:
- "Agent Ref: Copy and Send Reference" (default)
- "Agent Ref: Copy Reference Only"
- "Agent Ref: Send to Terminal Only"

### 6. Test the Explorer agent menu

Before testing, install the `codex` and/or `opencode` CLI and make sure the command is available in the integrated terminal. Configure the `context-menu-loader` skill for each CLI you plan to use; the extension does not install these prerequisites.

In the Extension Development Host:

1. Right-click a local file or folder in Explorer.
2. Open **Send to Agent**.
3. Choose **in Codex** or **in OpenCode**.
4. Confirm that a new, focused terminal named **Codex** or **OpenCode** appears and runs the command immediately.

The clicked resource is sent as an absolute path. This menu is limited to local `file` resources and POSIX-compatible integrated-terminal shells such as zsh or bash. Paths are shell-quoted as one prompt argument, including paths containing spaces, quotes, apostrophes, or shell metacharacters. If the CLI is missing, the terminal opens but reports the shell's normal command-not-found error.

The invocation syntax verified in the release environment on 2026-09-03 is:

```bash
codex 'use skill "context-menu-loader" for the path "/Users/me/work/frontend/app.js"'
opencode --prompt 'use skill "context-menu-loader" for the path "/Users/me/work/frontend/app.js"'
```

The checked versions were Codex CLI `0.153.0` and OpenCode `1.18.27`.

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

### For Claude Code Users

```json
{
  "agentRef.format": "claude",
  "agentRef.terminal.name": "Claude",
  "agentRef.terminal.focus": true
}
```

### Copy Only (No Terminal)

```json
{
  "agentRef.terminal.send": false,
  "agentRef.copyToClipboard": true
}
```

### With Absolute Paths

```json
{
  "agentRef.pathStyle": "absolute",
  "agentRef.format": "universal"
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

### Wrong Path Format

- Check `agentRef.pathStyle` setting
- Ensure you have a workspace folder open (not just a single file)
- For workspace-relative paths, file must be inside workspace

### Explorer agent command fails

- Run `codex --version` or `opencode --version` in the integrated terminal to confirm the selected CLI is installed and on `PATH`.
- Confirm that `context-menu-loader` is available to the selected CLI.
- The Explorer menu intentionally supports only local files and folders; it is hidden for remote or virtual resources.

## Next Steps

1. Use the extension in your daily workflow
2. Adjust settings to your preference
3. Consider publishing to VS Code Marketplace (optional)
4. Report issues or suggest features
