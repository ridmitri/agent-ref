import * as vscode from 'vscode';
import { computeLineRange } from './selection';
import { resolvePath, resolveWorkingDirectory } from './path';
import { formatRef } from './formatter';
import {
  AGENT_METADATA,
  AgentMetadata,
  buildAgentCommand,
  DEFAULT_PROMPT
} from './agent-command';
import { getTopLevelMenuContextUpdate } from './menu-preferences';
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
  const agentCommands = Object.values(AGENT_METADATA).map((agent) =>
    vscode.commands.registerCommand(
      agent.commandId,
      (uri?: vscode.Uri) => executeAgentCommand(agent, uri)
    )
  );

  registerTopLevelMenuVisibility(context);

  context.subscriptions.push(
    copySend,
    copyOnly,
    sendOnly,
    ...agentCommands
  );
}

/**
 * Mirror each top-level menu preference into its own VS Code context key.
 *
 * The initial values are applied during activation, and subsequent updates
 * only refresh agents whose setting was changed. The submenu intentionally
 * has no dependency on these keys and therefore always retains all agents.
 */
function registerTopLevelMenuVisibility(
  context: vscode.ExtensionContext
): void {
  const refresh = (agent: AgentMetadata): void => {
    const configuration = vscode.workspace.getConfiguration('agentRef');
    const update = getTopLevelMenuContextUpdate(agent, configuration);
    void vscode.commands.executeCommand(
      'setContext',
      update.contextKey,
      update.value
    );
  };

  const agents = Object.values(AGENT_METADATA);
  agents.forEach(refresh);

  const configurationListener = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      agents.forEach((agent) => {
        const settingPath = `agentRef.${agent.directMenuSettingKey}`;
        if (event.affectsConfiguration(settingPath)) {
          refresh(agent);
        }
      });
    }
  );

  context.subscriptions.push(configurationListener);
}

/**
 * Launch an agent for the local Explorer resource supplied to the command.
 *
 * Explorer context-menu commands are normally passed a file URI, but keeping
 * this guard here makes direct/accidental invocations safe as well.
 */
function executeAgentCommand(
  agent: AgentMetadata,
  uri?: vscode.Uri
): Thenable<void> | void {
  if (!uri || uri.scheme !== 'file' || !uri.fsPath) {
    vscode.window.showInformationMessage(
      'Select a local file or folder in Explorer to send it to an agent.'
    );
    return;
  }

  const config = vscode.workspace.getConfiguration('agentRef');
  const prompt = config.get<string>('prompt', DEFAULT_PROMPT);
  const configuredWorkingDirectory = config.get<string>('workingDirectory', '');

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const workspaceRoot = workspaceFolder?.uri.fsPath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const cwd = resolveWorkingDirectory(
    uri.fsPath,
    configuredWorkingDirectory,
    workspaceRoot
  );

  return launchNewTerminal(
    buildAgentCommand(agent.target, uri.fsPath, prompt),
    cwd,
    uri.fsPath
  );
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
  const includeColumns = config.get<boolean>('includeColumnRange', false);
  const copyEnabled = options.copyToClipboard &&
    config.get<boolean>('copyToClipboard', true);

  // Compute line range
  const range = computeLineRange(editor, includeColumns);

  // Resolve path
  const absolutePath = resolvePath(editor.document.uri);

  // Format reference
  const reference = formatRef({
    path: absolutePath,
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
  if (copyEnabled) {
    action.push('Copied');
  }
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
