# Módulo Tickets (`tickets`)

- `manifest.ts`: id, dependencias, permisos, navegación, esquema de configuración, eventos y capacidades.
- `domain/`: lógica pura con tests.
- `capacidades/`: capacidades (`tickets.<entidad>.<verbo>`); nunca contienen lógica de negocio, la delegan al dominio.
- `ui/`: pantallas compuestas con los patrones de `@opai/ds`.
- Esquema de datos: `packages/db/prisma/schema/tickets.prisma` (schema de Postgres `tickets`, `tenant_id` y RLS en toda tabla).
