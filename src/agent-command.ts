/**
 * Agents supported by the Explorer context menu.
 */
export type AgentTarget = 'codex' | 'opencode';

const CONTEXT_MENU_LOADER = 'context-menu-loader';

/**
 * Build the command sent to the integrated POSIX shell.
 *
 * The path is embedded in the prompt as data and the complete prompt is
 * single-quoted before it is sent to the shell. This keeps whitespace,
 * quotes, glob characters, and shell metacharacters in the selected path
 * inside one argument. The command therefore assumes the local terminal
 * uses a POSIX-compatible shell (for example, zsh or bash).
 */
export function buildAgentCommand(
  target: AgentTarget,
  absolutePath: string
): string {
  const prompt = `use skill "${CONTEXT_MENU_LOADER}" for the path "${absolutePath}"`;
  const quotedPrompt = quotePosixShellArgument(prompt);

  switch (target) {
    case 'codex':
      return `codex ${quotedPrompt}`;
    case 'opencode':
      return `opencode --prompt ${quotedPrompt}`;
    default:
      return assertNever(target);
  }
}

/**
 * Quote one argument for a POSIX shell using the shell's single-quote form.
 * An embedded apostrophe ends the quote, emits an escaped apostrophe, and
 * starts the quote again.
 */
function quotePosixShellArgument(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported agent target: ${String(value)}`);
}
