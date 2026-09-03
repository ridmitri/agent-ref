const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AGENT_METADATA } = require('../out/agent-command.js');
const {
  TOP_LEVEL_MENU_CONTEXT_KEYS,
  getTopLevelMenuContextUpdate
} = require('../out/menu-preferences.js');

test('maps every agent preference to its explicit top-level menu context key', () => {
  const preferences = {
    showCodexInTopLevelMenu: false,
    showOpenCodeInTopLevelMenu: true,
    showClaudeCodeInTopLevelMenu: false,
    showCursorInTopLevelMenu: true
  };
  const configuration = {
    get: (setting, defaultValue) => preferences[setting] ?? defaultValue
  };

  assert.deepEqual(
    Object.values(AGENT_METADATA).map((agent) =>
      getTopLevelMenuContextUpdate(agent, configuration)
    ),
    [
      {
        contextKey: 'agentRef.showCodexInTopLevelMenu',
        value: false
      },
      {
        contextKey: 'agentRef.showOpenCodeInTopLevelMenu',
        value: true
      },
      {
        contextKey: 'agentRef.showClaudeCodeInTopLevelMenu',
        value: false
      },
      {
        contextKey: 'agentRef.showCursorInTopLevelMenu',
        value: true
      }
    ]
  );
});

test('uses true as the default value for an unset top-level menu preference', () => {
  const configuration = {
    get: (_setting, defaultValue) => defaultValue
  };

  assert.equal(
    getTopLevelMenuContextUpdate(AGENT_METADATA.codex, configuration).value,
    true
  );
});

test('defines one context key for every supported agent', () => {
  assert.deepEqual(Object.keys(TOP_LEVEL_MENU_CONTEXT_KEYS), [
    'codex',
    'opencode',
    'claudeCode',
    'cursor'
  ]);
});
