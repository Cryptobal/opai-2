#!/usr/bin/env bash
# Marca PR/cola de merge como solo pantalla (CAR-807). Misma lógica que scripts/ci-solo-pantalla.ts.
set -euo pipefail

archivo_solo_pantalla() {
  local f=$1
  case "$f" in
    packages/db/*|packages/capabilities/*|packages/auth/*|modules/*|.github/workflows/*|simplicidad-base.json|pnpm-lock.yaml)
      return 1
      ;;
    */prisma/*|*/migrations/*)
      return 1
      ;;
    apps/web/*|packages/ds/*|packages/domain/src/novedades/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

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
if [ "${#files[@]}" -eq 0 ]; then
  echo "solo_pantalla=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

solo_pantalla=true
for f in "${files[@]}"; do
  if ! archivo_solo_pantalla "$f"; then
    solo_pantalla=false
    break
  fi
done

echo "solo_pantalla=$solo_pantalla" >> "$GITHUB_OUTPUT"
if [ "$solo_pantalla" = true ]; then
  echo "Diff solo pantalla (${#files[@]} archivos)."
fi