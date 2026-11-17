# CAR-438 · Limpieza 3, parte 8: exportaciones sin uso en los componentes compartidos de la web

- **Sesión:** Sesión Estándares (pasada semanal del 16-nov-2026)
- **PR:** este PR (rama `fix/car-438-exportaciones-componentes`)
- **Estado:** En PR
- **Migración:** No
- **Base:** `main`

## Qué entra

19 exportaciones sin uso en `apps/web/app/_components` (medidas con `pnpm simplicidad --detalle` sobre `main` `886e262`):

- 18 dejan de exportarse porque solo se usan dentro de su archivo: sueldos (`TOPE_MONTO`, `ERROR_MONTO`), documentos (`ERROR`, `MAS`), visor de PDF (`useEsTactil`, `descargarPdf`), PWA (`limpiarCachesPwa`; la entrada pública sigue siendo `trasLimpiarCaches`), actividad (`fraseActividad`, `cuandoTimeline`), cumplimiento (`PROPOSITOS`), passkeys (`soportaPasskeys`) y rendiciones (`ADMIN`, `envioInicial`, `AgruparReporte`, `ViajeRendicion`, `Persona`, `FilaBandeja`, `GrupoReporte`).
- 1 constante que nadie usaba se borra: `PRIORIDAD` en `actividad/tipos.ts`.

Nada cambia en pantalla. Ningún archivo tocado está en un PR abierto de otra sesión.

## Qué queda pendiente

- Exportaciones sin uso de las pantallas de cada módulo (`apps/web/app/(erp)`): un PR por área, coordinado con la sesión dueña.

## Qué se decidió

- Un área por PR. Sin cambio de comportamiento: typecheck de `apps/web`, lint de lo tocado y las 878 pruebas de `apps/web` en verde.
