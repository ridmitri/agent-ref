const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');

function activateHarness({ roots = ['/workspace', '/second-root'], directories = [], workspacePath = '/global-workspace', workspaceExists = true, workspaceIsDirectory = true } = {}) {
  const handlers = new Map();
  const calls = [];
  const terminals = [];
  const configurationReads = [];
  let bindings;
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
    window: {
      activeTextEditor: { document: { uri: { fsPath: '/unrelated/editor.ts' } } },
      activeTerminal: {
        sendText() { throw new Error('Explorer launch must create a fresh terminal'); }
      },
      onDidCloseTerminal() { return { dispose() {} }; },
      createTerminal(options) {
        calls.push(['createTerminal', options]);
        const terminal = {
          name: typeof options === 'string' ? options : options.name,
          sendText(...args) { calls.push(['sendText', terminal, ...args]); },
          show(preserveFocus) {
            calls.push(['show', terminal, preserveFocus, bindings.get(terminal)]);
          }
        };
        terminals.push(terminal);
        return terminal;
      },
      showInformationMessage(message) { calls.push(['information', message]); },
      showErrorMessage(message) { calls.push(['error', message]); },
      showTextDocument() { throw new Error('Launching must retain terminal focus'); }
    },
    workspace: {
      workspaceFolders: roots.map((root) => ({ uri: { fsPath: root } })),
      getWorkspaceFolder(uri) {
        const root = roots.find((candidate) => uri.fsPath.startsWith(`${candidate}/`) || uri.fsPath === candidate);
        return root ? { uri: { fsPath: root } } : undefined;
      },
      getConfiguration() {
        const legacy = { prompt: 'Send this task automatically: <PATH>', workingDirectory: '/custom/legacy' };
        return {
          get(key, defaultValue) {
            configurationReads.push(key);
            return legacy[key] ?? defaultValue;
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
    if (request === 'fs') {
      return {
        statSync(selectedPath) {
          if (selectedPath === workspacePath) {
            if (!workspaceExists) throw new Error('workspace unavailable');
            return { isDirectory: () => workspaceIsDirectory };
          }
          if (selectedPath.endsWith('missing.md')) throw new Error('unavailable');
          return { isDirectory: () => directories.includes(selectedPath) };
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const context = { subscriptions: [] };
  try {
    const { activate } = require('../out/extension.js');
    bindings = require('../out/terminal-file-binding.js').terminalFileBindings;
    activate(context);
  } finally {
    Module._load = originalLoad;
  }
  calls.length = 0;
  const wrappedHandlers = new Map([...handlers].map(([id, handler]) => [id, async (...args) => {
    const previous = process.env.WORKSPACE_PATH;
    if (workspacePath === null) delete process.env.WORKSPACE_PATH;
    else process.env.WORKSPACE_PATH = workspacePath;
    try { return await handler(...args); } finally {
      if (previous === undefined) delete process.env.WORKSPACE_PATH;
      else process.env.WORKSPACE_PATH = previous;
    }
  }]));
  return { handlers: wrappedHandlers, calls, terminals, bindings, configurationReads };
}

function fileUri(fsPath) {
  return { scheme: 'file', fsPath };
}

test('every agent launches from WORKSPACE_PATH independently of VS Code roots with filename and binding', async () => {
  const harness = activateHarness();
  const agents = [
    ['agentRef.sendToCodex', 'codex', '/workspace/nested/spec.md', '/global-workspace', 'spec.md'],
    ['agentRef.sendToOpenCode', 'opencode', '/second-root/.work/task/.meta.task.yml', '/global-workspace', 'task'],
    ['agentRef.sendToClaudeCode', 'claude', '/workspace/John\'s [notes]; $.md', '/global-workspace', 'John\'s [notes]; $.md'],
    ['agentRef.sendToCursor', 'agent', '/second-root/nested/spec.md', '/global-workspace', 'spec.md']
  ];
  for (const [commandId, executable, selectedPath, cwd, title] of agents) {
    harness.calls.length = 0;
    const uri = fileUri(selectedPath);
    await harness.handlers.get(commandId)(uri);
    const terminal = harness.terminals.at(-1);
    assert.deepEqual(harness.calls, [
      ['createTerminal', { name: title, cwd }],
      ['sendText', terminal, `cd -- '${cwd}' && ${executable}`, true],
      ['show', terminal, false, uri],
      ['executeCommand', 'workbench.action.terminal.focus']
    ]);
    assert.equal(harness.bindings.get(terminal), uri);
  }
  assert.equal(harness.terminals.length, 4);
  assert.notEqual(harness.terminals[0], harness.terminals[3]);
  assert.equal(harness.configurationReads.includes('prompt'), false);
  assert.equal(harness.configurationReads.includes('workingDirectory'), false);
});

test('directory launch keeps basename title and global workspace cwd without a file binding', async () => {
  const harness = activateHarness({ directories: ['/second-root/nested/task'] });
  await harness.handlers.get('agentRef.sendToCodex')(fileUri('/second-root/nested/task'));
  const terminal = harness.terminals[0];
  assert.deepEqual(harness.calls, [
    ['createTerminal', { name: 'task', cwd: '/global-workspace' }],
    ['sendText', terminal, "cd -- '/global-workspace' && codex", true],
    ['show', terminal, false, undefined],
    ['executeCommand', 'workbench.action.terminal.focus']
  ]);
  assert.equal(harness.bindings.get(terminal), undefined);
});

test('outside-root and no-project selections still use WORKSPACE_PATH', async () => {
  const cases = [
    { roots: ['/workspace'], selected: '/external/task/spec.md', cwd: '/global-workspace' },
    { roots: [], selected: '/external/task/spec.md', cwd: '/global-workspace' },
    { roots: [], selected: '/external/task', cwd: '/global-workspace', directory: true },
    { roots: [], selected: '/external/task/missing.md', cwd: '/global-workspace' }
  ];
  for (const { roots, selected, cwd, directory } of cases) {
    const harness = activateHarness({ roots, directories: directory ? [selected] : [] });
    const uri = fileUri(selected);
    await harness.handlers.get('agentRef.sendToCodex')(uri);
    assert.deepEqual(harness.calls[0], ['createTerminal', { name: path.basename(selected), cwd }]);
    assert.equal(harness.bindings.get(harness.terminals[0]), directory ? undefined : uri);
  }
});

test('invalid Explorer resources give feedback and never launch a terminal', async () => {
  const harness = activateHarness();
  for (const uri of [undefined, { scheme: 'https', fsPath: '/remote/spec.md' }, { scheme: 'file', fsPath: '' }]) {
    await harness.handlers.get('agentRef.sendToCodex')(uri);
  }
  assert.equal(harness.terminals.length, 0);
  assert.equal(harness.calls.length, 3);
  assert.ok(harness.calls.every(([kind]) => kind === 'information'));
});


test('missing or invalid WORKSPACE_PATH prevents every agent launch and explains host restart', async () => {
  const cases = [
    { workspacePath: null },
    { workspacePath: '' },
    { workspacePath: '   ' },
    { workspacePath: 'relative/workspace' },
    { workspacePath: '/absent', workspaceExists: false },
    { workspacePath: '/file', workspaceIsDirectory: false }
  ];
  for (const options of cases) {
    const harness = activateHarness(options);
    for (const id of ['agentRef.sendToCodex', 'agentRef.sendToOpenCode', 'agentRef.sendToClaudeCode', 'agentRef.sendToCursor']) {
      await harness.handlers.get(id)(fileUri('/workspace/spec.md'));
    }
    assert.equal(harness.terminals.length, 0);
    assert.equal(harness.calls.length, 4);
    for (const [kind, message] of harness.calls) {
      assert.equal(kind, 'error');
      assert.match(message, /WORKSPACE_PATH/);
      assert.match(message, /restart VS Code/);
    }
  }
});

test('workspace shell bootstrap quotes spaces and apostrophes without including selected file', async () => {
  const workspacePath = "/workspace/John's notes; $(echo unsafe)";
  const harness = activateHarness({ workspacePath });
  await harness.handlers.get('agentRef.sendToOpenCode')(fileUri('/other/spec.md'));
  assert.deepEqual(harness.calls[0], ['createTerminal', { name: 'spec.md', cwd: workspacePath }]);
  assert.equal(harness.calls[1][2], "cd -- '/workspace/John'\\''s notes; $(echo unsafe)' && opencode");
});
