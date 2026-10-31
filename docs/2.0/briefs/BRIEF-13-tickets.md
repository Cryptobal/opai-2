# BRIEF DE IMPLEMENTACIÓN — 13 TICKETS (mesa de ayuda y solicitudes con aprobación)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `feat/tickets-pr1` (desde `main` actualizado) · **Fecha:** 30-oct-2026 · **Tarea:** CAR-84 (`Refs CAR-84` en el PR; no se cierra con un solo PR) · **Fase:** 3 (Ola 3) · **Estado:** PR 1 en construcción en esta rama.

**Encargo de Carlos:** 30-oct-2026 14:15 CLT, «construye Personas y Cargos y Tickets en paralelo», con límite de 60 minutos para el PR 1. **Especificación aprobada:** [`docs/2.0/modulos/tickets.md`](../modulos/tickets.md) (aprobada junto con este brief, mismo PR, ADR-047 — Tickets no tenía spec previa; `PLAN-diseno-modulos.md` §A ya lo señalaba como pendiente). **Diseño de referencia:** PR #157 (`docs/diseño/export-tickets/`, v1, revisado por el operador 30-oct 13:55 CLT; aún no en `main`). **Extracción de 1.0:** [`extraccion/rondas-y-tickets.md`](../extraccion/rondas-y-tickets.md) §2, ADR-025.

## 1. Hoja de alcance (aprobada por Carlos una vez, no se reabre)

| De 1.0 | Pasa a 2.0 | Por qué |
|---|---|---|
| Tipos de ticket configurables, con pasos de aprobación | **Sí**, simplificado a un paso (ADR-025) | 1.0 tenía varios pasos y se volvió lento; Carlos pidió simple |
| Estado + prioridad (p1–p4) + SLA | **Sí**, SLA opcional y apagado por defecto | Decisión de Carlos 30-oct 11:46 CLT |
| Orígenes automáticos (hallazgo de supervisión → ticket) | **No** | Causó ~1.000 notificaciones/día sin dueño; el hallazgo queda en la visita |
| CSAT | **No** (por ahora) | Fuera del alcance del PR 1/2; se revisa si se pide |
| Adjuntos propios del ticket | **No tal cual**: van por `core.documentos` (vínculo polimórfico) | Regla del núcleo (ADR-019): ningún módulo sube archivos por su cuenta |
| Vínculos a entidades (negocio, instalación) | **Sí**, pero en el PR 2 | El vínculo polimórfico necesita el patrón de `core.documentos`; no cabía en 60 min |
| **Mejora:** responsable obligatorio desde la creación | — | Regla dura nueva (ADR-025): nunca más un ticket sin dueño |
| **Mejora:** la resolución llega a quien lo pidió (portal + correo) | — | PR 2, con Comunicaciones del núcleo |

## 2. Plan PR 1 / PR 2

**PR 1 (esta rama, CAR-84):**
- Spec (`modulos/tickets.md`) y este brief.
- Schema `tickets` (migración única `20261030180000_tickets_schema`, aditiva, RLS FORCE, sin tocar el núcleo ni `maestros.prisma`): `TipoTicket`, `Ticket`, `TicketEvento`.
- Dominio puro (`modules/tickets/domain`): estados ADR-025, transiciones, prioridad.
- Permisos del módulo (`packages/domain/src/permisos.ts`): `tickets:tickets.ver`, `tickets:tickets.ver_todos`, `tickets:tickets.gestionar`, `tickets:tipos.manage`.
- Capacidades (`modules/tickets/capacidades`): `tickets.tipos.{listar,crear}`, `tickets.tickets.{listar,obtener,crear,comentar,cambiar_estado,reasignar,aprobar,rechazar}`. Todas con `dryRun`, auditoría y paridad MCP automática (sin excepciones).
- Pantallas ERP: Bandeja (`/tickets`, tabs Míos/Asignados/Todos) y Ficha (`/tickets/[id]`, con comentar, cambiar estado, reasignar y aprobar/rechazar con confirmación desde la propia ficha, decisión 4).
- Tests: dominio (transiciones), capacidades (permisos, alcance por fila, transiciones), aislamiento de tenant (genérico, `packages/db/test/rls-dos-empresas.test.ts` cubre las tablas nuevas sin cambios), e2e de Bandeja/Ficha.

**PR 2 (queda escrito, no se construye aquí):**
- Pantallas: Nuevo ticket (Sheet), Lista del supervisor (portal supervisor), Configuración → Módulos → Tickets → Tipos (`apps/web/app/(erp)/configuracion/_tickets/`, registrado en `secciones-modulos.ts`).
- Vínculo polimórfico a otras entidades y adjuntos vía `core.documentos`.
- Comunicaciones: aviso al solicitante por portal y correo al cambiar de estado (silencio por defecto, plantilla editable).
- Variante B (propuesta, a confirmar por Carlos): resumen diario por correo al dueño con sus pendientes (del ajuste v2 del diseño).
- Resolver la resolución de «responsable por rol» con el primer miembro activo (PR 1 la implementa simplificada, como primer miembro con ese rol por fecha de alta; PR 2 revisa si hace falta un criterio mejor, p. ej. menor carga).

## 3. Criterios de aceptación (PR 1)

1. **CA1 — RLS.** Las 3 tablas nuevas tienen `tenant_isolation` (ENABLE+FORCE) y pasan `rls-nucleo.test.ts`/`force-rls.test.ts`/`rls-dos-empresas.test.ts` sin tocarlos (introspección genérica). **Cumplido.**
2. **CA2 — Responsable obligatorio.** `tickets.tickets.crear` siempre fija `responsableId`; la columna es `NOT NULL`. **Cumplido.**
3. **CA3 — Transiciones ADR-025.** Solo abierto→en_curso→resuelto→cerrado (+ resuelto→en_curso) y abierto/en_curso→rechazado con motivo; el dominio y los tests lo verifican. **Cumplido.**
4. **CA4 — Alcance por fila.** Bandeja y Ficha filtran por solicitante/responsable salvo `tickets:tickets.ver_todos`; test negativo de que otro usuario sin ese permiso recibe `FORBIDDEN`. **Cumplido.**
5. **CA5 — Aprobación con confirmación.** La UI pide confirmación antes de aprobar y motivo antes de rechazar; la capacidad en sí no fuerza el diálogo (es responsabilidad de la UI, como en Firma). **Cumplido en la UI de la Ficha.**
6. **CA6 — Paridad MCP.** Las 10 capacidades generan herramienta y, las de escritura, su `preview_`; snapshot regenerado. **Cumplido.**
7. **CA7 — Pantallas mínimas.** Bandeja y Ficha con prioridad y aprobación desde la ficha, DS 2.0, mobile first. **Cumplido** (Nuevo ticket y Configuración de tipos, **parcial**: van en PR 2, sin pantalla propia en este PR).
8. **CA8 — e2e.** Bandeja y, si hay datos, ficha, a 375/1024/1280 (`apps/web/e2e/tickets.spec.ts`). **Cumplido parcial:** sin seed de tickets en `opai_e2e`, el spec cubre la bandeja vacía y la navegación del shell; no ejercita la ficha ni comentar/aprobar con datos reales (no hay fixture de tickets para e2e en este PR). El flujo completo crear→comentar→aprobar está cubierto por los tests de capacidades (`modules/tickets/capacidades/*.test.ts`), no por Playwright.

## 4. Decisiones no triviales tomadas en este PR (sin ADR previo)

- **Responsable por rol = primer miembro activo con ese rol** (por fecha de alta de la membresía). No hay todavía una noción de «carga» por persona en Tickets; se documenta como simplificación del PR 1, a revisar en PR 2 si genera concentración en una sola persona.
- **Permiso `tickets:tickets.ver_todos` separado de `tickets:tickets.ver`**: el diseño pide una pestaña «Todos (según permiso)» distinta de Míos/Asignados; se creó un permiso explícito en vez de inferirlo del rol, para que la UI y el MCP lo puedan comprobar igual.
- **`tickets:tickets.gestionar` lo tiene también `viewer`** (además de `*:*.read` que ya cubre `tickets:tickets.ver`): el diseño dice «cualquier persona con cuenta crea y ve sus tickets»; sin este agregado, el rol más bajo no podría crear ni comentar los suyos. El alcance por fila (solo sus propios tickets) lo sigue aplicando cada capacidad, no este permiso.
- **Vínculo polimórfico y adjuntos quedan fuera del PR 1**: no entraban en el límite de 60 minutos sin comprometer RLS/tests; van al PR 2 (ya anotado en §2).

## 5. Estado al cierre de este PR

Los 8 CA están cumplidos; CA7 y CA8 parciales por diseño (Nuevo ticket y Configuración de tipos van al PR 2; el e2e no tiene fixture de tickets para ejercitar la ficha). Gate completo en verde (`typecheck`, `lint`, `test` con el nuevo test negativo de alcance, `test:db`, `build`, `presupuesto`) y el e2e de `tickets.spec.ts` (375/1024/1280) contra el dev server del propio worktree. **Corrección de seguridad de esta misma sesión:** `tickets.tickets.cambiar_estado` y `.reasignar` devolvían `CONFLICT` (409) cuando el ticket existe pero no es visible para quien llama, y `NOT_FOUND` (404) cuando no existe; eso permitía distinguir por código de estado si un id de ticket existe aunque no sea propio. Ahora ambos casos devuelven `NOT_FOUND`, igual que `tickets.tickets.comentar` y `tickets.tickets.obtener`; se agregó un test negativo (`crear-lectura.test.ts`) que fija el comportamiento. Ver `PR-BODY.md` para el detalle de bloques, migración y riesgos.
