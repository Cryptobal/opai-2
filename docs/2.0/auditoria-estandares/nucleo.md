# Núcleo: multi-tenant, API, MCP e IA — auditoría contra Linear · Slack · Stripe

**Recomendación: ajustar.** La arquitectura sigue al referente en lo difícil. Faltan piezas de producto alrededor de la API.

## Qué hace hoy

**Organizaciones**
- Una identidad global y una membresía por empresa, con invitación, rol y portales: `packages/db/prisma/schema/tenancy.prisma`, `packages/capabilities/src/core/invitar.ts`, `users.ts`.
- Aislamiento por RLS con `FORCE` y política `tenant_isolation`; CI falla si falta (`packages/db/test/rls-nucleo*.test.ts`).
- Módulos por empresa con estado (`TenantModule`), empresa con estado `trial`, `activo` o `suspendido` (`schema/core.prisma`).
- Clientes y trabajadores entran como miembros acotados por portal (`Membership.portales`, `schema/portal-cliente.prisma`).

**API y MCP**
- Una capacidad por acción (746 `defineCapability`), expuesta igual en pantalla, `/api/v1/<modulo>/<entidad>/<verbo>` y MCP: `packages/capabilities/src/http.ts`, `mcp.ts`.
- Idempotencia de 24 horas con huella de la solicitud; la misma clave con otros datos se rechaza: `packages/capabilities/src/idempotencia.ts`.
- Errores con código (`NOT_FOUND`, `INVALID_INPUT`, `FORBIDDEN`, `CONFLICT`, `UNPROCESSABLE`, `APPROVAL_REQUIRED`, `BUDGET_EXCEEDED`…): `types.ts`, `errores.ts`. Referencia de correlación solo en errores inesperados (`execute-log.ts`).
- Límite de solicitudes centralizado con `Retry-After` (`apps/web/lib/rate-limit.ts`).
- Instantánea de herramientas MCP que falla ante un cambio no declarado (`test/__snapshots__/herramientas-mcp.txt`).
- Entrada con OAuth para apps como Claude (ADR-098).

**IA**
- Vista previa en toda escritura, aprobación humana de lo irreversible y cola de aprobaciones (`core.aprobaciones.list`, `get`, `aprobar`, `rechazar`).
- Identidad propia del agente, presupuesto por llave y autonomía por capacidad (`ApiKey`, `ApiKeyAutonomia`, `GastoAgenteMes`).
- Paridad pantalla ↔ MCP con gate en `pnpm test`.

## Qué hace el referente

Stripe: recursos predecibles, idempotencia, errores tipados con parámetro e identificador de solicitud, versión con fecha, cursor en todas las listas, webhooks firmados con registro de entregas, modo de prueba y referencia pública. Linear y Slack: una cuenta, muchas organizaciones, invitados acotados, exportar y cerrar la organización.

## Brechas

| # | Brecha | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| N-1 | **No hay eventos salientes para la empresa.** Los eventos de dominio existen (outbox, consumidores internos), pero un cliente no puede suscribir una dirección propia ni ver entregas. Las entregas que se registran son a consumidores internos (`EventoEntrega`). Solo hay entradas desde terceros (Resend, Slack, Web4Leads). | `packages/capabilities/src/eventos/`; `schema/servicios.prisma`; sin tablas de destinos en `prisma/schema/` | Alta | Ajustar: destinos de eventos por empresa, firma, reintentos y registro de entregas, sobre el outbox actual |
| N-2 | **Las listas no comparten un contrato.** Hay 112 capacidades de lista. Unas paginan con cursor y devuelven `items` y `siguiente` (`core.audit.list`, `comercial.negocios.list`, tickets). Otras devuelven todo sin paginar (`core.grupos.list`, `core.apikeys.list`), cortan con una marca de truncado (`core.turnos_esperados.listar`) o fallan sobre 1.000 filas (`asistencia.dias.listar`). La auditoría de plataforma usa otra forma (`antesDeSeq`, `eventos`). No se encontró ninguna lista con número de página u `offset`. | `packages/capabilities/src/core/consultas.ts`, `core/grupos/consultas.ts`, `core/turnos/capacidades.ts`, `modules/asistencia/capabilities/dias-capacidades.ts`, `core/plataforma/auditoria-lista.ts` | Alta | Ajustar: un solo contrato de lista (`items`, `siguiente`, tope) y una prueba de registro que lo exija, con excepciones justificadas para catálogos chicos |
| N-3 | **Errores sin parámetro ni referencia en todos los casos.** El error trae `code` y `message`; `issues` y `detalles` no tienen forma fija; la referencia solo aparece en `INTERNAL`. `APPROVAL_REQUIRED` responde 202 con `ok: false`. | `http.ts`, `types.ts`, `execute-log.ts` | Media | Ajustar: identificador de solicitud en toda respuesta y `param` en errores de validación |
| N-4 | **Sin política de versión ni referencia publicada.** Existe `/api/v1`; no se encontró una regla escrita de qué cambio es incompatible ni una referencia generada desde los esquemas. En `/api/v1` la idempotencia va en el cuerpo; el formulario público de solicitudes ya usa la cabecera `Idempotency-Key`. | `http.ts`; búsqueda de OpenAPI sin resultados en `apps/web` y `packages/capabilities` | Media | Ajustar: política en `docs/2.0/`, referencia generada desde Zod, aceptar `Idempotency-Key` |
| N-5 | **No hay modo de prueba por empresa.** Las pruebas usan empresas aparte (`gard-staging`, `qa-e2e`); una empresa real no tiene un espacio de prueba propio con sus mismas reglas. | ADR-051; `CONTEXTO-agentes.md` | Media | Decisión de producto (ver README) |
| N-6 | **Exportar o cerrar una empresa no es función del producto.** Existe el permiso `tenantDelete` y la exportación de datos de una persona (ARCO), pero no se encontró una capacidad que exporte o cierre la empresa completa. | `permisos-patrones.ts`; `packages/capabilities/src/core/tenant.ts` | Media | Ajustar antes del primer cliente externo |
| N-7 | **Quitar a un miembro borra la membresía en duro y no revoca sus accesos como filas.** No es un hueco funcional: las llaves, la sesión y las apps OAuth se validan en cada solicitud contra la membresía vigente y dejan de servir. Queda por comprobar si un acceso antiguo revive al reinvitar a la misma persona. | `core.users.remove` en `users.ts`; `apps/web/lib/api-key.ts`, `actor.ts`, `oauth-mcp.ts` | Baja, por verificar | Prueba de reinvitación; si revive, revocar al quitar |

## En qué se aparta a propósito

- **Avisos de Slack con su propia gestión (PR #569, abierto).** `core.slack_avisos` guarda el estado de gestión del aviso (abierto, tomado, cerrado) junto al envío. En el referente el aviso es independiente del canal. Comentado en el PR; revisar al integrar.
- **La API es por acción, no por recurso.** Stripe expone recursos (`/v1/invoices`); OPAI expone capacidades (`/api/v1/finanzas/ventas/emitir`). Es deliberado: la misma capacidad sirve a la pantalla, a la API y al MCP (ADR-034, ADR-055). Se mantiene. La condición es que los nombres sigan una sola convención de verbos (hoy conviven `list` y `listar`, `get` y `obtener`): conviene fijarla en `REGLAS-codigo.md`.

## Qué se mantiene tal cual

Aislamiento por RLS, capacidad única, idempotencia, vista previa, aprobaciones, presupuesto de agentes, auditoría, límite de solicitudes y la instantánea del MCP.
