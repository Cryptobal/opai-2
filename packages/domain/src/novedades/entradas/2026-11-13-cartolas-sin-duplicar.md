---
id: cartolas-sin-duplicar
fecha: 2026-11-13
modulo: finanzas
titulo: Las cartolas ya no duplican lo que entró por la sincronización
car: CAR-341
ruta: /finanzas/bancos/importaciones
---
Al subir una cartola en **Bancos › Movimientos**, OPAI reconoce los movimientos que ya tenías, aunque hayan entrado por la sincronización con el banco o con otra fecha. En la vista previa salen como duplicados, con el motivo, y no se cargan dos veces. Si la cartola trae otra fecha, queda la fecha de la cartola.

En **Bancos › Importaciones** hay una sección nueva para **borrar por fechas** los movimientos de la sincronización: primero ves cuántos son y después confirmas. Los movimientos conciliados no se borran.

El saldo de cada cuenta ahora dice de dónde sale: informado por el banco, del último movimiento o del cierre de la cartola más los movimientos posteriores.
