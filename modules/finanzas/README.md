# Módulo Finanzas (`finanzas`)

Finanzas · Compras, conciliación y contabilidad (Brief 23). PR 1: plan de cuentas, centros de costo, proveedores y libro de compras. Especificación en `docs/2.0/modulos/finanzas-compras.md`.

- `manifest.ts`: id, permisos, navegación, ajustes, eventos y capacidades.
- Capacidades: `packages/capabilities/src/finanzas` (`finanzas.<entidad>.<verbo>`); la lógica pura vive en `packages/domain/src/finanzas`.
- Esquema de datos: `packages/db/prisma/schema/finanzas.prisma` (schema de Postgres `finanzas`, `tenant_id` y RLS en toda tabla).
- Pantallas: `apps/web/app/(erp)/finanzas`.

## Flujo de caja (CAR-91, Brief 20)

- `manifest.ts`: id, permisos `finanzas:flujo.*`, navegación (área Finanzas), eventos y capacidades.
- `domain/`: semanas, saldos acumulados, tono contra el umbral, reprogramación y tolerancia de cierre (puro, con tests).
- `capacidades/`: `finanzas.<entidad>.<verbo>`; la misma capacidad sirve a la pantalla, a `/api/v1` y al MCP.
- Esquema de datos: `packages/db/prisma/schema/finanzas.prisma` (schema `finanzas`, `tenant_id` y RLS en toda tabla).
