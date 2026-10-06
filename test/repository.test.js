const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolveTerminalName } = require('../out/repository.js');

test('selected resource basename determines title independently of cwd', async () => {
  const cases = [
    ['/workspace', '/workspace/src/app.ts', 'app.ts'],
    ['/other-root', '/workspace/.work/task/spec.md', 'spec.md'],
    ['/workspace', '/workspace/.work/task/.meta.task.yml', 'task'],
    ['/workspace', '/workspace/.work/task/.meta.DP-19929_fe_network_hierarchy.yml', 'DP-19929_fe_network_hierarchy'],
    ['/workspace', '/workspace/.work/task/.meta.task.yaml', 'task'],
    ['/workspace', '/workspace/.meta.task.md', 'task.md'],
    ['/workspace', '/workspace/task.yml', 'task.yml'],
    ['/workspace', '/workspace/task.yaml', 'task.yaml'],
    ['/workspace', '/workspace/notes.meta.task.yml', 'notes.meta.task.yml'],
    ['/workspace', '/workspace/.meta.', '.meta.'],
    ['/workspace', '/workspace/.meta..yml', '.meta..yml'],
    ['/workspace', '/workspace/.meta..yaml', '.meta..yaml'],
    ['/workspace', '/workspace/folder/', 'folder'],
    ['/workspace', '/workspace/a/notes [v2]; $.md', 'notes [v2]; $.md'],
    ['/workspace', '/another-root/spec.md', 'spec.md'],
    ['/workspace', undefined, 'workspace'],
    [undefined, undefined, 'terminal']
  ];
  for (const [cwd, selected, title] of cases) {
    assert.equal(await resolveTerminalName(cwd, selected), title);
  }
});
