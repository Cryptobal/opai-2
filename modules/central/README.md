# Módulo Central (`central`)

- `manifest.ts`: id, dependencias, permisos, navegación, esquema de configuración, eventos y capacidades.
- `domain/`: lógica pura con tests.
- `capabilities/`: capacidades (`central.<entidad>.<verbo>`); la máquina de estados vive en el dominio.
- Pantallas: `apps/web/app/(erp)/central` (PR 6, CAR-472).
- Esquema de datos: `packages/db/prisma/schema/central.prisma` (schema de Postgres `central`, `tenant_id` y RLS en toda tabla).
