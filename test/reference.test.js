const assert = require('node:assert/strict');
const { test } = require('node:test');
const { formatRef } = require('../out/formatter.js');
const { resolvePath } = require('../out/path.js');

test('formats a one-line absolute reference', () => {
  assert.equal(
    formatRef({
      path: '/Users/me/work/src/file.ts',
      range: { start: 10, end: 10 }
    }),
    '/Users/me/work/src/file.ts:10'
  );
});

test('formats a multi-line absolute reference', () => {
  assert.equal(
    formatRef({
      path: '/Users/me/work/src/file.ts',
      range: { start: 10, end: 12 }
    }),
    '/Users/me/work/src/file.ts:10-12'
  );
});

test('preserves optional column ranges with the absolute path format', () => {
  assert.equal(
    formatRef({
      path: '/Users/me/work/src/file.ts',
      range: { start: 10, end: 12, startCol: 5, endCol: 20 }
    }),
    '/Users/me/work/src/file.ts:10:5-12:20'
  );
});

test('resolves and normalizes an absolute filesystem path', () => {
  assert.equal(
    resolvePath({ fsPath: '/Users/me/work/src/../file.ts' }),
    '/Users/me/work/file.ts'
  );
});
