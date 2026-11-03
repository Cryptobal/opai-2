# Addendum — CPQ en Bandeja de aprobaciones (CAR-141)

**Rama:** `cursor/cpq-bandeja-aprobaciones-a417` · **Refs CAR-141** · **Sin migración.**

## Objetivo

Integrar en `/configuracion/aprobaciones` y en la campana/bandeja de Inicio los pendientes de **margen CPQ** (`cpqAprobacion`) y **envío conjunto** (`cpqPropuestaEnvio` en `pendiente_aprobacion`), con detalle de cotización, cliente, venta mensual, margen frente al mínimo (10 %), solicitante y fecha. Desde la bandeja se **aprueba** o **rechaza con motivo**, respetando **N6** en servidor (tests negativos y `dryRun`). El contador `aprobacionesPendientes` suma agente + CPQ según permisos; la ficha de cotización enlaza a `?ver=cpq-m/…` o `cpq-e/…`; al resolver se notifica in-app al solicitante. MCP: `cpq.aprobaciones.{list,get,contar,aprobar,rechazar}` con `preview_` en escrituras.

## Fuera de alcance

Configuración › Marca y plantillas; PDF de propuesta/cotización (otro agente).

## Alcance (acotado)

- **No se reimplementa N6:** la bandeja aprueba/rechaza con `cpq.cotizaciones.aprobar` / `.rechazar_aprobacion` y `cpq.envios_propuesta.aprobar` / `.cancelar` (#208 / #218).
- **Lectura unificada:** `cpq.aprobaciones.{list,get,contar}` alimentan Configuración › Aprobaciones, la bandeja de Inicio y el contador `aprobacionesPendientes`.
- **Eventos consumidos:** consumidor `cpq.bandeja` entrega avisos in-app (campana) para `cpq.cotizacion.aprobacion_solicitada`, `cpq.envio_propuesta.solicitado` y resoluciones; catálogo ADR-020 en `COMUNICABLES_CPQ`.
- **Ids de bandeja:** `cpq-m/{cotizacionId}`, `cpq-e/{envioId}`.

## Capacidades nuevas (solo lectura + contador)

| Id | Efecto | MCP |
| --- | --- | --- |
| `cpq.aprobaciones.list` | lectura | `cpq_aprobaciones_list` |
| `cpq.aprobaciones.get` | lectura | `cpq_aprobaciones_get` |
| `cpq.aprobaciones.contar` | lectura | `cpq_aprobaciones_contar` |

Escrituras desde la bandeja: herramientas existentes con `preview_` (`cpq_cotizaciones_aprobar`, etc.).

## Verificación

- `pnpm typecheck`, `pnpm test` (módulo CPQ + paridad + bandeja web).
- Build web con variables ficticias de CI.
- Capturas QA 375 y 1280 px en `docs/2.0/qa/cpq-bandeja-aprobaciones/`.
