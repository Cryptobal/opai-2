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
Entra: (a) saldo de apertura por cuenta bancaria a la fecha de corte; (b) cuentas por cobrar: DTE 33/34 emitidos en 1.0 con saldo pendiente a la fecha de corte; (c) último folio usado por tipo (33, 34, 56, 61), para fijar `folio_actual` sin retroceder; (d) conciliación (conteos y sumas de control) y reversión de la corrida.
No entra: histórico de DTE ya pagados, XML/PDF originales, movimientos bancarios históricos, compras, asientos contables (C2 usará este saldo después).

## 4. Arquitectura
- Contrato JSON versionado `finanzas-apertura@1` que produce el exportador de 1.0 (P7): `{ fechaCorte, cuentasBancarias[{banco, numeroVisible, moneda, saldo}], documentosPorCobrar[{tipoDte, folio, rutReceptor, fechaEmision, fechaVencimiento, montoNeto, montoExento, montoIva, montoTotal, montoCobrado, glosa}], ultimosFolios[{tipoDte, ultimoFolio}] }`. Montos en CLP enteros.
- Dominio puro en `packages/domain/src/finanzas/apertura.ts`: validación, plan y sumas de control (sin base).
- Capacidad `finanzas.apertura.importar` (solo personas, `dryRun`, `idempotencyKey`) que ejecuta una corrida en `core.importaciones` con `sistema=opai1`, entidades nuevas `saldo_banco`, `documento_cobrar`, `folio`. Reutiliza `registroEnCorrida`.
- Revertir con la reversión existente (`revertir.ts`), ampliada con las tres entidades.

## 5. Archivos
`packages/domain/src/finanzas/apertura.ts` (+ test); `packages/capabilities/src/finanzas/apertura-*.ts` (plan, aplicar, conciliar, revertir); ampliación de `EntidadImportada`; `docs/2.0/extraccion/finanzas-apertura.md`; ESTADO; ADR.

## 6. Modelo de datos y migraciones (aditivas)
- `movimientos_bancarios.origen` admite `apertura` (CHECK si existe; si no, solo convención y test).
- `documentos_emitidos`: columna `origen_importacion boolean default false` para distinguir lo importado de lo emitido en 2.0 y excluirlo de los libros nuevos y del envío al SII.
- `dte_folios`: sin cambio de esquema; solo sube `folio_actual`.
- Sin tablas nuevas si basta `importaciones_filas`. Prefijo de migración único, `SET LOCAL lock_timeout`; la aplica el operador.

## 7. Capacidades
`finanzas.apertura.importar` (escritura, dryRun, soloPersonas, irreversible → `exigeAprobacion`), `finanzas.apertura.conciliar` (lectura: conteos y sumas 1.0 vs 2.0) y `finanzas.apertura.revertir` (escritura, soloPersonas). Permiso `finanzas:ventas.manage` más `core:importaciones.manage` (según el existente).

## 8. Interfaz
Sin pantalla nueva en este PR: la operan el operador y Carlos por MCP/CLI. La conciliación se muestra en la corrida existente de Configuración si ya hay pantalla; si no, queda como pendiente.

## 9. Seguridad y tenant
Tenant desde la sesión; cuentas bancarias y receptores se resuelven por RUT/número dentro del tenant; nada cross-tenant. Los DTE importados quedan `origen_importacion = true` y nunca se reenvían al SII ni al cliente. Sin datos reales en el repo: fixtures sintéticas.

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
Doble facturación si 1.0 sigue emitiendo tras el corte (mitigación: fecha de corte única y bloqueo de segunda corrida). Rollback: reversión de la corrida; la migración es aditiva.

## 16. Reporte de ejecución
Se completa en el PR.

## Decisiones que necesita Carlos
1. Fecha de corte única de 1.0 → 2.0 (la misma de `fecha_corte_1_0` pendiente).
2. ¿Se importan solo los DTE con saldo pendiente (propuesto) o también los pagados del año en curso?
3. Quién genera el export de 1.0 (P7) y con qué credencial de solo lectura.
