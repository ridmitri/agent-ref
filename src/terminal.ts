import * as vscode from 'vscode';
import { resolveTerminalName } from './repository';
import { terminalFileBindings } from './terminal-file-binding';

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
 * the existing terminal configuration settings. The selected resource supplies
 * the filename title, independently of cwd. Files retain their original URI
 * before dispatch and reveal so navigation does not depend on that title.
 */
export async function launchNewTerminal(
  command: string,
  cwd: string,
  targetPath?: string,
  fileUri?: vscode.Uri
): Promise<void> {
  const terminalName = await resolveTerminalName(cwd, targetPath);
  const terminal = vscode.window.createTerminal({ name: terminalName, cwd });

  if (fileUri) {
    terminalFileBindings.bind(terminal, fileUri);
  }

  // Shell startup files may change directories after createTerminal applies cwd.
  // Reset it immediately before launching, and stop if cd fails. POSIX quoting
  // preserves spaces, apostrophes and shell metacharacters in workspace paths.
  const quotedCwd = "'" + cwd.replace(/'/g, "'\\''") + "'";
  terminal.sendText(`cd -- ${quotedCwd} && ${command}`, true);
  terminal.show(false);

  // `show(false)` activates and reveals the new terminal, but does not
  // consistently transfer keyboard focus from an Explorer context menu.
  // Use VS Code's explicit terminal focus action after activation so typing
  // goes directly to the launched agent.
  return vscode.commands.executeCommand('workbench.action.terminal.focus');
}
