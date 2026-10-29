import * as vscode from 'vscode';

const MARKDOWN_PREVIEW_VIEW_TYPE = 'markdown.preview';
const PREFIXED_MARKDOWN_PREVIEW_VIEW_TYPE = 'mainThreadWebview-markdown.preview';

const PREVIEW_CONTEXT_VERSION_KEY = 'agentRefPreviewContextVersion';
const PREVIEW_HAS_SELECTION_KEY = 'agentRefHasPreviewSelection';
const PREVIEW_SELECTION_KEY = 'agentRefPreviewSelection';
const PREVIEW_CONTEXT_VERSION = 1;

export type PreviewSelectionParseResult =
  | { kind: 'selection'; text: string }
  | { kind: 'invalid-preview-context' }
  | { kind: 'not-preview' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isMarkdownPreviewViewType(viewType: unknown): boolean {
  return (
    viewType === MARKDOWN_PREVIEW_VIEW_TYPE ||
    viewType === PREFIXED_MARKDOWN_PREVIEW_VIEW_TYPE
  );
}

function getActiveMarkdownPreviewTab(): vscode.Tab | undefined {
  const activeTab = vscode.window.tabGroups?.activeTabGroup?.activeTab;
  if (!activeTab) {
    return undefined;
  }

  const input = activeTab.input as { viewType?: unknown } | undefined;
  return input && isMarkdownPreviewViewType(input.viewType) ? activeTab : undefined;
}

/** Whether the active tab is VS Code's built-in Markdown preview. */
export function isActiveMarkdownPreview(): boolean {
  return getActiveMarkdownPreviewTab() !== undefined;
}

/**
 * Parse the optional context object forwarded by the Markdown preview menu.
 * A malformed object that claims to be Agent Ref preview context is reported
 * separately so callers cannot accidentally use a visible source editor.
 */
export function parsePreviewSelectionArgument(
  argument: unknown
): PreviewSelectionParseResult {
  if (!isRecord(argument)) {
    return { kind: 'not-preview' };
  }

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
  ) {
    return { kind: 'invalid-preview-context' };
  }

  return {
    kind: 'selection',
    text: selectedText
  };
}
