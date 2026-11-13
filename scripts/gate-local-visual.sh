#!/usr/bin/env bash
# Revisión visual local (ADR-112): reemplaza a `preview-e2e` mientras GitHub Actions no esté disponible.
# Levanta la app contra un Postgres local sembrado igual que el job `e2e` de CI (empresa ficticia, nunca Gard)
# y corre los e2e marcados `@preview` (375, 1024 y 1280 px). Las capturas quedan en
# apps/web/test-results/playwright para revisarlas antes de integrar.
# Uso: scripts/gate-local-visual.sh [spec ...]   (sin specs: todos los @preview)
set -euo pipefail

ADMIN="${GATE_DB_ADMIN:-postgresql://postgres:postgres@localhost:5432}"
DB=opai_e2e
psql "$ADMIN/postgres" -qc "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"

# Credenciales efímeras, solo para esta corrida local (no se imprimen).
for var in OPAI_APP_DB_PASSWORD BETTER_AUTH_SECRET CRON_SECRET RONDAS_ETIQUETA_SECRET; do
  export "$var=$(openssl rand -hex 24)"
done
export SEED_OWNER_PASSWORD="$(openssl rand -hex 12)Aa1"
export DATABASE_URL_MIGRATE="$ADMIN/$DB"
export BETTER_AUTH_URL=http://localhost:3000 NEXT_TELEMETRY_DISABLED=1

pnpm db:deploy
pnpm --filter @opai/db role:password
APP_URL="postgresql://opai_app:${OPAI_APP_DB_PASSWORD}@localhost:5432/$DB"
export DATABASE_URL="$APP_URL"
pnpm --filter @opai/db seed:dev-tenant
pnpm --filter @opai/auth seed:platform-owner
SEED_PLATFORM_ROLE=ninguno SEED_OWNER_EMAIL=e2e-multiempresa@opai.cl pnpm --filter @opai/auth seed:platform-owner
pnpm --filter @opai/db seed:e2e
pnpm --filter @opai/db seed:maestros-demo
pnpm --filter @opai/db exec tsx scripts/fixture-vencimientos-e2e.ts
pnpm --filter @opai/db seed:pauta-e2e
pnpm --filter @opai/auth seed:multiempresa-e2e
pnpm --filter @opai/auth seed:rendiciones-r3-e2e
SEED_OWNER_EMAIL=e2e-selector@opai.cl pnpm --filter @opai/auth seed:e2e-mfa
SEED_OWNER_EMAIL=e2e-multiempresa@opai.cl pnpm --filter @opai/auth seed:e2e-mfa

pnpm --filter @opai/web exec playwright install chromium >/dev/null
LOG="${TMPDIR:-/tmp}/opai-app-visual.log"
pnpm --filter @opai/web dev > "$LOG" 2>&1 &
APP_PID=$!
trap 'kill $APP_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 90); do curl -sf -m 10 http://localhost:3000/api/health >/dev/null && break; sleep 2; done
curl -sf -m 10 http://localhost:3000/api/health >/dev/null

BASE_URL=http://localhost:3000 pnpm --filter @opai/web exec playwright test --grep @preview --workers=1 \
  --reporter=list --output=test-results/playwright "$@"
