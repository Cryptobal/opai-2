#!/usr/bin/env bash
# preview-e2e en PR: solo bloquean specs relacionados con el diff (CAR-511, CAR-807).
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
SPEC_DIR="apps/web/e2e"

RELACIONADOS=""
if [ "${GITHUB_EVENT_NAME:-}" = pull_request ]; then
  pr_base=$(jq -r .pull_request.base.sha "$GITHUB_EVENT_PATH")
  head=$(jq -r .pull_request.head.sha "$GITHUB_EVENT_PATH")
  base=$(git merge-base "$pr_base" "$head")
  mapfile -t files < <(git diff --no-renames --name-only "$base" "$head" 2>/dev/null || true)
  json=$(printf '%s\n' "${files[@]}" | jq -R -s -c 'split("\n") | map(select(length > 0))')
  RELACIONADOS=$(pnpm exec tsx scripts/preview-e2e-especs-relacionados-cli.ts "$json")
  echo "Specs relacionados (bloquean si fallan): ${RELACIONADOS:-ninguno}"
fi

run_todos() {
  pnpm --filter @opai/web exec playwright test --grep @preview --workers=2 --reporter=list \
    --output=test-results/playwright "$@"
}

if [ -n "$RELACIONADOS" ]; then
  args=()
  for spec in $RELACIONADOS; do
    args+=("$SPEC_DIR/$spec")
  done
  if [ "${#args[@]}" -gt 0 ]; then
    echo "=== Bloqueantes: ${args[*]} ==="
    run_todos "${args[@]}"
  fi
fi

echo "=== Suite @preview completa (fallos ajenos no bloquean) ==="
set +e
run_todos
codigo_completo=$?
set -e
if [ "$codigo_completo" -eq 0 ]; then
  exit 0
fi

if [ -z "$RELACIONADOS" ]; then
  exit "$codigo_completo"
fi

echo "::warning::preview-e2e completo terminó con código $codigo_completo; los bloqueantes ya pasaron (CAR-511)."
exit 0