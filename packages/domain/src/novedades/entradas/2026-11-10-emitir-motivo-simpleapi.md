---
id: emitir-motivo-simpleapi
fecha: 2026-11-10
modulo: finanzas
titulo: Emitir con SimpleAPI muestra el motivo si algo falla
car: CAR-242
permiso: finanzas:ventas.manage
ruta: /finanzas/ventas
---
Si SimpleAPI no puede firmar una factura, al **confirmar la emisión** ahora ves el motivo (por ejemplo, el dato que rechazó) en vez de un error genérico. La factura sigue como borrador y el folio no se gasta, así que puedes corregir y volver a intentar.

La **vista previa** de la emisión indica el folio que se asignaría, el proveedor (SimpleAPI o simulado) y el ambiente (certificación o producción). La vista previa nunca firma ni envía nada al SII.
