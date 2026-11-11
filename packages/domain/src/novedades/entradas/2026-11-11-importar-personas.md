---
id: importar-personas
fecha: 2026-11-11
modulo: core
titulo: Importar personas con su previsión y su cuenta bancaria
car: CAR-282
permiso: core:personas.manage
ruta: /configuracion/importar
---
En **Configuración › Importar datos**, la lista «Qué importar» ahora incluye **Personas**. Subes una planilla (Excel o CSV) con una fila por trabajador y OPAI carga su ficha, su previsión (AFP, salud, isapre) y su cuenta bancaria.

- Cada persona se reconoce por su **RUT**: si vuelves a subir la misma planilla, no se crea una segunda ficha.
- Antes de guardar ves la simulación, con los errores fila por fila: RUT inválido, previsión incompleta, banco que no se reconoce o cuenta bancaria mal formada.
- El banco se guarda con su código SBIF, el mismo de las nóminas de pago. Si la persona ya tiene una cuenta, la importación no la cambia: eso se hace con «Solicitar cambio» en su ficha.
- Un lote se puede **revertir** desde «Cargas anteriores».
