# Changelog

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

### Features for Future Versions

- Multi-cursor/multi-selection support
- Custom output templates with placeholders
- Git root detection for path resolution
- Column range support (currently implemented but disabled by default)
