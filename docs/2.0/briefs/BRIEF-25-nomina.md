# BRIEF DE IMPLEMENTACIÓN — 25 NÓMINA (período, novedades, préstamos y calendario de obligaciones)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `feat/nomina-pr1` (desde `main` actualizado) · **Fecha:** 30-oct-2026 · **Tarea:** CAR-92 (`Refs CAR-92` en el PR) · **Fase:** Ola 6 · **Especificación:** [`modulos/nomina.md`](../modulos/nomina.md) · **Diseño aprobado (v2):** `diseño/export-nomina/` (PR #166).

**Autorización:** Carlos, 30-oct-2026 («Exactamente, tú a Claude.»), lanzar a construcción los briefs de leads, pauta, portal trabajador, portal cliente, nómina y finanzas compras. Este brief sigue el encargo «Nómina 2.0 · PR 1».

## 1. Objetivo

Construir el módulo Nómina por dependencia: el PR 1 deja la base de datos y la **operación del período sin cálculo**; el cálculo, las liquidaciones, los archivos y el finiquito esperan al motor de sueldos (que en `main` solo tiene especificación) y a Asistencia.

## 2. Estado del repo y dependencias (verificado en `origin/main` `17f868f`, 30-oct-2026)

| Dependencia | En `main` | Efecto |
|---|---|---|
| Núcleo (permisos, RLS, auditoría, outbox, configuración, `core.documentos`) | Sí | Base del PR 1 |
| Personas y vínculos laborales (`core.personas`) | Sí | FK de novedades, préstamos y reglas |
| Capas de sueldo (07b: `EstructuraSueldo`, `EstructuraItem`) | Sí | Fuente del sueldo; se usan en el PR 2 |
| Puestos (C9) | Sí | Requisito de Nómina; no se toca en el PR 1 |
| **Motor de sueldos (07e)** | **No** (solo spec) | **Bloquea** cálculo, 03/04 Liquidaciones, impuesto, 06 archivos LRE/Previred, 08 finiquito y B1 cuadratura |
| **Asistencia (CAR-89)** | **No** | **Bloquea** días trabajados desde asistencia |
| Previsión y banco en la ficha | Con Personas (#165, abierto) | No se duplican en Nómina |
| Cumplimiento DT (CAR-99) | Complemento | Fuera de este brief |

## 3. Hoja de alcance (nómina de 1.0 como piso)

La extracción de nómina de 1.0 **está sin verificar** (`PLAN-diseno-modulos.md` §F); el piso son los problemas y comportamientos ya verificados en `modulos/motor-sueldos.md` Anexo A, que Nómina no repite: liquidación sin la reforma, parámetros globales sin tenant, versión activa en vez de vigente, float hasta el final y respaldos fijos en el código.

| De 1.0 | En 2.0 | PR |
|---|---|---|
| Período de remuneraciones y su cierre | Períodos con estados y reapertura con motivo | **1** |
| Novedades (licencias, ausencias, horas extra, descuentos) | Novedades por tipo y unidad, carga masiva todo-o-nada, respaldo documental | **1** |
| Anticipos y préstamos | **Mejora B2** (anticipo quincenal automático) y **B3** (plan de cuotas), ambas decididas por Carlos | **1** |
| Parámetros de nómina | Conceptos con tratamiento y código LRE «por verificar»; ajustes por tenant | **1** |
| Obligaciones del mes | Calendario con «Plazo por verificar» | **1** |
| Cálculo y liquidación | Motor del Núcleo, sueldo desde la capa | 2 |
| LRE, Previred, F29 | Generar y validar, nunca enviar | 2 |
| Cuadratura contra 1.0 | **Mejora B1** | 2 |
| Finiquito, contratos y anexos ante la DT | Cumplimiento DT | 2/3 |

**No se porta:** nada de código de 1.0; datos de 1.0 no se mezclan.

## 4. PR 1 — qué entrega

**Bloque A · Documentos.** Especificación `nomina.md`, este brief y una línea en `ESTADO.md`.

**Bloque B · Datos, dominio y capacidades.** Schema `nomina` (siete tablas) en `packages/db/prisma/schema/nomina.prisma`; dominio puro en `packages/domain/src/nomina` (transiciones del período, plan de cuotas, anticipo, calendario); 21 capacidades `nomina.*` en `packages/capabilities/src/nomina` expuestas por API v1 y MCP con `dryRun`/`preview_` e idempotencia; lecturas personales auditadas (NÚCLEO-H).

**Bloque C · Migración.** `20261030214000_nomina_pr1`: aditiva, reversible (`DROP SCHEMA "nomina" CASCADE`), RLS forzada, CHECK de unidades, índices parciales (anticipo e idempotencia de cuota, unicidad del calendario) y triggers de mismo tenant. No toca el Núcleo ni Maestros. **No se aplica en Neon:** la aplica el bot «OPAI 2.0» con respaldo.

**Bloque D · Pantallas.** 01 Períodos, 05 Novedades del período (con B2 y B3 enlazadas), 09 Configuración › Módulos › Nómina (sección propia `configuracion/_nomina/`) y 10 Calendario de obligaciones.

**Bloque E · Tests.** Dominio (transiciones, cuotas, anticipo, calendario), capacidades con base en memoria, aislamiento y reglas de integridad en Postgres real, snapshot MCP y paridad, e2e de las pantallas nuevas.

## 5. Decisiones de Carlos que no se reabren

B1, B2 y B3 van las tres · la configuración vive en Configuración › Módulos › Nómina · Nómina exige Puestos y capas de sueldo, el sueldo sale de la capa y se usa el motor del Núcleo · Previred, LRE, SII y registro de contribuyentes son «súper importantes» y todo formato no verificado se muestra «por verificar» · la DT no tiene API: OPAI genera y valida, sube el representante · los roles nuevos nacen sin acceso a nómina.

## 6. Riesgos

- El cálculo depende de un motor sin construir: el PR 2 queda detrás del Brief 07e y de Asistencia.
- Los formatos de Previred, LRE (columnas), SII y banco no están verificados: no se generan archivos oficiales hasta verificarlos.
- Tres capacidades de lectura (`periodos`, `conceptos`, `obligaciones`) no son datos personales y entran a la lista cerrada de lecturas sin auditoría (snapshot `lecturas-registro`); las tres lecturas con datos por persona sí se auditan.
- Conflictos de integración con las otras cinco sesiones paralelas en archivos compartidos (registro, snapshot MCP, permisos, `schemas = [...]`, ESTADO, inventario de paridad): se resuelven por unión de líneas.

## Historial

- 30-oct-2026: brief y PR 1 por Claude, autorizado por Carlos.

## Corrección del PR #192 · CAR-92

Encargo de corrección del review `5723351550`, implementado por Codex: abortar con
`cambioConcurrente()` si aplicar cuotas descubre un préstamo que no bloqueó;
serializar cierre y reapertura con el orden período → préstamos por id, antes de
actualizar cuotas y período. Sin nuevas decisiones de negocio ni migraciones.

Criterios de este delta:

- Recálculo con préstamo nuevo: conflicto y rollback sin novedades parciales;
  prueba concurrente nueva en `nomina-db.test.ts`.
- Dos cierres de meses del mismo préstamo: esperan su bloqueo antes de cambiar
  cuotas y dejan el préstamo pagado; la reapertura lo reactiva. Prueba concurrente nueva.
- Se conservan permisos, RLS, vista previa, auditoría y paridad MCP existentes.
- Bloques A/B/E: documentación, corrección interna y regresiones de este encargo.
  C/D: sin cambios. Cálculo, archivos oficiales y restantes entregas del PR 2
  conservan las dependencias y limitaciones de las secciones 2–4.
