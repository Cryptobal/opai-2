# BRIEF DE IMPLEMENTACIÓN — 07 COMERCIAL · PR 1b (tablero, hojas y editor del embudo)

**Repositorio:** `Cryptobal/opai-2` · **Rama:** `brief/car-24-comercial-pr1b`, apilada sobre `brief/07-comercial-pr1` (PR 1, CAR-20) · **Fecha:** 28-oct-2026 · **Tarea Linear:** CAR-24 (`Fixes CAR-24` en el PR) · **Estado:** dentro del alcance ya aprobado por Carlos el 26-oct-2026 15:12 CLT (`docs/2.0/diseño/alcance-crm.md` §1 y export v3); el corte en un PR aparte es del plan CRM del 28-oct (Bloque C).

> **Por qué un PR aparte.** El PR 1 se rescató de una rama de 47 commits detrás de `main` y quedó con lo que tenía (listas, fichas, capacidades y migración). Su autorreporte decía que el tablero con arrastre, las hojas y el editor del embudo quedaron fuera, aunque están en el alcance aprobado. Este PR los completa sin reabrir la migración del PR 1 (que necesita su propia ventana en Neon) y en serie con él porque toca las mismas rutas. Cuando el PR 1 entre a `main`, esta rama trae `main` con merge.

> **Reglas:** `AGENTS.md`, `docs/2.0/REGLAS-codigo.md`, el brief del PR 1 (`BRIEF-07-comercial-negocios.md`), ADR-004/034 (paridad), ADR-014/017 (DS 2.0, sin elementos crudos, primitivas Radix del DS), ADR-018 (configuración por el núcleo), ADR-022, ADR-037 (presupuesto de JS), ADR-041 (fichas), ADR-045 (rendimiento) y `NAVEGACION.md`. **Diseño aprobado:** `docs/2.0/diseño/export-crm/` (`Negocios.dc.html`, `Negocio.dc.html`, `ConfigComercial.dc.html` y `shots/`). Del export se toma el contenido, los flujos y los textos; nunca el shell ni el CSS.

## 1. Objetivo

Que Gard opere el embudo desde la pantalla: crear y editar negocios, moverlos entre etapas arrastrando (o con teclado y en el teléfono), ganarlos, perderlos y reabrirlos con sus requisitos, vincular instalaciones y contactos, y ajustar el embudo y sus catálogos sin código. Todo con las capacidades del PR 1 (y las nuevas de este PR), con su herramienta MCP y vista previa.

## 2. Alcance

### Incluido
1. **Tablero** en `/negocios` (vista por defecto, como el export; `?vista=lista` conserva la lista actual): columnas por etapa activa con nombre, contador y suma mensual; tarjetas con título, cuenta, valor mensual, cierre y responsable; scroll horizontal con cada columna con su propio scroll y cabecera fija. **Arrastre** entre columnas con la API nativa (sin dependencias nuevas) y **alternativa accesible**: en cada tarjeta, «Mover a…» (menú del DS) que hace lo mismo. **Teléfono (375):** una columna a la vez con selector de etapa (Segmented/Select del DS); mover desde la hoja.
2. Soltar en una etapa **abierta** llama a `comercial.negocios.mover`; si faltan requisitos (R9/R10), abre la **hoja Mover** con los campos que faltan (monto, cierre, inicio de servicio) y una nota «vincula una instalación» cuando aplique. Soltar en la **ganada** abre la hoja Ganar; en la **perdida**, la hoja Perder. Con error, la tarjeta vuelve a su columna y se avisa (toast del DS); nunca un estado optimista que no se revierte.
3. **Hojas** (`Sheet` del DS, pantalla completa en el teléfono, cargadas en diferido como `cuentas/_componentes/diferidas.ts`):
   - **Nuevo negocio** (`?nuevo=1`, también desde la ficha de cuenta): cuenta (Combobox del DS), título, tipo, origen, cierre estimado, valor mensual estimado. Crea con `comercial.negocios.create`.
   - **Editar** (`?editar=1`): los campos de `comercial.negocios.update`; el monto no se edita si hay valor de cotización.
   - **Mover** (`?mover=<etapaId>`), **Ganar** (`?ganar=1`: inicio de servicio y, sin cotización, la casilla «Entiendo que gano este negocio sin cotización» con el aviso que devuelve la capacidad), **Perder** (`?perder=1`: motivo del catálogo, detalle obligatorio con «otro», competidor) y **Reabrir** (`?reabrir=1`: etapa abierta y motivo).
   - **Instalaciones y contactos** del negocio: vincular/desvincular instalaciones de la cuenta con su tipo y definir contactos con rol y principal (capacidades del PR 1).
   - Acciones en la ficha: Ganar/Perder (abierto) o Reabrir (cerrado) en la cabecera, como el export; Editar y Archivar en «Más acciones». Se reponen «Nuevo» y «Editar», que el PR 1 quitó por no tener destino.
4. **Editor del embudo y catálogos** en **Configuración → Módulos → Comercial** (`/configuracion/modulo/comercial`), con pestañas «Embudo» y «Catálogos» además de los ajustes del manifest. ADR-018 prohíbe una página de configuración propia del módulo: el núcleo agrega a su página de módulo un **registro de secciones** (análogo a `existencia-ruta.ts`) donde Comercial declara sus dos pestañas; el núcleo las monta. Embudo: tabla de etapas (nombre, tipo, probabilidad, tono, requisitos, activa) con agregar, editar, reordenar (subir/bajar, accesible) y desactivar; la ganada y la perdida no se desactivan ni cambian de tipo (R26). Catálogos: tipos, orígenes y motivos de pérdida con agregar, renombrar y desactivar («un valor en uso no se elimina: se desactiva»).
5. **Capacidades nuevas** (con `dryRun`, `idempotencyKey`, auditoría y MCP `comercial_config_*` / `preview_…`): `comercial.config.crear_etapa` (abierta, al final o en una posición) y `comercial.config.reordenar_etapas` (lista completa de ids en el orden nuevo, atómica, sin chocar con el único `(tenant, embudo, orden)`), más lo que haga falta para el embudo; se actualiza la instantánea `herramientas-mcp.txt`.
6. **Datos demo** para e2e y QA (solo `dev`): negocios ficticios en `seed:maestros-demo` (o un `seed:comercial-demo` aparte), sin datos reales.

### Excluido
Lo de los PR 2 y 3 (`alcance-crm.md` §2): Solicitudes, contacto N–N, actividad unificada, etiquetas, reportes, exportación, campos personalizados, fusión, transferencia, importación. Columnas configurables del tablero («Columnas visibles» del export) y el chip «Mis negocios» con contador: van si caben en el presupuesto; si no, se reportan.

## 3. Datos y migración
**Sin migración.** Si el reordenamiento atómico necesita una restricción `DEFERRABLE`, se resuelve en la capacidad (dos fases dentro de la transacción) y no con una migración nueva.

## 4. Rendimiento y presupuesto (ADR-037, ADR-045)
Hoy `/(erp)/negocios` mide 160,8 KB y `/(erp)/negocios/[id]` 162,7 KB con tope 165 KB. El tablero y las hojas van en componentes cliente cargados en diferido; el arrastre no usa librerías. Si aun así una ruta supera el tope, se sube **solo esa ruta** en `apps/web/presupuesto-js.json` con la medición antes y después y la justificación en el PR (ADR-043 v3). Consultas por navegación ≤ 8 (se declaran en el PR).

## 5. Tests y gate
- Capacidades: crear y reordenar etapas (dryRun, conflictos, R26, permisos de `comercial:config.manage`).
- e2e a 375, 1024 y 1280 px: crear un negocio desde el tablero, moverlo arrastrando y con «Mover a…», ganar con la casilla sin cotización, perder con motivo, reabrir, y editar una etapa del embudo. Capturas en `test-results/`.
- Gate local antes de cada commit (`pnpm typecheck && pnpm lint && pnpm test`), `pnpm test:db`, `build` + `pnpm presupuesto`. Autorrevisión con subagente antes del PR.

## 6. Riesgos
- **Presupuesto de JS** al límite en las rutas de cuentas e instalaciones (164,6–164,9 KB): el tablero no debe cargar en esas rutas.
- **Arrastre en táctil:** la API nativa no arrastra en iOS; en el teléfono se mueve con la hoja (una columna a la vez), como el export.
- **Registro de secciones de configuración:** es un cambio pequeño del núcleo; si el Revisor prefiere otro mecanismo, se ajusta sin cambiar las capacidades.

## 7. Reporte
Commits, capturas 375/1024/1280 comparadas con el export, presupuesto antes y después, `tools/list` nuevo y resumen ejecutivo para Carlos.
