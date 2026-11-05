# Finanzas — Hoja de alcance

**Estado:** **comentada por Carlos el 4-nov-2026** (respuestas a §5 en el comentario «DECISIÓN CARLOS» de #318, 21:22 CLT); se construye con esto · **Fecha:** 4-nov-2026 · **Autor:** Claude, Sesión 5 (dueña de Finanzas), CAR-189 · **Decisiones:** [ADR-072](../01-decisiones.md) (partes vendibles) y [ADR-073](../01-decisiones.md) (reglas del flujo de caja) · **Diagnóstico completo, parte por parte:** [finanzas-diagnostico.md](finanzas-diagnostico.md)

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
- **Se suma:** partes vendibles; un solo criterio de semana; IVA y PPM proyectados, con postergación del IVA mes a mes; proforma y estado de pago enviados solos en la fecha pactada con el cliente; plantillas de correo por empresa con registro de cada envío; todo también por MCP con vista previa.

## 3. Flujo de caja (prioridad 1, ADR-073)

No hay cierre ni sellado. Mandan la cartola y la proyección; no hay ajuste manual de ingresos (los egresos sí se planifican a mano). Semanas pasadas: todos los movimientos de la cartola por fecha del banco, conciliados o no, con fila «Sin conciliar». El saldo parte del banco de hoy. Futuro: un solo criterio, la fecha esperada de cobro (promedio real de pago del cliente con 3 o más facturas pagadas; si no, el vencimiento; editable por factura); lo vencido pasa a la semana actual. Cedidas: el depósito del factor es el ingreso y la diferencia va a la cuenta configurable (por defecto «Diferencia factoring»); no hay remanente. IVA del mes M en M+1 junto con el PPM; cada mes se puede marcar la postergación del IVA a M+2 (el PPM no se posterga). Un solo umbral de saldo bajo, $15M, que avisa solo por la campana. Cada programación recurrente proyecta una fila por período; cuando ese período ya tiene su borrador o su factura emitida, el flujo muestra esa y oculta la proyección (el cruce es por programación y período, y nunca se ven las dos; CAR-184). Pendiente de una factura = monto − NC parciales (61) − cobrado; la ND (56) no es deuda; lo vencido importado de 1.0 no entra a los recordatorios.

## 4. Orden de construcción propuesto

| # | Bloque | Por qué en este orden |
|---|---|---|
| **0a** | Integrar #306 (pendientes de Octava, ya revisado) y CAR-195: `set_secreto` pide confirmación para reemplazar una credencial y descarta el token de Octava en la misma transacción | Cierra lo que dejó CAR-154 antes de tocar los mismos archivos |
| **0b** | **CAR-191 · Candado de ambiente:** fuera de app.opai.cl, SimpleAPI solo en certificación y Octava sin ceder de verdad; y arreglo de la cesión anulada | Hoy nada impide que test.opai.cl emita en el SII real si una empresa elige producción (al 4-nov ninguna lo tiene en Neon `main`) |
| 1 | Flujo A: cerrar CAR-181 (#246) sobre main e implementar CAR-184 | Base ya hecha, en conflicto |
| 2 | Flujo B: reglas de §3 (criterio único, cartola completa, saldo del banco, factoring, IVA/PPM, umbral único) y la prueba de la conciliación tardía | La prioridad de Carlos |
| 3 | **CAR-196 · Emisión real en certificación:** SimpleAPI de punta a punta y luego cesión con Octava, XML en ISO-8859-1 sin transcodificar (ADR-075), llamada externa fuera de la transacción | Gard necesita facturar y ceder desde 2.0; requiere el candado |
| 3b | Facturación A: ND 56, editar y descartar borradores, NC por borrador | Paridad que Gard usa |
| 4 | Facturación B: PDF con el diseño oficial del SII (PDF417, cedible) | Sin esto no se manda a un cliente real |
| 5 | Envíos A: plantillas por empresa (factura, NC/ND, proforma, estado de pago, cobranza), elegir destinatarios, registro único de envíos | Base de lo automático |
| 6 | Envíos B: en cada programación, fecha pactada para proforma o estado de pago, envío automático, OK del cliente por enlace; referencias y destinatarios de 1.0 | Cierra el ciclo de facturación |
| 7 | Bancos y factoring: pestaña de reglas de conciliación (ADR-074), revisión de movimientos, cuadrar saldo, conciliar el depósito del factor, catálogo de factorings | Paridad con el MCP de 1.0 |
| 8 | Partes vendibles (con Plataforma) · Compras (RCV automático, NC recibidas) · Contabilidad e informes | Después de que Gard opere |

## 5. Decisiones de Carlos (4-nov-2026, comentario en #318)

1. **Partes:** las siete de §1, con Conciliación dentro de Bancos. Rendiciones sigue aparte (ADR-072).
2. **IVA y PPM:** el IVA del mes M se paga en M+1 junto con el PPM; Carlos marca o desmarca, mes a mes, la postergación del IVA a M+2; el PPM siempre en M+1 (ADR-073).
3. **Fecha esperada de cobro:** promedio real de pago del cliente con 3 o más facturas pagadas; si no, el vencimiento; editable a mano por factura (ADR-073).
4. **Factoring:** sin remanente; el depósito del factor es el ingreso y la diferencia va a una cuenta contable configurable por empresa (por defecto «Diferencia factoring» o «Gasto financiero») (ADR-073).
5. **Reglas de conciliación:** se mantienen y funcionan; pestaña en Bancos para crearlas, editarlas, activarlas y desactivarlas; al importar la cartola concilian solas solo con monto y referencia exactos, si no quedan como sugerencia (ADR-074).
