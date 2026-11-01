# Módulo Nómina (`nomina`)

- `manifest.ts`: id, dependencias, permisos, navegación, ajustes, eventos y capacidades.
- Capacidades: `packages/capabilities/src/nomina` (`nomina.<entidad>.<verbo>`); la lógica pura (transiciones del período, plan de cuotas, anticipo quincenal, calendario) vive en `packages/domain/src/nomina`.
- Pantallas: `apps/web/app/(erp)/nomina` y la sección de conceptos en `apps/web/app/(erp)/configuracion/_nomina`.
- Esquema de datos: `packages/db/prisma/schema/nomina.prisma` (schema de Postgres `nomina`, `tenant_id` y RLS en toda tabla).
- Spec: `docs/2.0/modulos/nomina.md`. Brief: `docs/2.0/briefs/BRIEF-25-nomina.md`.
