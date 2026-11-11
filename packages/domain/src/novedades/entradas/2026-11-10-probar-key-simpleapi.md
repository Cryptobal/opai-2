---
id: probar-key-simpleapi
fecha: 2026-11-10
modulo: finanzas
titulo: «Probar conexión» de Emisión DTE ahora comprueba la API key en SimpleAPI
car: CAR-263
permiso: core:integraciones.manage
ruta: /configuracion/integraciones
---
En **Configuración › Integraciones › Emisión DTE**, el botón **Probar conexión** ahora consulta a SimpleAPI por la API key guardada y muestra lo que respondió: cuántas suscripciones informa para esa key y el código de respuesta de cada forma de autenticación. También revisa que el certificado digital abra con su clave. No emite documentos ni usa folios.

Si SimpleAPI no informa ninguna suscripción, el aviso lo dice tal cual, sin asumir que la key está mal copiada.

Al **emitir**, cuando SimpleAPI rechaza sin decir el motivo, OPAI repite la petición con la otra forma de autenticación que SimpleAPI admite. Con eso la factura sale o el mensaje de error trae el motivo que entregó SimpleAPI.
