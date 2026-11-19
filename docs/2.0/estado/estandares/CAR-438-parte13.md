# CAR-438 · Limpieza 3, parte 13: `apps/web/lib` y rutas satélite

- **Sesión:** [Sesión Cursor · Estándares]
- **PR:** rama `cursor/car-438-lib-web-1f57`
- **Estado:** En PR
- **Migración:** No
- **Base:** `main`

## Qué entra

29 exportaciones sin uso menos (simplicidad **246 → 217**):

- **Lib:** firma Svix, MCP vistas, navegación (y función muerta `areaPrincipalPorRol`), tipos sueldo, fuentes, terreno.
- **Satélites:** agente, candidatos documento, auth login, terreno QR, trabajador, corrección pública, negocios `hrefVista`, platform facturación/indicadores.
- **Tests:** `TOPE_LIMITE` y `RAIZ` internos; eliminado `lectorDisponible` sin uso.

Sin cambio de pantalla. 879 tests `apps/web` en verde.

## Pendiente

Resto CAR-438 en ERP (PRs #1011–#1032) y `apps/web/lib` CPQ ya cubiertos en otras ramas.

Fixes CAR-438