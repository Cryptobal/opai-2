# CAR-438 · Limpieza 3, parte 7: exportaciones sin uso en las capacidades de Finanzas

- **Sesión:** Sesión Estándares (pasada semanal del 16-nov-2026)
- **PR:** este PR (rama `fix/car-438-exportaciones-finanzas`)
- **Estado:** En PR
- **Migración:** No
- **Base:** `main`

## Qué entra

29 exportaciones sin uso en `packages/capabilities/src/finanzas` (medidas con `pnpm simplicidad --detalle` sobre `main` `886e262`):

- 18 funciones, constantes y esquemas que solo se usan dentro de su archivo dejan de exportarse (por ejemplo `importarMes`, `periodosAGenerar`, `MAX_LOTE_CIERRE`, los trabajos `trabajoConsultarDteSii`, `trabajoBarrerEnviosDte` y `trabajoConsultarCesionesRpetc`, que siguen registrados por sus listas).
- 10 reexportaciones muertas salen: las seis funciones de cobros que `finanzas/index.ts` repetía (el paquete ya las exporta desde `cobros` en `src/index.ts`), `PERMISO_VENTAS` y `TipoDteCompra` en `comun.ts` (todos importan del original), `OpcionesFolioVista` en `ventas-comun.ts` y `programacionSchema` en `ventas-programacion-lectura.ts`.
- 2 tipos que nadie usaba se borran: `RangoFolioTx` (con su import de `TenantTx`) y `LineaProgramacionInput`.

`exportacionesSinUso` baja de 265 a 236 en `simplicidad-base.json`. Ningún archivo tocado está en un PR abierto de otra sesión.

## Qué queda pendiente

- Exportaciones sin uso en `modules/finanzas` y en las pantallas de Finanzas: se coordinan con la Sesión Finanzas.

## Qué se decidió

- Un área por PR: este cubre solo las capacidades de Finanzas. Sin cambio de comportamiento: typecheck, lint y `pnpm test` (773 archivos) en verde.
