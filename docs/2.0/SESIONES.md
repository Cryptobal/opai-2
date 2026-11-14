# Sesiones dueñas por proyecto de Linear — OPAI 2.0

Tabla fija que asigna a cada proyecto de Linear de la iniciativa **OPAI 2.0 · Versión 1.0** una sola sesión de Claude dueña. Las sesiones viven en la sección «Opai 2 - Linear» del proyecto «OPAI 2.0» de claude.ai y no hace falta fijarlas. Pedido de Carlos del 14-nov-2026.

## Reglas

- **Una sola sesión dueña por proyecto.** Una sesión puede ser dueña de varios proyectos, pero un proyecto no tiene dos dueñas.
- **Todo proyecto queda en la tabla**, aunque hoy no tenga pendientes. Si no tiene pendientes y no tiene dueña, se anota «falta» y no se abre sesión hasta que haya trabajo.
- **Al abrir una sesión nueva**, quien la abre actualiza su fila: el estado pasa a «abierta» y se anota la fecha de apertura (hora de Chile).
- Ante un choque con el reparto de `OPERACION-agentes.md` A2.5.5, manda esta tabla para decidir qué sesión es dueña de qué proyecto de Linear.

## Tabla

Columna «Pendientes»: conteo al 14-nov-2026, hora de Chile. Cuenta los tickets que no están en Done, Canceled ni Duplicate. Es solo una referencia y no se mantiene al día; el número vigente está en Linear.

| Proyecto de Linear | Sesión dueña | Estado | Fecha de apertura | Pendientes (14-nov) |
|---|---|---|---|---:|
| 01 · Comercial | Comercial | abierta | antes del 14-nov-2026 | 4 |
| 02 · Facturar | Finanzas | abierta | antes del 14-nov-2026 | 6 |
| 03 · Personas | Personas y Documentos | abierta | antes del 14-nov-2026 | 4 |
| 04 · Asistencia | falta | sin sesión por ahora (sin pendientes) | — | 0 |
| 05 · Instalación | falta | sin sesión por ahora (sin pendientes) | — | 0 |
| 06 · Operaciones | Sesión 06 · Operaciones | a abrir | — | 5 |
| 07 · Inventario | Sesión 07 · Inventario | a abrir | — | 4 |
| 08 · Terreno | Sesión 08 · Terreno | a abrir | — | 3 |
| 09 · Acceso | Sesión 09 · Acceso | a abrir | — | 1 |
| 10 · Documentos | Personas y Documentos | abierta | antes del 14-nov-2026 | 3 |
| 11 · Portales | Sesión 11 · Portales | a abrir | — | 4 |
| 12 · Payroll | Payroll | abierta | antes del 14-nov-2026 | 3 |
| 13 · Cobrar | Sesión 13 · Cobrar | a abrir | — | 5 |
| 14 · Caja | Flujo de caja OPAI 2.0 | abierta | antes del 14-nov-2026 | 3 |
| 15 · Informes | Indicadores | abierta | antes del 14-nov-2026 | 3 |
| 16 · Rendiciones | Finanzas | cubierta (sin pendientes) | antes del 14-nov-2026 | 0 |
| 17 · Central | Sesión 17 · Central | a abrir | — | 1 |
| 18 · Apps | Sesión 18 · Apps | a abrir | — | 1 |
| 19 · Agente IA | Hilo: auditoría y reglas de diseño | abierta | antes del 14-nov-2026 | 4 |
| 20 · Núcleo | Núcleo | abierta | antes del 14-nov-2026 | 19 |
| 21 · Diseño y experiencia | Rediseño de Opai 2.0 | abierta | antes del 14-nov-2026 | 7 |
| 22 · Estándares y arquitectura | Código simple: estándares y simplificación | abierta | antes del 14-nov-2026 | 9 |

## Notas para no mezclar dueñas

- **Personas y Documentos** es dueña de 03 y 10. **Payroll** (12) tiene sesión propia, aunque `OPERACION-agentes.md` A2.5.5 agrupe Nómina con Personas y Documentos.
- **Finanzas** es dueña de 02 Facturar y también de 16 Rendiciones, que hoy no tiene pendientes. A2.5.5 también menciona a la Sesión Caja en ese frente.
- **14 Caja** queda en la sesión existente «Flujo de caja OPAI 2.0».
- **15 Informes** queda en «Indicadores». A2.5.5 no le nombra dueña y esa es la sesión abierta más cercana.
- **19 Agente IA** queda en «Hilo: auditoría y reglas de diseño», porque A2.5.5 asigna el agente interno a la Sesión Hilo.
- **21 Diseño y experiencia** queda en «Rediseño de Opai 2.0». Hilo y Diseño comparten el marco y el Design System (A2.5.5), pero el proyecto tiene una sola dueña.
- **04, 05, 06, 08 y 09** no tenían dueña con nombre fijo: A2.5.5 los agrupa en «la sesión que lleve Operaciones (hoy sin nombre fijo; por confirmar)». Tampoco son de la Sesión Desempeño, que solo lleva el módulo Desempeño; ese módulo no tiene proyecto en esta iniciativa. Se abren dueñas propias solo donde hay pendientes (06, 08 y 09). 04 y 05 quedan como «falta» hasta que tengan trabajo.
- **11 Portales** ya no depende de «Sesión Proyecto», el nombre provisorio de A2.5.5, y pasa a tener sesión propia.
