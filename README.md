# Agent Reference - VS Code Extension

Quickly copy and send absolute file references to AI coding agents, or launch an agent for a local Explorer resource.

## Features

- **Single hotkey** to create file references with line numbers
- **Absolute-path references** with one deterministic format
- **Clipboard + Terminal integration** for seamless workflow
- **Explorer context menu** for Codex, OpenCode, Claude Code, and Cursor
- **Configurable prompts** and optional direct top-level menu actions

## Usage

### Basic Workflow

1. Select code in your editor (or just place cursor on a line)
2. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
3. Reference is copied to clipboard AND sent to your terminal

### Send an Explorer Resource to an Agent

1. In the Explorer, right-click a local file or folder.
2. Open **Send to Agent** and choose **in Codex**, **in OpenCode**, **in Claude Code**, or **in Cursor**. Enabled agents also appear as direct top-level actions below the flyout.
3. The extension opens a new, focused terminal named for the selected agent and executes the command immediately.

The selected resource is passed as its absolute local path. Before using an agent action, install the corresponding CLI and make its executable available on the integrated terminal's `PATH`:

- Codex CLI (`codex`)
- OpenCode CLI (`opencode`)
- Claude Code CLI (`claude`)
- Cursor CLI (`cursor`)

Configure the `context-menu-loader` skill for each CLI that uses it. The extension does not install or configure the CLIs or skills.

The generated commands use the following forms (the configured prompt is one shell argument):

```bash
codex '<PROMPT>'
opencode --prompt '<PROMPT>'
claude '<PROMPT>'
cursor '<PROMPT>'
```

The default `agentRef.prompt` is `For this session, "the path" refers to "<PATH>". Do not inspect it yet; wait for a later request.` Every literal `<PATH>` is replaced with the selected absolute path. The path is retained as session context without reading the resource, so follow-up requests can refer to "the path". If the configured prompt contains no `<PATH>`, the extension appends exactly `\n path: ${absolutePath}`. The prompt and path are shell-quoted as one argument, so spaces, quotes, and shell metacharacters remain prompt data.

Explorer actions support local `file` resources and POSIX-compatible integrated-terminal shells such as zsh and bash. Remote or virtual resources are not offered by the menu. If a CLI is unavailable, the new terminal still opens and the shell reports its normal command-not-found error.

All four agents remain available in **Send to Agent**. The direct-action settings only control the matching top-level action and update without reloading the extension:

- `agentRef.showCodexInTopLevelMenu`
- `agentRef.showOpenCodeInTopLevelMenu`
- `agentRef.showClaudeCodeInTopLevelMenu`
- `agentRef.showCursorInTopLevelMenu`

Each setting defaults to `true`.

### Reference Format

Editor commands always produce an absolute reference. A single line is formatted as `<absolutePath>:<line>` and a range as `<absolutePath>:<start>-<end>`. There are no selectable format or path-style preferences.

### Commands

- **Agent Ref: Copy and Send Reference** (`agentRef.copySend`) - Default: `Cmd+Shift+R`
- **Agent Ref: Copy Reference Only** (`agentRef.copyOnly`)
- **Agent Ref: Send to Terminal Only** (`agentRef.sendOnly`)

## Configuration

All settings are under the `agentRef` namespace:

- `agentRef.includeColumnRange`: Include column numbers (default: `false`)

### Prompt Settings

- `agentRef.prompt`: Prompt template for Explorer agent actions. Every `<PATH>` is replaced with the selected absolute path; without it, `\n path: ${absolutePath}` is appended.

### Clipboard Settings

- `agentRef.copyToClipboard`: Copy to clipboard (default: `true`)

### Terminal Settings

- `agentRef.terminal.focus`: Focus terminal after sending (default: `true`)
- `agentRef.terminal.send`: Send to terminal input (default: `true`)
- `agentRef.terminal.addNewLine`: Add newline when sending (default: `false`)
- `agentRef.terminal.name`: Terminal name to create/use (default: `"Agent"`)

### Direct Explorer Actions

The **Send to Agent** submenu always contains all four agents. The four `agentRef.show...InTopLevelMenu` settings independently show or hide their matching direct Explorer action; each defaults to `true` and changes take effect immediately.

## Line Range Behavior

- **Empty selection**: Single line reference (e.g., `:120`)
- **Multi-line selection**: Range reference (e.g., `:120-137`)
- **Line selection ending at col 0**: Smart handling to avoid over-counting

## Examples

### Cursor on line 42 (no selection)
```
/Users/me/work/src/utils/helpers.ts:42
```

### Lines 10-25 selected
```
/Users/me/work/src/components/Form.tsx:10-25
```

### Absolute reference
```
/Users/me/work/src/services/api.ts:15-30
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
