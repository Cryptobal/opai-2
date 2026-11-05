# BRIEF-37 · Flujo de caja B1: saldo desde el banco y «Sin conciliar» (CAR-193, PR 2 de 4)

**Rama:** `brief/car-193-flujo-b-cartola-proyeccion` · **Migración de datos** (sin tablas nuevas) · Reglas: [ADR-073](../01-decisiones.md) 3, 4 y 12, más los datos que dejó pendientes el PR A ([BRIEF-36](BRIEF-36-finanzas-flujo-a-sin-sellado.md)). Siguen: B2 (fecha esperada de cobro, NC y ND, programadas) y C (factoring, IVA y PPM, interfaz).

## Qué cambia
1. **Semanas pasadas = toda la cartola (regla 3).** Los movimientos con estado distinto de «ignorado» suman por fecha del banco. Lo conciliado va a la fila de su documento; **lo no conciliado va a las filas del sistema «Sin conciliar (ingresos)» y «Sin conciliar (egresos)»** (antes se mezclaba con «Sin clasificar»); lo conciliado sin fila propia sigue cayendo en «Sin clasificar». El total de una semana pasada es siempre la suma de su cartola.
2. **El saldo parte del banco de hoy (regla 4).** `serieSaldos` ancla la serie en la semana en curso: apertura = saldo del banco (suma de las cuentas activas, cada una con su último saldo de Web4Leads o de cartola) − lo ya movido esta semana. Las semanas pasadas se calculan hacia atrás con la cartola y las futuras hacia adelante con la proyección. Planilla, aviso semanal y vista previa de «Reprogramar» usan esta única serie. Sin saldo de banco en ninguna cuenta, cae al saldo inicial de los ajustes (como antes). `planilla.obtener` devuelve `saldoBanco` (`fuente`, `saldo`, `cuentasSinSaldo`) y la pantalla avisa «Sin saldo en cartola para: …» o «El saldo no parte del banco».
3. **Conciliación tardía (regla 12).** Test de base: conciliar un movimiento después de que su semana pasó no cambia los totales de ninguna semana ni su saldo; solo mueve el monto de «Sin conciliar» a la fila de su documento.
4. **Datos pendientes del PR A.** La migración `20261107100000_finanzas_flujo_umbral_unico_y_permiso_cierre` lleva a 15.000.000 y aviso activo los ajustes que seguían en el defecto viejo (cambia también el defecto de las columnas) y quita `finanzas:flujo.cerrar` de roles, keys y excepciones. Exige un rol con BYPASSRLS o superusuario y verifica el resultado (FORCE RLS). Reversión: ver el archivo.

## Pruebas
Dominio y módulo existentes en verde; `finanzas-flujo-saldo-banco-db.test.ts` (saldo anclado con una cuenta sin saldo, «Sin conciliar», conciliación tardía); el test de Paridad 4 de bancos ahora exige «Sin conciliar».

## Pendiente
- `ajustes.saldoInicial` y `ajustes.desde` quedan como respaldo; su retiro y el de las columnas huérfanas se deciden después.
- La semana en curso mezcla lo ya movido (cartola) con la proyección completa de la semana: la apertura resta lo ya movido para no contarlo dos veces.
