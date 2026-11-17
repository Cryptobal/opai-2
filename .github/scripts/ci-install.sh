#!/usr/bin/env bash
# Dependencias de CI con caché de pnpm store y Turborepo (CAR-628).
set -euo pipefail

if [ "${SOLO_DOCS:-false}" = true ]; then
  exit 0
fi

pnpm install --frozen-lockfile