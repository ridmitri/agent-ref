import * as vscode from 'vscode';
import { resolveTerminalName } from './repository';

export type TerminalConfig = {
  focus: boolean;
  send: boolean;
  addNewLine: boolean;
  name: string;
};

/**
 * Send text to terminal
 * Creates terminal if needed, optionally focuses it
 */
export function sendToTerminal(text: string, config: TerminalConfig): void {
  if (!config.send) {
    return;
  }

  // Get or create terminal
  const terminal = vscode.window.activeTerminal ??
    vscode.window.createTerminal(config.name);

  // Focus if requested
  if (config.focus) {
    // `false` does not preserve editor focus, so keyboard input goes to the
    // receiving terminal instead of remaining in the editor.
    terminal.show(false);
  }

  // Send text
  terminal.sendText(text, config.addNewLine);
}

/**
 * Create a focused terminal and execute a complete command in it.
 *
 * This is intentionally separate from sendToTerminal: Explorer agent actions
 * must always get a fresh terminal and execute immediately, independently of
 * the existing terminal configuration settings. When cwd is provided, the terminal
 * is initialized in that working directory and titled with the Git repository
 * folder name from `git rev-parse --show-toplevel` on the supplied path.
 * Nested paths resolve to that repository root. Otherwise the title uses
 * `parentFolder/filename` for a file or the folder path for a directory.
 */
export async function launchNewTerminal(
  command: string,
  cwd?: string,
  targetPath?: string
): Promise<void> {
  const terminalName = await resolveTerminalName(cwd, targetPath);
  const terminal = cwd
    ? vscode.window.createTerminal({ name: terminalName, cwd })
    : vscode.window.createTerminal(terminalName);

  terminal.sendText(command, true);
  terminal.show(false);

  // `show(false)` activates and reveals the new terminal, but does not
  // consistently transfer keyboard focus from an Explorer context menu.
  // Use VS Code's explicit terminal focus action after activation so typing
  // goes directly to the launched agent.
  return vscode.commands.executeCommand('workbench.action.terminal.focus');
}
