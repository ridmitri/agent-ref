#!/usr/bin/env bash
set -euo pipefail

# Fail if tracked files contain a real machine home path.
# Documented fixtures (`/Users/me/...`, `/Users/test/...`) are allowed.
hits="$(git grep -n '/Users/' -- ':!.work' ':!scripts/scan-private-data.sh' || true)"

if [[ -z "${hits}" ]]; then
  echo 'No private-data matches'
  exit 0
fi

leaks="$(printf '%s\n' "${hits}" | grep -vE '/Users/(me|test)/' || true)"

if [[ -n "${leaks}" ]]; then
  printf '%s\n' "${leaks}"
  echo '::error::Private data leak detected in tracked files' >&2
  exit 1
fi

echo 'No private-data matches'
