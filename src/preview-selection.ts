import * as vscode from 'vscode';
import { resolvePath } from './path';

const MARKDOWN_PREVIEW_VIEW_TYPE = 'markdown.preview';
const PREFIXED_MARKDOWN_PREVIEW_VIEW_TYPE = 'mainThreadWebview-markdown.preview';
const MARKDOWN_CUSTOM_PREVIEW_VIEW_TYPE = 'vscode.markdown.preview.editor';
const PREVIEW_CONTEXT_VERSION_KEY = 'agentRefPreviewContextVersion';
const PREVIEW_HAS_SELECTION_KEY = 'agentRefHasPreviewSelection';
const PREVIEW_SELECTION_KEY = 'agentRefPreviewSelection';
const PREVIEW_CONTEXT_VERSION = 1;
const COPY_TIMEOUT_MS = 1000;
const COPY_POLL_INTERVAL_MS = 25;

export type PreviewSelectionParseResult =
  | { kind: 'selection'; text: string }
  | { kind: 'invalid-preview-context' }
  | { kind: 'not-preview' };

export type PreviewSource = { path: string };
export type AcquiredPreviewSelection = { path: string; text: string };
export type ActivePreview = { tab: vscode.Tab; path?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function viewType(input: unknown): unknown {
  return isRecord(input) ? input.viewType : undefined;
}

function isMarkdownPreviewInput(input: unknown): boolean {
  const type = viewType(input);
  return type === MARKDOWN_PREVIEW_VIEW_TYPE ||
    type === PREFIXED_MARKDOWN_PREVIEW_VIEW_TYPE ||
    type === MARKDOWN_CUSTOM_PREVIEW_VIEW_TYPE;
}

export function getActiveMarkdownPreview(): ActivePreview | undefined {
  const tab = vscode.window.tabGroups?.activeTabGroup?.activeTab;
  if (!tab || !isMarkdownPreviewInput(tab.input)) return undefined;
  const input = tab.input as { uri?: vscode.Uri };
  const path = input.uri && typeof input.uri.fsPath === 'string'
    ? resolvePath(input.uri)
    : undefined;
  return { tab, path };
}

export function isActiveMarkdownPreview(): boolean {
  return getActiveMarkdownPreview() !== undefined;
}

/** Return the backing Markdown file path for the active built-in preview. */
export function getActiveMarkdownPreviewSource(): PreviewSource | undefined {
  const preview = getActiveMarkdownPreview();
  return preview?.path ? { path: preview.path } : undefined;
}

export function parsePreviewSelectionArgument(
  argument: unknown
): PreviewSelectionParseResult {
  if (!isRecord(argument)) return { kind: 'not-preview' };

  const claimsAgentRefContext =
    hasOwn(argument, PREVIEW_CONTEXT_VERSION_KEY) ||
    hasOwn(argument, PREVIEW_HAS_SELECTION_KEY) ||
    hasOwn(argument, PREVIEW_SELECTION_KEY);

  if (argument.webview !== MARKDOWN_PREVIEW_VIEW_TYPE) {
    return claimsAgentRefContext
      ? { kind: 'invalid-preview-context' }
      : { kind: 'not-preview' };
  }

  const selectedText = argument[PREVIEW_SELECTION_KEY];
  if (
    !hasOwn(argument, PREVIEW_CONTEXT_VERSION_KEY) ||
    !hasOwn(argument, PREVIEW_HAS_SELECTION_KEY) ||
    !hasOwn(argument, PREVIEW_SELECTION_KEY) ||
    argument[PREVIEW_CONTEXT_VERSION_KEY] !== PREVIEW_CONTEXT_VERSION ||
    argument[PREVIEW_HAS_SELECTION_KEY] !== true ||
    typeof selectedText !== 'string' ||
    selectedText.length === 0
  ) return { kind: 'invalid-preview-context' };

  return { kind: 'selection', text: selectedText };
}

let acquisitionInProgress = false;

/**
 * Ask the active preview to run VS Code's native Copy action and read the
 * resulting text. The marker makes an old clipboard value distinguishable
 * from a fresh copy, including when the same text was already on the clipboard.
 */
export async function acquirePreviewSelection(
  expectedTab: vscode.Tab
): Promise<{ text: string }> {
  if (acquisitionInProgress) throw new Error('Preview text is already being copied.');
  acquisitionInProgress = true;

  let previous = '';
  let marker = '';
  let markerWritten = false;
  let acquired: string | undefined;
  try {
    previous = await vscode.env.clipboard.readText();
    if (getActiveMarkdownPreview()?.tab !== expectedTab) {
      throw new Error('The active Markdown preview changed before copying.');
    }
    marker = `__agentRef_preview_copy_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
    await vscode.env.clipboard.writeText(marker);
    markerWritten = true;
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    if (getActiveMarkdownPreview()?.tab !== expectedTab) {
      throw new Error('The active Markdown preview changed before copying.');
    }
    await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
    const copied = await vscode.env.clipboard.readText();
    if (copied !== marker) {
      if (!copied) throw new Error('No text is selected in the Markdown preview.');
      acquired = copied;
    }
    if (getActiveMarkdownPreview()?.tab !== expectedTab) {
      throw new Error('The active Markdown preview changed while copying.');
    }

    const deadline = Date.now() + COPY_TIMEOUT_MS;
    while (acquired === undefined && Date.now() < deadline) {
      if (getActiveMarkdownPreview()?.tab !== expectedTab) {
        throw new Error('The active Markdown preview changed while copying.');
      }
      const current = await vscode.env.clipboard.readText();
      if (current !== marker) {
        if (!current) throw new Error('No text is selected in the Markdown preview.');
        acquired = current;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, COPY_POLL_INTERVAL_MS));
    }
    if (acquired === undefined) throw new Error('Could not copy selected text from the Markdown preview.');
    return { text: acquired };
  } finally {
    try {
      const current = await vscode.env.clipboard.readText();
      if (markerWritten && (current === marker || (acquired !== undefined && current === acquired))) {
        await vscode.env.clipboard.writeText(previous);
      }
    } finally {
      acquisitionInProgress = false;
    }
  }
}
