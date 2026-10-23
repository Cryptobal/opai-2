# Registro de decisiones (ADR) — OPAI 2.0

Una entrada por decisión. Las decisiones no se editan: si cambian, se agrega una nueva entrada que reemplaza a la anterior. Formato: contexto → decisión → consecuencias.

---

## ADR-001 · Construir OPAI 2.0 desde cero (greenfield)

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Contexto.** OPAI 1.0 creció durante años hasta 280+ modelos, 1.200+ rutas API y 1.100+ componentes, con módulos nunca usados, configuración dispersa y notificaciones por feature. Gard usa una fracción. No hay marcación en vivo ni certificación DT vigente, y los únicos datos imprescindibles son maestros e historial comercial y financiero. El objetivo es un producto distinto: SaaS modular vendible por módulo, multi-tenant real, agent-first y multi-vertical.

**Decisión.** Repositorio nuevo `Cryptobal/opai-2`. 1.0 congelado (solo correcciones críticas) y usado como fuente de reglas, no de código. Corte por tenant y por área, no big bang.

**Consecuencias.** Alcance cerrado por fase; paridad con 1.0 no es objetivo; extracción documental de 1.0 antes de cada módulo.

---

## ADR-002 · Tenancy: base compartida con RLS y Prisma

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** Una base Neon compartida; `tenant_id` en toda tabla de negocio; Row-Level Security habilitada y forzada (`FORCE ROW LEVEL SECURITY`) en cada tabla; la aplicación se conecta con un rol sin `BYPASSRLS`; el tenant se fija por request con `SET LOCAL app.tenant_id` desde una extensión de Prisma (`db.forTenant(tenantId)`). Las migraciones corren con el rol propietario. ORM: Prisma. No se evalúan alternativas.

**Consecuencias.** Ninguna consulta de negocio usa el cliente Prisma crudo fuera de `packages/db`. Test obligatorio de aislamiento (dos tenants, cero fuga, cero filas sin tenant).

---

## ADR-003 · Módulos de primera clase y entitlements por tenant

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** Cada módulo vendible vive en `modules/<id>/` con manifest (id, nombre, dependencias, permisos, navegación, esquema de configuración, eventos). Tabla `tenant_modules` con estado (trial, activo, suspendido). Un schema de Postgres por módulo (`crm`, `cpq`, `ops`, …) y `core` para el núcleo. Un módulo solo referencia tablas de `core` o de módulos declarados como dependencia. Integraciones opcionales entre módulos se declaran y funcionan con cualquiera apagado.

**Regla núcleo vs módulo.** Si lo necesitan dos o más módulos vendibles, es núcleo; si lo necesita uno, es del módulo.

**Consecuencias.** Navegación, permisos, configuración y herramientas MCP se derivan de los módulos activos. Apagar un módulo retira todo lo suyo sin romper nada.

---

## ADR-004 · Agent-first: registro de capacidades

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** Toda capacidad de negocio se declara una sola vez con `defineCapability` (módulo, nombre, permiso, esquemas Zod de entrada y salida, tipo de efecto, `dry_run`, idempotencia). De ese registro se derivan acciones para la UI, API HTTP `/api/v1/`, herramientas MCP, autorización, validación y auditoría. La UI es un cliente más. Los agentes se autentican con API keys con scopes, vinculadas a un usuario responsable, y quedan en la auditoría como "agente vía usuario".

**Consecuencias.** Ninguna ruta, acción o herramienta MCP contiene lógica de negocio. Toda escritura expuesta a agentes acepta clave de idempotencia y soporta vista previa.

---

## ADR-005 · Estructuras de sueldo en tres niveles

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Contexto.** En 1.0, los sueldos se definen por instalación y existe "sueldo por RUT": una persona con sueldo distinto al de su instalación. CPQ necesita las estructuras para costear y Nómina para liquidar.

**Decisión.** Catálogo en el núcleo con tres niveles: cargo (base del tenant), puesto en instalación (lo cotizado y contratado), persona (excepción por RUT con vigencia, motivo y auditoría). Resolución efectiva: persona → puesto → cargo. CPQ cotiza con cargo y puesto; Nómina liquida con la resolución efectiva.

**Consecuencias.** Una sola fuente de verdad para lo que se cotiza y lo que se paga. El nivel persona siempre requiere motivo y queda auditado.

---

## ADR-006 · Multi-vertical: vocabulario por tenant

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** El producto sirve a seguridad, aseo, outsourcing y mantenimiento. El dominio usa términos genéricos (persona, instalación, puesto, servicio, recorrido, novedad). Cada tenant tiene una vertical que define el vocabulario visible, los cargos por defecto y los módulos ofrecidos. Los portales se nombran por rol (Trabajador, Terreno, Cliente, Supervisor).

**Consecuencias.** Nada específico de seguridad se cablea en el núcleo. Los textos de UI pasan por el diccionario de la vertical.

---

## ADR-007 · Mobile e iPad first; misma UX en todos los módulos

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** Toda pantalla se diseña y valida primero a 375px y 1024px (iPad apaisado); desktop es el mismo diseño con más espacio. `packages/ds` (DS 2.0, tokens portados y revisados de DS v3) provee shell y cinco patrones de pantalla: Lista, Detalle, Formulario, Planilla, Dashboard, con estados loading, vacío, error y sin permisos incluidos. Todo módulo compone con esos patrones; el scaffold los genera. Sin hex ni estilos propios por módulo.

**Consecuencias.** La consistencia de UX es estructural. Un patrón nuevo se agrega al DS, nunca a un módulo.

---

## ADR-008 · Configuración, notificaciones e integraciones como servicios del núcleo

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** Los módulos declaran ajustes (esquema en manifest), eventos (catálogo) y adaptadores requeridos. El núcleo renderiza la configuración por ámbito (plataforma → tenant → módulo → usuario), enruta notificaciones según preferencias por rol y usuario (silencio por defecto) y provee adaptadores configurables por tenant (DTE, banco, factoring, mensajería, biometría). Slack es un canal opcional de notificaciones, no un módulo.

**Consecuencias.** Elimina la causa del "Frankenstein" de 1.0. Nada queda huérfano al apagar un módulo.

---

## ADR-009 · Orden de construcción: Comercial y CPQ primero

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** El núcleo se parte en 1a (mínimo para vender) y 1b (completo, antes de Operaciones). Después de 1a van Comercial y CPQ, con importación de maestros e historial comercial desde 1.0, para que Gard cotice y venda desde 2.0 cuanto antes. Luego Licitaciones, 1b, Operaciones y portales, Asistencia y DT, Finanzas, Nómina.

**Consecuencias.** El primer corte de Gard ocurre con el módulo comercial. Finanzas permanece en 1.0 hasta la fase 5.

---

## ADR-010 · Datos que se migran desde 1.0

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** Se migran, cada uno en la fase de su módulo: maestros comerciales e historial de negocios y cotizaciones (fase 2); personas, documentos, cargos y estructuras (1b/3); historial financiero completo: DTE emitidos y recibidos, facturación, ventas, notas de crédito y débito, cesiones a factoring (fase 5). No se migran marcaciones, pautas históricas, alertas ni correos. Cada importación es un script con mapeo de IDs, dry-run y reporte.

---

## ADR-011 · Infraestructura y secretos

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** `test.opai.cl` en construcción y `app.opai.cl` en producción; `opai.gard.cl` redirige al apagar 1.0. Proyecto Vercel, proyecto Neon y bucket R2 propios de 2.0. Toda configuración de infraestructura y secretos se hace desde la máquina de Carlos con CLIs autenticadas (`gh`, `vercel`, `neonctl`, `wrangler`) dentro de un brief; las claves no pasan por chats ni por agentes; `.env` no se commitea. Las migraciones se aplican con un comando explícito, nunca como parte de `build`.

---

## ADR-012 · El repositorio es la memoria del proyecto

**Fecha:** 22-oct-2026 · **Estado:** vigente

**Decisión.** Todo el contexto vive en `docs/2.0/`: arranque, decisiones, `ESTADO.md`, briefs, especificaciones extraídas de 1.0 y contexto para agentes. Cada brief actualiza `ESTADO.md`. Lo que no está en el repo no existe para Claude, Claude Code ni Grokbot.

---

## ADR-013 · DS 2.0 es un sistema de diseño nuevo, no una evolución de DS v3

**Fecha:** 22-oct-2026 · **Estado:** vigente · **Reemplaza** la parte de tokens de ADR-007. La estructura de ADR-007 (shell, cinco patrones, cuatro estados, mobile e iPad first) sigue vigente.

**Contexto.** Carlos pidió un diseño nuevo: moderno, muy minimalista, de nivel mundial, con una paleta distinta a la de OPAI 1.0. El plan anterior portaba los tokens DS v3.

**Decisión.** DS 2.0 no hereda tokens, colores ni tipografía de 1.0. Sus fundamentos (color, tipografía, espaciado, radios, elevación, densidad, modo claro y oscuro) se definen en Claude Design a partir de `docs/2.0/design/DESIGN-PROMPT-ds-2.0-fundamentos.md`, se aprueban por Carlos y se traducen a `packages/ds/src/tokens.css` con nombres semánticos. Mientras el diseño no esté aprobado, el Brief 00 construye la estructura del DS sobre un set de tokens provisional neutro en escala de grises, marcado como provisional. El cambio a los tokens definitivos se hace en un brief corto (00b) sin tocar la estructura: `tokens.css`, fuentes y los ajustes de variantes que el diseño aprobado exija. Se mantienen: nombres semánticos, prohibición de hex fuera de `tokens.css`, los cinco patrones y los cuatro estados.

**Consecuencias.** El diseño se decide una vez para todos los módulos; ningún módulo define colores ni tipografía. El Brief 00 no depende de la aprobación del diseño y puede ejecutarse en paralelo. La estética de 1.0 (paleta slate con acento teal, tono "industrial") queda descartada como referencia.

---

## ADR-014 · Fundamentos del DS 2.0 aprobados

**Fecha:** 23-oct-2026 · **Estado:** vigente · **Completa** ADR-013.

**Decisión.** Carlos aprobó en Claude Design los fundamentos del DS 2.0 (export en `docs/2.0/design/export-ds-2.0/`). Valores fijados en `packages/ds/src/tokens.css`:

- Tipografía: Inter (texto, con `cv11` y `ss01`) y JetBrains Mono (RUT, folios, montos en planillas), autoalojadas vía fontsource. Escala 12/13/14/16/18/22/28/36 con interlíneas definidas y estilos `t-display`, `t-title`, `t-heading`, `t-subheading`, `t-body`, `t-body-sm`, `t-label`, `t-label-sm`, `t-caption`, `t-overline`, `t-numeric`, `t-mono`.
- Color: neutros de 12 pasos; acento índigo `#4A3FD8` (claro) / `#8E88FF` (oscuro); semánticos success/warning/danger/info con variantes `-fg` y `-muted`; `fill` para ítem activo, segmentado, badge neutro y skeleton; `inverse-bg/fg` para toast y monograma. Modo oscuro verdadero. Contraste AA en todo texto, AAA en cuerpo.
- Forma: radios 6/10/16 (20 en sheet inferior), bordes 1px, sin sombra en reposo, una sombra para overlays, scrim.
- Movimiento: 150/200 ms, `cubic-bezier(.2,0,0,1)`.
- Shell: teléfono con selector de portal (monograma + portal + chevrones), búsqueda, campana y avatar en la barra superior (52px) y barra inferior de hasta 5 ítems (56px + safe-area); iPad con riel de 80px; desktop con barra lateral de 248px (marca, tarjeta de tenant/portal, grupos de navegación, usuario) y barra superior de 60px con título, búsqueda ⌘K y campana.
- Componentes: Button 40/48/44 (icono), Input 44 con foco acento, Badge píldora con punto, Chip de filtro 32, Tabs 44, Card radio 16, Table (th 12/16, td 48), KPI tile, Skeleton con brillo, Sheet inferior con asa, Avatar de iniciales, Monograma.

**Reglas derivadas.** En iPad y desktop el título de la página vive en la barra superior del shell (`titulo` del `AppShell`); los patrones muestran el título solo en teléfono (salvo `DetailScreen`, que lo muestra siempre porque es un panel). La acción principal pertenece al patrón. Toda pantalla nueva sigue el export como referencia de layout y jerarquía; cualquier patrón o componente nuevo se diseña primero en Claude Design y se agrega al DS, nunca a un módulo.

---

## ADR-015 · Autenticación con Better Auth

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Contexto.** 1.0 usa Auth.js v5, que sigue en beta desde 2023 (beta.32, julio 2026). 2.0 necesita varios mecanismos (correo y contraseña, Google, enlace mágico, RUT y PIN, dispositivos emparejados, API keys para agentes) sobre un modelo multi-tenant propio.

**Decisión.** Better Auth (1.7.x), TypeScript-first, con adaptador Prisma sobre las tablas de identidad en `core` (`users`, `sessions`, `accounts`, `verifications`, sin `tenant_id`). La pertenencia a tenants es un modelo propio (`memberships`, con RLS y política `user_self`), no el plugin `organization`, para que la segregación siga pasando por Postgres. RUT+PIN y emparejamiento de dispositivos se implementan como proveedores propios en la fase de portales. Las API keys son modelo propio (`api_keys`), vinculadas a un usuario responsable.

**Consecuencias.** `packages/auth` encapsula la librería; el resto del código solo usa `getSession()`/`requireSession()` y `resolverActor()`. Cambiar de librería no toca módulos.

---

## ADR-016 · Roles por tenant y bloqueo financiero

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Decisión.** Cinco roles por tenant: `owner` (todo, incluido borrar el tenant y gestionar owners), `admin` (todo salvo lo anterior), `gerente` (lectura y escritura en todos los módulos operativos y comerciales; sin `finanzas:*`, `nomina:*` ni gestión de usuarios y API keys), `supervisor` (operaciones, rondas, asistencia y personas en lectura; sin comercial ni finanzas), `viewer` (solo lectura, sin finanzas ni nómina). Permisos con formato `<modulo>:<accion>` y comodines por rol en `@opai/domain`. Rol de plataforma aparte (`users.platform_role`: `owner` | `support`), que otorga `platform:*` y no implica permisos dentro de ningún tenant. El acceso a portales es explícito por membresía (`memberships.portales`).

**Consecuencias.** Hereda el principio de 1.0 (`applyFinancialRoleLock`): los datos financieros solo los ven owner y admin. Los permisos por usuario (excepciones) quedan para cuando un tenant los pida.

---

## ADR-017 · Calidad visual: primitivas accesibles, pulido y lint del DS

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Contexto.** Carlos percibe la UI actual como "plana" y pregunta si usaremos componentes nativos o "premium" como los de Vercel, Linear o Claude, y cómo garantizar que todo módulo futuro salga con el mismo diseño.

**Decisión.**

1. La sobriedad (poco color, superficies planas, bordes finos) es la dirección aprobada (ADR-014), no una concesión al rendimiento. Lo que distingue a una interfaz "premium" no es más color sino **pulido**: micro-interacciones, foco visible, skeletons con la forma del contenido, estados vacíos cuidados, overlays accesibles, tipografía afinada y movimiento breve (150–200 ms). Ese pulido es obligatorio en toda pantalla.
2. Los controles complejos **no** se construyen sobre elementos nativos (`<select>`, `<dialog>`) ni desde cero: `packages/ds` adopta las primitivas accesibles de **Radix** (vía shadcn/ui, copiadas al paquete y re-estilizadas con los tokens del DS): Dialog, Sheet, DropdownMenu, Select, Combobox y paleta de comandos (cmdk), Popover, Tooltip, Switch, Checkbox, Radio, Tabs, Toast (Sonner). Comportamiento idéntico en iOS, Android y desktop; teclado y lectores de pantalla resueltos. Motion para transiciones de overlays y listas, con `prefers-reduced-motion` respetado.
3. Los módulos **no escriben elementos interactivos crudos**: una regla de ESLint prohíbe `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>` y `<a>` (fuera de `next/link`) en `modules/**` y `apps/web/app/**`; todo pasa por `@opai/ds`. Si falta un componente, se agrega al DS (con diseño en Claude Design), nunca al módulo.
4. Toda pantalla nueva se diseña en Claude Design **dentro del sistema OPAI DS 2.0** y se implementa con los cinco patrones. El generador de módulos produce pantallas desde los patrones. `/ds` es la galería viva: todo componente nuevo aparece ahí con sus estados.
5. Pulido medible: revisión a 375/1024/1280 en claro y oscuro con capturas comparadas contra el export aprobado; auditoría de accesibilidad (contraste AA, foco, nombres accesibles) en cada brief de pantallas; Lighthouse ≥ 90 en rendimiento y accesibilidad para las pantallas principales de cada portal.

**Consecuencias.** `packages/ds` crece con las primitivas Radix en el Brief 02 (reemplazando `Menu`, `Dialog`, `Switch` provisionales y el `<select>` del selector de portal). El peso extra es marginal frente a la consistencia que compra.

---

## ADR-018 · Configuración unificada por ámbitos

**Fecha:** 23-oct-2026 · **Estado:** vigente · Concreta ADR-008.

**Decisión.** Hay **una sola entrada "Configuración"** en la navegación del ERP, nunca una por módulo. Dentro, un centro de configuración organizado por ámbitos fijos: **Empresa** (datos, vertical, zona horaria, marca), **Usuarios y permisos**, **Módulos** (activos, trial, dependencias), **Integraciones** (DTE, banco, factoring, mensajería, biometría), **Comunicaciones** (plantillas de correo y notificaciones), **Documentos** (plantillas, firma), **Facturación del SaaS** (cuando exista) y una sección por módulo activo. Cada módulo declara su esquema de ajustes en el manifest (`configuracion`, Zod con metadatos de etiqueta, ayuda, grupo y permiso) y el núcleo **renderiza el formulario** desde el esquema: no hay páginas de configuración escritas a mano por módulo. Búsqueda dentro de Configuración y desde la paleta ⌘K ("buscar un ajuste"). Tres niveles de alcance: plataforma (lo fija OPAI), tenant (lo fija el owner/admin) y usuario (preferencias personales). Todo ajuste se lee y escribe por capacidad (`core.config.get/set`), por lo que también se configura por MCP, queda auditado y soporta vista previa.

**Consecuencias.** Apagar un módulo retira su sección. Un módulo nuevo nunca "aparece" en la barra lateral con su propia configuración. El Brief 02 construye el centro de configuración y migra ahí Empresa, Usuarios y API keys del Brief 01.

---

## ADR-019 · Documentos como servicio del núcleo y módulo navegable

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Contexto.** En 1.0 los documentos se cargan en instalaciones, cuentas y personas sin un lugar común; no hay búsqueda transversal; las plantillas y la firma viven aparte.

**Decisión.** Un único servicio del núcleo, **`core.documentos`**: todo archivo o documento generado por cualquier módulo (contrato, liquidación, cotización en PDF, foto de un hallazgo, certificado) se registra ahí con tipo, vínculos polimórficos a una o más entidades (cuenta, instalación, persona, cotización…), carpeta por entidad, etiquetas, vigencia, versión, metadatos y texto extraído para búsqueda (OCR y embeddings después). Los módulos no guardan archivos por su cuenta: llaman a `core.documentos.*`. Sobre el servicio hay un **módulo "Documentos"** vendible y navegable: explorador por entidad y por tipo, búsqueda transversal, bandeja de pendientes de firma, vencimientos (documentos con fecha), y **editor de documentos** con plantillas (editor enriquecido tipo Word, bloques, variables `{{persona.nombre}}`, encabezado y pie por tenant, exportación a PDF idéntica en pantalla e impresión). **Firma**: tres niveles declarados por tipo de documento: firma simple en pantalla (trazo + sello de tiempo), firma con prueba de vida (Face ID/biometría, para trabajadores), y firma electrónica avanzada vía proveedor chileno (para contratos, fase posterior), todas con evidencia (hash del PDF, quién, cuándo, cómo, IP/dispositivo) y bloqueo del documento firmado. Almacenamiento en R2 con URLs firmadas de corta duración, nunca públicas. Toda capacidad de documentos tiene MCP.

**Consecuencias.** El Brief 02 construye el servicio (modelo, subida, vínculos, descarga segura) y la ficha de documentos en cuentas/instalaciones/personas; el módulo Documentos (explorador, editor, plantillas, firma simple) va justo después de Comercial, porque CPQ ya necesita plantillas y PDF.

---

## ADR-020 · Comunicaciones: plantillas de correo y notificaciones por tenant

**Fecha:** 23-oct-2026 · **Estado:** vigente · Concreta ADR-008.

**Decisión.** Cada módulo declara en su manifest los **eventos comunicables** (por ejemplo `cpq.cotizacion.enviada`, `core.usuario.invitado`, `ops.turno.sin_cubrir`) con sus variables y una plantilla por defecto. El núcleo mantiene, por tenant, una **plantilla por evento y canal** (correo, WhatsApp, push, in-app) editable en Configuración → Comunicaciones: editor visual de correo con bloques (encabezado con logo del tenant, texto, botón, tabla, pie), variables validadas contra el evento, vista previa con datos de ejemplo y envío de prueba. Las plantillas se versionan; el envío registra qué versión se usó. Los correos salen por el adaptador de correo del tenant (Resend por defecto; dominio propio verificado cuando el tenant lo configure). El ruteo (quién recibe qué, por qué canal, con qué prioridad, silencios y resúmenes) también es configuración del tenant y del usuario, con **silencio por defecto**: ningún módulo nuevo genera notificaciones hasta que el tenant las activa.

**Consecuencias.** Elimina el ruido de 1.0 (≈1.000 notificaciones diarias). Las primeras plantillas (invitación, recuperación, cotización) nacen con el Brief 02 y CPQ; el editor visual completo en su propio brief.

---

## ADR-021 · CPQ configurable por tenant: modelo de costeo declarativo

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Decisión.** El cotizador no tiene las variables de negocio cableadas. Cada tenant tiene un **modelo de costeo** versionado: parámetros (con tipo, unidad, valor por defecto y ámbito: tenant, cliente, instalación, puesto), reglas de cálculo expresadas en un lenguaje de fórmulas acotado y determinista (sin código arbitrario), y plantillas de salida. OPAI entrega un modelo base por vertical (seguridad: cargo, dotación, turno, horas, cargas sociales, uniformes, movilización, margen, IVA; aseo y outsourcing con sus propias variables) que el tenant extiende o ajusta en Configuración → CPQ. Las fórmulas se evalúan en `packages/domain` con enteros escalados (ADR-007) y cada cotización guarda la versión del modelo y los valores usados: una cotización vieja se recalcula igual años después. La configuración del modelo es una capacidad (MCP incluido) y requiere permiso `cpq:modelo.manage`, reservado a owner y admin.

**Consecuencias.** CPQ se diseña como motor + modelo, no como formulario fijo. El costeo se apoya en el catálogo de cargos y estructuras del núcleo (ADR-005).

---

## ADR-022 · Permisos: acciones, alcance de datos y roles personalizados

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-016.

**Decisión.** Dos dimensiones distintas y explícitas: **permisos** (qué acciones puede ejecutar un rol: `<modulo>:<accion>`, ADR-016) y **alcance** (sobre qué filas: un supervisor solo ve las instalaciones a su cargo, un cliente solo sus instalaciones, un trabajador solo lo suyo). El alcance se implementa en las capacidades a partir del contexto (persona vinculada al usuario, instalaciones asignadas, cuenta del portal cliente) con filtros obligatorios en las consultas; nunca en la UI. Los roles base se mantienen; cuando un tenant lo necesite, podrá crear **roles personalizados** (conjunto de permisos sobre el catálogo que generan los manifests) y **excepciones por usuario**, administrados en Configuración → Usuarios y permisos con una matriz módulo × acción y vista "qué puede hacer este usuario". Los agentes heredan permisos y alcance del usuario responsable, acotados por scopes. Todo es capacidad con MCP.

**Consecuencias.** Cada módulo declara sus permisos en el manifest (ya exigido) y, para las entidades con alcance, el criterio de alcance en su capa de capacidades. Roles personalizados y excepciones: backlog hasta que un tenant los pida.

---

## ADR-023 · Cumplimiento DT desde el diseño (Res. Ex. N°38/2024)

**Fecha:** 23-oct-2026 · **Estado:** vigente · Ver `docs/2.0/extraccion/dt-normativa.md`.

**Decisión.** El módulo Asistencia se construye para certificarse ante la Dirección del Trabajo, no se adapta después. Principios obligatorios desde su primer brief: la marca es un hecho inmutable con hora de servidor, snapshot de empleador/establecimiento/mandante/resolución, método, dispositivo y GPS como evidencia (nunca bloqueante); hash de integridad y **bitácora encadenada append-only** protegida con triggers en Postgres y verificada a diario; correcciones como hechos nuevos con 48 horas de oposición del trabajador y vencimiento automático; comprobante al trabajador por cada marca; contingencia manual trazable; incidentes técnicos registrados; acceso de inspector temporal, de solo lectura y auditado; los seis reportes oficiales con las siglas del Art. 28 g generados desde los hechos; respaldos periódicos con manifiesto y hash y retención mínima de 5 años; límites de jornada (Ley 21.561, DS 48/2024) como configuración con vigencia y alertas tempranas; verificación del reloj del servidor contra hora oficial. Todo cálculo de jornada vive en `packages/domain` con tests que fijan los artículos. Las primitivas que otros módulos comparten (bitácora encadenada, comprobantes, oposición) se implementan en el núcleo para que Rondas y Documentos las reutilicen.

**Consecuencias.** Asistencia es el módulo con más reglas no negociables; su brief parte de la extracción y cada regla se traza a un test. La certificación de Gard se hace sobre 2.0.

---

## ADR-024 · Rondas con GPS como módulo vendible independiente

**Fecha:** 23-oct-2026 · **Estado:** vigente · Ver `docs/2.0/extraccion/rondas-y-tickets.md`.

**Decisión.** Rondas depende solo del núcleo (instalaciones, personas, dispositivos, documentos, geolocalización, comunicaciones) y se vende solo. Conserva de 1.0: puntos de control con QR/NFC/GPS y geocerca por punto, plantillas y programación, estados y cierres automáticos, tracking con precisión y batería, trust score con pesos configurables, detección de anomalías, offline-first con cola idempotente, informes con recorrido y heatmap, vista del cliente. Integra el libro de novedades y los incidentes de terreno. El Portal Terreno y el Portal Trabajador ejecutan rondas con la misma lógica (`packages/domain`).

---

## ADR-025 · Tickets transversal y simple; sin chat

**Fecha:** 23-oct-2026 · **Estado:** vigente · Ver `docs/2.0/extraccion/rondas-y-tickets.md`.

**Decisión.** Tickets es un módulo transversal: tipos con responsable por defecto y SLA opcional, estados `abierto → en_curso → resuelto → cerrado` (+ `rechazado`), un responsable obligatorio desde la creación, resolución devuelta al solicitante en su portal y por correo, vínculo a cualquier entidad, adjuntos vía documentos. Las solicitudes de trabajadores son tipos de ticket con aprobación de un paso dirigidos al supervisor. Nada crea tickets sin dueño; los hallazgos de supervisión no crean tickets. El chat interno no se construye.

---

## ADR-026 · Flujo de caja como pieza central de Finanzas

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Decisión.** Finanzas 2.0 se diseña alrededor del flujo de caja: una planilla (patrón `PlanillaScreen`) por semana y mes con filas de ingresos y egresos derivadas de hechos (DTE emitidos y recibidos, nómina, rendiciones, movimientos bancarios conciliados, compromisos) y proyecciones editables, **derivadas al leer** (como el v3 de 1.0) y nunca copiadas; cada celda sabe de qué hechos proviene; saldo acumulado y escenarios; conciliación bancaria y facturación alimentan la misma planilla. La extracción del flujo de caja v3 de 1.0 se hace antes del brief de Finanzas y es insumo obligatorio.

---

## ADR-027 · Integraciones y secretos por tenant

**Fecha:** 23-oct-2026 · **Estado:** vigente · Ver `docs/2.0/extraccion/integraciones-y-configuracion-por-tenant.md`.

**Decisión.** El núcleo tiene un **catálogo de integraciones** (proveedor DTE, banco, factoring, correo, WhatsApp, mapas y geocodificación, biometría, IA, Slack, webhooks propios) con estado por tenant, prueba de conexión y registro de uso. Cada módulo declara en su manifest las integraciones que requiere; el núcleo provee el adaptador configurado. Las credenciales del tenant se guardan en un **almacén de secretos cifrado** (AES-256-GCM con clave de plataforma rotable, envelope encryption), se muestran una sola vez y nunca salen por API ni MCP. Hay dos modalidades por integración: **de plataforma** (OPAI pone la credencial y la cobra en el plan: mapas, biometría, correo, IA) y **propia del tenant** (DTE, banco, factoring, Slack, dominio de correo, Maps con cuota propia). La geolocalización (autocompletado de direcciones, geocodificación, mapas, distancias) es un servicio del núcleo con proveedor Google Maps por defecto y key de plataforma restringida por dominio; el tenant puede aportar la suya.

---

## ADR-028 · Marca del tenant en toda salida y diseño asistido por IA

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Decisión.** El perfil de marca del tenant (logo en cuatro variantes, favicon, colores de marca, nombre comercial, datos legales y de contacto) vive en el núcleo y se aplica automáticamente a **toda salida**: documentos y PDF, correos, portales de cliente y trabajador, propuestas, comprobantes. La UI del ERP mantiene el DS de OPAI (acento opcional del tenant). Las plantillas (documentos y correos) tienen un **editor estructurado** (bloques y variables) y un **asistente de IA** que genera o rediseña una plantilla a partir de una instrucción ("propuesta comercial para licitación pública, formal, con tabla de dotación") dentro del sistema de bloques, para que el resultado sea editable, consistente con la marca y reproducible; la IA propone, el tenant aprueba. Mismo mecanismo para correos y para textos de propuestas en CPQ. Toda generación queda como versión de la plantilla.

---

## ADR-029 · Fundamentos de SaaS de nivel mundial

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Decisión.** Lo que se fija desde el principio para que el crecimiento sea orgánico:

1. **Eventos de dominio y outbox**: toda escritura relevante emite un evento (`<modulo>.<evento>`) persistido en una tabla outbox dentro de la misma transacción; consumidores (notificaciones, webhooks, telemetría, integraciones) lo procesan con reintentos e idempotencia. Los módulos se comunican por eventos, no por imports.
2. **Jobs y crons**: una sola tabla de trabajos con estado, reintentos y bloqueo; ningún cron hace trabajo directo, encola. Observables en Plataforma.
3. **Webhooks salientes** por tenant con firma HMAC y reintentos, y **API pública versionada** (`/api/v1`) con OpenAPI generado del registro de capacidades: lo que ve el MCP lo ve la API.
4. **Feature flags** por tenant y por usuario (lanzamientos graduales, beta por tenant).
5. **Observabilidad**: trazas y errores con `tenant_id` y `capability` en cada evento; métricas por capacidad (latencia, errores) y por tenant; alertas a plataforma; página de estado pública.
6. **Datos personales (Ley 21.719)**: inventario de campos personales por tabla, cifrado en reposo de los sensibles, retención y borrado por política, exportación y portabilidad por tenant, registro de consentimientos donde aplique, DPO y DPA en el perfil del tenant.
7. **Respaldos y recuperación**: PITR de Neon más exportaciones lógicas periódicas a R2 por tenant; prueba de restauración trimestral; borrado de tenant con cuarentena de 30 días.
8. **Entornos**: previews por PR con rama de Neon efímera; `test.opai.cl` como staging permanente; producción con migraciones explícitas y reversibles.
9. **Offline-first en terreno**: cola local idempotente para marcas, rondas, novedades y fotos; sincronización con resolución de conflictos por sello de servidor.
10. **Dispositivos**: inventario de dispositivos emparejados por instalación (modelo, versión de app, última conexión, batería), revocación remota.
11. **Multi-idioma preparado**: textos de UI en diccionarios desde el inicio (español de Chile por defecto) y vocabulario por vertical; formatos de fecha, moneda y RUT centralizados.
12. **Límites y cuotas** por plan (usuarios, instalaciones, documentos, llamadas MCP) medidos con la telemetría existente, con avisos antes de bloquear.
13. **Onboarding autoservicio** de un tenant nuevo (registro, verificación, primer administrador, datos de empresa, módulos en trial) y centro de ayuda in-app por pantalla.
14. **Accesibilidad y rendimiento medidos**: AA, Lighthouse ≥ 90 en pantallas principales, presupuestos de tamaño de bundle por portal.
15. **Seguridad operativa**: rate limit centralizado, cabeceras y CSP, rotación de secretos, auditoría de accesos de plataforma e impersonación con consentimiento, pruebas de penetración antes de abrir a terceros tenants.

**Consecuencias.** Los puntos 1, 2, 5 y 8 entran en el Brief 02 (outbox, jobs, telemetría ampliada, previews); 6 y 7 en cuanto exista un segundo tenant; el resto se agenda en `ESTADO.md` por fase.

---

## ADR-030 · Roadmap de módulos actualizado

**Fecha:** 23-oct-2026 · **Estado:** vigente · Reemplaza el orden de ADR-009 a partir de la fase 3.

| Fase | Contenido | Corte de Gard |
|---|---|---|
| 1 (en curso) | Núcleo: identidad y plataforma (hecho); maestros, documentos (servicio), configuración, comunicaciones, outbox y jobs (Brief 02) | — |
| 2 | Comercial, CPQ (motor + modelo), módulo Documentos (explorador, editor, plantillas, firma simple); importación de maestros e historial comercial | Ventas en 2.0 |
| 3 | Operaciones (puestos, pautas, turnos extra, supervisión), **Rondas**, **Tickets**, portales Trabajador, Terreno, Cliente y Supervisor, libro de novedades, dispositivos | Operación y terreno en 2.0 |
| 4 | **Asistencia** con cumplimiento DT completo, reportes DT, fiscalización; inicio de certificación | Marcación en 2.0 |
| 5 | Finanzas con flujo de caja al centro, banca y conciliación, DTE y factoring, rendiciones, contabilidad e informes; migración del historial financiero | 1.0 a solo lectura |
| 6 | Nómina (sobre asistencia y estructuras), Licitaciones (sobre CPQ), firma electrónica avanzada | Gard 100 % en 2.0 |
| Backlog | Inventario, cámaras, ATS, gamificación, psicolaboral, chat, Slack, sitio de marketing 2.0, roles personalizados | — |

---

## ADR-031 · Consumos medidos y pagados por tenant; IA configurable y BYOK

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-027.

**Decisión.** Todo recurso con costo variable (tokens de IA por proveedor y modelo, geocodificación y mapas, verificaciones biométricas, mensajes de WhatsApp y SMS, correos, firmas, almacenamiento, llamadas de API y MCP, documentos generados) pasa por un **medidor del núcleo** (`core.consumos`: tenant, recurso, unidad, cantidad, costo unitario y total, módulo, capacidad, actor, referencia) en la misma transacción o en el outbox. Ningún módulo llama a un proveedor directamente: usa el adaptador del catálogo de integraciones, que mide. Por integración, el tenant elige **de plataforma** (credencial de OPAI, cuota incluida en el plan, exceso facturado a precio de lista) o **BYOK** (credencial propia, cifrada en el almacén de secretos; OPAI no cobra ese consumo). Configuración de IA por tenant: proveedor y modelo por clase de tarea (`economica`, `estandar`, `potente`), key propia o de plataforma, presupuesto mensual con avisos al 80 % y corte al 100 % (configurable), política de datos (sin entrenamiento, campos excluidos), y registro de cada llamada (prompt y salida resumidos, tokens, costo) para trazabilidad. Estado de cuenta mensual por tenant; el cobro efectivo queda para cuando exista Opai SpA, pero la medición nace con el Brief 02 (sustituye y amplía `core.usage_events`).

**Consecuencias.** El costo variable viaja con el tenant. Plataforma ve consumo y margen por tenant y por recurso. Las cuotas del plan (ADR-029, punto 12) se miden con el mismo medidor.

---

## ADR-032 · OPAI como plataforma agéntica: qué construye y qué no

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-004.

**Contexto.** Carlos opera hoy OPAI casi por completo desde agentes (Grokbot) y duda si OPAI debe construir "todo" o ser agéntico y escalable.

**Decisión.** OPAI es el **sistema de registro de la operación** (hechos, reglas no negociables, estados, permisos, auditoría, documentos) y los **portales de terreno**. La inteligencia es intercambiable y pertenece al tenant. OPAI no construye chats, asistentes genéricos ni copilotos propios; tampoco clientes de correo, calendarios ni bases de conocimiento. Lo agéntico se concreta en cuatro mecanismos del núcleo:

1. **Operable**: toda acción es una capacidad expuesta por UI, API y MCP (ADR-004).
2. **Reactivo**: todo evento de dominio (ADR-029) se publica a webhooks salientes firmados por tenant y a suscripciones MCP cuando el protocolo lo soporte; el agente del tenant decide qué hacer.
3. **Agentes como principales**: cada agente tiene identidad (API key), scopes, usuario responsable, **presupuesto** mensual de consumos (ADR-031) y **nivel de autonomía** por capacidad: lectura libre; escritura con vista previa; irreversible solo con aprobación humana en una cola de aprobaciones (un ticket dirigido al responsable), salvo autorización explícita del owner por capacidad. Toda acción queda auditada "agente vía usuario" con el `idempotencyKey` del agente.
4. **Manuales para agentes**: `docs/2.0/agentes/` guarda los flujos operativos escritos para que cualquier modelo los ejecute con las capacidades (qué llamar, en qué orden, qué verificar, cuándo detenerse). Se publican en el MCP como recursos y en la página "Conectar" del tenant. Son contenido versionado, no código.

OPAI puede ofrecer además **automatizaciones alojadas** (por ejemplo, búsqueda de reemplazo ante un turno sin cubrir) implementadas como agentes que corren contra las mismas capacidades, con la IA configurada por el tenant y medidas como cualquier consumo; son opcionales y vendibles.

**Consecuencias.** Nada específico de un proveedor de IA entra en los módulos. El alcance de OPAI se achica (no hay chat, correo, agenda ni copiloto) y se vuelve más profundo (hechos, reglas, eventos, aprobaciones). Un tenant puede operar OPAI entero desde su propio agente sin perder control ni trazabilidad.

---

## ADR-033 · Acceso agéntico para clientes y trabajadores desde sus portales

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-032 y ADR-022.

**Decisión.** Las API keys y el MCP no son solo para el tenant: cada portal puede emitir keys para su propio principal. Tres tipos de principal detrás de una key: **usuario del tenant** (hecho en el Brief 01), **cuenta cliente** (emitida por un contacto autorizado desde el Portal Cliente; alcance = su cuenta y sus instalaciones) y **persona trabajadora** (emitida desde el Portal Trabajador; alcance = ella misma; fase posterior). Cada capacidad declara en qué portales está disponible (`portales: ["erp", "cliente", …]`); el MCP de una key de cliente solo expone las capacidades del portal cliente, con el alcance aplicado en la consulta (ADR-022). Lectura amplia de lo que el portal ya muestra (instalaciones, dotación, cobertura, rondas, visitas de supervisión con resumen y firma, novedades, documentos compartidos, cotizaciones, facturas y estados de pago); escrituras limitadas y con vista previa (aprobar o rechazar cotización, crear ticket o solicitud, comentar, firmar lo que le corresponda); nunca datos de otras cuentas ni datos personales de trabajadores más allá de lo que el portal muestra (ADR del Portal Cliente de oct-2026: RUT visible, evaluación psicolaboral no). El tenant decide por cuenta si habilita el acceso agéntico y con qué límites; las llamadas se miden (ADR-031) contra el tenant, que puede trasladarlas al cliente en su contrato. Cada portal tiene una página "Conectar tu IA" con la key, snippets para Claude, ChatGPT, Grokbot y Codex, y el manual de agente de ese portal (`docs/2.0/agentes/`). Toda acción queda auditada "agente vía contacto del cliente" o "vía trabajador".

**Consecuencias.** El modelo de `api_keys` gana `principal_tipo` y `principal_id` (Brief 02 lo deja preparado; Brief 03 lo activa para clientes con los portales). Las capacidades llevan `portales`. Un cliente puede operar con su propia IA sobre los datos de su proveedor: diferenciador comercial y barrera de salida.

---

## ADR-034 · Principios agénticos operativos

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-004, ADR-032 y ADR-033.

**Norte.** OPAI 2.0 es agent-first: toda capacidad es una acción tipada, con permisos y auditoría, disponible por igual para humanos (UI), sistemas (API) y agentes (MCP). Los agentes son actores con identidad delegada, nunca credenciales humanas; toda escritura tiene vista previa, idempotencia y política de aprobación según riesgo. La interfaz existe para decidir y supervisar; la operación rutinaria la ejecutan agentes.

**Decisión.**

1. **Sin keys compartidas.** Cada agente (Tesorero, Cobranzas, Comercial, Inbox…) tiene su propia API key con su nombre, scopes mínimos por módulo y el usuario responsable (ADR-032). Una key usada por varios agentes, o con scope `*`, es transitoria: se reemplaza por keys por agente cuando el tenant active su primer módulo además del núcleo. Presupuesto y autonomía se configuran por key.
2. **Contenido externo es dato, no instrucción.** Todo texto que entra desde terceros (correos, documentos, OCR, notas de clientes o trabajadores, webhooks entrantes) se devuelve en campos identificados como externos, y la descripción de la capacidad lo advierte. Ningún contenido externo habilita por sí mismo una escritura irreversible: esas pasan siempre por la cola de aprobaciones. Los manuales para agentes repiten la regla.
3. **La descripción es el contrato.** La descripción de cada capacidad es lo que un modelo lee para decidir: en lenguaje de negocio, dice qué hace, qué devuelve y, si escribe, qué cambia. Mínimo 40 caracteres, validado en `defineCapability`.
4. **Paridad.** Lo que un humano puede hacer en una pantalla de un portal, un agente con el permiso equivalente y una key de ese portal (ADR-033) lo puede hacer por MCP. Una capacidad `interna` lleva en un comentario por qué no se expone. Una brecha de paridad es un bug de producto y se registra en `ESTADO.md`.
5. **Manuales probados.** Cada manual de `docs/2.0/agentes/` tiene un escenario de prueba determinista (la secuencia de herramientas MCP del manual contra el contexto de prueba de `@opai/capabilities/testing`) que corre en `pnpm test`. Si una capacidad cambia y rompe un manual, falla CI. Las evaluaciones con modelos reales quedan en backlog.

**Consecuencias.** La auditoría distingue a cada agente. La inyección de instrucciones desde correos o documentos no puede producir efectos irreversibles. Cualquier modelo elige bien las herramientas porque las descripciones son explícitas. Los manuales no se desactualizan en silencio.

---

## ADR-035 · Ejecución de briefs desde el proyecto Claude con integración automática

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-012. Reemplaza la parte de las instrucciones del proyecto que asignaba a Carlos ejecutar los briefs en Claude Code.

**Contexto.** Carlos trabaja casi siempre desde el teléfono. Copiar cada brief a Claude Code local y devolver el reporte agrega un paso manual por bloque. Los chats del proyecto "OPAI 2.0" tienen un espacio de trabajo con terminal, Node 22 y pnpm, pueden adjuntar `opai-2` con escritura, y llegan al Mac de Carlos por el puente de la app de escritorio.

**Decisión.** Claude escribe el brief y lo ejecuta en el mismo chat sin esperar confirmación: rama `brief/NN-<nombre>`, commits atómicos por bloque con gate local, revisión del diff por un subagente independiente, PR, e integración a `main` con rebase cuando CI pasa (`typecheck`, `lint`, `test`, `test:db`). Se detiene antes de cualquier acción irreversible o de alto impacto y pide aprobación. Migraciones contra Neon e infraestructura se ejecutan con las CLIs autenticadas del Mac de Carlos o con el conector de Vercel. Claude Code local queda como alternativa para trabajo que requiera la base de datos o herramientas locales de forma intensiva.

**Consecuencias.** Un bloque se cierra sin intervención de Carlos. La validación cruzada que antes daba el paso por Claude Code la cubren la revisión independiente y CI. `main` cambia más seguido: los agentes releen `ESTADO.md` en vez de asumir. Si CI resulta insuficiente para un tipo de cambio (por ejemplo, pantallas), se agrega la verificación faltante al gate en vez de volver a la integración manual.

