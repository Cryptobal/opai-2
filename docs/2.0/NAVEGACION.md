# Navegación de OPAI 2.0 — mapa final y estado de hoy

**Estado:** vigente (ADR-046, aprobado por Carlos el 24-oct; decisiones de diseño del 26-oct en §10, que quedan como reglas del Brief 05 sujetas a la aprobación del brief por Carlos) · **Fecha:** 23-oct-2026, actualizado el 26-oct-2026 · Todo brief con pantallas lo respeta; el bot «Diseño y QA OPAI 2.0» lo verifica. **Diseño aprobado:** [Navegación OPAI 2.0 (Brief 05)](https://claude.ai/design/p/53e9b74b-3cbf-4ad4-858f-271dfc2ef465), 28 pantallas, aprobado (fuente: «Confirmo que apruebo el diseño 53e9b74b» — Carlos, 26-oct-2026 10:51 CLT, chat con el Revisor OPAI 2.0 (t117u; dictado por voz)); se implementa con `briefs/BRIEF-05-navegacion.md`.

## 1. Principios

1. **Áreas, no módulos.** El menú se ordena por lo que la persona hace (vender, operar, pagar), no por cómo está dividido el código. Cada módulo aporta entradas a un área.
2. **Pocas entradas.** Inicio arriba como entrada suelta, **seis áreas** como máximo, Configuración al pie. Máximo **siete entradas por área**; si un área pasa de siete, se divide en dos áreas, sin scroll interno (§10, D2). Un área con una sola entrada visible se muestra como entrada suelta, sin grupo. Los grupos funcionan en acordeón: solo queda abierta el área activa y las demás se pliegan; el estado se recuerda por usuario y empresa (§10, D1).
3. **Menú para colecciones, pestañas para partes.** Va al menú lo que se busca por sí mismo (cuentas, negocios, pauta). Lo que pertenece a una entidad (contactos de una cuenta, puestos de una instalación, cotizaciones de un negocio, documentos, actividad) es una pestaña de su ficha (ADR-041), nunca una entrada del menú.
4. **Saltar con ⌘K.** El buscador (Ctrl/⌘K, y el botón de búsqueda en el celular) es la forma principal de moverse: busca entidades (`core.buscar`), páginas y acciones («Nueva cotización», «Agregar persona»), muestra recientes y respeta permisos y alcance.
5. **Fijados y recientes.** Cada usuario fija hasta cinco entradas o fichas, que aparecen arriba de la barra lateral. Se fijan y desfijan con un ícono de pin (en hover sobre la entrada y en la cabecera de la ficha) y se ordenan por la fecha en que se fijaron (§10, D3). Los recientes viven en ⌘K (los últimos diez lugares visitados).
6. **Solo lo contratado y permitido.** Un área aparece si al menos una de sus entradas está activa en el tenant y el rol la puede leer. Sin entradas deshabilitadas ni avisos de «disponible pronto» (ADR-041.5).
7. **Un nombre por cosa.** Ver la sección 6.
8. **Persistencia y velocidad.** La barra lateral y la barra inferior viven en el layout del portal, no se vuelven a pintar al cambiar de página y sus entradas se precargan (ADR-045).

## 2. Mapa final del ERP (todas las fases)

| Área | Entradas (orden) | Módulo que la aporta | Fase |
|---|---|---|---|
| **Inicio** | Inicio, entrada suelta (pendientes, alertas, accesos y la **Bandeja** dentro: aprobaciones, avisos y, desde la fase 2, tareas asignadas) | Núcleo | 1 |
| **Comercial** | Solicitudes · Negocios (embudo y lista) · Cotizaciones · Licitaciones | Comercial, CPQ, Licitaciones | 2 (Licitaciones: 6) |
| **Clientes** | Cuentas · Contactos · Instalaciones | Núcleo | 1 (Contactos: 2) |
| **Operaciones** | Pauta (planificación de turnos) · Turnos extra · Supervisión · Rondas · Novedades · Tickets | Operaciones, Rondas, Tickets | 3 |
| **Personas** | Personas (con la vista Vencimientos dentro) · Asistencia · Nómina · Cargos y sueldos | Núcleo, Asistencia, Nómina | 1 (Asistencia: 4, Nómina: 6) |
| **Finanzas** | Flujo de caja · Banca y conciliación · Ventas (DTE) · Compras · Rendiciones · Contabilidad · Informes | Finanzas (sub-módulos activables) | 5 |
| **Documentos** | Documentos (explorador, plantillas, firmas pendientes) | Documentos | 2 |
| *(pie)* **Configuración** | Una sola entrada; dentro, el centro por ámbitos (ADR-018/038): empresa, marca, usuarios y permisos, agentes, aprobaciones, módulos, integraciones, comunicaciones, catálogos (embudo, etiquetas), consumos, auditoría | Núcleo | 1 |

Notas:

- **Puestos** no tiene entrada: es pestaña de Instalación y se planifica en Pauta.
- **Modelo de costeo** de CPQ es una pantalla del módulo, accesible desde Cotizaciones (acción secundaria «Modelo de costeo», solo owner y admin, ADR-042.8), no una entrada del menú.
- **Vencimientos** (documentos por vencer de personas) es una vista dentro de Personas, no una entrada del menú, como está construido hoy (§10, D8); los vencimientos de cuentas e instalaciones viven en Documentos.
- **Aprobaciones** dejan de ser una entrada suelta en el celular: van en la Bandeja, dentro de Inicio. La campana de la barra superior muestra un punto de no leído y abre una vista corta de esa misma Bandeja, con «Ver todo» a `/#bandeja`; no hay otra lista de avisos (§10, D4 y D6).
- **Plataforma** no está en el menú del ERP: se entra por el selector de portal.

## 3. Celular: barra inferior

Hasta cuatro entradas de navegación más «Más». Inicio es fija; las demás dependen del **área principal del rol** (o de la preferencia del usuario). Desde ADR-050 «Buscar» ya no va en la barra inferior —vuelve a la barra superior del teléfono (§10, D7)— y qué entrada toma el lugar que dejó (col. 4) lo decide Carlos; hoy ese lugar queda libre.

| Área principal (por defecto según rol; el usuario la cambia en Preferencias) | 1 | 2 | 3 | 4 (libre) | 5 |
|---|---|---|---|---|---|
| General (owner, admin, gerente) | Inicio | Negocios | Pauta | — | Más |
| Comercial | Inicio | Negocios | Cuentas | — | Más |
| Operaciones (supervisor) | Inicio | Pauta | Personas | — | Más |
| Finanzas (fase 5; solo owner y admin) | Inicio | Flujo de caja | Banca | — | Más |
| Consulta (viewer) | Inicio | Cuentas | Personas | — | Más |

Los roles base son owner, admin, gerente, supervisor y viewer (ADR-016); «Comercial» y «Finanzas» son áreas principales que el usuario elige, no roles nuevos.

Mientras un área no esté activa, su entrada cae a la siguiente disponible (hoy: Inicio · Cuentas · Personas · Más; desde ADR-050 «Buscar» ya no ocupa un lugar de la barra inferior, y qué entrada toma el lugar libre lo decide Carlos). «Más» abre una hoja con todas las áreas como en la barra lateral, los fijados y Configuración. Cuando la Bandeja tiene algo pendiente, Inicio muestra un **punto** en la barra inferior; el número aparece dentro de la pantalla (§10, D5). En el celular la búsqueda va en la barra superior (portal, Buscar, campana y avatar), como en el export del DS V2; la D7 quedó reemplazada por ADR-050 (§10).

## 4. Portales

| Portal | Quién | Navegación | Entradas |
|---|---|---|---|
| **Supervisor** | Supervisores en terreno | Barra inferior (sin barra lateral en celular) | Hoy (instalaciones del turno, alertas) · Instalaciones a cargo · Visitas y rondas · Novedades · Más (tickets, personas a cargo, perfil) |
| **Trabajador** (portal de la persona) | Cada persona contratada | Barra inferior | Inicio (mi turno, avisos) · Marcar · Mis documentos (contrato, liquidaciones, comprobantes) · Solicitudes (tickets) · Más (perfil, horario, rondas asignadas) |
| **Terreno** | Dispositivo fijo de una instalación (emparejado) | Pantalla de tarea única, sin menú | Marcar · Ronda · Novedad · Instrucciones del puesto |
| **Cliente** | Contactos de la cuenta cliente | Barra lateral en escritorio, inferior en celular | Resumen · Instalaciones · Reportes (asistencia, rondas, novedades) · Documentos y facturas · Solicitudes (tickets) · Agentes (keys del cliente, ADR-033) |
| **Plataforma** | Operadores de OPAI | Barra lateral | Empresas · Trabajos · Consumos · Precios · Ajustes |

Cada portal muestra solo lo que su módulo contratado habilita (sin Asistencia, el Trabajador no tiene «Marcar»). El alcance de filas lo aplican las capacidades (ADR-022), no el menú.

## 5. Qué ve cada rol en el ERP

**NÚCLEO-D1:** el menú de usuario de los portales internos permite elegir «Portal de
inicio» en una hoja del DS V2, entre los portales de la membresía de la empresa actual.
Sin `next` explícito, tras login o cambio de empresa se usa esa preferencia; si fue
revocada o es null, el primer portal permitido. `next` conserva `destinoSeguro`.
No altera el selector de portales ni concede acceso a ninguno. Plataforma sigue
siendo global y no puede guardarse como preferencia de una membresía.

| Área | owner | admin | gerente | supervisor | viewer |
|---|---|---|---|---|---|
| Comercial | sí | sí | sí | no | lectura |
| Clientes | sí | sí | sí | lectura (alcance) | lectura |
| Operaciones | sí | sí | sí | sí (alcance) | lectura |
| Personas | sí | sí | sí, sin Nómina ni montos de sueldo | lectura (alcance); Nómina no | lectura sin montos; Nómina no (ADR-016; §10, D10) |
| Finanzas | sí | sí | **no** | **no** | **no** |
| Documentos | sí | sí | sí | según tipo | lectura |
| Configuración | todo | todo menos eliminar la empresa y gestionar owners | lo que no es empresa, marca, usuarios, keys, integraciones, comunicaciones, aprobaciones, agentes ni sueldos (consulta y preferencias) | sus preferencias | sus preferencias |

El bloqueo financiero (ADR-016) oculta el área completa. Los roles personalizados (ADR-022; Brief 07c desde el 26-oct) usan la misma regla: un área aparece si el rol puede leer alguna de sus entradas.

## 6. Nombres

| Hoy | Término único | Regla |
|---|---|---|
| «Guardias» (menú), «Personas» (ruta `/personas`, código, extracción) | **Personas** | El área y la entrada se llaman Personas en toda vertical: incluye guardias, supervisores y administrativos. El vocabulario de la vertical (guardia, operario, colaborador, técnico) se usa en textos operativos («guardias en turno», «asignar guardia»), no en el nombre del área. Aprobado por Carlos el 24-oct |
| «Maestros» (grupo) | **Clientes** y **Personas** | «Maestros» es lenguaje de sistemas |
| «Ajustes» (barra inferior) y «Configuración» (barra lateral) | **Configuración** | Un solo nombre; en la barra inferior va dentro de «Más» |
| «Instalac.», «Aprob.» (abreviaturas) | Sin abreviar | La barra inferior usa íconos con etiquetas cortas reales (Inicio, Negocios, Pauta, Más); «Buscar» ya no va en la barra inferior (ADR-050, §10) |
| «Instalaciones» | Instalaciones (vocabulario de la vertical: «sitios» en facility si el tenant lo elige) | El vocabulario sí aplica a entidades que cambian de nombre por rubro |

## 7. Cómo lo declaran los módulos

- `navegacion` del manifest: `{ portal, area, href, etiqueta, icono, orden, permiso }`, con `area` de una lista cerrada (`inicio`, `comercial`, `clientes`, `operaciones`, `personas`, `finanzas`, `documentos`). Configuración no es un área: es la entrada fija al pie que arma el núcleo, y ningún módulo la declara (ADR-018). El núcleo arma los grupos, aplica el máximo por área y ordena por `orden`.
- Las pestañas de fichas se declaran en `fichas` (ADR-041.5), no en `navegacion`.
- Las acciones para ⌘K se declaran en `acciones` (etiqueta, capacidad, permiso), y las búsquedas por entidad en el registro de entidades (ADR-041.7).
- **Agente interno (ADR-049, propuesto en PR #38, pendiente de merge; nota del 26-oct-2026):** el primer lugar de ⌘K, y en el celular el primero dentro de «Buscar», queda reservado para «Preguntar a OPAI». Reservado, se construye en el brief del agente interno; mientras no exista, no se muestra (Brief 05, §4.4).
- Un brief que agrega pantallas indica en su sección 8 el área, la entrada o la pestaña que usa, y si cambia la barra inferior de algún rol.

## 8. Estado de hoy (implementación del PR B, rama `brief/05-pr-b-navegacion`)

NÚCLEO-D2: el shell filtra las entradas con los permisos efectivos de la identidad ya cargada
(rol personalizado y excepciones, ADR-022), sin consultas adicionales. Supervisor exige los
permisos de las capacidades de sus vistas; Plataforma usa el rol global. La navegación no sustituye
la autorización ni los filtros de alcance de las capacidades.

El estado siguiente describe esta rama, no una integración a `main` ni el cierre de la tarea en Linear.

- **Áreas:** Inicio suelto; Clientes (Cuentas e Instalaciones) y Personas (Personas y Cargos y sueldos); las otras áreas aparecen al registrar módulos contratados con permiso efectivo. Configuración al pie, sin contadores. Áreas de una entrada sin encabezado y máximo siete entradas por área.
- **Responsive:** barra lateral desde 1024, riel existente entre 768–1023, barra inferior por área principal en teléfono con respaldo Inicio · Cuentas · Personas · Más. Buscar sigue en la TopBar (ADR-050, reemplaza D7); usuario al pie de la lateral.
- **Fijados y recientes:** hasta cinco fijados por usuario/empresa mediante `core.config`; entradas autorizadas y fichas revalidadas por capacidades con alcance. Hasta diez recientes locales por usuario/empresa, sin consulta ni auditoría por navegación. Acciones de ⌘K solo navegan y se filtran por permisos.
- **Preferencias:** Área principal con vista previa; acordeón persistido por usuario/empresa. Las escrituras de navegación tienen control optimista de revisión y error visible, además del bloqueo transaccional del servidor.
- **Inicio:** Bandeja única de avisos propios y aprobaciones permitidas; la campana abre una vista corta de esa misma Bandeja con «Ver todo» a `/#bandeja`. Inicio y campana comparten el punto, sin números en la navegación.
- **Shell:** persiste en `PortalLayout`, con precarga por intención conservada de `main`; al cambiar de identidad/empresa se reinicia su estado local. Sin migraciones nuevas.

### Foto histórica anterior al PR B

- **Barra lateral (escritorio):** Inicio · grupo «Maestros» (Cuentas, Instalaciones, **Personas**, Cargos y sueldos solo en pantallas amplias) · grupo «Módulos» (vacío; los módulos activos se agregan planos) · «Diseño» solo en desarrollo · Configuración al pie, con el contador de aprobaciones.
- **Barra inferior (celular):** Inicio · Cuentas · **Instalac.** · Personas · **Ajustes**; «Aprobaciones» aparece solo en celular cuando hay pendientes.
- **Personas (pestañas, 24-oct; ajustado el 24-oct por la consistencia de Maestros):** Personas | Vencimientos (`SegmentoPersonas` en la barra superior de escritorio; en celular, el icono de Vencimientos en la cabecera de la lista). «Cargos y sueldos» vive solo en el menú lateral (Maestros; en celular, dentro de «Más») y sin pestañas propias. Personas, Cuentas e Instalaciones son lista a la izquierda y ficha a la derecha, con la lista visible en todas las pestañas de la ficha en escritorio. El nombre de la entrada y del título es siempre «Personas» (ADR-046); el vocabulario de la vertical solo aparece en textos operativos.
- **404 (24-oct):** cada portal tiene un catch-all `[...ruta]` con su propio «No encontrado» dentro de su shell y estado HTTP 404; las fichas `[id]` y los slugs de configuración consultan `/api/existe` desde el proxy antes de enviar el HTML.
- **Portales:** Supervisor con Hoy e Instalaciones; Trabajador, Terreno y Cliente con solo Inicio (placeholders); Plataforma con Empresas, Trabajos, Consumos y Ajustes.
- **⌘K:** existe en el ERP (búsqueda de entidades); sin acciones ni recientes. Sin fijados.
- **Implementación:** `apps/web/lib/navegacion.ts` (`navegacionErp`, `NAV_PLATAFORMA`, `navegacionPortal`); el shell se monta dentro de cada página (`PaginaPortal`), no en el layout.

## 9. Brecha y orden de implementación

1. **Brief de rendimiento (ADR-045):** shell en el layout y precarga de las entradas del menú. No cambia el mapa.
2. **Design Prompt de navegación** (Claude Design): barra lateral con áreas plegables, fijados, ⌘K con acciones y recientes, barra inferior por rol, hoja «Más». **Hecho:** diseño aprobado (fuente: «Confirmo que apruebo el diseño 53e9b74b» — Carlos, 26-oct-2026 10:51 CLT, chat con el Revisor OPAI 2.0 (t117u; dictado por voz); 28 pantallas).
3. **Brief de navegación:** `area` en `ItemNav` y en el manifest, grupos, fijados, recientes, barra inferior por rol, renombre a Personas y Configuración. Es el Brief 05, paso 1 del cierre del Núcleo: `briefs/BRIEF-05-navegacion.md`, propuesto el 26-oct-2026 y pendiente de la aprobación de Carlos.

## 10. Decisiones de diseño del 26-oct-2026

Aprobación del diseño: «Confirmo que apruebo el diseño 53e9b74b» — Carlos, 26-oct-2026 10:51 CLT, chat con el Revisor OPAI 2.0 (t117u; dictado por voz). D1–D10 fueron decididas por el bot OPAI 2.0 bajo la delegación de Carlos: «Sí, que OPAI 2.0 decida los criterios de navegación. […] Pero todos tienen que ser con la paleta de diseño» — Carlos, 26-oct-2026 10:53 CLT, chat con el Revisor OPAI 2.0 (t120u; dictado por voz). D10 además ya es regla de ADR-016. Carlos confirmó que el bot OPAI 2.0 decidió D1–D10 por delegación suya (Carlos, 26-oct-2026 11:03 CLT, chat con el bot OPAI 2.0 (t295u; dictado por voz)). Toda la navegación usa la paleta y los tokens del diseño aprobado. D1–D10 quedan como reglas del Brief 05 sujetas a la aprobación del brief por Carlos (PR #37).

| # | Tema | Decisión |
|---|---|---|
| D1 | Grupos de área | Acordeón: solo queda abierta el área activa y las demás se pliegan. El estado se recuerda por usuario y empresa |
| D2 | Más de siete entradas | Máximo 7 por área. Si un área pasa de 7, se divide en dos áreas; no hay scroll interno |
| D3 | Fijados | Se fija y desfija con un ícono de pin que aparece al pasar el mouse por la entrada y en la cabecera de la ficha. Se ordenan por la fecha en que se fijaron |
| D4 | Inicio y Bandeja | Inicio es una entrada suelta arriba; la Bandeja vive dentro de Inicio |
| D5 | Contador de la Bandeja | En la barra inferior del celular, Inicio muestra un punto y el número aparece dentro de la pantalla. No hay contadores en la barra lateral |
| D6 | Campana (ADR-014) | Muestra un punto de no leído y abre una vista corta de la misma Bandeja, con «Ver todo» a `/#bandeja`. No hay una segunda lista de avisos. Decisión OPAI 2.0, 28-oct-2026 00:35, mandato de Carlos t682u |
| D7 | Búsqueda en el celular | ~~Sale de la barra superior; solo queda «Buscar» en la barra inferior~~. **Reemplazada por ADR-050** (Carlos, 26-oct-2026 17:57): «Buscar» va en la barra superior y no en la inferior |
| D8 | Vencimientos | Vista dentro de Personas, como está construido hoy (corrige el mapa de §2) |
| D9 | iPad | Desde 1024 px se usa la barra lateral completa y plegable del escritorio, sin un riel nuevo y sin plegarse a solo íconos (Carlos, 26-oct-2026 11:03 CLT, chat con el bot OPAI 2.0 (t295u; dictado por voz)). De 768 a 1023 sigue el riel actual |
| D10 | Visualizador (viewer) | No ve Nómina (ya es regla de ADR-016: «solo lectura, sin finanzas ni nómina»; corrige la pantalla 05) |
