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

### 3. Test the Extension

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

## Next Steps

1. Use the extension in your daily workflow
2. Adjust settings to your preference
3. Consider publishing to VS Code Marketplace (optional)
4. Report issues or suggest features
