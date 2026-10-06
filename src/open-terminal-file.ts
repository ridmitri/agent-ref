import * as vscode from 'vscode';
import { terminalFileBindings } from './terminal-file-binding';

/**
 * Focus the active terminal's exact bound file, retaining title lookup for
 * terminals without a live file binding.
 */
export async function openTerminalFile(): Promise<void> {
  const terminal = vscode.window.activeTerminal;
  if (!terminal) {
    void vscode.window.showErrorMessage('No active terminal.');
    return;
  }

  const boundUri = terminalFileBindings.get(terminal);
  if (boundUri) {
    try {
      const doc = await vscode.workspace.openTextDocument(boundUri);
      await vscode.window.showTextDocument(doc, { preserveFocus: false });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(
        `Unable to open bound file "${boundUri.fsPath}" for terminal "${terminal.name}": ${detail}`
      );
    }
    return;
  }

  const rawTitle = terminal.name;
  const tabTitle = rawTitle.includes('/') ? rawTitle.split('/')[1] : rawTitle;

  const candidates = [
    `**/${tabTitle}*`,
    `**/.meta.${tabTitle}.yml`,
    `**/.meta.${tabTitle}.yaml`,
    `**/${tabTitle}/spec.md`
  ];

  let foundUri: vscode.Uri | undefined;

  for (let i = 0; i < candidates.length; i++) {
    const pattern = candidates[i];
    const exclude = i === 0 ? '**/node_modules/**' : undefined;
    const files = await vscode.workspace.findFiles(pattern, exclude, 1);
    if (files && files.length > 0) {
      foundUri = files[0];
      break;
    }
  }

  if (foundUri) {
    const doc = await vscode.workspace.openTextDocument(foundUri);
    await vscode.window.showTextDocument(doc, { preserveFocus: false });
  } else {
    void vscode.window.showWarningMessage(
      `No matching workspace file found for terminal "${rawTitle}".`
    );
  }
}
