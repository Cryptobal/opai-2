#!/usr/bin/env bash
# test:db en un solo job: base+auth y capacidades en 3 shards (misma cobertura que matrix de 4).
set -euo pipefail
rm -f "${TMPDIR:-/tmp}/opai_cron_sii_test_pwd"
pnpm test:db:base
pnpm test:db:capacidades --shard=1/3
pnpm test:db:capacidades --shard=2/3
pnpm test:db:capacidades --shard=3/3