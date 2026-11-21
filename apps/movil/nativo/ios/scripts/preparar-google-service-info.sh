#!/usr/bin/env bash
# Inyecta GoogleService-Info.plist en builds de CI (CAR-733). Sin secreto en el repo.
set -euo pipefail

DEST="${SRCROOT:-.}/App/GoogleService-Info.plist"

if [[ -n "${GOOGLE_SERVICE_INFO_PLIST:-}" ]]; then
  printf '%s' "$GOOGLE_SERVICE_INFO_PLIST" >"$DEST"
  echo "note: GoogleService-Info.plist generado desde GOOGLE_SERVICE_INFO_PLIST."
elif [[ -f "$DEST" ]]; then
  echo "note: GoogleService-Info.plist ya presente (desarrollo local)."
else
  echo "warning: OPAI iOS — sin GoogleService-Info.plist; el proyecto compila pero push FCM queda desactivado."
fi