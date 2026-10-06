import * as vscode from 'vscode';

/** Exact file identity for terminals created during this extension session. */
export class TerminalFileBindings {
  private readonly bindings = new Map<vscode.Terminal, vscode.Uri>();

  bind(terminal: vscode.Terminal, uri: vscode.Uri): void {
    this.bindings.set(terminal, uri);
  }

  get(terminal: vscode.Terminal): vscode.Uri | undefined {
    return this.bindings.get(terminal);
  }

  remove(terminal: vscode.Terminal): void {
    this.bindings.delete(terminal);
  }

  clear(): void {
    this.bindings.clear();
  }
}

export const terminalFileBindings = new TerminalFileBindings();

/** Keep bindings owned by live terminals and the current extension context. */
export function registerTerminalFileBindingLifecycle(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((terminal) => {
      terminalFileBindings.remove(terminal);
    }),
    new vscode.Disposable(() => terminalFileBindings.clear())
  );
}
