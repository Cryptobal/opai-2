---
id: cuentas-datos-sii
fecha: 2026-11-10
modulo: core
titulo: Cuentas listas para facturar y datos del SII al crearlas
car: CAR-156
permiso: core:cuentas.read
ruta: /cuentas
---
La **lista de Cuentas** ahora muestra en cada fila si la cuenta está **«Lista para facturar»** o cuántos datos le faltan (por ejemplo, giro o dirección tributaria). Pasa el cursor sobre el aviso para ver cuáles.

Al **crear una cuenta con RUT**, OPAI busca sus datos en el SII y te los ofrece en la ficha nueva: eliges campo por campo qué aplicar y nada se cambia sin tu confirmación. La respuesta del SII se guarda unos días para no volver a preguntar cada vez; la ficha dice de cuándo es y puedes **volver a consultar**.

Para que esto funcione, tu empresa necesita la integración **«Datos del SII por RUT»** en Configuración › Integraciones.
