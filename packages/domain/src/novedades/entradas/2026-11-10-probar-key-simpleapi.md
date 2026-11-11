---
id: probar-key-simpleapi
fecha: 2026-11-10
modulo: finanzas
titulo: «Probar conexión» de Emisión DTE ahora comprueba la API key en SimpleAPI
car: CAR-263
permiso: core:integraciones.manage
ruta: /configuracion/integraciones
---
En **Configuración › Integraciones › Emisión DTE**, el botón **Probar conexión** ahora le pregunta a SimpleAPI si reconoce la API key guardada y revisa que el certificado digital abra con su clave. Antes decía «Conexión correcta» sin consultar a SimpleAPI.

Si SimpleAPI no reconoce la key, el aviso lo dice y pide copiarla de nuevo desde el panel de SimpleAPI. La prueba no emite documentos ni usa folios.

Al **emitir**, si SimpleAPI responde sin motivo, el mensaje ya no dice que la key fue aceptada: indica que esa es la respuesta de SimpleAPI a una key que no reconoce y te envía a probarla.
