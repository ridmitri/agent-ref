const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');

function activateHarness({
  preview = false,
  editor = undefined,
  configuration = {},
  writeClipboard = async () => {}
} = {}) {
  const handlers = new Map();
  const calls = [];
  const clipboardAccess = [];
  const mockVscode = {
    Disposable: class {
      constructor(callback) { this.dispose = callback; }
    },
    commands: {
      registerCommand(id, handler) {
        handlers.set(id, handler);
        return { dispose() {} };
      },
      executeCommand(...args) {
        calls.push(['executeCommand', ...args]);
        return Promise.resolve();
      }
    },
    env: {
      clipboard: {
        async readText() {
          clipboardAccess.push(['read']);
          return 'previous clipboard';
        },
        async writeText(text) {
          clipboardAccess.push(['write', text]);
          calls.push(['clipboardWrite', text]);
          await writeClipboard(text);
        }
      }
    },
    window: {
      activeTextEditor: editor,
      tabGroups: {
        activeTabGroup: {
          activeTab: {
            input: { viewType: preview ? 'markdown.preview' : 'textEditor' }
          }
        }
      },
      activeTerminal: {
        show(preserveFocus) { calls.push(['show', preserveFocus]); },
        sendText(text, addNewLine) { calls.push(['sendText', text, addNewLine]); }
      },
      onDidCloseTerminal() { return { dispose() {} }; },
      showInformationMessage(message) { calls.push(['information', message]); },
      showErrorMessage(message) { calls.push(['error', message]); },
      setStatusBarMessage(message, timeout) {
        calls.push(['status', message, timeout]);
      }
    },
    workspace: {
      getConfiguration() {
        return {
          get(key, defaultValue) {
            return Object.hasOwn(configuration, key)
              ? configuration[key]
              : defaultValue;
          }
        };
      },
      onDidChangeConfiguration() { return { dispose() {} }; }
    }
  };

  const originalLoad = Module._load;
  const outputDirectory = path.resolve(__dirname, '../out') + path.sep;
  for (const modulePath of Object.keys(require.cache)) {
    if (modulePath.startsWith(outputDirectory)) delete require.cache[modulePath];
  }
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') return mockVscode;
    if (request === './preview-selection' && parent?.filename.endsWith('/out/extension.js')) {
      return {
        isActiveMarkdownPreview: () => preview,
        parsePreviewSelectionArgument(argument) {
          if (!argument || typeof argument !== 'object' || Array.isArray(argument)) {
            return { kind: 'not-preview' };
          }
          const claimsAgentRefContext = [
            'agentRefPreviewContextVersion',
            'agentRefHasPreviewSelection',
            'agentRefPreviewSelection'
          ].some((key) => Object.hasOwn(argument, key));
          if (argument.webview !== 'markdown.preview') {
            return claimsAgentRefContext
              ? { kind: 'invalid-preview-context' }
              : { kind: 'not-preview' };
          }
          const text = argument.agentRefPreviewSelection;
          if (
            argument.agentRefPreviewContextVersion !== 1 ||
            argument.agentRefHasPreviewSelection !== true ||
            typeof text !== 'string' ||
            text.length === 0
          ) {
            return { kind: 'invalid-preview-context' };
          }
          return { kind: 'selection', text };
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const context = { subscriptions: [] };
  try {
    require('../out/extension.js').activate(context);
  } finally {
    Module._load = originalLoad;
  }
  calls.length = 0;

  return { handlers, calls, clipboardAccess };
}

function sourceEditor() {
  return {
    document: { uri: { fsPath: '/workspace/notes.md' } },
    selection: {
      start: { line: 2, character: 4 },
      end: { line: 4, character: 0 }
    }
  };
}

function previewArgument(text = 'selected preview text') {
  return {
    webview: 'markdown.preview',
    agentRefPreviewContextVersion: 1,
    agentRefHasPreviewSelection: true,
    agentRefPreviewSelection: text
  };
}

test('all three commands use the exact preview argument ahead of a visible editor', async () => {
  const selectedText = '  exact selection\nwith emoji 🧪  ';
  const cases = [
    { id: 'agentRef.copySend', copies: true, sends: true },
    { id: 'agentRef.copyOnly', copies: true, sends: false },
    { id: 'agentRef.sendOnly', copies: false, sends: true }
  ];

  for (const { id, copies, sends } of cases) {
    const harness = activateHarness({ editor: sourceEditor() });
    await harness.handlers.get(id)(previewArgument(selectedText));

    assert.deepEqual(
      harness.clipboardAccess,
      copies ? [['write', selectedText]] : []
    );
    assert.equal(harness.calls.some(([kind, text]) =>
      kind === 'sendText' && text === selectedText
    ), sends);
    assert.equal(harness.calls.some(([kind]) => kind === 'information'), false);
    assert.equal(harness.calls.some(([kind]) => kind === 'status'), copies || sends);
  }
});

test('active preview without a command context gives right-click guidance and has no side effects', async () => {
  const harness = activateHarness({ preview: true, editor: sourceEditor() });

  await harness.handlers.get('agentRef.copySend')();

  assert.deepEqual(harness.clipboardAccess, []);
  assert.equal(harness.calls.some(([kind]) => kind === 'sendText'), false);
  assert.equal(harness.calls.some(([kind]) => kind === 'clipboardWrite'), false);
  assert.ok(harness.calls.some(([kind, message]) =>
    kind === 'information' && /select it, right-click in the preview/i.test(message)
  ));
});

test('malformed preview context is rejected without falling back to a visible editor', async () => {
  const harness = activateHarness({ editor: sourceEditor() });
  const malformed = {
    webview: 'markdown.preview',
    agentRefPreviewContextVersion: 1,
    agentRefHasPreviewSelection: false,
    agentRefPreviewSelection: 'stale selection'
  };

  await harness.handlers.get('agentRef.copySend')(malformed);

  assert.deepEqual(harness.clipboardAccess, []);
  assert.equal(harness.calls.some(([kind]) => kind === 'sendText'), false);
  assert.equal(harness.calls.some(([kind]) => kind === 'clipboardWrite'), false);
  assert.ok(harness.calls.some(([kind]) => kind === 'information'));
});

test('invalid namespaced preview context is rejected even when the preview is not active', async () => {
  const harness = activateHarness({ editor: sourceEditor() });

  await harness.handlers.get('agentRef.copySend')({
    agentRefPreviewSelection: 'stale selection'
  });

  assert.deepEqual(harness.clipboardAccess, []);
  assert.equal(harness.calls.some(([kind]) => kind === 'sendText'), false);
  assert.equal(harness.calls.some(([kind]) => kind === 'clipboardWrite'), false);
});

test('copy and terminal settings apply to preview payloads', async () => {
  const clipboardDisabled = activateHarness({
    configuration: { copyToClipboard: false }
  });
  await clipboardDisabled.handlers.get('agentRef.copySend')(previewArgument());
  assert.deepEqual(clipboardDisabled.clipboardAccess, []);
  assert.ok(clipboardDisabled.calls.some(([kind, text]) =>
    kind === 'sendText' && text === 'selected preview text'
  ));
  assert.deepEqual(
    clipboardDisabled.calls.find(([kind]) => kind === 'status'),
    ['status', 'sent to terminal: selected preview text', 3000]
  );

  const terminalDisabled = activateHarness({
    configuration: { 'terminal.send': false }
  });
  await terminalDisabled.handlers.get('agentRef.copySend')(previewArgument());
  assert.deepEqual(terminalDisabled.clipboardAccess, [
    ['write', 'selected preview text']
  ]);
  assert.equal(terminalDisabled.calls.some(([kind]) => kind === 'sendText'), false);
  assert.deepEqual(
    terminalDisabled.calls.find(([kind]) => kind === 'status'),
    ['status', 'Copied: selected preview text', 3000]
  );
});

test('unsupported view without an editor keeps the existing no-editor feedback', async () => {
  const harness = activateHarness();

  await harness.handlers.get('agentRef.copySend')();

  assert.deepEqual(harness.calls, [['information', 'No active editor']]);
  assert.deepEqual(harness.clipboardAccess, []);
});

test('editor commands preserve reference ranges and each command option', async () => {
  const reference = '/workspace/notes.md:3:4-4:0';
  const cases = [
    { id: 'agentRef.copySend', writesClipboard: true, sends: true },
    { id: 'agentRef.copyOnly', writesClipboard: true, sends: false },
    { id: 'agentRef.sendOnly', writesClipboard: false, sends: true }
  ];

  for (const { id, writesClipboard, sends } of cases) {
    const harness = activateHarness({
      editor: sourceEditor(),
      configuration: { includeColumnRange: true }
    });
    await harness.handlers.get(id)();

    assert.deepEqual(
      harness.clipboardAccess,
      writesClipboard ? [['write', reference]] : []
    );
    assert.equal(harness.calls.some(([kind, text]) =>
      kind === 'sendText' && text === reference
    ), sends);
  }
});

test('editor reference is delivered only after its clipboard write completes', async () => {
  let finishWrite;
  const pendingWrite = new Promise((resolve) => { finishWrite = resolve; });
  const harness = activateHarness({
    editor: sourceEditor(),
    configuration: { includeColumnRange: true },
    writeClipboard: () => pendingWrite
  });

  const pendingCommand = harness.handlers.get('agentRef.copySend')();
  assert.deepEqual(harness.clipboardAccess, [['write', '/workspace/notes.md:3:4-4:0']]);

  finishWrite();
  await pendingCommand;
  assert.ok(harness.calls.findIndex(([kind]) => kind === 'clipboardWrite') <
    harness.calls.findIndex(([kind]) => kind === 'show'));
  assert.ok(harness.calls.some(([kind]) => kind === 'sendText'));
});

test('clipboard write failure is reported without delivery or success status', async () => {
  const harness = activateHarness({
    editor: sourceEditor(),
    writeClipboard: async () => { throw new Error('clipboard unavailable'); }
  });

  await harness.handlers.get('agentRef.copySend')();

  assert.equal(harness.calls.some(([kind]) => kind === 'sendText'), false);
  assert.equal(harness.calls.some(([kind]) => kind === 'status'), false);
  assert.ok(harness.calls.some(([kind, message]) =>
    kind === 'error' && message.includes('clipboard unavailable')
  ));
});

test('preview clipboard write failure does not send selected text', async () => {
  const harness = activateHarness({
    writeClipboard: async () => { throw new Error('clipboard unavailable'); }
  });

  await harness.handlers.get('agentRef.copySend')(previewArgument());

  assert.deepEqual(harness.clipboardAccess, [['write', 'selected preview text']]);
  assert.equal(harness.calls.some(([kind]) => kind === 'sendText'), false);
  assert.equal(harness.calls.some(([kind]) => kind === 'status'), false);
});
