# CAR-438 · Limpieza 3, parte 10: exportaciones sin uso en configuración y satélites

- **Sesión:** [Sesión Cursor · Estándares]
- **PR:** pendiente (rama `cursor/car-438-erp-config-1f57`)
- **Estado:** En PR
- **Migración:** No
- **Base:** `main`

## Qué entra

Exportaciones que solo se usan en su archivo, en `configuracion/*`, más `mesPorDefecto` (impuestos), `pesosCortos` (reportes comercial) y `mesVecino` (desempeño). Sin reexportaciones muertas de `FORM_PLANTILLA` / `FORM_INTEGRACION`.

Sin cambio en pantalla.

## Pendiente

Más bloques `(erp)` y `apps/web/lib` del inventario simplicidad (partes 9 en PR #1011).

## Gate

`@opai/web` typecheck, lint, test; `pnpm simplicidad` sin empeorar base.