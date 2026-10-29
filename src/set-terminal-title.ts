import * as path from 'path';
import * as vscode from 'vscode';

export const SET_TERMINAL_TITLE_COMMAND =
  'agentRef.setTerminalTitleFromActiveFile';

/**
 * Rename only the active terminal to the selected local file basename, or the
 * active editor basename when invoked without an Explorer URI.
 */
export async function setTerminalTitleFromActiveFile(
  selectedUri?: vscode.Uri
): Promise<void> {
  let name: string;
  if (selectedUri !== undefined) {
    if (selectedUri.scheme !== 'file' || !selectedUri.fsPath) {
      vscode.window.showInformationMessage(
        'Select a local file before renaming the active terminal.'
      );
      return;
    }
    name = path.basename(selectedUri.fsPath);
  } else {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage(
        'Open a saved local file in an editor before renaming the active terminal.'
      );
      return;
    }

    const document = editor.document;
    if (document.isUntitled) {
      vscode.window.showInformationMessage(
        'Save the active file before renaming the terminal.'
      );
      return;
    }

    if (document.uri.scheme !== 'file') {
      vscode.window.showInformationMessage(
        'The active editor must contain a saved local file before renaming the terminal.'
      );
      return;
    }
    name = path.basename(document.fileName);
  }

  const terminal = vscode.window.activeTerminal;

  if (!terminal) {
    vscode.window.showInformationMessage(
      'No active terminal. Activate a terminal tab before renaming it.'
    );
    return;
  }

  try {
    await vscode.commands.executeCommand(
      'workbench.action.terminal.renameWithArg',
      { name }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(
      `Could not rename the active terminal to "${name}": ${detail}`
    );
    return;
  }

  if (terminal.name !== name) {
    void vscode.window.showErrorMessage(
      `Could not rename the active terminal to "${name}": the terminal title was not updated.`
    );
  }
}
