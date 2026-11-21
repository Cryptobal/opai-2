#!/usr/bin/env bash
# Marca PR/cola de merge como solo pantalla (CAR-807). Misma lógica que scripts/ci-solo-pantalla.ts.
set -euo pipefail

archivo_bloqueado() {
  local f=$1
  case "$f" in
    packages/db/*|packages/capabilities/*|packages/auth/*|modules/*|.github/*|simplicidad-base.json|pnpm-lock.yaml)
      return 0
      ;;
  esac
  case "$f" in
    */prisma/*|*/migrations/*)
      return 0
      ;;
  esac
  return 1
}

apps_web_bloqueado() {
  local f=$1
  case "$f" in
    apps/web/app/api/*|apps/web/middleware.ts|apps/web/proxy.ts|apps/web/lib/*|apps/web/next.config.*|apps/web/package.json|apps/web/tsconfig*)
      return 0
      ;;
  esac
  case "$f" in
    */route.ts|*/_acciones/*|*acciones.ts|*/accion.ts)
      return 0
      ;;
  esac
  return 1
}

archivo_solo_pantalla() {
  local f=$1
  if archivo_bloqueado "$f"; then
    return 1
  fi
  case "$f" in
    packages/ds/*|packages/domain/src/novedades/entradas/*)
      return 0
      ;;
    apps/web/e2e/*|apps/web/public/*|apps/web/test/*)
      return 0
      ;;
    apps/web/playwright.config.ts|apps/web/presupuesto-js.json)
      return 0
      ;;
  esac
  case "$f" in
    apps/web/app/*)
      if apps_web_bloqueado "$f"; then
        return 1
      fi
      case "$f" in
        *.tsx|*.css|*.scss|*.md)
          return 0
          ;;
      esac
      return 1
      ;;
  esac
  return 1
}

case "${GITHUB_EVENT_NAME}" in
  pull_request)
    pr_base=$(jq -r .pull_request.base.sha "$GITHUB_EVENT_PATH")
    head=$(jq -r .pull_request.head.sha "$GITHUB_EVENT_PATH")
    base=$(git merge-base "$pr_base" "$head")
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

mapfile -t files < <(git diff --no-renames --name-only "$base" "$head" 2>/dev/null || true)
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