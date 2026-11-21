#!/usr/bin/env bash
# Marca PR/cola de merge como solo pantalla (CAR-807).
set -euo pipefail

case "${GITHUB_EVENT_NAME}" in
  pull_request)
    base=$(jq -r .pull_request.base.sha "$GITHUB_EVENT_PATH")
    head=$(jq -r .pull_request.head.sha "$GITHUB_EVENT_PATH")
  ;;
  merge_group)
    base=$(jq -r .merge_group.base_sha "$GITHUB_EVENT_PATH")
    head=$(jq -r .merge_group.head_sha "$GITHUB_EVENT_PATH")
  ;;
  *)
    echo "solo_pantalla=false" >> "$GITHUB_OUTPUT"
    exit 0
  ;;
esac

mapfile -t files < <(git diff --name-only "$base" "$head" || true)
json=$(printf '%s\n' "${files[@]}" | jq -R -s -c 'split("\n") | map(select(length > 0))')
solo=$(pnpm exec tsx scripts/ci-solo-pantalla-cli.ts "$json")

echo "solo_pantalla=$solo" >> "$GITHUB_OUTPUT"
if [ "$solo" = true ]; then
  echo "Diff solo pantalla (${#files[@]} archivos)."
fi