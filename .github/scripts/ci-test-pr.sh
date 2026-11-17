#!/usr/bin/env bash
# Unitarios afectados por el diff del PR (vitest --changed).
set -euo pipefail
base=$(jq -r .pull_request.base.sha "$GITHUB_EVENT_PATH")
pnpm test --changed "$base" --maxWorkers="$(nproc)"