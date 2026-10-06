const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch {
    return path.resolve(__dirname, '..');
  }
}

function loadPrivacyKeywords(repoRoot) {
  const filePath = path.join(repoRoot, '.privacy_checks');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}

function getDiffOutput(args) {
  const diffArgs = args.length > 0 ? args.join(' ') : 'HEAD';
  const excludePaths = "':!.work' ':!.privacy_checks' ':!scripts/scan-private-data.*'";
  try {
    return execSync(`git diff -U1 ${diffArgs} -- ${excludePaths}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
  } catch {
    try {
      return execSync(`git diff -U1 -- ${excludePaths}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
    } catch {
      return '';
    }
  }
}

function main() {
  const repoRoot = getRepoRoot();
  const keywords = loadPrivacyKeywords(repoRoot);

  if (keywords.length === 0) {
    console.log('No active privacy keywords configured in .privacy_checks');
    process.exit(0);
  }

  const userArgs = process.argv.slice(2);
  const diffOutput = getDiffOutput(userArgs);

  if (!diffOutput) {
    console.log('No private-data matches in diff');
    process.exit(0);
  }

  const addedLines = diffOutput
    .split(/\r?\n/)
    .filter(line => line.startsWith('+') && !line.startsWith('+++'));

  let hasLeaks = false;

  for (const kw of keywords) {
    const matches = addedLines.filter(line => line.includes(kw));
    if (matches.length > 0) {
      hasLeaks = true;
      console.error(`::error::Private keyword '${kw}' detected in diff:`);
      for (const match of matches) {
        console.error(match);
      }
    }
  }

  if (hasLeaks) {
    console.error('Private data leak detected in diff');
    process.exit(1);
  }

  console.log('No private-data matches in diff');
}

main();
