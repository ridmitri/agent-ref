import * as path from 'path';
import type * as vscode from 'vscode';

/**
 * Resolve a URI to its normalized absolute filesystem path.
 *
 * Editor references deliberately use one path contract regardless of the
 * workspace or any user settings. Forward slashes keep the resulting
 * reference portable for terminal-based agents.
 */
export function resolvePath(uri: vscode.Uri): string {
  return normalizePath(path.resolve(uri.fsPath));
}

/**
 * Normalize path to use forward slashes (better for AI agents)
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
