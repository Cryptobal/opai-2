# CAR-438 · Limpieza 3, parte 16: scripts importador OPAI 1.0 (`packages/db`)

- **Sesión:** [Sesión Cursor · Estándares]
- **PR:** rama `cursor/car-438-db-scripts-1f57`
- **Estado:** En PR
- **Migración:** No

## Qué entra

~49 exportaciones sin uso menos en `packages/db/scripts/importar-opai1` y `importar-rondas-etiquetas` (simplicidad **246 → 197**): reexports muertos, esquemas Zod y helpers solo internos. Tests de importación ajustados a importar `programacionRecurrenteOpai1` desde `origen-recurrentes-cpq`.

Tres símbolos en `packages/capabilities` (RCV, programación, memoria de pruebas) sin solapar PRs abiertos.

93 tests `importar-opai1` en verde.

Fixes CAR-438