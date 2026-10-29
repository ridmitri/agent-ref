const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repositoryRoot, 'media', 'preview-selection.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');

function createPreviewFixture(initialContext = undefined) {
  const attributes = new Map();
  if (initialContext !== undefined) {
    attributes.set('data-vscode-context', initialContext);
  }

  const listeners = [];
  const writes = [];
  let selectedText = '';
  const root = {
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      writes.push([name, value]);
      attributes.set(name, value);
    }
  };
  const document = {
    documentElement: root,
    addEventListener(type, listener, capture) {
      listeners.push({ type, listener, capture });
    },
    removeEventListener(type, listener, capture) {
      const index = listeners.findIndex((entry) =>
        entry.type === type && entry.listener === listener && entry.capture === capture
      );
      if (index !== -1) listeners.splice(index, 1);
    }
  };
  const window = {
    getSelection() {
      return { toString: () => selectedText };
    }
  };
  const context = vm.createContext({ window, document, JSON });

  return {
    evaluate() {
      vm.runInContext(scriptSource, context, { filename: scriptPath });
    },
    dispatchContextMenu() {
      const event = {
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() { throw new Error('host context menu propagation was stopped'); }
      };
      for (const entry of [...listeners]) {
        if (entry.type === 'contextmenu') entry.listener(event);
      }
      return event;
    },
    get context() {
      return JSON.parse(attributes.get('data-vscode-context'));
    },
    get listeners() { return listeners; },
    get writes() { return writes; },
    set selectedText(text) { selectedText = text; }
  };
}

test('captures exact live selection and merges context without changing host behavior', () => {
  const fixture = createPreviewFixture('{"imageCommand":"open","section":3}');
  fixture.evaluate();

  assert.equal(fixture.listeners.length, 1);
  assert.equal(fixture.listeners[0].type, 'contextmenu');
  assert.equal(fixture.listeners[0].capture, true);

  fixture.selectedText = 'Line one\n"quoted" 🧪';
  const event = fixture.dispatchContextMenu();
  assert.equal(event.defaultPrevented, false);
  assert.deepEqual(fixture.context, {
    imageCommand: 'open',
    section: 3,
    agentRefPreviewContextVersion: 1,
    agentRefHasPreviewSelection: true,
    agentRefPreviewSelection: 'Line one\n"quoted" 🧪'
  });
  assert.match(fixture.writes[0][1], /\\n/);
  assert.match(fixture.writes[0][1], /\\"quoted\\"/);

  fixture.selectedText = 'a different selection';
  fixture.dispatchContextMenu();
  assert.equal(fixture.context.agentRefPreviewSelection, 'a different selection');
});

test('clears the namespaced payload when the live selection is empty', () => {
  const fixture = createPreviewFixture('{"keep":true,"agentRefPreviewSelection":"stale"}');
  fixture.evaluate();
  fixture.selectedText = '';
  fixture.dispatchContextMenu();

  assert.deepEqual(fixture.context, {
    keep: true,
    agentRefPreviewContextVersion: 1,
    agentRefHasPreviewSelection: false,
    agentRefPreviewSelection: ''
  });
});

test('script reevaluation replaces its listener instead of accumulating handlers', () => {
  const fixture = createPreviewFixture();
  fixture.evaluate();
  fixture.evaluate();
  fixture.selectedText = 'selection';
  fixture.dispatchContextMenu();

  assert.equal(fixture.listeners.length, 1);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.context.agentRefPreviewSelection, 'selection');
});

test('manifest registers the script and all existing commands for selected preview text', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
  const script = manifest.contributes.markdown.previewScripts[0];
  const menuItems = manifest.contributes.menus['webview/context'];
  const expectedCommands = [
    'agentRef.copySend',
    'agentRef.copyOnly',
    'agentRef.sendOnly'
  ];

  assert.equal(script, './media/preview-selection.js');
  assert.equal(fs.existsSync(path.join(repositoryRoot, script)), true);
  assert.deepEqual(menuItems.map((item) => item.command), expectedCommands);
  for (const item of menuItems) {
    assert.match(item.when, /webviewId == 'markdown\.preview'/);
    assert.match(item.when, /agentRefHasPreviewSelection/);
  }
});
