---
id: folios-pausar-config-dte
fecha: 2026-11-10
modulo: finanzas
titulo: Pausar un CAF y configuración DTE que sí se guarda
car: CAR-240
permiso: finanzas:ventas.configure
ruta: /finanzas/folios
---
En **Finanzas › Folios** cada CAF muestra si es de **certificación** o de **producción**, y ahora se puede **pausar** o **reactivar**. Un CAF pausado no se usa para emitir; reactivarlo lo deja tal como estaba.

Al emitir solo se usan CAF activos del mismo ambiente que la configuración DTE. La emisión de prueba (simulada) nunca gasta folios de producción, y si no hay un CAF del ambiente correcto se avisa con claridad.

En **Configuración DTE** ya se guarda el conector SimpleAPI con la resolución N° 0 de certificación y su fecha. Si algo no se puede guardar, la pantalla lo dice y marca el campo.
