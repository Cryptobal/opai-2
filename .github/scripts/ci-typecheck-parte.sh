#!/usr/bin/env bash
# Corre el typecheck de una de las N partes en que se reparten los paquetes del monorepo (orden
# alfabético, uno para cada parte por turno). Uso: ci-typecheck-parte.sh <parte> <partes>.
# Un tsc por CPU y por cada 4 GB de memoria.
set -euo pipefail
parte=$1
partes=$2

filtros=$(pnpm ls -r --depth -1 --json | jq -r '.[].path' | while read -r dir; do
  jq -r 'select(.scripts.typecheck and .name != "opai-2") | .name' "$dir/package.json"
done | sort | awk -v p="$parte" -v n="$partes" 'NR % n == p - 1 { printf "--filter=%s ", $0 }')

cpus=$(nproc)
mem=$(awk '/MemTotal/ { print int($2 / 1048576 / 4) }' /proc/meminfo)
tsc=$(( cpus < mem ? cpus : mem ))
# shellcheck disable=SC2086 # los filtros van como argumentos separados
pnpm turbo run typecheck --only $filtros --concurrency="$(( tsc > 0 ? tsc : 1 ))"
