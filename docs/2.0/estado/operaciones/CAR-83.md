# CAR-83 · Supervisión y visitas (Operaciones II, Brief 12)

- **Sesión:** Sesión Operaciones
- **PR:** #816 · rama `brief/car-83-visitas-supervision` · [brief](../../briefs/BRIEF-CAR-83-supervision-visitas.md)
- **Estado:** En PR (PR 1 de 3)
- **Migración:** `20270101100000_pauta_visitas` (pendiente de aplicar con snapshot de Neon, dev y main)
- **Apilado sobre / espera:** ninguno

## Qué entra (PR 1: visitas en el servidor, sin pantalla)

- Tabla `pauta.visitas` (RLS + FORCE + `tenant_isolation`; una visita en curso por supervisor con índice único parcial; CHECK de estado, geocerca y cierre).
- Dominio `clasificarLlegada` y `listaVisita` en `@opai/domain` (con pruebas).
- Capacidades con MCP: `pauta.visitas.iniciar` (vista previa, hora del servidor, GPS que nunca bloquea), `.cerrar` (solo quien la inició; cerrada no se edita; evento `pauta.visita.cerrada`), `.listar` (contrato de listas) y `.obtener`, ambas con lectura auditada por IDs y alcance por instalaciones.
- Ajuste `pauta.visita_lista` (lista de revisión por empresa; vacía = lista genérica).
- Prueba `pauta-visitas-db.test.ts`: vista previa, una en curso, quién cierra, cerrada no se edita, alcance del supervisor y otra empresa.

## Qué queda pendiente

- PR 2: pantalla de la visita en el portal del supervisor e historial en la ficha de la instalación (después de #730, diseño nuevo).
- PR 3: fotos y firma del guardia por `core.documentos`, y «Hoy» con alertas (puestos sin cubrir, rondas atrasadas, faltas).
- Reemplazo desde el celular con turno extra por aprobar (B8): espera CAR-96 (CAR-458).

## Qué se decidió (reversible, la sesión)

- Las visitas viven en el módulo Pauta (Operaciones) y usan `pauta:read` / `pauta:write`, sin permiso nuevo.
- El GPS no bloquea (como rondas, ADR-023): se guarda distancia y estado de la llegada.
- La lista de revisión es un ajuste por empresa con una lista genérica de respaldo.
