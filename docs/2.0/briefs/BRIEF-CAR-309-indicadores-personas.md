# BRIEF CAR-309 · Personas: indicadores de desempeño

ADR-094. Hoja de alcance `docs/2.0/diseño/alcance-desempeno.md` (Personas: días para cubrir una vacante, retención a 90 días, fichas con documentos al día). Apilado sobre CAR-322b (#566).

## 1 Objetivo

Que Personas publique sus indicadores en el catálogo del núcleo para usarlos en los scorecards de Desempeño. Entrega los tres indicadores de la hoja de alcance. Las reglas de reclutador y vacante las decidió Carlos el 12-nov-2026 (adenda CAR-309 de ADR-094).

## 2 Estado actual (verificado)

- El catálogo del núcleo publica `core.tareas_a_tiempo`; los módulos publican los suyos en el manifiesto (`indicadores`).
- Los documentos tienen vencimiento (`documentos.vence_en`) y se vinculan a la ficha (`documento_vinculos`, `entidad_tipo = persona`); una versión nueva apunta a la anterior (`reemplaza_a_id`).
- La jefatura por cargo existe (CAR-314): `equipoDe` y la regla pura `esJefeDirecto`.
- **No existe** el dato de quién reclutó a cada persona ni la vacante como entidad.

## 3 Alcance

- Indicador del núcleo `core.personas_documentos_al_dia` («Fichas con documentos al día»): de las personas que **reportan** a una jefatura (directas o, si nadie tiene a la persona asignada, la jefatura del nivel de arriba, para que nadie quede sin medir), porcentaje sin ningún documento vencido al cierre del mes (en el mes en curso, a hoy). Cuenta solo el documento propio de la ficha y confirmado (`disponible`); uno pendiente, archivado, reemplazado o solo referenciado no cuenta. «Al cierre» = vence antes del día 1 del mes siguiente (vence el último día del mes → vencido). Se atribuye a la Persona jefa; meta sugerida 95 %.
- Regla pura `reportesPorJefe` en `@opai/domain` (la misma de `personasACargo`) y helper `directasPorJefatura(ctx)` que la aplica a toda la empresa en 3 consultas.

- **«Reclutado por»** en el vínculo laboral (`reclutado_por`): `core.vinculos.create` lo llena con quien registra el ingreso (si es una persona; una key de servicio o el sistema lo dejan vacío) y `core.vinculos.update` lo cambia (también en un contrato terminado, solo ese campo); un reclutador enviado a mano tiene que ser usuario con membresía activa en el ERP de la empresa. La vista previa muestra y valida el mismo reclutador. Un traslado entre instalaciones conserva el reclutador del contrato anterior. El cambio queda en el evento `core.vinculo.actualizado` (antes/después) y en la auditoría.
- Indicador `core.personas_retencion_90` («Retención a 90 días», resultado, %, meta 80, por usuario, permiso `core:vinculos.read`): de los vínculos con reclutador cuyo día 90 cae en el mes y ya llegó, % que no terminó antes de ese día.
- Indicador `pauta.dias_cubrir_vacante` («Días para cubrir una vacante», oportunidad, días, menos es mejor, meta 7, por usuario, permiso `pauta:read`), publicado por el módulo Pauta: por cada serie con titular que empieza a regir en el mes, días desde que el puesto quedó sin persona: la primera serie sin titular de la racha o, si es antes, el día siguiente a que el titular anterior dejó la empresa (un traslado no es una salida); se atribuye al reclutador del contrato vigente con que la persona tomó el puesto; promedio por reclutador.

Fuera: mostrar y editar «Reclutado por» en la ficha (hoy por API y MCP; la pantalla va con su diseño), vacantes todavía abiertas al cierre (no suman hasta que se cubren).

## 4 Arquitectura

El indicador vive en `packages/capabilities/src/core/indicadores-gestion/` (Personas es parte del núcleo) y se suma a `indicadoresDelNucleo`. Lo mide `core.indicadores_gestion.medir` y lo usa Desempeño sin cambios.

**Criterio propio (reportado):** se mide sobre quienes le reportan, no toda la línea: así a un gerente no se le carga lo que gestiona cada supervisor, que tiene su propio indicador; pero quien no tiene jefe asignado sube al nivel de arriba (misma regla de CAR-314).

## 5 Archivos

`core/indicadores-gestion/{documentos-al-dia.ts,comun.ts}`, `core/jefatura/{empresa.ts,datos.ts}`, `packages/domain/src/jefatura/jefatura.ts`, tests `indicadores-personas-db.test.ts` e `indicadores-gestion.test.ts`.

## 6 Modelo de datos y migraciones

`20261210100000_core_vinculo_reclutado_por`: columna nullable `core.vinculos_laborales.reclutado_por` (uuid, sin FK, como `creada_por` de la pauta) e índice por tenant. Aditiva; los vínculos existentes quedan sin reclutador.

## 7 Capacidades

`core.vinculos.create`/`.update`/`.list` suman `reclutadoPorId`. Ninguna nueva: los indicadores aparecen en `core.indicadores_gestion.catalogo` y se mide con `.medir` (pantalla, API y MCP). Permisos: documentos al día `core:documentos.read`; retención `core:vinculos.read`; vacante `pauta:read`.

## 8 Interfaz

Sin pantallas nuevas: el indicador aparece para elegir en el editor de scorecard de Desempeño.

## 9 Seguridad y tenant

Todo por `ctx.db` (RLS). Solo ids y porcentajes; no expone documentos ni nombres. Con alcance acotado el catálogo ya marca como no medibles los indicadores atribuidos a una Persona.

## 10 Casos límite y reglas pendientes

- Jefatura sin nadie a cargo directo → no aparece (sin dato, no cero).
- Mes pasado: se mide con la jefatura de hoy y las versiones de hoy; el cierre del mes (CAR-322) lo deja fijo.
- Retención: un vínculo sin reclutador no cuenta; un traslado (contrato que termina y otro que empieza al día siguiente) no es salida ni ingreso; el día 90 aún no llegado no cuenta ni a favor ni en contra; salir el mismo día 90 cuenta como que siguió.
- Vacante: un cambio de titular directo (A → B) solo es vacante si A dejó la empresa antes; los contratos importados quedan sin reclutador; un puesto que nace sin titular abre vacante desde su primera serie; si la persona que lo tomó no tiene reclutador, la vacante no se atribuye.

## 11 Plan por bloques

1. Helper de jefatura de la empresa e indicador de documentos, con tests.
2. «Reclutado por» (migración y capacidades), retención a 90 días y días para cubrir una vacante, con tests; brief, adenda y ESTADO.

## 12 Tests

`indicadores-reclutamiento-db` («Reclutado por» por defecto, vista previa, cambio auditado, corrección en contrato terminado y rechazo de un usuario ajeno; retención con traslado y aislamiento; vacante por serie vacía y por salida del titular) e `indicadores-personas-db` (vencido cuenta; reemplazado, pendiente, archivado y referencia no; borde del último día; persona sin jefe asignado que sube de nivel; por mes; aislamiento entre empresas) y catálogo actualizado.

## 13 Validación

Gate local; `tools/list` sin cambios (no hay capacidades nuevas).

## 14 Criterios de aceptación

- El catálogo lista «Fichas con documentos al día» y Desempeño puede ponerlo en un scorecard.
- La medición cuenta como vencido solo el documento vigente vencido, por mes, y no cruza empresas.

## 15 Riesgos y rollback

Bajo: una columna nullable. La jefatura se calcula en memoria con todos los vínculos vigentes (mismo riesgo de volumen anotado en CAR-322).

## 16 Reporte de ejecución

Ver PR y `ESTADO.md`.
