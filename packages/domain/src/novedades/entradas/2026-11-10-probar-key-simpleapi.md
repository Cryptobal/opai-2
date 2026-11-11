---
id: probar-key-simpleapi
fecha: 2026-11-10
modulo: finanzas
titulo: «Probar conexión» de Emisión DTE ahora comprueba la API key en SimpleAPI
car: CAR-263
permiso: core:integraciones.manage
ruta: /configuracion/integraciones
---
En **Configuración › Integraciones › Emisión DTE**, el botón **Probar conexión** revisa que el certificado digital abra con su clave y muestra, a modo informativo, lo que respondió SimpleAPI sobre la API key guardada (código de respuesta de cada forma de autenticación y número de suscripciones). No emite documentos ni usa folios.

Ese dato de SimpleAPI es solo informativo: ya no deja la integración «Con error» ni hace aparecer el aviso «Suba el certificado .pfx» en la factura cuando el certificado está vigente.

Al **emitir**, cuando SimpleAPI rechaza sin decir el motivo, OPAI repite la petición con la otra forma de autenticación que SimpleAPI admite. Si SimpleAPI responde «API KEY Incorrecta», el mensaje de error lo dice tal cual.
