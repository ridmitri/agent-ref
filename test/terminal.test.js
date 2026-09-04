const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
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

  await launchNewTerminal('codex prompt', '/workspace', '/workspace/src/app.ts');

  assert.deepEqual(calls, [
    ['createTerminal', { name: 'src/app.ts', cwd: '/workspace' }],
    ['sendText', 'codex prompt', true],
    ['show', false],
    ['executeCommand', 'workbench.action.terminal.focus']
  ]);
});

test('titles a new Explorer agent terminal with the git toplevel from a nested path', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ref-terminal-'));
  const repoDir = path.join(tmpDir, 'conmon');
  const nestedDir = path.join(repoDir, 'frontend', 'src', 'components');
  fs.mkdirSync(nestedDir, { recursive: true });
  execFileSync('git', ['init'], {
    cwd: repoDir,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0'
    }
  });

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

  try {
    await launchNewTerminal('codex prompt', nestedDir, nestedDir);

    assert.deepEqual(calls, [
      ['createTerminal', { name: 'conmon', cwd: nestedDir }],
      ['sendText', 'codex prompt', true],
      ['show', false],
      ['executeCommand', 'workbench.action.terminal.focus']
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('titles a new Explorer agent terminal with parentFolder/filename when git is unavailable', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ref-terminal-'));
  const srcDir = path.join(tmpDir, 'src');
  const filePath = path.join(srcDir, 'app.ts');
  fs.mkdirSync(srcDir);
  fs.writeFileSync(filePath, 'export {};\n');

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

  try {
    await launchNewTerminal('codex prompt', tmpDir, filePath);

    assert.deepEqual(calls, [
      ['createTerminal', { name: 'src/app.ts', cwd: tmpDir }],
      ['sendText', 'codex prompt', true],
      ['show', false],
      ['executeCommand', 'workbench.action.terminal.focus']
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('titles a new Explorer agent terminal with the folder path when git is unavailable', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ref-terminal-'));
  const folderPath = path.join(tmpDir, 'my', 'document');
  fs.mkdirSync(folderPath, { recursive: true });

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

  try {
    await launchNewTerminal('codex prompt', folderPath, folderPath);

    assert.deepEqual(calls, [
      ['createTerminal', { name: 'document', cwd: folderPath }],
      ['sendText', 'codex prompt', true],
      ['show', false],
      ['executeCommand', 'workbench.action.terminal.focus']
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
