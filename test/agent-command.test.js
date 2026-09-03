const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildAgentCommand } = require('../out/agent-command.js');

const promptFor = (absolutePath) =>
  `use skill "context-menu-loader" for the path "${absolutePath}"`;

const quotePosixShellArgument = (value) =>
  `'${value.replace(/'/g, `'\\''`)}'`;

test('builds the Codex command with one quoted prompt argument', () => {
  const absolutePath = '/Users/me/work/frontend/app.js';

  assert.equal(
    buildAgentCommand('codex', absolutePath),
    `codex ${quotePosixShellArgument(promptFor(absolutePath))}`
  );
});

test('builds the OpenCode command with one quoted prompt argument', () => {
  const absolutePath = '/Users/me/work/frontend/app.js';

  assert.equal(
    buildAgentCommand('opencode', absolutePath),
    `opencode --prompt ${quotePosixShellArgument(promptFor(absolutePath))}`
  );
});

test('keeps whitespace, quotes, and shell metacharacters in the prompt data', () => {
  const absolutePath = "/Users/me/work/John's \"notes\"; $(touch /tmp/pwned) *.md";
  const quotedPrompt = quotePosixShellArgument(promptFor(absolutePath));

  assert.equal(buildAgentCommand('codex', absolutePath), `codex ${quotedPrompt}`);
  assert.equal(
    buildAgentCommand('opencode', absolutePath),
    `opencode --prompt ${quotedPrompt}`
  );
  assert.match(quotedPrompt, /'\\''/);
  assert.match(quotedPrompt, /\$\(touch \/tmp\/pwned\)/);
  assert.match(quotedPrompt, /\*\.md/);
});
