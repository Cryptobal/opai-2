#!/usr/bin/env bash
# Gate local mínimo (ADR-112): reemplaza a los checks de GitHub Actions mientras Actions no esté disponible.
# Revisa solo lo que el PR cambia frente a origin/main (y lo que depende de eso):
#   typecheck · lint          → turbo con --filter=...[origin/main] (paquetes afectados y sus dependientes)
#   test                      → pnpm test completo (~5 min)
#   test:db                   → solo si el PR toca packages/db, packages/capabilities, packages/auth o modules/
#   build · presupuesto de JS → con --presupuesto (el build normal lo cubre la vista previa de Vercel)
#   secretos                  → gitleaks sobre los commits del PR
#   migración pendiente       → informa migraciones nuevas (no se integra sin aplicarlas con respaldo)
#
# Requisitos: Postgres local postgres/postgres (o GATE_DB_URL) solo si corre test:db; pnpm y Node 22.
# Uso: scripts/gate-local.sh [--presupuesto] [--todo]   (--todo revisa el repositorio completo)
set -uo pipefail

DB_URL="${GATE_DB_URL:-postgresql://postgres:postgres@localhost:5432/opai_test}"
PRESUPUESTO=0; TODO=0
for a in "$@"; do
  case "$a" in --presupuesto) PRESUPUESTO=1 ;; --todo) TODO=1 ;; esac
done
export TURBO_CACHE_DIR="${TURBO_CACHE_DIR:-${TMPDIR:-/tmp}/opai-turbo-cache}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

git fetch -q origin main
FILTRO=(--filter="...[origin/main]")
[ "$TODO" = 1 ] && FILTRO=()
cambios=$(git diff --name-only origin/main...HEAD)

resultado=()
paso() {
  local nombre="$1"; shift
  echo "== $nombre"
  if "$@"; then resultado+=("$nombre:ok"); else resultado+=("$nombre:FALLA"); fi
}

base_limpia() {
  local db="${DB_URL##*/}" admin="${DB_URL%/*}/postgres"
  psql "$admin" -qc "DROP DATABASE IF EXISTS \"$db\"" && psql "$admin" -qc "CREATE DATABASE \"$db\""
  rm -f "${TMPDIR:-/tmp}/opai_cron_sii_test_pwd" # contraseña de opai_cron_sii de otra base
}

secretos() {
  command -v gitleaks >/dev/null || { echo "falta gitleaks 8.24.0"; return 1; }
  gitleaks git --no-banner --redact --log-opts="origin/main..HEAD" .
}

paso install pnpm install --frozen-lockfile --prefer-offline
paso typecheck pnpm turbo run typecheck --concurrency=1 "${FILTRO[@]}"
paso lint pnpm turbo run lint --concurrency=1 "${FILTRO[@]}"
paso test pnpm test
if [ "$TODO" = 1 ] || echo "$cambios" | grep -qE '^(packages/(db|capabilities|auth)|modules)/'; then
  paso base base_limpia
  paso test:db env DATABASE_URL_TEST="$DB_URL" pnpm test:db
else
  echo "== test:db omitido (el PR no toca base, capacidades, auth ni módulos)"
fi
if [ "$PRESUPUESTO" = 1 ]; then
  paso build pnpm --filter @opai/web build
  paso presupuesto pnpm presupuesto
fi
paso secretos secretos

echo
echo "SHA $(git rev-parse HEAD)"
echo "migraciones nuevas: $(echo "$cambios" | grep -c 'prisma/migrations/.*migration.sql' || true)"
printf '%s\n' "${resultado[@]}"
printf '%s\n' "${resultado[@]}" | grep -q FALLA && exit 1
exit 0
