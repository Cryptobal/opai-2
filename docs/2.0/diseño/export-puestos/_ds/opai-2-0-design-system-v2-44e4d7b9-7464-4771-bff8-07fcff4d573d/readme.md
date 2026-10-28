# OPAI 2.0 · Design System (DS 2.0)

OPAI 2.0 es un SaaS operacional multi-tenant para empresas intensivas en personal: seguridad privada, aseo, outsourcing y mantenimiento. Gestiona personas, instalaciones, pautas de turnos, rondas, cotizaciones, facturación y finanzas. La identidad es de OPAI; el logo del tenant es una marca secundaria pequeña (monograma).

**Usuarios, por prioridad:** trabajadores y supervisores en terreno (teléfono, una mano, a pleno sol o de noche) · administrativos en iPad y desktop · clientes finales.

**Portales:** ERP, Trabajador, Terreno, Cliente y Supervisor. El portal actual siempre se ve (selector en la barra superior / riel / barra lateral).

## Fuentes

- Repositorio `Cryptobal/opai-2`, rama `main`, commit `6b2b662` (25-oct-2026): `packages/ds/src/tokens.css`, `packages/ds/src/styles.css`, componentes de `packages/ds/src`.
- Export aprobado en Claude Design el 23-oct-2026: `docs/2.0/design/export-ds-2.0/` (`index.html` + `pantallas/*.html`) y export de Acceso (login 375 y 1280).
- Copias recibidas en `uploads/` (tokens.css, styles.css, READMEs, `ds-2.0-referencia.html`, 18 pantallas, 2 logins). Si este DS difiere de esos adjuntos, **ganan los adjuntos**.

## Índice

- `styles.css` — entrada global (solo `@import`).
- `tokens/` — `colors.css` (neutros + semánticos claro/oscuro), `typography.css` (escala + clases `t-*`), `spacing.css` (espaciado, radios, movimiento, gutters), `fonts.css` (@font-face), `base.css` (reset, foco, shimmer, keyframes), `icons.css` (clases `.ic .i-*`).
- `components/` — primitivas React (+ `components.css` con las clases del export: `.btn`, `.input`, `.chip`, `.badge`, `.topbar`, `.tabbar`, `.sidebar`, …).
- `guidelines/` — tarjetas de fundamentos (Colors, Type, Spacing, Brand).
- `ui_kits/opai/` — kit interactivo (`index.html`) y puertos 1:1 de las pantallas (`screens/`).
- `assets/icons/` — 55 iconos lineales del export (`index.json`).
- `fonts/` — Inter y JetBrains Mono (variables, subconjunto latin).
- `thumbnail.html`, `SKILL.md`.

## Components

Namespace: `window.OPAI20DesignSystem_44e4d7`.

- **actions/** — Button, IconButton, Kbd, SelectionBar
- **forms/** — Field, Input, Textarea, Select, Combobox, DateInput, DateRangeInput, Calendar, Checkbox, Switch, Segmented, FilterChip
- **data/** — Table, Card, KpiTile, RowCard, RowGroupHeader, SelectableRow, Timeline, Badge, Avatar, TenantMark, ShiftCell
- **navigation/** — Tabs, Menu
- **overlays/** — Dialog, Sheet, Toast
- **feedback/** — Skeleton, Loading, StatePanel, StateTile, EmptyState, ErrorState, Forbidden, OfflineBanner
- **previews/** — tarjetas de vista previa por componente (claro y oscuro, teléfono e iPad): avatar, kpi, checkbox-switch, chips, select, datetime, tabs, segmented, card-rows, dialog, sheet, toast, states, timeline.
- **shell/** — AppShell, TopBar, TabBar, Rail, Sidebar, AppBar, SearchBox, PortalSwitcher, Wordmark
- **icons/** — Icon

### Intentional additions
- **Icon** — envoltorio de las clases `.ic .i-*` para usar los iconos del export desde React.
- **RowCard** — fila de lista en teléfono (la tabla «pasa a una tarjeta equivalente»).
- **ShiftCell** — celda de turno D/N/L/V/X de la planilla «Pauta mensual» (presente en el export, no como componente con nombre en el repo).
- **Wordmark**, **TenantMark** — wordmark tipográfico «OPAI» (provisional) y monograma de tenant del shell.
- **StatePanel** (medidas de packages/ds: panel punteado) convive con **EmptyState / ErrorState / Forbidden** (ilustración de página del export).
- **RowGroupHeader**, **SelectableRow**, **SelectionBar**, **Kbd**, **Timeline**, **StateTile** — piezas con medidas en packages/ds sin componente con nombre propio en este DS hasta ahora.

## UI kits

- `ui_kits/opai/index.html` — login → ERP en desktop 1280 y teléfono 375, claro/oscuro; Terreno · Hoy por el selector de portal.
- `ui_kits/opai/screens/` — **38 pantallas**: Shell (375 Terreno, 375 oscuro, 375 selector de portal, 1024, 1024 oscuro, 1280, 1280 oscuro), Personas (375 claro/oscuro y 4 estados, 1024 claro/oscuro), Instalación (375, 375 error, 1024), Nueva cotización (375, 375 sin permisos, 1024), Finanzas (375 claro/oscuro/cargando, 1024, 1280 claro/oscuro), Pauta mensual (375, 375 cargando, 1024, 1280), Pauta diaria (375, 1280), Rondas (375, 1280 claro/oscuro), Tickets (375, 1024).
- Copiadas sin cambios desde el repo `Cryptobal/opai-2` (main `91c40ea`, `docs/2.0/design/export-ds-2.0/pantallas/`): DashboardPhone, DashboardPhoneCargando, DashboardPhoneDark, DashboardTablet, DashboardDesktopDark, DetailPhoneError, DetailTablet, FormPhoneSinPermisos, FormTablet, ListPhoneDark, ListTabletDark, PlanillaPhoneCargando, ShellPhonePortal y ShellTabletDark. No se editan aquí; si cambian, se reemplazan desde el repo.
- **Shell aprobado = `uploads/Shell*.html`**: en teléfono «Buscar» va como icono en la TopBar (no en el contenido); el riel de iPad no lleva wordmark (arriba va el selector de portal); en escritorio el usuario va al pie del sidebar. La barra inferior activa pinta solo el icono en accent; la etiqueta queda en fg.
- Reconstruidas desde el export (`docs/2.0/design/export-ds-2.0/pantallas/`): RondaPhone, RondasPanelDesktop (+ oscuro), TicketsPhone, TicketsTablet, PlanillaPhone, PlanillaTablet, PautaDiariaPhone, PautaDiariaDesktop. Usan `ui_kits/opai/export-screens.css` (reglas del export que difieren de components.css, con alcance `.exp`).
- `templates/` — 5 plantillas reutilizables (DC): dashboard, detail, form, list, planilla; cada una con props `device` (phone/tablet/desktop) y `theme`, y `Preview.dc.html` con 375 / 1024 / 1280 en claro y oscuro. Se arman con `components/patterns/` (Page, PageHeader, PatternGrid, FormSection, DetailSection, ActionBar, PlanillaGrid, PlanillaLegend).

---

## CONTENT FUNDAMENTALS

- **Idioma:** español de Chile. Trato de **tú** («Revisa tu conexión», «Tu turno», «Estás a 40 m del punto de marcaje»). El sistema habla en primera persona plural cuando actúa: «No pudimos cargar las personas», «Tras 5 intentos pausaremos el acceso por 15 minutos».
- **Mayúsculas:** solo inicial (sentence case) en títulos, botones y pestañas: «Nueva cotización», «Guardar borrador», «Pauta mensual». Nunca TODO MAYÚSCULAS; el overline es 12/16 500 en caja normal («Operaciones»).
- **Verbos directos en botones:** «Guardar», «Enviar», «Asignar», «Reintentar», «Marcar entrada», «Pedir acceso», «Limpiar búsqueda». Una acción principal por pantalla.
- **Estados:** qué pasó + qué hacer. Error: «No pudimos cargar las personas · Revisa tu conexión. Si el problema sigue, avísale a soporte con el código.» + «Reintentar». Sin permisos: explica y nombra a quién pedir acceso («Pídele acceso a Carlos Irigoyen, administrador de Atlas Seguridad SpA»). Vacío: una línea y una acción («Aún no hay personas · Agrega a la primera persona o importa una planilla.»).
- **Formatos:** fechas `dd-mm-aaaa` (23-10-2026), horas `HH:mm` (08:00–20:00), CLP con punto de miles y sin decimales (`$ 1.850.000`), porcentajes con coma (`4,2 %`), RUT `16.234.567-8` en mono. Separador «·» para metadatos: «Guardia · Edificio Costanera Center».
- **Tono:** sobrio, operativo, sin exclamaciones ni emoji. Comillas latinas «» para citar lo que el usuario escribió («Sin resultados para «quilicura»»).

## VISUAL FOUNDATIONS

- **Sensación:** moderno, muy minimalista (referencias: Linear, Vercel, Things 3, Apple Health). Jerarquía por tamaño, peso y espacio, no por color.
- **Color:** neutros zinc fríos (`--ds-n-*`). Un solo acento, Índigo OPAI `#4a3fd8` (oscuro `#8e88ff`), solo para la acción principal, ítem activo de la navegación inferior, selección y foco. Estados success/warning/danger/info en tres tonos (base, `-fg` para texto, `-muted` para fondo). Nada de slate ni teal (estética de OPAI 1.0).
- **Modo oscuro verdadero:** bg `#0b0b0c`, surface `#141416`, no gris lavado. Sigue al sistema; se fuerza con `data-theme="light|dark"` en cualquier contenedor.
- **Tipografía:** Inter con `cv11, ss01`; JetBrains Mono para RUT, folios y montos de planilla. Escala 12/16 · 13/18 · 14/20 · 16/24 · 18/26 · 22/28 · 28/34 · 36/40. Títulos 600 con tracking negativo. Cuerpo base 16/24. Cifras siempre tabulares.
- **Fondos:** planos. Sin imágenes, gradientes decorativos, texturas ni ilustraciones de marca. La única «ilustración» es la del estado vacío, hecha con tokens (círculo `fill` + icono). Mapa estático sin imagen = retícula de calles con tokens (`ds-mapa`).
- **Bordes antes que sombras:** 1 px `--ds-border` en cards, tablas y separadores; `--ds-border-strong` en botones secundarios y chips; `--ds-border-control` en controles de formulario.
- **`--ds-border-control`** (claro `#8a8a93` · oscuro `#6b6b74`): borde de Input, Select, Combobox, Textarea, Checkbox y pista apagada del Switch; 3:1 sobre surface y bg (WCAG 1.4.11). `border` y `border-strong` quedan para separadores y tarjetas. Hover de filas y tablas: `fill`.
- **Sombras:** ninguna en reposo. Una sola sombra para overlays (menú, popover, dialog, sheet, toast): claro `0 12px 32px -8px rgba(17,17,19,.18), 0 2px 6px rgba(17,17,19,.06)`; oscuro `0 16px 40px -8px rgba(0,0,0,.6), 0 0 0 1px #26262a`. El segmento activo del control segmentado usa `0 1px 2px rgba(0,0,0,.06)`.
- **Cards:** radio 16, borde `border`, fondo `surface`, padding 16, sin sombra. Nunca tarjetas dentro de tarjetas. KPI sin color de fondo; solo la variación se colorea.
- **Radios:** sm 6 · md 10 (botón, input, toast, ítem de sidebar) · lg 16 (card, tabla, dialog) · xl 20 (esquina superior del sheet) · píldora (badge, chip). Checkbox 5.
- **Hover:** solo donde hay puntero. Ghost → fondo `fill`; filas de tabla → `bg`; ítems de nav inactivos → `fg`. Sin cambios de opacidad.
- **Press / selección:** ítem activo con fondo `fill` + texto `fg` (sidebar, riel) o color `accent` (navegación inferior). Chip seleccionado: borde accent, fondo accent-muted, texto accent. Tabs: subrayado 2 px en `fg`.
- **Foco:** contorno 2 px `--ds-focus` con separación 2 px. Inputs: borde accent + halo 3 px `accent-muted`; error: borde `danger-fg` + halo `danger-muted`.
- **Deshabilitado:** opacidad 45 %.
- **Movimiento:** `cubic-bezier(0.2, 0, 0, 1)`, 150 ms y 200 ms, solo para continuidad (overlays entran con fade + scale 0.98, sheet sube 24 px, panel lateral entra 24 px). Sin rebotes. Anulado con `prefers-reduced-motion`. Skeleton con shimmer de 1,4 s; nunca un spinner de página completa.
- **Transparencia y desenfoque:** solo la barra superior del teléfono (bg al 95 % con blur) y el scrim de overlays (`--ds-scrim`).
- **Layout:** teléfono < 768 (barra superior 52, navegación inferior fija 56, gutter 16); iPad 768–1279 (riel 80, barra 60, gutter 24, lista/detalle en dos columnas); desktop ≥ 1280 (sidebar 248, cabecera 60, gutter 32, contenido máx. 1280). Acción principal en la cabecera o flotante, nunca ambas.
- **Accesibilidad:** touch targets ≥ 44 px (casillas con área táctil de 44 alrededor de la caja de 20), safe-area iOS, contraste AAA en texto principal.

## ICONOGRAPHY

- **Sistema:** Lucide — lineal, monocromo, `stroke-width` 1.75 (2 en `plus`/`check`), `currentColor`. 20 px en teléfono, 16 px en densidad compacta (`.ic.sm`), 24 px `.ic.lg`.
- **Archivos:** los 55 iconos usados por el export están copiados como SVG en `assets/icons/` y como máscaras CSS en `tokens/icons.css` (`<span class="ic i-users"></span>`). En React: `<Icon name="users" size="sm" />`. Para iconos que no estén en el set, usar Lucide desde CDN con el mismo trazo.
- **Reglas:** un color (hereda del texto). Nada de iconos multicolor, rellenos, emoji, ni escudos/guardias como identidad. Caracteres Unicode solo como texto funcional: «⌘K», «↵», «esc», «·», «×».

## Guía de contenido y accesibilidad

Tarjetas en `guidelines/`: **Contenido** (voz, formatos, principios con sí/no) y **Accesibilidad** (contraste calculado en vivo desde los tokens en claro y oscuro; touch y foco). Formato UF `UF 1.234,5678` = **Propuesta**.

## No definido en el repo

- **Logo definitivo** de OPAI (se rediseña aparte): se usa el wordmark tipográfico «OPAI» 17/700. No se dibujó ningún logo.
- Ilustraciones, fotografía o imágenes de marca: no existen.
- Tamaños de Avatar 48/64: el prompt los nombra como «48/64»; se implementan ambos, sin uso definido para cada uno.
- Pantallas de Acceso 03–11 (recuperar contraseña, invitación, selector de empresa, login Trabajador con `Keypad`, Cliente, emparejar dispositivo): descritas en `README-acceso.md` pero sus HTML no se adjuntaron; no se recrearon.
- Sidebar en iPad con lista/detalle y variante grande del Dialog (1040×860): medidas definidas, sin pantalla de referencia.
- Breakpoints exactos de densidad intermedia y tokens de z-index: no definidos.
- Formato de pantalla de la UF (se muestra una propuesta).
- Radio: no existe componente Radio en el DS (ni en lo que recibí de packages/ds); cuando se agregue debe usar `--ds-border-control`.
- Vacaciones «V»: success-muted / success-fg (confirmado por el export Planilla*).
- Pantallas de patrón (Finanzas, Planilla, etc.) son ports del export: usan padding 20–24 y gap 16 en KPI donde `packages/ds/src/patterns` dice 16 y 12. Gana el export; los componentes siguen el código.
- «Tracking amplio» de las iniciales del Avatar: sin valor numérico; se usa 0.02em.
- Barra de selección «72 px sobre la barra inferior»: se interpretó como `bottom: 72px` + safe-area.
