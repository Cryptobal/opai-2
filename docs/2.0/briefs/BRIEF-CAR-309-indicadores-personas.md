# BRIEF CAR-309 · Personas: indicadores de desempeño (primera parte)

ADR-094. Hoja de alcance `docs/2.0/diseño/alcance-desempeno.md` (Personas: días para cubrir una vacante, retención a 90 días, fichas con documentos al día). Apilado sobre CAR-322b (#566).

## 1 Objetivo

Que Personas publique sus indicadores en el catálogo del núcleo para usarlos en los scorecards de Desempeño. Esta primera parte entrega «Fichas con documentos al día»; los otros dos esperan dos reglas de Carlos (ver §10).

## 2 Estado actual (verificado)

- El catálogo del núcleo publica `core.tareas_a_tiempo`; los módulos publican los suyos en el manifiesto (`indicadores`).
- Los documentos tienen vencimiento (`documentos.vence_en`) y se vinculan a la ficha (`documento_vinculos`, `entidad_tipo = persona`); una versión nueva apunta a la anterior (`reemplaza_a_id`).
- La jefatura por cargo existe (CAR-314): `equipoDe` y la regla pura `esJefeDirecto`.
- **No existe** el dato de quién reclutó a cada persona ni la vacante como entidad.

## 3 Alcance

- Indicador del núcleo `core.personas_documentos_al_dia` («Fichas con documentos al día»): de las personas que **reportan** a una jefatura (directas o, si nadie tiene a la persona asignada, la jefatura del nivel de arriba, para que nadie quede sin medir), porcentaje sin ningún documento vencido al cierre del mes (en el mes en curso, a hoy). Cuenta solo el documento propio de la ficha y confirmado (`disponible`); uno pendiente, archivado, reemplazado o solo referenciado no cuenta. «Al cierre» = vence antes del día 1 del mes siguiente (vence el último día del mes → vencido). Se atribuye a la Persona jefa; meta sugerida 95 %.
- Regla pura `reportesPorJefe` en `@opai/domain` (la misma de `personasACargo`) y helper `directasPorJefatura(ctx)` que la aplica a toda la empresa en 3 consultas.

Fuera (esperan decisión de Carlos): «Días para cubrir una vacante» y «Retención a 90 días».

## 4 Arquitectura

El indicador vive en `packages/capabilities/src/core/indicadores-gestion/` (Personas es parte del núcleo) y se suma a `indicadoresDelNucleo`. Lo mide `core.indicadores_gestion.medir` y lo usa Desempeño sin cambios.

**Criterio propio (reportado):** se mide sobre quienes le reportan, no toda la línea: así a un gerente no se le carga lo que gestiona cada supervisor, que tiene su propio indicador; pero quien no tiene jefe asignado sube al nivel de arriba (misma regla de CAR-314).

## 5 Archivos

`core/indicadores-gestion/{documentos-al-dia.ts,comun.ts}`, `core/jefatura/{empresa.ts,datos.ts}`, `packages/domain/src/jefatura/jefatura.ts`, tests `indicadores-personas-db.test.ts` e `indicadores-gestion.test.ts`.

## 6 Modelo de datos y migraciones

Ninguna.

## 7 Capacidades

Ninguna nueva: el indicador aparece en `core.indicadores_gestion.catalogo` y se mide con `.medir` (pantalla, API y MCP). Permiso: `core:documentos.read`.

## 8 Interfaz

Sin pantallas nuevas: el indicador aparece para elegir en el editor de scorecard de Desempeño.

## 9 Seguridad y tenant

Todo por `ctx.db` (RLS). Solo ids y porcentajes; no expone documentos ni nombres. Con alcance acotado el catálogo ya marca como no medibles los indicadores atribuidos a una Persona.

## 10 Casos límite y reglas pendientes

- Jefatura sin nadie a cargo directo → no aparece (sin dato, no cero).
- Mes pasado: se mide con la jefatura de hoy y las versiones de hoy; el cierre del mes (CAR-322) lo deja fijo.
- **Por decidir (Carlos):** (1) cómo se registra quién reclutó a cada persona (sugerido: campo «Reclutado por» que se llena solo con quien registra el ingreso); (2) cuándo se abre y cierra una vacante (sugerido: un puesto de la pauta que queda sin persona, hasta que alguien lo toma).

## 11 Plan por bloques

1. Helper de jefatura de la empresa e indicador, con tests.
2. Brief y ESTADO.

## 12 Tests

`indicadores-personas-db` (vencido cuenta; reemplazado, pendiente, archivado y referencia no; borde del último día; persona sin jefe asignado que sube de nivel; por mes; aislamiento entre empresas) y catálogo actualizado.

## 13 Validación

Gate local; `tools/list` sin cambios (no hay capacidades nuevas).

## 14 Criterios de aceptación

- El catálogo lista «Fichas con documentos al día» y Desempeño puede ponerlo en un scorecard.
- La medición cuenta como vencido solo el documento vigente vencido, por mes, y no cruza empresas.

## 15 Riesgos y rollback

Bajo, sin migración. La jefatura se calcula en memoria con todos los vínculos vigentes (mismo riesgo de volumen anotado en CAR-322).

## 16 Reporte de ejecución

Ver PR y `ESTADO.md`.
