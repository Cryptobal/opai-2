---
id: emitir-acteco-emisor
fecha: 2026-11-10
modulo: finanzas
titulo: Emitir al SII pide el ACTECO y los datos de tu empresa
car: CAR-240
permiso: finanzas:ventas.configure
ruta: /finanzas/configuracion-dte
---
En **Finanzas › Configuración DTE** hay un campo nuevo, **ACTECO (actividad económica)**: es el código del SII que va en cada factura. Sin él, el SII rechaza el documento.

Antes de emitir con SimpleAPI, OPAI revisa que tu empresa tenga el ACTECO, la razón social, el giro, la dirección, la comuna y la ciudad. Si falta alguno, te dice cuál y dónde completarlo, y el documento queda sin emitir y sin usar folio.
