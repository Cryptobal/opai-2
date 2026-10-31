# Módulo Finanzas (`finanzas`) · Flujo de caja

- `manifest.ts`: id, permisos `finanzas:flujo.*`, navegación (área Finanzas), eventos y capacidades.
- `domain/`: semanas, saldos acumulados, tono contra el umbral, reprogramación y tolerancia de cierre (puro, con tests).
- `capacidades/`: `finanzas.<entidad>.<verbo>`; la misma capacidad sirve a la pantalla, a `/api/v1` y al MCP.
- Esquema de datos: `packages/db/prisma/schema/finanzas.prisma` (schema `finanzas`, `tenant_id` y RLS en toda tabla).
