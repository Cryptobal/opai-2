# BRIEF DE IMPLEMENTACIÓN — CENTRO DE CONFIGURACIÓN 2.0 (portada por tarjetas de grupo)

**Repositorio:** `Cryptobal/opai-2` · **Rama del PR 1:** `brief/configuracion-pr1-portada` (desde `origin/main` `45f19cf5` o más nuevo) · **Fecha de este brief:** 30-oct-2026 · **Tarea de Linear:** ninguna asignada en este encargo (no inventar un CAR; si el bot OPAI 2.0 la crea, se agrega al PR) · **Estado:** **diseño aprobado (30-oct-2026 08:18 CLT)**; PR 1 en construcción en esta rama.

**Aprobaciones citadas (registradas por el bot OPAI 2.0, chat con OPAI 2.0):**
- Regla del Centro de Configuración aprobada en principio por Carlos el 30-oct-2026 a las 00:53 CLT, con sus decisiones de las 00:55 CLT (agrupación por tarjetas, máximo 7 entradas por grupo, excepción de Módulos, Preferencias al menú de usuario, Supervisor y Visualizador sin Agentes, Integraciones ni Consumos).
- Mockup «OPAI 2.0 Configuración v1» en Claude Design (https://claude.ai/design/p/fb7fb909-eaa5-48cc-bea6-5ae06590c4d3, archivo `Configuración.dc.html`, 92 pantallas más la hoja de componentes, claro y oscuro, 1280/1024/375) aprobado por Carlos el 30-oct-2026 a las 08:18 CLT: «Apruébalo con los 3 ajustes y sin contadores en las tarjetas». Los ajustes están en §6 y quedaron aplicados en el mismo archivo (revisión del bot OPAI 2.0, 30-oct-2026 09:05 CLT).
- **Export del diseño:** el export actual de `Configuración.dc.html` **no está en el repo ni en la caja** al escribir este brief. Se construye con el Design Prompt (`docs/2.0/design/DESIGN-PROMPT-configuracion.md`, va en este PR), los ajustes de §6 y los componentes existentes del DS 2.0. Si un detalle visual no está fijado aquí ni en el Design Prompt, se usa el patrón más cercano que ya exista en `@opai/ds` y se anota como «a confirmar contra el mockup» en la descripción del PR (QA lo compara en vivo).

**Documentos que acompañan este PR (van dentro, no hay PR de solo docs):**
- `docs/2.0/REGLA-configuracion.md` — la regla (§1–§5). Es la fuente de verdad de este brief.
- `docs/2.0/design/DESIGN-PROMPT-configuracion.md` — el Design Prompt que generó el mockup.
- Este brief, `docs/2.0/briefs/BRIEF-configuracion-centro.md`.

> **DS de OPAI 2.0 siempre** (DS V2 `44e4d7b9`, `@opai/ds`): `Card`, `FilaSeleccionable`, `InputBusqueda`, `Tabs`/`BarraTabs` por ruta, `Badge`, `Alerta`, `EmptyState`, `Sheet`, `SplitScreen`, `Cabecera`. Nada de estilo 1.0. 1.0 no se toca.

---

## 1. Objetivo

Hoy `/configuracion` es un índice largo de unas 20 filas en 5 grupos (Empresa, Operaciones, Acceso, Plataforma, Módulos activos) con «Elige un ajuste» a la derecha, y cada módulo nuevo suma filas. El objetivo es que el usuario **reconozca de un vistazo dónde está cada ajuste**: una portada con 6 tarjetas de grupo y un buscador, subpáginas de grupo con un máximo de 7 entradas, y una regla automática que impida volver al índice largo.

Se nota que funciona cuando un owner encuentra «feriados» en dos toques desde la portada (tarjeta Operación › Calendario, o buscando «feriados»), un supervisor no ve nada de Agentes, Integraciones ni Consumos, y agregar un módulo nuevo no agrega una fila suelta a la portada.

## 2. Estado actual en `origin/main` (verificado en `45f19cf5`, 30-oct-2026) — reusar, no duplicar

Todas las entradas ya existen y **se reusan tal cual** (su contenido no cambia en el PR 1; solo cambia el marco de navegación que las rodea):

| Entrada | Ruta existente | Permiso hoy | Grupo hoy → grupo nuevo |
|---|---|---|---|
| Datos de la empresa | `/configuracion/empresa` | `tenantRead` | Empresa → **Empresa** |
| Marca | `/configuracion/marca` | `tenantRead` | Empresa → **Empresa** |
| Datos personales | `/configuracion/cumplimiento` (+ solicitudes, incidentes, retención) | `cumplimientoRead` | Empresa → **Empresa** |
| Comunicaciones | `/configuracion/comunicaciones` (+ `/[evento]`) | `comunicacionesManage` | Plataforma → **Empresa** |
| Patrones y funciones | `/configuracion/operaciones` | `patronesRead` | Operaciones → **Operación** |
| Calendario | `/configuracion/calendario` (#139/#143, CAR-79) | `calendarioRead` | Operaciones → **Operación** |
| Documentos | `/configuracion/documentos` | `documentosManage` | Plataforma → **Operación** |
| Usuarios y permisos | `/configuracion/usuarios` (+ pestaña Roles `/usuarios/roles`) | `usersRead` | Acceso → **Personas y acceso** |
| Agentes y API keys | `/configuracion/agentes` (+ `/[id]`, `/conectar`; `/api-keys`) | `apikeysManage` | Acceso → **Agentes** |
| Aprobaciones pendientes | `/configuracion/aprobaciones` | `aprobacionesManage` | Acceso → **Agentes** (fila con `Badge` del número de pendientes, oculto si hay 0; decisión de Carlos, 30-oct-2026 09:33 CLT, chat con OPAI 2.0, §6 bis) |
| Módulos (catálogo) | `/configuracion/modulos` | `tenantRead` | Plataforma → **Módulos** |
| Un módulo activo con ajustes | `/configuracion/modulo/[id]` (Comercial: Embudo, Catálogos, Ajustes; Rondas: Tipos de incidente, #141) | `configRead` + permiso de cada pestaña | Módulos activos → **Módulos** |
| Integraciones | `/configuracion/integraciones` (+ `/[proveedor]`) | `integracionesManage` | Plataforma → **Uso y registros** |
| Consumos | `/configuracion/consumos` | `consumosRead` | Plataforma → **Uso y registros** |
| Auditoría | `/configuracion/auditoria` | `auditRead` | Plataforma → **Uso y registros** |
| Preferencias (las mías) | `/mi-cuenta/preferencias` (nueva; `/configuracion/preferencias` redirige de forma permanente, decisión de Carlos, 30-oct-2026 09:33 CLT, chat con OPAI 2.0, §6 bis) | ninguno | Empresa → **sale de Configuración** (menú de usuario) |

Piezas del marco que hoy existen y que este PR cambia o reemplaza:
- `apps/web/app/(erp)/configuracion/_centro/seccion-tipo.ts` (tipo `Seccion`, `grupo` con 5 valores), `secciones.ts`, `secciones-plataforma.ts`, `seccion-modulo.ts`, `datos.ts` (`cargarIndice`), `indice-config.tsx`, `filtro-indice.tsx`, `pagina-config.tsx` (SplitScreen con el índice completo a la izquierda) y `configuracion/page.tsx` (portada con «Elige un ajuste» y la `Alerta` de aprobaciones).
- `secciones-modulos.ts` (pestañas por módulo, ADR-018) **se conserva** como único lugar donde un módulo registra su configuración.
- Menú de usuario: `apps/web/app/_components/menu-cuenta-shell.ts` **ya** tiene «Preferencias» junto a «Mi cuenta»; el ajuste de §6 bis cambia su destino a `/mi-cuenta/preferencias`.
- Búsqueda: `core.config.buscar` (`packages/capabilities/src/core/config/capacidades.ts`, `sinDb`, permiso `null`) busca **campos de ajuste** del catálogo; la paleta global ⌘K (`_components/paleta.tsx`) ya la usa. No se crea otra capacidad de búsqueda.
- Permisos por defecto (`packages/domain/src/permisos*.ts`, tests en `permisos.test.ts` y `permisos-nucleo.test.ts`): supervisor y viewer ya tienen `false` en `apikeys.manage`, `integraciones.manage`, `consumos.read` y `aprobaciones.manage`. **No hay que cambiar permisos ni hacer migración** para cumplir la regla; el test de §9 lo fija.
- e2e que tocan Configuración: `configuracion-empresa.spec.ts`, `configuracion-acceso.spec.ts`, `configuracion-calendario.spec.ts`, `configuracion-plataforma.spec.ts`, `config-patrones-funciones-car8.spec.ts`, `navegacion-preferencias.spec.ts`, `preferencias-tema-rafaga.spec.ts`, `rondas-config.spec.ts` y los helpers `menu-lateral.ts` y `menu-usuario.ts`. Las capturas de `e2e/__screenshots__/` son `page.screenshot` (no comparaciones), así que cambian sin romper.

## 3. Alcance en PRs

### PR 1 — Portada por tarjetas, grupos y navegación (este PR)
1. **Modelo de grupos cerrado.** `grupo` pasa a una lista cerrada de 6 ids con su etiqueta, ícono Lucide y línea corta: `empresa` «Empresa», `operacion` «Operación», `personas-acceso` «Personas y acceso», `agentes` «Agentes», `modulos` «Módulos», `uso-registros` «Uso y registros». Reasignar cada entrada según §2. «Preferencias» deja de ser una entrada de Configuración. `permiso` deja de aceptar `null` en el tipo (REGLA §3.7).
2. **Portada `/configuracion`** (§4.1): título, buscador de ajustes ancho completo, `Alerta` de aprobaciones si hay pendientes, grilla de tarjetas de grupo **sin contadores**.
3. **Subpágina de grupo** (§4.2): migas «Configuración › <Grupo>», lista de las entradas visibles del grupo (máx. 7) y la entrada a la derecha en iPad/escritorio; en teléfono, lista → entrada con «atrás». `PaginaConfig` muestra a la izquierda **solo las entradas del grupo de la entrada abierta** (no el índice completo).
4. **Grupo Módulos** (§4.3): «Catálogo de módulos» primero y después cada módulo activo o en trial con ajustes; con más de 7, la lista completa propia (con buscador), sin dividir. Al abrir un módulo, sus pestañas de `secciones-modulos.ts` como hoy.
5. **Preferencias fuera de Configuración, con URL propia** (decisión de Carlos, 30-oct-2026 09:33 CLT, chat con OPAI 2.0, §6 bis: cambia el punto 5 original, que conservaba la URL antigua). La página pasa a `/mi-cuenta/preferencias`: una página propia de la cuenta, **sin** el índice/lista de Configuración ni migas de Configuración; «atrás» en teléfono vuelve a la página anterior (o a Inicio). `/configuracion/preferencias` queda como **redirect permanente en el servidor** hacia la nueva URL, para no romper enlaces existentes. Solo se llega desde el menú de usuario (y desde Mi cuenta si hoy enlaza, lo que hoy no hace). No aparece en la portada, en ningún grupo ni en los resultados del buscador de Configuración.
6. **Estados** (§5) en los tres anchos, claro y oscuro.
7. **Test de la regla** (§9.1) y búsqueda de cada entrada por su título.
8. **Docs:** este brief, `REGLA-configuracion.md`, el Design Prompt; `NAVEGACION.md` (fila «Configuración» de la tabla de áreas: los 6 grupos y el enlace a la regla), `ESTADO.md` (una línea: Configuración 2.0 · PR 1 en construcción) y, si corresponde, `modulos/` o `01-decisiones.md` solo para enlazar la regla (sin inventar ADR nuevo).

### PR 2 — Pulido por entrada según el mockup (después del PR 1)
- Ajustar el interior de las entradas donde el mockup difiera de lo que hay (ejemplo lleno «Operación › Calendario»), incluidos los no bloqueantes del QA del #143 sobre Calendario que el bot tiene en `seguimiento.txt` (tabla a 375 px, hoja doble de Fecha en teléfono, pestañas de año con `?anio=`, calendario flotante sobre «Nombre», texto de fecha inválida). Solo si el bot no los manda antes en su PR de pendientes.
- Promover a `@opai/ds` los componentes nuevos si en el PR 1 quedaron locales (`TarjetaGrupo`, resultado del buscador) con su lámina en `/ds` y estados reposo/hover/foco/presionado.

### Fuera de este brief
- Contenido funcional nuevo en cualquier entrada (nuevos ajustes, nuevas capacidades, permisos nuevos).
- Configuración de Firma (#140 no trae pantalla), Pauta y otros módulos: cuando la tengan, entran por `secciones-modulos.ts` o como entrada de un grupo existente (REGLA §2.5).
- `/platform` y todo lo que solo usa OPAI (REGLA §2.6).
- El contador de aprobaciones de la barra lateral y la barra inferior (NAVEGACION.md §10) y el renombre «Pauta mensual» → «Pauta» de la barra lateral del mockup: en main el menú ya no lo usa y Pauta no está construida; no se toca aquí.
- Crear un grupo nuevo o dividir uno (lo decide Carlos caso a caso, REGLA §1.2).
- Migraciones: el PR 1 **no lleva migración**. Si la sesión cree que hace falta, se detiene y lo explica.

## 4. Pantallas (PR 1)

Cada una a **1280 (escritorio), 1024 (iPad, barra lateral completa, D9) y 375 (teléfono)**, claro y oscuro.

### 4.1 Portada `/configuracion`
- `Cabecera` «Configuración».
- **Buscador de ajustes** ancho completo, placeholder «Busca un ajuste: feriados, logo, API key…». Busca en dos fuentes y muestra los resultados **agrupados por tarjeta**, cada uno con su ruta («Operación › Calendario»):
  1. las **entradas visibles** del usuario (título, descripción, nombre del grupo; sin tildes ni mayúsculas, como `FiltroIndice` hoy);
  2. los **campos de ajuste** de `core.config.buscar` (q ≥ 2), que enlazan a la pestaña «Ajustes» de su módulo (`/configuracion/modulo/<modulo>?seccion=ajustes`) y se agrupan bajo «Módulos». Si `core.config.buscar` falla, se muestran solo las entradas (sin romper la portada).
- Atajo: el campo se enfoca con «/» como hoy. **⌘K sigue siendo la paleta global** (que ya busca ajustes con `core.config.buscar`): no se crea un segundo ⌘K. Si el mockup muestra «⌘K» dentro del campo, mostrar el atajo que realmente funciona y anotarlo como desvío en el PR.
- `?q=` en la URL abre la portada con la búsqueda hecha (se conserva el comportamiento actual).
- **Aviso de aprobaciones:** si `aprobacionesPendientes > 0` y el usuario puede ver Aprobaciones, `Alerta` warning sobre la grilla: «N aprobaciones de agentes esperan tu revisión · Revisar» (singular «1 aprobación de agente espera tu revisión»), con enlace a `/configuracion/aprobaciones`. Sin pendientes, no se muestra.
- **Grilla de tarjetas:** 3 columnas a 1280, 2 a 1024, 1 a 375. Cada tarjeta: ícono, nombre del grupo, línea corta, y sus entradas visibles como texto secundario (las 2–3 primeras). **Sin contadores** («4 ajustes», «3 ajustes», «1 ajuste» o cualquier número): solo nombre, descripción y entradas (ajuste 1). Toda la tarjeta es un enlace tocable (≥ 44 px), con foco visible.
- **Teléfono:** las tarjetas pasan a filas compactas (`FilaSeleccionable`: ícono, nombre y línea corta).
- **Destino de la tarjeta:** en teléfono, la lista del grupo (`/configuracion/grupo/<id>`); en iPad/escritorio, directamente la **primera entrada visible** del grupo (que se abre con la lista del grupo a la izquierda). Si el mockup fija otra cosa, seguir el mockup y anotarlo.
- Orden de las tarjetas: Empresa, Operación, Personas y acceso, Agentes, Módulos, Uso y registros.

### 4.2 Subpágina de grupo
- Ruta del grupo: **`/configuracion/grupo/<id>`** (nueva). No se usa `/configuracion/<grupo>` porque `empresa`, `agentes` y `modulos` ya son rutas de entradas; `grupo` no choca con ninguna. Registrar la ruta en el chequeo de existencia de slugs de Configuración (`/api/existe`, NAVEGACION.md: 404 de los slugs de configuración) para que un id desconocido dé el 404 del ERP con su shell.
- iPad/escritorio: `SplitScreen` con la lista de entradas visibles del grupo a la izquierda (ícono, título, descripción; la activa resaltada como hoy) y la entrada elegida a la derecha con su `Cabecera` y acción. En `/configuracion/grupo/<id>` sin entrada elegida se abre la primera visible (redirección en el servidor a su ruta, conservando las migas).
- Teléfono: `/configuracion/grupo/<id>` muestra la lista del grupo con «‹ Configuración»; cada entrada abre su pantalla con «‹ <Grupo>».
- Migas «Configuración › <Grupo>» (iPad/escritorio) sobre el título de la entrada. La barra lateral del ERP sigue marcando «Configuración».
- Las subpantallas internas (solicitudes, incidentes, retención, roles, detalle de agente, conectar, proveedor, evento, `api-keys`) siguen siendo **pestañas o rutas hijas de su entrada** y resaltan su entrada en la lista; no son entradas (REGLA §1.4).
- `PaginaConfig` se adapta para resolver el grupo desde la sección (`seccion` → grupo) y pintar solo ese grupo. Las páginas de cada entrada no cambian su contenido.
- La fila «Aprobaciones pendientes» de la lista del grupo Agentes lleva un `Badge` con el número de pendientes (oculto si hay 0; §6 bis punto 1).

### 4.3 Grupo Módulos
- Primera entrada «Catálogo de módulos» (`/configuracion/modulos`, la página existente: contratados, en trial y disponibles).
- Después, una entrada por módulo activo o en trial con ajustes (`/configuracion/modulo/<id>`, como `cargarIndice` hoy).
- La regla de 7 **no aplica** a Módulos: con más de 7 entradas, la lista del grupo lleva su propio `InputBusqueda` y muestra todas (sin dividir, sin scroll interno raro: la lista crece en la columna).
- Al abrir un módulo: sus pestañas de `secciones-modulos.ts` (Comercial: Embudo · Catálogos · Ajustes; Rondas: Tipos de incidente · Ajustes), como hoy.

### 4.4 Menú de usuario
- Se conserva el menú actual (`menu-cuenta-shell.ts`): «Preferencias» en el grupo «Cuenta» junto a «Mi cuenta», ahora apuntando a `/mi-cuenta/preferencias` (§6 bis punto 2). Verificar que el menú siga mostrando Preferencias en el ERP en los tres anchos y que no aparezca en Cliente ni Plataforma (e2e `portal-inicio.spec.ts` ya lo cubre: no romperlo).

## 5. Estados (los tres anchos, claro y oscuro; ajuste 3a y 3b)
- **Carga:** esqueleto de la grilla de tarjetas (portada) y de la lista del grupo (subpágina), con el shell (`PaginaPortal` `cargando`).
- **Vacío del buscador:** «No encontramos “<texto>”. Prueba con otra palabra» y enlaces a los grupos visibles.
- **Grupo sin entradas visibles:** la tarjeta **no aparece** (nunca deshabilitada, ADR-041.5). `/configuracion/grupo/<id>` de un grupo sin entradas visibles para el usuario: «Sin permiso» (`Forbidden` del DS, con shell), no una lista vacía.
- **Módulos sin módulos activos con ajustes:** la tarjeta Módulos sigue (por el Catálogo) y la lista muestra, bajo el Catálogo, «Aún no tienes módulos con ajustes» + «Ver catálogo».
- **Sin aprobaciones:** no se muestra el aviso.
- **Error:** si falla la carga, `ErrorCarga` de `PaginaPortal` (CAR-50) con «Reintentar», dentro del shell.
- **404:** grupo inexistente (`/configuracion/grupo/xyz`) → 404 del ERP con su shell y estado HTTP 404.
- **Sin permiso** en una entrada: el comportamiento actual de cada página (no cambia).

## 6. Ajustes aprobados del mockup (30-oct-2026, aplicados en la v aprobada)
1. Sin contadores en las tarjetas de grupo de la portada (ni «4 ajustes», «3 ajustes», «1 ajuste» ni otro número). Cada tarjeta: nombre, descripción y entradas.
2. Barra lateral del mockup: «Pauta mensual» → «Pauta» (una sola sección con pestañas Mensual y Diaria). **No aplica al PR 1** (ver Fuera).
3. a) Modo oscuro en todas las pantallas (portada, subpáginas, grupo Módulos, menú de usuario, estados). b) Estados también a 1024. c) Supervisor y Visualizador **no** ven Agentes (Agentes y API keys, Aprobaciones), Integraciones ni Consumos.

## 6 bis. Addendum del PR 1 (decisiones de Carlos, 30-oct-2026 09:33 CLT, respuesta al widget «Configuración PR 1», chat con OPAI 2.0)

1. **Badge de Aprobaciones pendientes en su fila.** La fila «Aprobaciones pendientes» dentro del grupo Agentes (lista del grupo, tanto en `/configuracion/grupo/agentes` como en `PaginaConfig`) muestra el número de pendientes con un `Badge` del DS 2.0, oculto si hay 0. Sale del mismo `aprobacionesPendientes` que ya trae `cargarIndice` para el aviso de la portada: **sin lecturas nuevas a la base**. Las tarjetas de la portada siguen **sin** contadores (ajuste 1 de §6, sin cambios). Nota de implementación: `ListaGrupo` (`_centro/lista-grupo.tsx`) ya traía este Badge desde el bloque B/C de este mismo PR; el addendum confirma la decisión y la deja escrita.
2. **Preferencias con URL propia.** `/mi-cuenta/preferencias` reemplaza a `/configuracion/preferencias` como URL canónica (detalle en §3.5); `/configuracion/preferencias` queda como redirect permanente en el servidor. Se actualizan `menu-cuenta-shell.ts`, Mi cuenta (sin cambio: hoy no enlaza a Preferencias), `lib/ajuste-destino.ts` (los campos de ajuste de «Preferencias» que busca `core.config.buscar` apuntan a la nueva URL), `NAVEGACION.md` y los e2e que navegaban a la URL antigua (`navegacion-preferencias.spec.ts`, `preferencias-tema-rafaga.spec.ts`, `configuracion-portada.spec.ts`, `configuracion-empresa.spec.ts`, `navegacion-etiquetas.spec.ts`, `navegacion-areas.spec.ts`), con un caso nuevo de e2e para el redirect. El registro de existencia de slugs (`/api/existe`, `existencia-ruta.ts`) no tenía entradas para `preferencias` (es una ruta estática, sin `[id]`): no necesitó cambios. **Presupuesto de JS (ADR-037):** el wildcard `/(erp)/configuracion*` (176 KB) ya no cubre la página al vivir en `/mi-cuenta`; se agrega `"/(erp)/mi-cuenta/preferencias": 176` a `apps/web/presupuesto-js.json` con el mismo tope que ya tenía (174,7 KB reales, sin JS nuevo: es la misma página, solo cambia de ruta).
3. **Los grupos quedan en `/configuracion/grupo/<id>`, sin cambio** (confirma la decisión técnica de §4.2; no se tocó ninguna ruta de grupo).

## 7. Permisos por rol (roles por defecto; los efectivos con rol personalizado y excepciones mandan, ADR-022)
Regla: una entrada aparece solo si el usuario tiene su permiso efectivo; una tarjeta aparece si el usuario ve al menos una entrada (REGLA §3.7). Nada de `platform:*` en `/configuracion`.

Visibilidad con los **roles por defecto** de `@opai/domain` en `45f19cf5` (tabla de `permisos-nucleo.test.ts` y `permisos.test.ts`; Calendario lo leen todos los roles internos):

| Grupo | Entrada (permiso) | owner | admin | gerente | supervisor | viewer |
|---|---|---|---|---|---|---|
| Empresa | Datos de la empresa (`tenant.read`) | sí | sí | sí | sí | sí |
| Empresa | Marca (`tenant.read`) | sí | sí | sí | sí | sí |
| Empresa | Datos personales (`cumplimiento.read`) | sí | sí | sí | no | no |
| Empresa | Comunicaciones (`comunicaciones.manage`) | sí | sí | no | no | no |
| Operación | Patrones y funciones (`patrones.read`) | sí | sí | sí | sí | sí |
| Operación | Calendario (`calendario.read`) | sí | sí | sí | sí | sí |
| Operación | Documentos (`documentos.manage`) | sí | sí | sí | no | no |
| Personas y acceso | Usuarios y permisos (`users.read`) | sí | sí | sí | no | sí |
| **Agentes** | Agentes y API keys (`apikeys.manage`) | sí | sí | no | **nunca** | **nunca** |
| **Agentes** | Aprobaciones (`aprobaciones.manage`) | sí | sí | no | **nunca** | **nunca** |
| Módulos | Catálogo (`tenant.read`) y módulos con ajustes (`config.read`) | sí | sí | sí | sí | sí |
| Uso y registros | **Integraciones** (`integraciones.manage`) | sí | sí | no | **nunca** | **nunca** |
| Uso y registros | **Consumos** (`consumos.read`) | sí | sí | sí | **nunca** | **nunca** |
| Uso y registros | Auditoría (`audit.read`) | sí | sí | sí | no | no |

Tarjetas resultantes: owner/admin 6; gerente 5 (sin Agentes); supervisor 3 (Empresa, Operación, Módulos); viewer 4 (Empresa, Operación, Personas y acceso, Módulos). La tabla es la consecuencia de los permisos de hoy: la UI la calcula siempre desde el permiso efectivo, no la codifica.

- «Nunca» se cumple hoy con los permisos por defecto (ver §2) y el test de §9.1 lo fija: si alguien cambia el catálogo de permisos para dar a supervisor o viewer `apikeys.manage`, `aprobaciones.manage`, `integraciones.manage` o `consumos.read`, el test falla.
- El Visualizador no ve botones de escritura (REGLA §3.8): lo resuelve cada entrada como hoy; el PR 1 no agrega botones.
- Las cifras exactas de cada celda «según permiso» las da el catálogo de permisos de `@opai/domain`; no se inventan en la UI.

## 8. Arquitectura
- Un solo registro de entradas (`secciones*.ts`) con `grupo` tipado como unión de los 6 ids; la metadata de los grupos (etiqueta, ícono, línea corta, orden) en un solo archivo (p. ej. `_centro/grupos.ts`). Nada duplicado entre portada, lista del grupo y buscador.
- `cargarIndice` (o su reemplazo) devuelve las entradas visibles ya agrupadas, las aprobaciones pendientes y el acceso efectivo, sin lecturas nuevas a la base: mismas capacidades que hoy (`core.modules.list`, `core.config.schema`, `core.resumen.contadores`). Cuidar B1: no agregar consultas por tarjeta.
- Componentes de servidor por defecto; el buscador es el único cliente nuevo (como `FiltroIndice`). Presupuesto de JS de la ruta `/configuracion` dentro del tope de ADR-037 (el check `rendimiento`/presupuesto no debe empeorar por este PR).
- Eliminar `IndiceConfig`/`FiltroIndice` si quedan sin uso (sin código muerto).
- `secciones-modulos.ts` sigue siendo el único lugar para que un módulo agregue configuración (REGLA §2.5).

## 9. Criterios de aceptación y tests

### 9.1 Test automático de la regla (en `pnpm test`, REGLA §5)
Un test (p. ej. `apps/web/test/configuracion-regla.test.ts`) que falle si:
- un grupo distinto de `modulos` tiene más de 7 entradas;
- una entrada tiene un `grupo` fuera de la lista cerrada de 6;
- una entrada no declara `permiso` (o lo declara `null`);
- hay una entrada personal (Preferencias, `/configuracion/preferencias`) en el registro de Configuración;
- con los roles por defecto `supervisor` o `viewer`, las entradas visibles incluyen Agentes y API keys, Aprobaciones, Integraciones o Consumos;
- una ruta de `/configuracion` declara un permiso `platform:*`;
- una entrada no es encontrable por su título con el buscador de entradas (para cada entrada).

### 9.2 Criterios de aceptación
- **CA-1** La portada muestra solo tarjetas de grupo (sin lista larga) y el buscador; 3/2/1 columnas a 1280/1024/375; sin ningún contador en las tarjetas.
- **CA-2** Owner ve las 6 tarjetas; supervisor y viewer no ven la tarjeta Agentes ni las entradas Integraciones y Consumos (en portada, listas de grupo y resultados del buscador), y al entrar por URL directa siguen el comportamiento actual de cada página sin permiso.
- **CA-3** Cada entrada de §2 está en su grupo nuevo, se abre desde su tarjeta y resalta su entrada en la lista del grupo, con migas «Configuración › <Grupo>».
- **CA-4** Ningún grupo distinto de Módulos pasa de 7 entradas; Módulos con > 7 muestra su lista completa con buscador.
- **CA-5** Buscar «feriados» encuentra Operación › Calendario; buscar «logo» encuentra Empresa › Marca; buscar un campo de ajuste de un módulo lleva a su pestaña Ajustes; sin resultados muestra el vacío de §5.
- **CA-6** Preferencias no aparece en Configuración (portada, grupos, buscador) y sigue accesible desde el menú de usuario en el ERP, ahora en su propia URL `/mi-cuenta/preferencias` (decisión de Carlos, 30-oct-2026 09:33 CLT, §6 bis punto 2); `/configuracion/preferencias` redirige de forma permanente sin romper enlaces, guardando el tema como hoy.
- **CA-7** Aviso de aprobaciones visible solo con pendientes y solo para quien ve Aprobaciones; la fila «Aprobaciones pendientes» del grupo Agentes (lista del grupo y `PaginaConfig`) muestra el mismo número en un `Badge` del DS 2.0, oculto si hay 0 (decisión de Carlos, 30-oct-2026 09:33 CLT, §6 bis punto 1); las tarjetas de la portada siguen sin contadores.
- **CA-8** Estados de §5 en los tres anchos y en oscuro; 404 con shell para un grupo inexistente.
- **CA-9** Ningún cambio de permisos, capacidades, base de datos ni migraciones; sin `platform:*` en `/configuracion`.
- **CA-10** Accesibilidad: tarjetas y filas ≥ 44 px, foco visible, `aria-current` en la entrada activa, migas con `nav aria-label`, nombres accesibles de los enlaces de tarjeta.

### 9.3 Gate y e2e
- Gate local: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db` y build/presupuesto de la web.
- **e2e nuevo** `apps/web/e2e/configuracion-portada.spec.ts` en los proyectos **desktop (1280), ipad (1024) y telefono (375)**: portada con 6 tarjetas para owner y sin contadores; navegación tarjeta → entrada (desktop/ipad) y tarjeta → lista del grupo → entrada → atrás (telefono); buscador («feriados», vacío); 404 de grupo; Preferencias desde el menú de usuario (a `/mi-cuenta/preferencias`) y no en la portada; **la URL antigua `/configuracion/preferencias` redirige a `/mi-cuenta/preferencias`** (caso nuevo, §6 bis punto 2); oscuro (al menos la portada y un grupo, con `colorScheme: "dark"` o el tema del usuario). Capturas `page.screenshot` en `e2e/__screenshots__/configuracion-portada-*` y en `docs/2.0/qa/brief_configuracion-pr1-portada/` (REGLA §5).
- e2e de permisos: con un usuario supervisor o viewer del seed, si el seed e2e lo tiene; si no lo tiene, cubrirlo con el test unitario de §9.1 y decirlo en el PR (no crear usuarios ni tocar el seed sin necesidad).
- Actualizar los e2e existentes que dependan del índice antiguo (textos «Elige un ajuste», grupos «Plataforma», «Acceso», «Módulos activos», la fila Preferencias en el índice) sin debilitar lo que verifican. Los que navegaban a `/configuracion/preferencias` (`navegacion-preferencias.spec.ts`, `preferencias-tema-rafaga.spec.ts`, `configuracion-empresa.spec.ts`, `navegacion-etiquetas.spec.ts`, `navegacion-areas.spec.ts`) pasan a `/mi-cuenta/preferencias` (§6 bis punto 2).
- **No correr e2e en local** (ver encargo): los corre el CI.

## 10. Riesgos
- **Rutas:** `/configuracion/grupo/<id>` es una decisión técnica de este brief para no chocar con rutas existentes. Si el mockup usa otra URL visible, se anota en el PR; no cambia ninguna ruta existente.
- **Mockup sin export en el repo:** detalles visuales finos se marcan «a confirmar contra el mockup» y QA los revisa en vivo.
- **B1 (Better Auth, timeouts de conexión):** no agregar lecturas; la portada reusa las mismas capacidades que el índice actual.
- **Presupuesto de JS:** el buscador cliente debe quedar liviano (sin dependencias nuevas).

## Historial
- 30-oct-2026: brief escrito por el bot OPAI 2.0 a partir de la regla (00:53/00:55 CLT), el Design Prompt y el mockup aprobado (08:18 CLT). PR 1 en construcción en `brief/configuracion-pr1-portada`.
- 30-oct-2026 09:33 CLT: addendum de Carlos (respuesta al widget «Configuración PR 1», chat con OPAI 2.0, §6 bis). Tres decisiones sobre la misma rama: (1) la fila «Aprobaciones pendientes» del grupo Agentes muestra el número de pendientes en un `Badge` del DS 2.0, oculto si hay 0, sin lecturas nuevas; las tarjetas de la portada siguen sin contadores; (2) Preferencias pasa a `/mi-cuenta/preferencias` como página propia de la cuenta; `/configuracion/preferencias` queda como redirect permanente en el servidor; (3) los grupos quedan en `/configuracion/grupo/<id>`, sin cambio.
