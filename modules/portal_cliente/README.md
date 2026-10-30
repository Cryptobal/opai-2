# Módulo Portal Cliente (`portal_cliente`)

- `manifest.ts`: id, permisos, eventos y capacidades.
- Capacidades: `packages/capabilities/src/portal-cliente` (`portal_cliente.<entidad>.<verbo>`).
- Dominio puro: `packages/domain/src/portal-cliente.ts`.
- Esquema de datos: `packages/db/prisma/schema/portal-cliente.prisma` (schema de Postgres `portal_cliente`, `tenant_id` y RLS en toda tabla).
- Especificación: `docs/2.0/modulos/portal-cliente.md`; brief: `docs/2.0/briefs/BRIEF-16-portal-cliente.md`.
