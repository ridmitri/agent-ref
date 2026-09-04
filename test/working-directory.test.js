const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { resolveWorkingDirectory } = require('../out/path.js');

test('resolves fallback working directory for a directory path', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ref-test-'));
  try {
    const resolved = resolveWorkingDirectory(tmpDir);
    assert.equal(resolved, tmpDir.replace(/\\/g, '/'));
  } finally {
    fs.rmdirSync(tmpDir);
  }
});

test('resolves fallback working directory for a file path (parent directory)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ref-test-'));
  const filePath = path.join(tmpDir, 'test-file.txt');
  fs.writeFileSync(filePath, 'hello');
  try {
    const resolved = resolveWorkingDirectory(filePath);
    assert.equal(resolved, tmpDir.replace(/\\/g, '/'));
  } finally {
    fs.unlinkSync(filePath);
    fs.rmdirSync(tmpDir);
  }
});

test('resolves configured absolute working directory', () => {
  const targetFile = '/Users/test/workspace/src/app.ts';
  const customDir = '/Users/test/custom/root';
  assert.equal(
    resolveWorkingDirectory(targetFile, customDir),
    '/Users/test/custom/root'
  );
});

test('resolves configured relative working directory against workspaceRoot', () => {
  const targetFile = '/Users/test/workspace/src/app.ts';
  const workspaceRoot = '/Users/test/workspace';
  const customRelative = 'packages/core';
  assert.equal(
    resolveWorkingDirectory(targetFile, customRelative, workspaceRoot),
    '/Users/test/workspace/packages/core'
  );
});

test('treats empty or whitespace configured working directory as unset', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ref-test-'));
  const filePath = path.join(tmpDir, 'test-file.txt');
  fs.writeFileSync(filePath, 'hello');
  try {
    assert.equal(
      resolveWorkingDirectory(filePath, '   '),
      tmpDir.replace(/\\/g, '/')
    );
  } finally {
    fs.unlinkSync(filePath);
    fs.rmdirSync(tmpDir);
  }
});
