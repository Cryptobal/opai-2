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
- **Espera una regla de Carlos:** a quién se atribuyen los indicadores por instalación (cobertura de pauta, turnos descubiertos, turnos extra, novedades cerradas en 24 horas y reclamos de cliente).
- **Fuera:** visitas de supervisión (no existe el dato en 2.0).

## 4 Arquitectura

Cada indicador vive en el módulo dueño de sus hechos (`packages/capabilities/src/<modulo>/indicadores-gestion.ts`) y se declara en su manifiesto (`indicadores`). Desempeño los usa sin cambios.

## 5 Archivos

`src/rondas/indicadores-gestion.ts`, `src/index.ts`, `modules/rondas/manifest.ts`, test `indicadores-operaciones-db.test.ts`.

## 6 Modelo de datos y migraciones

Ninguna en esta entrega.

## 7 Capacidades

Ninguna nueva: el indicador aparece en `core.indicadores_gestion.catalogo` y se mide con `.medir` (pantalla, API y MCP).

## 8 Interfaz

Sin pantallas: el indicador aparece en el editor de scorecard de Desempeño.

## 9 Seguridad y tenant

Todo por `ctx.db` (RLS); salida solo ids y porcentajes; permiso del módulo dueño.

## 10 Casos límite

Cierre sin persona → no se atribuye. Cuenta en el mes de la hora de cierre. Un estado distinto de «completada» o con puntos faltantes cuenta como incompleta.

## 11 Plan por bloques

1. Rondas completas, con test.
2. Indicadores por instalación (tras la regla de Carlos).
3. Brief y ESTADO.

## 12 Tests

`indicadores-operaciones-db` (completas e incompletas por guardia, por mes, aislamiento entre empresas).

## 13 Validación

Gate local; catálogo y paridad sin cambios de herramientas.

## 14 Criterios de aceptación

El catálogo lista «Rondas completas» con Rondas activo y Desempeño puede ponerlo en un scorecard.

## 15 Riesgos y rollback

Bajo, sin migración.

## 16 Reporte de ejecución

Ver PR y `ESTADO.md`.
