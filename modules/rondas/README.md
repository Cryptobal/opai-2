# Módulo Rondas (`rondas`)

- `manifest.ts`: id, dependencias, permisos, navegación, esquema de configuración, eventos y capacidades.
- `domain/`: lógica pura con tests.
- `capabilities/`: capacidades (`rondas.<entidad>.<verbo>`); nunca contienen lógica de negocio, la delegan al dominio.
- `ui/`: pantallas compuestas con los patrones de `@opai/ds`.
- Esquema de datos: `packages/db/prisma/schema/rondas.prisma` (schema de Postgres `rondas`, `tenant_id` y RLS en toda tabla).
