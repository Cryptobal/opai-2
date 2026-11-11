#!/usr/bin/env bash
# Aviso (no bloquea): un PR que toca pantallas o el DS pero no agrega ni cambia una
# entrada en packages/domain/src/novedades/entradas/*.md. Regla de Carlos (10-nov-2026,
# CAR-260): todo cambio visual o de diseño que se integra lleva su novedad in-app,
# también si todavía solo está en test.opai.cl. Cambios internos (CI, refactors, MCP
# sin pantalla, tests) no la llevan, por eso es una advertencia y no un error.
set -euo pipefail

[ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] || exit 0
base=$(jq -r .pull_request.base.sha "$GITHUB_EVENT_PATH")
head=$(jq -r .pull_request.head.sha "$GITHUB_EVENT_PATH")

mapfile -t files < <(git diff --name-only "$base...$head" || true)

visual=()
novedad=false
for f in "${files[@]}"; do
  case "$f" in
    packages/domain/src/novedades/entradas/*.md) novedad=true ;;
    *.test.ts|*.test.tsx|*.spec.ts|*/test/*|*/tests/*|*/e2e/*) ;;
    apps/web/app/api/*) ;;
    apps/web/app/*.tsx|apps/web/components/*.tsx|packages/ds/src/*.tsx|packages/ds/src/*.css|modules/*/ui/*.tsx)
      visual+=("$f") ;;
  esac
done

if [ "${#visual[@]}" -gt 0 ] && [ "$novedad" != true ]; then
  echo "::warning title=Falta la novedad in-app::Este PR toca pantallas o el DS (${#visual[@]} archivos, p. ej. ${visual[0]}) y no agrega ni modifica un .md en packages/domain/src/novedades/entradas/. Si el cambio es visible o de diseño (aunque aún esté solo en test), agrega la novedad describiendo lo que cambia en pantalla (changelog/README.md) y corre pnpm --filter @opai/domain gen:novedades-embed. Si es solo interno, ignora este aviso."
else
  echo "Novedad in-app: sin aviso (${#visual[@]} archivos visuales; entrada de novedad: $novedad)."
fi
