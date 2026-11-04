# Finanzas — Hoja de alcance

**Estado:** **para comentarios de Carlos** (no se construye hasta que comente) · **Fecha:** 4-nov-2026 · **Autor:** Claude, Sesión 5 (dueña de Finanzas), CAR-189 · **Decisiones:** [ADR-072](../01-decisiones.md) (partes vendibles) y [ADR-073](../01-decisiones.md) (reglas del flujo de caja) · **Diagnóstico completo, parte por parte:** [finanzas-diagnostico.md](finanzas-diagnostico.md)

1.0 es el piso, no el techo. Finanzas sigue siendo **un solo módulo**, con siete partes que se pueden contratar por separado.

## 1. Las partes y lo que se vende

| Parte | Qué incluye | Necesita | Estado hoy en 2.0 |
|---|---|---|---|
| **Bancos** | Cuentas, cartola (archivo y Web4Leads), movimientos, conciliación contra categorías y contra ventas o compras si están contratadas | — | Funciona; falta revisar, autorizar e ignorar movimientos, cuadrar saldo y duplicados |
| **Flujo de caja** | Planilla semanal: pasado según cartola, futuro según proyección | Bancos | Funciona con reglas viejas; hay que rehacer el criterio (§3) |
| **Ventas y facturación** | Borradores, emisión DTE, NC y ND, PDF, folios, programaciones y recurrentes, cierre de mes, envíos y plantillas de correo | — | Emite y envía; faltan ND, editar borrador, PDF oficial, proforma y estado de pago |
| **Cobranza** | Aging, recordatorios, gestiones, ficha del deudor | Ventas | Funciona (apagada por defecto) |
| **Factoring** | Simular y ceder con Octava, seguimiento, abono y costo del factor | Ventas | Cede; no concilia el abono ni registra el costo; un bug al anular |
| **Compras** | Libro de compras, proveedores, RCV, centros de costo | — | Funciona; falta RCV automático y NC recibidas |
| **Contabilidad e informes** | Plan de cuentas, asientos, resultados, balance, libros IVA | Ventas o Compras | Solo plan de cuentas y un resultado de caja por MCP |

Rendiciones es un módulo aparte (ADR-069) y lo lleva la Sesión 2. El precio y el cobro de cada parte los pone Plataforma (ADR-071, en el PR #314 de la Sesión 6; CAR-188), no esta sesión. Una parte sin contratar no aparece en el menú, ni en el MCP, ni en «Hoy»; lo que cruza partes (conciliar una factura, proyectar ventas en el flujo) solo aparece si las dos están contratadas.

## 2. Qué pasa de 1.0, qué no, y qué se suma

- **Pasa:** todo lo que Gard usa a diario en 1.0: cartola y conciliación, emisión, NC y **ND**, borradores editables y descartables, recurrentes, cierre de mes con seguimiento, cesión con Octava, cobranza, compras con RCV, resultados y balance.
- **No pasa:** el sellado semanal del flujo, el ajuste manual de ingresos, los recordatorios contados desde la proforma (se cuentan desde el vencimiento, ADR-062), Fintoc directo (va por Web4Leads, ADR-065).
- **Se suma:** partes vendibles; un solo criterio de semana; IVA diferido y PPM proyectados; proforma y estado de pago enviados solos en la fecha pactada con el cliente; plantillas de correo por empresa con registro de cada envío; todo también por MCP con vista previa.

## 3. Flujo de caja (prioridad 1, ADR-073)

No hay cierre ni sellado. Mandan la cartola y la proyección; no hay ajuste manual de ingresos (los egresos sí se planifican a mano). Semanas pasadas: todos los movimientos de la cartola por fecha del banco, conciliados o no, con fila «Sin conciliar». El saldo parte del banco de hoy. Futuro: un solo criterio, la fecha esperada de cobro; lo vencido pasa a la semana actual. Cedidas: el anticipo es ingreso y el costo va a «Costo factoring». IVA diferido 2 meses y movible a mano; PPM por empresa. Un solo umbral de saldo bajo, $15M, que avisa solo por la campana. Pendiente de una factura = monto − NC parciales (61) − cobrado; la ND (56) no es deuda; lo vencido importado de 1.0 no entra a los recordatorios.

## 4. Orden de construcción propuesto

| # | Bloque | Por qué en este orden |
|---|---|---|
| **0** | **Candado de ambiente:** fuera de app.opai.cl, SimpleAPI solo en certificación y Octava sin ceder de verdad; y arreglo de la cesión anulada | **Hoy nada impide que test.opai.cl emita en el SII real** si en Configuración DTE se eligen SimpleAPI y «producción» con el certificado cargado (solo `NODE_ENV=test` o `SII_ADAPTADOR`/`CESION_ADAPTADOR=simulado` fuerzan el simulado; nada mira el dominio). No cambia el alcance: lo hago primero |
| 1 | Flujo A: cerrar CAR-181 (#246) sobre main e implementar CAR-184 | Base ya hecha, en conflicto |
| 2 | Flujo B: reglas de §3 (criterio único, cartola completa, saldo del banco, factoring, IVA/PPM, umbral único) y la prueba de la conciliación tardía | La prioridad de Carlos |
| 3 | Facturación A: ND 56, editar y descartar borradores, NC por borrador, emisión fuera de la transacción | Paridad que Gard usa |
| 4 | Facturación B: PDF con el diseño oficial del SII (PDF417, cedible) | Sin esto no se manda a un cliente real |
| 5 | Envíos A: plantillas por empresa (factura, NC/ND, proforma, estado de pago, cobranza), elegir destinatarios, registro único de envíos | Base de lo automático |
| 6 | Envíos B: en cada programación, fecha pactada para proforma o estado de pago, envío automático, OK del cliente por enlace; referencias y destinatarios de 1.0 | Cierra el ciclo de facturación |
| 7 | Bancos y factoring: revisión de movimientos, cuadrar saldo, conciliar el abono del factor, catálogo de factorings | Paridad con el MCP de 1.0 |
| 8 | Partes vendibles (con Plataforma) · Compras (RCV automático, NC recibidas) · Contabilidad e informes | Después de que Gard opere |

## 5. Decisiones de Carlos

1. **Partes:** ¿las siete de §1, con Conciliación dentro de Bancos? (Plataforma las listó separadas.)
2. **IVA y PPM:** propongo IVA del mes M (débito − crédito) pagado el día de IVA del mes M+2, y PPM (tasa por empresa sobre ventas netas) el mismo día del mes M+1, porque el PPM no se posterga. ¿Correcto?
3. **Fecha esperada de cobro:** el vencimiento de la factura (emisión + plazo del cliente). ¿O prefieres el promedio real de pago de cada cliente cuando exista historia?
4. **Remanente del factor:** lo que el factor devuelve al vencimiento, ¿se proyecta como ingreso en esa fecha?
5. **Reglas de conciliación** guardadas y no evaluadas (pregunta abierta desde CAR-169): ¿se evalúan al importar o se retiran?
