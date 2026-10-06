import * as path from 'path';

/** Title an Explorer terminal with its basename, simplifying metadata names. */
export async function resolveTerminalName(
  cwd?: string,
  targetPath?: string
): Promise<string> {
  const selectedPath = targetPath || cwd;
  if (!selectedPath) {
    return 'terminal';
  }

  const resolved = path.resolve(selectedPath);
  const basename = path.basename(resolved) || resolved;
  if (basename.startsWith('.meta.')) {
    const metadataName = basename.slice('.meta.'.length).replace(/\.ya?ml$/, '');
    return metadataName || basename;
  }
  return basename;
}
