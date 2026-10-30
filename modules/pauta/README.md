# Módulo Pauta (`pauta`)

Operaciones · Pauta (Brief 11b, CAR-81). La pauta guarda **series** (patrón + inicio de ciclo + titular) y **excepciones** por día; el resto se calcula.

- `manifest.ts`: id, permisos (`pauta:read`, `pauta:write`), navegación (área Operaciones), eventos y capacidades.
- Dominio puro: `packages/domain/src/pauta` (expansión de series y feriados, cobertura, no doblar), con tests.
- Capacidades: `packages/capabilities/src/pauta` (`pauta.<entidad>.<verbo>`), expuestas en pantalla, `/api/v1` y MCP.
- Pantallas: `apps/web/app/(erp)/pauta`.
- Datos: `packages/db/prisma/schema/pauta.prisma` (schema `pauta`, RLS FORCE en toda tabla).
- Brief y hoja de alcance: `docs/2.0/briefs/BRIEF-11b-pauta.md`.
