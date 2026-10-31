# Tickets — Especificación funcional

**Estado:** aprobada por Carlos el 30-oct-2026 (hoja de alcance, encargo CAR-84 14:15 CLT) · **Fase:** 3 (Ola 3) · **Insumos:** `extraccion/rondas-y-tickets.md` §2 (ADR-025), `alcance/design-prompt-tickets.md`, `alcance/design-prompt-tickets-ajuste-v2.md`, `alcance/PLAN-diseno-modulos.md` · **Autor:** Claude

> Se aprueba junto con el diseño `OPAI 2.0 Tickets v1` (PR #157, rama `docs/diseno-tickets`) y con `BRIEF-13-tickets.md` (hoja de alcance). El diseño no está aún en `main`; este PR la referencia por commit.

## 1. Objetivo

Tickets es la mesa de ayuda interna y el canal único de solicitudes con aprobación del tenant (ADR-025): sin chat libre, todo ticket tiene un responsable desde que se crea y la resolución vuelve a quien lo pidió. Reemplaza el chat/notificaciones sin dueño de 1.0 (§2 de la extracción) que generaba ~1.000 notificaciones/día sin resolver. Métrica de éxito: todo ticket abierto tiene dueño y los SLA (cuando están encendidos) no vencen sin aviso.

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| TipoTicket | Catálogo configurable del tenant: dueño por defecto, si exige aprobación, SLA opcional, roles que lo pueden usar | Ticket (1–N) | `tickets` |
| Ticket | Un ticket o una solicitud con aprobación | TipoTicket, `core.users` (solicitante, responsable), TicketEvento (1–N) | `tickets` |
| TicketEvento | Línea de tiempo: comentarios y cambios de estado/responsable/aprobación | Ticket | `tickets` |

El vínculo polimórfico a otras entidades (negocio, instalación) y los adjuntos vía `core.documentos` quedan para el PR 2 (ver BRIEF-13 §Plan).

## 3. Pantallas y pestañas

| Pantalla | Ruta | Portal | Patrón | Entrada en el menú |
|---|---|---|---|---|
| Bandeja de tickets | `/tickets` | erp | ListScreen | Operaciones → Tickets |
| Ficha del ticket (con aprobación desde ahí, decisión 4) | `/tickets/[id]` | erp | DetailScreen | — |
| Nuevo ticket | `/tickets` (Sheet) | erp | Sheet | — (PR 2) |
| Lista del supervisor | portal supervisor | supervisor | ListScreen | (PR 2) |
| Configuración → Módulos → Tickets → Tipos | `/configuracion/modulo/tickets` | erp | AjustesForm | Configuración → Módulos (PR 2) |

PR 1 entrega Bandeja y Ficha (con comentar, cambiar estado, reasignar, aprobar/rechazar); el resto, en PR 2 (ver `BRIEF-13-tickets.md`).

## 4. Campos y validaciones

**TipoTicket:** nombre (único por tenant), descripción, responsable por defecto (rol o usuario), requiere aprobación (bool) + rol aprobador, SLA horas (opcional, apagado por defecto — decisión de Carlos 30-oct 11:46 CLT), roles permitidos (vacío = todos).

**Ticket:** tipo, título (3–140), descripción (3–4000), prioridad (`p1`–`p4`, extracción 1.0 §2), estado (ADR-025), solicitante, responsable (obligatorio desde la creación), motivo de rechazo (si rechazado).

## 5. Reglas de negocio

- **R1.** Todo ticket tiene un responsable desde que se crea; no se guarda sin responsableId (constraint `NOT NULL`).
- **R2.** Sin tipos ocultos: quien crea ve y puede usar todos los tipos activos permitidos para su rol.
- **R3.** Los hallazgos de supervisión no crean tickets (quedan en la ficha de la instalación; no se toca en este PR).
- **R4.** El SLA es opcional y queda apagado salvo que el tipo lo encienda.
- **R5.** Aprobar pide confirmación en la UI (decisión de Carlos); rechazar exige un motivo (mín. 5 caracteres).
- **R6.** Un ticket cerrado o rechazado es terminal: no se reabre ni se reasigna; se crea un ticket nuevo.
- **R7.** El texto del solicitante (comentarios) se muestra como texto plano, nunca como botón o enlace.

## 6. Estados y transiciones

| Desde | Hacia | Quién | Condición | Reversible |
|---|---|---|---|---|
| abierto | en_curso | responsable / ver_todos | — | no (hecho nuevo) |
| abierto, en_curso | resuelto | responsable / ver_todos / aprobador (si es solicitud) | — | sí: resuelto → en_curso |
| resuelto | cerrado | responsable / ver_todos | — | no |
| abierto, en_curso | rechazado | aprobador del tipo / ver_todos (solo solicitudes con aprobación) | motivo obligatorio | no |

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Agente (scope) |
|---|---|---|---|---|---|---|
| Ver propios/asignados (`tickets:tickets.ver`) | sí | sí | sí | sí | sí | según key |
| Ver todos (`tickets:tickets.ver_todos`) | sí | sí | sí | sí | no | según key |
| Crear/comentar/transicionar (`tickets:tickets.gestionar`) | sí | sí | sí | sí | sí | según key, con aprobación humana en lo irreversible |
| Configurar tipos (`tickets:tipos.manage`) | sí | sí | no | no | no | `soloPersonas` si se expone |

Alcance de filas (ADR-022): la bandeja filtra por solicitante/responsable en la consulta; "Todos" exige `tickets:tickets.ver_todos`.

## 8. Eventos y notificaciones

| Evento | Cuándo | Quién se entera | Canal |
|---|---|---|---|
| `tickets.ticket.creado` | Al crear | — (silencio por defecto, ADR-020; Comunicaciones en PR 2) | — |
| `tickets.ticket.estado_cambiado` | Cambio de estado | solicitante (PR 2) | correo + portal |
| `tickets.ticket.aprobado` / `.rechazado` | Resolver una solicitud | solicitante (PR 2) | correo + portal |

## 9. Herramientas MCP

| Herramienta | Qué hace | Efecto | Vista previa | Aprobación humana |
|---|---|---|---|---|
| `tickets_tipos_listar` / `tickets_tipos_crear` | Catálogo de tipos | lectura / escritura | — / sí | no |
| `tickets_tickets_listar` / `tickets_tickets_obtener` | Bandeja y ficha | lectura | — | no |
| `tickets_tickets_crear` / `_comentar` | Crear y comentar | escritura | sí | no |
| `tickets_tickets_cambiar_estado` / `_reasignar` | Transicionar y reasignar | escritura | sí | no |
| `tickets_tickets_aprobar` / `_rechazar` | Resolver una solicitud | escritura | sí | no (la UI pide confirmación; el agente usa `preview_` primero) |

## 10. Integraciones

Ninguna en el PR 1. El PR 2 añade adjuntos vía `core.documentos` y avisos por Comunicaciones (correo).

## 11. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| Tickets sin dueño, ~1.000 notificaciones/día | Responsable obligatorio desde la creación | Carlos: el ruido sin dueño fue la falla principal |
| Hallazgos de supervisión crean tickets automáticos | No crean tickets; quedan en la visita | ADR-025 |
| SLA siempre encendido | SLA opcional, apagado por defecto | Decisión de Carlos 30-oct 11:46 CLT |

**No se porta:** CSAT, orígenes automáticos de ticket desde eventos de guardia, adjuntos propios del módulo (van por `core.documentos` en el PR 2).

## Historial

- 30-oct-2026: versión inicial, aprobada junto con BRIEF-13 PR 1.
