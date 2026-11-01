# Módulo CPQ (`cpq`)

- `manifest.ts`: id, dependencias, permisos, navegación, esquema de configuración, eventos y capacidades.
- `domain/`: lógica pura con tests.
- `capabilities/`: capacidades (`cpq.<entidad>.<verbo>`); nunca contienen lógica de negocio, la delegan al dominio.
- `ui/`: pantallas compuestas con los patrones de `@opai/ds` (llegan con el PR 10.2, tras el diseño aprobado).
- Esquema de datos: `packages/db/prisma/schema/cpq.prisma` (schema de Postgres `cpq`, `tenant_id` y RLS en toda tabla).
