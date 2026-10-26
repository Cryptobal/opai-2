# Módulo Comercial (`comercial`)

- `manifest.ts`: id, dependencias, permisos, navegación, esquema de configuración, eventos y capacidades.
- `domain/`: lógica pura con tests.
- `capabilities/`: capacidades (`comercial.<entidad>.<verbo>`); nunca contienen lógica de negocio, la delegan al dominio.
- `ui/`: pantallas compuestas con los patrones de `@opai/ds`.
- Esquema de datos: `packages/db/prisma/schema/comercial.prisma` (schema de Postgres `comercial`, `tenant_id` y RLS en toda tabla).
