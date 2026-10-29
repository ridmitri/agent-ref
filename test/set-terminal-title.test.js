const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

function loadSetTerminalTitleWith(mockVscode) {
  const originalLoad = Module._load;
  const modulePath = require.resolve('../out/set-terminal-title.js');

  delete require.cache[modulePath];
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') return mockVscode;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require('../out/set-terminal-title.js');
  } finally {
    Module._load = originalLoad;
  }
}

function createHarness({
  editor = {
    document: {
      fileName: '/workspace/mytask.yaml',
      isUntitled: false,
      uri: { scheme: 'file' }
    }
  },
  terminal = { name: 'old title' },
  executeCommand
} = {}) {
  let activeEditor = editor;
  let activeTerminal = terminal;
  const commandCalls = [];
  const informationMessages = [];
  const errorMessages = [];
  const mockVscode = {
    commands: {
      executeCommand(...args) {
        commandCalls.push(args);
        return executeCommand
          ? executeCommand({
            args,
            terminal,
            setEditor(value) { activeEditor = value; },
            setTerminal(value) { activeTerminal = value; }
          })
          : Promise.resolve().then(() => {
            terminal.name = args[1].name;
          });
      }
    },
    window: {
      get activeTextEditor() { return activeEditor; },
      get activeTerminal() { return activeTerminal; },
      showInformationMessage(message) { informationMessages.push(message); },
      showErrorMessage(message) { errorMessages.push(message); }
    }
  };

  return {
    ...loadSetTerminalTitleWith(mockVscode),
    commandCalls,
    informationMessages,
    errorMessages,
    terminal
  };
}

test('renames active terminal to the active saved local file basename including extension', async () => {
  const harness = createHarness();

  await harness.setTerminalTitleFromActiveFile();

  assert.deepEqual(harness.commandCalls, [
    ['workbench.action.terminal.renameWithArg', { name: 'mytask.yaml' }]
  ]);
  assert.equal(harness.terminal.name, 'mytask.yaml');
  assert.deepEqual(harness.informationMessages, []);
  assert.deepEqual(harness.errorMessages, []);
});

test('uses the selected Explorer URI instead of a different active editor', async () => {
  const harness = createHarness();

  await harness.setTerminalTitleFromActiveFile({
    scheme: 'file',
    fsPath: '/workspace/selected-file.ts'
  });

  assert.deepEqual(harness.commandCalls, [
    ['workbench.action.terminal.renameWithArg', { name: 'selected-file.ts' }]
  ]);
  assert.equal(harness.terminal.name, 'selected-file.ts');
  assert.deepEqual(harness.informationMessages, []);
  assert.deepEqual(harness.errorMessages, []);
});

test('uses a selected Explorer URI when there is no active editor', async () => {
  const harness = createHarness({ editor: null });

  await harness.setTerminalTitleFromActiveFile({
    scheme: 'file',
    fsPath: '/workspace/selected-file.yaml'
  });

  assert.deepEqual(harness.commandCalls, [
    ['workbench.action.terminal.renameWithArg', { name: 'selected-file.yaml' }]
  ]);
  assert.equal(harness.terminal.name, 'selected-file.yaml');
});

test('does not fall back to the active editor for an invalid selected URI', async () => {
  const harness = createHarness();

  await harness.setTerminalTitleFromActiveFile({
    scheme: 'vscode-userdata',
    fsPath: '/workspace/selected-file.ts'
  });

  assert.deepEqual(harness.commandCalls, []);
  assert.equal(harness.terminal.name, 'old title');
  assert.match(harness.informationMessages[0], /local file/i);
});

test('rejects a selected URI without a file path', async () => {
  const harness = createHarness();

  await harness.setTerminalTitleFromActiveFile({ scheme: 'file', fsPath: '' });

  assert.deepEqual(harness.commandCalls, []);
  assert.equal(harness.terminal.name, 'old title');
  assert.match(harness.informationMessages[0], /local file/i);
});

test('snapshots the editor and terminal when invoked', async () => {
  const originalTerminal = { name: 'original title' };
  const otherTerminal = { name: 'other title' };
  const harness = createHarness({
    terminal: originalTerminal,
    executeCommand({ args, setEditor, setTerminal }) {
      setEditor({
        document: {
          fileName: '/workspace/changed-after-invocation.ts',
          isUntitled: false,
          uri: { scheme: 'file' }
        }
      });
      setTerminal(otherTerminal);
      originalTerminal.name = args[1].name;
      return Promise.resolve();
    }
  });

  await harness.setTerminalTitleFromActiveFile();

  assert.deepEqual(harness.commandCalls, [
    ['workbench.action.terminal.renameWithArg', { name: 'mytask.yaml' }]
  ]);
  assert.equal(originalTerminal.name, 'mytask.yaml');
  assert.equal(otherTerminal.name, 'other title');
});

test('reports missing active editor without attempting to rename a terminal', async () => {
  const harness = createHarness({ editor: null });

  await harness.setTerminalTitleFromActiveFile();

  assert.deepEqual(harness.commandCalls, []);
  assert.equal(harness.terminal.name, 'old title');
  assert.match(harness.informationMessages[0], /saved local file/i);
});

test('reports untitled documents without attempting to rename a terminal', async () => {
  const harness = createHarness({
    editor: {
      document: {
        fileName: 'Untitled-1',
        isUntitled: true,
        uri: { scheme: 'untitled' }
      }
    }
  });

  await harness.setTerminalTitleFromActiveFile();

  assert.deepEqual(harness.commandCalls, []);
  assert.equal(harness.terminal.name, 'old title');
  assert.match(harness.informationMessages[0], /save/i);
});

test('reports non-file-backed documents without attempting to rename a terminal', async () => {
  const harness = createHarness({
    editor: {
      document: {
        fileName: 'settings.json',
        isUntitled: false,
        uri: { scheme: 'vscode-userdata' }
      }
    }
  });

  await harness.setTerminalTitleFromActiveFile();

  assert.deepEqual(harness.commandCalls, []);
  assert.equal(harness.terminal.name, 'old title');
  assert.match(harness.informationMessages[0], /local file/i);
});

test('reports missing active terminal without creating or renaming a terminal', async () => {
  const harness = createHarness({ terminal: null });

  await harness.setTerminalTitleFromActiveFile();

  assert.deepEqual(harness.commandCalls, []);
  assert.match(harness.informationMessages[0], /active terminal/i);
});

test('reports rejected rename command and leaves terminal title unchanged', async () => {
  const harness = createHarness({
    executeCommand() {
      return Promise.reject(new Error('rename command unavailable'));
    }
  });

  await harness.setTerminalTitleFromActiveFile();

  assert.equal(harness.terminal.name, 'old title');
  assert.match(harness.errorMessages[0], /rename command unavailable/);
});

test('reports unavailable rename command without changing the terminal title', async () => {
  const errors = [];
  const terminal = { name: 'old title' };
  const { setTerminalTitleFromActiveFile } = loadSetTerminalTitleWith({
    commands: {},
    window: {
      activeTextEditor: {
        document: {
          fileName: '/workspace/mytask.yaml',
          isUntitled: false,
          uri: { scheme: 'file' }
        }
      },
      activeTerminal: terminal,
      showInformationMessage() {},
      showErrorMessage(message) { errors.push(message); }
    }
  });

  await setTerminalTitleFromActiveFile();

  assert.equal(terminal.name, 'old title');
  assert.match(errors[0], /executeCommand|undefined/i);
});

test('reports a rename that resolves without updating the captured terminal', async () => {
  const harness = createHarness({ executeCommand: () => Promise.resolve() });

  await harness.setTerminalTitleFromActiveFile();

  assert.equal(harness.terminal.name, 'old title');
  assert.match(harness.errorMessages[0], /title was not updated/i);
});
