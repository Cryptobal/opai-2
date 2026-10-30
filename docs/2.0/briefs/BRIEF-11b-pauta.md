# BRIEF DE IMPLEMENTACIÓN — 11b PAUTA (Operaciones), PR 1 (Mensual)

**Repositorio:** `Cryptobal/opai-2` · **Rama:** `feat/pauta-pr1` (desde `main`) · **Fecha:** 30-oct-2026 · **Tarea:** CAR-81 (`Refs CAR-81`; la Diaria y los reemplazos son CAR-86, PR 2) · **Estado:** en construcción, autorizado por Carlos el 30-oct-2026 («Exactamente, tú a Claude.»). · **Especificación:** `docs/2.0/modulos/operaciones.md` (R1–R13) · **Diseño aprobado (v3, 30-oct 11:53 CLT):** `docs/2.0/diseño/export-pauta/` (P01–P10). · **Decisiones:** ADR-048 (punto 6, series y excepciones), ADR-022 (alcance), ADR-055 (agent-first), CAR-79 (calendario).

Este brief es el PR 2 del Brief 11 (el PR 1, Puestos, ya está en `main`).

## Hoja de alcance (una página)

**Qué pasa de 1.0 a 2.0.** La pauta mensual por instalación: grilla puestos × días con el patrón pintado, el titular de cada puesto y los puestos por cubrir (PPC) con su motivo.
**Aviso sobre la fuente de 1.0:** `extraccion/operaciones.md` sigue en esqueleto («sin verificar»: no dice si 1.0 guarda la pauta por fila persona-día o por series). El piso de 1.0 se toma de las reglas ya decididas por Carlos (R1–R13, ADR-048) y del diseño aprobado; la comparación fila a fila con el código de 1.0 queda para la pasada de paridad (`checklists/paridad.md`).

| Tema | 1.0 (piso) | 2.0 en este PR | Mejora que se suma |
|---|---|---|---|
| Qué se guarda | Sin verificar | **Series** (patrón + inicio de ciclo + titular, con vigencia) y **excepciones** por día. Nunca una fila por persona y día (R11) | La pauta se replica sola mes a mes por el ciclo, sin fecha límite (A1, A2) |
| Cambio de serie | Sin verificar | Cierra la serie vigente el día antes y abre otra desde hoy o después: **no modifica días pasados** | Aviso en la hoja «Serie del puesto» |
| Ausencia, licencia, vacaciones, permiso | Sin verificar | Excepción por día o rango (hasta 62 días) con motivo; el turno queda PPC con ese motivo. Se anula sin borrar | Registro retroactivo permitido (pendiente (b) del diseño) |
| PPC | Sin verificar | Todo lo no cubierto es PPC con motivo: sin titular, ausencia, licencia, vacaciones o permiso (R6) | Vista «Cobertura» con tramos seguidos por puesto y motivo |
| Feriados | Sin verificar | Del calendario del Núcleo (CAR-79): legales calculados, regionales de la instalación y propios del tenant | Se marcan; no cambian el patrón |
| Doblar turnos | Sin verificar | **Prohibido** (A9): un titular no puede tener turnos solapados o seguidos entre sus series; bloqueo explicado | Detección sobre una ventana de 56 días que cubre todas las fases de ciclo |
| Quién edita | Sin verificar | owner, admin, gerente: todo; supervisor: solo sus instalaciones (alcance en la consulta, ADR-022); viewer: solo lectura | — |
| Historial | Sin verificar | Quién, cuándo y qué (serie fijada, excepción creada o anulada), solo lectura y sin datos personales | Pantalla P04 |
| MCP | Sin verificar | Las 7 capacidades se exponen en pantalla, `/api/v1` y MCP; las 3 escrituras con `preview_` (dry run) | — |

**Qué no pasa en este PR (PR 2, CAR-86):** pestaña Diaria, «Confirmar cobertura», cruce con marcas de Asistencia (CAR-89), marca manual, reemplazos sugeridos (A4) y turno extra por aprobar (CAR-96), refuerzos (P10), alertas de horas legales (P09), exportar a PDF o Excel y la notificación al guardia (el evento `pauta.excepcion.creada` queda emitido; la entrega la hace Comunicaciones). **Decide Carlos:** nada nuevo en este PR; las dos propuestas de su prompt (Cobertura como tercera vista, umbral de horas legales) quedan fuera, y Cobertura se dibuja como filtro.

## Plan

**PR 1 (este):**
1. Esquema `pauta` + migración `20261030211000_pauta_series_excepciones` (aditiva, FORCE RLS, historial append-only) + test de aislamiento.
2. Dominio puro (`packages/domain/src/pauta`): expansión de series y excepciones a la grilla con feriados, cobertura, no doblar.
3. Capacidades (`packages/capabilities/src/pauta`): `pauta.mes.leer`, `pauta.resumen.leer`, `pauta.ppc.listar`, `pauta.historial.listar`, `pauta.series.fijar`, `pauta.excepciones.crear`, `pauta.excepciones.anular`.
4. Pantallas P01–P05 y la vista de PPC (P06 como filtro) en `/pauta`.
5. Pruebas: dominio, `test:db`, paridad y snapshot MCP, e2e.

**PR 2 (CAR-86):** Diaria, reemplazos, refuerzos, marcas, alertas, exportación y notificación al guardia, cuando existan Asistencia (CAR-89), Turnos extra (CAR-96) y Portal Supervisor.

## Reglas y decisiones aplicadas

- **R11:** la pauta guarda series y excepciones y calcula el resto. Repintar no toca el pasado. El día de hoy: sin marcas ni cobertura confirmada (todavía no existen), el cambio rige desde hoy.
- **Titular:** vive en la serie (con su vigencia) y debe tener un vínculo laboral vigente en la instalación del puesto. Sin titular, el turno es PPC «sin titular».
- **Jornada rotativa:** el «no doblar» usa el tramo principal del puesto (`hora_inicio`–`hora_fin`); el tramo de noche de las jornadas rotativas no se evalúa todavía.
- **Zona horaria:** «hoy» se resuelve en `America/Santiago` hasta que el tenant fije la suya.
- **Datos personales:** las lecturas devuelven nombre del titular, nunca RUT; se auditan por ID (NÚCLEO-H). El historial guarda solo datos de la serie o de la excepción (tipo, patrón, días) y el nombre de quien actuó: no copia el motivo (texto libre que puede ser de salud) ni la persona; el motivo vive en la excepción.
- **Concurrencia:** fijar una serie bloquea primero a la persona (`pg_advisory_xact_lock`) y luego el puesto, para que dos cambios con el mismo titular no lo doblen; registrar una excepción bloquea el puesto y revalida dentro de la transacción.
- **Alcance en los errores:** si «no doblar» choca con un puesto fuera del alcance del actor, el mensaje no lo nombra.
- **Eventos:** `pauta.serie.fijada`, `pauta.excepcion.creada`, `pauta.excepcion.anulada` por outbox, en la misma transacción.

## Criterios de aceptación

1. Fijar una serie con vista previa no escribe; la real cierra la anterior y deja una sola abierta.
2. Con serie previa, una fecha anterior a hoy se rechaza.
3. Un titular de otra empresa o sin vínculo en la instalación no se acepta; dos turnos solapados o seguidos del mismo titular se rechazan con explicación.
4. Una excepción vuelve PPC los días de trabajo con su motivo, no se repite el mismo día y se anula.
5. Un supervisor ve y edita solo sus instalaciones; el viewer solo lee; una empresa nunca ve la pauta de otra.
6. `tools/list` incluye las 7 herramientas y `preview_` de las 3 escrituras.
