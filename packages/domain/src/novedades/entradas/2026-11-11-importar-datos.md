---
id: importar-datos-planilla
fecha: 2026-11-11
modulo: core
titulo: Importa tus clientes desde una planilla Excel o CSV
destacada: true
car: CAR-279
permiso: core:tenant.manage
ruta: /configuracion/importar
---
En **Configuración › Importar datos** puedes cargar **cuentas, contactos, instalaciones y negocios** desde una planilla, sin escribirlos uno por uno.

Eliges qué importar, bajas la plantilla con **Descargar plantilla Excel** (o usas tu propia planilla) y la subes con **Elegir planilla**. OPAI reconoce las columnas por su encabezado y te muestra una tabla para corregir a qué campo va cada una. Antes de guardar ves una **simulación** con cuatro contadores (se crea, se completa, ya estaba igual, con error) y el detalle fila por fila, con el motivo de cada error. Nada se guarda hasta que presionas **Importar**.

Repetir una carga no duplica: una cuenta se reconoce por su RUT, un contacto por su correo dentro de la cuenta y una instalación por su nombre. Tú eliges qué pasa con lo que ya existe: completar solo lo vacío, reemplazar o no tocarlo.

Cada carga queda en **Cargas anteriores** con la fecha, quién la hizo y cuántos registros creó. Con **Revertir** se deshace el lote completo, siempre que esos registros no hayan cambiado después.
