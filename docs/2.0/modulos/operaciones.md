# Operaciones — Especificación funcional

**Estado:** **borrador**, pendiente de aprobación de Carlos (ADR-047). Puestos y guardias (Operaciones I): reglas definidas por Carlos el 25-oct-2026 (Page «Puestos y guardias OPAI 2.0: propuesta»); mockup pendiente de aprobación. Transiciones (§6), permisos (§7) y criterios de aceptación (§13) se completan con el diseño aprobado; el resto del módulo (pauta, Operaciones II) también está en borrador. · **Fase:** 3, con Operaciones I adelantada para después del cierre del Núcleo (`PLAN-desarrollo.md`) · **Insumos:** Page «Puestos y guardias OPAI 2.0: propuesta» con las reglas definidas por Carlos el 25-oct (fuera del repo), `extraccion/operaciones.md` (esqueleto), `extraccion/maestros.md` §5, ADR-022, ADR-036 (actualización del 25-oct), ADR-048 · **Autor:** Claude · **Tarea:** CAR-10

> Lenguaje de negocio, sin código (ADR-047). Este archivo resume las reglas que Carlos definió en su Page; si difieren, manda la Page y se corrige aquí. El diseño y el brief citan las reglas por número (R1, R2…). Lo que todavía no está cerrado va en §14.

## 1. Objetivo

Que cada empresa sepa, para cada instalación, **qué posiciones debe cubrir, quién las cubre y cuáles están sin cubrir y por qué**, sin planillas paralelas. Métricas: porcentaje de puestos en PPC por instalación y día; tiempo desde que un puesto queda en PPC hasta que se cubre.

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| Puesto | **Una posición cubierta** en una instalación (R1) | Instalación, cargo, patrón, horario, función, asignaciones | Núcleo (`core.puestos`, ADR-036) |
| Patrón | Ciclo de días de trabajo y descanso (4x4, 7x7, 14x14, 5x2, 2x5, 3x4…) | Puestos | Catálogo por tenant (R2) |
| Función | Qué hace el puesto (portería, ronda, CCTV…) | Puestos | Catálogo por tenant y vertical (R5) |
| Asignación | Persona que cubre el puesto en un periodo (titular o relevo) | Puesto, persona, vínculo laboral | Módulo Operaciones |
| PPC (puesto por cubrir) | Estado del puesto sin cubrir, siempre con motivo (R6) | Puesto, asignación | Módulo Operaciones |
| Anexo de contrato | Borrador generado por un cambio laboral, que aprueba RRHH | Vínculo laboral, documento | Núcleo (ADR-048, punto 5) |

## 3. Pantallas y pestañas

Según el mockup [Puestos y guardias v1](https://claude.ai/design/p/4cb4b749-4284-48b5-8e9b-4209f4c86715) (con CAR-8 corregido), **pendiente de aprobación de Carlos** y de ajustarse al DS V2. El detalle de pantallas, rutas y patrones se fija con el diseño aprobado; sin export en el repo todavía.

## 4. Campos y validaciones

Del puesto (el modelo de datos exacto se define en el Brief 11):

| Campo | Obligatorio | Regla |
|---|---|---|
| Instalación | Sí | — |
| Cargo | Sí | Catálogo del núcleo; no define sueldo (ADR-036) |
| Función | Sí | Catálogo del tenant y su vertical (R5) |
| Rol (días) | Sí | Patrón del catálogo del tenant (R2, R3) |
| Horario | Sí | Uno o más tramos, de día o de noche, como intervalos `[inicio, fin)` (R3) |
| Horas semanales | Sí | Dato aparte del rol y del horario (R3) |
| Colación | Según el puesto | Va en el puesto (R4) |
| Sueldo propio del puesto | No | Capa «puesto» de ADR-036; sin ella rige la capa de instalación |

## 5. Reglas de negocio

**Puestos y guardias (Operaciones I) — reglas definidas por Carlos el 25-oct-2026**

- **R1.** 1 puesto = 1 posición cubierta. En los patrones corridos, el titular y el relevo cubren el mismo puesto, uno a la vez. Tres 5x2 son tres puestos.
- **R2.** Catálogo de patrones por tenant, con 4x4, 7x7, 14x14, 5x2, 2x5 y 3x4 de fábrica.
- **R3.** Rol (días), horario (tramos, de día y de noche) y horas semanales van por separado.
- **R4.** La colación va en el puesto.
- **R5.** Las funciones son por tenant y vertical.
- **R6.** Todo lo que no está cubierto es PPC con motivo: sin asignar, licencia, permiso, falta o finiquito.
- **R7.** Al trasladar a una persona, el puesto de origen queda en PPC «Sin asignar».
- **R8.** El anexo de contrato lo aprueba RRHH (el rol aprobador es configurable). Un agente no lo aprueba.
- **R9.** El supervisor es un puesto más.
- **R10.** Los puestos no se crean al ganar un negocio. Se crean desde la instalación o con un botón opcional, con vista previa, en la cotización aceptada, solo para las líneas de tipo puesto. El botón crea un puesto por posición, en PPC, y no duplica los ya creados (ADR-040, punto 3, actualización del 25-oct).

**Reglas ya decididas en ADR que este módulo aplica**

- **R11.** Un cambio de rol, de capa de sueldo, de monto o de instalación de una persona genera el borrador del anexo de contrato (ADR-036 y ADR-048, punto 5).
- **R12.** El supervisor ve y opera solo las instalaciones a su cargo; el filtro va en la consulta (ADR-022).

## 6. Estados y transiciones

Estado de cobertura del puesto: **cubierto** ↔ **PPC (con motivo)**. El detalle de transiciones, quién las ejecuta y su reversibilidad se fija con el diseño aprobado y el Brief 11.

## 7. Permisos por rol y portal

Pendiente del diseño aprobado. Fijo: aprobar el anexo de contrato es de RRHH (rol configurable) y nunca de un agente (R8); el supervisor opera con alcance de sus instalaciones (R12).

## 8. Eventos y notificaciones

Pendiente. Silencio por defecto (ADR-020).

## 9. Herramientas MCP

Toda pantalla tendrá su capacidad (paridad, ADR-004). Fijo por ADR-048 §7: generar, aprobar y rechazar el anexo son capacidades con vista previa; la aprobación pide `APPROVAL_REQUIRED` a los agentes y, por R8, un agente no la completa.

## 10. Integraciones

Pendiente (geolocalización por el servicio del núcleo si se usa; ADR-027).

## 11. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| Puesto con `requiredGuards` (dotación) | 1 puesto = 1 posición (R1) | Cada posición tiene su cobertura y su PPC |
| Patrón de turno como entidad de CPQ (`CpqRol`) | Catálogo de patrones del tenant (R2) | Un solo catálogo para CPQ y Operaciones |
| Puestos creados con «Enviar dotación a la instalación» o a mano | Desde la instalación o botón opcional con vista previa (R10) | Sin duplicados y con revisión antes de crear |

Detalle de 1.0 en `extraccion/operaciones.md` (esqueleto; partes sin verificar).

## 12. Casos borde

- Traslado de una persona: el origen queda en PPC «Sin asignar» (R7).
- Botón de la cotización aceptada pulsado dos veces: no duplica (R10).

## 13. Criterios de aceptación

Se escriben con el diseño aprobado, antes del Brief 11.

## 14. Preguntas abiertas

1. ¿La sincronización 2.0 → 1.0 replica en 1.0 los puestos creados en 2.0 mientras Operaciones siga en 1.0? (Ver `modulos/comercial.md`, pregunta 8, actualización del 25-oct.) Sin recomendación todavía: depende de si Gard opera la pauta en 1.0 durante la convivencia.

### Sin la fuente Asistencia (ADR-048)

Sin Asistencia, la pauta diaria muestra «confirmar cobertura», un registro operativo que **no es la marca legal** para la DT. La pestaña «Asistencia de hoy» aparece solo con Asistencia activa.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 25-oct-2026 | Primera versión (borrador) con las reglas de Puestos y guardias definidas por Carlos | — (pendiente de aprobación) |
