# Changelog

## [1.0.16-alpha.7] - 2026-09-04

### Changed

- Explorer agent terminals are titled with the Git repository folder from `git rev-parse --show-toplevel` on the selected path. Nested directories such as `my-repo/frontend/src/components` title the terminal `my-repo`.
- If Git reports that the path is not a repository, a file uses `parentFolder/filename` and a folder uses the folder name. For example, `~/Desktop/my/document` titles the terminal `document`. Agent display names are not used as titles.
- Explorer **Open in Cursor** invokes the standalone `agent` CLI instead of `cursor`.

### Fixed

- Editor reference commands transfer keyboard focus to the receiving terminal when terminal focus is enabled.

## [1.0.15] - 2026-09-04

### Fixed

- Explorer agent launches now explicitly transfer keyboard focus to the new integrated terminal after submitting the command.

## [1.0.14] - 2026-09-04

### Added

- Added `agentRef.workingDirectory` setting to configure the working directory for agent terminal sessions, configurable per workspace.
- Automatic fallback: when `agentRef.workingDirectory` is empty or unset, agent terminal sessions launch directly in the selected folder or the parent folder of the selected file.
- Option to specify absolute paths or workspace-relative paths for `agentRef.workingDirectory`.

### Fixed

- Focus a newly created Explorer agent terminal after its command is queued, so it remains the active terminal.

## [1.0.12] - 2026-09-03

### Fixed

- Grouped all Agent Reference Explorer actions separately from built-in modification actions, preventing them from being interleaved with **Rename…** and **Delete**.
- Rebuilt the extension with the current settings manifest: absolute references, the `agentRef.prompt` text field, and per-agent direct-menu toggles replace the retired Format and Path Style preferences.

### Changed

- The default prompt now establishes the selected path as session context and instructs the agent to wait for a follow-up request before inspecting it.

## [1.0.11] - 2026-09-03

### Added

- Explorer **Send to Agent** actions for Codex, OpenCode, Claude Code, and Cursor.
- A configurable `agentRef.prompt` template. Use `<PATH>` to insert the selected absolute file or folder path; templates without it receive an appended path line.
- Per-agent preferences to show or hide direct top-level Explorer actions while keeping every agent in the **Send to Agent** submenu.
- Unit coverage for agent commands, prompt templates, menu preferences, and absolute references.

### Changed

- File references now always use the absolute-path format with a line or line range.
- Explorer launches create a focused, new integrated terminal and execute the selected agent command immediately.

## [1.0.0] - 2026-01-30

### Added

- Initial release
- Copy file references with line ranges to clipboard
- Send references to integrated terminal
- Multiple output formats:
  - Universal: `src/file.ts:10-12`
  - Claude: `@src/file.ts#10-12`
  - Absolute: `/abs/path/file.ts:10-12`
  - Markdown: `` `src/file.ts:10-12` ``
- Configurable path styles (auto, relative, absolute)
- Smart line range computation:
  - Empty selection → single line reference
  - Multi-line selection → range reference
  - Handles end-at-column-0 selections correctly
- Workspace-relative paths by default
- Three commands:
  - Copy and Send (default: `Cmd+Shift+R`)
  - Copy Only
  - Send to Terminal Only
- Comprehensive configuration options:
  - Output format
  - Path style
  - Clipboard integration
  - Terminal integration (focus, send, newline, name)
  - Optional column ranges
