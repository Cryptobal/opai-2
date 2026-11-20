# CAR-83 · Supervisión y visitas (Operaciones II, Brief 12)

- **Sesión:** Sesión Operaciones
- **PR:** #816 · rama `brief/car-83-visitas-supervision` · [brief](../../briefs/BRIEF-CAR-83-supervision-visitas.md)
- **Estado:** En PR (PR 1 de 3)
- **Migración:** `20270119100000_pauta_visitas` (renombrada desde 20270110100000 para quedar después de `20270116210000` de main; pendiente de aplicar con snapshot de Neon, dev y main)
- **Apilado sobre / espera:** ninguno

## Qué entra (PR 1: visitas en el servidor, sin pantalla)

- Tabla `pauta.visitas` (RLS + FORCE + `tenant_isolation`; una visita en curso por supervisor con índice único parcial; CHECK de estado, geocerca y cierre).
- Dominio `clasificarLlegada` y `listaVisita` en `@opai/domain` (con pruebas).
- Capacidades con MCP: `pauta.visitas.iniciar` (vista previa, hora del servidor, GPS que nunca bloquea), `.cerrar` (solo quien la inició; cerrada no se edita; evento `pauta.visita.cerrada`), `.listar` (contrato de listas) y `.obtener`, ambas con lectura auditada por IDs y alcance por instalaciones.
- Ajuste `pauta.visita_lista` (lista de revisión por empresa; vacía = lista genérica).
- Prueba `pauta-visitas-db.test.ts`: vista previa, una en curso, quién cierra, cerrada no se edita, alcance del supervisor y otra empresa.

## Qué entra (PR 2a: historial en la ficha de la instalación, apilado sobre el PR 1)

- Pestaña «Visitas» en la ficha de instalación del ERP (`/instalaciones/<id>/visitas`), visible con Pauta activo y `pauta:read`: lista paginada (`pauta.visitas.listar` filtrada por instalación) con llegada, supervisor, ubicación según la geocerca y resumen de la lista de revisión; el detalle abre en una hoja por `?visita=` con cada ítem, su nota y las observaciones. Solo lectura.
- Sin diseño aprobado propio: sigue el patrón de la pestaña «Rondas» de la misma ficha (lista con tarjeta en teléfono y tabla en escritorio, hoja de detalle por URL).
- Prueba `@preview` `instalacion-visitas-preview.spec.ts` y novedad para usuarios.

## Qué queda pendiente

- PR 2b: pantalla de la visita en el portal del supervisor (iniciar y cerrar desde el teléfono), después de #730, con el diseño nuevo.
- PR 3: fotos y firma del guardia por `core.documentos`, y «Hoy» con alertas (puestos sin cubrir, rondas atrasadas, faltas).
- Reemplazo desde el celular con turno extra por aprobar (B8): espera CAR-96 (CAR-458).

## Qué se decidió (reversible, la sesión)

- Las visitas viven en el módulo Pauta (Operaciones) y usan `pauta:read` / `pauta:write`, sin permiso nuevo.
- El GPS no bloquea (como rondas, ADR-023): se guarda distancia y estado de la llegada.
- La lista de revisión es un ajuste por empresa con una lista genérica de respaldo.
