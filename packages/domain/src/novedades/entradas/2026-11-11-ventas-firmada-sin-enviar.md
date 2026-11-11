---
id: ventas-firmada-sin-enviar
fecha: 2026-11-11
modulo: finanzas
titulo: Ventas distingue firmado de enviado al SII, filtra por tipo y no cobra las notas
car: CAR-270
permiso: finanzas:ventas.manage
ruta: /finanzas/ventas
---
En **Finanzas › Ventas**, un documento que ya tiene folio y firma pero todavía no se transmite al SII aparece como **«Firmada, sin enviar al SII»**. Antes decía «Enviada al SII» aunque el SII aún no lo había recibido.

El botón **Enviar al SII** ahora también aparece en una factura o nota de crédito que ya fue anulada por una nota de crédito o de débito, mientras no se haya transmitido. El SII necesita recibir el documento original para aceptar la nota que lo anula. Y si el SII lo acepta después, el documento sigue figurando como anulado.

En el libro de ventas, la columna **Documento** muestra el tipo en corto («Factura 103», «Nota de crédito 103», «Nota de débito 101») y hay un filtro nuevo **Tipo**. El filtro **Estado** suma Rechazadas y Anuladas por nota de crédito.

Las notas de crédito, las notas de débito y las facturas anuladas ya no aparecen «Por cobrar»: solo una factura vigente se cobra o se cede.

Hay un nuevo filtro **Orden**: más recientes (por defecto), más antiguas, mayor o menor monto y tipo de documento. La fecha de emisión se muestra como día-mes-año.
