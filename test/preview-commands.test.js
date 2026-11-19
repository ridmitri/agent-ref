const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');

function activateHarness({
  preview = false,
  activeTabViewType = preview ? 'vscode.markdown.preview.editor' : 'textEditor',
  activeTabInput = undefined,
  editor = undefined,
  configuration = {},
  writeClipboard = async () => {},
  previewClipboardSelection = 'selected preview text',
  switchPreviewDuringFocus = false
} = {}) {
  const handlers = new Map();
  const calls = [];
  const clipboardAccess = [];
  let clipboardText = 'previous clipboard';
  let activeTab = {
    input: activeTabInput || {
      viewType: activeTabViewType,
      ...(activeTabViewType === 'vscode.markdown.preview.editor'
        ? { uri: { fsPath: '/workspace/research.md' } }
        : {})
    }
  };
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
        if (args[0] === 'workbench.action.focusActiveEditorGroup' && switchPreviewDuringFocus) {
          activeTab = { input: { viewType: 'textEditor' } };
        }
        if (args[0] === 'editor.action.clipboardCopyAction' && previewClipboardSelection !== undefined) {
          clipboardText = previewClipboardSelection;
        }
        if (args[0] === 'markdown.showSource') return Promise.resolve(sourceEditor());
        return Promise.resolve();
      }
    },
    env: {
      clipboard: {
        async readText() {
          clipboardAccess.push(['read']);
          return clipboardText;
        },
        async writeText(text) {
          clipboardAccess.push(['write', text]);
          calls.push(['clipboardWrite', text]);
          clipboardText = text;
          await writeClipboard(text);
        }
      }
    },
    window: {
      activeTextEditor: editor,
      tabGroups: {
        activeTabGroup: {
          get activeTab() { return activeTab; }
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
    document: { getText: () => '', uri: { fsPath: '/workspace/notes.md' }, languageId: 'markdown' },
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

test('all three commands deliver the exact selection with no active editor', async () => {
  const selectedText = '  exact selection\nwith emoji 🧪  ';
  const cases = [
    { id: 'agentRef.copySend', copies: true, sends: true },
    { id: 'agentRef.copyOnly', copies: true, sends: false },
    { id: 'agentRef.sendOnly', copies: false, sends: true }
  ];

  for (const { id, copies, sends } of cases) {
    const harness = activateHarness({ preview: true });
    await harness.handlers.get(id)(previewArgument(selectedText));

    assert.deepEqual(
      harness.clipboardAccess,
      copies ? [['write', `/workspace/research.md:<selected_text>${selectedText}</selected_text>`]] : []
    );
    assert.equal(harness.calls.some(([kind, text]) =>
      kind === 'sendText' && text === `/workspace/research.md:<selected_text>${selectedText}</selected_text>`
    ), sends);
    assert.equal(harness.calls.some(([kind]) => kind === 'information'), false);
    assert.equal(harness.calls.some(([kind]) => kind === 'status'), copies || sends);
  }
});

test('palette and shortcut invocations copy selected text from active preview and include its file path', async () => {
  const harness = activateHarness({ preview: true });
  await harness.handlers.get('agentRef.sendOnly')();

  const payload = "/workspace/research.md:<selected_text>selected preview text</selected_text>";
  assert.ok(harness.calls.some(([kind, text]) => kind === 'sendText' && text === payload));
  assert.ok(harness.calls.some(([kind, command]) =>
    kind === 'executeCommand' && command === 'editor.action.clipboardCopyAction'
  ));
  assert.equal(harness.clipboardAccess.filter(([kind]) => kind === 'write').length, 2);
  assert.equal(harness.clipboardAccess.at(-1)[1], 'previous clipboard');
});

test('empty preview clipboard selection gives guidance and has no side effects', async () => {
  const harness = activateHarness({ preview: true, previewClipboardSelection: '' });

  await harness.handlers.get('agentRef.copySend')();

  assert.equal(harness.calls.some(([kind]) => kind === 'sendText'), false);
  assert.equal(harness.calls.some(([kind, message]) => kind === 'information' && /No text is selected/.test(message)), true);
});

test('does not send clipboard text if the active preview changes before copy', async () => {
  const harness = activateHarness({ preview: true, switchPreviewDuringFocus: true });
  await harness.handlers.get('agentRef.sendOnly')();

  assert.equal(harness.calls.some(([kind]) => kind === 'sendText'), false);
  assert.equal(harness.clipboardAccess.at(-1)[1], 'previous clipboard');
  assert.ok(harness.calls.some(([kind, message]) => kind === 'information' &&
    /active Markdown preview changed/.test(message)));
});

test('both active legacy preview tab forms are detected without a source editor', async () => {
  for (const activeTabViewType of [
    'markdown.preview',
    'mainThreadWebview-markdown.preview'
  ]) {
    const harness = activateHarness({ activeTabViewType, previewClipboardSelection: 'legacy selected text' });

    await harness.handlers.get('agentRef.copySend')();

    assert.ok(harness.calls.some(([kind, text]) => kind === 'sendText' &&
      text === "/workspace/notes.md:<selected_text>legacy selected text</selected_text>"));
  }
});

test('malformed preview context is rejected without falling back to a visible editor', async () => {
  const harness = activateHarness({ preview: true, editor: sourceEditor() });
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

test('empty preview context is rejected without falling back to a visible editor', async () => {
  const harness = activateHarness({ preview: true, editor: sourceEditor() });

  await harness.handlers.get('agentRef.copySend')({
    ...previewArgument(''),
    agentRefHasPreviewSelection: false
  });

  assert.deepEqual(harness.clipboardAccess, []);
  assert.equal(harness.calls.some(([kind]) => kind === 'sendText'), false);
  assert.equal(harness.calls.some(([kind]) => kind === 'clipboardWrite'), false);
});

test('valid preview context takes precedence over a visible source editor', async () => {
  const harness = activateHarness({ preview: true, editor: sourceEditor() });
  const selectedText = 'preview selection';

  await harness.handlers.get('agentRef.sendOnly')(previewArgument(selectedText));

  assert.deepEqual(harness.clipboardAccess, []);
  assert.ok(harness.calls.some(([kind, text]) => kind === 'sendText' &&
    text === `/workspace/research.md:<selected_text>${selectedText}</selected_text>`));
  assert.equal(harness.calls.some(([kind, text]) => kind === 'sendText' && text.includes('/workspace/notes.md')), false);
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
    preview: true,
    configuration: { copyToClipboard: false }
  });
  await clipboardDisabled.handlers.get('agentRef.copySend')(previewArgument());
  assert.deepEqual(clipboardDisabled.clipboardAccess, []);
  assert.ok(clipboardDisabled.calls.some(([kind, text]) =>
    kind === 'sendText' && text === "/workspace/research.md:<selected_text>selected preview text</selected_text>"
  ));
  assert.deepEqual(
    clipboardDisabled.calls.find(([kind]) => kind === 'status'),
    ['status', "sent to terminal: /workspace/research.md:<selected_text>selected preview text</selected_text>", 3000]
  );

  const terminalDisabled = activateHarness({
    preview: true,
    configuration: { 'terminal.send': false }
  });
  await terminalDisabled.handlers.get('agentRef.copySend')(previewArgument());
  assert.deepEqual(terminalDisabled.clipboardAccess, [
    ['write', "/workspace/research.md:<selected_text>selected preview text</selected_text>"]
  ]);
  assert.equal(terminalDisabled.calls.some(([kind]) => kind === 'sendText'), false);
  assert.deepEqual(
    terminalDisabled.calls.find(([kind]) => kind === 'status'),
    ['status', "Copied: /workspace/research.md:<selected_text>selected preview text</selected_text>", 3000]
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
    preview: true,
    writeClipboard: async () => { throw new Error('clipboard unavailable'); }
  });

  await harness.handlers.get('agentRef.copySend')(previewArgument());

  assert.deepEqual(harness.clipboardAccess, [[
    'write', "/workspace/research.md:<selected_text>selected preview text</selected_text>"
  ]]);
  assert.equal(harness.calls.some(([kind]) => kind === 'sendText'), false);
  assert.equal(harness.calls.some(([kind]) => kind === 'status'), false);
});

test('source editor selected text uses absolute path and selected_text tags', async () => {
  const editor = sourceEditor();
  editor.document.uri.fsPath = '/Users/dryzhov/work/fe/conmon/.work/DP-20234_custom_point_elements/.meta.DP-20234_custom_point_elements.yml';
  editor.document.getText = () => 'projectPath';
  const harness = activateHarness({ editor });
  await harness.handlers.get('agentRef.sendOnly')();
  assert.ok(harness.calls.some(([kind, text]) => kind === 'sendText' &&
    text === editor.document.uri.fsPath + ':<selected_text>projectPath</selected_text>'));
});
