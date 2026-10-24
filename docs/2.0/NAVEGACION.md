# Navegación de OPAI 2.0 — mapa final y estado de hoy

**Estado:** vigente (ADR-046, aprobado por Carlos el 24-oct) · **Fecha:** 23-oct-2026 · Todo brief con pantallas lo respeta; el bot «Diseño y QA OPAI 2.0» lo verifica. El diseño visual pasa por Claude Design (Design Prompt de navegación) antes de implementarse.

## 1. Principios

1. **Áreas, no módulos.** El menú se ordena por lo que la persona hace (vender, operar, pagar), no por cómo está dividido el código. Cada módulo aporta entradas a un área.
2. **Pocas entradas.** Inicio arriba, **seis áreas** como máximo, Configuración al pie. Máximo **siete entradas por área**. Un área con una sola entrada visible se muestra como entrada suelta, sin grupo.
3. **Menú para colecciones, pestañas para partes.** Va al menú lo que se busca por sí mismo (cuentas, negocios, pauta). Lo que pertenece a una entidad (contactos de una cuenta, puestos de una instalación, cotizaciones de un negocio, documentos, actividad) es una pestaña de su ficha (ADR-041), nunca una entrada del menú.
4. **Saltar con ⌘K.** El buscador (Ctrl/⌘K, y el botón de búsqueda en el celular) es la forma principal de moverse: busca entidades (`core.buscar`), páginas y acciones («Nueva cotización», «Agregar persona»), muestra recientes y respeta permisos y alcance.
5. **Fijados y recientes.** Cada usuario fija hasta cinco entradas o fichas, que aparecen arriba de la barra lateral. Los recientes viven en ⌘K (los últimos diez lugares visitados).
6. **Solo lo contratado y permitido.** Un área aparece si al menos una de sus entradas está activa en el tenant y el rol la puede leer. Sin entradas deshabilitadas ni avisos de «disponible pronto» (ADR-041.5).
7. **Un nombre por cosa.** Ver la sección 6.
8. **Persistencia y velocidad.** La barra lateral y la barra inferior viven en el layout del portal, no se vuelven a pintar al cambiar de página y sus entradas se precargan (ADR-045).

## 2. Mapa final del ERP (todas las fases)

| Área | Entradas (orden) | Módulo que la aporta | Fase |
|---|---|---|---|
| **Inicio** | Inicio (pendientes, alertas, accesos) · Bandeja (aprobaciones, tareas asignadas, avisos) | Núcleo | 1 (Bandeja: 2) |
| **Comercial** | Solicitudes · Negocios (embudo y lista) · Cotizaciones · Licitaciones | Comercial, CPQ, Licitaciones | 2 (Licitaciones: 6) |
| **Clientes** | Cuentas · Contactos · Instalaciones | Núcleo | 1 (Contactos: 2) |
| **Operaciones** | Pauta (planificación de turnos) · Turnos extra · Supervisión · Rondas · Novedades · Tickets | Operaciones, Rondas, Tickets | 3 |
| **Personas** | Personas · Asistencia · Vencimientos · Nómina · Cargos y sueldos | Núcleo, Asistencia, Nómina | 1 (Asistencia: 4, Nómina: 6) |
| **Finanzas** | Flujo de caja · Banca y conciliación · Ventas (DTE) · Compras · Rendiciones · Contabilidad · Informes | Finanzas (sub-módulos activables) | 5 |
| **Documentos** | Documentos (explorador, plantillas, firmas pendientes) | Documentos | 2 |
| *(pie)* **Configuración** | Una sola entrada; dentro, el centro por ámbitos (ADR-018/038): empresa, marca, usuarios y permisos, agentes, aprobaciones, módulos, integraciones, comunicaciones, catálogos (embudo, etiquetas), consumos, auditoría | Núcleo | 1 |

Notas:

- **Puestos** no tiene entrada: es pestaña de Instalación y se planifica en Pauta.
- **Modelo de costeo** de CPQ es una pantalla del módulo, accesible desde Cotizaciones (acción secundaria «Modelo de costeo», solo owner y admin, ADR-042.8), no una entrada del menú.
- **Vencimientos** (documentos por vencer de personas) es una vista de Personas; los vencimientos de cuentas e instalaciones viven en Documentos.
- **Aprobaciones** dejan de ser una entrada suelta en el celular: van en la Bandeja de Inicio con contador.
- **Plataforma** no está en el menú del ERP: se entra por el selector de portal.

## 3. Celular: barra inferior

Cuatro entradas más «Más». La segunda y la tercera dependen del **área principal del rol** (o de la preferencia del usuario); Inicio y Buscar son fijas.

| Área principal (por defecto según rol; el usuario la cambia en Preferencias) | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| General (owner, admin, gerente) | Inicio | Negocios | Pauta | Buscar | Más |
| Comercial | Inicio | Negocios | Cuentas | Buscar | Más |
| Operaciones (supervisor) | Inicio | Pauta | Personas | Buscar | Más |
| Finanzas (fase 5; solo owner y admin) | Inicio | Flujo de caja | Banca | Buscar | Más |
| Consulta (viewer) | Inicio | Cuentas | Personas | Buscar | Más |

Los roles base son owner, admin, gerente, supervisor y viewer (ADR-016); «Comercial» y «Finanzas» son áreas principales que el usuario elige, no roles nuevos.

Mientras un área no esté activa, su entrada cae a la siguiente disponible (hoy: Inicio · Cuentas · Personas · Buscar · Más). «Más» abre una hoja con todas las áreas como en la barra lateral, los fijados y Configuración. La Bandeja muestra su contador en Inicio.

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

| Área | owner | admin | gerente | supervisor | viewer |
|---|---|---|---|---|---|
| Comercial | sí | sí | sí | no | lectura |
| Clientes | sí | sí | sí | lectura (alcance) | lectura |
| Operaciones | sí | sí | sí | sí (alcance) | lectura |
| Personas | sí | sí | sí, sin Nómina ni montos de sueldo | lectura (alcance); Nómina no | lectura sin montos |
| Finanzas | sí | sí | **no** | **no** | **no** |
| Documentos | sí | sí | sí | según tipo | lectura |
| Configuración | todo | todo menos eliminar la empresa y gestionar owners | lo que no es empresa, marca, usuarios, keys, integraciones, comunicaciones, aprobaciones, agentes ni sueldos (consulta y preferencias) | sus preferencias | sus preferencias |

El bloqueo financiero (ADR-016) oculta el área completa. Los roles personalizados (ADR-022, backlog) usan la misma regla: un área aparece si el rol puede leer alguna de sus entradas.

## 6. Nombres

| Hoy | Término único | Regla |
|---|---|---|
| «Guardias» (menú), «Personas» (ruta `/personas`, código, extracción) | **Personas** | El área y la entrada se llaman Personas en toda vertical: incluye guardias, supervisores y administrativos. El vocabulario de la vertical (guardia, operario, colaborador, técnico) se usa en textos operativos («guardias en turno», «asignar guardia»), no en el nombre del área. Aprobado por Carlos el 24-oct |
| «Maestros» (grupo) | **Clientes** y **Personas** | «Maestros» es lenguaje de sistemas |
| «Ajustes» (barra inferior) y «Configuración» (barra lateral) | **Configuración** | Un solo nombre; en la barra inferior va dentro de «Más» |
| «Instalac.», «Aprob.» (abreviaturas) | Sin abreviar | La barra inferior usa íconos con etiquetas cortas reales (Inicio, Negocios, Pauta, Buscar, Más) |
| «Instalaciones» | Instalaciones (vocabulario de la vertical: «sitios» en facility si el tenant lo elige) | El vocabulario sí aplica a entidades que cambian de nombre por rubro |

## 7. Cómo lo declaran los módulos

- `navegacion` del manifest: `{ portal, area, href, etiqueta, icono, orden, permiso }`, con `area` de una lista cerrada (`inicio`, `comercial`, `clientes`, `operaciones`, `personas`, `finanzas`, `documentos`). El núcleo arma los grupos, aplica el máximo por área y ordena por `orden`.
- Las pestañas de fichas se declaran en `fichas` (ADR-041.5), no en `navegacion`.
- Las acciones para ⌘K se declaran en `acciones` (etiqueta, capacidad, permiso), y las búsquedas por entidad en el registro de entidades (ADR-041.7).
- Un brief que agrega pantallas indica en su sección 8 el área, la entrada o la pestaña que usa, y si cambia la barra inferior de algún rol.

## 8. Estado de hoy (`main`, `fe362cc`)

- **Barra lateral (escritorio):** Inicio · grupo «Maestros» (Cuentas, Instalaciones, **Personas**, Cargos y sueldos solo en pantallas amplias) · grupo «Módulos» (vacío; los módulos activos se agregan planos) · «Diseño» solo en desarrollo · Configuración al pie, con el contador de aprobaciones.
- **Barra inferior (celular):** Inicio · Cuentas · **Instalac.** · Personas · **Ajustes**; «Aprobaciones» aparece solo en celular cuando hay pendientes.
- **Personas (pestañas, 24-oct):** Personas | Cargos y sueldos | Vencimientos (`SegmentoPersonas` en la barra superior de escritorio y `SegmentoPersonasMovil`, control segmentado con scroll, arriba del contenido en celular; el botón de icono de Vencimientos en Personas se mantiene). El nombre de la entrada y del título es siempre «Personas» (ADR-046); el vocabulario de la vertical solo aparece en textos operativos.
- **404 (24-oct):** cada portal tiene un catch-all `[...ruta]` con su propio «No encontrado» dentro de su shell y estado HTTP 404; las fichas `[id]` y los slugs de configuración consultan `/api/existe` desde el proxy antes de enviar el HTML.
- **Portales:** Supervisor con Hoy e Instalaciones; Trabajador, Terreno y Cliente con solo Inicio (placeholders); Plataforma con Empresas, Trabajos, Consumos y Ajustes.
- **⌘K:** existe en el ERP (búsqueda de entidades); sin acciones ni recientes. Sin fijados.
- **Implementación:** `apps/web/lib/navegacion.ts` (`navegacionErp`, `NAV_PLATAFORMA`, `navegacionPortal`); el shell se monta dentro de cada página (`PaginaPortal`), no en el layout.

## 9. Brecha y orden de implementación

1. **Brief de rendimiento (ADR-045):** shell en el layout y precarga de las entradas del menú. No cambia el mapa.
2. **Design Prompt de navegación** (Claude Design): barra lateral con áreas plegables, fijados, ⌘K con acciones y recientes, barra inferior por rol, hoja «Más». Carlos aprueba.
3. **Brief de navegación:** `area` en `ItemNav` y en el manifest, grupos, fijados, recientes, barra inferior por rol, renombre a Personas y Configuración. Entra antes o junto con el primer módulo de Comercial, que inaugura las áreas Comercial y Clientes.
