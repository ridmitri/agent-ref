import * as vscode from 'vscode';
import { computeLineRange } from './selection';
import { resolvePath, PathStyle } from './path';
import { formatRef, ReferenceFormat } from './formatter';
import { sendToTerminal, TerminalConfig } from './terminal';

export function activate(context: vscode.ExtensionContext) {
  // Register primary command: copy and send
  const copySend = vscode.commands.registerCommand('agentRef.copySend', () => {
    executeCommand({ copyToClipboard: true, sendToTerminal: true });
  });

  // Register secondary command: copy only
  const copyOnly = vscode.commands.registerCommand('agentRef.copyOnly', () => {
    executeCommand({ copyToClipboard: true, sendToTerminal: false });
  });

  // Register secondary command: send only
  const sendOnly = vscode.commands.registerCommand('agentRef.sendOnly', () => {
    executeCommand({ copyToClipboard: false, sendToTerminal: true });
  });

  context.subscriptions.push(copySend, copyOnly, sendOnly);
}

type CommandOptions = {
  copyToClipboard: boolean;
  sendToTerminal: boolean;
};

/**
 * Main command execution logic
 */
function executeCommand(options: CommandOptions): void {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showInformationMessage('No active editor');
    return;
  }

  // Get configuration
  const config = vscode.workspace.getConfiguration('agentRef');
  const format = config.get<ReferenceFormat>('format', 'universal');
  const pathStyle = config.get<PathStyle>('pathStyle', 'auto');
  const includeColumns = config.get<boolean>('includeColumnRange', false);
  const copyEnabled = options.copyToClipboard &&
    config.get<boolean>('copyToClipboard', true);

  // Compute line range
  const range = computeLineRange(editor, includeColumns);

  // Resolve path
  const resolvedPath = resolvePath(editor.document.uri, pathStyle);

  // Format reference
  const reference = formatRef({
    format,
    path: resolvedPath.path,
    range
  });

  // Copy to clipboard
  if (copyEnabled) {
    vscode.env.clipboard.writeText(reference);
  }

  // Send to terminal
  if (options.sendToTerminal) {
    const terminalConfig: TerminalConfig = {
      focus: config.get('terminal.focus', true),
      send: config.get('terminal.send', true),
      addNewLine: config.get('terminal.addNewLine', false),
      name: config.get('terminal.name', 'Agent')
    };
    sendToTerminal(reference, terminalConfig);
  }

  // Show status message
  const action = [];
  if (copyEnabled) action.push('Copied');
  if (options.sendToTerminal && config.get('terminal.send', true)) {
    action.push('sent to terminal');
  }

  if (action.length > 0) {
    vscode.window.setStatusBarMessage(
      `${action.join(' and ')}: ${reference}`,
      3000
    );
  }
}

export function deactivate() {}
