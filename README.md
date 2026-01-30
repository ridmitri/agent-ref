# Agent Reference - VS Code Extension

Quickly copy and send file references to AI coding agents like Claude Code, Cursor, and others.

## Features

- **Single hotkey** to create file references with line numbers
- **Multiple output formats** for different AI tools
- **Clipboard + Terminal integration** for seamless workflow
- **Workspace-relative paths** by default

## Usage

### Basic Workflow

1. Select code in your editor (or just place cursor on a line)
2. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
3. Reference is copied to clipboard AND sent to your terminal

### Output Formats

Configure via `agentRef.format` setting:

- **`universal`** (default): `src/components/Button.tsx:120-137`
- **`claude`**: `@src/components/Button.tsx#120-137`
- **`abs`**: `/absolute/path/to/file.tsx:120-137`
- **`markdown`**: `` `src/components/Button.tsx:120-137` ``

### Commands

- **Agent Ref: Copy and Send Reference** (`agentRef.copySend`) - Default: `Cmd+Shift+R`
- **Agent Ref: Copy Reference Only** (`agentRef.copyOnly`)
- **Agent Ref: Send to Terminal Only** (`agentRef.sendOnly`)

## Configuration

All settings are under the `agentRef` namespace:

### Format Settings

- `agentRef.format`: Output format (see above)
- `agentRef.pathStyle`: `auto` | `relative` | `absolute`
- `agentRef.includeColumnRange`: Include column numbers (default: `false`)

### Clipboard Settings

- `agentRef.copyToClipboard`: Copy to clipboard (default: `true`)

### Terminal Settings

- `agentRef.terminal.focus`: Focus terminal after sending (default: `true`)
- `agentRef.terminal.send`: Send to terminal input (default: `true`)
- `agentRef.terminal.addNewLine`: Add newline when sending (default: `false`)
- `agentRef.terminal.name`: Terminal name to create/use (default: `"Agent"`)

## Line Range Behavior

- **Empty selection**: Single line reference (e.g., `:120`)
- **Multi-line selection**: Range reference (e.g., `:120-137`)
- **Line selection ending at col 0**: Smart handling to avoid over-counting

## Examples

### Cursor on line 42 (no selection)
```
src/utils/helpers.ts:42
```

### Lines 10-25 selected
```
src/components/Form.tsx:10-25
```

### With Claude format
```
@src/services/api.ts#15-30
```

## Development

### Setup

```bash
npm install
npm run compile
```

### Testing

Press `F5` in VS Code to launch Extension Development Host.

### Build VSIX

```bash
npm install -g vsce
vsce package
```

## License

MIT
