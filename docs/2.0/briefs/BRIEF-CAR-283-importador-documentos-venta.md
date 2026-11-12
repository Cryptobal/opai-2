# BRIEF CAR-283 · Importador de facturas y notas emitidas

**Pedido:** Carlos, 11-nov-2026 (épica CAR-279; condición 4 de ADR-099 para pasar la facturación de Gard a producción). Lo construye la «Sesión Proyecto».

## 1. Objetivo
Cargar el historial de facturas (33, 34), notas de crédito (61) y notas de débito (56) ya emitidas, desde CSV o Excel, en el libro de ventas de la empresa. Sirve para cualquier cliente que llegue a OPAI y para traer los documentos de Gard desde OPAI 1.

## 2. Estado actual (verificado)
- Motor común de importación (CAR-280) con importadores de Comercial, Personas y Contratos. No había importador de documentos de venta.
- La apertura de 1.0 (CAR-168) carga solo facturas por cobrar y deja lo cobrado como base en `previos.cobradoApertura`; la cobranza la deja fuera por la corrida `finanzas-apertura@1`.
- El exportador de OPAI 1 no trae documentos: la fuente es una planilla (por ejemplo, el detalle del Registro de Ventas del SII).

## 3. Alcance
- Importador `documentos_venta` sobre el motor: plantilla, mapeo (incluye los encabezados del RCV del SII), simulación fila por fila, lote reversible, auditoría y MCP (mismo `core.importar.*`).
- Requiere Finanzas activo y el permiso `finanzas:ventas.manage`.
- **No** llama al SII, no firma, no crea envíos y no toca los CAF.

## 4. Reglas
- Se reconoce por tipo + folio. Si ya existe en OPAI, la fila queda «sin cambios»: un documento emitido no se reescribe.
- El receptor se busca entre las cuentas (RUT, id externo o nombre exacto). Sin cuenta, la fila no se carga: hay que importar primero las cuentas.
- Neto + exento + IVA debe sumar el total. Sin desglose, se calcula desde el total (exenta: todo exento; afecta: 19 %).
- Lo ya cobrado en el origen queda como base del saldo en la fila del lote (`previos.cobradoApertura`), igual que la apertura: así no se pierde cuando después se concilian cobros.
- Los documentos importados quedan fuera de los recordatorios de cobranza y de «Hoy en Finanzas» (deuda histórica).
- Una nota que indica tipo y folio de su documento queda vinculada (también si ese documento viene antes en la misma planilla). Sin referencia, queda sin vínculo y se avisa.
- Un folio dentro de un rango de CAF todavía sin usar se avisa: esa emisión futura fallaría.
- Revertir el lote borra los documentos creados, salvo los que ya tienen cobros conciliados, cesiones, envíos, gestiones de cobranza, notas emitidas en OPAI o fecha de cobro esperada.

## 5. Archivos
`packages/capabilities/src/core/importar/ventas.ts`, `ventas-campos.ts`, `tipos.ts`, `aplicar.ts`, `registro.ts`, `esquemas.ts`; `packages/capabilities/src/finanzas/cobros-origen.ts`, `cobros.ts`, `cobranza-datos.ts`.

## 6. Modelo de datos
Sin migración: usa `finanzas.documentos_emitidos` y `core.importaciones_filas`. El motor ahora acepta que un importador deje datos propios en `previos` al crear.

## 7. Pruebas
`core-importar-ventas-db.test.ts` (módulo inactivo, simulación, importación sin SII, no duplica, aislamiento entre empresas, saldo con lo cobrado, fuera de cobranza, reversión). `importar-ventas.spec.ts` `@preview` (solo simula).

## 8. Pendiente
- Cargar los documentos de Gard: Carlos (o la sesión, con su OK) exporta el libro de ventas de OPAI 1 o el RCV del SII e importa primero las cuentas.
- Líneas de detalle de cada documento: no se importan (el libro de ventas y la cobranza usan los totales).
