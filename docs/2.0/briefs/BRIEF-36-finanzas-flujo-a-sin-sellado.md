# BRIEF-36 · Flujo de caja A: sin sellado, sin ajuste manual de ingresos, umbral único (CAR-193, PR 1 de 3)

**Rama:** `brief/car-193-flujo-a-sin-sellado` · **Sin migración** · Reglas: [ADR-073](../01-decisiones.md) y [hoja de alcance](../modulos/finanzas.md) §3. Los PR 2 (cartola completa, saldo del banco, fecha esperada de cobro) y 3 (factoring, IVA y PPM, interfaz) vienen apilados sobre este.

## Qué cambia
1. **Sin cierre ni sellado (regla 1).** Fuera el permiso `finanzas:flujo.cerrar`, los eventos `finanzas.flujo.semana_sellada` y `finanzas.flujo.semana_reabierta`, la tolerancia de cierre (`toleranciaCierre` en los ajustes, `TOLERANCIA_CIERRE_CLP` y `evaluarCierre`) y el lenguaje de «sugerencia al sellar» de `finanzas.bancos.saldo_sugerido` (se conserva: es la base del saldo del banco de hoy). La tabla `FlujoCierre` y las columnas no se tocan.
2. **Sin ajuste manual de ingresos (regla 2).** `finanzas.celdas.fijar` (también en vista previa), `finanzas.celdas.cumplir` y `finanzas.flujo.importar` rechazan filas de ingresos («Los ingresos no se ajustan a mano…»); la importación lo informa por fila y no aplica nada. Los egresos se siguen planificando a mano.
3. **Un solo umbral de saldo bajo (regla 9).** `umbral` es el único: planilla, aviso semanal (`aviso.ts`) y aviso de banco (`bancos/aviso-banco.ts`), por defecto **$15.000.000** y avisa solo por la campana. Se retira `avisoUmbral` de los ajustes, de la lectura y del editor de Configuración; el aviso queda activo por defecto.
4. **«Hoy en Finanzas» (regla 11).** Las facturas vencidas importadas de 1.0 (apertura) no cuentan entre los recordatorios que tocan; el helper `idsDeApertura` lo comparte con el trabajo diario de cobranza.

## Pruebas
Módulo: rechazo de ingresos en fijar y cumplir (con y sin vista previa), error de fila en el CSV, los tests de egresos adaptados. Base: importar rechaza ingresos sin aplicar nada ni cambiar ajustes; «Hoy en Finanzas» no cuenta lo importado (falla sin el filtro).

## Pendiente (siguientes PR)
- Las filas de ingresos que ya tienen celdas planificadas a mano quedan como están; el PR 2 las sustituye por la proyección.
- Las empresas con ajustes ya guardados conservan su `umbral` actual: llevar el valor a 15.000.000 es un cambio de datos que va con la migración del PR 2 (verificando filas afectadas por FORCE RLS).
- `finanzas.celdas.mover` todavía mueve celdas de cualquier fila: se decide con el PR 2.
