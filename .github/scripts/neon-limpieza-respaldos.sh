#!/usr/bin/env bash
# Lista ramas Neon respaldo-* y preview/pr-* archivadas antiguas (CAR-629). **No borra** ramas: limpieza manual.
set -euo pipefail

: "${NEON_API_KEY:?}"
: "${NEON_PROJECT_ID:?}"
NEONCTL="${NEONCTL:-neonctl@8.12.1}"
DIAS="${DIAS:-7}"
REPO="${GITHUB_REPOSITORY:?}"
GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
: "${GH_TOKEN:?}"

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
candidatas_txt=""
while read -r rama; do
  nombre=$(echo "$rama" | jq -r '.name')
  estado=$(echo "$rama" | jq -r '.current_state // "ready"')
  creada=$(echo "$rama" | jq -r '.created_at')
  es_protegida "$nombre" && continue
  caso=""
  case "$nombre" in
    respaldo-*|pre-*) caso="respaldo" ;;
    preview/pr-*) caso="preview" ;;
    *) continue ;;
  esac
  antigua "$creada" || continue
  if [ "$caso" = "preview" ] && [ "$estado" != "archived" ]; then
    continue
  fi
  candidatas_txt="${candidatas_txt}- \`${nombre}\` (estado=${estado}, creada=${creada})"$'\n'
done < <(echo "$ramas" | jq -c '.[]')

{
  echo "## Ramas Neon candidatas a limpieza manual (respaldo / preview archivada)"
  echo ""
  echo "Antigüedad ≥ ${DIAS} días. No se tocan \`main\`, \`dev\` ni \`preview/pr-N\` de PR abiertos."
  echo "**No se borra nada en este job.**"
  echo ""
  if [ -z "$candidatas_txt" ]; then
    echo "_Sin candidatas en este momento._"
  else
    echo -e "$candidatas_txt"
  fi
} >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"