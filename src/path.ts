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

/** Resolve only the authoritative workspace exported to the extension host. */
export function resolveWorkingDirectory(
  workspacePath: string | undefined = process.env.WORKSPACE_PATH
): string {
  if (!workspacePath || !workspacePath.trim() || !path.isAbsolute(workspacePath)) {
    throw new Error('WORKSPACE_PATH must be a nonempty absolute directory path.');
  }

  try {
    if (!fs.statSync(workspacePath).isDirectory()) {
      throw new Error('not a directory');
    }
  } catch {
    throw new Error('WORKSPACE_PATH must point to an existing, accessible directory.');
  }

  return normalizePath(path.resolve(workspacePath));
}

/**
 * Normalize path to use forward slashes (better for AI agents)
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
