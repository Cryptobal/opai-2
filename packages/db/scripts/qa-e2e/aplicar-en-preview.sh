#!/usr/bin/env bash
# CAR-544: aplica semillas ficticias de `qa-e2e` en la rama Neon de vista previa (`preview/pr-N`).
# Solo corre cuando `PREVIEW_RAMA` calza; usa el rol propietario (`DATABASE_URL_MIGRATE` o `DB_URL`).
# Idempotente. Nunca Gard ni datos reales.
set -euo pipefail

if [[ ! "${PREVIEW_RAMA:-}" =~ ^preview/pr-[0-9]+$ ]]; then
  echo "Semillas qa-e2e omitidas: no es rama preview (${PREVIEW_RAMA:-vacía})."
  exit 0
fi

URL="${DATABASE_URL_MIGRATE:-${DB_URL:-}}"
if [[ -z "$URL" ]]; then
  echo "::error::Falta DATABASE_URL_MIGRATE o DB_URL para semillas qa-e2e."
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Orden: cada archivo puede depender del anterior; todos son solo `qa-e2e`.
for f in \
  factura-aceptada.sql \
  bancos-reglas.sql \
  bancos-importaciones.sql \
  pauta-instalaciones.sql \
  desempeno.sql \
  cotizacion-ficha.sql
do
  echo "Aplicando qa-e2e/$f…"
  psql "$URL" -v ON_ERROR_STOP=1 -f "$DIR/$f"
done
echo "Semillas qa-e2e aplicadas en ${PREVIEW_RAMA}."