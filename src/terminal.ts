import * as vscode from 'vscode';

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
    terminal.show(true);
  }

  // Send text
  terminal.sendText(text, config.addNewLine);
}
