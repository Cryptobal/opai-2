#!/usr/bin/env bash
# Detecta PR/push/cola de merge cuyo diff solo toca *.md o docs/** (checks obligatorios en verde al instante).
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
  push)
    before=$(jq -r .before "$GITHUB_EVENT_PATH")
    if [ -z "$before" ] || [ "$before" = "null" ] || [ "$before" = "0000000000000000000000000000000000000000" ]; then
      echo "only_docs=false" >> "$GITHUB_OUTPUT"
      exit 0
    fi
    base="$before"
    head="$GITHUB_SHA"
    ;;
  *)
    echo "only_docs=false" >> "$GITHUB_OUTPUT"
    exit 0
    ;;
esac

mapfile -t files < <(git diff --name-only "$base" "$head" || true)
if [ "${#files[@]}" -eq 0 ]; then
  echo "only_docs=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

only_docs=true
for f in "${files[@]}"; do
  case "$f" in
    *.md|docs/*) ;;
    *)
      only_docs=false
      break
      ;;
  esac
done

echo "only_docs=$only_docs" >> "$GITHUB_OUTPUT"
if [ "$only_docs" = true ]; then
  echo "Diff solo documentación (${#files[@]} archivos)."
fi
