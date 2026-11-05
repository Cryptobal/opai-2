# BRIEF-36 · Flujo de caja A: sin sellado, sin ajuste manual de ingresos, umbral único (CAR-193, PR 1 de 3)

**Rama:** `brief/car-193-flujo-a-sin-sellado` · **Sin migración** · Reglas: [ADR-073](../01-decisiones.md) y [hoja de alcance](../modulos/finanzas.md) §3. Los PR 2 (cartola completa, saldo del banco, fecha esperada de cobro) y 3 (factoring, IVA y PPM, interfaz) vienen apilados sobre este.

## Qué cambia
1. **Sin cierre ni sellado (regla 1).** Fuera el permiso `finanzas:flujo.cerrar`, los eventos `finanzas.flujo.semana_sellada` y `finanzas.flujo.semana_reabierta`, la tolerancia de cierre (`toleranciaCierre` en los ajustes, `TOLERANCIA_CIERRE_CLP` y `evaluarCierre`) y el lenguaje de «sugerencia al sellar» de `finanzas.bancos.saldo_sugerido` (se conserva: es la base del saldo del banco de hoy). La tabla `FlujoCierre` y las columnas no se tocan.
2. **Sin ajuste manual de ingresos (regla 2).** `finanzas.celdas.fijar` (también en vista previa), `finanzas.celdas.cumplir`, `finanzas.celdas.mover` y `finanzas.flujo.importar` rechazan filas de ingresos («Los ingresos no se ajustan a mano…»); la importación lo informa por fila y no aplica nada. Los egresos se siguen planificando a mano.
3. **Un solo umbral de saldo bajo (regla 9).** `umbral` es el único: planilla, aviso semanal (`aviso.ts`) y aviso de banco (`bancos/aviso-banco.ts`), por defecto **$15.000.000** y avisa solo por la campana. Se retira `avisoUmbral` de los ajustes, de la lectura y del editor de Configuración; el aviso queda activo por defecto.
4. **«Hoy en Finanzas» (regla 11).** Las facturas vencidas importadas de 1.0 (apertura) no cuentan entre los recordatorios que tocan; el helper `idsDeApertura` lo comparte con el trabajo diario de cobranza.

## Pruebas
Módulo: rechazo de ingresos en fijar y cumplir (con y sin vista previa), error de fila en el CSV, los tests de egresos adaptados. Base: importar rechaza ingresos sin aplicar nada ni cambiar ajustes; «Hoy en Finanzas» no cuenta lo importado (falla sin el filtro).

## Corregido tras la autorrevisión
- `finanzas.celdas.mover` también rechaza ingresos (era un camino para ajustarlos a mano).
- `finanzas.ajustes.actualizar` con un campo suelto ya no pisa el umbral ni el aviso guardados: el esquema de ajustes no lleva `.default()` (con `.partial()` Zod 4 los seguía aplicando); el valor por defecto vive en `ajustesDe`. Test de actualización parcial.
- «Hoy en Finanzas»: el test ahora incluye una factura vencida normal que sí toca (esperado 1) junto a la pausada y la importada.

## Pendiente (siguientes PR)
- Las filas de ingresos que ya tienen celdas planificadas a mano quedan como están; el PR 2 las sustituye por la proyección.
- Las empresas con ajustes ya guardados conservan su `umbral` y `avisoActivo` actuales (en base `umbral` parte en 0 y `avisoActivo` en falso) y su `aviso_umbral` queda sin uso: llevarlos a 15.000.000 y activo es un cambio de datos que va con la migración del PR 2 (verificando filas afectadas por FORCE RLS).
- Los roles y keys personalizados que ya guardaban `finanzas:flujo.cerrar` lo conservan (no concede nada en ejecución), pero no se podrán volver a guardar hasta quitarlo: la limpieza va con la migración del PR 2.
