import * as vscode from 'vscode';
import { computeLineRange } from './selection';
import { resolvePath, PathStyle } from './path';
import { formatRef, ReferenceFormat } from './formatter';
import { buildAgentCommand, AgentTarget } from './agent-command';
import { launchNewTerminal, sendToTerminal, TerminalConfig } from './terminal';

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

  // Explorer commands receive the selected resource as a URI. Keep this
  // path separate from the active-editor commands above: a folder can be
  // selected without an active editor, and the editor may point elsewhere.
  const sendToCodex = vscode.commands.registerCommand(
    'agentRef.sendToCodex',
    (uri?: vscode.Uri) => executeAgentCommand('codex', uri)
  );

  const sendToOpenCode = vscode.commands.registerCommand(
    'agentRef.sendToOpenCode',
    (uri?: vscode.Uri) => executeAgentCommand('opencode', uri)
  );

  context.subscriptions.push(
    copySend,
    copyOnly,
    sendOnly,
    sendToCodex,
    sendToOpenCode
  );
}

/**
 * Launch an agent for the local Explorer resource supplied to the command.
 *
 * Explorer context-menu commands are normally passed a file URI, but keeping
 * this guard here makes direct/accidental invocations safe as well.
 */
function executeAgentCommand(target: AgentTarget, uri?: vscode.Uri): void {
  if (!uri || uri.scheme !== 'file' || !uri.fsPath) {
    vscode.window.showInformationMessage(
      'Select a local file or folder in Explorer to send it to an agent.'
    );
    return;
  }

  const terminalName = target === 'codex' ? 'Codex' : 'OpenCode';
  launchNewTerminal(terminalName, buildAgentCommand(target, uri.fsPath));
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
