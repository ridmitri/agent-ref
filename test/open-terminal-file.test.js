const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

function loadOpenTerminalFileWith(mockVscode) {
  const originalLoad = Module._load;
  const modulePath = require.resolve('../out/open-terminal-file.js');

  delete require.cache[modulePath];
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') {
      return mockVscode;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require('../out/open-terminal-file.js');
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
