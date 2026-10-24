# Diseño — DS 2.0 de OPAI

Reglas de diseño para toda pantalla de OPAI 2.0. Resume lo que ya existe en `packages/ds` (DS aprobado, ADR-014) y en `docs/2.0/design/` (exports aprobados de Claude Design). No define tokens nuevos: si falta algo, se diseña en Claude Design y se agrega a `packages/ds`, nunca a un módulo (ADR-017). La navegación está en `NAVEGACION.md` y la velocidad en ADR-045.

**Referencias visuales:**
- `design/export-ds-2.0/`: sistema y patrones, 40 pantallas a 375, 1024 y 1280 px, en claro y oscuro.
- `design/export-acceso/`: pantallas de acceso.
- `design/export-maestros/`: maestros y configuración.
- En desarrollo, la página `/ds` muestra cada componente con sus estados.

## 1. Tokens

Un solo archivo con colores: `packages/ds/src/tokens.css`. Fuera de él no hay hex. `grep -rn "#[0-9a-fA-F]\{6\}" apps packages modules` solo debe encontrar `tokens.css`.

| Grupo | Variables (`--ds-*`) | Utilidad Tailwind |
|---|---|---|
| Superficies | `bg`, `surface`, `surface-raised`, `fill`, `scrim`, `inverse-bg` / `inverse-fg` | `bg-bg`, `bg-surface`, `bg-surface-raised`, `bg-fill` |
| Texto | `fg`, `fg-muted`, `fg-subtle` | `text-fg`, `text-fg-muted`, `text-fg-subtle` |
| Bordes y foco | `border`, `border-strong`, `focus` | `border-border`, `border-border-strong`, `ring-focus` |
| Acento (índigo) | `accent`, `accent-fg`, `accent-muted` | `bg-accent`, `text-accent-fg`, `bg-accent-muted` |
| Estados | `success`, `warning`, `danger`, `info`, cada uno con `-fg` y `-muted` | `text-danger-fg`, `bg-warning-muted`… |
| Neutros | `n-0` … `n-950` | Solo dentro de `tokens.css` |
| Movimiento | `dur`, `dur-fast`, `ease` | Transición por defecto 150 ms |
| Sombras | `shadow-overlay` | `shadow-overlay` (solo capas flotantes) |

- **Modo oscuro verdadero:** cada token se redefine para oscuro. Las pantallas no usan `dark:` salvo casos ya presentes en el DS.
- **Tipografía:**
  - Inter Variable para textos y JetBrains Mono Variable para RUT, folios y montos en planillas, ambas autoalojadas.
  - Escala: `xs` 12, `sm` 13, `base` 14, `md` 16, `lg` 18, `xl` 22, `2xl` 28 y `3xl` 36 px.
  - Se usan solo los estilos `t-display`, `t-title`, `t-heading`, `t-subheading`, `t-body`, `t-body-sm`, `t-label`, `t-label-sm`, `t-caption`, `t-overline`, `t-mono` y `t-numeric`, o la escala. Nunca tamaños arbitrarios.
- **Radios:** `rounded-sm` 6, `rounded-md` 10, `rounded-lg` 16 y `rounded-xl` 20 px.
- **Color de etiquetas y estados:** siempre un tono con nombre del DS (`success`, `warning`, `danger`, `info`, `accent`), nunca un color libre.

## 2. Componentes (`@opai/ds`)

Construidos sobre primitivas de Radix (`radix-ui`) al estilo shadcn: copiadas a `packages/ds` y re-estilizadas con tokens. Los pesados se cargan diferidos (ADR-037).

| Necesidad | Componente |
|---|---|
| Acciones | `Button` (`primary`, `secondary`, `ghost`, `destructive`; tamaños `md` 44/40 px, `lg` 48, `icon` 44), `Enlace`, `Menu` |
| Campos | `Campo`, `Input`, `Textarea`, `InputBusqueda`, `Select`, `Combobox`, `Checkbox`, `RadioGroup`, `Switch`, `InputFecha`, `InputHora`, `InputFechaRango`, `CampoDireccion`, `CampoSecreto`, `Uploader` |
| Capas | `Dialog`, `Sheet` (drawer), `Popover`, `Tooltip`, `CommandPalette` (⌘K), `avisar` + `Toaster` |
| Datos | `Table` (`Th`, `Td`, `Tr`), `FilaSeleccionable`, `Badge`, `Chip`, `ChipAgregar`, `ChipToggle`, `Avatar`, `Monograma`, `Timeline`, `Vigencia`, `BarraProgreso`, `Card`, `KpiTile`, `MapaEstatico` |
| Navegación interna | `Tabs` (pestañas por ruta, con contador), `TabsEstado`, `Segmentado` |
| Shell | `AppShell`: barra superior, barra lateral en escritorio, riel en iPad, barra inferior y «Más» en celular, selector de portal, menú de usuario y campana |
| Acceso | `AuthCard`, `Alerta`, `EstadoIlustrado`, `InputPassword` |

Nunca `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>` ni `<a>` crudos en pantallas o módulos: ESLint lo marca como error. Si falta un componente, se pide su diseño.

## 3. Patrones de pantalla

Toda pantalla compone un patrón del DS. Los patrones reciben `state` y resuelven los estados estándar con `Estado`.

| Patrón | Uso | Notas |
|---|---|---|
| **Lista** (`ListScreen`, `SplitScreen`) | Colecciones: cuentas, personas, negocios | Fila como enlace (server-first), búsqueda y filtros con chips, `MetaLista` con conteos. En iPad y escritorio, `SplitScreen` (lista + «Elige un…»); en el celular, solo la lista |
| **Ficha** (`DetailScreen`, `Seccion`, `Pares`) | Detalle de una entidad | Pestañas por ruta en el orden de ADR-041: Resumen → propias → de módulos → Documentos → Actividad. Las etiquetas van como chips bajo el título y no hay pestañas deshabilitadas |
| **Drawer** (`Sheet`) | Crear o editar sin perder el contexto de la lista | Se carga al abrirse (`hojaDiferida`). En el celular ocupa toda la pantalla; la acción principal queda fija abajo (`AccionFijaTelefono`) |
| **Formulario** (`FormScreen`, `AjustesForm`) | Altas largas y configuración | Secciones con título; errores junto al campo; «Guardar» deshabilitado sin cambios; aviso al salir con cambios sin guardar |
| **Planilla** (`PlanillaScreen`) | Pautas, flujo de caja, cotizador | Columnas clave fijas; scroll dentro del contenedor, nunca de la página; números con `t-numeric` |
| **Tablero** (`DashboardScreen`, `KpiTile`) | Inicio y reportes | Cifras con su período; cada tarjeta lleva a su lista |

**Estados obligatorios** en toda pantalla:

| Estado | Componente | Regla |
|---|---|---|
| Cargando | `Loading` con la variante del patrón (`lista`, `detalle`, `formulario`, `planilla`, `dashboard`) | Skeleton con la forma del contenido. El shell no desaparece; aparece de inmediato (< 100 ms, ADR-045) |
| Vacío | `Empty` | Dice qué falta y ofrece la acción para crearlo |
| Error | `ErrorState` | Mensaje en lenguaje de usuario, sin detalles técnicos, con «Reintentar» |
| Sin permisos | `Forbidden` | Explica que no tiene acceso; nunca muestra datos parciales |
| No encontrado (404) | `NoEncontrado` (`not-found.tsx` en cada ruta con `[id]`) | Dentro del shell, con «Ir al inicio». Un id inválido o de otro tenant da 404, nunca un error |

## 4. Celular primero

- Diseñar y verificar a **375 px** (celular) y **1024 px** (iPad) antes que a 1280 px (escritorio). Escritorio es el mismo diseño con más espacio.
- **Área táctil de al menos 44 × 44 px** en todo elemento interactivo (botones `md` = 44 px en celular, chips y filas de lista incluidos).
- **Sin scroll horizontal de página:** el DS fija `grid-template-columns: minmax(0, 1fr)` y `/ds/qa` lo prueba. Las tablas anchas pasan a lista apilada en el celular.
- **Safe-area de iOS:** el shell reserva la barra inferior y `env(safe-area-inset-bottom)`. Nada fijo queda debajo de ella.
- En el celular el título va en la pantalla; en iPad y escritorio, en la barra superior del shell (`titulo`). La acción principal va en el patrón.
- **Movimiento:** transiciones de 150–200 ms que respetan `prefers-reduced-motion`.
- **Accesibilidad:** contraste AA en claro y oscuro, foco visible (`focus`), etiquetas en todos los campos y orden de tabulación lógico.
- **Lo que se hace en el celular:** se ve, se aprueba y se registra. La edición compleja (cotizador, configuración del embudo, importaciones) es de iPad y escritorio, según la especificación de cada módulo.
- Las apps de terreno siguen además ADR-044: PWA, sin conexión y como máximo 150 KB de JS por ruta.
