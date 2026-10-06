# Agent Reference - VS Code Extension

Quickly copy and send absolute file references to AI coding agents, or launch an agent for a local Explorer resource.

## Features

- **Single hotkey** to create file references with line numbers
- **Absolute-path references** with one deterministic format
- **Clipboard + Terminal integration** for seamless workflow
- **Explorer context menu** for Codex, OpenCode, Claude Code, and Cursor
- **Filename terminal titles** and optional direct top-level menu actions
- **Exact-file return navigation** with **Open File for Terminal** (`Cmd+Ctrl+E`)

## Usage

### Basic Workflow

1. Select code in your editor (or just place cursor on a line)
2. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
3. Reference is copied to clipboard AND sent to your terminal

### Open an Explorer Resource with an Agent

1. In Explorer, right-click a local file or folder.
2. Open **Select Agent** and choose **Open in Codex**, **Open in OpenCode**, **Open in Claude Code**, or **Open in Cursor**. Enabled agents also appear as direct top-level actions.
3. A fresh terminal opens with the selected filename as the title. Names beginning with `.meta.` omit that prefix and a trailing `.yml` or `.yaml`; for example, `.meta.DP-19929_fe_network_hierarchy.yml` becomes `DP-19929_fe_network_hierarchy`. Other filenames retain their extensions. The selected agent starts and waits for your input.
4. To return to the selected file, select its terminal and invoke **Agent Ref: Open File for Terminal** from the Command Palette or press `Cmd+Ctrl+E`.

A file launch binds the new terminal to the exact selected file URI. You can choose any ordinary file or a task `.meta` file; metadata is optional and is not parsed. Files with the same filename receive the same visible terminal title but retain distinct bindings. Renaming a terminal does not change its bound file.

Every agent starts in the absolute directory specified by `WORKSPACE_PATH` in the VS Code extension host environment, regardless of the selected file or open project roots. Set it before starting VS Code, for example `export WORKSPACE_PATH=/Users/dryzhov/work`, then fully quit and restart VS Code so the host inherits it. The path must exist and be a directory. Missing, relative, inaccessible, or invalid values produce an error and prevent terminal creation. Folder launches use the folder basename as the title and have no file binding.

Install the corresponding CLI and make its executable available on the integrated terminal's `PATH`:

- Codex CLI (`codex`)
- OpenCode CLI (`opencode`)
- Claude Code CLI (`claude`)
- Cursor CLI (`agent`)

The extension resets the shell to the validated workspace immediately before starting the selected CLI, so shell startup scripts cannot leave the agent in a different directory. It uses a quoted `cd -- <workspace> && <executable>` bootstrap in the integrated POSIX shell (such as zsh or bash):

```bash
cd -- '/Users/dryzhov/work' && codex
cd -- '/Users/dryzhov/work' && opencode
cd -- '/Users/dryzhov/work' && claude
cd -- '/Users/dryzhov/work' && agent
```

No startup message or selected path is sent to the agent automatically. Use the agent chat to assign your task. Explorer actions support local `file` resources. If a CLI is unavailable, the new terminal opens and the shell reports its normal command-not-found error.

All four agents remain available in **Select Agent**. The direct-action settings control their matching top-level actions and update without reloading the extension:

- `agentRef.showCodexInTopLevelMenu`
- `agentRef.showOpenCodeInTopLevelMenu`
- `agentRef.showClaudeCodeInTopLevelMenu`
- `agentRef.showCursorInTopLevelMenu`

Each setting defaults to `true`.

### Open File for Terminal

Select the agent terminal, then invoke **Agent Ref: Open File for Terminal** (`agentRef.openTerminalFile`) or press `Cmd+Ctrl+E` (Mac) / `Ctrl+Cmd+E` (Windows/Linux). This opens and focuses its exact bound file, including ignored `.work` artifacts. Selecting a terminal tab alone keeps terminal input focus and does not navigate to a file. The command also works when the terminal is already active.

If the bound file cannot be opened, the extension reports the failure and does not substitute a similarly named file. Bindings exist only for live extension-created terminals during the current extension session. Closing a terminal removes its binding; bindings do not persist across window or extension reload and do not follow file moves.

Unbound terminals, including folder launches and restored terminals, retain the existing title-based workspace lookup. For a title containing `/`, lookup uses its second segment. It searches the following patterns in order and opens the first match:

- `**/<tabTitle>*` (excluding `node_modules`)
- `**/.meta.<tabTitle>.yml`
- `**/.meta.<tabTitle>.yaml`
- `**/<tabTitle>/spec.md`

No match produces a warning, and invoking the command without an active terminal produces an error.

Editor commands always produce an absolute reference. A single line is formatted as `<absolutePath>:<line>` and a range as `<absolutePath>:<start>-<end>`. There are no selectable format or path-style preferences.

### Commands

- **Agent Ref: Copy and Send Reference** (`agentRef.copySend`) - Default: `Cmd+Shift+R`
- **Agent Ref: Copy Reference Only** (`agentRef.copyOnly`)
- **Agent Ref: Send to Terminal Only** (`agentRef.sendOnly`)
- **Agent Ref: Open File for Terminal** (`agentRef.openTerminalFile`) - Default: `Cmd+Ctrl+E` / `Ctrl+Cmd+E`

## Configuration

All settings are under the `agentRef` namespace:

- `agentRef.includeColumnRange`: Include column numbers (default: `false`)

### Legacy Explorer Settings

- `agentRef.prompt`: Retained legacy setting; inactive for Explorer agent launches. No automatic message is sent.
- `agentRef.workingDirectory`: Retained legacy setting; inactive for Explorer agent launches. Launches require the validated `WORKSPACE_PATH` environment directory described above.

### Clipboard Settings

- `agentRef.copyToClipboard`: Copy to clipboard (default: `true`)

### Terminal Settings

- `agentRef.terminal.focus`: Focus terminal after sending (default: `true`)
- `agentRef.terminal.send`: Send to terminal input (default: `true`)
- `agentRef.terminal.addNewLine`: Add newline when sending (default: `false`)
- `agentRef.terminal.name`: Terminal name to create/use (default: `"Agent"`)

### Direct Explorer Actions

The **Select Agent** submenu always contains all four agents. The four `agentRef.show...InTopLevelMenu` settings independently show or hide their matching direct Explorer action; each defaults to `true` and changes take effect immediately.

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
