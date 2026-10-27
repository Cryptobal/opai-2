# BRIEF DE IMPLEMENTACIÓN — 05 NAVEGACIÓN POR ÁREAS (Núcleo, paso 1)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/05-navegacion` (desde `main` actualizado) · **Fecha:** 26-oct-2026 · **Estado:** **aprobado para ejecución** (fuente: «avanzamos con esto entonves? la navegación nueva (Brief 05) […]» — Carlos, 26-oct-2026 11:36 CLT, chat con el bot OPAI 2.0, t303u). El PR A (cabecera estable, CAR-12) está en ejecución. · **Tareas:** CAR-13 (este documento) · CAR-12 (criterio obligatorio, §14; `Fixes CAR-12` en el PR A de la ejecución) · **Depende de:** Brief 02 (sesiones A–C integradas); **el PR B depende del PR 2 del Brief 03** (shell en el layout, §2 y §15) · **Reglas:** ADR-046, `NAVEGACION.md` (con las decisiones del 26-oct, §10 de ese archivo), ADR-014, ADR-016, ADR-017, ADR-018/038, ADR-041, ADR-045, ADR-048 · **Diseño aprobado:** [Navegación OPAI 2.0 (Brief 05)](https://claude.ai/design/p/53e9b74b-3cbf-4ad4-858f-271dfc2ef465), 28 pantallas, aprobado (fuente: «Confirmo que apruebo el diseño 53e9b74b» — Carlos, 26-oct-2026 10:51 CLT, chat con el Revisor OPAI 2.0 (t117u; dictado por voz)). Las decisiones de navegación D1–D10 las tomó el bot OPAI 2.0 bajo la delegación de Carlos: «Sí, que OPAI 2.0 decida los criterios de navegación. […] Pero todos tienen que ser con la paleta de diseño» — Carlos, 26-oct-2026 10:53 CLT, chat con el Revisor OPAI 2.0 (t120u; dictado por voz); van en §4.2 y en `NAVEGACION.md` §10. D10 además ya es regla de ADR-016. Toda la navegación usa la paleta y los tokens del diseño aprobado (R8). D1–D10 quedan como reglas del Brief 05 sujetas a la aprobación del brief por Carlos.

> **Ejecución.** Claude ejecuta este brief cuando Carlos lo apruebe, en la rama `brief/05-navegacion`, con un commit por bloque y el gate en verde, autorrevisión con un subagente, PR y revisión del «Revisor OPAI 2.0»; integra el bot «OPAI 2.0» con squash (ADR-043 v3). **El bloque 0 del PR B se detiene** si el export del diseño no está en el repo (§2, punto 7); el PR A puede avanzar mirando las pantallas en Claude Design (§11).

---

## 1. Objetivo

Cambiar el shell del portal ERP de un menú por módulos («Maestros», «Módulos») a un **menú por áreas** (lo que la persona hace: vender, operar, pagar), según ADR-046 y `NAVEGACION.md`, con:

- áreas plegables en la barra lateral (escritorio desde 1024 px), máximo seis áreas y siete entradas por área, Inicio suelto arriba y Configuración al pie;
- **fijados** por usuario (hasta cinco), **recientes** y **acciones** en ⌘K;
- **barra inferior por área principal** en el celular, con hoja «Más» y preferencia de área principal;
- la **Bandeja dentro de Inicio**, con la campana y el punto de no leído apuntando a ella;
- **solo lo contratado y permitido** (ADR-048): nada deshabilitado ni «disponible pronto»;
- una **cabecera estable**: campana, buscador y usuario no cambian de tamaño ni de posición entre vistas (CAR-12).

Se nota que funciona cuando una persona encuentra cualquier colección en un clic o con ⌘K, y la cabecera y la barra lateral no se mueven al navegar.

## 2. Estado actual del repo (verificado el 26-oct-2026 sobre `main` `f1c4064`)

1. **Navegación:** `apps/web/lib/navegacion.ts` (`navegacionErp`, `NAV_PLATAFORMA`, `navegacionPortal`) arma `ItemNav` con `grupo` «Maestros», `contador` por entrada, `corta` («Instalac.», «Cargos»), `soloAmplio`/`soloCompacto` y una entrada de aprobaciones que aparece solo con pendientes. No hay `area`, fijados ni recientes.
2. **Shell:** `packages/ds/src/shell/` (`app-shell.tsx`, `sidebar.tsx`, `rail.tsx`, `nav.tsx`, `menu-mas.tsx`, `top-bar.tsx`, `user-menu.tsx`, `portal-switcher.tsx`, `contador.tsx`). Barra lateral desde `xl` (1280), riel de 768 a 1279, barra inferior bajo 768. El shell se monta dentro de cada página (`PaginaPortal`), no en el layout; moverlo al layout es del PR 2 del Brief 03 (Claude, pendiente). Sin eso no se cumplen R7 ni CA12, así que **el PR B no empieza hasta que el PR 2 del Brief 03 esté integrado** (§15).
3. **Causa de CAR-12:** `AppBar` (`top-bar.tsx`) pinta, de izquierda a derecha, título e insignia, buscar, campana, usuario y **al final** `acciones` de la página. Como las acciones cambian de ancho entre vistas («Agregar persona» en Personas, «Nueva cuenta» en Cuentas, otra en Vencimientos), los íconos fijos se corren. Además, el buscador cambia entre caja de 256 px e ícono según el ancho, y en el teléfono `TopBarTelefono` reemplaza búsqueda y campana por las acciones cuando hay «Atrás». Hoy la barra superior del teléfono no tiene avatar (selector de portal, búsqueda y campana); el avatar a 375 es nuevo y viene del diseño (pantalla 14). Además, `REGLAS-codigo.md` (UI) dice que «la acción principal va en el patrón», pero hoy `PaginaPortal` la pasa a `AppBar`: este brief la mueve al patrón, lo que resuelve CAR-12 de raíz.
4. **⌘K:** `CommandPalette` (`packages/ds/src/components/command-palette.tsx`) busca entidades con `core.buscar`; sin acciones ni recientes.
5. **Capacidades que ya existen y usa este brief:** `core.buscar`, `core.notificaciones.list/marcar_leida/marcar_todas`, `core.aprobaciones.list/get/aprobar/rechazar`, `core.config.get/set/schema` con ajustes de ámbito `usuario` (`defineAjustes`, ADR-038; hoy `preferencias_tema`, `preferencias_silencio`).
6. **Personas:** «Vencimientos» es una vista dentro de Personas (`SegmentoPersonas` en la barra superior de escritorio; ícono en la cabecera de la lista en el celular). Se mantiene (decisión 8).
7. **Diseño:** las 28 pantallas están en Claude Design; **todavía no hay export en el repo** (el diseñador dejó anotado «Nothing exported yet»). El bloque 0 del PR B lo exige en `docs/2.0/design/export-navegacion/`.
8. **e2e:** Playwright con proyectos `telefono` (375), `ipad` (1024) y `desktop` (1280) en `apps/web/playwright.config.ts`; corre en el job `e2e` de CI, que **no es check obligatorio**.

## 3. Alcance

### Incluido

- Modelo de navegación por áreas: `area` en `ItemNav` y en el manifest (`navegacion` de `defineModule`, lista cerrada de áreas, `NAVEGACION.md` §7); el núcleo arma grupos, aplica límites y orden.
- Barra lateral por áreas (pantallas 01–07), grupos plegables en acordeón, fijados, Inicio suelto y Configuración al pie; desde 1024 px.
- Fijar y desfijar (ícono pin en hover y en la cabecera de la ficha), con persistencia por usuario.
- ⌘K con recientes (10), acciones declaradas por módulo y resultados por tipo (pantallas 08–12, 19–22).
- Barra inferior por área principal con respaldo, hoja «Más» y Preferencias → Área principal (pantallas 14, 16–18, 23).
- Bandeja dentro de Inicio (aprobaciones y avisos), punto de no leído en Inicio (barra inferior) y en la campana (pantalla 15).
- Cabecera estable (CAR-12) en `AppBar` y `TopBarTelefono`.
- Estados vacíos, 404 en el shell y etiquetas largas por vocabulario (pantallas 25 y 26).
- Renombres de `NAVEGACION.md` §6 en el ERP («Maestros» desaparece; sin abreviaturas; «Configuración» en el menú del celular).
- Componentes nuevos del DS de la pantalla 28 (§8.2), en `/ds` con sus estados.

### Excluido

- Pantallas propias de los portales Supervisor, Trabajador, Terreno, Cliente y Plataforma (se diseñan con su fase). Este brief solo deja su navegación declarada como hoy.
- El contenido de las pantallas de cada módulo y las entradas de módulos que no existen todavía (aparecen solas cuando el módulo se active, sin código nuevo en el shell).
- Tareas en la Bandeja (llegan con Comercial, fase 2).
- PWA (Brief 04), shell en el layout (Brief 03, PR 2: requisito del PR B, no se hace aquí) y roles personalizados (Brief 07c, integrado en `main` (PR #36, `72ddaa7`)).
- El panel de riel para iPad que aparece en la pantalla 28: queda descartado por la decisión 9.
- **El agente interno de OPAI (ADR-049, propuesto en PR #38, pendiente de merge): reservado, se construye en el brief del agente interno.** Este brief solo reserva su punto de entrada (§4.4); no construye componente, acción, ajuste ni capacidad para él.

## 4. Arquitectura

### 4.1 Reglas (de `NAVEGACION.md`; no cambian)

R1. Áreas en lista cerrada y en este orden: Inicio (suelta), Comercial, Clientes, Operaciones, Personas, Finanzas, Documentos; Configuración al pie, una sola entrada.
R2. Un área aparece si al menos una entrada está activa en el tenant y el rol la puede leer; sin entradas deshabilitadas, candados ni «disponible pronto» (ADR-041.5, ADR-048).
R3. Un área con una sola entrada visible se muestra como entrada suelta, sin grupo.
R4. Lo que pertenece a una entidad es pestaña de su ficha (ADR-041), nunca entrada del menú.
R5. Un nombre por cosa (`NAVEGACION.md` §6); las etiquetas pasan por el vocabulario de la vertical.
R6. ⌘K respeta permisos y alcance: un viewer no ve acciones de escritura ni entidades fuera de su alcance.
R7. El shell no se vuelve a pintar al navegar y sus entradas se precargan (ADR-045).
R8. **Toda la navegación usa la paleta y los tokens del diseño aprobado** (DS 2.0, `packages/ds/src/tokens.css`; ADR-014): barra lateral, barra inferior, hoja «Más», ⌘K, cabecera y Bandeja, en claro y oscuro, sin colores fuera de los tokens. Fuente: «Sí, que OPAI 2.0 decida los criterios de navegación. […] Pero todos tienen que ser con la paleta de diseño» — Carlos, 26-oct-2026 10:53 CLT, chat con el Revisor OPAI 2.0 (t120u; dictado por voz).

### 4.2 Decisiones del 26-oct

Fuente de D1–D10: decididas por el bot OPAI 2.0 bajo la delegación de Carlos: «Sí, que OPAI 2.0 decida los criterios de navegación. […] Pero todos tienen que ser con la paleta de diseño» — Carlos, 26-oct-2026 10:53 CLT, chat con el Revisor OPAI 2.0 (t120u; dictado por voz). D10 además ya es regla de ADR-016. Carlos confirmó que el bot OPAI 2.0 decidió D1–D10 por delegación suya (Carlos, 26-oct-2026 11:03 CLT, chat con el bot OPAI 2.0 (t295u; dictado por voz)). D1–D10 quedan como reglas del Brief 05 sujetas a la aprobación del brief por Carlos.

D1. **Grupos en acordeón:** solo queda abierta el área activa y las demás se pliegan. El estado se recuerda por usuario y empresa. `NAVEGACION.md` §10 dice lo mismo.
D2. **Máximo 7 entradas por área.** Si un área pasa de siete, se divide en dos áreas; no hay scroll interno en un grupo. El núcleo falla en desarrollo y en `pnpm test` si un área declara más de siete entradas. Dividir un área crea un área nueva fuera de la lista cerrada de R1 y del máximo de seis de CA3, así que exige cambiar `NAVEGACION.md` §2 y §7 con una decisión de Carlos; mientras no exista, el test sigue fallando y el módulo no se integra. Hoy ningún área pasa de siete (Finanzas tiene justo siete).
D3. **Fijados:** se fija y desfija con un ícono de pin que aparece al pasar el mouse por la entrada y en la cabecera de la ficha. Se ordenan por la fecha en que se fijaron (el más antiguo arriba). Máximo cinco; al intentar el sexto, aviso y no se fija.
D4. **Inicio** es una entrada suelta arriba; la **Bandeja** vive dentro de Inicio (sección, no entrada del menú).
D5. **Contador de la Bandeja:** en la barra inferior del celular, Inicio muestra un **punto**; el número aparece dentro de la pantalla. No hay contadores en la barra lateral.
D6. **Campana (ADR-014):** muestra un punto de no leído y abre la misma Bandeja; no hay una segunda lista de avisos.
D7. **Celular:** la búsqueda sale de la barra superior; solo queda «Buscar» en la barra inferior. *(Reemplazada el 26-oct-2026 17:57 por ADR-050: decisión de Carlos, «El shell sigue el diseño de Claude; que el repo se ajuste». «Buscar» vuelve a la barra superior del teléfono y sale de la barra inferior.)*
D8. **Vencimientos** sigue como vista dentro de Personas; no es entrada del menú.
D9. **iPad:** desde 1024 px se usa la barra lateral completa de escritorio, con sus grupos plegables, sin riel nuevo. De 768 a 1023 sigue el riel actual. No se pliega a solo íconos (Carlos, 26-oct-2026 11:03 CLT, chat con el bot OPAI 2.0 (t295u; dictado por voz)).
D10. **El rol viewer (Visualizador) no ve Nómina.** No es una decisión nueva: es regla de ADR-016 (viewer «solo lectura, sin finanzas ni nómina»). Corrige la pantalla 05 del diseño, que se la mostraba.

### 4.3 Modelo

- `ItemNav` gana `area: AreaNav` (`inicio` | `comercial` | `clientes` | `operaciones` | `personas` | `finanzas` | `documentos`, la lista cerrada de `NAVEGACION.md` §7) y pierde `grupo`, `contador`, `corta`, `soloAmplio` y `soloCompacto`. Las etiquetas cortas de la barra inferior son palabras completas (§6 de `NAVEGACION.md`). **Configuración no es un área:** es la entrada fija al pie que arma el núcleo; ningún módulo la declara (ADR-018).
- `defineModule` acepta `navegacion: [{ portal, area, href, etiqueta, icono, orden, permiso }]` y `acciones: [{ etiqueta, capacidad, permiso, href? }]` para ⌘K. El núcleo declara las suyas igual en `navegacion`, con su `area` (Cuentas e Instalaciones en Clientes; Personas y Cargos y sueldos en Personas; acciones «Nueva cuenta», «Agregar persona»). **Configuración no va en `navegacion`:** es la entrada fija del pie que el shell agrega siempre, sin `area`, fuera de la lista que arma `armarNavegacion`; todo rol la ve, porque incluye al menos sus preferencias (`NAVEGACION.md` §5).
- Función pura `armarNavegacion(items, { rol, modulosActivos, vocabulario })` en `packages/domain` o junto a `navegacion.ts`: filtra por permiso y módulo activo, agrupa por área en el orden de R1, aplica R3 y D2. Sin acceso a datos.
- **Preferencias por usuario** como ajustes de ámbito `usuario` (ADR-038), sin migración: `navegacion_area_principal`, `navegacion_area_abierta` y `navegacion_fijados` (lista de hasta 5: `{ tipo: "entrada" | "ficha", href, etiqueta, fijadoEn }`). Se leen y escriben solo por `core.config.get/set`, así UI, API y MCP comparten la misma regla. Son escrituras escasas (cuando la persona fija, cambia el área principal o abre otra área).
- **Recientes** (hasta 10: `{ tipo, href, etiqueta, contexto }`): se guardan en el almacenamiento del navegador, por usuario y empresa, no en el servidor. Pasar `core.config.set` en cada navegación dejaría una entrada de auditoría y un evento `core.config.cambiada` por página, y sumaría consultas que ADR-045 no permite. Consecuencia aceptada: los recientes no viajan entre dispositivos; los fijados sí.
- **Bandeja:** componente del núcleo en Inicio que lista avisos no leídos (`core.notificaciones.list`, todos los roles) y, solo para quien tiene `aprobaciones:manage`, las aprobaciones pendientes (`core.aprobaciones.list`). El punto y el número salen de lo que el rol puede ver (`core.resumen.contadores`). Sin capacidades nuevas.

### 4.4 Punto de entrada del agente interno (reservado, se construye en el brief del agente interno)

Decisión de Carlos, 26-oct-2026 10:08 CLT, chat con OPAI 2.0; ADR-049, propuesto en PR #38, pendiente de merge. El agente interno se construye en un brief propio después de CPQ («Ok, después del CPQ» — Carlos, 26-oct-2026 10:53 CLT, chat con el Revisor OPAI 2.0 (t120u); confirmado por Carlos, 26-oct-2026 11:03 CLT, chat con el bot OPAI 2.0 (t295u; dictado por voz)). Aquí solo se reserva dónde vive, para que ese brief lo agregue sin rediseñar la navegación:

- **Escritorio y iPad (⌘K):** la acción **«Preguntar a OPAI»** ocupa el primer lugar de la paleta, antes de recientes y acciones, y usa como pregunta el texto escrito en el buscador.
- **Celular:** el mismo lugar, arriba de todo dentro de **«Buscar»** (la paleta a pantalla completa, pantallas 19–22), bajo el campo de búsqueda. No suma un ítem propio: «Buscar» vive en la barra superior del teléfono (ADR-050, §10).
- **Mientras no exista el agente, la entrada no se muestra:** ni deshabilitada ni con «próximamente». Aparecerá cuando el módulo del agente esté activo en el tenant, igual que las entradas de cualquier módulo (R2). En este brief no hay código para ella; los CA9 y CA10 se cumplen sin esa entrada.

## 5. Archivos (previstos)

- `apps/web/lib/navegacion.ts` → por áreas; `apps/web/lib/navegacion-areas.ts` (puro) si supera 150 líneas.
- `packages/capabilities/src/modulos/*` (tipo del manifest: `navegacion` con `area`, `acciones`).
- `packages/capabilities/src/core/config/nucleo.ts` (ajustes `navegacion_*`, ámbito usuario).
- `packages/ds/src/shell/`: `sidebar.tsx` (áreas, acordeón, fijados), `nav.tsx` (barra inferior por área principal, punto), `menu-mas.tsx` (hoja «Más»), `top-bar.tsx` (cabecera estable), `app-shell.tsx` (breakpoint de la barra lateral a `lg`), nuevos `area-grupo.tsx`, `fijados.tsx`, `boton-fijar.tsx`.
- `packages/ds/src/components/command-palette.tsx` (recientes y acciones).
- `apps/web/app/(erp)/_componentes/inicio.tsx` y `bandeja.tsx` (nuevo).
- `apps/web/app/(erp)/configuracion/preferencias/*` (área principal).
- `apps/web/app/ds/*` (componentes nuevos con sus estados).
- `apps/web/e2e/cabecera-estable.spec.ts`, `navegacion-areas.spec.ts` (nuevos).
- `docs/2.0/design/export-navegacion/` (export del diseño, bloque 0), `docs/2.0/NAVEGACION.md` §8 (estado de hoy), `docs/2.0/ESTADO.md`.

## 6. Modelo de datos y migraciones

**Sin migraciones.** Las preferencias son ajustes de usuario existentes (ADR-038). La Bandeja usa tablas del Brief 02.

## 7. Capacidades

- **Sin capacidades nuevas.** Fijar, desfijar, área principal y área abierta van por `core.config.set` con ajustes de ámbito `usuario`, con `dryRun` e `idempotencyKey` como toda escritura; un agente con key de usuario puede leerlos y cambiarlos igual que la persona.
- **Recientes, solo en el navegador** (§4.3): no pasan por `core.config` ni por el servidor y no generan auditoría ni eventos. No son dato de negocio sino una comodidad de la pantalla, así que no tienen capacidad ni herramienta MCP; un agente obtiene lo mismo con `core.buscar`.
- Las acciones de ⌘K **solo navegan** al formulario o a la pantalla de la acción; ninguna ejecuta una escritura directa. Una acción aparece solo si el rol tiene el permiso de su capacidad.
- El gate de paridad sigue en verde: ninguna pantalla nueva sin capacidad.

## 8. Interfaz y responsive

### 8.1 Pantallas del diseño (export en `docs/2.0/design/export-navegacion/`)

| # | Pantalla | Qué fija |
|---|---|---|
| 01 · 02 | `Shell_C_owner_1280` (claro y oscuro) | Shell completo, todo contratado: fijados arriba, Inicio, áreas plegables, Configuración al pie; Comercial abierto con Negocios activo |
| 03 | `Shell_A_owner_1280` | Tenant de hoy (solo núcleo), nada deshabilitado |
| 04 | `Shell_D_nomina_1280` | Tenant sin Comercial ni Finanzas, sin rastro de lo no contratado. **Ajuste:** el escenario D es Puestos + Nómina, porque Nómina exige Puestos (nota de ADR-048, 25-oct 23:10); la pantalla mostraba solo Nómina |
| 05 | `Roles_comparacion_1280` | Barra por rol (gerente, supervisor, viewer, admin). **Ajuste D10:** viewer sin Nómina |
| 06 | `Grupos_plegables_1280` | Plegado, abierto y área de una entrada como suelta (D1, R3) |
| 07 | `Fijados_1280` | Sin fijados, cinco fijados y acción de fijar (D3) |
| 08–12 | `CmdK_*_1280` | Inicial (recientes y acciones), resultados «quili», sin resultados, viewer, oscuro. El primer lugar queda reservado para «Preguntar a OPAI» (§4.4); no se construye aquí |
| 13 | `Menu_usuario_portal_1280` | Menú de usuario y selector de portal (Plataforma solo para operadores) |
| 14 | `BarraInferior_variantes_375` | Cinco variantes por área principal y respaldo del escenario A. **Ajuste ADR-050:** la barra inferior no lleva «Buscar»; la búsqueda vuelve a la barra superior del teléfono (§10, D7 reemplazada) |
| 15 | `Inicio_bandeja_375` | Bandeja en Inicio y punto en la barra inferior (D4, D5) |
| 16–18 | `Mas_*_375` | Hoja «Más» en escenarios C y A, y oscuro |
| 19–22 | `Buscar_*_375` | ⌘K a pantalla completa en el celular. El primer lugar, bajo el campo, queda reservado para «Preguntar a OPAI» (§4.4); no se construye aquí |
| 23 | `Preferencias_area_principal_375` | Selector de área principal con vista previa de la barra |
| 24 | `Cambio_de_pagina_375` | Shell quieto y skeleton del contenido |
| 25 | `Estados_vacios` | Fijados vacío, recientes vacío, sin resultados, Bandeja vacía, viewer mínimo, etiqueta larga |
| 26 | `404_en_shell_1280` | 404 con el menú intacto |
| 27 | `iPad_propuesta_1024` | **Reemplazada por D9:** barra lateral completa desde 1024, sin riel nuevo |
| 28 | `Componentes_nuevos` | Variantes nuevas del DS (§8.2) |

### 8.2 Componentes nuevos del DS (pantalla 28)

Se agregan a `packages/ds` sobre los componentes existentes, solo con tokens, y aparecen en `/ds` con reposo, hover, foco, activo y plegado, en claro y oscuro:

1. **Encabezado de área plegable** (`AreaGrupo`): botón de 44 px con chevron, `aria-expanded`, movimiento de 150–200 ms con `prefers-reduced-motion`.
2. **Entrada de área** sin ícono, con guía vertical; la activa con la marca de acento del DS.
3. **Botón fijar** (`BotonFijar`): ícono pin de Lucide (`Pin`/`PinOff`, trazo del DS; no está en el set de 55 íconos del export), visible en hover y siempre con foco de teclado; también en la cabecera de la ficha.
4. **Ítem de barra inferior** con píldora de fondo cuando está activo y **punto** de no leído (sin número).
5. **Opción de área principal** (`RadioGroup` con vista previa de la barra inferior).
6. **Plataforma en el selector de portal**, solo para operadores de OPAI (`platformRole`).

### 8.3 Responsive

- **< 768:** barra superior de 52 px con selector de portal, **buscar**, campana y la foto o el avatar del usuario (la búsqueda vuelve a la barra superior por ADR-050, 26-oct-2026 17:57; el avatar arriba por Carlos, 26-oct-2026 11:03 CLT, chat con el bot OPAI 2.0 (t295u; dictado por voz)); barra inferior de 56 px + safe-area con hasta cuatro ítems de navegación más «Más» (Inicio fijo; «Buscar» ya no va en la barra inferior, §10).
- **768–1023:** riel actual, sin cambios de comportamiento (D9).
- **≥ 1024:** barra lateral de 248 px con áreas (D9) y el usuario al pie de la barra lateral (ADR-050); cabecera de 60 px con título, buscador ⌘K y campana.
- Touch targets ≥ 44 px, foco visible, contraste AA en claro y oscuro, sin scroll horizontal a 375; etiquetas largas con elipsis.
- **Cabecera estable (CAR-12):** la acción principal de la página sale de la cabecera y va en el patrón (`REGLAS-codigo.md`, UI). La cabecera queda con título (o migas) a la izquierda y un **grupo fijo** al final (buscar y campana en escritorio, con el usuario al pie de la barra lateral por ADR-050; buscar, campana y avatar en el teléfono), con ancho y posición constantes en todas las vistas, también con «Atrás». El buscador no cambia de forma dentro del mismo breakpoint. Si una ficha o un formulario necesita acciones en la cabecera, van a la izquierda del grupo fijo, nunca a su derecha.

## 9. Seguridad y tenant

- La navegación nunca es la barrera de seguridad: las capacidades siguen verificando permiso, módulo activo y alcance (ADR-022). El menú solo oculta.
- Fijados y recientes guardan `href` y etiqueta; al mostrarlos se vuelve a verificar permiso y existencia. Un fijado o reciente sin permiso, de un módulo apagado o de una entidad borrada no se muestra (y se limpia en la siguiente escritura).
- Los ajustes de usuario son por usuario **y** tenant: cambiar de empresa cambia los fijados, los recientes y el área principal.
- Sin datos personales en los recientes más allá de la etiqueta visible (Ley 21.719; Brief 07d, integrado en `main` (PR #36, `72ddaa7`)).

## 10. Casos límite

- Tenant con solo el núcleo (escenario A): Inicio, Clientes, Personas y Configuración; barra inferior de respaldo Inicio · Cuentas · Personas · Más (ADR-050: «Buscar» vuelve a la barra superior; §10).
- Tenant con Puestos y Nómina (escenario D; Nómina exige Puestos, nota de ADR-048 del 25-oct 23:10): Operaciones con Puestos y Personas con Nómina; nada de Comercial ni Finanzas.
- Área principal elegida que deja de estar disponible (módulo apagado o rol cambiado): cae a la de por defecto del rol, sin error.
- Fijado de una ficha borrada o fuera de alcance: no aparece.
- Sexto fijado: aviso y no se fija.
- Etiqueta de 18 caracteres por vocabulario: elipsis en la barra lateral y en la barra inferior, nombre completo en `title` y `aria-label`.
- Usuario con varias empresas: preferencias separadas por empresa.
- Sin notificaciones ni aprobaciones: Bandeja vacía con su estado, sin punto.
- Viewer o supervisor sin `aprobaciones:manage`: la Bandeja muestra solo avisos; el punto no cuenta aprobaciones.
- Navegador sin almacenamiento disponible (modo privado): ⌘K funciona sin recientes.

## 11. Plan por bloques (un commit por bloque)

Conviene dividirlo en **dos PRs** para que la cabecera de CAR-12 (urgente) llegue antes. Como `AGENTS.md` pide un PR por encargo, cada PR lleva su propio encargo y su tarea de Linear: el PR A, `Fixes CAR-12`; el PR B, la tarea que Carlos cree para la navegación.

**PR A — Cabecera estable (CAR-12).**
- Bloque 0 · Lectura y verificación. El PR A puede avanzar mirando las pantallas 01, 14 y 24 directo en Claude Design; el bloqueo por el export aplica solo al PR B (ver abajo).
- Bloque 1 · `ds:`/`core:` cabecera estable en `AppBar` y `TopBarTelefono` (grupo fijo, con la foto o el avatar del usuario en el teléfono; Carlos, 26-oct-2026 11:03 CLT, chat con el bot OPAI 2.0 (t295u; dictado por voz)), acción principal al patrón en las páginas que hoy la pasan a la cabecera y buscador sin cambio de forma. **Búsqueda en el celular (ADR-050) en este PR:** se queda en la barra superior del teléfono; no pasa a la barra inferior. Hasta el PR B, la barra inferior es la de respaldo del escenario A del diseño (pantalla 14): Inicio · Cuentas · Personas · Más; Instalaciones, Cargos y sueldos, Aprobaciones y Configuración pasan a la hoja «Más» actual (`menu-mas.tsx`), sin abreviaturas. La búsqueda de la barra superior abre la ⌘K actual a pantalla completa. e2e `cabecera-estable.spec.ts`.

**PR B — Navegación por áreas.** Empieza cuando el PR 2 del Brief 03 (shell en el layout) esté integrado. El bloque 0 del PR B se **detiene** si falta el export en `docs/2.0/design/export-navegacion/` (Carlos lo exporta desde Claude Design).
- Bloque 2 · `core:` modelo `area`, manifest `navegacion`/`acciones`, `armarNavegacion` puro con tests, ajustes `navegacion_*`.
- Bloque 3 · `ds:` componentes nuevos (§8.2) en `/ds`.
- Bloque 4 · `ds:` barra lateral por áreas (acordeón D1, fijados D3, Inicio suelto D4, sin contadores D5) y breakpoint `lg` (D9).
- Bloque 5 · `ds:`/`core:` ⌘K con recientes y acciones.
- Bloque 6 · `core:` barra inferior por área principal (Inicio fijo; «Buscar» ya no va en la barra inferior, ADR-050, §10), hoja «Más» por áreas, Preferencias → Área principal.
- Bloque 7 · `core:` Bandeja en Inicio, punto en Inicio y campana (D5, D6).
- Bloque 8 · `docs:` `NAVEGACION.md` §8 (estado de hoy), `ESTADO.md` y reporte.

## 12. Tests

- **Dominio:** `armarNavegacion` por escenario (A, B, C, D) y por rol (owner, admin, gerente, supervisor, viewer): áreas y entradas exactas, orden, R3, D2 (falla con ocho entradas), viewer sin Finanzas ni Nómina, gerente sin Finanzas ni Nómina, supervisor sin Comercial ni Finanzas.
- **Ajustes:** fijados (máximo 5, orden por fecha), área principal con respaldo; limpieza de fijados sin permiso. **Recientes:** 10, sin duplicados, separados por usuario y empresa.
- **Base (`pnpm test:db`, rol `opai_app` sin BYPASSRLS):** lectura y escritura de `navegacion_area_principal`, `navegacion_area_abierta` y `navegacion_fijados` por `core.config.get/set` aisladas por tenant: el mismo usuario en dos empresas tiene preferencias separadas y no lee ni escribe las de la otra; un usuario no lee las de otro. Las escrituras conservan `dryRun` (no persisten), idempotencia (la misma clave no duplica) y auditoría en `core.audit_events`.
- **Bandeja por rol:** owner ve avisos y aprobaciones; viewer y supervisor solo avisos.
- **Componentes:** acordeón (una abierta), `aria-expanded`, punto sin número, botón fijar con teclado.
- **e2e (375, 1024 y 1280):** `navegacion-areas.spec.ts` (barra por escenario, acordeón, fijar y desfijar, ⌘K con recientes, hoja «Más», cambio de área principal) y `cabecera-estable.spec.ts` (§14, CA1).
- **Gate de paridad y presupuesto de JS** (ADR-037) en verde; cualquier subida de tope se justifica en el PR.

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test` antes de cada commit; `pnpm --filter @opai/web build` + `pnpm presupuesto`; e2e local a 375, 1024 y 1280 contra `next start`; capturas a 375, 1024 y 1280 en claro y oscuro comparadas con el export; revisión con `docs/2.0/checklists/qa.md`. Medición de ADR-045 antes y después (≤ 8 consultas por navegación; el shell no agrega consultas por página).

## 14. Criterios de aceptación

- **CA1 (CAR-12, obligatorio).** Campana y buscador (y el avatar del usuario en el teléfono) mantienen **tamaño y posición idénticos** al cambiar de vista (Personas → Vencimientos → Cuentas → Nueva cuenta → Inicio) y al cambiar de vencimiento. Lo verifica `cabecera-estable.spec.ts` a **375 y 1280 px** (y también a 1024, proyecto `ipad`): compara el `boundingBox` de cada ícono entre vistas con tolerancia de 0 px en posición y tamaño. A 1280 se comparan buscador y campana (el usuario va al pie de la barra lateral, ADR-050). A 375 se comparan buscador, campana y avatar en **todas** las vistas, también las que tienen «Atrás» (Nueva cuenta, ficha); desde el PR A el buscador del teléfono vive en la barra superior (ADR-050, §10), que también debe quedar fijo.
- **CA2.** El mapa coincide con `NAVEGACION.md` §2 (con D8): áreas, entradas, orden y nombres; Configuración al pie; no aparecen «Maestros», «Módulos», «Guardias», «Ajustes» (en el ERP) ni abreviaturas.
- **CA3.** Límites: seis áreas, siete entradas por área, cinco fijados; un área de una entrada aparece suelta.
- **CA4.** Nada deshabilitado en ningún escenario ni rol.
- **CA5.** Roles: gerente, supervisor y viewer sin Finanzas; gerente, supervisor y viewer sin Nómina (D10); supervisor sin Comercial.
- **CA6.** Sin contadores en la barra lateral; Inicio muestra un punto en la barra inferior y el número dentro de la pantalla; la campana muestra un punto y abre la Bandeja.
- **CA7.** Acordeón: solo queda abierta el área activa; el estado se recuerda por usuario y empresa.
- **CA8.** Fijar y desfijar con el pin en hover y en la cabecera de la ficha; orden por fecha de fijado; los fijados persisten al recargar y en otro dispositivo (los recientes, solo en el mismo navegador).
- **CA9.** ⌘K muestra el atajo en la cabecera de escritorio, recientes (10) y acciones, funciona entero con teclado y respeta permisos y alcance (viewer sin acciones de escritura).
- **CA10.** Celular: Inicio fijo y hasta cuatro ítems de navegación más «Más», variantes según el área principal y respaldo; la búsqueda va en la barra superior (ADR-050, §10), no en la inferior; ≥ 44 px y safe-area.
- **CA11.** Desde 1024 px, barra lateral completa con áreas; de 768 a 1023, el riel actual sin cambios.
- **CA12.** Shell estable al cambiar de página: solo cambia el contenido, con su skeleton.
- **CA13.** Claro y oscuro con contraste AA y foco visible; sin scroll horizontal a 375.
- **CA14.** Componentes nuevos en `/ds` con sus estados; sin hex ni estilos sueltos; toda la navegación con la paleta y los tokens del diseño aprobado (R8).

## 15. Riesgos y rollback

- **Dependencia del PR 2 del Brief 03** (shell en el layout y quitar contadores, ADR-045 decisión 15; lo implementa Claude): R7 y CA12 exigen que el shell persista entre páginas, y hoy se monta por página. Por eso el PR B empieza cuando el PR 2 esté integrado y no mueve el shell por su cuenta. El PR A no depende de él.
- **Presupuesto de JS:** acordeón, fijados y ⌘K suman JS de cliente; ⌘K y la hoja «Más» se cargan diferidos.
- **e2e no obligatorio en CI:** CA1 depende de un e2e que por ahora **no** es check obligatorio. Mitigación: correrlo antes de abrir el PR y adjuntar el resultado.
- **Decidido (Carlos, 26-oct-2026 11:03 CLT, chat con el bot OPAI 2.0 (t295u; dictado por voz)):** el e2e de la cabecera (CA1) **no** es check obligatorio por ahora: no bloquea el merge: corre en el CI y se corre a mano antes de abrir el PR. Pasa a obligatorio más adelante solo si Carlos lo confirma, cuando lleve una semana estable (revisión el 2-nov-2026; pidió que se lo recuerden; Carlos 11:03 y 11:12). El iPad desde 1024 px usa la barra lateral completa y plegable, sin plegarse a solo íconos. El celular muestra arriba la foto o el avatar del usuario.
- **Export pendiente:** sin export en el repo, el bloque 0 del PR B se detiene; el PR A no lo necesita.
- **Acción principal al patrón:** cambia de lugar el botón principal en Personas, Cuentas e Instalaciones; el QA de «Diseño y QA OPAI 2.0» lo compara con el diseño.
- **Rollback:** los cambios son de UI y ajustes de usuario sin migración; se revierte el PR. Los ajustes `navegacion_*` que queden guardados se ignoran.

## 16. Reporte de ejecución

Al cerrar: commits integrados, capturas antes y después a 375, 1024 y 1280, resultado de `cabecera-estable.spec.ts`, medición de ADR-045, presupuesto de JS, actualización de `NAVEGACION.md` §8 y resumen ejecutivo para Carlos (qué se hizo, qué cambia para Gard, qué decide él, qué sigue).

### Continuación del PR B · 27-oct-2026

Implementación en `brief/05-pr-b-navegacion`, no integrada. Se preservó el trabajo local heredado y se incorporó `origin/main` mediante merge; al recuperar el stash se resolvieron los conflictos conservando los permisos efectivos y las protecciones del shell de `main`. El export aprobado está presente.

Decisiones técnicas de OpenCode / GPT-6.1 Sol, dentro del encargo (no atribuidas a Carlos):
- `navegacion_area_abierta = "ninguna"` representa plegado explícito; `null` conserva el respaldo por ruta.
- `core.config.set` serializa lectura y escritura por ajuste en su transacción; revisión esperada opcional evita reemplazar fijados con una lista obsoleta. Al reiniciar ajustes de navegación se conserva una fila con valor inválido para el esquema: la lectura vuelve al defecto sin reutilizar la revisión.
- Las fichas guardadas se validan con capacidades existentes y alcance antes de mostrarse; una falla transitoria oculta el acceso, no concede acceso. Solo se aceptan rutas internas conocidas. Recientes siguen exclusivamente en el navegador.
- Gana ADR-050 de `main` sobre D7: Buscar arriba en teléfono; usuario al pie de la lateral. No se crea un agente interno ni se copia el estilo de 1.0.
- Continuación del encargo de las 05:00 CLT: merge normal de `origin/main` `5c18a92` (identidad de servicio #70 y MFA #65). Se conserva «Mi cuenta» del menú del ERP incluso sin acceso al portal, igual que en main, y la navegación e2e usa el helper de login con TOTP ya existente. No se relajan permisos ni la política MFA.
- Correcciones de autorrevisión por OpenCode / GPT-6.1 Sol: la cola transforma el último estado confirmado y no persiste áreas sin cambios; la limpieza de fichas distingue rechazo definitivo (`NOT_FOUND`/`FORBIDDEN`) de fallo transitorio, sin consumir permanentemente los cinco cupos. La Bandeja conserva enlaces y lectura individual, cuenta `noLeidas` y pagina con cursor propio validado (sin `skip`, para no perder avisos si el cursor se lee en otra pestaña). Se difiere su código interactivo tras montar para respetar el presupuesto inicial, sin subir más topes.
- La revisión esperada se captura **antes** de validar fichas de forma asíncrona; si una recarga la cambia, se rechaza el intento sin sobrescribir la lista nueva. Si cambia durante la petición, se recarga y no se aplica una respuesta obsoleta. Al guardar solo se mezcla el campo afectado, no el resto de preferencias. La autorrevisión independiente cerró los hallazgos técnicos; no equivale a aprobación formal del PR.

No hay migración nueva ni cambio del orden del plan. La tarea específica del PR B no viene identificada: CAR-13 es la del documento, no se inventa otra vinculación.

#### Autorrevisión de aceptación del PR B

| CA | Implementación y comprobación |
|---|---|
| 1 | e2e `cabecera-estable.spec.ts`: cajas reales, sin redondeo ni tolerancia; incluye ficha sembrada con Atrás y cambio de filtro de vencimientos en los tres anchos. Nueva cuenta se mide tras cerrar su hoja modal porque Radix deja la cabecera inerte mientras está abierta. |
| 2 | Modelo puro y permisos efectivos de main; mapa por áreas sin Maestros ni abreviaturas. |
| 3 | Límites de siete entradas y cinco fijados; área de una entrada suelta. Pruebas de dominio y manifiesto. |
| 4 | Filtrado por módulos activos; matriz A–D con los cinco roles reales. Los módulos futuros se prueban como datos, no como pantallas ficticias. |
| 5 | Matriz con `tienePermiso` real: gerente, supervisor y viewer sin Finanzas/Nómina; supervisor sin Comercial. |
| 6 | Sin contadores laterales; punto compartido de Inicio/campana y número en Bandeja. Aprobaciones solo se consultan cuando el resumen autorizado no es null. |
| 7 | Acordeón exclusivo, estado por usuario/tenant, plegado explícito y contenido cerrado `inert`; al navegar se abre el área de destino. |
| 8 | Pin de entrada y ficha, cinco máximos, fecha ascendente, validación de existencia/alcance. CAS rechaza listas obsoletas; e2e de dos clics con primera respuesta demorada. **Evidencia parcial:** no se hizo recorrido con dos dispositivos reales. |
| 9 | Recientes locales limitados a diez, almacenamiento inválido tolerado; acciones buscables mediante cmdk/Radix. **Evidencia parcial:** no se recorrió con teclado cada resultado y estado posible. |
| 10 | Barra inferior por área, respaldo del rol si desaparece la preferencia, Más como Sheet, targets de 44 px. |
| 11 | Lateral desde 1024; riel anterior conservado entre 768–1023. **Evidencia parcial:** e2e a 375/1024/1280, sin recorrido adicional a 768. |
| 12 | Layout persistente y precarga conservados de main. **Evidencia parcial:** el e2e de cabecera usa cargas completas y no prueba por sí solo que no haya remontajes durante enlaces cliente. |
| 13 | DS V2, foco y targets; e2e incorpora medición WCAG del texto visible del shell, Bandeja y paleta en claro/oscuro. **Parcial:** no sustituye auditoría completa de iconos, foco y todos los estados. |
| 14 | Tokens/componentes del DS y muestra en `/ds`, capturas claro/oscuro. **Parcial:** no se compararon exhaustivamente las 28 pantallas ni se demostraron todos los estados de galería. |

**ADR-037, pendiente:** por decisión del orquestador en el encargo se restituyen los topes de `origin/main`. La Bandeja interactiva se carga diferida, pero el build todavía supera el presupuesto en 31 rutas; el detalle medido queda en `PR-BODY.md`. No se atribuye la diferencia íntegra a este PR sin medición de base equivalente. El check no está verde y el PR no está listo para integrar.

**ADR-045 parcial:** las preferencias se cargan una vez al montar, no desde las páginas; recientes no consultan al navegar. La revalidación de fichas fijadas puede añadir hasta cinco lecturas tras montar. No se produjo una nueva tabla instrumental antes/después del protocolo de rendimiento; no se presenta como cumplido ese punto de §13.
