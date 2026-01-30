import * as vscode from 'vscode';

export type LineRange = {
  start: number;
  end: number;
  startCol?: number;
  endCol?: number;
};

/**
 * Compute line range from editor selection
 * Uses 1-based line numbers (VS Code uses 0-based internally)
 */
export function computeLineRange(
  editor: vscode.TextEditor,
  includeColumns = false
): LineRange {
  const selection = editor.selection;

  // Convert to 1-based line numbers
  let start = selection.start.line + 1;
  let end = selection.end.line + 1;

  // Handle special case: selection ends at column 0 of a later line
  // This commonly happens with line selection and shouldn't over-count
  if (selection.end.character === 0 && end > start) {
    end = end - 1;
  }

  const result: LineRange = { start, end };

  if (includeColumns) {
    result.startCol = selection.start.character;
    result.endCol = selection.end.character;
  }

  return result;
}
