# Módulo CPQ (`cpq`)

- `manifest.ts`: id, dependencias (Comercial), permisos, navegación, esquema de configuración, eventos y capacidades.
- `domain/`: lógica pura con tests. Los estados (R40) y el código CPQ-AAAA-NNN (R54) viven en `packages/domain/src/cpq`.
- Capacidades: `packages/capabilities/src/cpq` (`cpq.<entidad>.<verbo>`), listadas como `capacidadesCpq`.
- `ui/`: pantallas compuestas con los patrones de `@opai/ds` (PR 10.2).
- Esquema de datos: `packages/db/prisma/schema/cpq.prisma` (schema de Postgres `cpq`, `tenant_id` y RLS en toda tabla).
- Especificación: `docs/2.0/modulos/cpq.md`; brief: `docs/2.0/briefs/BRIEF-10-cpq-cotizador.md`.
