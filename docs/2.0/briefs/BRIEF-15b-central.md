# BRIEF 15b · Central de monitoreo

**Ticket padre:** CAR-85 · **Sesión:** Sesión Central · **Spec:** [`modulos/central.md`](../modulos/central.md) (las 15 preguntas decididas por Carlos el 29-oct-2026) · **Referentes:** `REFERENTES-saas.md` §7 (tablero del día con alertas por umbral, ServiceTitan) y §9 (la IA propone y una persona aprueba); ciclo de incidente de PagerDuty (disparada → en atención → resuelta).

## 1. Objetivo

Que la empresa sepa en todo momento qué pasa en cada instalación y turno y actúe antes que el cliente, con un agente de IA que opera la central y una persona siempre a cargo (spec §1).

## 2. Estado actual (verificado en `main` `0b679cf`, 14-nov-2026)

- No existe el módulo `central` ni el schema. No hay diseño exportado de la Central (`docs/2.0/design/` solo tiene el Design Prompt).
- El libro de novedades sigue en el schema `rondas` (CAR-77 en Backlog): la pestaña «Central» de la instalación espera ese ticket.
- El centro de Configuración no tiene el ámbito «Instalación» (pregunta 15): los umbrales por instalación esperan al núcleo.
- `core.bitacora` (encadenada, append-only) está disponible para todos los módulos por `ctx.bitacora.registrar`.

## 3. Alcance por PR (un ticket por PR)

| PR | Ticket | Qué entra |
|---|---|---|
| 1 | CAR-461 | Módulo base: alertas manuales, estados (§6), línea de tiempo inmutable y bitácora (R18), `central.estado`, MCP |
| 2 | CAR-468 | Cadenas de escalamiento e intentos de contacto, trabajo que escala al vencer (R7, R8) |
| 3 | CAR-469 | Reglas de vigilancia y señales de Rondas y Pauta, agrupación y anti-saturación (R1–R6, R4a) |
| 4 | CAR-470 | Humano a cargo: turno de central, tomar/devolver, pausar agente, propuestas y manual del agente (R10–R15) |
| 5 | CAR-471 | Mensajes a la central y avisos con acuse (R16, R17) |
| 6 | CAR-472 | Pantallas del ERP: cola en vivo y detalle de alerta (diseño nuevo, ADR-109) |
| 7 | CAR-473 | Portal del trabajador y terreno, y pestaña Central en la instalación (espera CAR-77) |

## 4. Arquitectura

- Módulo vendible `modules/central` (cobro por instalación activa en el catálogo), sin dependencias de otros módulos: Rondas, Pauta, Asistencia y Tickets son fuentes opcionales que publican eventos (ADR-029, ADR-048).
- Máquina de estados pura en `modules/central/domain`. Capacidades en `modules/central/capabilities`.
- Schema Postgres `central`. Cada hecho va a `central.alerta_eventos` (para la pantalla) y a `core.bitacora` (cadena de integridad), en la misma transacción.

## 5. PR 1 (CAR-461) en detalle

**Modelo de datos (migración aditiva `20270101100000_central_base`):**
- `central.alertas`: instalación, persona opcional, título, descripción, severidad (crítica, alta, media, baja), origen, estado, estado previo y plazo de una pospuesta, nota de cierre. Checks de severidad, estado y coherencia de la pospuesta.
- `central.alerta_eventos`: tipo, actor (persona, agente o sistema), nota, estado desde y hacia. Trigger que impide UPDATE, DELETE y TRUNCATE, y `REVOKE` para `opai_app`.
- RLS + FORCE + `tenant_isolation` en ambas.

**Capacidades (todas con herramienta MCP):** `central.estado`, `central.alertas.listar`, `.obtener`, `.abrir`, `.resolver`, `.falsa_alarma`, `.reabrir`, `.posponer`. Escrituras con vista previa e idempotencia del núcleo.

**Permisos:** `central:alertas.ver` (gerente, lector y supervisor) y `central:alertas.atender` (gerente y supervisor). Supervisor acotado a sus instalaciones en la consulta (R20).

**Reglas que aplica el PR 1:**
- Resolver se acepta desde cualquier estado activo (resolver implica hacerse cargo, como en PagerDuty). La spec §6 lo pedía desde «en atención»; sin cadenas (PR 2) ni «tomar» (PR 4) ninguna alerta llegaría a ese estado.
- Posponer: de 5 minutos a 24 horas. La alerta vuelve sola a su estado al vencer: se calcula al leer (estado efectivo) y se guarda en la siguiente escritura con el hecho «reactivada». El PR 2 agrega el trabajo que la reactiva a la hora exacta.
- El agente de central (key de servicio) abre alertas, pero no resuelve, ni marca falsa alarma, ni reabre, ni pospone: esas acciones solo las propone (R10). Hasta el PR 4 se le responde con un error de negocio claro.

**Fuera del PR 1:** entrada en el menú (llega con las pantallas, PR 6), cadenas, reglas, turno de central, mensajes y avisos.

## 6. Seguridad y tenant

- Instalación y persona se validan con `ctx.db` (RLS): una de otra empresa no existe. FK simples a `core.instalaciones` y `core.personas`.
- Actualización con condición sobre `estado` y `updated_at`: dos operadores que atienden la misma alerta no se pisan.
- Lecturas auditadas con IDs de alertas, personas e instalaciones, sin contenido.

## 7. Pruebas

- Dominio: transiciones, estado efectivo de la pospuesta y orden por severidad.
- Base (`central-alertas-db.test.ts`, dos empresas, rol sin BYPASSRLS): abrir con hecho en la bitácora, vista previa sin escritura, resolver y reabrir, posponer y volver, alcance del supervisor, aislamiento entre empresas, el agente no cierra, la línea de tiempo no se borra.

## 8. Criterios de aceptación del PR 1

1. Las 8 capacidades están en el registro, con su herramienta MCP y el gate de paridad en verde.
2. Una alerta de otra empresa o de otra instalación (supervisor) responde «no encontrado».
3. Cada cambio de estado deja un hecho en la línea de tiempo y en `core.bitacora`.
4. Migración aplicada en `dev` y `main` de Neon con snapshot previo.

## 9. Riesgos y reversión

Migración solo aditiva en un schema nuevo; se revierte con los `DROP` anotados al final del SQL. El módulo no tiene pantalla ni entrada de menú: activarlo no cambia nada visible.
