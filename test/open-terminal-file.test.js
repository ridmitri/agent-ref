const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

function loadOpenTerminalFileWith(mockVscode) {
  const originalLoad = Module._load;
  const modulePath = require.resolve('../out/open-terminal-file.js');

  delete require.cache[modulePath];
  delete require.cache[require.resolve('../out/terminal-file-binding.js')];
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') {
      return mockVscode;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return {
      ...require('../out/open-terminal-file.js'),
      ...require('../out/terminal-file-binding.js')
    };
  } finally {
    Module._load = originalLoad;
  }
}

test('shows error when no active terminal exists', async () => {
  const errors = [];
  const findFilesCalls = [];
  const { openTerminalFile } = loadOpenTerminalFileWith({
    window: {
      activeTerminal: undefined,
      showErrorMessage(msg) {
        errors.push(msg);
      }
    },
    workspace: {
      findFiles() {
        findFilesCalls.push(arguments);
        return Promise.resolve([]);
      }
    }
  });

  await openTerminalFile();

  assert.equal(errors.length, 1);
  assert.equal(findFilesCalls.length, 0);
});

test('opens matching file using title-prefix search', async () => {
  const findFilesCalls = [];
  const openedDocs = [];
  const shownDocs = [];
  const mockUri = { fsPath: '/workspace/tools.ts' };
  const mockDoc = { uri: mockUri };

  const { openTerminalFile } = loadOpenTerminalFileWith({
    window: {
      activeTerminal: { name: 'tools' },
      showTextDocument(doc) {
        shownDocs.push(doc);
        return Promise.resolve();
      }
    },
    workspace: {
      findFiles(pattern, exclude, maxResults) {
        findFilesCalls.push([pattern, exclude, maxResults]);
        if (pattern === '**/tools*') {
          return Promise.resolve([mockUri]);
        }
        return Promise.resolve([]);
      },
      openTextDocument(uri) {
        openedDocs.push(uri);
        return Promise.resolve(mockDoc);
      }
    }
  });

  await openTerminalFile();

  assert.deepEqual(findFilesCalls, [
    ['**/tools*', '**/node_modules/**', 1]
  ]);
  assert.deepEqual(openedDocs, [mockUri]);
  assert.deepEqual(shownDocs, [mockDoc]);
});

test('normalizes slash-containing terminal title', async () => {
  const findFilesCalls = [];
  const mockUri = { fsPath: '/workspace/utils.ts' };
  const mockDoc = {};

  const { openTerminalFile } = loadOpenTerminalFileWith({
    window: {
      activeTerminal: { name: 'parent/utils' },
      showTextDocument() {
        return Promise.resolve();
      }
    },
    workspace: {
      findFiles(pattern, exclude, maxResults) {
        findFilesCalls.push([pattern, exclude, maxResults]);
        if (pattern === '**/utils*') {
          return Promise.resolve([mockUri]);
        }
        return Promise.resolve([]);
      },
      openTextDocument() {
        return Promise.resolve(mockDoc);
      }
    }
  });

  await openTerminalFile();

  assert.deepEqual(findFilesCalls, [
    ['**/utils*', '**/node_modules/**', 1]
  ]);
});

test('prioritizes .yml over .yaml and spec.md', async () => {
  const findFilesCalls = [];
  const mockUri = { fsPath: '/workspace/.meta.task.yml' };
  const mockDoc = {};

  const { openTerminalFile } = loadOpenTerminalFileWith({
    window: {
      activeTerminal: { name: 'task' },
      showTextDocument() {
        return Promise.resolve();
      }
    },
    workspace: {
      findFiles(pattern, exclude, maxResults) {
        findFilesCalls.push([pattern, exclude, maxResults]);
        if (pattern === '**/.meta.task.yml') {
          return Promise.resolve([mockUri]);
        }
        return Promise.resolve([]);
      },
      openTextDocument() {
        return Promise.resolve(mockDoc);
      }
    }
  });

  await openTerminalFile();

  assert.deepEqual(findFilesCalls, [
    ['**/task*', '**/node_modules/**', 1],
    ['**/.meta.task.yml', undefined, 1]
  ]);
});

test('prioritizes .yaml over spec.md when .yml is absent', async () => {
  const findFilesCalls = [];
  const mockUri = { fsPath: '/workspace/.meta.task.yaml' };
  const mockDoc = {};

  const { openTerminalFile } = loadOpenTerminalFileWith({
    window: {
      activeTerminal: { name: 'task' },
      showTextDocument() {
        return Promise.resolve();
      }
    },
    workspace: {
      findFiles(pattern, exclude, maxResults) {
        findFilesCalls.push([pattern, exclude, maxResults]);
        if (pattern === '**/.meta.task.yaml') {
          return Promise.resolve([mockUri]);
        }
        return Promise.resolve([]);
      },
      openTextDocument() {
        return Promise.resolve(mockDoc);
      }
    }
  });

  await openTerminalFile();

  assert.deepEqual(findFilesCalls, [
    ['**/task*', '**/node_modules/**', 1],
    ['**/.meta.task.yml', undefined, 1],
    ['**/.meta.task.yaml', undefined, 1]
  ]);
});

test('falls back to spec.md when prefix and metadata are absent', async () => {
  const findFilesCalls = [];
  const mockUri = { fsPath: '/workspace/task/spec.md' };
  const mockDoc = {};

  const { openTerminalFile } = loadOpenTerminalFileWith({
    window: {
      activeTerminal: { name: 'task' },
      showTextDocument() {
        return Promise.resolve();
      }
    },
    workspace: {
      findFiles(pattern, exclude, maxResults) {
        findFilesCalls.push([pattern, exclude, maxResults]);
        if (pattern === '**/task/spec.md') {
          return Promise.resolve([mockUri]);
        }
        return Promise.resolve([]);
      },
      openTextDocument() {
        return Promise.resolve(mockDoc);
      }
    }
  });

  await openTerminalFile();

  assert.deepEqual(findFilesCalls, [
    ['**/task*', '**/node_modules/**', 1],
    ['**/.meta.task.yml', undefined, 1],
    ['**/.meta.task.yaml', undefined, 1],
    ['**/task/spec.md', undefined, 1]
  ]);
});

test('shows warning containing original terminal name when no candidates match', async () => {
  const warnings = [];
  const openedDocs = [];
  const termName = 'missing-feature/sub';

  const { openTerminalFile } = loadOpenTerminalFileWith({
    window: {
      activeTerminal: { name: termName },
      showWarningMessage(msg) {
        warnings.push(msg);
      }
    },
    workspace: {
      findFiles() {
        return Promise.resolve([]);
      },
      openTextDocument() {
        openedDocs.push(true);
        return Promise.resolve({});
      }
    }
  });

  await openTerminalFile();

  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes(termName));
  assert.equal(openedDocs.length, 0);
});

test('explicit navigation follows terminal instance bindings across duplicate names, renames and repeated invocation', async () => {
  const opened = [];
  const shown = [];
  const firstTerminal = { name: 'spec.md' };
  const secondTerminal = { name: 'spec.md' };
  const firstUri = { fsPath: '/workspace/.work/task/spec.md' };
  const secondUri = { fsPath: '/second-root/.work/another/spec.md' };
  const window = {
    activeTerminal: firstTerminal,
    showTextDocument(document, options) {
      shown.push([document.uri, options]);
      return Promise.resolve();
    }
  };
  const { openTerminalFile, terminalFileBindings } = loadOpenTerminalFileWith({
    window,
    workspace: {
      findFiles() { throw new Error('bound navigation must not search by title'); },
      openTextDocument(uri) {
        opened.push(uri);
        return Promise.resolve({ uri });
      }
    }
  });
  terminalFileBindings.bind(firstTerminal, firstUri);
  terminalFileBindings.bind(secondTerminal, secondUri);

  // Selecting a terminal alone must retain terminal focus and not open a file.
  window.activeTerminal = secondTerminal;
  assert.deepEqual(opened, []);
  await openTerminalFile();
  window.activeTerminal = firstTerminal;
  firstTerminal.name = 'custom name';
  assert.deepEqual(opened, [secondUri]);
  await openTerminalFile();
  await openTerminalFile();

  assert.deepEqual(opened, [secondUri, firstUri, firstUri]);
  assert.deepEqual(shown, [
    [secondUri, { preserveFocus: false }],
    [firstUri, { preserveFocus: false }],
    [firstUri, { preserveFocus: false }]
  ]);
});

test('bound metadata and ordinary files with glob characters open as exact original URI objects', async () => {
  for (const selectedPath of [
    '/workspace/.work/task/.meta.[task]*.yml',
    '/workspace/notes [v2]?*.md'
  ]) {
    const terminal = { name: 'arbitrary terminal title' };
    const uri = { fsPath: selectedPath, query: 'retained original URI' };
    const opened = [];
    const { openTerminalFile, terminalFileBindings } = loadOpenTerminalFileWith({
      window: {
        activeTerminal: terminal,
        showTextDocument(document, options) {
          assert.equal(document.uri, uri);
          assert.deepEqual(options, { preserveFocus: false });
          return Promise.resolve();
        }
      },
      workspace: {
        findFiles() { throw new Error('exact URI cannot be converted to a glob'); },
        openTextDocument(target) {
          opened.push(target);
          return Promise.resolve({ uri: target });
        }
      }
    });
    terminalFileBindings.bind(terminal, uri);
    await openTerminalFile();
    assert.deepEqual(opened, [uri]);
    assert.equal(opened[0], uri);
  }
});

test('bound open and editor-display failures report the file without searching for a replacement', async () => {
  for (const failingStep of ['open', 'show']) {
    const terminal = { name: 'spec.md' };
    const uri = { fsPath: '/workspace/.work/deleted/spec.md' };
    const errors = [];
    const opened = [];
    const shown = [];
    const { openTerminalFile, terminalFileBindings } = loadOpenTerminalFileWith({
      window: {
        activeTerminal: terminal,
        showErrorMessage(message) { errors.push(message); },
        showTextDocument(document, options) {
          shown.push([document, options]);
          throw new Error('editor cannot display this document');
        }
      },
      workspace: {
        findFiles() { throw new Error('must never substitute a similar filename'); },
        openTextDocument(target) {
          opened.push(target);
          if (failingStep === 'open') throw new Error('file does not exist');
          return Promise.resolve({ uri: target });
        }
      }
    });
    terminalFileBindings.bind(terminal, uri);
    await openTerminalFile();

    assert.deepEqual(opened, [uri]);
    assert.equal(shown.length, failingStep === 'open' ? 0 : 1);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes(uri.fsPath));
    assert.ok(errors[0].includes(failingStep === 'open' ? 'file does not exist' : 'editor cannot display'));
    assert.equal(terminalFileBindings.get(terminal), uri);
  }
});
