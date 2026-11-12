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
| N-1 | **No hay eventos salientes para la empresa.** Los eventos de dominio existen (outbox, consumidores internos), pero un cliente no puede suscribir una dirección propia ni ver entregas. Solo hay webhooks entrantes (Resend, Slack, Web4Leads). | `packages/capabilities/src/eventos/`; sin tablas de suscripción en `prisma/schema/`; `apps/web/app/api/webhooks/` | Alta | Ajustar: destinos de eventos por empresa, firma, reintentos y registro de entregas, sobre el outbox actual |
| N-2 | **Las listas paginan de dos formas.** De 112 capacidades `*.list`, hay archivos con cursor (37) y otros con página, `offset` o `skip` (13). Un cliente de la API no puede recorrer todas igual. | `grep` de `cursor` y de `pagina:`, `offset:`, `skip:` en `packages/capabilities/src` y `modules` | Alta | Ajustar: un solo contrato de lista (`items`, `siguienteCursor`, tope) y una prueba de registro que lo exija |
| N-3 | **Errores sin parámetro ni referencia en todos los casos.** El error trae `code` y `message`; `issues` y `detalles` no tienen forma fija; la referencia solo aparece en `INTERNAL`. `APPROVAL_REQUIRED` responde 202 con `ok: false`. | `http.ts`, `types.ts`, `execute-log.ts` | Media | Ajustar: identificador de solicitud en toda respuesta y `param` en errores de validación |
| N-4 | **Sin política de versión ni referencia publicada.** Existe `/api/v1`; no se encontró una regla escrita de qué cambio es incompatible ni una referencia generada desde los esquemas. La idempotencia va en el cuerpo, no en cabecera. | `http.ts`; búsqueda de OpenAPI sin resultados en `apps/web` y `packages/capabilities` | Media | Ajustar: política en `docs/2.0/`, referencia generada desde Zod, aceptar `Idempotency-Key` |
| N-5 | **No hay modo de prueba por empresa.** Las pruebas usan empresas aparte (`gard-staging`, `qa-e2e`); una empresa real no tiene un espacio de prueba propio con sus mismas reglas. | ADR-051; `CONTEXTO-agentes.md` | Media | Decisión de producto (ver README) |
| N-6 | **Exportar o cerrar una empresa no es función del producto.** Existe el permiso `tenantDelete` y la exportación de datos de una persona (ARCO), pero no se encontró una capacidad que exporte o cierre la empresa completa. | `permisos-patrones.ts`; `packages/capabilities/src/core/tenant.ts` | Media | Ajustar antes del primer cliente externo |
| N-7 | **Quitar a un miembro borra la membresía en duro.** Las llaves dejan de autenticar porque exigen membresía activa (bien). No se confirmó que las sesiones abiertas y las apps OAuth de esa persona en esa empresa se corten en el mismo acto. | `core.users.remove` en `users.ts`; `apps/web/lib/api-key.ts` | Media, por verificar | Verificar con una prueba; si falta, revocar en la misma transacción |

## En qué se aparta a propósito

- **La API es por acción, no por recurso.** Stripe expone recursos (`/v1/invoices`); OPAI expone capacidades (`/api/v1/finanzas/ventas/emitir`). Es deliberado: la misma capacidad sirve a la pantalla, a la API y al MCP (ADR-034, ADR-055). Se mantiene. La condición es que los nombres sigan una sola convención de verbos (hoy conviven `list` y `listar`, `get` y `obtener`): conviene fijarla en `REGLAS-codigo.md`.

## Qué se mantiene tal cual

Aislamiento por RLS, capacidad única, idempotencia, vista previa, aprobaciones, presupuesto de agentes, auditoría, límite de solicitudes y la instantánea del MCP.
