# CAR-439 · Duplicados: mes AAAA-MM y `ClaveSiiPublicable`

- **Sesión:** [Sesión Cursor · Estándares]
- **PR:** rama `cursor/car-439-duplicados-1f57`
- **Estado:** En PR
- **Migración:** No

## Qué entra

- `mesSiguiente` / `mesAnterior` en `packages/domain/src/calendario-mes.ts`; portal cliente y cuadratura Finanzas dejan de copiarlos.
- Tipo único `ClaveSiiPublicable` en domain; `packages/db` y capacidades remuneraciones lo importan (sin solapar #1011–#1040).

Duplicados **3223 → 3200** líneas. Sin cambio de pantalla.

Fixes CAR-439