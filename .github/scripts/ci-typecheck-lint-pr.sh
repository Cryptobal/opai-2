#!/usr/bin/env bash
# Typecheck y lint en paquetes tocados por el diff del PR (turbo; incluye dependientes).
set -euo pipefail
base=$(jq -r .pull_request.base.sha "$GITHUB_EVENT_PATH")
cpus=$(nproc)
mem=$(awk '/MemTotal/ { print int($2 / 1048576 / 4) }' /proc/meminfo)
conc=$(( cpus < mem ? cpus : mem ))
pnpm turbo run typecheck lint --filter=...["$base"] --concurrency="$(( conc > 0 ? conc : 2 ))"