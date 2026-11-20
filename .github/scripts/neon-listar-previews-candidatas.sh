#!/usr/bin/env bash
# Lista ramas Neon preview/pr-N cuyo PR está cerrado. No borra; la eliminación es manual con OK del dueño.
set -euo pipefail

: "${NEON_API_KEY:?}"
: "${NEON_PROJECT_ID:?}"
: "${GITHUB_REPOSITORY:?}"
NEONCTL="${NEONCTL:-neonctl@8.12.1}"
GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
: "${GH_TOKEN:?}"

PR_ACTUAL="${PR_ACTUAL:-}"
candidatas=()

ramas=$(npx --yes "$NEONCTL" branches list --project-id "$NEON_PROJECT_ID" --output json | jq -r '.[].name')
for nombre in $ramas; do
  [[ "$nombre" =~ ^preview/pr-([0-9]+)$ ]] || continue
  [[ "$nombre" == respaldo* ]] && continue
  [[ "$nombre" == pre-* ]] && continue
  n="${BASH_REMATCH[1]}"
  [ -n "$PR_ACTUAL" ] && [ "$n" = "$PR_ACTUAL" ] && continue
  estado=$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${n}" --jq .state 2>/dev/null) || {
    candidatas+=("$nombre (PR #$n: estado desconocido)")
    continue
  }
  [ "$estado" = "closed" ] && candidatas+=("$nombre (PR #$n cerrado)")
done

{
  echo "## Ramas Neon preview candidatas a limpieza manual"
  echo ""
  echo "Solo se listan nombres exactos \`preview/pr-N\` con PR cerrado. No se tocan \`main\`, \`dev\`, \`respaldo*\` ni \`pre-*\`."
  echo ""
  if [ ${#candidatas[@]} -eq 0 ]; then
    echo "_Sin candidatas en este momento._"
  else
    for c in "${candidatas[@]}"; do
      echo "- \`$c\`"
    done
  fi
} >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"