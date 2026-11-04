# BRIEF CAR-120 · Agente interno: conversaciones guardadas (PR 5b)

## 1. Objetivo
Que cada conversación con el agente interno se guarde, privada de la persona (spec agente R19, decisión de Carlos del 29-oct-2026), y se pueda retomar o borrar desde el panel. Sigue al PR 5a (#261).

## 2. Estado actual (verificado)
`agente.turno.preparar` no guarda nada: el hilo vive en la pantalla. `agente.historial.list` solo lista acciones de la auditoría. No existe tabla de conversaciones (NÚCLEO-E2 decidió no guardarlas; la pregunta 1 de la spec lo revirtió).

## 3. Alcance (5b)
Tabla `core.agente_conversaciones`; capacidades `agente.conversaciones.list/.get/.renombrar/.archivar/.borrar`; `agente.turno.preparar` acepta `conversacionId` y `contexto` y devuelve `conversacionId`; el panel guarda cada turno, abre un historial (botón «Historial»), retoma una conversación y la borra con confirmación.
**Fuera (5c):** ruta `/agente/historial` con pestaña «Acciones», «Preguntar sobre esta ficha» (el servidor ya acepta `contexto`, pero la revalidación con el alcance, R9, y los botones de ficha van en 5c), fila en ⌘K, `?agente=1`, adjuntos (R24–R31), retención configurable por tenant (R20), edición de título en la UI y archivar en la UI (las capacidades ya existen).

## 4. Arquitectura
`modules/agente/conversaciones*.ts` (capacidades y guardado). El guardado corre dentro de `agente.turno.preparar`, de modo que el turno y su registro comparten la auditoría de la capacidad. UI: `use-historial.ts`, `historial-agente.tsx`, `hilo-agente.tsx`, `use-modelos.ts` en `apps/web/app/_components/agente/`.

## 5. Archivos
Ver el diff del PR: schema `agentes.prisma`, migración `20261105130000_agente_conversaciones`, `modules/agente/*`, componentes del panel, snapshot MCP e inventario de paridad.

## 6. Modelo de datos y migraciones (aditivas)
`core.agente_conversaciones` (id uuid7, tenant_id, user_id, titulo, contexto_tipo/id, mensajes jsonb, acciones_hechas, archivada_en, ultima_actividad, timestamps). RLS `tenant_isolation` + FORCE, `lock_timeout` 5 s. Sin backfill ni cambios en tablas existentes. Etiqueta `migracion-pendiente`.

## 7. Capacidades
- `agente.conversaciones.list` / `.get` (lectura, `auditarLectura` con los ids revelados).
- `.renombrar` / `.archivar` (escritura, `dryRun`) y `.borrar` (irreversible, `dryRun`; a un agente le exige aprobación humana).
Todas con permiso `agente:usar`, filtradas por `user_id` de la sesión; una key de servicio no ve las del responsable (ADR-051) y una key de tipo usuario lee solo las de su responsable. Con MCP: no son `soloPersonas`.

## 8. Interfaz y responsive
Dentro del panel (teléfono completo, iPad superpuesto, escritorio acoplado): botón «Historial» (alterna lista/hilo, bloqueado con un plan pendiente), lista con título, fecha y n.º de mensajes, «Abrir» y «Borrar» (dos pasos). Estados: cargando (Skeleton), vacío, error en lenguaje de usuario.

## 9. Seguridad y tenant
RLS por empresa; alcance por persona en cada consulta (ni owner ni admin las leen). Se guarda el texto mostrado y los nombres de las capacidades propuestas; nunca el token firmado ni las vistas previas. `mensaje` ya es campo sensible en la auditoría. 200 mensajes por conversación como máximo.

## 10. Casos límite
Id de otra persona o de otra empresa: «no existe». Servicio: sin guardado. Conversación archivada: no se retoma (se crea otra). Borrar la conversación abierta limpia el hilo. Sin conexión: nada se guarda.

## 11. Plan por bloques
1) Tabla + migración. 2) Capacidades + guardado en el turno. 3) Paridad (snapshot e inventario). 4) UI del historial. 5) Tests y documentación.

## 12. Tests
Unitarios del guardado (propias, ajenas, servicio, retención); prueba `test:db` de dos empresas con el mismo usuario; paridad MCP.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test`, `pnpm test:db` en CI, `build` y `presupuesto`.

## 14. Criterios de aceptación
Un turno crea o extiende la conversación; el historial las lista; abrir retoma el hilo; borrar la elimina; otra persona u otra empresa no la ve; CI en verde.

## 15. Riesgos y rollback
Riesgo de privacidad: se guarda contenido del usuario (Ley 21.719). Mitigación: privadas, borrables, retención de 90 días **aplicada al guardar** (borra las propias vencidas; no hay barrido global: las de quien deja de usar el agente quedan hasta 5c). Rollback: revertir el PR; la tabla queda sin uso y se puede borrar en otra migración.

## 16. Reporte de ejecución
Ver la descripción del PR.
