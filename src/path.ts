import * as fs from 'fs';
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
 * Resolve the working directory for an agent terminal session.
 *
 * If `configuredWorkingDir` is specified (non-empty string):
 * - If it is relative and `workspaceRoot` is provided, resolves relative to `workspaceRoot`.
 * - Otherwise, resolves it to an absolute path.
 *
 * If `configuredWorkingDir` is empty or undefined:
 * - Falls back to the directory of `targetPath`. If `targetPath` is a directory, returns it directly;
 *   if it is a file (or doesn't exist as a directory), returns its parent directory `path.dirname(targetPath)`.
 */
export function resolveWorkingDirectory(
  targetPath: string,
  configuredWorkingDir?: string,
  workspaceRoot?: string
): string {
  const trimmed = configuredWorkingDir?.trim();
  if (trimmed) {
    if (!path.isAbsolute(trimmed) && workspaceRoot) {
      return normalizePath(path.resolve(workspaceRoot, trimmed));
    }
    return normalizePath(path.resolve(trimmed));
  }

  const normalizedTarget = path.resolve(targetPath);
  try {
    const stats = fs.statSync(normalizedTarget);
    if (stats.isDirectory()) {
      return normalizePath(normalizedTarget);
    }
  } catch {
    // If stat fails (e.g. file doesn't exist yet on disk), fallback to dirname
  }

  return normalizePath(path.dirname(normalizedTarget));
}

/**
 * Normalize path to use forward slashes (better for AI agents)
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
