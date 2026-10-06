const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AGENT_METADATA } = require('../out/agent-command.js');

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

