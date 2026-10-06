const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

function loadResolver(isDirectory) {
  const originalLoad = Module._load;
  delete require.cache[require.resolve('../out/path.js')];
  Module._load = function load(request, parent, isMain) {
    if (request === 'fs') {
      return {
        statSync(selected) {
          if (selected.endsWith('missing.md')) throw new Error('not found');
          return { isDirectory: () => isDirectory };
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require('../out/path.js').resolveWorkingDirectory;
  } finally {
    Module._load = originalLoad;
  }
}

test('resolves an existing absolute authoritative workspace directory', () => {
  const resolveWorkingDirectory = loadResolver(true);
  assert.equal(resolveWorkingDirectory('/global-workspace'), '/global-workspace');
  assert.equal(resolveWorkingDirectory("/global-workspace/John's notes"), "/global-workspace/John's notes");
});

test('rejects empty, relative, missing and nondirectory workspace paths without fallback', () => {
  const resolveWorkingDirectory = loadResolver(true);
  for (const invalid of ['', '   ', 'relative/workspace', '~/work', '/local/missing.md']) {
    assert.throws(() => resolveWorkingDirectory(invalid), /WORKSPACE_PATH/);
  }
  assert.throws(() => loadResolver(false)('/local/file.md'), /WORKSPACE_PATH/);
});


test('missing WORKSPACE_PATH in the host environment is rejected', () => {
  const previous = process.env.WORKSPACE_PATH;
  delete process.env.WORKSPACE_PATH;
  try {
    assert.throws(() => loadResolver(true)(), /WORKSPACE_PATH/);
  } finally {
    if (previous !== undefined) process.env.WORKSPACE_PATH = previous;
  }
});
