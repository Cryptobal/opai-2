# BRIEF DE IMPLEMENTACIÓN — 27 NÓMINA II · LIQUIDACIONES (CAR-99, parte 1)

**Sesión:** Sesión Payroll · **Fecha:** 14-nov-2026 · **Tarea:** CAR-99 (Nómina II + Cumplimiento DT) · **Base:** `modulos/nomina.md` §2 (PR 2), `modulos/motor-sueldos.md` §5.3 y §15, `BRIEF-25-nomina.md` §3, diseño `diseño/export-nomina/` 03 y 04 (referencia de contenido; el aspecto lo da el diseño nuevo, ADR-109).

## 1. Objetivo

Calcular la liquidación mensual de cada persona del período: sueldo de su capa, días trabajados, horas extra, anticipos, cuotas de préstamo y descuentos, con el motor de sueldos del Núcleo. Es la base de los archivos LRE y Previred (parte 2) y de Cumplimiento DT (parte 3).

## 2. Estado actual (verificado en `main` `b6093e1`)

- Nómina PR 1 integrado: períodos, novedades, préstamos, anticipos, conceptos, calendario (CAR-92).
- Motor del Núcleo integrado: `costoEmpleadorPorPersona` (haberes, aportes, AFP, salud, AFC, impuesto único, líquido estimado), `horasExtraClp` (R19) y juego de valores legales con captura SII y Previred.
- Capas de sueldo (`core.estructuras_sueldo`), previsión de la persona (`core.persona_prevision`) y vínculos laborales en `main`.
- Asistencia (CAR-89) no entrega días trabajados todavía: los días salen de las novedades (licencia y ausencia).

## 3. Alcance

**Parte 1 (este brief, varios PR):**
1. **Cálculo puro** de la liquidación por persona (dominio, sin base): días trabajados = 30 − licencia − ausencia; haberes de la capa proporcionales a los días; horas extra con R19 como haber imponible; el motor calcula imponible, aportes, cotizaciones e impuesto; el líquido a pagar descuenta anticipos, cuotas y descuentos. Traza y advertencias (bajo el mínimo, líquido negativo, descuentos sobre el 15 % según CAR-455).
2. **Liquidaciones guardadas** por período y persona (`nomina.liquidaciones`), con la capa y el juego de valores que rigieron (R21). Se recalculan mientras el período está abierto o en revisión; al cerrar quedan congeladas.
3. **Capacidades:** `nomina.liquidaciones.calcular` (escritura, `dryRun`), `nomina.liquidaciones.listar` y `nomina.liquidaciones.obtener` (lecturas sensibles auditadas por IDs).
4. **Pantallas** 03 (liquidaciones del período) y 04 (liquidación de una persona) con el diseño nuevo.

**Partes siguientes (fuera de este brief):** archivos LRE, Previred y F30-1 «por verificar» (parte 2); Cumplimiento DT como complemento (parte 3); finiquito, cuadratura B1 y publicación al Portal Trabajador.

**No entra:** reliquidaciones, cargas familiares, APV, gratificación anual, semana corrida.

## 4. Arquitectura

Dominio puro en `packages/domain/src/nomina/liquidacion.ts` sobre el motor (`costoEmpleadorPorPersona` con la capa proporcional). Capacidades en `packages/capabilities/src/nomina/liquidaciones-*.ts`, que leen capa, previsión y novedades con `ctx.db` (RLS) y los montos de sueldo con `ocultasDe` (permiso sensible y auditoría). Persistencia en `nomina.liquidaciones` (migración aditiva).

## 5. Archivos

`packages/domain/src/nomina/liquidacion{,.test}.ts` · `packages/capabilities/src/nomina/liquidaciones-*.ts` · `packages/db/prisma/schema/nomina.prisma` y migración · `apps/web/app/(erp)/remuneraciones/[id]/liquidaciones/**` · pruebas y e2e `@preview`.

## 6. Modelo de datos y migraciones

`nomina.liquidaciones`: `tenant_id`, `periodo_id`, `persona_id`, `estado` (`calculada` | `revisada`), `dias_trabajados`, totales en CLP enteros (`haberes`, `imponible`, `descuentos_legales`, `otros_descuentos`, `liquido`, `costo_empresa`), `detalle` JSON (líneas de haberes y descuentos, sin texto libre), `capa_id`, `juego_huella`, `advertencias` JSON. Único por (`tenant_id`, `periodo_id`, `persona_id`). RLS `tenant_isolation`, FORCE, trigger de mismo tenant. Aditiva, con `SET LOCAL lock_timeout`.

## 7. Capacidades

| Id | Efecto | Permiso |
|---|---|---|
| `nomina.liquidaciones.calcular` | escritura, `dryRun`, idempotente | `nomina:periodos.manage` |
| `nomina.liquidaciones.listar` | lectura sensible auditada | `nomina:novedades.read` |
| `nomina.liquidaciones.obtener` | lectura sensible auditada | `nomina:novedades.read` |

Las tres con herramienta MCP. Montos de sueldo solo con `core:estructuras.read_sensible`.

## 8. Interfaz y responsive

Pantalla 03: tabla del período con persona, días, haberes, descuentos y líquido; resumen arriba (personas, total líquido, costo empresa); acción «Calcular». Pantalla 04: ficha con haberes, descuentos y líquido a pagar, en el panel derecho del diseño nuevo. 375, 1024 y 1280 px.

## 9. Seguridad y tenant

Todo por `ctx.db`. Alcance por instalación aplicado a los vínculos. Gerente, supervisor y viewer sin acceso (bloqueo financiero). Lecturas auditadas por IDs, sin montos en la auditoría.

## 10. Casos límite

Persona sin capa completa (se omite con motivo) · mes con licencia completa (30 días: haberes 0, sin líquido) · ingreso o salida a mitad de mes (días del vínculo dentro del mes) · dos vínculos en el mes (manda el último) · líquido negativo (advertencia, no se recorta) · faltan valores legales (no calcula y dice cuál falta) · período cerrado (no recalcula).

## 11. Plan por bloques

1. Cálculo puro con pruebas (sin base). 2. Tabla y migración. 3. Capacidades y MCP. 4. Pantallas 03 y 04 con `@preview`. 5. Estado y novedades.

## 12. Tests

Dominio: días proporcionales, horas extra R19, descuentos, líquido negativo, licencia completa, casos dorados de `referencia.fixture`. Capacidades: permisos, `dryRun`, idempotencia, auditoría, alcance. Base: RLS con dos tenants.

## 13. Validación

Gate local completo; `@preview` de las pantallas 03 y 04; revisión de capturas contra el diseño nuevo.

## 14. Criterios de aceptación

- **CA1.** Con 30 días y sin novedades, el líquido es el líquido estimado del motor y el costo empresa es el del motor.
- **CA2.** Con 10 días de licencia, los haberes son 20/30 de la capa.
- **CA3.** Las horas extra se pagan con R19 y son imponibles.
- **CA4.** Anticipos, cuotas y descuentos bajan el líquido a pagar, no el imponible.
- **CA5.** Recalcular no duplica; un período cerrado no se recalcula.
- **CA6.** Ningún tenant ve liquidaciones de otro.

## 15. Riesgos y rollback

Montos por verificar contra 2 liquidaciones reales de Gard (decisión 11 del motor). La tabla es nueva y aditiva: el rollback es no usarla. Sin datos reales de Gard en pruebas.

## 16. Reporte de ejecución

Se completa en `docs/2.0/estado/nomina/CAR-99.md` en cada PR.
