# BRIEF CAR-311 · Asistencia: indicadores de desempeño

ADR-094. Hoja de alcance `docs/2.0/diseño/alcance-desempeno.md` (Asistencia: marcas a la hora, ausentismo). Apilado sobre CAR-310 (#573).

## 1 Objetivo

Que Asistencia publique sus indicadores en el catálogo del núcleo para los scorecards de Desempeño, sin tocar las marcas ni el reporte para la DT.

## 2 Estado actual (verificado)

- Asistencia consolida cada día por persona en `asistencia.dias`: estado (`presente`, `incompleto`, `ausente`, `sin_marca`, `sin_turno`), sigla oficial de la Res. 38 (J.O., A.I., L.M., VAC…), hora de entrada y segundos de atraso.
- Hoy el consolidado no recibe la sigla de una ausencia registrada: todo día `ausente` queda como S.A. Una licencia, vacación o permiso registrado en la Pauta anula el turno esperado (`core.turnos_esperados.vigente = false`), pero no recalcula el día ya consolidado. Una ausencia registrada en la Pauta también anula el turno.

## 3 Alcance

- `asistencia.marcas_a_la_hora` («Marcas a la hora», oportunidad, %, más es mejor, meta 95, por Persona): de los días con entrada del mes, % sin atraso (al segundo, como «Asistencia de hoy»).
- `asistencia.ausentismo` («Ausentismo», resultado, %, menos es mejor, meta 3, por Persona): de los días con turno del mes, % no trabajado sin justificación.
- **Regla de licencias (la define este brief, como pedía CAR-311):** no cuentan ni a favor ni en contra las siglas L.M. (licencia médica), AT (accidente del trabajo), PREN. y POSTN (pre y postnatal), VAC (vacaciones), P.G.R. y P.S.G.R. (permisos) y A.J. (ausencia justificada): esos días salen del cálculo. Cuentan en contra la ausencia injustificada (A.I.) y el día con turno sin ninguna marca (S.A. o sin sigla).

## 4 Arquitectura

`modules/asistencia/capabilities/indicadores.ts`, declarado en el manifiesto (`indicadores`). Lee `asistencia.dias`, los turnos esperados del núcleo (`core.turnos_esperados`) y las ausencias de la Pauta (`pauta.excepciones` tipo ausencia, solo lectura); nunca marcas, cadena ni correcciones. Cuenta un día solo si su turno esperado sigue vigente y ya terminó: así una licencia o vacación registrada tarde sale del cálculo aunque el día no se haya recalculado. Las ausencias de la Pauta (que también anulan el turno) se suman en contra.

## 5 Archivos

`modules/asistencia/capabilities/{indicadores,index}.ts`, `modules/asistencia/manifest.ts`, test `packages/capabilities/test/asistencia-indicadores-db.test.ts`.

## 6 Modelo de datos y migraciones

Ninguna.

## 7 Capacidades

Ninguna nueva: aparecen en `core.indicadores_gestion.catalogo` y se miden con `.medir` (pantalla, API y MCP). Permiso `asistencia:ver`.

## 8 Interfaz

Sin pantallas: aparecen en el editor de scorecard de Desempeño.

## 9 Seguridad y tenant

Todo por `ctx.db` (RLS); salida solo ids y porcentajes; no toca hechos regulados.

## 10 Casos límite

Solo turnos ya terminados; un día `sin_marca` cuyo turno terminó cuenta como sin marca (en contra); `sin_turno` y las marcas fuera de turno no cuentan; un día con licencia y entrada no cuenta en «Marcas a la hora». Una corrección aprobada recalcula el día y el indicador la refleja; el cierre del mes (CAR-322) deja fijo el resultado.

## 11 Plan por bloques

1. Indicadores, test, brief, adenda y ESTADO.

## 12 Tests

`asistencia-indicadores-db` (atraso; sin marca en contra; licencia registrada tarde con turno anulado y vacaciones neutras; «sin marca» de un turno ya terminado en contra; ausencia de la Pauta en contra; marca fuera de turno ignorada; otra empresa con sus propios datos sin mezclarse).

## 13 Validación

Gate local; catálogo y paridad sin cambios de herramientas.

## 14 Criterios de aceptación

Con Asistencia activo, el catálogo lista «Marcas a la hora» y «Ausentismo», y Desempeño puede ponerlos en un scorecard.

## 15 Riesgos y rollback

Bajo, sin migración. Si Carlos quiere otra regla para las siglas, se cambia la lista `SIGLAS_NEUTRAS`.

## 16 Reporte de ejecución

Ver PR y `ESTADO.md`.
