const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

function loadPreviewSelection({ activeTab, mockVscode: suppliedMock } = {}) {
  const originalLoad = Module._load;
  const modulePath = require.resolve('../out/preview-selection.js');
  delete require.cache[modulePath];

  const mockVscode = suppliedMock || {
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

function loadPreviewSelectionWithClipboard({
  initialClipboard = 'original clipboard',
  onCopy = () => {},
  beforeRead = () => {}
} = {}) {
  const tab = {
    input: {
      viewType: 'vscode.markdown.preview.editor',
      uri: { fsPath: '/workspace/research.md' }
    }
  };
  const writes = [];
  const reads = [];
  let clipboard = initialClipboard;
  let readCount = 0;
  const mockVscode = {
    window: {
      tabGroups: { activeTabGroup: { get activeTab() { return tab; } } }
    },
    env: {
      clipboard: {
        async readText() {
          readCount += 1;
          await beforeRead(readCount, () => clipboard);
          reads.push({ readNumber: readCount, value: clipboard });
          return clipboard;
        },
        async writeText(text) {
          writes.push(text);
          clipboard = text;
        }
      }
    },
    commands: {
      async executeCommand(command) {
        if (command === 'editor.action.clipboardCopyAction') {
          await onCopy((text) => { clipboard = text; });
        }
      }
    }
  };
  return {
    helper: loadPreviewSelection({ activeTab: tab, mockVscode }),
    get clipboard() { return clipboard; },
    set clipboard(value) { clipboard = value; },
    writes,
    reads,
    tab
  };
}

test('recognizes webview and custom editor Markdown preview tabs', () => {
  const plainPreview = { input: { viewType: 'markdown.preview' } };
  const prefixedPreview = {
    input: { viewType: 'mainThreadWebview-markdown.preview' }
  };
  const customPreview = {
    input: {
      viewType: 'vscode.markdown.preview.editor',
      uri: { fsPath: '/workspace/research.md' }
    }
  };
  const otherWebview = { input: { viewType: 'publisher.preview' } };
  const editorTab = { input: { uri: '/workspace/file.md' } };

  assert.equal(loadPreviewSelection({ activeTab: plainPreview }).isActiveMarkdownPreview(), true);
  assert.equal(loadPreviewSelection({ activeTab: prefixedPreview }).isActiveMarkdownPreview(), true);
  assert.equal(loadPreviewSelection({ activeTab: customPreview }).isActiveMarkdownPreview(), true);
  assert.equal(
    loadPreviewSelection({ activeTab: customPreview }).getActiveMarkdownPreviewSource().path,
    '/workspace/research.md'
  );
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

test('waits for native Copy to replace the marker and accepts selection equal to prior clipboard', async () => {
  const original = 'same selected passage';
  const fixture = loadPreviewSelectionWithClipboard({
    initialClipboard: original,
    onCopy: (writeSelection) => {
      setTimeout(() => writeSelection(original), 35);
    }
  });

  const result = await fixture.helper.acquirePreviewSelection(fixture.tab);

  assert.deepEqual(result, { text: original });
  assert.equal(fixture.clipboard, original);
  assert.equal(fixture.writes.length, 2);
  assert.match(fixture.writes[0], /^__agentRef_preview_copy_/);
  assert.equal(fixture.writes[1], original);
  assert.ok(fixture.reads.some(({ readNumber, value }) =>
    readNumber >= 3 && value === fixture.writes[0]
  ));
});

test('times out on an unchanged marker and preserves the original clipboard', async () => {
  const fixture = loadPreviewSelectionWithClipboard();

  await assert.rejects(
    fixture.helper.acquirePreviewSelection(fixture.tab),
    /Could not copy selected text/
  );
  assert.equal(fixture.clipboard, 'original clipboard');
  assert.equal(fixture.writes.length, 2);
  assert.match(fixture.writes[0], /^__agentRef_preview_copy_/);
  assert.equal(fixture.writes[1], 'original clipboard');
});

test('rejects overlapping acquisitions while the first copy is pending', async () => {
  let finishCopy;
  const fixture = loadPreviewSelectionWithClipboard({
    onCopy: () => new Promise((resolve) => { finishCopy = resolve; })
  });

  const first = fixture.helper.acquirePreviewSelection(fixture.tab);
  while (!finishCopy) await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    fixture.helper.acquirePreviewSelection(fixture.tab),
    /already being copied/
  );
  finishCopy();
  await assert.rejects(first, /Could not copy selected text/);
});

test('does not overwrite an unrelated clipboard change during cleanup', async () => {
  let fixture;
  fixture = loadPreviewSelectionWithClipboard({
    onCopy: async (writeSelection) => writeSelection('rendered selection'),
    beforeRead: async (readNumber) => {
      if (readNumber === 3) fixture.clipboard = 'new user clipboard text';
    }
  });

  const result = await fixture.helper.acquirePreviewSelection(fixture.tab);

  assert.deepEqual(result, { text: 'rendered selection' });
  assert.equal(fixture.clipboard, 'new user clipboard text');
  assert.equal(fixture.writes.length, 1);
  assert.match(fixture.writes[0], /^__agentRef_preview_copy_/);
});
