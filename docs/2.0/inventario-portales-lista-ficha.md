# Inventario · listas y fichas en portales (CAR-545, CAR-589)

Patrón de referencia (ERP): `ListScreen`, `DetailScreen` y `PlanillaScreen` en `@opai/ds` (`packages/ds/src/patterns/`). Cabecera de ficha: `Cabecera` vía `DetailScreen` / `ListScreen`, sin columnas angostas ni `max-w-2xl` en fichas.

Gate: `apps/web/test/portales-lista-ficha-patron.test.ts` (registro en `apps/web/lib/portales-lista-ficha-patron.ts`).

## Supervisor

| Ruta | Tipo | Componente | Patrón | Estado |
| --- | --- | --- | --- | --- |
| `/supervisor/rendiciones` (+ pestañas) | Lista | `rendiciones/lista.tsx` | `ListScreen` | Conforme (CAR-589) |
| `/supervisor/rendiciones/[id]` | Ficha | `rendiciones/pagina-detalle.tsx` | `DetailScreen` | Conforme (CAR-589) |
| `/supervisor/instalaciones` | Lista | `instalaciones/page.tsx` | `FilaSeleccionable` custom | Pendiente |
| `/supervisor/instalaciones/[id]` | Ficha | `instalaciones/[id]/page.tsx` | Secciones sueltas | Pendiente |
| `/supervisor/personas/[id]` | Ficha | `personas/[id]/page.tsx` | Custom | Pendiente |
| `/supervisor/novedades` | Lista | `novedades/page.tsx` | Feed | Exento (no lista maestro) |
| `/supervisor` | Inicio | — | Dashboard | Exento |

## Cliente

| Ruta | Tipo | Componente | Patrón | Estado |
| --- | --- | --- | --- | --- |
| `/cliente/cotizaciones` | Lista | `cotizaciones/_componentes/lista-cotizaciones.tsx` | `ListScreen` | Conforme |
| `/cliente/cotizaciones/[id]` | Ficha | `detalle-cotizacion.tsx` | `DetailScreen` | Conforme (CAR-589) |
| `/cliente` | Resumen | `page.tsx` | Dashboard | Exento |
| `/cliente/novedades` | Lista | `novedades/page.tsx` | Feed | Exento |

## Trabajador

| Ruta | Tipo | Notas | Estado |
| --- | --- | --- | --- |
| `/trabajador` | Inicio | Turnos y accesos | Exento |
| `/trabajador/mi-pauta` | Planilla | Calendario / turnos | Pendiente (`PlanillaScreen`) |
| `/trabajador/mis-documentos` | Lista | Documentos personales | Pendiente |
| `/trabajador/notificaciones` | Lista | Avisos | Pendiente |
| `/trabajador/solicitudes` (PR #846+) | Lista + ficha | Módulo en curso | Pendiente |

## Terreno

Pantallas operativas (marcar, rondas, portería, cola): mayormente flujos, no par lista/ficha maestro. Revisar en CAR-589 por portal cuando toque terreno.

## ERP (paridad portales)

Rendiciones comparten componentes con supervisor (`portal` en props). Misma exigencia de patrón en el gate.

## PRs CAR-589 (uno por portal)

| Portal | Rama | PR |
| --- | --- | --- |
| Supervisor | `brief/car-589-supervisor-lista-ficha` | (este PR) |
| Cliente | `brief/car-589-cliente-lista-ficha` | En PR |
| Trabajador | `brief/car-589-trabajador-lista-ficha` | Pendiente |
| Terreno | `brief/car-589-terreno-lista-ficha` | Pendiente |