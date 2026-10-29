const assert = require('node:assert/strict');
const { test } = require('node:test');

const manifest = require('../package.json');

const AGENT_COMMANDS = [
  'agentRef.sendToCodex',
  'agentRef.sendToOpenCode',
  'agentRef.sendToClaudeCode',
  'agentRef.sendToCursor',
  'agentRef.setTerminalTitleFromActiveFile'
];

test('keeps all Agent Reference Explorer actions in one isolated menu group', () => {
  const explorerActions = manifest.contributes.menus['explorer/context']
    .filter((item) => item.submenu === 'agentRef.sendToAgent' || AGENT_COMMANDS.includes(item.command));

  assert.equal(explorerActions.length, 6);
  assert.deepEqual(
    explorerActions.map((item) => item.group),
    ['agentRef@1', 'agentRef@2', 'agentRef@3', 'agentRef@4', 'agentRef@5', 'agentRef@6']
  );
});

test('retains inactive legacy Explorer settings and omits retired reference preferences', () => {
  const settings = manifest.contributes.configuration.properties;

  assert.equal(settings['agentRef.prompt'].type, 'string');
  assert.equal(settings['agentRef.workingDirectory'].type, 'string');
  assert.equal(settings['agentRef.workingDirectory'].default, '');
  for (const key of ['agentRef.prompt', 'agentRef.workingDirectory']) {
    assert.match(settings[key].description, /Legacy setting, inactive for Explorer agent launches/);
  }
  assert.equal(settings['agentRef.format'], undefined);
  assert.equal(settings['agentRef.pathStyle'], undefined);
});

test('contributes explicit terminal-file command and global keybinding', () => {
  const command = manifest.contributes.commands.find(
    (c) => c.command === 'agentRef.openTerminalFile'
  );
  assert.ok(command);
  assert.equal(command.title, 'Agent Ref: Open File for Terminal');

  const keybinding = manifest.contributes.keybindings.find(
    (kb) => kb.command === 'agentRef.openTerminalFile'
  );
  assert.ok(keybinding);
  assert.equal(keybinding.key, 'ctrl+cmd+e');
  assert.equal(keybinding.mac, 'cmd+ctrl+e');
  assert.equal(keybinding.when, undefined);
});

test('contributes active-file terminal-title command and global keybinding', () => {
  const commandId = 'agentRef.setTerminalTitleFromActiveFile';
  const command = manifest.contributes.commands.find(
    (c) => c.command === commandId
  );
  assert.ok(command);
  assert.equal(command.command, commandId);
  assert.equal(command.title, 'Set as Terminal Title');

  const explorerEntry = manifest.contributes.menus['explorer/context'].find(
    (item) => item.command === commandId
  );
  assert.ok(explorerEntry);
  assert.equal(explorerEntry.when, 'resourceScheme == file && !explorerResourceIsFolder');
  assert.equal(explorerEntry.group, 'agentRef@6');

  const keybinding = manifest.contributes.keybindings.find(
    (kb) => kb.command === commandId
  );
  assert.ok(keybinding);
  assert.equal(keybinding.command, commandId);
  assert.equal(keybinding.key, 'ctrl+alt+t');
  assert.equal(keybinding.mac, 'cmd+ctrl+t');
  assert.equal(keybinding.when, undefined);
});
