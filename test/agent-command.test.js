const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  AGENT_METADATA,
  buildAgentCommand,
  buildAgentPrompt,
  DEFAULT_PROMPT
} = require('../out/agent-command.js');

const promptFor = (absolutePath) =>
  `For this session, "the path" refers to "${absolutePath}". Do not inspect it yet; wait for a later request.`;

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

test('builds the Claude Code command with Codex prompt-argument behavior', () => {
  const absolutePath = '/Users/me/work/frontend/app.js';

  assert.equal(
    buildAgentCommand('claudeCode', absolutePath),
    `claude ${quotePosixShellArgument(promptFor(absolutePath))}`
  );
});

test('builds the Cursor agent CLI command with one quoted prompt argument', () => {
  const absolutePath = '/Users/me/work/frontend/app.js';

  assert.equal(
    buildAgentCommand('cursor', absolutePath),
    `agent ${quotePosixShellArgument(promptFor(absolutePath))}`
  );
});

test('defines metadata for all supported agents', () => {
  assert.deepEqual(Object.keys(AGENT_METADATA), [
    'codex',
    'opencode',
    'claudeCode',
    'cursor'
  ]);
  assert.deepEqual(
    Object.values(AGENT_METADATA).map(({ commandId }) => commandId),
    [
      'agentRef.sendToCodex',
      'agentRef.sendToOpenCode',
      'agentRef.sendToClaudeCode',
      'agentRef.sendToCursor'
    ]
  );
});

test('keeps whitespace, quotes, and shell metacharacters in the prompt data', () => {
  const absolutePath = "/Users/me/work/John's \"notes\"; $(touch /tmp/pwned) *.md";
  const quotedPrompt = quotePosixShellArgument(promptFor(absolutePath));

  assert.equal(buildAgentCommand('codex', absolutePath), `codex ${quotedPrompt}`);
  assert.equal(buildAgentCommand('opencode', absolutePath), `opencode --prompt ${quotedPrompt}`);
  assert.equal(buildAgentCommand('claudeCode', absolutePath), `claude ${quotedPrompt}`);
  assert.equal(buildAgentCommand('cursor', absolutePath), `agent ${quotedPrompt}`);
  assert.match(quotedPrompt, /'\\''/);
  assert.match(quotedPrompt, /\$\(touch \/tmp\/pwned\)/);
  assert.match(quotedPrompt, /\*\.md/);
});

test('uses a configured prompt template for every supported agent', () => {
  const absolutePath = '/Users/me/work/frontend/app.js';
  const promptTemplate = 'Review this resource: <PATH>';
  const quotedPrompt = quotePosixShellArgument(
    buildAgentPrompt(promptTemplate, absolutePath)
  );

  assert.equal(buildAgentCommand('codex', absolutePath, promptTemplate), `codex ${quotedPrompt}`);
  assert.equal(
    buildAgentCommand('opencode', absolutePath, promptTemplate),
    `opencode --prompt ${quotedPrompt}`
  );
  assert.equal(
    buildAgentCommand('claudeCode', absolutePath, promptTemplate),
    `claude ${quotedPrompt}`
  );
  assert.equal(
    buildAgentCommand('cursor', absolutePath, promptTemplate),
    `agent ${quotedPrompt}`
  );
});

test('replaces every path placeholder in a configured prompt', () => {
  const absolutePath = '/Users/me/work/frontend/app.js';

  assert.equal(
    buildAgentPrompt('<PATH> then <PATH>', absolutePath),
    `${absolutePath} then ${absolutePath}`
  );
});

test('appends the exact path fallback when a prompt has no placeholder', () => {
  const absolutePath = '/Users/me/work/frontend/app.js';
  const promptTemplate = 'Review this resource';

  assert.equal(
    buildAgentPrompt(promptTemplate, absolutePath),
    `Review this resource\n path: ${absolutePath}`
  );

  const expectedPrompt = quotePosixShellArgument(
    `${promptTemplate}\n path: ${absolutePath}`
  );
  assert.equal(buildAgentCommand('codex', absolutePath, promptTemplate), `codex ${expectedPrompt}`);
  assert.equal(
    buildAgentCommand('opencode', absolutePath, promptTemplate),
    `opencode --prompt ${expectedPrompt}`
  );
  assert.equal(
    buildAgentCommand('claudeCode', absolutePath, promptTemplate),
    `claude ${expectedPrompt}`
  );
  assert.equal(
    buildAgentCommand('cursor', absolutePath, promptTemplate),
    `agent ${expectedPrompt}`
  );
});

test('keeps configured shell syntax and troublesome paths as one prompt argument', () => {
  const absolutePath = "/Users/me/work/John's \"notes\"; $(touch /tmp/pwned) *.md";
  const promptTemplate = 'Review; echo compromised <PATH> && rm -rf /';
  const prompt = buildAgentPrompt(promptTemplate, absolutePath);
  const command = buildAgentCommand('codex', absolutePath, promptTemplate);

  assert.equal(command, `codex ${quotePosixShellArgument(prompt)}`);
  assert.match(command, /'\\''/);
  assert.match(command, /; echo compromised/);
  assert.match(command, /&& rm -rf \/'/);
});

test('retains the current prompt as the default template', () => {
  assert.equal(
    buildAgentPrompt(DEFAULT_PROMPT, '/Users/me/work/frontend/app.js'),
    'For this session, "the path" refers to "/Users/me/work/frontend/app.js". Do not inspect it yet; wait for a later request.'
  );
});
