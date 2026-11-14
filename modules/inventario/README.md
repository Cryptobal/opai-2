# Módulo Inventario (`inventario`)

Módulo vendible (ADR-116). Especificación: `docs/2.0/modulos/inventario.md`.

- `manifest.ts`: permisos, navegación (Operaciones › Inventario), eventos y capacidades.
- Capacidades: `packages/capabilities/src/inventario` (`inventario.<entidad>.<verbo>`).
- Dominio puro: `packages/domain/src/inventario`.
- Datos: `packages/db/prisma/schema/inventario.prisma` (schema `inventario`, `tenant_id` y RLS).
- Pantallas: `apps/web/app/(erp)/inventario`.
