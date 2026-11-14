---
id: compras-estado-pago
fecha: 2026-11-14
modulo: finanzas
titulo: Compras muestra qué está pagado y qué falta pagar
car: CAR-239
permiso: finanzas:read
ruta: /finanzas/compras
---
En **Finanzas › Compras**, cada factura recibida ya no dice «Sin conciliar». Ahora muestra su **estado de pago**:

- **Por pagar**, si todavía no se le asocia ningún pago del banco.
- **Pago parcial**, si se pagó una parte.
- **Pagada**, cuando lo pagado cubre el total.
- **Pago vencido** o **Saldo vencido**, en rojo, si quedó saldo y ya pasó el plazo de pago del proveedor.

En la ficha de la factura aparecen además **Pagado (conciliado con el banco)** y **Saldo por pagar**. La ficha del proveedor muestra el mismo estado en cada compra.

El estado se calcula solo con lo que concilias en **Bancos**: no se marca a mano. Las notas de crédito no llevan estado de pago, porque rebajan la deuda.
