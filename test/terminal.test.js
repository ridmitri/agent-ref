const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

function loadTerminalWith(mockVscode) {
  const originalLoad = Module._load;
  const terminalModulePath = require.resolve('../out/terminal.js');

  delete require.cache[terminalModulePath];
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') {
      return mockVscode;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require('../out/terminal.js');
  } finally {
    Module._load = originalLoad;
  }
}

function terminalMock(calls) {
  return {
    sendText(text, addNewLine) {
      calls.push(['sendText', text, addNewLine]);
    },
    show(preserveFocus) {
      calls.push(['show', preserveFocus]);
    }
  };
}

test('focuses the receiving terminal for editor reference commands', () => {
  const calls = [];
  const terminal = terminalMock(calls);
  const { sendToTerminal } = loadTerminalWith({
    window: {
      activeTerminal: terminal,
      createTerminal() {
        throw new Error('should reuse the active terminal');
      }
    }
  });

  sendToTerminal('file.ts:10', {
    focus: true,
    send: true,
    addNewLine: false,
    name: 'Agent'
  });

  assert.deepEqual(calls, [
    ['show', false],
    ['sendText', 'file.ts:10', false]
  ]);
});

test('does not change focus when editor reference focus is disabled', () => {
  const calls = [];
  const terminal = terminalMock(calls);
  const { sendToTerminal } = loadTerminalWith({
    window: {
      activeTerminal: terminal,
      createTerminal() {
        throw new Error('should reuse the active terminal');
      }
    }
  });

  sendToTerminal('file.ts:11', {
    focus: false,
    send: true,
    addNewLine: true,
    name: 'Agent'
  });

  assert.deepEqual(calls, [
    ['sendText', 'file.ts:11', true]
  ]);
});

test('explicitly focuses a new Explorer agent terminal after dispatch', async () => {
  const calls = [];
  const terminal = terminalMock(calls);
  const { launchNewTerminal } = loadTerminalWith({
    commands: {
      executeCommand(command) {
        calls.push(['executeCommand', command]);
        return Promise.resolve();
      }
    },
    window: {
      createTerminal(options) {
        calls.push(['createTerminal', options]);
        return terminal;
      }
    }
  });

  await launchNewTerminal('codex', '/workspace', '/workspace/src/app.ts');

  assert.deepEqual(calls, [
    ['createTerminal', { name: 'app.ts', cwd: '/workspace' }],
    ['sendText', "cd -- '/workspace' && codex", true],
    ['show', false],
    ['executeCommand', 'workbench.action.terminal.focus']
  ]);
});

