# @opai/ds — DS 2.0

Sistema de diseño de OPAI 2.0. Única fuente de colores, tipografía, shell y patrones de pantalla.

- `src/tokens.css`: tokens (`@theme` de Tailwind). **Aprobado**: el «OPAI 2.0 Design System V2» de Claude Design (44e4d7b9) es la referencia vigente por decisión de Carlos del 26-oct-2026 (ADR-050; fundamentos en ADR-014). Es el único archivo con valores de color.
- `src/components`: componentes base (Button, Input, Select, Badge, Card, Tabs, Skeleton, Sheet, Table).
- `src/shell`: `AppShell` (barra superior, navegación inferior en teléfono, riel en iPad, barra lateral en desktop, selector de portal).
- `src/patterns`: `ListScreen`, `DetailScreen`, `FormScreen`, `PlanillaScreen`, `DashboardScreen`, cada uno con `state`.
- `src/states`: `Loading`, `Empty`, `ErrorState`, `Forbidden`.

Reglas: sin hex fuera de `tokens.css`; los módulos componen con estos patrones y no inventan layouts; mobile e iPad first (375 y 1024 antes que desktop); touch targets ≥44px; safe-area iOS.
