# CAR-438 · Limpieza 3, parte 15: auth, DS, Finanzas y capacidades (sin PRs abiertos)

- **Sesión:** [Sesión Cursor · Estándares]
- **PR:** rama `cursor/car-438-packages-modules-1f57`
- **Estado:** En PR
- **Migración:** No

## Qué entra

53 exportaciones sin uso menos (**246 → 193**), solo archivos fuera del union de #1011–#1038:

- **packages/auth:** helpers OAuth/MFA internos.
- **packages/ds:** constantes y tipos de uso local.
- **modules/finanzas** y **packages/capabilities** (finanzas, Slack, correos, cumplimiento): reexports muertos y símbolos internos.
- **modules/tickets**, **portal trabajador**, **apps/web** terreno rondas y platform ajustes.

Tests finanzas/capabilities en verde.

## Corrección de lint del 18-nov-2026

Se elimina el alias local `PrioridadTicket`, sin referencias, que quedó al retirar su exportación.
Se conserva `PRIORIDADES_TICKET` y no cambian estados, transiciones ni comportamiento en ejecución.

Fixes CAR-438
