# Finanzas — auditoría contra Stripe Billing · Xero · QuickBooks

**Recomendación: mantener y completar.** Facturación, cobranza y conciliación siguen al referente. Falta el piso contable.

## Qué hace hoy

- **Documentos de venta con estados**, líneas, referencias y destinatarios (`DocumentoEmitido*`, `packages/db/prisma/schema/finanzas.prisma`); emisión y envío al SII con estado propio (`DteEnvio`), notas de crédito y débito.
- **Facturación recurrente**: programación con líneas, corridas, proforma y estado de pago antes de emitir, y seguimiento del cierre de mes (`VentasProgramacion*`, `VentasCierreSeguimiento`, `finanzas.cierre.*`).
- **Cobranza**: deudores, recordatorios, gestiones y pausa por cliente (`CobranzaGestion`, `finanzas.cobranza.*`; reglas en `packages/domain/src/finanzas/cobranza.ts`).
- **Bancos y conciliación**: cartolas, movimientos, sugerir, confirmar y **deshacer**, con reglas (`MovimientoBancario`, `ConciliacionBanco`, `ReglaConciliacion`, `finanzas.conciliaciones.*`).
- **Flujo de caja** semanal con filas, celdas, cobros esperados, IVA postergado y cierre sellado (`Flujo*`, `modules/finanzas/capacidades/`).
- **Cesión de facturas** (`Cesion`) y **compras** (`DocumentoRecibido`, `Proveedor`).
- **Plan de cuentas y centros de costo** como catálogos (`CuentaContable`, `CentroCosto`).
- **Rendiciones** con lotes de pago (`schema/rendiciones.prisma`).
- Montos en enteros (regla del repositorio).

## Qué hace el referente

Stripe Billing: la factura como máquina de estados, recurrencia con borrador revisable, cobranza escalonada. Xero y QuickBooks: conciliación por calce con reglas, partida doble debajo de todo, informes desde los asientos y candado de período.

## Brechas

| # | Brecha | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| F-1 | **No hay libro contable ni candado de mes.** Existe el plan de cuentas (`CuentaContable.aceptaAsientos`), pero ningún modelo de asiento: los documentos no generan partida doble y no hay cierre contable de período. El único cierre es el semanal del flujo de caja. | `schema/finanzas.prisma` (comentario «asientos (PR 2)»); proyecto Linear «15 · Informes» en backlog | Alta | Decisión de producto primero (ver README): contabilidad propia o entrega ordenada al contador. Si es propia: asientos generados por cada documento y candado de período |
| F-2 | **El estado de pago de las compras no existe aún.** El modelo lo deja para la conciliación bancaria. | Comentario en `DocumentoRecibido` | Media | Completar con la conciliación de egresos (CAR-328 va en esa línea) |
| F-3 | **Las transiciones del documento de venta no están en un solo lugar.** Existe `puedeTransicionDte`, pero solo lo usa un trabajo y no tiene prueba; emisión, notas de crédito, cesión y folios escriben el estado directo. | `packages/domain/src/finanzas/ventas.ts`; `packages/capabilities/src/finanzas/ventas-emision.ts`, `ventas-nc-escritura.ts`, `ventas-cesion-ceder.ts` | Media | Ajustar: toda escritura de estado pasa por la regla del dominio, con prueba de las transiciones |

## En qué se aparta a propósito

- **No se «anula» una factura**: se corrige con nota de crédito, porque lo exige el SII. Correcto.
- **El flujo de caja es una planilla semanal editable**, no un informe derivado: es el modo de trabajo de Gard en 1.0 y decisión de Carlos. Se mantiene; la medida es que se alimente de documentos y movimientos sin doble digitación (Sesión Caja, CAR-269).

## Qué se mantiene tal cual

Programación y proforma, emisión y envío al SII, cobranza con pausa, conciliación con reglas y deshacer, cesión. Están al nivel del referente y adaptadas a Chile.
