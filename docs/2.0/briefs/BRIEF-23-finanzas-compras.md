# BRIEF DE IMPLEMENTACIÓN — 23 FINANZAS · COMPRAS, CONCILIACIÓN Y CONTABILIDAD

**Repositorio:** `Cryptobal/opai-2` · **Tarea:** CAR-98 (`Refs CAR-98`) · **Fecha:** 30-oct-2026 · **Autorizado por Carlos el 30-oct-2026** (lanzar a construcción los briefs de leads, pauta, portal trabajador, portal cliente, nómina y finanzas compras).

**Especificación:** [`modulos/finanzas-compras.md`](../modulos/finanzas-compras.md) (borrador; las decisiones de Carlos del 30-oct se aplican, lo propuesto queda marcado). **Diseño aprobado en `main`:** [`diseño/export-finanzas-compras/`](../diseño/export-finanzas-compras/README.md) (v1; 05 y 07B son variante B, no decidida).

## 1. Decisiones de Carlos (no se reabren)

1. Centros de costo = las instalaciones + uno general «Administración / Oficina central».
2. La configuración del módulo va en Configuración › Módulos › Finanzas.
3. El estado de pago sale de la conciliación, no se marca a mano. Las reglas sugeridas nunca se activan solas. Los saldos de 1.0 no se copian: al corte, asiento de apertura revisado.
4. Variantes B sin decidir —umbral de 3 casos (05) y apertura asistida (07B)—: **no se construyen**.
5. Roles: owner y admin todo; gerente, supervisor y viewer Forbidden; los roles nuevos nacen sin acceso a Finanzas.

## 2. Hoja de alcance (1.0 es el piso)

| Tema de 1.0 (según `extraccion-finanzas.md`) | En 2.0 | PR |
|---|---|---|
| Libro de compras (DTE recibidos) con filtros | **Pasa**, con centro de costo obligatorio o sugerido y plazo para aceptar o reclamar | 1 |
| Recepción automática por RCV (SimpleAPI) | **Pasa** como adaptador por tenant. Requiere credenciales del tenant | posterior |
| Libro IVA y F29 | **Pasa** (alimenta el flujo). Requiere RCV | posterior |
| Catálogo de proveedores con plazo y cuentas por defecto | **Pasa** | 1 |
| Pagos a proveedores | **Pasa**, pero el pago nace de la conciliación bancaria | 2 |
| Estado de pago de compras puesto a mano | **No pasa**: se deriva de la conciliación | 2 |
| Centro de costo por documento (en 1.0, 76 de 76 sin centro) | **Mejora**: sugerido por proveedor o última compra, asignación en lote con vista previa | 1 |
| Reglas de conciliación (RUT, monto, glosa, referencia; ALL/ANY; prioridad) y vista previa | **Pasa** y mejora (vista previa, traza, MCP) | 2 |
| Reglas sugeridas por aprendizaje | **Mejora**; nunca se activa sola. Umbral de 3 casos sin decidir | 2 (tras decisión) |
| Conciliación mensual banco vs libro; vínculos N:N con montos parciales | **Pasa** | 2 |
| Plan de cuentas por tenant | **Pasa**, con plantilla chilena base y validación del grupo (en 1.0 estaba mal) | 1 |
| Períodos, asientos con reverso, salud contable | **Pasa** | 3 |
| Asientos automáticos (en 1.0 solo al emitir 33 y 34) | **Mejora**: desde facturas emitidas y recibidas, movimientos clasificados y cobros | 3 |
| EERR, balance, mayor, export Excel y PDF; balance que siempre cuadra | **Pasa** y mejora (desglose hasta el origen, por centro e instalación) | 3 |
| Saldos contables de 1.0 | **No pasa**: asiento de apertura revisado al corte (variante B sin decidir) | 3 |
| Zoho | **No pasa** (nada de Zoho en 2.0) | — |

## 3. Dependencias verificadas en `main` (`17f868f`)

- **No hay** integración SII/RCV (requiere credenciales del tenant): recepción automática, aceptar/reclamar y F29 quedan **pendientes**.
- **No existen** Banca ni Flujo de caja (CAR-97, CAR-91; el export flujo-caja #161 no está integrado): Conciliación (03), Reglas (04) y el estado de pago derivado quedan **pendientes**; el libro muestra «Sin conciliar».
- Maestros (cuentas, instalaciones) **sí** están: las FK solo van hacia `core.tenants` y `core.instalaciones`.
- Falta el diseño de Configuración › Módulos › Finanzas: el PR 1 solo registra la sección con plan de cuentas y centros de costo.

## 4. Plan de PR

- **PR 1 (este):** spec, brief; schema `finanzas` (plan de cuentas, centros de costo, proveedores, documentos recibidos); capacidades `finanzas.*` con `/api/v1`, MCP, `dryRun` y `preview_`; migración `20261031130000`; pantallas 06 Plan de cuentas, 02 Ficha de proveedor (+ lista) y 01 Libro de compras; sección de Configuración; tests de dominio, RLS, snapshot MCP/paridad y e2e.
- **PR 2 — Conciliación (depende de Banca y Flujo):** pantallas 03, 04 y 05 (sin la variante B); reglas con prioridad y vista previa; vínculos N:N; estado de pago derivado; pagos a proveedores.
- **PR 3 — Contabilidad:** períodos, asientos automáticos, salud contable (07), EERR y balance (08); asiento de apertura revisado (07B solo si Carlos aprueba la variante).
- **PR aparte — Adaptador RCV/SII** cuando Carlos entregue las credenciales del tenant.

## 5. PR 1 — qué se construye

**Datos** (`packages/db/prisma/schema/finanzas.prisma`, migración aditiva con reversa, RLS + FORCE, trigger `mismo_tenant`): `cuentas_contables`, `centros_costo`, `proveedores`, `documentos_recibidos`.

**Capacidades** (permisos `finanzas:read`, `finanzas:compras.manage`, `finanzas:proveedores.manage`, `finanzas:plan.manage`): `finanzas.plan.{listar,inicializar,crear,actualizar}`, `finanzas.centros_costo.listar`, `finanzas.proveedores.{listar,obtener,crear,actualizar}`, `finanzas.compras.{listar,registrar,importar,asignar_centro}`.

**Dominio puro** (`packages/domain/src/finanzas`): plantilla chilena, validación del plan, sugerencia de centro de costo, vista previa de asignación, montos y plazos.

**Criterios de aceptación**

- CA1. Un tenant sin plan carga la plantilla chilena una sola vez y queda sin errores de validación.
- CA2. Guardar deudores por venta o IVA en el grupo equivocado se rechaza.
- CA3. Un documento sin centro de costo muestra el chip «Sin centro de costo» y la sugerencia; asignarlo en lote muestra antes la vista previa y no pisa un centro existente.
- CA4. El libro muestra «Sin conciliar» y el plazo para aceptar o reclamar; las notas de crédito restan en los totales.
- CA5. Un tenant no ve ni referencia datos de otro (RLS + `mismo_tenant`, probado en `test:db`).
- CA6. gerente, supervisor y viewer reciben Forbidden en las pantallas y en las capacidades.
- CA7. Cada escritura existe como herramienta MCP con `preview_` y el gate de paridad está en verde.

## 6. Riesgos y decisiones por tomar

- Montos como `Int` (tope 2.000.000.000 CLP): suficiente para un documento recibido; si un DTE lo superara habría que pasar a `BigInt`.
- Plazo de reclamo de 8 días corridos: **por verificar con el contador** antes de que el flujo de aceptar/reclamar dependa de él.
- Auditoría de lecturas (NÚCLEO-H): se aplicó a proveedores y libro de compras por prudencia (un proveedor puede ser persona natural); si Carlos prefiere no auditarlas, es un cambio de una línea.
- Íconos de navegación: se reutilizan los existentes del DS (`FileText`, `Briefcase`); agregar íconos propios toca un archivo compartido.
