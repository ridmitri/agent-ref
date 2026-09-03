# Changelog

## [1.0.12] - 2026-09-03

### Fixed

- Grouped all Agent Reference Explorer actions separately from built-in modification actions, preventing them from being interleaved with **Rename…** and **Delete**.
- Rebuilt the extension with the current settings manifest: absolute references, the `agentRef.prompt` text field, and per-agent direct-menu toggles replace the retired Format and Path Style preferences.

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
