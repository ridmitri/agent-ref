import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Prefer the Git repository folder name as a terminal title.
 *
 * `git rev-parse --show-toplevel` is run from the supplied Explorer path so
 * nested directories still resolve to the repository root. The title is the
 * final segment of that toplevel path.
 *
 * When Git reports that the path is not a repository, title from the supplied
 * Explorer path: a file uses `parentFolder/filename`, a folder uses that
 * folder path.
 */
export async function resolveTerminalName(
  cwd?: string,
  targetPath?: string
): Promise<string> {
  for (const candidate of gitLookupPaths(cwd, targetPath)) {
    const repositoryName = await resolveRepositoryFolderName(candidate);
    if (repositoryName) {
      return repositoryName;
    }
  }

  if (targetPath) {
    return fallbackTitleFromTargetPath(targetPath);
  }

  if (cwd) {
    return fallbackTitleFromTargetPath(cwd);
  }

  return 'terminal';
}

/**
 * Build a terminal title from the supplied Explorer file or folder path.
 *
 * A directory uses the final segment of that folder path. A file uses
 * `parentFolder/filename`. Paths that cannot be stat'ed are treated as files.
 */
export function fallbackTitleFromTargetPath(targetPath: string): string {
  const resolved = path.resolve(targetPath);

  if (isDirectory(resolved)) {
    return folderPathTitle(resolved);
  }

  return parentFolderFileTitle(resolved);
}

/**
 * Resolve the Git repository folder name for a file or directory path.
 *
 * Nested paths are supported: Git walks parents until it finds the work tree.
 */
export async function resolveRepositoryFolderName(
  startPath: string
): Promise<string | undefined> {
  const lookupDir = gitLookupDirectory(startPath);
  const toplevel = await gitShowToplevel(lookupDir);
  if (!toplevel) {
    return undefined;
  }

  return path.basename(toplevel) || undefined;
}

function gitLookupPaths(cwd?: string, targetPath?: string): string[] {
  const paths: string[] = [];

  if (targetPath) {
    paths.push(targetPath);
  }

  if (cwd && cwd !== targetPath) {
    paths.push(cwd);
  }

  return paths;
}

function gitLookupDirectory(startPath: string): string {
  const resolved = path.resolve(startPath);
  if (isDirectory(resolved)) {
    return resolved;
  }

  return path.dirname(resolved);
}

function isDirectory(resolvedPath: string): boolean {
  try {
    return fs.statSync(resolvedPath).isDirectory();
  } catch {
    return false;
  }
}

function folderPathTitle(resolvedPath: string): string {
  return path.basename(resolvedPath) || resolvedPath;
}

function parentFolderFileTitle(resolvedPath: string): string {
  const fileName = path.basename(resolvedPath);
  const parentFolder = path.basename(path.dirname(resolvedPath));

  if (!parentFolder || parentFolder === path.sep) {
    return fileName;
  }

  return `${parentFolder}/${fileName}`;
}

async function gitShowToplevel(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-c', 'safe.directory=*', 'rev-parse', '--show-toplevel'],
      {
        cwd,
        timeout: 5000,
        encoding: 'utf8',
        windowsHide: true,
        env: gitCommandEnv()
      }
    );

    const toplevel = stdout.trim();
    return toplevel || undefined;
  } catch {
    return undefined;
  }
}

function gitCommandEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_PAGER: 'cat'
  };

  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_COMMON_DIR;

  return env;
}
