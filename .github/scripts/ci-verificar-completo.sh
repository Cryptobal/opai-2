#!/usr/bin/env bash
# Gate completo en un solo job: typecheck en 2 partes, lint y test en 2 shards (misma cobertura
# que el matrix anterior, en serie para menos jobs concurrentes en GitHub).
set -euo pipefail
.github/scripts/ci-typecheck-parte.sh 1 2
.github/scripts/ci-typecheck-parte.sh 2 2
pnpm turbo run lint --concurrency=2
pnpm test --shard=1/2 --maxWorkers="$(nproc)"
pnpm test --shard=2/2 --maxWorkers="$(nproc)"