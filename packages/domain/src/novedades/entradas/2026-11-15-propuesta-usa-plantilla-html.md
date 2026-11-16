---
id: propuesta-usa-plantilla-html
fecha: 2026-11-15
modulo: cpq
titulo: La propuesta técnica sale de tu plantilla HTML con las secciones del armador
car: CAR-533
ruta: /configuracion/modulo/cpq?seccion=marca-plantillas
---
La **propuesta técnica** (vista previa y PDF) sale siempre de un solo documento: tu **plantilla HTML en uso** (Configuración › CPQ › Marca y plantillas) o, si no tienes una, una plantilla base de OPAI. Lleva el membrete con tu logo, la tipografía y el pie de tu marca.

El marcador **{{secciones}}** pone ahí las secciones activas del armador, en su orden, con título y texto (el que escribiste o el texto tipo de la biblioteca), el índice y los capítulos por instalación. Una sección activa sin texto no aparece. Si tu plantilla no trae el marcador, las secciones van al final. Además puedes usar marcadores de empresa, negocio y cotización, **{{#cada puestos}}**, **{{tabla_servicio}}** y **{{resumen_economico}}**, con montos en pesos y fechas dd-mm-aaaa. El prompt para IA que se copia desde Configuración explica todo esto.

Al **enviar** la propuesta queda guardada la versión de la plantilla y de los textos que se usaron: si después los cambias, lo enviado no cambia.
