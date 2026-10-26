# CPQ — Especificación funcional

**Estado:** **borrador** (pendiente de aprobación de Carlos, ADR-047). Por ahora solo registra la regla de puestos y sueldos al ganar un negocio, que Carlos respondió el 25-oct-2026 23:10. El resto del módulo espera las respuestas de Carlos a las 8 preguntas de la Page de CPQ (propuesta pendiente de confirmar, fuera del repo). · **Fase:** 2 · **Insumos:** `extraccion/comercial-y-cpq.md`, ADR-040, ADR-042, ADR-048 (respuesta 3), ADR-036 · **Autor:** Claude · **Tarea:** CAR-10

> Lenguaje de negocio, sin código (ADR-047). Las secciones vacías se completan cuando Carlos responda las preguntas de la Page de CPQ.

## 1. Objetivo

Pendiente (preguntas de la Page de CPQ).

## 2. Entidades y relaciones

Pendiente. Ya decidido: la cotización cuelga siempre de un negocio de Comercial (ADR-040, punto 4); CPQ depende de Comercial (ADR-048, punto 1).

## 3 a 4. Pantallas, campos y validaciones

Pendiente.

## 5. Reglas de negocio

**Puestos y sueldos al ganar el negocio** — Decisión de Carlos, 25-oct-2026 23:10, chat con OPAI 2.0 (registrada por el bot OPAI 2.0); ADR-048, respuesta 3; ADR-040, nota del punto 3.

- **R1.** El disparador es **ganar el negocio**, no la cotización.
- **R2.** Al ganar, cada **línea de guardias** de la cotización vigente aceptada se **ofrece** para crear su puesto (un puesto por posición, en PPC; `modulos/operaciones.md`, R1 y R10) con el **sueldo bruto cotizado** en esa línea. **RRHH confirma** cada puesto; nada se crea sin esa confirmación.
- **R3.** Si la línea de guardias **no tiene sueldo**, el puesto se crea igual y toma el **sueldo de la instalación** (capa de instalación, ADR-036), que RRHH completa.
- **R4.** Una cotización **sin guardias** (por ejemplo, solo cámaras) **no crea puestos ni sueldos**.
- **R5.** Ofrecer de nuevo los puestos de un negocio ya ganado no duplica los que ya existen.

## 6 a 13. Estados, permisos, eventos, MCP, integraciones, mejoras, casos borde y criterios

Pendiente. Fijo por las reglas de arriba: la confirmación de RRHH es una acción humana; un agente puede preparar la propuesta con vista previa, pero no confirmar (ADR-048, punto 7).

## 14. Preguntas abiertas

1. Las 8 preguntas de la Page de CPQ (propuesta pendiente de confirmar, fuera del repo).

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 25-oct-2026 23:10 | Borrador con la regla de puestos y sueldos al ganar (respuesta 3 de Carlos a ADR-048) | — (pendiente de aprobación) |
