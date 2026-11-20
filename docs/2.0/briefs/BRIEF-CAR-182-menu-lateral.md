# BRIEF · CAR-182 — Menú lateral: separación y pruebas

Slice posterior al orden (#910) y al menú visual (#911): solo jerarquía y aire en el acordeón.

## Objetivo

Más separación entre áreas y entre entradas dentro de un área desplegada, sin cambiar URLs, permisos ni capacidades.

## Alcance

- `AreaGrupo` y `GrupoNav` en `@opai/ds` (solo clases de tokens).
- Tests de navegación ERP ya en `navegacion-erp-car182.test.ts`; refuerzo en `sidebar.test.ts`.
- Captura `@preview` en `menu-lateral-preview.spec.ts`.

## Fuera

- Indicadores de Inicio, explorador, nuevas capacidades, etiqueta `e2e` en el PR.

## Validación

`pnpm typecheck && pnpm lint && pnpm test`; `pnpm presupuesto` si sube el tope de JS.