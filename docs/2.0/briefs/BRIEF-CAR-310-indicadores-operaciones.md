# BRIEF CAR-310 · Operaciones: indicadores de desempeño

ADR-094. Hoja de alcance `docs/2.0/diseño/alcance-desempeno.md` (Operaciones: cobertura de pauta, turnos descubiertos, turnos extra, visitas, rondas, novedades, reclamos). Apilado sobre CAR-309 (#568).

## 1 Objetivo

Que Pauta, Rondas y Tickets publiquen sus indicadores en el catálogo del núcleo para los scorecards de Desempeño, cada uno en su manifiesto.

## 2 Estado actual (verificado)

- Rondas guarda cada cierre con su persona, puntos obligatorios y marcados (`rondas.cierres_ronda`).
- Pauta calcula la cobertura del mes por instalación (`pauta.resumen.leer`, `resumirCobertura`).
- Novedades de la bitácora (`rondas.novedades`) y Tickets (`tickets.tickets`) existen.
- Las visitas de supervisión todavía no existen en 2.0: ese indicador entra cuando exista su dato.
- Las instalaciones a cargo de cada supervisor viven en `core.supervisor_instalaciones` (por membresía); la jefatura por cargo, en CAR-314.

## 3 Alcance

- **Esta entrega:** `rondas.rondas_completas` («Rondas completas»): de las rondas que cerró cada guardia en el mes, % con todos los puntos obligatorios marcados. Calidad, %, más es mejor, meta 95, se atribuye a la Persona, permiso `rondas:read`.
- **Por instalación (adenda CAR-310, decisión de Carlos del 12-nov-2026: «a ambos»):** se cargan al usuario supervisor que tiene la instalación a cargo (`core.supervisor_instalaciones`) y al usuario jefe de zona por todas las instalaciones de los supervisores que le reportan (jefatura por cargo, `reportesPorJefe`). Helper `instalacionesPorResponsable(ctx)`.
  - `pauta.cobertura` («Cobertura de pauta», resultado, %, más es mejor, meta 98): turnos cubiertos sobre programados del mes, con la misma cuenta que `pauta.resumen.leer`.
  - `pauta.turnos_descubiertos` («Turnos descubiertos», resultado, cantidad, menos es mejor, meta 2): turnos que quedaron como puesto por cubrir.
  - `pauta.turnos_extra` («Turnos extra sobre la pauta», calidad, %, menos es mejor, meta 5): refuerzos cubiertos sobre los turnos programados.
- **Fuera, hasta que exista el dato en 2.0:** visitas de supervisión (no existen); novedades cerradas en 24 horas (la novedad aún no guarda cuándo se cerró, ciclo completo pendiente en Rondas); reclamos de cliente (el ticket no se liga a una instalación ni distingue el reclamo de cliente).

## 4 Arquitectura

Cada indicador vive en el módulo dueño de sus hechos (`packages/capabilities/src/<modulo>/indicadores-gestion.ts`) y se declara en su manifiesto (`indicadores`). Desempeño los usa sin cambios.

## 5 Archivos

`src/rondas/{indicadores-gestion,index}.ts`, `src/pauta/{indicadores-cobertura,indicadores-gestion,index}.ts`, `src/core/jefatura/empresa.ts`, `src/index.ts`, `modules/rondas/manifest.ts`, test `indicadores-operaciones-db.test.ts`.

## 6 Modelo de datos y migraciones

Ninguna en esta entrega.

## 7 Capacidades

Ninguna nueva: el indicador aparece en `core.indicadores_gestion.catalogo` y se mide con `.medir` (pantalla, API y MCP).

## 8 Interfaz

Sin pantallas: el indicador aparece en el editor de scorecard de Desempeño.

## 9 Seguridad y tenant

Todo por `ctx.db` (RLS); salida solo ids y porcentajes; permiso del módulo dueño.

## 10 Casos límite

Rondas: cierre sin persona → no se atribuye; cuenta en el mes de la hora de cierre; un estado distinto de «completada» o con puntos faltantes cuenta como incompleta. Pauta: un usuario sin instalaciones ni supervisores a cargo no aparece; un supervisor sin ficha de Persona unida a su usuario no sube a su jefe de zona; se mide con la jefatura y las asignaciones de hoy (el cierre del mes lo deja fijo).

## 11 Plan por bloques

1. Rondas completas, con test.
2. Indicadores por instalación (cobertura, descubiertos, extra) con atribución a supervisor y jefe de zona, con test; brief, adenda y ESTADO.

## 12 Tests

`indicadores-operaciones-db` (rondas completas e incompletas por guardia y por mes; cobertura 93,8 % y 1 turno descubierto cargados al supervisor y a su jefa de zona; aislamiento entre empresas).

## 13 Validación

Gate local; catálogo y paridad sin cambios de herramientas.

## 14 Criterios de aceptación

El catálogo lista «Rondas completas», «Cobertura de pauta», «Turnos descubiertos» y «Turnos extra sobre la pauta» con sus módulos activos, y Desempeño puede ponerlos en un scorecard.

## 15 Riesgos y rollback

Bajo, sin migración. La pauta del mes se calcula en memoria para todas las instalaciones con responsable.

## 16 Reporte de ejecución

Ver PR y `ESTADO.md`.
