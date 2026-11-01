# Módulo Portal Trabajador (`portal_trabajador`)

- `manifest.ts`: id, dependencias, permisos, navegación, esquema de configuración, eventos y capacidades.
- `domain/`: lógica pura con tests.
- `capabilities/`: capacidades (`portal_trabajador.<entidad>.<verbo>`); nunca contienen lógica de negocio, la delegan al dominio.
- `ui/`: pantallas compuestas con los patrones de `@opai/ds`.
- Esquema de datos: `packages/db/prisma/schema/portal_trabajador.prisma` (schema de Postgres `portal_trabajador`, `tenant_id` y RLS en toda tabla).
