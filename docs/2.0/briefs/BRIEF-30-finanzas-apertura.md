# BRIEF-30 · Finanzas: saldos de apertura, cuentas por cobrar y último folio desde 1.0 (CAR-168 · F6)

Rama `brief/car-168-finanzas-apertura` · Origen: auditoría de Finanzas §2.5 y §2.3 (puntos 4 y 8) · Depende de #237 (`core.importaciones`) y de P7 (exportador de 1.0, solo lectura).

## 1. Objetivo
Que al corte de Gard Finanzas arranque con la verdad de 1.0: el saldo de cada cuenta bancaria, los DTE emitidos y no pagados (cuentas por cobrar) y el último folio usado por tipo de documento, de modo que **no se reutilicen folios** y la cobranza (F4) y el flujo de caja (F0) partan correctos. Una sola corrida identificada, reversible y conciliada con conteos y sumas de control.

## 2. Estado actual (verificado)
- `core.importaciones` e `importaciones_filas` (#237) registran corridas y filas con acción `creado | completado | sin_cambio | omitido` y `previos` para revertir. El código vive en `packages/db/scripts/importar-opai1/**` y la capacidad `comercial.importar_1_0`.
- `finanzas.cuentas_bancarias` guarda banco, número visible y moneda; el saldo no es una columna: se deriva de `movimientos_bancarios` (`monto`, `saldo_despues`, `origen` = `cartola | manual | web4leads`).
- `finanzas.documentos_emitidos` guarda el DTE con `estado_dte`, `estado_cobro`, `monto_cobrado`; F4 deriva la cobranza de ahí (tipos 33/34, estados `enviado`/`aceptado`).
- `finanzas.dte_folios` tiene `folio_actual` (próximo a consumir) por rango CAF. Sin CAF cargado no se puede emitir.
- Ningún importador contempla Finanzas.

## 3. Alcance
Entra (decisión de Carlos, 4-nov-2026: «se trae todo»): (a) saldo de apertura por cuenta bancaria a la fecha del export; (b) **todos** los DTE emitidos en 1.0 (33, 34, 56, 61), pagados o no, a nivel de cabecera con su estado de cobro y monto cobrado (las cuentas por cobrar salen de ahí); (c) último folio usado por tipo (33, 34, 56, 61), para fijar `folio_actual` sin retroceder; (d) conciliación (conteos y sumas de control) y reversión de la corrida.
No entra: líneas, XML y PDF originales de los DTE históricos, movimientos bancarios históricos, compras, asientos contables (C2 usará este saldo después).

## 4. Arquitectura
- Contrato JSON versionado `finanzas-apertura@1` que produce el exportador de 1.0 (P7): `{ fechaCorte, cuentasBancarias[{banco, numeroVisible, moneda, saldo}], documentosPorCobrar[{tipoDte, folio, rutReceptor, fechaEmision, fechaVencimiento, montoNeto, montoExento, montoIva, montoTotal, montoCobrado, glosa}], ultimosFolios[{tipoDte, ultimoFolio}] }`. Montos en CLP enteros.
- Dominio puro en `packages/domain/src/finanzas/apertura.ts`: validación, plan y sumas de control (sin base).
- Capacidad `finanzas.apertura.importar` (solo personas, `dryRun`, `idempotencyKey`) que ejecuta una corrida en `core.importaciones` con `sistema=opai1`, entidades nuevas `saldo_banco`, `documento_cobrar`, `folio`. Reutiliza `registroEnCorrida`.
- Revertir con la reversión existente (`revertir.ts`), ampliada con las tres entidades.

## 5. Archivos
`packages/domain/src/finanzas/apertura.ts` (+ test); `packages/capabilities/src/finanzas/apertura-*.ts` (plan, aplicar, conciliar, revertir); ampliación de `EntidadImportada`; `docs/2.0/extraccion/finanzas-apertura.md`; ESTADO; ADR.

## 6. Modelo de datos y migraciones (aditivas)
- `movimientos_bancarios.origen` admite `apertura` (CHECK si existe; si no, solo convención y test).
- **Sin migración (decidido en la implementación):** `movimientos_bancarios.origen` tiene un CHECK que no admite «apertura», y lo importado se identifica por `core.importaciones_filas` (entidad `documento_cobrar`), así que no se agrega columna. Los saldos usan origen `manual`, `claveDedupe` `apertura:<corrida>` y estado `ignorado`.
- `dte_folios`: sin cambio de esquema; solo sube `folio_actual`.
- Sin tablas nuevas si basta `importaciones_filas`. Prefijo de migración único, `SET LOCAL lock_timeout`; la aplica el operador.

## 7. Capacidades
`finanzas.apertura.importar` (escritura, dryRun, soloPersonas, irreversible → `exigeAprobacion`), `finanzas.apertura.conciliar` (lectura: conteos y sumas 1.0 vs 2.0) y `finanzas.apertura.revertir` (escritura, soloPersonas). Permiso `finanzas:ventas.manage` más `core:importaciones.manage` (según el existente).

## 8. Interfaz
Sin pantalla nueva en este PR: la operan el operador y Carlos por MCP/CLI. La conciliación se muestra en la corrida existente de Configuración si ya hay pantalla; si no, queda como pendiente.

## 9. Seguridad y tenant
Tenant desde la sesión; cuentas bancarias y receptores se resuelven por RUT/número dentro del tenant; nada cross-tenant. Los DTE importados quedan `aceptado` sin XML y se identifican por `importaciones_filas`; el bloqueo explícito de reenvío al SII/cliente queda como pendiente (ESTADO). Sin datos reales en el repo: fixtures sintéticas.

## 10. Casos límite
- Receptor sin cuenta en 2.0: se omite con aviso (no se crea cuenta fantasma).
- Folio duplicado de un documento ya existente: `sin_cambio`.
- Último folio menor que el `folio_actual` actual: no retrocede, avisa.
- Cuenta bancaria inexistente: se omite con aviso; el saldo no se inventa.
- Diferencia entre suma de saldos por cobrar y control de 1.0: la corrida queda `fallida` y no aplica.
- Segunda corrida después del corte: bloqueada salvo reversión previa.

## 11. Plan por bloques
1) Extracción de 1.0 (solo lectura) y contrato `finanzas-apertura@1`. 2) Dominio (validación, plan, sumas) con tests. 3) Aplicar saldos, por cobrar y folios en corrida. 4) Conciliación y reversión. 5) Capacidades, paridad MCP y fixtures. 6) ESTADO/ADR.

## 12. Tests
Dominio (sumas, plan, casos límite); db: corrida completa, idempotencia, reversión que deja el estado previo, dos empresas, folio que no retrocede.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build`, `pnpm presupuesto`. Ensayo en rama de Neon: simular → aplicar → conciliar → revertir → reaplicar.

## 14. Criterios de aceptación
Saldos, por cobrar y folios importados coinciden con las sumas de control de 1.0; la cobranza (F4) y el flujo de caja ven las cuentas por cobrar; no se puede emitir con un folio ya usado en 1.0; revertir deja el tenant como estaba.

## 15. Riesgos y rollback
Doble facturación si 1.0 sigue emitiendo tras el corte (mitigación: fecha de corte única y bloqueo de segunda corrida). Rollback: `finanzas.apertura.revertir` (se niega entera si hay cobros, gestiones, cesiones o conciliaciones). Sin migración.

## 16. Reporte de ejecución
Se completa en el PR.

## Decisiones de Carlos (4-nov-2026)
1. Sin fecha de corte parcial: se trae todo; el saldo de apertura queda fechado al momento del export y el corte operativo (`fecha_corte_1_0`) lo fija quien aplica.
2. Se importan todas las facturas, pagadas y no pagadas.
3. Origen: el endpoint de 1.0 `/api/export/opai2/v1/[recurso]` (opai #1364), con una API key MCP de 1.0 con scope `READ` (la crea Carlos; `OPAI1_EXPORT_URL` y `OPAI1_EXPORT_KEY`).

## Hallazgo: el exportador v1 no cubre F6 completo
Recursos de `opai1-export/v1`: cuentas, contactos, instalaciones, etapas, negocios, actividades, cotizaciones, correlativos, recurrentes y **folios** (último folio por tipo, ya cubierto). **Faltan dos recursos**: `documentos` (FinanceDte emitidos con tipo, folio, receptor, fechas, montos, estado y monto cobrado) y `saldos_bancarios` (saldo por cuenta). Hay que pedirlos a Opai Producto (1.0) como extensión del contrato (`opai1-export/v1` con dos recursos más, solo lectura). Mientras tanto se construye contra fixtures.

## Decisiones que necesitaba Carlos (resueltas)
1. Fecha de corte única de 1.0 → 2.0 (la misma de `fecha_corte_1_0` pendiente).
2. ¿Se importan solo los DTE con saldo pendiente (propuesto) o también los pagados del año en curso?
3. Quién genera el export de 1.0 (P7) y con qué credencial de solo lectura.

## Diferencias respecto del brief original (implementación)
- No existe `finanzas.apertura.conciliar`: la conciliación (sumas de control 1.0 vs 2.0) es parte del resultado de `importar` (también en `dryRun`).
- Si hay filas rechazadas (RUT sin cuenta, banco inexistente, moneda distinta, tipo sin CAF) no se aplica nada salvo `aceptarRechazos: true`. Repetir la carga es idempotente (no hay bloqueo de segunda corrida: lo ya cargado queda «sin cambio»).
- `soloPersonas` impide que un agente la ejecute, por lo que no usa `exigeAprobacion`. Permiso: `finanzas:ventas.configure`.
- La reversión se niega si hay cobros/gestiones/cesiones/envíos, conciliaciones o movimientos bancarios posteriores en la cuenta.
- **Revertir nunca baja el folio** (Revisor B1): lo emitido por 1.0 ante el SII sigue usado aunque se deshaga la carga; el folio solo avanza.
- Decisiones de Carlos (4-nov): las facturas importadas quedan fuera de los recordatorios automáticos de cobranza (filtro en `cobranza-trabajo.ts`, con test); la ND (56) no cuenta como deuda (anula una NC; la deuda es la factura vigente).
- Pendientes no bloqueantes del Revisor: bloqueos con motivo para envíos al cliente y programaciones en la reversión, tests de rechazo a agentes.
