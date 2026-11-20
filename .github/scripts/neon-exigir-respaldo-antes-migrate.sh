#!/usr/bin/env bash
# Falla si no existe una rama Neon respaldo-* creada en las últimas 48 h (antes de migrar main/dev).
set -euo pipefail

: "${NEON_API_KEY:?}"
: "${NEON_PROJECT_ID:?}"
NEONCTL="${NEONCTL:-neonctl@8.12.1}"

umbral=$(date -u -d "-48 hours" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-48H +%Y-%m-%dT%H:%M:%SZ)
hay="no"
while read -r line; do
  nombre=$(echo "$line" | jq -r '.name')
  creada=$(echo "$line" | jq -r '.created_at')
  [[ "$nombre" == respaldo-* ]] || continue
  [[ "$creada" < "$umbral" ]] && continue
  hay="si"
  echo "Respaldo reciente: $nombre ($creada)"
  break
done < <(npx --yes "$NEONCTL" branches list --project-id "$NEON_PROJECT_ID" --output json | jq -c '.[]')

if [ "$hay" != "si" ]; then
  echo "::error::No hay rama respaldo-* de Neon creada en las últimas 48 h. Cree un respaldo antes de migrar main o dev."
  exit 1
fi