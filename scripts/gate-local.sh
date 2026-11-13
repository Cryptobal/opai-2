#!/usr/bin/env bash
# Gate local equivalente a los 4 checks obligatorios del ruleset «Proteger main» (ADR-112).
# Se usa mientras GitHub Actions no esté disponible (bloqueo de pago) o para verificar antes de pedir CI.
# Corre sobre el checkout actual (idealmente el head exacto del PR) y deja el resumen en stdout:
#   typecheck · lint · test · test:db   → pnpm typecheck/lint/test/test:db
#   build · presupuesto de JS           → pnpm --filter @opai/web build && pnpm presupuesto
#   secretos                            → gitleaks sobre la historia de la rama frente a origin/main
#   migración pendiente                 → se revisa a mano (migraciones nuevas = no integrar sin aplicar)
#
# Requisitos: Postgres local con usuario postgres/postgres (o GATE_DB_URL), pnpm y Node 22.
# No imprime secretos. Uso: scripts/gate-local.sh [--sin-build]
set -uo pipefail

DB_URL="${GATE_DB_URL:-postgresql://postgres:postgres@localhost:5432/opai_test}"
SIN_BUILD=0
[ "${1:-}" = "--sin-build" ] && SIN_BUILD=1

resultado=()
paso() {
  local nombre="$1"; shift
  echo "== $nombre"
  if "$@"; then resultado+=("$nombre:ok"); else resultado+=("$nombre:FALLA"); fi
}

base_limpia() {
  local db="${DB_URL##*/}"
  local admin="${DB_URL%/*}/postgres"
  psql "$admin" -qc "DROP DATABASE IF EXISTS \"$db\"" && psql "$admin" -qc "CREATE DATABASE \"$db\""
  # Marcador de contraseña de opai_cron_sii de corridas anteriores (otra base): se descarta.
  rm -f "${TMPDIR:-/tmp}/opai_cron_sii_test_pwd"
}

secretos() {
  if ! command -v gitleaks >/dev/null; then
    echo "gitleaks no instalado: se omite (instalar 8.24.0 para el check completo)"; return 0
  fi
  git fetch -q origin main
  gitleaks git --no-banner --redact --log-opts="origin/main..HEAD" .
}

paso install pnpm install --frozen-lockfile --prefer-offline
paso typecheck env NODE_OPTIONS=--max-old-space-size=4096 pnpm turbo run typecheck --concurrency=1
paso lint env NODE_OPTIONS=--max-old-space-size=4096 pnpm turbo run lint --concurrency=1
paso test pnpm test
paso base base_limpia
paso test:db env DATABASE_URL_TEST="$DB_URL" pnpm test:db
if [ "$SIN_BUILD" = 0 ]; then
  paso build pnpm --filter @opai/web build
  paso presupuesto pnpm presupuesto
fi
paso secretos secretos

echo
echo "SHA $(git rev-parse HEAD)"
nuevas=$(git diff --name-only origin/main...HEAD -- packages/db/prisma/migrations | grep -c migration.sql || true)
echo "migraciones nuevas: $nuevas"
printf '%s\n' "${resultado[@]}"
printf '%s\n' "${resultado[@]}" | grep -q FALLA && exit 1
exit 0
