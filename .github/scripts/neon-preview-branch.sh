#!/usr/bin/env bash
# Crea o reutiliza preview/pr-N en Neon, con reintento si choca el límite de computes (CAR-629).
set -euo pipefail

: "${NEON_API_KEY:?}"
: "${NEON_PROJECT_ID:?}"
: "${RAMA:?}"
NEONCTL="${NEONCTL:-neonctl@8.12.1}"

json_field() { jq -r "$1" 2>/dev/null; }

if existente=$(npx --yes "$NEONCTL" branches get "$RAMA" --project-id "$NEON_PROJECT_ID" --output json 2>/dev/null); then
  echo "created=false" >> "$GITHUB_OUTPUT"
  branch_id=$(echo "$existente" | json_field '.id')
else
  espera=20
  creada=""
  for intento in $(seq 1 8); do
    if salida=$(npx --yes "$NEONCTL" branches create --project-id "$NEON_PROJECT_ID" --name "$RAMA" --parent main --output json 2>&1); then
      creada="$salida"
      break
    fi
    if echo "$salida" | grep -qiE 'concurrent|concurrently active|limit|too many'; then
      echo "Límite de computes activos (intento $intento/8); espera ${espera}s."
      sleep "$espera"
      espera=$((espera * 2))
      [ "$espera" -le 300 ] || espera=300
      continue
    fi
    echo "$salida" >&2
    exit 1
  done
  [ -n "$creada" ] || { echo "::error::No se pudo crear la rama $RAMA tras reintentos."; exit 1; }
  echo "created=true" >> "$GITHUB_OUTPUT"
  branch_id=$(echo "$creada" | json_field '.branch.id // .id')
fi

db_url=$(npx --yes "$NEONCTL" connection-string "$RAMA" --project-id "$NEON_PROJECT_ID" --pooled false)
db_url_pooled=$(npx --yes "$NEONCTL" connection-string "$RAMA" --project-id "$NEON_PROJECT_ID" --pooled)
[ -n "$db_url" ] && [ -n "$db_url_pooled" ] || { echo "::error::Sin URLs de conexión para $RAMA."; exit 1; }
echo "branch_id=$branch_id" >> "$GITHUB_OUTPUT"
echo "db_url=$db_url" >> "$GITHUB_OUTPUT"
echo "db_url_pooled=$db_url_pooled" >> "$GITHUB_OUTPUT"