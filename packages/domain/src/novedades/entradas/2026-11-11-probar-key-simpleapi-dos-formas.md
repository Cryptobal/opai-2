---
id: probar-key-simpleapi-dos-formas
fecha: 2026-11-11
modulo: finanzas
titulo: «Probar conexión» de Emisión DTE ya no rechaza una API key válida
car: CAR-263
permiso: core:integraciones.manage
ruta: /configuracion/integraciones
---
En **Configuración › Integraciones › Emisión DTE**, **Probar conexión** prueba la API key de SimpleAPI de las dos formas que SimpleAPI acepta, y solo dice que no la reconoce si ambas fallan. Ya no se compara el largo de la key con un ejemplo: una key de 20 caracteres es válida.

Al **emitir**, si SimpleAPI rechaza sin motivo, el mensaje dice si la key está bien y lo rechazado es el contenido (certificado, CAF o datos de la factura), o si la key no se reconoce. Si no puede saberlo, nombra las dos posibilidades.
