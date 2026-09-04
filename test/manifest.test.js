const assert = require('node:assert/strict');
const { test } = require('node:test');

const manifest = require('../package.json');

const AGENT_COMMANDS = [
  'agentRef.sendToCodex',
  'agentRef.sendToOpenCode',
  'agentRef.sendToClaudeCode',
  'agentRef.sendToCursor'
];

test('keeps all Agent Reference Explorer actions in one isolated menu group', () => {
  const explorerActions = manifest.contributes.menus['explorer/context']
    .filter((item) => item.submenu === 'agentRef.sendToAgent' || AGENT_COMMANDS.includes(item.command));

  assert.equal(explorerActions.length, 5);
  assert.deepEqual(
    explorerActions.map((item) => item.group),
    ['agentRef@1', 'agentRef@2', 'agentRef@3', 'agentRef@4', 'agentRef@5']
  );
});

test('exposes the prompt setting and omits retired reference preferences', () => {
  const settings = manifest.contributes.configuration.properties;

  assert.equal(settings['agentRef.prompt'].type, 'string');
  assert.equal(settings['agentRef.workingDirectory'].type, 'string');
  assert.equal(settings['agentRef.workingDirectory'].default, '');
  assert.equal(settings['agentRef.format'], undefined);
  assert.equal(settings['agentRef.pathStyle'], undefined);
});
