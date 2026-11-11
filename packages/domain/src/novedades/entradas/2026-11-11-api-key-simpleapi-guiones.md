---
id: api-key-simpleapi-guiones
fecha: 2026-11-11
modulo: core
titulo: La API key de SimpleAPI se guarda con guiones
car: CAR-240
permiso: core:integraciones.manage
ruta: /configuracion/integraciones/dte_emision
---
En **Configuración › Integraciones › Emisión DTE**, bajo el campo **API key SimpleAPI**, ahora se indica el formato esperado: cinco grupos de cuatro caracteres separados por guiones (XXXX-XXXX-XXXX-XXXX-XXXX), tal como la muestra el panel de SimpleAPI.

Si pegas la key sin guiones, no se guarda: aparece un aviso en rojo bajo el campo y lo que escribiste queda ahí para que lo corrijas. Sin los guiones, SimpleAPI rechaza la emisión de facturas.
