---
id: cartola-cuadratura
fecha: 2026-11-12
modulo: finanzas
titulo: La cartola Santander se importa solo si cuadra
car: CAR-341
permiso: finanzas:bancos.gestionar
ruta: /finanzas/bancos
---
Al **subir una cartola Santander** en **Finanzas › Bancos**, la vista previa ahora te dice si **cuadra**: saldo inicial más los movimientos debe dar el saldo final de la cartola. Si no cuadra, te muestra la diferencia y el botón **Importar** queda bloqueado.

Se leen solo los movimientos del detalle: el **resumen de comisiones** y los **saldos diarios** del final de la cartola ya no se importan como movimientos.

Las filas que no se pueden leer aparecen primero, con el motivo (por ejemplo, una fecha que no tiene el formato dd/mm/aaaa).
