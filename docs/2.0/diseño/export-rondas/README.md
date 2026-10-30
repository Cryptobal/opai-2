# Export de Rondas — DS 2.0 (referencia visual aprobada, mockup v3)

**Qué es:** mockup v3 del módulo Rondas, construido en Claude Design con el Design System de OPAI 2.0 v2 (`44e4d7b9-7464-4771-bff8-07fcff4d573d`), el mismo DS que `export-crm/` y `export-puestos/`.

**Versión:** v3 (tercera vuelta de QA sobre el mockup inicial de CAR-72). **Aprobado:** Decisión de Carlos, 29-oct-2026 16:29 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0).

**Ajustes pendientes:** ver `docs/2.0/briefs/BRIEF-14-rondas.md`, sección «Ajustes del mockup v3 que se resuelven al construir». Carlos decidió que los 2 detalles pendientes de la QA de v3 (encabezado de `c12` cortado a 1280 px; marca 3 de Bodega A en `c18` que dice «Realizado» en vez de «Hay un problema») **no se corrigen en el mockup**: se corrigen al construir, con su propio criterio de aceptación.

## Qué es REFERENCIA VISUAL, no código

La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). El `_ds/` y los `.dc.html` existen solo para comparar la implementación con el diseño aprobado en 375, 1024 y 1280 px, en claro y oscuro.

## Archivos

- `Rondas Guardia.dc.html` — pantallas de teléfono del guardia en la app Terreno: Inicio de Terreno (`g0`), selector «¿Quién eres?» (`g1`), «Mis rondas de hoy» (`g2`), «Ronda en curso» con mapa plegable y botón Emergencia (`g3`), marcar punto por QR (`g4qr`) y por GPS (`g4gps`), resultado de la marca con checklist (`g4res`), reportar novedad (`g10`), cierre de ronda (`g5`), cola sin conexión (`g6`) y permisos en contexto (`g7`), entre otras.
- `Rondas Supervisor.dc.html` — pantallas de teléfono e iPad del supervisor: «Rondas de hoy» (`s8`), ficha de la ejecución con pestañas (`s9`), revisión de anomalía (`s10`), crear punto en el lugar (`s11`).
- `Rondas ERP.dc.html` — pantallas de escritorio e iPad del ERP: «Control de rondas» en vivo (`c12`), pestaña «Rondas» de la instalación con Puntos/Plantillas/Programación (`c13p`, `c13pd`, `c13h`, `c13s`), «Informes de rondas» (`c14`), Configuración → Rondas (`c15`, `c15t`), relevo y zona de riesgo (`c16`, `c17`) y la ficha completa de la ejecución (`c18`).
- `Rondas Cliente.dc.html` — Portal Cliente → Reportes → Rondas (`d16`, `d16f`).
- `Tablero Rondas.dc.html` — tablero con todas las pantallas juntas, para revisión.
- `Mapa Rondas.dc.html` — componente de mapa estático sin imagen (recorrido, radios, mapa de calor y la vista del guardia con su posición y el siguiente punto), compartido por varias de las pantallas anteriores vía `<dc-import>`.
- `support.js` — runtime genérico de Claude Design (`dc-runtime`) que interpreta los `.dc.html`. Es el mismo bundle generado, sin cambios, que ya está en `export-crm/support.js` (se copió desde ahí en vez de volver a transcribirlo: son 1911 líneas idénticas, verificadas por el encabezado «GENERATED from dc-runtime/src/\*.ts — do not edit», el mismo namespace y el mismo cierre de archivo).
- `_ds/` — el mismo DS 2.0 v2 que usan `export-crm/` y `export-puestos/`, **no es idéntico byte a byte**: este bundle es una captura más nueva (más pantallas de ejemplo, el token `--ds-border-control` que el bundle de `export-crm/` no tenía, presente en `tokens/colors.css` y `components/components.css`). Por eso se duplica completo en vez de referenciar `export-crm/_ds/`. El bundle que queda en el repo son los archivos que los `.dc.html` cargan y sus dependencias: `styles.css` (que `@import`a `tokens/{fonts,colors,typography,spacing,base,icons}.css` y `components/components.css`), `_ds_bundle.js` (runtime del DS), más `_ds_manifest.json`, `_adherence.oxlintrc.json` y `readme.md` del propio bundle; las dos fuentes (`Inter-latin.woff2`, `JetBrainsMono-latin.woff2`) ya estaban en `fonts/` desde el #137 (son el mismo subconjunto latin de Inter y JetBrains Mono que `export-crm/`) y no se volvieron a copiar. Con esto los `.dc.html` abren con estilos y sirven para comparar en 375, 1024 y 1280 px, claro y oscuro. No se copiaron artefactos de QA (ver abajo).

No se copiaron `shots/` (capturas de QA), `uploads/` (no corresponde a este export), `shoot.cjs`, `metrics.json` ni `text.txt`: son artefactos de la corrida de QA, no del diseño aprobado.
