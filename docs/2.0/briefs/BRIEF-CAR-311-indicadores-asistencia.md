# BRIEF CAR-311 · Asistencia: indicadores de desempeño

ADR-094. Hoja de alcance `docs/2.0/diseño/alcance-desempeno.md` (Asistencia: marcas a la hora, ausentismo). Apilado sobre CAR-310 (#573).

## 1 Objetivo

Que Asistencia publique sus indicadores en el catálogo del núcleo para los scorecards de Desempeño, sin tocar las marcas ni el reporte para la DT.

## 2 Estado actual (verificado)

- Asistencia consolida cada día por persona en `asistencia.dias`: estado (`presente`, `incompleto`, `ausente`, `sin_marca`, `sin_turno`), sigla oficial de la Res. 38 (J.O., A.I., L.M., VAC…), hora de entrada y segundos de atraso.
- Una ausencia registrada en la pauta o en RR. HH. queda como `ausente` con su sigla.

## 3 Alcance

- `asistencia.marcas_a_la_hora` («Marcas a la hora», oportunidad, %, más es mejor, meta 95, por Persona): de los días con entrada del mes, % sin atraso (al segundo, como «Asistencia de hoy»).
- `asistencia.ausentismo` («Ausentismo», resultado, %, menos es mejor, meta 3, por Persona): de los días con turno del mes, % no trabajado sin justificación.
- **Regla de licencias (la define este brief, como pedía CAR-311):** no cuentan ni a favor ni en contra las siglas L.M. (licencia médica), AT (accidente del trabajo), PREN. y POSTN (pre y postnatal), VAC (vacaciones), P.G.R. y P.S.G.R. (permisos) y A.J. (ausencia justificada): esos días salen del cálculo. Cuentan en contra la ausencia injustificada (A.I.) y el día con turno sin ninguna marca (S.A. o sin sigla).

## 4 Arquitectura

`modules/asistencia/capabilities/indicadores.ts`, declarado en el manifiesto (`indicadores`). Solo lee `asistencia.dias`; nunca marcas, cadena ni correcciones.

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

Solo días ya terminados (antes de hoy); `sin_marca` (día en curso) y `sin_turno` no cuentan. Una corrección aprobada recalcula el día y el indicador la refleja; el cierre del mes (CAR-322) deja fijo el resultado.

## 11 Plan por bloques

1. Indicadores, test, brief, adenda y ESTADO.

## 12 Tests

`asistencia-indicadores-db` (atraso, injustificada, licencia y vacaciones neutras, día sin marca en contra, aislamiento entre empresas).

## 13 Validación

Gate local; catálogo y paridad sin cambios de herramientas.

## 14 Criterios de aceptación

Con Asistencia activo, el catálogo lista «Marcas a la hora» y «Ausentismo», y Desempeño puede ponerlos en un scorecard.

## 15 Riesgos y rollback

Bajo, sin migración. Si Carlos quiere otra regla para las siglas, se cambia la lista `SIGLAS_NEUTRAS`.

## 16 Reporte de ejecución

Ver PR y `ESTADO.md`.
