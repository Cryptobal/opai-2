# BRIEF CAR-120 · Agente interno: historial, retención y lanzadores (PR 5c)

## 1. Objetivo
Cerrar los pendientes de seguridad y datos del PR 5b y dar al agente su pantalla de historial: guardado sin pisarse entre pestañas, idempotente ante reintento, barrido global de lo vencido, contexto de ficha revalidado en el servidor, ruta `/agente/historial` y los accesos que el diseño aprobado (30-oct-2026) muestra. Sigue al PR 5b (#264).

## 2. Estado actual (verificado)
`guardarTurno` lee el arreglo de mensajes y lo reescribe (dos pestañas pueden pisarse); un reintento duplica el turno; solo purga las conversaciones propias al guardar (no hay barrido global); `agente.turno.preparar` acepta `contexto` y lo guarda tal cual, sin comprobar que la persona lo vea. El panel lista, abre y borra; no renombra ni archiva. No hay ruta de historial, `?agente=1` ni acceso desde ⌘K o las fichas. `agente.conversaciones.*` y `agente.historial.list` existen con paridad MCP.

## 3. Alcance (5c)
1. Guardado atómico: columna `version` y escritura condicional con reintento (sin SQL crudo); idempotencia por `turnoId` (el cliente lo usa también como `idempotencyKey`).
2. Trabajo diario `agente.conversaciones.vencidas` (por empresa, con RLS) que borra lo vencido; retención configurable por empresa (`retencionConversacionesDias`, defecto 90, 7–365) en Configuración › Agentes › Agente interno.
3. Contexto de ficha: el servidor ejecuta la lectura de la ficha como la persona (permiso y alcance) y descarta o rechaza el contexto que no ve.
4. `/agente/historial` (ListScreen, pestañas Conversaciones y Acciones, buscar, abrir, renombrar, archivar/desarchivar, borrar; estados cargando, vacío, error y sin permiso).
5. Panel: editar título y archivar; chip de contexto.
6. Accesos: `?agente=1` (y `&conversacion=<id>`), fila «Preguntar a OPAI» en ⌘K, «Preguntar a OPAI sobre esta …» en el menú ⋯ de las fichas de cuenta, instalación, negocio y persona.
**Fuera:** adjuntos (R24–R31, el diseño los muestra pero requieren `core.documentos`), sugerencias de inicio y nombre visible por vertical, columnas Entidad y Resultado de «Acciones» (`agente.historial.list` solo devuelve capacidad y fecha), búsqueda en el servidor (se filtra en el cliente sobre las últimas 50).

## 4. Arquitectura
`modules/agente/conversaciones-guardado.ts` (CAS, retención), `conversaciones-contexto.ts` (revalidación), `conversaciones-barrido.ts` (trabajo, exportado como `trabajosAgente` y registrado en `apps/web/lib/registro.ts`). UI en `apps/web/app/_components/agente/` y `apps/web/app/(erp)/agente/historial/`. Los lanzadores comparten un evento de ventana `opai:agente` que escucha `use-agente-shell`.

## 5. Archivos
Ver el diff: schema `agentes.prisma`, migración `20261105140000_agente_historial`, `modules/agente/*`, `apps/web/lib/registro.ts`, componentes del panel, la ruta del historial, `paleta.tsx` y `acciones-entidad.tsx`.

## 6. Modelo de datos y migraciones (aditivas)
`core.agente_conversaciones`: `version INTEGER NOT NULL DEFAULT 0` e índice `(tenant_id, ultima_actividad)` para el barrido. `SET LOCAL lock_timeout = '5s'`; sin backfill. La tabla ya tiene RLS `tenant_isolation` + FORCE (5b). Etiqueta `migracion-pendiente`.

## 7. Capacidades
Sin capacidades nuevas ni cambios en la lista MCP. `agente.turno.preparar` suma `turnoId` (opcional; es `soloPersonas`, no se publica en MCP). El trabajo `agente.conversaciones.vencidas` no es capacidad (lo encola el programador por empresa).

## 8. Interfaz y responsive
Historial: cabecera con título y pestañas, buscador, tabla en md+ y tarjetas en teléfono (ListScreen), acciones por fila en un menú ⋯ (Abrir, Renombrar, Archivar, Borrar con confirmación). Panel: icono de lápiz y de archivo junto al título del hilo abierto. Probado a 375, 1024 y 1280 px.

## 9. Seguridad y tenant
Todo por empresa (RLS) y por persona (`user_id`). El barrido corre con el `ctx` de cada empresa (nunca `dbAdmin`). El contexto nunca se confía al cliente: `core.cuentas.get`, `core.instalaciones.get`, `comercial.negocios.get` o `core.personas.get` se ejecutan con la identidad delegada de la persona; si fallan, no se guarda ni se usa el contexto (la ficha ajena responde «no existe»). Auditoría: la lectura queda registrada como cualquier lectura del agente.

## 10. Casos límite
Dos pestañas guardan a la vez: la segunda reintenta sobre la versión nueva (hasta 4 veces; luego `CONFLICT`). Reintento con el mismo `turnoId`: no duplica. Conversación archivada: no se retoma. Retención menor: lo ya vencido se borra en el siguiente barrido o guardado. Sin módulo o permiso: la ruta muestra «Sin permisos».

## 11. Plan por bloques
1) Brief. 2) Migración + guardado atómico/idempotente + retención configurable. 3) Contexto revalidado + barrido. 4) Historial (ruta, renombrar, archivar). 5) Lanzadores. 6) ESTADO y decisiones.

## 12. Tests
Unitarios: CAS con conflicto y reintento, idempotencia por `turnoId`, retención configurable, barrido, contexto válido/ajeno/servicio. Cliente: etiquetas y filtro del historial. `test:db` en CI valida la columna y el barrido por empresa.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test`, `pnpm build`, `pnpm presupuesto`; revisión independiente.

## 14. Criterios de aceptación
Dos guardados simultáneos conservan ambos turnos; un reintento no duplica; el barrido borra lo vencido solo en su empresa; un contexto ajeno no se acepta; `/agente/historial` lista, busca, abre, renombra, archiva y borra; `?agente=1`, ⌘K y el menú de ficha abren el panel; CI en verde.

## 15. Riesgos y rollback
Riesgo: el reintento por versión podría agotarse bajo mucha concurrencia (error `CONFLICT` legible). La revalidación del contexto agrega una lectura auditada por turno con contexto. Rollback: revertir el PR; la columna `version` queda sin uso (aditiva).

## 16. Reporte de ejecución
Ver la descripción del PR.
