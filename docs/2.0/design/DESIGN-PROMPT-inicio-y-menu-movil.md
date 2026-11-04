# DESIGN PROMPT — Inicio rediseñado y menú «Más» del teléfono

> **Para pegar en Claude Design:** Usa exclusivamente el design system de OPAI 2.0 (proyecto DS V2 `44e4d7b9`), sus tokens y componentes; nada del estilo de OPAI 1.0. Entrega cada pantalla en escritorio a 1280 px, iPad a 1024 px y teléfono a 375 px, en claro y oscuro. Español de Chile. No inventes datos ni funciones: todo lo que se muestra sale de las capacidades listadas abajo.

**Proyecto:** OPAI 2.0 · **Design system:** DS 2.0 (proyecto DS V2 `44e4d7b9`). Usa solo sus tokens y componentes (`SeccionTarjeta`, `KpiTile`, `FilaSeleccionable`, `Badge`, `Alerta`, `Avatar`, `Segmentado`, `Sheet`, `Button`, `InputBusqueda`, `Skeleton`, `Estado`/`Empty`/`ErrorState`/`Forbidden`). **Nada del estilo de OPAI 1.0.**
**Base:** origin/main `ffac9d10` (4-nov-2026). Tarea: CAR-182 («ordenar el menú por uso y rediseñar Inicio»). Observaciones de Carlos sobre la versión actual del menú «Más», con captura a 375 px (4-nov-2026).

## 1. Objetivo
Dos pantallas que se usan todos los días y hoy no gustan:

- **A. Inicio:** que la persona abra OPAI y vea en cinco segundos **qué requiere su decisión hoy**, **qué tiene que hacer** y **cómo van las cifras clave de su rol**, con sus accesos a un toque. Nada decorativo.
- **B. Menú «Más» del teléfono:** la hoja inferior que abre el botón «Más» de la barra inferior. Debe verse limpia, liviana, sin textos cortados ni solapes, y llegar a cualquier módulo con el menor scroll posible.

Quién decide: Carlos elige una variante de B y aprueba A. Por eso B trae **tres variantes**, la recomendada primero.

## 2. Usuarios y roles
Inicio (`/`) lo ven todos los roles del ERP (owner, admin, gerente, supervisor, viewer, y roles personalizados, ADR-016 y ADR-022). **La página siempre se pinta; lo que cambia es qué bloques hay.** Un bloque sin permiso o sin módulo activo **no aparece** (nunca deshabilitado ni «disponible pronto», ADR-041.5).

| Bloque | owner / admin | gerente | supervisor | viewer |
|---|---|---|---|---|
| Requiere tu decisión | sí (aprobaciones de agentes, documentos, invitaciones, integraciones, anexos) | solo lo que su rol gestiona | solo lo de su alcance | casi siempre vacío |
| Mis tareas de hoy | sí | sí | sí | solo lectura |
| Seguimientos por hacer | si Comercial activo | sí | no (sin Comercial) | lectura |
| Indicadores | los 4: Cobertura, Negocios, Facturado, Tickets | **sin Facturado** (Finanzas bloqueada) | Cobertura y Tickets de sus instalaciones (alcance) | los que pueda leer, sin montos |
| Actividad | sí (auditoría) | según permiso | no | no |
| Fijados y recientes | sí | sí | sí | sí |

Además, el **portal Supervisor** tiene su propio «Hoy» (`/supervisor`: personas con documentos vencidos o por vencer, de las instalaciones a cargo). Se rediseña **solo su cabecera y su estado** con el mismo lenguaje visual (una lámina a 375 px); su contenido no cambia.

Caso de **menú «Más»**: lo usan los mismos roles en el teléfono; las áreas que ve cada uno cambian (Finanzas solo owner/admin; Personas del viewer sin Remuneraciones; el supervisor ve pocas entradas).

## 3. Estado actual verificado (lo que existe hoy)

### 3.1 Inicio hoy (`apps/web/app/(erp)/page.tsx` → `_componentes/inicio.tsx`)
De arriba abajo: saludo («Buenos días, Carlos» en escritorio; «Hola, Carlos» en teléfono), fecha larga y empresa; tres botones de acceso rápido (Nueva cuenta, Agregar persona, Nueva instalación: en escritorio arriba a la derecha, en teléfono tres botones en cuadrícula debajo de «Requiere tu decisión»); **indicadores** (4 `KpiTile`: Cobertura hoy, Negocios abiertos, Facturado del mes, Tickets); **«Requiere tu decisión hoy»** (una fila por tema con su botón: «Revisar», «Reenviar»); **Actividad** (últimos 6 eventos de personas y agentes, con `Segmentado` Todo / Personas / Agentes); **«Mis tareas»** (vencidas y de hoy); **«Seguimientos por hacer»** (hasta 4 negocios, con «Atrasado»). En escritorio, dos columnas (principal + 380 px); en teléfono, una.
La Bandeja **no** se repite en Inicio (CAR-182): vive en `/bandeja` y Inicio solo muestra el punto en la barra inferior (D5).
Problemas: la decisión y las tareas quedan lejos de la cima; en teléfono las acciones rápidas compiten con lo urgente; el bloque de Actividad (informativo) pesa más que las tareas; los indicadores no dicen a qué lista llevan; no hay accesos fijados ni recientes en la pantalla.

### 3.2 «Más» hoy (`packages/ds/src/shell/contenido-mas.tsx`, `mas-acceso.tsx`, decisión D12 y D13)
Hoja inferior (`Sheet`) con título «Más»: campo de búsqueda; fila «Recientes y fijados» (hasta 4 baldosas de 80 px, fijados primero, botón «Editar» para desfijar); luego **cada área en cuadrícula de 3 columnas con baldosas de 88 px** (ícono en ficha de 36 px y nombre); Configuración al pie. Las áreas son las de `NAVEGACION.md`: Comercial · Operaciones · Personas · Finanzas · Documentos.
Problemas observados por Carlos (captura a 375 px, usuario owner):
1. **Cabecera solapada:** «Gard Security» pisa el ícono de buscar y «ERP» (el selector de portal no se trunca ni cede espacio a los cuatro botones fijos: buscar, agente, campana, avatar).
2. **Etiquetas fuera de su baldosa:** «Configuración» y «Remuneraciones» desbordan; «Instalaciones» queda al ras.
3. **Baldosas grandes y pesadas, demasiado scroll:** Comercial ocupa 7 baldosas en 3 filas; Personas tiene una sola baldosa en una fila entera; Finanzas queda cortada al fondo.
4. **«Recientes y fijados» repite** lo que ya está abajo (Configuración, Pauta, Hoy en Finanzas, Cobranza aparecen dos veces).
5. **Íconos repetidos:** «Hoy en Finanzas» y «Mis tareas» comparten ícono (`ListChecks`); «Cobranza» y «Remuneraciones» comparten billetera (`Wallet`); «Ventas» y «Compras» comparten hoja (`FileText`).
6. **El título de la página queda detrás de la hoja** (se lee «Configuración» tapado por el scrim).
7. **Dos buscadores distintos (dato de Carlos, captura de la búsqueda):** el campo «Buscar módulos, personas, documentos…» de «Más» **no es un campo**: es un botón con apariencia de campo (`BuscadorMas`, `mas-acceso.tsx`) que cierra la hoja y, con un `setTimeout`, abre la paleta global (`CommandPalette`, `components/command-palette.tsx`) a pantalla completa, con otro texto de ayuda («Buscar cuentas, instalaciones, personas o ajustes»), botón «Cancelar» y secciones Agente («Preguntar a OPAI»), Recientes (hasta 8–10 lugares) y Acciones (Nueva cuenta, Agregar guardia, Nueva instalación). Se hizo así para no tener dos capas modales a la vez, pero la persona toca un campo, no puede escribir y la pantalla cambia: parece dos buscadores. La barra superior (ícono de buscar) abre esa misma paleta, así que hoy hay dos puertas a la misma búsqueda con aspectos distintos.

### 3.3 Reglas de navegación que NO cambian (`NAVEGACION.md`)
- Áreas por trabajo, no por módulo; máximo 7 entradas por área; una entrada sola se muestra suelta, pero (D12) toda área lleva encabezado con ícono; el área de la página actual se distingue aunque esté plegada; la entrada activa lleva barra o marca de acento.
- Barra inferior del teléfono: **Inicio · Pauta · Personas · Bandeja · Más** (según disponibilidad y permisos). Inicio con punto si hay Bandeja pendiente; el número solo dentro de la pantalla (D5). «Más» **no** duplica las entradas de la barra inferior ni la cuenta del usuario.
- Barra superior del teléfono: selector de portal/empresa a la izquierda; a la derecha, fijos, **Buscar · agente (robot, D11, solo cuando exista) · campana · avatar**. El orden y el tamaño de ese grupo no cambian (CAR-12).
- Búsqueda global (⌘K / «Buscar») sigue siendo la forma principal de saltar. **Cambio pedido por Carlos:** en el teléfono hay un solo flujo de búsqueda; el campo de «Más» se escribe ahí mismo (ver 5.1) y comparte superficie, texto y fuente con el ícono de la barra superior.
- Fijados: hasta 5 por usuario y empresa, ordenados por fecha de fijado (D3). Recientes: últimos 10 lugares visitados, guardados en el navegador.
- Menú para colecciones, pestañas para partes (ADR-041): no se agregan entradas nuevas.

## 4. Pantalla A — Inicio

### 4.1 Contenido propuesto (de arriba abajo, en el teléfono; en escritorio, ver 4.2)
1. **Saludo compacto:** «Hola, Carlos» · fecha · (escritorio: empresa). Sin foto ni ilustración.
2. **Requiere tu decisión hoy** (primero, siempre que haya algo). Filas con ícono tonal (`warning`, `danger`, neutro), título («2 aprobaciones de agentes»), detalle («1 de riesgo alto · la más antigua vence en 3 h») y acción. Teléfono: fila completa tocable (≥ 44 px, `FilaSeleccionable`); escritorio: botón por fila, el primario solo para aprobaciones. Máximo 5 filas; si hay más, «Ver todo» (lleva a la Bandeja).
3. **Mis tareas de hoy:** vencidas primero, luego de hoy; hasta 5; completar desde la fila (casilla) si el rol puede; «Ver todas» a `/tareas`. Sin tareas, el bloque no aparece.
4. **Indicadores clave** (`KpiTile`, 2 × 2 en teléfono, 4 en una fila en 1280, 2 × 2 en 1024). **Cada tarjeta es un enlace a su lista** y dice su período: Cobertura de hoy → Pauta; Negocios abiertos → Negocios; Facturado del mes → Ventas; Tickets → Tickets. Tono de la variación solo con `success`, `warning`, `danger` o neutro, nunca solo color (siempre texto: «2 turnos sin cubrir de 48»).
5. **Seguimientos por hacer** (Comercial): hasta 4 negocios, con «Atrasado» en `danger`; «Ver pendientes».
6. **Tus accesos:** fijados primero y recientes después, sin repetir, en una fila de baldosas compactas (ver 4.3); «Editar» para fijar/desfijar. Reemplaza a los tres botones fijos de acceso rápido.
7. **Crear:** un solo botón «Crear» (`Menu`) con las acciones de `acciones` del núcleo permitidas al rol (Nueva cuenta, Agregar persona, Nueva instalación, Nueva cotización…). Escritorio: arriba a la derecha, junto al saludo. Teléfono: botón secundario al final de la cabecera.
8. **Actividad reciente** (último; informativo): 6 eventos, con `Segmentado` Todo / Personas / Agentes. En teléfono va al final y plegado a 3 filas con «Ver más».

No se muestra la Bandeja completa ni se agrega otro contador: el punto de la barra inferior y la campana ya cumplen esa función (D5, D6).

### 4.2 Responsive
- **375 px:** una columna, en el orden de 4.1. Gutter 16 px. Cabecera sin título duplicado (el título está en la pantalla, no en la barra). Nada fijo tapa contenido: la barra inferior reserva `env(safe-area-inset-bottom)`.
- **1024 px (iPad, barra lateral completa, D9):** indicadores 2 × 2; debajo, dos columnas 60/40: izquierda *Requiere tu decisión* + *Mis tareas*; derecha *Tus accesos* + *Seguimientos*; Actividad a todo el ancho al final. Título «Inicio» en la barra superior.
- **1280 px:** fila de 4 indicadores; debajo, dos columnas (principal flexible + lateral 380 px). Principal: *Requiere tu decisión*, *Mis tareas*, *Seguimientos*. Lateral: *Tus accesos*, *Actividad*. Botón «Crear» arriba a la derecha.

### 4.3 Componente nuevo a diseñar: `AccesoRapido`
Baldosa compacta (≥ 44 px de alto, ancho flexible, ícono 20 px, etiqueta en una línea con elipsis y `Tooltip`/`title` con el nombre completo). Estados: reposo, hover, foco, presionado, activo (es la página actual), fijado (pin pequeño), en edición (botón de desfijar de 44 px). Mostrar tres en fila en 375 px y cinco en 1280 px.

### 4.4 Datos y capacidades (todo existe hoy; no se pide nada nuevo)
| Bloque | Capacidad (herramienta MCP) | Notas de datos |
|---|---|---|
| Requiere tu decisión | `core.inicio.pendientes` (`core_inicio_pendientes`) | `tipo` (aprobaciones, documentos, invitaciones, integraciones, anexos), `titulo`, `detalle`, `tono`, `href`, `accion`. Sin permiso devuelve vacío, un fallo se ve como error |
| Mis tareas | `core.actividades.tareas` + `core.actividades.completar` | vencidas y de hoy; completar exige permiso `actividadesManage` |
| Indicadores | `core.inicio.indicadores` (`core_inicio_indicadores`) | cada indicador llega `null` sin permiso o sin módulo; se omite la tarjeta |
| Seguimientos | `comercial.seguimientos.list` | solo pendientes del usuario, estado activo |
| Actividad | `core.actividad.list` | personas y agentes; requiere permiso de auditoría |
| Fijados | `core.config.get` / `core.config.set` (`navegacion_fijados`, máx. 5) | ya existe; control optimista de revisión |
| Recientes | local en el navegador (últimos 10) | es una preferencia de interfaz, sin dato de negocio ni herramienta MCP; no se envía al servidor |
| Crear | acciones de `navegacionErp().acciones` (filtradas por permiso y módulo activo) | cada una abre su flujo y termina en su capacidad de escritura (con `dryRun`) |

**Regla agent-first (ADR-055):** esta pantalla **no suma datos ni acciones nuevas**. Si el diseño propone un indicador o una acción que no esté en esta tabla, hay que listarlo aparte como «propuesta que requiere capacidad nueva con herramienta MCP»; no se dibuja como si existiera. Candidatas para una fase posterior (no diseñar, solo mencionar en notas): *cobranza vencida* (Finanzas), *cotizaciones por vencer* (CPQ), *documentos por vencer* resumido con conteo.

### 4.5 Estados (cada bloque, a 375 y 1280, claro y oscuro)
- **Cargando:** `Skeleton` con la forma de cada bloque (cabecera, 4 `KpiTile`, filas de pendientes, fila de accesos). El shell aparece de inmediato; los bloques cargan por separado (Suspense) y no se desplazan al llegar.
- **Vacío:**
  - Decisión: «Nada pendiente. Lo urgente aparecerá aquí» con ícono de visto bueno.
  - Tareas: el bloque no aparece (o una línea «Sin tareas para hoy» si es el único bloque visible).
  - Accesos: «Fija las páginas que más usas desde el menú» + acción «Ver el menú».
  - Empresa nueva sin módulos con indicadores: ningún `KpiTile`; en su lugar una `Alerta` informativa con «Ver módulos».
- **Error:** por bloque, `ErrorState` corto («No pudimos cargar tus pendientes») con «Reintentar»; un bloque con error no tumba a los demás. Hoy los indicadores desaparecen en silencio si fallan: se propone una fila discreta «No pudimos actualizar los indicadores · Reintentar».
- **Sin permisos:** la página nunca es «Prohibido»: se ve solo lo permitido. Solo si el rol no puede leer **nada** de Inicio (rol personalizado vacío), mostrar `Forbidden` dentro del shell. Mostrar la **comparación de cuatro roles a 1280** (owner, gerente, supervisor, viewer) lado a lado.
- **Datos parciales:** dos indicadores `null` y dos con valor (gerente sin Facturado); una tarjeta con «—» y «Sin turnos hoy».
- **Cargando más / fallo de red** en «Mis tareas» al completar una (reversión visible con aviso, `avisar`).

## 5. Pantalla B — Menú «Más» del teléfono

### 5.1 Reglas comunes a las tres variantes
- **Contenido (D13, se mantiene el orden):** (1) búsqueda arriba; (2) **«Fijados y recientes»** una sola vez; (3) las áreas; (4) Configuración al pie. Nada de cuenta de usuario ni entradas de la barra inferior.
- **UN solo flujo de búsqueda en el teléfono (decisión de Carlos, 4-nov-2026).** Hoy son dos (ver 3.2, punto 7) y debe haber uno. Reglas:
  1. El campo de búsqueda de «Más» es un **campo real**: se escribe ahí mismo, en el mismo lugar, sin cerrar la hoja ni abrir otra pantalla. Mientras se escribe, filtra módulos y entradas del menú, y muestra resultados de personas, cuentas, instalaciones y ajustes en la misma hoja.
  2. **Estado inicial (campo vacío o recién enfocado):** se ven las mismas secciones que hoy muestra la paleta: Agente («Preguntar a OPAI», solo si el agente existe, D11), Recientes y Acciones (Nueva cuenta, Agregar persona, Nueva instalación…, según permisos). Los fijados y las áreas del menú se ven cuando el campo está vacío y sin foco; al enfocar el campo, la hoja pasa a modo búsqueda (la lista de áreas cede su lugar a Agente, Recientes y Acciones, con «Cancelar» a la derecha del campo, como hoy).
  3. **Con texto:** secciones de resultados con encabezado (Módulos, Personas, Cuentas, Instalaciones, Ajustes, Acciones), el término resaltado, hasta 5 por sección y «Ver todos». Sin resultados: «No encontramos “xyz”. Prueba con otra palabra» y enlaces a las áreas.
  4. **Mismo componente y mismo texto de ayuda en las dos puertas:** el ícono de buscar de la barra superior y el campo de «Más» abren **la misma superficie** (la paleta o la hoja en modo búsqueda; Claude Design elige y justifica la que quede más natural en 375 px, pero solo una), con el mismo texto de ayuda único («Buscar o ir a…»: módulos, personas, cuentas, instalaciones, ajustes) y el mismo «Cancelar». Se elimina el segundo texto («Buscar módulos, personas, documentos…»).
  5. Una sola capa modal a la vez y el foco no se pierde: tocar el campo no debe producir un salto visual ni cerrar y reabrir nada. «Cancelar» o Escape vuelve al menú «Más» tal como estaba (misma área abierta y mismo scroll).
  6. Fuente de datos: la misma capacidad `core.buscar` (herramienta MCP `core_buscar`) que usa hoy la paleta, más las entradas del menú, las acciones y los recientes locales; nada de capacidades nuevas.
  7. Escritorio e iPad no cambian: la caja ⌘K de la barra superior sigue abriendo la paleta; el diseño debe mostrar que es el mismo componente que el del teléfono.
- **Sin duplicados:** «Fijados y recientes» **excluye** las entradas de la barra inferior y marca con un pin pequeño las que además están en las áreas, o bien las oculta de las áreas mientras estén fijadas (probar ambas en la variante A y elegir la más clara; reportar la elección).
- **Etiquetas completas, nunca cortadas.** Se usa siempre el nombre completo (la regla de nombres de `NAVEGACION.md` §6 prohíbe abreviar: nada de «Instalac.»). Si no cabe en una línea, pasa a dos con `line-clamp-2` y `text-balance`; nunca desborda su contenedor ni se corta una palabra. Las filas a ancho completo (variantes A y C) lo resuelven sin recortes; la cuadrícula (variante B) debe demostrarlo con «Remuneraciones» y «Configuración».
- **Táctil:** cada elemento interactivo ≥ 44 × 44 px; separación ≥ 8 px entre objetivos.
- **Hoja:** altura máxima 90 % del alto, esquinas superiores `rounded-xl`, asa de arrastre visible, botón cerrar de 44 px, `scrim` del DS, `pb-[env(safe-area-inset-bottom)]`. La hoja **cubre la barra superior** (o la deja inerte debajo del scrim) para que el título de la página no se lea detrás. Una sola capa modal a la vez.
- **Íconos distintos para cada entrada** (propuesta lucide para esta entrega; el cambio de código va en un brief aparte): Hoy en Finanzas `LayoutDashboard` · Mis tareas `ListChecks` · Ventas `FileText` · Compras `ShoppingCart` · Cobranza `HandCoins` · Remuneraciones `Banknote` · Bancos `Landmark` · Flujo de caja `ChartLine` · Pendientes `BellRing` · Solicitudes `NotebookPen` · Cotizaciones `ReceiptText` · Contactos `ContactRound` · Cuentas `Building2` · Negocios `Briefcase` · Pauta `CalendarDays` · Tickets `Ticket` · Instalaciones `MapPin` · Personas `Users`. Si Claude Design propone otros, deben ser únicos dentro de «Más».
- **Área activa:** la que contiene la página actual abre expandida (en las variantes con colapso) y su entrada activa lleva marca de acento (`accent` y `accent-muted`, `aria-current="page"`).
- **Estado recordado:** qué áreas están abiertas se recuerda por usuario y empresa (como el acordeón de la barra lateral, D1).

### 5.2 Variante A (recomendada): lista compacta con áreas colapsables
Una columna a ancho completo. Cada entrada es una **fila de 48 px**: ícono de 20 px sin ficha de fondo, nombre completo en `t-body`, marca de acento a la izquierda si es la activa. Cada área es un encabezado de 48 px (ícono del área, nombre, cantidad de entradas en `t-caption`, chevron) que pliega y despliega con transición de 150–200 ms (`prefers-reduced-motion` la quita). Solo la del área activa viene abierta; las demás, plegadas, de modo que **se ven las cinco áreas y Configuración sin scroll** en un teléfono de 667 px de alto. «Fijados y recientes» es una fila horizontal de hasta 4 `AccesoRapido` (ver 4.3) bajo la búsqueda.
*Por qué es la recomendada:* resuelve de una vez el desborde de etiquetas (el ancho completo admite «Remuneraciones» y «Configuración»), el scroll (cinco encabezados caben en pantalla) y la repetición visual; es lo más parecido a la barra lateral que ya conocen en escritorio.
*Contra:* un toque más para llegar a una entrada de un área plegada; mitigado por «Fijados y recientes».

### 5.3 Variante B: cuadrícula densa
Cuadrícula de **4 columnas** de baldosas de 72 px de alto (ícono de 24 px sin ficha, etiqueta en `t-caption` de hasta 2 líneas centradas, `text-balance`, etiqueta corta aprobada cuando no quepa). Las áreas son encabezados de 44 px con ícono, **plegables** como en A (abierta solo la activa). Fijados y recientes: una fila de 4 baldosas con el mismo tamaño que las demás pero con fondo `accent-muted`. Mostrar cómo se ve con 7 entradas (Comercial: 4 + 3 en dos filas) y con 1 (Personas: una baldosa, sin dejar una fila vacía visual: encabezado y baldosa en una sola línea).
*A favor:* más parecida a la versión actual y a un lanzador; *en contra:* sigue dependiendo de etiquetas cortas y de leer íconos.

### 5.4 Variante C: pestañas de área + lista del área elegida
Bajo la búsqueda y los fijados, una fila de **chips de área** (`Segmentado` o `ChipToggle`, 44 px, con scroll horizontal controlado y degradado en los bordes) con Comercial · Operaciones · Personas · Finanzas · Documentos. Debajo, **solo la lista del área elegida** (filas de 48 px como en A). La hoja tiene altura fija y no hay scroll largo; el área activa es la elegida al abrir. Configuración queda fija al pie.
*A favor:* cero scroll vertical largo y orientación inmediata; *en contra:* esconde las demás áreas hasta cambiar de chip (un toque) y exige un patrón de pestañas dentro de una hoja que el DS aún no tiene (`Tabs` por ruta no sirve aquí: sería un componente de selección local, `TabsEstado`).

### 5.5 Barra superior a 375 px (se corrige en esta entrega)
Mostrar el arreglo del solape, sin cambiar el orden del grupo fijo: el selector de portal/empresa pasa a **monograma + nombre de la empresa truncado con elipsis** (`min-w-0`, máximo el ancho libre tras reservar los cuatro botones de 44 px = 176 px + márgenes) y la etiqueta «ERP» se mueve dentro del selector (se ve al abrirlo), no junto al nombre. Probar con nombres largos («Gard Security Servicios Integrales Limitada») y con el robot de agente presente y ausente.

### 5.6 Estados de «Más» (a 375 px, claro y oscuro)
- Abierto (por defecto), con el área activa expandida; con otra área activa; sin ninguna activa (página fuera de las áreas, por ejemplo Configuración).
- **Sin fijados ni recientes:** «Aquí aparecen las páginas que visitas y las que fijas» (una línea, sin hueco).
- **Editando fijados:** botón de desfijar de 44 px sobre cada fijado; «Listo» para salir.
- **Error al cargar fijados:** línea «No pudimos cargar tus fijados · Reintentar».
- **Roles:** owner (cinco áreas), supervisor (pocas entradas, áreas de una entrada con encabezado, D12), viewer (sin Remuneraciones, sin Finanzas). Un área sin entradas visibles no aparece.
- **Búsqueda unificada:** mostrar en láminas (a) campo enfocado y vacío con Agente, Recientes y Acciones; (b) escribiendo, con resultados por sección; (c) sin resultados; (d) cargando resultados (esqueleto) y error de búsqueda con «Reintentar»; (e) la misma superficie abierta desde el ícono de la barra superior. Sin salto ni cierre de capa al tocar el campo.
- **Oscuro** con `scrim`, bordes y estados de foco visibles.

## 6. Accesibilidad (obligatoria)
- Foco visible (`focus`) en todo; orden de tabulación lógico (búsqueda, fijados, áreas en orden, Configuración, cerrar). La hoja atrapa el foco, se cierra con Escape y devuelve el foco al botón «Más».
- Contraste AA en claro y oscuro (texto `fg` y `fg-muted` sobre `surface`; el texto de tono sobre `*-muted` usa el par `*-fg`). El estado no se comunica solo con color: texto + ícono (por ejemplo «Atrasado» con ícono).
- Áreas táctiles ≥ 44 × 44 px (chips, filas, baldosas, botones de cierre y de desfijar).
- `prefers-reduced-motion`: sin animaciones de despliegue ni de la hoja (cambio instantáneo).
- Encabezados semánticos de área (`h2`), listas reales, `aria-current="page"` en lo activo, `aria-expanded` en los plegables, etiquetas accesibles en los íconos solos.
- Safe-area de iOS: nada fijo queda bajo la barra inferior ni bajo la barra de inicio.
- Sin scroll horizontal de página (excepto la fila de chips de la variante C, contenida en su contenedor).

## 7. Tokens y componentes del DS que deben usarse
Solo tokens `--ds-*` (nada de hex) y clases `t-*`. Superficies `bg`, `surface`, `surface-raised`, `fill`, `scrim`; texto `fg`, `fg-muted`, `fg-subtle`; bordes `border`, `border-strong`; acento `accent`, `accent-fg`, `accent-muted`; estados `success`, `warning`, `danger`, `info` con `-fg` y `-muted`; radios `rounded-md` 10, `rounded-lg` 16, `rounded-xl` 20; `shadow-overlay` solo en la hoja; movimiento 150–200 ms (`dur`, `ease`). Tipografía: `t-title` para el saludo, `t-heading` para títulos de bloque, `t-body` y `t-body-sm` para filas, `t-caption` para detalles, `t-numeric` en las cifras de los indicadores (JetBrains Mono en montos y folios).
Componentes existentes: `SeccionTarjeta`, `KpiTile`, `FilaSeleccionable`, `Badge`, `Alerta`, `Avatar`, `Segmentado`, `Skeleton`, `Estado` (`Empty`, `ErrorState`, `Forbidden`), `Button` (`primary`, `secondary`, `ghost`; `md` 44 px), `Menu`, `Sheet`, `Tooltip`, `ChipToggle`, `avisar`. Íconos lucide de 20 px.
Componentes nuevos a mostrar en una lámina con sus estados (reposo, hover, foco, presionado, activo, deshabilitado no aplica): `AccesoRapido`, `EntradaMas` (fila de 48 px), `EncabezadoAreaMas` (con chevron y conteo), y, solo en la variante C, `SelectorAreaMas`.

## 8. Qué NO cambia
- El mapa de áreas y entradas, su orden, los nombres y las rutas (`NAVEGACION.md`).
- La barra inferior del teléfono (Inicio · Pauta · Personas · Bandeja · Más) y el punto de Inicio.
- El orden y el tamaño del grupo fijo de la barra superior (Buscar, agente, campana, avatar) y la regla D11.
- La barra lateral de escritorio y el riel de iPad (solo se verifica que «Inicio» no cambie).
- La Bandeja: vive solo en `/bandeja`; la campana abre su vista corta.
- Permisos, alcance de filas y capacidades: el menú y Inicio solo presentan lo que ya está autorizado; no hay lógica nueva de seguridad.
- Los destinos de los indicadores y los textos de negocio de las capacidades.
- El portal Supervisor, Trabajador, Cliente y Terreno (salvo la lámina de cabecera de «Hoy» del Supervisor).

## 9. Entregables
Pantallas numeradas `NN_Nombre_ancho`, cada una en claro y oscuro salvo indicación:
- **A · Inicio:** `01` owner 1280; `02` owner 1024; `03` owner 375; `04` comparación de cuatro roles a 1280 (owner, gerente, supervisor, viewer); `05` estados a 375 (cargando, vacío, error por bloque, datos parciales); `06` empresa nueva sin módulos; `07` Hoy del portal Supervisor 375.
- **B · Más:** `10` variante A abierta a 375 (con área activa), `11` variante A con otra área y sin activa, `12` variante B, `13` variante C, `14` comparación de las tres a 375 lado a lado, `15` editando fijados, `16` sin fijados ni recientes, `17` roles (owner, supervisor, viewer), `18` barra superior a 375 con nombre largo (antes y después), `19` búsqueda unificada a 375: enfocado/vacío, escribiendo, sin resultados, cargando y error, y abierta desde la barra superior (misma superficie).
- **Láminas:** `20` componentes nuevos con estados; `21` tabla de íconos únicos de «Más».
- Un comentario por pantalla con las capacidades que usa (de 4.4) y cualquier dato que el diseño necesite y no exista (lista de «requiere capacidad nueva»).

## 10. Criterios de aceptación visuales
1. Ninguna etiqueta del menú «Más» se corta, desborda ni se solapa con otra a 375 px (probar «Remuneraciones», «Configuración», «Instalaciones», «Solicitudes» y un nombre de tenant largo).
2. La variante recomendada muestra las cinco áreas y Configuración **sin scroll** a 375 × 667, con una sola área abierta; con todas abiertas, el scroll no pasa de dos pantallas.
3. Ninguna entrada aparece dos veces en «Más» sin marca explícita; no hay dos íconos iguales en la hoja.
4. Todo elemento interactivo mide ≥ 44 × 44 px (se verifica en el diseño con medidas visibles).
5. En Inicio, lo urgente (decisión y tareas) está en la primera pantalla a 375 px y a 1280 px; los indicadores son tocables y dicen su período.
6. Cada bloque de Inicio tiene sus cuatro estados dibujados (cargando, vacío, error, sin permiso/ausente) y ninguno rompe el diseño de los demás.
7. Solo tokens y componentes del DS 2.0; ningún hex, ningún tamaño de letra fuera de la escala; claro y oscuro con contraste AA.
8. La barra superior a 375 px no solapa el selector con los botones fijos con un nombre de empresa de 40 caracteres.
9. Todo dato mostrado corresponde a una capacidad de 4.4; lo que no, está listado como «requiere capacidad nueva».
10. Hay **un solo** buscador en el teléfono: el campo de «Más» se escribe en su lugar, comparte superficie y texto de ayuda con el ícono de la barra superior, y muestra Agente, Recientes y Acciones como estado inicial y resultados por sección al escribir; no hay cierre y reapertura de capas.
11. Respeta `NAVEGACION.md`: áreas y orden, barra inferior, sin contadores salvo la Bandeja, Configuración al pie, sin cuenta ni duplicados de la barra inferior en «Más».
