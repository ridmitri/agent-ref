import * as vscode from 'vscode';

/**
 * Open a workspace file matching the active terminal title or fallback metadata/spec.
 */
export async function openTerminalFile(): Promise<void> {
  const terminal = vscode.window.activeTerminal;
  if (!terminal) {
    void vscode.window.showErrorMessage('No active terminal.');
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
    await vscode.window.showTextDocument(doc);
  } else {
    void vscode.window.showWarningMessage(
      `No matching workspace file found for terminal "${rawTitle}".`
    );
  }
}
