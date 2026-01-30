import * as vscode from 'vscode';
import * as path from 'path';

export type PathStyle = 'auto' | 'relative' | 'absolute';

export type ResolvedPath = {
  path: string;
  isRelative: boolean;
};

/**
 * Resolve file path based on workspace and settings
 * Returns workspace-relative path when possible, normalized with forward slashes
 */
export function resolvePath(
  uri: vscode.Uri,
  pathStyle: PathStyle = 'auto'
): ResolvedPath {
  const absolutePath = uri.fsPath;

  // If absolute style requested, return it directly
  if (pathStyle === 'absolute') {
    return {
      path: normalizePath(absolutePath),
      isRelative: false
    };
  }

  // Try to get workspace-relative path
  const wsFolder = vscode.workspace.getWorkspaceFolder(uri);

  if (wsFolder) {
    const relativePath = path.relative(wsFolder.uri.fsPath, absolutePath);
    return {
      path: normalizePath(relativePath),
      isRelative: true
    };
  }

  // No workspace folder found
  if (pathStyle === 'relative') {
    // Relative requested but no workspace - use basename
    return {
      path: normalizePath(path.basename(absolutePath)),
      isRelative: true
    };
  }

  // Auto mode: fall back to absolute
  return {
    path: normalizePath(absolutePath),
    isRelative: false
  };
}

/**
 * Normalize path to use forward slashes (better for AI agents)
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
