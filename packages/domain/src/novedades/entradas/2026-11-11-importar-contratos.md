---
id: importar-contratos
fecha: 2026-11-11
modulo: core
titulo: Importar los contratos vigentes de tu gente
car: CAR-282
permiso: core:vinculos.manage
ruta: /configuracion/importar
---
En **Configuración › Importar datos**, la lista «Qué importar» ahora incluye **Contratos vigentes**. Subes una planilla con una fila por contrato (RUT, cargo, instalación, tipo, fechas, horas y distribución de la jornada) y OPAI lo deja cargado en la ficha de cada persona.

- La persona se reconoce por su **RUT** y debe existir: importa primero «Personas». El cargo y la instalación se reconocen por su nombre.
- Reimportar la misma planilla no duplica contratos. Si cambian las horas, la distribución, el tipo o el término, la importación puede actualizarlos; el cargo y la instalación de un contrato ya cargado no se cambian por aquí (eso es un anexo).
- Cada persona puede tener **un solo contrato vigente**. Un contrato con fecha de término pasada se carga como terminado, como parte de su historial.
- Antes de guardar ves la simulación con el motivo de cada error, y el lote se puede **revertir** desde «Cargas anteriores».
- Solo los usuarios owner y admin pueden importar contratos, igual que al crearlos a mano.
