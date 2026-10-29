const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

function loadPreviewSelection({ activeTab } = {}) {
  const originalLoad = Module._load;
  const modulePath = require.resolve('../out/preview-selection.js');
  delete require.cache[modulePath];

  const mockVscode = {
    window: {
      get tabGroups() {
        return { activeTabGroup: { activeTab } };
      }
    }
  };

  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') return mockVscode;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require('../out/preview-selection.js');
  } finally {
    Module._load = originalLoad;
  }
}

test('recognizes both built-in Markdown preview tab representations', () => {
  const plainPreview = { input: { viewType: 'markdown.preview' } };
  const prefixedPreview = {
    input: { viewType: 'mainThreadWebview-markdown.preview' }
  };
  const otherWebview = { input: { viewType: 'publisher.preview' } };
  const editorTab = { input: { uri: '/workspace/file.md' } };

  assert.equal(loadPreviewSelection({ activeTab: plainPreview }).isActiveMarkdownPreview(), true);
  assert.equal(loadPreviewSelection({ activeTab: prefixedPreview }).isActiveMarkdownPreview(), true);
  assert.equal(loadPreviewSelection({ activeTab: otherWebview }).isActiveMarkdownPreview(), false);
  assert.equal(loadPreviewSelection({ activeTab: editorTab }).isActiveMarkdownPreview(), false);
  assert.equal(loadPreviewSelection({ activeTab: undefined }).isActiveMarkdownPreview(), false);
});

test('accepts exact nonempty preview text without trimming or changing it', () => {
  const { parsePreviewSelectionArgument } = loadPreviewSelection();
  const selectedText = '  exact selection\nwith emoji 🧪 and "quotes"  ';

  assert.deepEqual(
    parsePreviewSelectionArgument({
      webview: 'markdown.preview',
      agentRefPreviewContextVersion: 1,
      agentRefHasPreviewSelection: true,
      agentRefPreviewSelection: selectedText
    }),
    { kind: 'selection', text: selectedText }
  );
});

test('distinguishes unrelated command arguments from invalid preview context', () => {
  const { parsePreviewSelectionArgument } = loadPreviewSelection();

  assert.deepEqual(parsePreviewSelectionArgument(undefined), { kind: 'not-preview' });
  assert.deepEqual(parsePreviewSelectionArgument('markdown.preview'), { kind: 'not-preview' });
  assert.deepEqual(parsePreviewSelectionArgument({ webview: 'publisher.panel' }), { kind: 'not-preview' });

  for (const argument of [
    { webview: 'markdown.preview' },
    {
      webview: 'markdown.preview',
      agentRefPreviewContextVersion: 2,
      agentRefHasPreviewSelection: true,
      agentRefPreviewSelection: 'selection'
    },
    {
      webview: 'markdown.preview',
      agentRefPreviewContextVersion: 1,
      agentRefHasPreviewSelection: false,
      agentRefPreviewSelection: 'stale selection'
    },
    {
      webview: 'markdown.preview',
      agentRefPreviewContextVersion: 1,
      agentRefHasPreviewSelection: true,
      agentRefPreviewSelection: ''
    },
    {
      webview: 'markdown.preview',
      agentRefPreviewContextVersion: 1,
      agentRefHasPreviewSelection: true,
      agentRefPreviewSelection: 42
    },
    { agentRefPreviewSelection: 'selection' },
    {
      webview: 'publisher.panel',
      agentRefPreviewContextVersion: 1,
      agentRefHasPreviewSelection: true,
      agentRefPreviewSelection: 'selection'
    }
  ]) {
    assert.deepEqual(
      parsePreviewSelectionArgument(argument),
      { kind: 'invalid-preview-context' }
    );
  }
});
