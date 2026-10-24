# OPAI 2.0 — Documento de arranque

**Estado:** vigente · **Última actualización:** 22-oct-2026 · **Decisiones registradas en:** `docs/2.0/01-decisiones.md` · **Estado de las tareas en:** Linear (desde el 24-oct-2026; foto técnica en `docs/2.0/ESTADO.md`)

---

## 1. Decisión

Construir OPAI 2.0 desde cero como **SaaS modular, multi-tenant y agent-first** para empresas intensivas en personal y servicios distribuidos: seguridad privada primero, y desde el diseño también aseo, outsourcing, mantenimiento y facility management. Repositorio nuevo (`Cryptobal/opai-2`), desplegado en `test.opai.cl` durante la construcción y en `app.opai.cl` en producción.

OPAI 1.0 (`Cryptobal/opai`, opai.gard.cl) queda congelado (solo correcciones críticas) y sigue operando para Gard hasta que 2.0 cubra cada área. Al apagar 1.0, `opai.gard.cl` redirige a 2.0.

**Premisas que habilitan la decisión**

- No hay marcación en vivo ni certificación DT vigente: la asistencia se construye limpia y se certifica sobre 2.0.
- Los datos que se migran son acotados y se importan en la fase del módulo que los usa:
  - Maestros comerciales (fase 2): cuentas, contactos, negocios, instalaciones, cotizaciones vigentes, historial de negocios.
  - Personas y sus documentos, catálogo de cargos y estructuras de sueldo (fase 1b/3).
  - Historial financiero (fase 5): DTE emitidos y recibidos, facturación, ventas, notas de crédito y débito, cesiones a factoring. Es la historia de ventas de Gard y no se pierde.
  - Todo lo demás (marcaciones, pautas históricas, alertas, correos) nace en 2.0.
- El objetivo es un producto distinto (módulos vendibles por separado, operable por agentes, multi-vertical), no una copia limpia de 1.0.

**Reglas del juego**

1. 2.0 v1 no busca paridad con 1.0. Alcance cerrado por fase. Lo demás es backlog explícito.
2. El corte es por tenant y por área. Gard mueve Comercial y CPQ primero (vender desde 2.0 lo antes posible), luego Operaciones, y mantiene Finanzas en 1.0 hasta que 2.0 Finanzas esté validado.
3. Antes de codear un módulo se extrae su especificación de 1.0 (reglas, estados, permisos, modelo). El código de 1.0 no se porta, salvo piezas aisladas y probadas (tokens DS, adaptadores de integración, plantillas PDF), previa revisión.
4. Tests desde el primer commit en todo cálculo de dinero o tiempo.
5. Todo el contexto del proyecto vive en el repositorio (`docs/2.0/`): decisiones, estado, briefs, especificaciones extraídas, contexto para agentes. Lo que no está en el repo no existe.

---

## 2. Mapa de módulos 1.0 → 2.0

Clasificación según uso real en Gard, declarado por Carlos el 22-oct-2026.

| Área en 1.0 | Uso real | Destino en 2.0 | Fase |
|---|---|---|---|
| Leads, cuentas, negocios, contactos | Diario | Módulo **Comercial**; cuentas y contactos pasan al núcleo | 2 |
| Cotizaciones (CPQ) | Diario | Módulo **CPQ**, sobre el catálogo de cargos y estructuras de costo del núcleo | 2 |
| Licitaciones públicas | En uso, requiere rediseño | Módulo **Licitaciones**, dependiente de CPQ | 2b (después del corte comercial) |
| Instalaciones (aparece en CRM, Finanzas y Operaciones) | Diario | **Una sola entidad del núcleo** con facetas por módulo | 1a |
| Personas (listado) + "Equipo interno" | Diario / parche | **Persona** única en el núcleo; el tipo (operativo, administrativo) es atributo del contrato o cargo, no un módulo | 1b |
| Pautas, turnos extra | Diario | Módulo **Operaciones**: puestos → pautas → turnos → turnos extra | 3 |
| Supervisión, rondas | Diario | Módulo **Operaciones** (visitas) y módulo **Rondas** | 3 |
| Portal Guardia, Terreno, Cliente, Supervisor | Diario | **Portales** rediseñados mobile-first, PWA instalables, con nombres por rol (Trabajador, Terreno, Cliente, Supervisor); incluyen libro de novedades digital | 3 |
| Documentos | Diario, desordenado | Servicio del **núcleo** rediseñado: archivos, plantillas, firma, vínculo polimórfico a cualquier entidad | 1a (archivos y PDF) / 1b (plantillas y firma) |
| Reportes DT, cumplimiento, solicitudes ARCO | Estratégico (certificación) | Reportes DT dentro de **Asistencia**; cumplimiento y ARCO en el núcleo | 4 |
| Asistencia / marcación Face ID | No en vivo | Módulo **Asistencia**, construido para certificarse | 4 |
| Finanzas: banca, flujo de caja, compras y ventas, rendiciones, contabilidad, informes; factoring y cesión de DTE; sincronización con proveedores externos | Diario, requiere rediseño | Módulo **Finanzas** con sub-módulos activables y adaptadores por proveedor (DTE, banco, factoring) | 5 |
| Payroll / estructuras de sueldo (incluye "sueldo por RUT") | Pendiente de Face ID; CPQ depende de las estructuras | Catálogo de cargos y estructuras de sueldo en el **núcleo** (tres niveles: cargo, puesto en instalación, persona); módulo **Nómina** después de Asistencia | 1a (catálogo) / 6 (nómina) |
| Plataforma (admin de tenants) y sitio opai.cl | No optimizado | **Plataforma 2.0** en el núcleo: ciclo de vida de tenant, módulos activos, planes, API keys, vertical; facturación del SaaS cuando Opai SpA exista y haya un tenant externo. Sitio de marketing: app aparte, backlog | 1a (mínima) / 1b |
| MCP / integración con agentes | Uso diario (100% desde Grokbot) | **Superficie de agentes** del núcleo, generada desde el registro de capacidades | 1a |
| Notificaciones y alertas (dispersas por módulo) | Exceso de ruido | **Servicio de notificaciones del núcleo**: los módulos emiten eventos, el núcleo decide quién recibe qué, por qué canal y con qué prioridad, según preferencias por rol y usuario. Silencio por defecto | 1b |
| Configuración (una página por feature, sin orden) | Enredado | **Configuración declarativa**: cada módulo declara su esquema de ajustes en el manifest; la pantalla se organiza por ámbito (plataforma → tenant → módulo → usuario) y apagar un módulo retira su configuración | 1a |
| Integración Slack (deal rooms, bot IA) | No se usa | No se porta como módulo. Slack queda como **canal opcional** del servicio de notificaciones, activable por tenant | Backlog |
| Inventario, cámaras, ATS, alertas, cobertura, incidentes | Nunca usados | No se portan. Se reconstruyen cuando exista demanda real, idealmente de un tenant que pague | Backlog |
| Conocimiento, onboarding, comunicaciones, gamificación, psicolaboral, chat | Nunca usados | Backlog | Backlog |
| Productividad (correos, tareas, agenda) | Eliminado en 1.0 | No existe en 2.0 | — |
| "Portales" (página) | Solo para ver portales | Selector de portal en el shell del núcleo | 1a |

---

## 3. Principios de arquitectura

Son las decisiones caras de cambiar después. Se fijan ahora.

1. **Aislamiento de tenant estructural.** Base compartida, `tenant_id` en toda tabla, Row-Level Security activa y forzada en Postgres, tenant fijado por request desde la capa de datos (Prisma con extensión). Una consulta sin tenant no devuelve nada. No depende de la disciplina del programador.

2. **Módulos de primera clase.** Cada módulo vive en `modules/<id>/` con manifest (id, nombre, dependencias, permisos, navegación, esquema de configuración, eventos), schema, dominio, capacidades y pantallas. Tabla `tenant_modules` con estado (trial, activo, suspendido). Navegación, permisos, configuración y herramientas MCP se derivan de ahí. Un módulo apagado no rompe a otro: los módulos dependen solo del núcleo y de dependencias declaradas, y se comunican por eventos de dominio.

3. **Agent-first: la UI es un cliente más.** Cada capacidad de negocio se declara una sola vez en un **registro de capacidades**: módulo, nombre, permiso requerido, esquema de entrada y salida (Zod), tipo de efecto (lectura, escritura, irreversible) y soporte de `dry_run`. Desde ese registro se generan: acciones para la UI, API HTTP versionada (`/api/v1/...`), herramientas MCP (con vista previa para escrituras), validación, autorización, auditoría e idempotencia. Grokbot, Claude o cualquier cliente MCP ven exactamente lo mismo que la pantalla, con el mismo control de permisos. Los agentes se autentican como principales propios (API key con scopes por módulo, vinculada a un usuario responsable) y quedan en la auditoría como "agente X vía usuario Y".

4. **Dominio puro.** Cálculos (precio de cotización, horas de turno, liquidación, conciliación) en paquetes TypeScript sin dependencia de Next ni Prisma, con tests unitarios. Rutas y pantallas delgadas.

5. **Entidades únicas del núcleo.** Tenant, usuario, cuenta (cliente), contacto, instalación, persona, cargo, estructura de sueldo, documento, notificación, configuración, auditoría. Cada módulo agrega facetas (tablas propias enlazadas), nunca copias.

6. **Regla núcleo vs módulo.** Si lo necesitan dos o más módulos vendibles, es núcleo; si lo necesita uno, es del módulo. Un módulo solo referencia tablas del núcleo o de módulos declarados como dependencia. Las integraciones opcionales entre módulos se declaran como tales y funcionan con cualquiera de los dos apagado.

7. **Catálogo compartido de cargos y estructuras de sueldo, en tres niveles.** (a) Cargo: estructura base del tenant. (b) Puesto en instalación: lo que se cotiza y se contrata para ese sitio. (c) Persona: excepción por RUT con vigencia, motivo y auditoría ("sueldo por RUT" de 1.0). CPQ cotiza con los niveles (a) y (b); Nómina liquida con la resolución efectiva persona → puesto → cargo. Una sola fuente de verdad para lo que se cotiza y lo que se paga.

8. **Dinero y tiempo.** CLP en enteros; UF y porcentajes en decimal con escala fija; redondeos definidos por regla y documentados. Fechas en UTC con zona horaria del tenant; turnos como intervalos reales `[inicio, fin)` para cubrir cruces de medianoche sin casos especiales.

9. **Estados explícitos.** Toda entidad con ciclo de vida tiene máquina de estados declarada: transiciones, permisos, efectos, reversibilidad. Auditoría append-only de todo cambio.

10. **Mobile e iPad first en todo.** Cada pantalla se diseña primero a 375px (teléfono) y 1024px (iPad apaisado) y debe ser plenamente usable en ambos; desktop es el mismo diseño con más espacio, nunca un diseño aparte. Portales: PWA instalable, safe-area iOS, touch targets ≥44px, offline básico. Planillas (pautas, flujo de caja, conciliación): iPad apaisado como superficie principal; en teléfono, vistas por día o por persona.

11. **La misma UX en todos los módulos, por construcción.** `packages/ds` (DS 2.0) provee tokens, componentes, shell y **cinco patrones de pantalla**: Lista, Detalle, Formulario, Planilla y Dashboard. Todo módulo compone sus pantallas con esos patrones; el scaffold de módulo los genera. Los estados loading, vacío, error y sin permisos son parte del patrón, no de cada pantalla. Sin hex, sin estilos propios por módulo.

12. **Multi-vertical desde el diseño.** El dominio habla en genérico (persona, instalación, puesto, servicio, recorrido) y cada tenant tiene una **vertical** (seguridad, aseo, outsourcing, mantenimiento) que define el vocabulario visible ("guardia" o "auxiliar", "ronda" o "recorrido"), los cargos por defecto y qué módulos se ofrecen. Nada específico de seguridad se cablea en el núcleo.

13. **Configuración, notificaciones e integraciones son servicios del núcleo, no código de cada módulo.** Un módulo solo declara: qué ajustes tiene (esquema en el manifest), qué eventos emite (catálogo de eventos) y qué adaptadores necesita (DTE, banco, factoring, mensajería, biometría). El núcleo renderiza la configuración, enruta las notificaciones según preferencias (silencio por defecto) y provee los adaptadores configurables por tenant. Nada se escribe dos veces y nada queda huérfano cuando se apaga un módulo.

14. **Observabilidad y adopción desde el primer día.** Telemetría de uso por tenant, módulo, portal y capacidad; errores centralizados; adopción por módulo como métrica de producto.

---

## 4. Stack

Se mantiene lo conocido y probado; se agrega lo que falta para un producto. Las versiones concretas se fijan en la fundación y se registran en `ESTADO.md`.

| Capa | Elección | Nota |
|---|---|---|
| App | Next.js App Router (versión estable actual), React Server Components y Server Actions, TypeScript estricto | Una app con route groups por portal |
| Datos | Neon Postgres; Prisma con extensión de tenant y RLS; un schema de Postgres `core` y uno por módulo | Decidido: Prisma (22-oct-2026) |
| Validación | Zod como contrato único de UI, API y MCP | |
| UI | Tailwind (versión estable actual) con tokens DS 2.0 como `@theme`, shadcn/ui como base de componentes | Tokens y tipografía portados de DS v3 de 1.0 y revisados |
| Auth | Auth.js v5 con sesiones por portal; API keys con scopes para agentes | |
| PWA / móvil | Serwist (service worker) + Capacitor para tiendas | D-U-N-S y cuentas de desarrollador ya en curso |
| Archivos | Cloudflare R2 | |
| Email / mensajería | Resend; WhatsApp vía Twilio, detrás de un adaptador | |
| Tiempo real | Pusher, detrás de un adaptador | |
| Jobs | Cron de Vercel sobre tabla `jobs` idempotente; evaluar runner dedicado cuando haya más de 10 jobs | |
| Testing | Vitest (dominio y capacidades), Playwright (flujos críticos por portal) | |
| Observabilidad | Vercel Observability + Sentry; telemetría propia de adopción | |
| Monorepo | Turborepo + pnpm; CI en GitHub Actions | |
| Integraciones | SimpleAPI (DTE), Fintoc (banco), empresas de factoring, AWS Rekognition (Face ID), Google OAuth | Cada una como adaptador configurable por tenant |

---

## 5. Estructura del repositorio

```
opai-2/
  apps/
    web/            # ERP, plataforma y portales
                    # route groups: (erp) (platform) (trabajador) (terreno) (cliente) (supervisor)
  packages/
    db/             # Prisma schema, extensión de tenant/RLS, migraciones
    domain/         # lógica pura compartida, con tests
    capabilities/   # registro de capacidades → UI, API v1, MCP
    ds/             # DS 2.0: tokens, componentes, shell, patrones de pantalla
    integrations/   # adaptadores: dte, banco, factoring, mensajería, biometría
    testing/        # fixtures, factories, tenant de prueba
  modules/          # un directorio por módulo vendible
                    # manifest, schema, domain, capabilities, ui
  docs/
    2.0/            # arranque, decisiones (ADR), ESTADO.md, briefs, especificaciones extraídas de 1.0
  CLAUDE.md         # reglas de trabajo para Claude Code
```

El sitio de marketing (`apps/marketing`) se agrega cuando entre al alcance.

---

## 6. Orden de construcción y cortes

Prioridad explícita: **Gard vende desde 2.0 lo antes posible.** Por eso el núcleo se parte en dos y Comercial y CPQ van inmediatamente después del mínimo.

| Fase | Contenido | Hito o corte | Orden de magnitud |
|---|---|---|---|
| **0. Fundación** | Monorepo, CI, `CLAUDE.md`, scaffold de módulo, DS 2.0 base (tokens, shell, patrones), infraestructura (Vercel, Neon, `test.opai.cl`) | Repo listo para construir módulos; `test.opai.cl` responde | 1–2 semanas |
| **1a. Núcleo mínimo** | Tenants y Plataforma mínima (crear tenant, vertical, módulos activos, usuarios, API keys), auth, roles y permisos, RLS, registro de módulos y entitlements, cuentas, contactos, instalaciones, cargos y estructuras de sueldo, archivos y PDF, configuración declarativa, auditoría, registro de capacidades con API v1 y MCP, telemetría, shell con selector de portal | Tenant Gard creado; Grokbot conectado por MCP a 2.0 | 3 semanas |
| **2. Comercial y CPQ** | Leads, negocios, actividades; cotizaciones con propuesta PDF; importación de maestros e historial comercial desde 1.0 | **Primer corte de Gard: ventas opera en 2.0** | 3–4 semanas |
| **2b. Licitaciones** | Sobre CPQ | — | 2 semanas |
| **1b. Núcleo completo** | Personas completas y documentos de persona, plantillas y firma, notificaciones con preferencias y canales, cumplimiento base | Base para Operaciones | 2 semanas |
| **3. Operaciones, Rondas y Portales** | Puestos, pautas, turnos, turnos extra, supervisión, rondas; portales Trabajador, Terreno, Cliente y Supervisor con libro de novedades | **Segundo corte de Gard: operaciones y terreno en 2.0** | 6–8 semanas |
| **4. Asistencia y DT** | Marcación Face ID, GPS, reportes DT, cumplimiento y ARCO; inicio de certificación sobre 2.0 | Módulo listo para certificar | 4 semanas |
| **5. Finanzas** | Banca y conciliación, flujo de caja, compras y ventas (DTE), factoring y cesiones, rendiciones, contabilidad, informes; importación del historial financiero | **Tercer corte de Gard: finanzas en 2.0; 1.0 pasa a solo lectura** | 6–8 semanas |
| **6. Nómina** | Sobre asistencia y estructuras de sueldo | Gard 100% en 2.0 | 4 semanas |

Las duraciones son juicio profesional para un equipo de una persona más Claude Code a dedicación alta. Sirven para ordenar, no para comprometer fechas.

---

## 7. Forma de trabajo

1. Un bloque a la vez. Cada bloque es un brief autocontenido en `docs/2.0/briefs/`, que Claude ejecuta desde el proyecto e integra a `main` con CI en verde (ADR-035).
2. Todo brief termina con gate verde (`pnpm typecheck && pnpm lint && pnpm test`), commits atómicos, PR vinculado a su tarea de Linear y reporte.
3. Claude (proyecto "OPAI 2.0") valida el resultado contra el repo antes del siguiente brief.
4. Pantallas: flujo Claude Design (Design Prompt → diseño aprobado → brief), siempre a 375px y 1024px.
5. Infraestructura y secretos: desde la máquina de Carlos con CLIs autenticadas, dentro de un brief. Las claves no pasan por chats ni por agentes.
6. Desde este proyecto no se despliega a producción de Gard ni se toca OPAI 1.0.

---

## 8. Decisiones tomadas el 22-oct-2026

- Dominios: `test.opai.cl` en construcción, `app.opai.cl` en producción; `opai.gard.cl` redirige al apagar 1.0.
- Datos a migrar: maestros comerciales y su historial; personas, documentos, cargos y estructuras; historial financiero completo (DTE, facturación, ventas, notas de crédito y débito, cesiones). Cada uno en la fase de su módulo.
- ORM: Prisma con extensión RLS. Sin evaluación de alternativas.
- Facturación del SaaS: Opai SpA se constituye en los próximos días; el modelo de planes y módulos activos entra en el núcleo mínimo, el cobro cuando exista el primer tenant externo.
- "Sueldo por RUT": excepción por persona sobre el sueldo del puesto en la instalación. Tercer nivel del catálogo de estructuras.
- Vertical: el producto es multi-vertical (seguridad, aseo, outsourcing, mantenimiento). Vocabulario por tenant.
- Orden: Comercial y CPQ inmediatamente después del núcleo mínimo. Licitaciones después del primer corte.
- UX: mobile e iPad first en todo; misma UX en todos los módulos vía DS 2.0 y patrones de pantalla.
- Todo el contexto del proyecto vive en `docs/2.0/` del repositorio.

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Trampa de la paridad: 2.0 nunca "está listo" | Alcance cerrado por fase; backlog explícito; cortes por área en vez de un corte final |
| Claude Code se desparrama en greenfield | `CLAUDE.md`, scaffold de módulo, registro de capacidades, patrones de pantalla y gates de CI antes del primer módulo; un brief por bloque |
| Doble operación de Gard durante meses | Comercial primero; Finanzas en 1.0 lee maestros que cambian poco; historial financiero se importa completo al final |
| Certificación DT se rehace sobre 2.0 | Especificación y reportes se extraen de 1.0; el módulo se construye para certificar desde el diseño |
| Equipo de una persona | Prioridad estricta por fase; nada fuera de la fase en curso entra al repo |
| Pérdida de reglas aprendidas en 1.0 | Extracción documental a `docs/2.0/extraccion/` antes de cada módulo, no reescritura desde memoria |
| Dominio cableado a seguridad | Vocabulario por vertical desde el núcleo mínimo; revisión de nombres en cada brief |
