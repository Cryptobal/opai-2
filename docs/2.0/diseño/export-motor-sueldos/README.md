# Export de Motor de sueldos v2 — DS 2.0 (referencia visual aprobada)

**Fuente:** Claude Design, Design System de OPAI 2.0 V2 (`44e4d7b9-7464-4771-bff8-07fcff4d573d`), a partir de [`design/DESIGN-PROMPT-motor-sueldos.md`](../../design/DESIGN-PROMPT-motor-sueldos.md) (especificación [`modulos/motor-sueldos.md`](../../modulos/motor-sueldos.md), aprobada por Carlos el 29-oct-2026, ADR-056).

**Versión:** v2. **Aprobación:** Decisión de Carlos, 29-oct-2026 16:23 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0).

**Ajustes pendientes:** los 6 ajustes que el QA de v2 (`/workspace/qa/motor-sueldos-v2/INFORME.md`, no versionado en el repo) dejó para el momento de construir **no se corrigen en este mockup**: Carlos decidió que se hacen al construir y el brief los exige como criterios de aceptación. Ver [`briefs/BRIEF-07e-motor-sueldos.md`](../../briefs/BRIEF-07e-motor-sueldos.md) §«Ajustes del mockup v2 que se resuelven al construir».

> **Es REFERENCIA VISUAL, no código.** La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). El `_ds/` y los `.html` existen solo para comparar la implementación con el diseño aprobado en 375, 1024 y 1280 px, claro y oscuro.

## Archivos

Las 10 pantallas y el catálogo de componentes del Design Prompt (§6): `Valores.dc.html`, `ValorDetalle.dc.html`, `ConfirmarValor.dc.html`, `CambiarValor.dc.html`, `HistorialRemuneraciones.dc.html`, `Simulador.dc.html`, `SimuladorComparar.dc.html`, `PlataformaFuentes.dc.html`, `AvisosMotor.dc.html`, `Componentes.dc.html`.

Además, en esta v2: `CargosSueldos.dc.html` (entradas «Simular costo» / «Simular con esta capa» en Personas → Cargos y sueldos, y en ⌘K; ajuste 9 del QA de la v1) y cuatro sábanas combinadas que agrupan varios estados y viewports en un solo archivo: `Motor de sueldos - Remuneraciones.dc.html`, `Motor de sueldos - Simulador.dc.html`, `Motor de sueldos - Estados.dc.html` y `Motor de sueldos - Estados detalle.dc.html`.

Abrir cualquier `.dc.html` en el navegador (usa `support.js`, `ds-base.js` y `_ds/`).

**`_ds/` y `support.js`:** son el mismo bundle del Design System v2 y el mismo runtime `dc` ya versionados en [`export-crm/`](../export-crm/) (verificado archivo por archivo: mismo tamaño y mismo contenido en los puntos comparados); se copiaron desde ahí en vez de volver a subirlos, para no depender de una ruta relativa entre carpetas de export distintas.

**`shots/`:** no se incluyen capturas en este export (el insumo de QA con las 169 capturas de v2 vive fuera del repo, en `/workspace/qa/motor-sueldos-v2/`, y no se versiona). Si se necesita una referencia visual rápida, agregar aquí como máximo 3 PNG chicos.
