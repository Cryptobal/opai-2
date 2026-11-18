#!/usr/bin/env bash
# Borra ramas Neon de respaldo antiguas (CAR-629). Idempotente; con SOLO_LISTAR solo imprime.
set -euo pipefail

: "${NEON_API_KEY:?}"
: "${NEON_PROJECT_ID:?}"
NEONCTL="${NEONCTL:-neonctl@8.12.1}"
SOLO_LISTAR="${SOLO_LISTAR:-false}"
DIAS="${DIAS:-7}"
REPO="${GITHUB_REPOSITORY:?}"

umbral=$(date -u -d "-${DIAS} days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-"${DIAS}"d +%Y-%m-%dT%H:%M:%SZ)

prs_abiertos=$(gh api --paginate "repos/$REPO/pulls?state=open&per_page=100" --jq '.[].number' | tr '\n' ' ')
protegidas=" main dev "
for n in $prs_abiertos; do
  protegidas+=" preview/pr-${n} "
done

es_protegida() {
  case " $protegidas " in
    *" $1 "*) return 0 ;;
  esac
  return 1
}

antigua() {
  local ts="$1"
  [[ "$ts" < "$umbral" ]]
}

ramas=$(npx --yes "$NEONCTL" branches list --project-id "$NEON_PROJECT_ID" --output json)
echo "$ramas" | jq -c '.[]' | while read -r rama; do
  nombre=$(echo "$rama" | jq -r '.name')
  estado=$(echo "$rama" | jq -r '.current_state // "ready"')
  creada=$(echo "$rama" | jq -r '.created_at')
  es_protegida "$nombre" && continue
  caso=""
  case "$nombre" in
    respaldo-*|pre-*) caso="respaldo" ;;
    preview/pr-*) caso="preview_cerrado" ;;
    *) continue ;;
  esac
  antigua "$creada" || continue
  if [ "$caso" = "preview_cerrado" ] && [ "$estado" != "archived" ]; then
    continue
  fi
  if [ "$SOLO_LISTAR" = true ]; then
    echo "LISTARÍA borrar: $nombre (estado=$estado, creada=$creada)"
    continue
  fi
  echo "Borrando $nombre (estado=$estado, creada=$creada)."
  if ! salida=$(npx --yes "$NEONCTL" branches delete "$nombre" --project-id "$NEON_PROJECT_ID" 2>&1); then
    echo "$salida" | grep -qiE 'not found|404' && echo "  Ya no existe." && continue
    echo "::warning::No se pudo borrar $nombre: $salida"
  fi
done