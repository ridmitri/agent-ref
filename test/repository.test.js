const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  fallbackTitleFromTargetPath,
  resolveRepositoryFolderName,
  resolveTerminalName
} = require('../out/repository.js');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ref-repo-'));
}

function initGitRepository(repoDir) {
  execFileSync('git', ['init'], {
    cwd: repoDir,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0'
    }
  });
}

test('resolves the repository folder name from a git working tree root', async () => {
  const tmpDir = makeTempDir();
  const repoDir = path.join(tmpDir, 'my-repo');
  fs.mkdirSync(repoDir);

  try {
    initGitRepository(repoDir);
    assert.equal(await resolveRepositoryFolderName(repoDir), 'my-repo');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('resolves the repository folder name from a nested path via git rev-parse --show-toplevel', async () => {
  const tmpDir = makeTempDir();
  const repoDir = path.join(tmpDir, 'my-repo');
  const nestedDir = path.join(repoDir, 'frontend', 'src', 'components');
  fs.mkdirSync(nestedDir, { recursive: true });

  try {
    initGitRepository(repoDir);
    assert.equal(await resolveRepositoryFolderName(nestedDir), 'my-repo');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('returns undefined when git rev-parse reports the path is not a repository', async () => {
  const tmpDir = makeTempDir();
  const folderPath = path.join(tmpDir, 'my', 'document');
  fs.mkdirSync(folderPath, { recursive: true });

  try {
    assert.equal(await resolveRepositoryFolderName(folderPath), undefined);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('titles a file as parentFolder/filename', () => {
  const tmpDir = makeTempDir();
  const srcDir = path.join(tmpDir, 'src');
  const filePath = path.join(srcDir, 'app.ts');
  fs.mkdirSync(srcDir);
  fs.writeFileSync(filePath, 'export {};\n');

  try {
    assert.equal(fallbackTitleFromTargetPath(filePath), 'src/app.ts');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('titles a folder with the folder path', () => {
  const tmpDir = makeTempDir();
  const folderPath = path.join(tmpDir, 'my', 'document');
  fs.mkdirSync(folderPath, { recursive: true });

  try {
    assert.equal(fallbackTitleFromTargetPath(folderPath), 'document');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('prefers the git toplevel name for a nested supplied path even when cwd is not a repository', async () => {
  const tmpDir = makeTempDir();
  const repoDir = path.join(tmpDir, 'my-repo');
  const nestedDir = path.join(repoDir, 'frontend', 'src', 'components');
  const otherCwd = path.join(tmpDir, 'not-a-repo');
  fs.mkdirSync(nestedDir, { recursive: true });
  fs.mkdirSync(otherCwd);

  try {
    initGitRepository(repoDir);
    assert.equal(await resolveTerminalName(otherCwd, nestedDir), 'my-repo');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('falls back to parentFolder/filename when the supplied path is not a git repository', async () => {
  const tmpDir = makeTempDir();
  const srcDir = path.join(tmpDir, 'src');
  const filePath = path.join(srcDir, 'app.ts');
  fs.mkdirSync(srcDir);
  fs.writeFileSync(filePath, 'export {};\n');

  try {
    assert.equal(await resolveTerminalName(tmpDir, filePath), 'src/app.ts');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('falls back to the folder name when git rev-parse reports no repository', async () => {
  const tmpDir = makeTempDir();
  const folderPath = path.join(tmpDir, 'my', 'document');
  fs.mkdirSync(folderPath, { recursive: true });

  try {
    assert.equal(await resolveTerminalName(folderPath, folderPath), 'document');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
