#!/usr/bin/env bash
set -euo pipefail

target="${1:-vibe-video}"

if [ -e "$target" ] && [ "$(find "$target" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
  echo "Refusing to overwrite non-empty directory: $target" >&2
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install a supported Node.js version first." >&2
  exit 3
fi
if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "npx create-video@latest --yes --blank $target"
  echo "cd $target && npx remotion skills add"
  exit 0
fi
npx create-video@latest --yes --blank "$target"
(cd "$target" && npx remotion skills add)
echo "Created Remotion project at $target"
echo "Next: cd $target && npm run dev"

