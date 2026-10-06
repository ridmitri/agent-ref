const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

function loadWith(mockVscode) {
  const originalLoad = Module._load;
  for (const name of ['terminal-file-binding', 'terminal']) {
    delete require.cache[require.resolve(`../out/${name}.js`)];
  }
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') {
      return mockVscode;
    }
    if (request === './repository' && parent.filename.endsWith('/out/terminal.js')) {
      return { resolveTerminalName: async () => 'spec.md' };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return {
      ...require('../out/terminal-file-binding.js'),
      ...require('../out/terminal.js')
    };
  } finally {
    Module._load = originalLoad;
  }
}

test('binding identity survives duplicate titles and terminal renames', () => {
  const { TerminalFileBindings } = loadWith({});
  const bindings = new TerminalFileBindings();
  const firstTerminal = { name: 'spec.md' };
  const secondTerminal = { name: 'spec.md' };
  const firstUri = { fsPath: '/workspace/one/.work/task/spec.md' };
  const secondUri = { fsPath: '/other-root/two/spec.md' };

  bindings.bind(firstTerminal, firstUri);
  bindings.bind(secondTerminal, secondUri);
  firstTerminal.name = 'renamed agent';

  assert.equal(bindings.get(firstTerminal), firstUri);
  assert.equal(bindings.get(secondTerminal), secondUri);
  assert.equal(bindings.get({ name: 'spec.md' }), undefined);
});

test('close removes only that terminal and context disposal clears all bindings', () => {
  let closeListener;
  let listenerDisposed = false;
  const { registerTerminalFileBindingLifecycle, terminalFileBindings } = loadWith({
    window: {
      onDidCloseTerminal(listener) {
        closeListener = listener;
        return { dispose() { listenerDisposed = true; } };
      }
    },
    Disposable: class {
      constructor(callback) {
        this.dispose = callback;
      }
    }
  });
  const context = { subscriptions: [] };
  const ordinaryTerminal = { name: 'spec.md' };
  const metadataTerminal = { name: 'task' };
  const ordinaryUri = { fsPath: '/workspace/.work/task/spec.md' };
  const metadataUri = { fsPath: '/workspace/.work/task/.meta.task.yml' };
  registerTerminalFileBindingLifecycle(context);
  terminalFileBindings.bind(ordinaryTerminal, ordinaryUri);
  terminalFileBindings.bind(metadataTerminal, metadataUri);

  closeListener({ name: 'spec.md' });
  assert.equal(terminalFileBindings.get(ordinaryTerminal), ordinaryUri);
  closeListener(ordinaryTerminal);
  assert.equal(terminalFileBindings.get(ordinaryTerminal), undefined);
  assert.equal(terminalFileBindings.get(metadataTerminal), metadataUri);

  context.subscriptions.forEach((subscription) => subscription.dispose());
  assert.equal(listenerDisposed, true);
  assert.equal(terminalFileBindings.get(metadataTerminal), undefined);
});

test('launch binds the original URI before dispatch and reveal; directory launch stays unbound', async () => {
  const selectedUri = {
    fsPath: '/workspace/.work/task/.meta.[task].yml',
    query: 'original-uri'
  };
  const terminals = [];
  let terminalFileBindings;
  let expectedUri = selectedUri;
  const loaded = loadWith({
    window: {
      createTerminal() {
        const terminal = {
          sendText() {
            assert.equal(terminalFileBindings.get(terminal), expectedUri);
          },
          show() {
            assert.equal(terminalFileBindings.get(terminal), expectedUri);
          }
        };
        terminals.push(terminal);
        return terminal;
      }
    },
    commands: {
      executeCommand() { return Promise.resolve(); }
    }
  });
  terminalFileBindings = loaded.terminalFileBindings;

  await loaded.launchNewTerminal('codex', '/workspace', selectedUri.fsPath, selectedUri);
  expectedUri = undefined;
  await loaded.launchNewTerminal('codex', '/workspace', '/workspace/folder');

  assert.equal(terminalFileBindings.get(terminals[0]), selectedUri);
  assert.equal(terminalFileBindings.get(terminals[1]), undefined);
});
