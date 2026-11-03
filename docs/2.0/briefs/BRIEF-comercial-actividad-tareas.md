# BRIEF · Comercial · Actividad y tareas (CAR-162)

Bloque 1 del cierre de Comercial: el vendedor registra notas, llamadas, reuniones y tareas desde la ficha y ve todo en una línea de tiempo; "Mis tareas" muestra lo que le toca hoy. Referencia de tarea: CAR-162 (no se crea otra). Diseño: export CRM v3 cierre (`docs/2.0/diseño/export-crm-v3-cierre/`, rama `docs/car-162-export-cpq-v4`).

## 1. Objetivo

El backend `core.actividades.*` existía sin pantalla (bloqueo n.º 1 de la auditoría): el vendedor no podía registrar nada. Este bloque lo conecta: compositor, línea de tiempo mixta, tareas abiertas por ficha, Mis tareas (página y panel en Inicio) y aviso de tareas vencidas.

## 2. Estado actual (verificado)

- Capacidades `core.actividades.{create,update,completar,cancelar,delete,timeline,tareas}` con alcance ADR-022 (`filtrarVisibles`), permisos `core:actividades.read|manage|admin`, dryRun e idempotencia.
- La pestaña Actividad del negocio solo mostraba el historial de etapas; cuenta e instalación, la auditoría (`core.actividad.list`); el contacto no tiene pestañas.
- No existía pantalla de tareas ni aviso de vencidas. `core.actividades.tareas` solo filtraba por responsable.

## 3. Alcance

Dentro: compositor (nota, llamada con resultado, reunión con asistentes y acuerdos, tarea con responsables, prioridad y vencimiento); línea de tiempo mixta con filtros por tipo en negocio, cuenta e instalación; "Tareas abiertas" por ficha; Mis tareas (`/tareas`, Yo / Mi equipo) y panel en Inicio; nueva tarea desde Mis tareas; aviso diario de tareas vencidas (evento comunicable, silencio por defecto); TareaFila y CompositorActividad en el DS con estados en `/ds`.
Fuera (segundo PR): ChipsEtiquetas y filtro por etiqueta en listas; archivar/restaurar contacto; tarjetas "Próxima tarea" y "Último contacto real" del Resumen; sección de actividad en la ficha de contacto (no tiene pestañas, requiere su diseño).

## 4. Arquitectura

Todo por capacidades. Presentación en `apps/web/app/_components/actividad/` (servidor: `PanelActividad`, `GruposTareas`, `TareasFicha`; cliente: `Compositor`, `TareaConAcciones`, `NuevaTarea`). Reglas puras (agrupar por vencimiento, texto del plazo, posponer, zona America/Santiago) en `packages/domain/src/actividades-tareas.ts`. El aviso es un `defineTrabajo` diario que encola el evento `core.actividad.tarea_vencida`; un consumidor opcional crea la campana a los responsables si el ajuste `actividades_aviso_responsables` está activo.

## 5. Archivos

`packages/domain` (actividades-tareas, comunicaciones/actividades) · `packages/db` (crm.prisma, migración) · `packages/capabilities/src/core/crm/{actividades-nombres,actividades-vencidas,…}` y `core/config/nucleo-actividades.ts` · `packages/ds/src/components/{tarea-fila,compositor-actividad}.tsx` · `apps/web/app/_components/actividad/*` · `(erp)/tareas` · pestañas Actividad de negocio, cuenta e instalación · Inicio · manifest de Comercial (entrada "Mis tareas").

## 6. Modelo de datos y migraciones (aditivas)

`20261103200000_core_actividades_aviso_vencida`: `core.actividades.aviso_vencida_en timestamptz`, `resultado text` (contestó / no contestó / volver a llamar) e índice parcial de tareas por avisar. `lock_timeout` corto, `IF NOT EXISTS`, sin tablas nuevas (la RLS de `actividades` ya existe). Reversión documentada en el SQL. No se aplica: la aplica el operador con respaldo.

## 7. Capacidades

Nuevas: ninguna. Ampliadas: `core.actividades.create` y `update` (resultado de llamada; mover el vencimiento reabre el aviso), `core.actividades.timeline` y `tareas` (nombres de autor, responsables y fichas; `tareas` con `equipo` y `entidad`). Trabajo `core.actividades.tareas_vencidas` (no es capacidad pública). La lista de herramientas MCP no cambia de nombres; cambia el esquema.

## 8. Interfaz y responsive

Compositor en línea desde md; en teléfono, botón que abre una hoja de pantalla completa. Filtros como Segmentado con desplazamiento. Filas de tarea con casilla y menú de 44 px. Estados: cargando, vacío con acción ("Registra la primera nota o tarea"), error y sin permiso (solo lectura sin `core:actividades.manage`). Verificar 375, 1024 y 1280.

## 9. Seguridad y tenant

Tenant desde la sesión. Alcance en la consulta (ADR-022); las fichas ligadas se validan del mismo tenant y dentro del alcance del actor. Las tareas del equipo muestran solo lo visible. El consumidor notifica solo a responsables activos y solo con el ajuste activo. Sin datos personales en el evento.

## 10. Casos límite

Tarea sin fecha (grupo "Sin fecha"); todo el día; hoy ya vencida por hora; posponer una vencida parte de hoy; cambio de vencimiento reabre el aviso; responsable desactivado; reintento del job (marca condicional, idempotente); actividad ligada a una ficha fuera de alcance.

## 11. Plan por bloques (un commit por bloque)

1 dominio · 2 migración y esquema · 3 capacidades (nombres, equipo/entidad, resultado) · 4 aviso de vencidas · 5 DS (TareaFila, CompositorActividad) · 6 componentes web y pestañas · 7 Mis tareas e Inicio · 8 `/ds` y pruebas · 9 documentación.

## 12. Tests

Dominio (agrupación, texto, posponer). Capacidades con base: tareas por ficha y equipo, nombres, resultado, job de vencidas (marca y evento, idempotencia). Paridad e inventario MCP. e2e propio de `/tareas` y de la pestaña Actividad.

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build && pnpm presupuesto`; e2e solo de los specs propios.

## 14. Criterios de aceptación

1. Desde un negocio, cuenta o instalación se registra nota, llamada, reunión y tarea, y aparecen en la línea de tiempo con autor y fecha.
2. La línea mezcla lo registrado con los cambios de etapa o la auditoría y se filtra por tipo vía URL.
3. "Tareas abiertas" permite marcar hecha y posponer (mañana, 3 días, fecha).
4. `/tareas` agrupa vencidas, hoy, semana, más adelante y sin fecha; Yo / Mi equipo; "Nueva tarea".
5. Inicio muestra las vencidas y de hoy cuando existen.
6. El aviso de vencidas no se envía sin regla de Comunicaciones.
7. Sin `manage`, todo es de solo lectura.

## 15. Riesgos y rollback

Migración aditiva; revertir = soltar las dos columnas y el índice (comentado en el SQL). Riesgo: el consumidor de campana queda apagado por defecto. Rollback de UI: revertir el PR.

## 16. Reporte de ejecución

Ver la descripción del PR y `docs/2.0/ESTADO.md`.
