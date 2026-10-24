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
4. **Paridad.** Lo que un humano puede hacer en una pantalla de un portal, un agente con el permiso equivalente y una key de ese portal (ADR-033) lo puede hacer por MCP. Una capacidad `interna` lleva en un comentario por qué no se expone. Una brecha de paridad es un bug de producto y se registra como tarea en Linear (desde el 24-oct-2026; antes, en `ESTADO.md`; ver la segunda modificación del ADR-043).
5. **Manuales probados.** Cada manual de `docs/2.0/agentes/` tiene un escenario de prueba determinista (la secuencia de herramientas MCP del manual contra el contexto de prueba de `@opai/capabilities/testing`) que corre en `pnpm test`. Si una capacidad cambia y rompe un manual, falla CI. Las evaluaciones con modelos reales quedan en backlog.

**Consecuencias.** La auditoría distingue a cada agente. La inyección de instrucciones desde correos o documentos no puede producir efectos irreversibles. Cualquier modelo elige bien las herramientas porque las descripciones son explícitas. Los manuales no se desactualizan en silencio.

---

## ADR-035 · Ejecución de briefs desde el proyecto Claude con integración automática

**Fecha:** 23-oct-2026 · **Estado:** vigente, modificado por ADR-043 (Claude ya no integra) · Completa ADR-011 y ADR-012. Reemplaza la parte de las instrucciones del proyecto que asignaba a Carlos ejecutar los briefs en Claude Code.

**Contexto.** Carlos trabaja casi siempre desde el teléfono. Copiar cada brief a Claude Code local y devolver el reporte agrega un paso manual por bloque. Los chats del proyecto "OPAI 2.0" tienen un espacio de trabajo con terminal, Node 22 y pnpm, pueden adjuntar `opai-2` con escritura, y llegan al Mac de Carlos por el puente de la app de escritorio.

**Decisión.** Claude escribe el brief y lo ejecuta en el mismo chat sin esperar confirmación: rama `brief/NN-<nombre>`, commits atómicos por bloque con gate local, revisión del diff por un subagente independiente, PR, e integración a `main` con rebase cuando CI pasa (`typecheck`, `lint`, `test`, `test:db`). Se detiene antes de cualquier acción irreversible o de alto impacto y pide aprobación. Migraciones contra Neon e infraestructura se ejecutan con las CLIs autenticadas del Mac de Carlos o con el conector de Vercel. Los agentes operativos (Grokbot y los demás) no escriben en el repositorio: reportan bugs y brechas de paridad a Carlos. Claude Code local queda como alternativa para trabajo que requiera la base de datos o herramientas locales de forma intensiva.

**Consecuencias.** Un bloque se cierra sin intervención de Carlos. La validación cruzada que antes daba el paso por Claude Code la cubren la revisión independiente y CI. `main` cambia más seguido: los agentes releen `ESTADO.md` en vez de asumir. Si CI resulta insuficiente para un tipo de cambio (por ejemplo, pantallas), se agrega la verificación faltante al gate en vez de volver a la integración manual.

---

## ADR-036 · Puestos de servicio y vínculos laborales en el núcleo

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-005. Brief 02.

**Contexto.** En 1.0 el puesto operativo (instalación + cargo + rol de turno + horario + dotación) vive en Operaciones y el patrón de turno es una entidad de CPQ; la relación laboral está repartida entre `OpsGuardia` (estado de ciclo de vida, contrato) y `OpsPersona`. CPQ cotiza puestos, Operaciones los cubre, Asistencia marca contra ellos y Nómina liquida con su estructura.

**Decisión.** El **puesto de servicio** (`core.puestos`: instalación, cargo, nombre, patrón `dias_trabajo × dias_descanso`, horario `[inicio, fin)` con cruce de medianoche, jornada, dotación, vigencia) y el **vínculo laboral** (`core.vinculos_laborales`: persona, cargo, tipo de contrato, inicio, término, motivo; uno vigente por persona) son del núcleo porque los necesitan dos o más módulos vendibles. El patrón de turno va en el puesto, no en una entidad aparte. Previsión, cuentas bancarias, anticipos y tallas son facetas de Nómina u Operaciones; PIN, Face ID y jornada, de Asistencia y Portales. Las estructuras de sueldo se versionan por vigencia sin solapes en el mismo nivel y referencia; la resolución persona → puesto → cargo vive en `packages/domain`; el nivel persona exige motivo y queda auditado.

**Consecuencias.** CPQ y Operaciones referencian `core.puestos` en vez de crear los suyos. Una persona puede existir sin vínculo vigente (inactiva). Las asignaciones persona ↔ puesto llegan con Operaciones (fase 3).

---

## ADR-037 · Presupuesto de JavaScript por ruta

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-017 y ADR-029 (punto 14). Brief 02.

**Contexto.** Carlos midió ~216 KB gzip en `/login`. Medido por manifests del build (gzip, sin el polyfill `noModule` que los navegadores modernos no descargan): framework de Next 16 + React 19 129 KB; `/login` 170 KB, de los cuales 12 KB eran el cliente de Better Auth y 19 KB el barrel completo del DS.

**Decisión.** (1) El acceso (login, Google, cerrar sesión, cambiar y recuperar contraseña) va por **Server Actions** que llaman a `auth.api.*`; no hay cliente de autenticación en el navegador. (2) Los paquetes del monorepo declaran `sideEffects` y `@opai/ds` se resuelve con `optimizePackageImports`. (3) **Server-first**: listas con `href` (fila como enlace), pestañas por ruta, islas cliente solo para formularios, menús, sheets y overlays, los pesados con carga diferida. (4) `scripts/presupuesto-js.ts` mide cada ruta y `apps/web/presupuesto-js.json` fija los topes (framework 132 KB; acceso 152 KB; ERP 165 KB; Configuración 170 KB; exceso por ruta ≤ 35 KB); CI corre build + `pnpm presupuesto` y falla si una ruta se pasa. (5) Toda dependencia de cliente nueva se justifica en el brief con su tamaño.

**Consecuencias.** `/login` bajó a 150 KB y el ERP a 153–161 KB en el primer bloque. El siguiente recorte (~7 KB, `tailwind-merge`) se evalúa al rehacer el DS sobre Radix. Los topes solo bajan *(desde ADR-043 v3, 24-oct: manda el check obligatorio de presupuesto; un PR que sube un tope deja la justificación en el PR y se integra con las tres condiciones, sin excepción de Carlos)*.

---

## ADR-038 · Ámbitos del centro de Configuración y ajustes declarativos

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-018. Brief 02.

**Decisión.** A los ámbitos de ADR-018 se agregan **Marca**, **Preferencias** (del usuario), **Agentes y API keys** (presupuesto y autonomía), **Aprobaciones**, **Consumos** y **Auditoría**. Los esquemas de ajustes son `z.object` cuyos campos llevan metadatos con Zod `.meta({ etiqueta, ayuda, grupo, ambito, permiso, control })`; `core.config.schema` los entrega como JSON Schema a la UI (`AjustesForm`) y a los agentes, y `core.config.get/set` es la única vía de lectura y escritura (UI, API y MCP). Resolución de valores: defecto del esquema → plataforma → tenant → usuario.

**Consecuencias.** Ninguna pantalla de configuración se escribe a mano por módulo; un agente puede leer y cambiar ajustes con las mismas reglas que una persona.

---

## ADR-039 · Documentos con subida directa, verificación y bitácora

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-019 y ADR-023. Brief 02.

**Decisión.** Los archivos suben directo del navegador o del agente a R2 con una URL firmada PUT de 10 minutos (firmada con `aws4fetch`, sin SDK de AWS). El documento nace `pendiente` y pasa a `disponible` con `core.documentos.confirmar_subida`, que verifica existencia, tamaño, tipo MIME permitido por su tipo y SHA-256, y registra el hecho en la bitácora encadenada. La descarga usa URLs firmadas GET de 5 minutos. Las versiones se encadenan con `reemplaza_a_id`; los duplicados por hash se permiten y se informan. Subidas no confirmadas en 24 horas se eliminan por trabajo programado.

**Consecuencias.** Ningún archivo pasa por las funciones de Vercel. Todo documento tiene huella verificable; los comprobantes públicos (`/verificar/<token>`) prueban su integridad sin exponer datos personales.

---

## ADR-040 · Modelo comercial: cuenta, negocio, instalaciones, contactos con rol, etiquetas y actividad

**Fecha:** 23-oct-2026 · **Estado:** vigente (decisiones de Carlos del 23-oct al final) · Completa ADR-009, ADR-010 y ADR-036. Modifica el modelo de contactos del Brief 02 (punto 5). Insumo: `extraccion/comercial-y-cpq.md` (problemas P1–P18 y modelo, §5).

**Contexto.** En 1.0 el negocio copia la instalación como texto, se une a la cotización por tres vías, el rol del contacto es texto libre, no hay etiquetas, el historial está en nueve tablas y la cuenta no tiene RUT único. La fase 2 construye Comercial y CPQ sobre los maestros del núcleo ya existentes.

**Decisión.**

1. **Cuenta, prospecto y solicitudes.** Un prospecto es una cuenta en estado `prospecto`. Las solicitudes entrantes (formularios web, correo, WhatsApp) no son cuentas: llegan a la bandeja `comercial.solicitudes` (canal, UTM, texto original marcado como externo, SLA de primera respuesta). Es el flujo actual de Gard: desde la bandeja se **deriva** (responsable), se crea o reutiliza la cuenta prospecto y el contacto (con deduplicación) y se crea el negocio; luego viene la cotización (CPQ) y su envío por correo. La basura entrante se descarta con motivo sin ensuciar el maestro. La cuenta pasa a `cliente_activo` por evento al ganar su primer negocio; el paso a `cliente_inactivo` se sugiere cuando su última instalación queda inactiva, nunca automático.
2. **Negocio.** `comercial.negocios` cuelga siempre de una cuenta (`cuenta_id` obligatoria, inmutable una vez que tiene instalaciones o cotizaciones). No copia datos de la instalación. Monto: `valor_mensual`, que **CPQ escribe** en el negocio mediante la capacidad `comercial.negocios.registrar_cotizacion` (venta mensual de la vigente, fecha de envío) cuando cambia la vigente; `monto_estimado_mensual` manual solo mientras no hay cotización. Comercial nunca lee tablas de CPQ: la dependencia va solo de CPQ a Comercial (ADR-003). El "próximo paso" es la tarea abierta más próxima del negocio y el "último contacto" la interacción más reciente: ambos derivados. Licitación es faceta del módulo Licitaciones (fase 6).
3. **Negocio ↔ instalaciones.** Tabla puente `comercial.negocio_instalaciones` (1..N instalaciones por negocio; N negocios por instalación a lo largo del tiempo) con `tipo` cerrado `nueva` | `ampliacion` | `renovacion` | `reemplazo`. Un trigger exige que la instalación sea de la cuenta del negocio al vincularla. Desde el negocio se crea la instalación en estado `prospecto`. Al ganar, el evento `comercial.negocio.ganado` tiene tres consumidores: (a) Comercial activa las instalaciones vinculadas que estén en prospecto o inactivas (cualquier tipo) y marca `aplicada_en`; (b) CPQ pasa la cotización vigente a `aceptada` y las abiertas del negocio a `rechazada`; (c) CPQ materializa los puestos de la vigente en `core.puestos` (ADR-036) por capacidad del núcleo: crea los nuevos y, en ampliación, renovación o reemplazo, cierra la vigencia del puesto referenciado (`puesto_id`) y crea el sucesor desde la fecha de inicio, sin editar el historial; los nombres en conflicto con `@@unique(instalacion, nombre)` se resuelven con sufijo y se informan. Al perder, CPQ rechaza las cotizaciones abiertas y Comercial **propone** (nunca ejecuta) archivar la instalación prospecto si este negocio la creó, no tiene operación y ningún otro negocio abierto o ganado la usa. Cambios respecto de 1.0 en `extraccion/comercial-y-cpq.md` §3.2.
4. **Cotización.** Un solo vínculo obligatorio: `cpq.cotizaciones.negocio_id` (FK); **no existe cotización sin negocio**. La "cotización rápida" (UI y agentes) es una sola capacidad que crea el negocio en la primera etapa del pipeline por defecto y la cotización en el mismo paso y la misma transacción. La cuenta se lee del negocio. Versionada por código. "Vigente" es una **marca** única por negocio (índice parcial), no un valor del estado, porque la vigente puede estar en borrador o enviada; el ciclo de vida va en `estado` (ADR-042). Las líneas se agrupan por instalación del negocio y por puesto. Desaparecen `CrmDealQuote`, `activeQuotationId` y los bundles.
5. **Contactos: persona única por tenant, vinculada a N cuentas, con rol en tres niveles.** Como en HubSpot o Salesforce:
   - `core.contactos` es la **persona**: nombres, apellidos, correo, teléfono, notas, estado, archivado. El correo se normaliza (minúsculas, sin espacios) y es **único por tenant** cuando existe (índice único parcial); un contacto sin correo es válido y la deduplicación sugiere por teléfono E.164 y nombre.
   - `core.contacto_cuentas` es el **vínculo** persona ↔ cuenta: `cargo` en esa cuenta, `roles[]` de catálogo cerrado (`comercial`, `operacional`, `facturacion`, `cobranza`, `cesion`), `es_principal` (uno por cuenta: índice único parcial sobre vínculos activos y no archivados), estado y archivado. Único por par. Los roles son por cuenta: la misma persona puede ser de cobranza en una comunidad y solo comercial en otra.
   - Instalación: `core.contacto_instalaciones.roles[]` (`jefe_sitio`, `recibe_reportes`, `autoriza_visitas`, `emergencia`), en el núcleo porque lo usan Operaciones y el Portal Cliente. El trigger exige un vínculo activo `contacto_cuentas` entre el contacto y la cuenta de la instalación.
   - Negocio: `comercial.negocio_contactos.rol` (`decisor`, `tecnico`, `compras`, `usuario`) y un principal por negocio. El trigger exige un vínculo activo `contacto_cuentas` con la cuenta del negocio.
   - Desvincular a una persona de una cuenta se rechaza mientras tenga roles en instalaciones de esa cuenta o esté en negocios abiertos de ella; los negocios cerrados conservan la referencia histórica.
   - Todos los catálogos de rol son cerrados en código (los textos visibles pasan por el diccionario de la vertical). Reemplazan los flags `recibe*` y los punteros de la cuenta de 1.0.
   - **Impacto en lo ya construido (Brief 02).** Hoy `core.contactos` tiene `cuenta_id` obligatoria, `cargo`, `roles[]` y `es_principal` en la misma fila, correo único por cuenta (`contactos_tenant_cuenta_email_key`) y la unicidad del principal solo en código (`unicoPrincipal`). Cambian: el esquema, las capacidades `core.contactos.list/get/create/update/archive` (más `core.contactos.vincular`, `desvincular` y `set_roles` por cuenta), `core.buscar`, los resúmenes y contadores de cuenta, la pestaña Contactos de la cuenta, la vista de instalación del supervisor y el catálogo de eventos. `create` con un correo que ya existe **vincula** a la persona existente en vez de duplicarla (y lo informa en `dryRun`). El contacto gana ficha propia (ADR-041).
   - **Migración (aditiva, primer bloque del brief de Comercial):** (1) crear `core.contacto_cuentas` con RLS y triggers de mismo tenant, y copiar una fila por contacto desde `cuenta_id`, `cargo`, `roles`, `es_principal`, `estado` y `archivado_en`; crear el índice del principal. (2) Script idempotente con `--dry-run` y reporte: fusiona contactos con el mismo correo normalizado dentro del tenant (gana el más antiguo, los vínculos se mueven, queda registro en `core.fusiones`); hoy solo hay datos de demostración en `dev` y casi nada en `main`. (3) Crear el índice único `(tenant_id, lower(email))` y retirar `contactos_tenant_cuenta_email_key` (un índice, no datos). (4) `cuenta_id`, `cargo`, `roles` y `es_principal` de `core.contactos` pasan a opcionales y en desuso: las capacidades solo leen el vínculo. Su eliminación es una migración de limpieza posterior, destructiva, con aprobación de Carlos. `extraccion/maestros.md` §2 ("único por cuenta") queda superado por este punto.
6. **Etiquetas transversales.** `core.etiquetas` por tenant (nombre, tono del DS, descripción, ámbitos, archivado), agrupables en `core.etiqueta_grupos` con `exclusivo` (Rubro, Segmento, Tamaño: una por entidad; grupos libres: varias). Vínculo polimórfico `core.etiqueta_vinculos` con el mismo patrón que `documento_vinculos`, validado por trigger (tipo registrado, existencia, mismo tenant, ámbito permitido y exclusividad). Ámbitos v1: cuenta, instalación, negocio, contacto y documento; la cotización hereda las del negocio. Capacidades `core.etiquetas.*` (listar, crear, editar, archivar, fusionar, asignar y quitar en lote) y filtro `etiquetas` en las listas y en `core.buscar`. Gestión en Configuración (ámbito empresa). El color es un tono con nombre de `tokens.css`, nunca hex. **`core.documentos.etiquetas String[]` migra ahora al catálogo:** la migración crea, por tenant, una etiqueta de ámbito documento por cada texto distinto (sin grupo) y su vínculo; las capacidades de documentos pasan a leer y escribir el catálogo; la columna queda en desuso y se elimina en una migración de limpieza.
7. **Embudo configurable por tenant.** `comercial.pipelines` (uno por defecto; el modelo admite más, por ejemplo licitaciones) y `comercial.etapas`: nombre, orden, probabilidad por defecto, tono, `tipo` `abierta` | `ganada` | `perdida` y requisitos de entrada (`exige`: `monto`, `fecha_cierre`, `cotizacion_enviada`, `inicio_servicio`, `motivo_perdida`), que reemplazan la bandera `negotiationIncomplete` de 1.0. Todo se edita en **Configuración → Comercial → Embudo**. La **única regla fija** es exactamente una etapa `ganada` y una `perdida` por pipeline, garantizada en base. Una etapa con negocios no se elimina (se archiva moviendo antes sus negocios) y no cambia de `tipo`. Para Gard, la etapa "Aceptada" de 1.0 es `abierta` con `exige: inicio_servicio` y no cuenta como ganada. Historial append-only `comercial.negocio_etapas` con duración en la etapa anterior (métricas de embudo). Motivo de pérdida con categoría cerrada (`precio`, `cobertura`, `plazo`, `sin_respuesta`, `competencia`, `no_califica`, `otro`; detalle obligatorio en `otro`) y competidor opcional. Tipo de negocio y origen: catálogos editables del tenant (`comercial.catalogos`), también en Configuración. Reabrir un perdido es una transición con motivo. Como ADR-018/038 prohíben páginas de configuración por módulo, el centro de Configuración agrega **catálogos declarativos**: el manifest declara la colección (esquema Zod de la fila, orden, reglas y capacidades) y el centro la renderiza con un editor genérico de lista ordenable; lo usan etapas, tipos, orígenes y etiquetas.
8. **Actividad unificada en el núcleo.** `core.actividades` (nota, llamada, correo, WhatsApp, reunión con acuerdos, visita, tarea con vencimiento, prioridad, responsables y estado) con vínculos polimórficos `core.actividad_vinculos` (una actividad puede ir al negocio, la cuenta y el contacto a la vez) y `core.actividad_responsables`. Va en el núcleo porque Operaciones y Personas también registran notas y tareas. La pestaña Actividad (ADR-041) une interacciones, tareas y cambios de `core.audit_events` (los cambios de etapa ya quedan ahí por la capacidad que mueve el negocio) en el Timeline existente. Reemplaza `CrmHistoryLog`, `CrmNote`, `CrmTask*`, `CrmDealMeeting` y `CrmDealContactLog`. La cadencia de seguimiento de 1.0 queda en backlog como automatización sobre eventos.
9. **Deduplicación, fusión y transferencia.** Contactos: el correo normalizado es único (la base impide el duplicado y la creación vincula a la persona existente); sin correo, se sugiere por teléfono E.164 y nombre. Instalaciones por `place_id` o distancia menor a 50 m dentro de la cuenta (cálculo en `packages/domain`); cuentas por RUT y por nombre canónico. Las sugerencias avisan, no bloquean. `core.cuentas.fusionar` y `core.contactos.fusionar` mueven lo del núcleo (vínculos contacto–cuenta, instalaciones, vínculos de documentos, etiquetas y actividades, ids externos) a la ganadora, registran `core.fusiones` con snapshot, archivan la perdedora y emiten `core.cuenta.fusionada` / `core.contacto.fusionado`; cada módulo reapunta sus filas en su consumidor; el núcleo no conoce tablas de módulos. Son irreversibles: piden aprobación humana a los agentes. **`core.instalaciones.transferir`** mueve una instalación a otra cuenta para el mismo sitio con continuidad de servicio (cambio de razón social o de mandante): conserva id, puestos y documentos; exige motivo; queda en auditoría y bitácora; emite `core.instalacion.transferida`; pide aprobación humana a los agentes. Los roles de contactos en la instalación se conservan solo si la persona también está vinculada a la cuenta nueva (los demás se retiran y se informan). Los negocios y cotizaciones anteriores siguen en la cuenta original (la regla de misma cuenta se valida al vincular, no hacia atrás). Si el servicio cambia de verdad, se cierra la instalación y se crea otra copiando puestos.
10. **Convivencia con 1.0: regla operativa, sin tocar 1.0.** Desde el corte de Comercial, 2.0 es dueño de cuentas, contactos e instalaciones y **los maestros se editan solo en 2.0**. 1.0 no se modifica (está congelado). Un consumidor del outbox sincroniza en un solo sentido (2.0 → 1.0) altas y cambios de cuentas, vínculos contacto–cuenta e instalaciones, y la activación por negocio ganado, usando la API existente de 1.0 con una key dedicada y mapeando ids en `core.ids_externos` (sistema `opai1`). Como 1.0 exige una cuenta por contacto, cada vínculo contacto–cuenta de 2.0 es un `CrmContact` en 1.0 (id externo por vínculo). Para Finanzas (en 1.0 hasta la fase 5) la sincronización traduce los roles a lo que 1.0 usa: `facturacion` → `recibeFacturacion` y `recibeNotasCredito`; `cobranza` → `recibeCobranza` y `contactoCobranzaId` (el principal de cobranza); `cesion` → `recibeCesion`. Cada sincronización sobrescribe en 1.0 los campos que 2.0 posee; lo que alguien edite en 1.0 en esos campos se pierde en la siguiente sincronización del registro. Un trabajo diario de **conciliación de solo lectura** compara 1.0 con 2.0 por la API de 1.0 y reporta diferencias para detectar ediciones hechas en 1.0. Si 1.0 Operaciones necesita los puestos de un negocio ganado, se sincronizan también (pendiente de verificar en `extraccion/comercial-y-cpq.md` §8).

**Consecuencias.** CPQ depende del módulo Comercial (la cotización exige negocio); Comercial no depende de CPQ. El brief de Comercial empieza por el cambio de contactos del núcleo (punto 5) y la migración de etiquetas de documentos (punto 6), antes de crear tablas de Comercial. El núcleo gana `contacto_cuentas`, `contacto_instalaciones`, etiquetas, actividades, fusiones, transferencia de instalaciones y catálogos declarativos en Configuración; Comercial y CPQ solo agregan facetas. La integridad (correo único, misma cuenta, un principal, una vigente, una ganada y una perdida) queda en la base.

**Decisiones de Carlos (23-oct).**

1. Contacto en varias cuentas: **sí**, persona única por tenant identificada por correo y vínculo con roles por cuenta (punto 5).
2. Cotización sin negocio: **no**; la cotización rápida crea el negocio en el mismo paso (punto 4).
3. Instalación que cambia de cuenta: **sí**, solo con `core.instalaciones.transferir` (punto 9).
4. Bandeja de solicitudes aparte: **sí** (punto 1).
5. Convivencia 2.0 → 1.0: **regla operativa sin bloqueo**; no se toca 1.0 (punto 10).
6. Embudo: etapas configurables por tenant en Configuración, con la única regla fija de una ganada y una perdida; para Gard "Aceptada" es abierta con `exige: inicio_servicio` (punto 7).
7. Migrar `documentos.etiquetas` al catálogo: **sí, ahora** (punto 6).

---

## ADR-041 · Fichas con pestañas consistentes

**Fecha:** 23-oct-2026 · **Estado:** vigente (aprobado por Carlos el 23-oct; respuestas en `PREGUNTAS-carlos.md`) · Aplica ADR-007 (misma UX) y ADR-003 (módulos independientes).

**Contexto.** Cada ficha (cuenta, instalación, persona) arma sus pestañas a mano en su componente: contadores calculados de formas distintas (`contactos.length` en una, conteo del servidor en otra), una pestaña deshabilitada "Disponible con Operaciones" en instalación, y las piezas transversales aceptan solo enumeraciones fijas del núcleo: `ActividadFicha` (`cuenta`, `instalacion`, `persona`, `cargo`), `core.actividad.list` (los mismos más `documento`) y `FichaDocumentos`/`core.documentos` (`tenant`, `cuenta`, `instalacion`, `persona`, `puesto`). Comercial agrega negocio y cotización y pestañas "Negocios" en cuenta e instalación.

**Decisión.**

1. **Un componente de ficha** (`Ficha` en `apps/web/app/_components/ficha/`, sobre `DetailScreen` del DS) recibe la entidad y una definición declarativa; ninguna ficha escribe su arreglo de pestañas.
2. **Orden fijo:** `Resumen` → pestañas propias de la entidad → pestañas aportadas por módulos → `Documentos` → `Actividad`. Resumen, Documentos y Actividad son transversales y obligatorias en toda entidad con ficha.
3. **Notas no es pestaña.** Las notas son actividades: se escriben desde un compositor arriba de Actividad (nota, llamada, reunión, tarea) y Actividad filtra por Todo, Interacciones, Tareas, Cambios y Agentes. Resumen muestra la próxima tarea y la última interacción.
4. **Etiquetas no es pestaña.** Van como chips bajo el título, editables en línea (`Chip` y `ChipAgregar` del DS) y en el resumen móvil.
5. **Pestañas aportadas por módulos.** El manifest declara `fichas: { cuenta: [{ id: "negocios", etiqueta, orden, contador }] }`; el núcleo las muestra solo si el módulo está activo y el usuario tiene el permiso de lectura. Así Comercial agrega "Negocios" a cuenta e instalación sin que el núcleo conozca Comercial. **No hay pestañas deshabilitadas** ni anuncios de módulos inactivos: la pestaña "Personas" de instalación aparece cuando Operaciones esté activo.
6. **Contadores.** Una capacidad `core.ficha.contadores({ entidad })` devuelve en una llamada los conteos de las pestañas del núcleo y, para las aportadas por módulos, invoca la capacidad de conteo que cada módulo declara en su manifest (el núcleo no consulta tablas de módulos), con las mismas reglas que la lista de la pestaña: solo elementos no archivados en su vista por defecto (vínculos contacto–cuenta activos, instalaciones no archivadas, puestos activos, negocios abiertos, documentos disponibles). Contador solo en pestañas de colección; nunca en Resumen ni Actividad; el 0 no se muestra. Documentos agrega un punto de advertencia si hay obligatorios faltantes o vencidos. `null` (sin permiso) oculta la pestaña.
7. **Registro de entidades.** Un registro en tiempo de ejecución en `@opai/capabilities` (junto a `registrarModulos`, porque `@opai/domain` no puede importar módulos) define por tipo: permiso de lectura, capa de documentos, ruta de la ficha, nombre visible y tabla para verificar existencia. El núcleo registra las suyas y cada módulo las propias (`negocio`, `cotizacion`) desde su manifest. Los triggers de vínculos polimórficos (documentos, etiquetas, actividades) validan contra la lista de tipos sincronizada a la base. `core.actividad.list`, `core.documentos.*`, `core.etiquetas.*`, `ActividadFicha` y `FichaDocumentos` validan contra ese registro en vez de enumeraciones fijas. Las capas de tipos de documento suman `negocio` y `cotizacion`.
8. **Responsive.** Pestañas por ruta (server-first). En 375 px se desplazan horizontalmente con la activa visible; con más de cinco, las últimas van a "Más". En iPad y desktop, Resumen puede mostrar la columna de contexto (etiquetas, responsable, próxima tarea).

9. **Fichas de la fase 2.** Cuenta: Resumen → Contactos → Instalaciones → Negocios (Comercial) → Documentos → Actividad. Instalación: Resumen → Puestos → Contactos (roles de instalación) → Negocios (Comercial) → Documentos → Actividad. **Contacto** (nueva, porque la persona es única y vinculada a varias cuentas, ADR-040 §5): Resumen → Cuentas (vínculos con cargo y roles por cuenta) → Negocios (Comercial) → Documentos → Actividad. Negocio: Resumen (instalaciones, contactos con rol, cotización vigente) → Cotizaciones (CPQ) → Documentos → Actividad.

**Consecuencias.** Las fichas de cuenta, instalación y persona se migran al componente en el brief de Comercial (sin cambio visual salvo las pestañas deshabilitadas y los contadores). Negocio y cotización nacen con la misma estructura. Agregar una entidad nueva no toca Actividad ni Documentos.


**Decisiones de Carlos (23-oct).** (1) Las notas son actividades y las etiquetas van como chips, sin pestañas propias. (2) El contacto tiene ficha propia. (3) Las pestañas de módulos no contratados se ocultan por completo.

---

## ADR-042 · CPQ configurable por tenant y vertical, con el margen financiero de 1.0

**Fecha:** 23-oct-2026 · **Estado:** vigente (aprobado por Carlos el 23 y 24-oct; respuestas en `PREGUNTAS-carlos.md`) · Concreta y **modifica** ADR-021: los ámbitos de variable pasan a `tenant`, `cuenta` (antes "cliente"), `instalacion`, `cotizacion` y `linea` (antes "puesto": la línea de puesto); y el modelo se edita en la pantalla "Modelo de costeo" del módulo CPQ, no en Configuración → CPQ (punto 8). Requisito de Carlos: no copiar el CPQ de 1.0; mucho mejor visualmente; ítems y variables de costo definidos por cada tenant y vertical; se mantiene el cálculo del margen financiero.

**Decisión.**

1. **Modelo de costeo por tenant, versionado.** `cpq.modelos` guarda una definición publicada e inmutable por versión: **variables** (clave, nombre, tipo `entero` | `clp` | `uf` | `porcentaje` | `booleano` | `opcion`, unidad, valor por defecto, ámbito `tenant` | `cuenta` | `instalacion` | `cotizacion` | `linea`, si el cliente la ve), **categorías** de costo (mano de obra, equipamiento, insumos, logística, infraestructura, seguros, otros; editables) y **fórmulas** con nombre. Editar crea un borrador; publicar crea versión nueva y no mueve cotizaciones existentes.
2. **Ítems de costo del tenant.** `cpq.items` (código, nombre, categoría, unidad, moneda, precio, `por_defecto`, `visible_cliente`) con un **modo de cálculo** de un conjunto cerrado y probado: `mensual_fijo`, `por_persona_mes`, `por_puesto_mes`, `por_hora`, `por_rotacion` (precio × cambios por año / 12 × personas), `amortizable` (inversión / meses), `unico` (pago único, subtotal aparte) y `formula` (expresión del modelo). Los ítems "incluye" de 1.0 son ítems sin costo y visibles.
3. **Fórmulas acotadas y deterministas.** Lenguaje de expresiones en `packages/domain` (aritmética, `min`, `max`, `redondear`, `si`, referencias a variables y a campos de la línea; sin bucles, sin código, sin acceso a datos) evaluado con enteros escalados. Las fórmulas se validan al publicar (referencias, tipos, unidades, división por cero) y cada evaluación devuelve su traza para mostrar "de dónde sale" cada monto.
4. **Mano de obra desde el núcleo.** Una línea de puesto especifica cargo, patrón de turno, horario, jornada y dotación (o referencia un `core.puestos` existente en ampliaciones y renovaciones). El sueldo sale de las estructuras del núcleo (ADR-005); el costo empleador usa los parámetros legales de Chile (AFP, salud, SIS, AFC, mutual, provisiones de vacaciones 8,33 % e indemnización 4,166 %) como parámetros de plataforma, con tasa de mutual y supuestos ajustables por tenant. Las personas necesarias por puesto se calculan con el dominio de turnos existente. El ajuste por feriados es una fórmula del modelo base, no un ajuste suelto.
5. **Plantillas por vertical.** OPAI entrega modelos base `seguridad`, `aseo` y `facility` (variables, categorías, ítems y fórmulas de partida); al activar CPQ se **copian** al tenant según su vertical. Nada global se consulta al calcular. El modelo de seguridad reproduce las reglas de 1.0 (`extraccion/comercial-y-cpq.md` §3.8).
6. **Margen financiero: se porta el cálculo de 1.0 (preservación pendiente de validación)** (`extraccion/comercial-y-cpq.md` §3.9) como función pura de `packages/domain`: modos de margen (`margin_on_sale` por defecto, `markup` sobre costo, `margin_on_labor`), costo financiero, póliza de garantía (porcentaje o monto fijo en UF), responsabilidad civil, gross-up cerrado `S = (B + RC + Gfijo + únicos) / (1 − k)`, líneas con margen propio (fuera del modo de margen) y margen efectivo. **Guarda `k ≥ 0,35`:** como en 1.0, se usa el respaldo `S = (…) × (1 + k)`, el resultado lleva una advertencia visible de "precio subvalorado" y la cotización no puede pasar a `lista` ni enviarse sin aprobación (`cpq:aprobar`). Casos dorados de la guarda: CD-1 (rama cerrada, $10.279.605) y CD-2 (rama `k ≥ 0,35`, $13.500.000 con advertencia), obtenidos ejecutando el código de 1.0 (`extraccion/comercial-y-cpq.md` §3.9). Se porta con enteros escalados; los tests de 1.0 (`financial-policy`, `cost-lines`) son casos dorados (mismo resultado al peso), y los modos de margen y la rama `k ≥ 0,35`, que 1.0 no prueba, tienen casos dorados nuevos construidos desde `extraccion/comercial-y-cpq.md` §3.9 y validados contra cotizaciones reales de Gard antes de dar por preservado el cálculo (pendiente de validación). Las tasas por defecto son variables del modelo.
7. **Cotización.** Siempre con negocio (ADR-040 §4): la "cotización rápida" (`cpq.cotizaciones.crear_rapida`) crea el negocio por la capacidad de Comercial en la primera etapa y la cotización en la misma transacción. `cpq.cotizaciones` con código correlativo `CPQ-AAAA-NNN` y versión; estado único `borrador` → `en_aprobacion` (solo si el margen efectivo queda bajo el mínimo del tenant; aprueba un rol con `cpq:aprobar`) → `lista` → `enviada` → `aceptada` | `rechazada` | `vencida` | `reemplazada`. Cada línea guarda una copia del ítem usado (precio, modo de cálculo, fórmula, categoría), así cambiar el catálogo no mueve cotizaciones. Enviar congela la versión (modelo, valores, copia de ítems, UF del día y totales); cambiar algo después crea la versión siguiente. Marca `vigente` única por negocio (ADR-040); al cambiarla o enviarla, CPQ informa al negocio su valor mensual y fecha de envío por capacidad de Comercial. Líneas por instalación del negocio (o comunes), con visibilidad al cliente y habilitación sin borrar. Condiciones comerciales estructuradas (pago, reajuste IPC/IMO/polinómico, duración, inicio, póliza) con valores por defecto en los ajustes declarativos del módulo. La propuesta en PDF usa las plantillas del módulo Documentos y la marca del tenant.
8. **Configuración.** Margen por defecto, margen mínimo, validez, moneda y condiciones por defecto son ajustes declarativos (ADR-038). El modelo de costeo y el catálogo de ítems son datos del módulo, con su pantalla "Modelo de costeo" dentro de CPQ y permiso `cpq:modelo.manage` (owner y admin), como Cargos y sueldos lo es para estructuras.
9. **Experiencia (para el Design Prompt).** Cotizador como planilla viva desktop/iPad: a la izquierda instalaciones → puestos → ítems; a la derecha un resumen fijo (costo, venta mensual, únicos, margen efectivo con semáforo contra el mínimo, efecto de los instrumentos financieros). El cálculo corre en el navegador con el mismo paquete de dominio para respuesta instantánea; el servidor recalcula al guardar y es la autoridad. Traza de cada monto al pasar el cursor, comparación entre versiones, vista interna y vista cliente, simulación de margen con deslizador. En teléfono: ver, comparar y aprobar; la edición completa es de iPad y desktop.
10. **Agentes.** Todo es capacidad con `dryRun`: un agente puede simular una cotización completa (`cpq.cotizaciones.simular`) sin escribir, crear la versión, y enviar solo con aprobación humana.

**Consecuencias.** Agregar una vertical es datos, no código. Una cotización se reproduce igual años después. El brief de CPQ incluye el lenguaje de fórmulas y el motor financiero con sus casos dorados antes de cualquier pantalla. Licitaciones (fase 6) reutiliza el mismo motor.


**Decisiones de Carlos (23 y 24-oct).** (4) Validación del margen: Claude elige cinco cotizaciones reales y variadas de Gard enviadas en 2026 (con póliza de garantía, con varias instalaciones y con margen bajo) y Carlos las confirma antes de dar por preservado el cálculo. (5) Una cotización subvalorada (`k ≥ 0,35`) solo se envía con aprobación de un owner o admin con `cpq:aprobar`. (6) **Margen mínimo de Gard: 10 % sobre venta** (no el 15 % recomendado): bajo ese margen la cotización pasa a `en_aprobacion`; es el valor del ajuste declarativo del tenant Gard, no una constante. (7) Modo de margen por defecto: `margin_on_sale`. (8) El modelo de costeo y el catálogo de ítems se editan en la pantalla «Modelo de costeo» de CPQ, solo owner y admin. (9) Edición completa de cotizaciones solo en iPad y escritorio; en el celular se ven, comparan y aprueban. (10) La v1 sale solo con el modelo base `seguridad`; `aseo` y `facility` quedan en backlog hasta que haya un tenant real de esos rubros. (11) El correlativo `CPQ-AAAA-NNN` continúa desde el último número de 1.0 (la importación fija el siguiente número por tenant).

---

## ADR-043 · Flujo de trabajo con bots: construye Claude, revisa el Revisor, integra el bot «OPAI 2.0» (v3)

**Fecha:** 23-oct-2026 · **Estado:** vigente en su **v3 (24-oct-2026)**: la regla de integración vigente es «v3 · Merge automático por el bot «OPAI 2.0»», al final de este ADR, que reemplaza la integración por el Revisor de la v1 y la «Modificación de Carlos» (v2, solo Carlos integra) · **Modifica ADR-035**: Claude ya no integra a `main`; la revisión independiente pasa al bot «Revisor OPAI 2.0» y la integración, desde la v3, al bot «OPAI 2.0». Lo demás de ADR-035 (brief y ejecución en el mismo chat, rama por brief, commits por bloque, gate local, detenerse ante lo irreversible, infraestructura por el Mac de Carlos o el conector de Vercel) sigue vigente.

**Contexto.** Con ADR-035 el mismo chat que construye revisa (con un subagente del mismo modelo) e integra. Carlos quiere separar construcción, revisión y QA visual en actores distintos, y que la revisión la haga un modelo distinto del que construyó para no repetir sus puntos ciegos.

**Decisión.** Cinco actores con responsabilidades que no se cruzan:

| Actor | Hace | Nunca hace |
|---|---|---|
| **Bot «OPAI 2.0»** (orquestador) | Lee `ESTADO.md` y `ROADMAP.md`, prepara el prompt de cada encargo, abre y opera los chats (construcción, revisión, diseño y QA), sigue el avance y le reporta a Carlos | Escribir código, aprobar PRs, integrar |
| **Claude** (constructor, proyecto «OPAI 2.0») | Escribe el brief, lo implementa en rama `brief/NN-<nombre>` (o `docs/<tema>` para PRs de documentación), commits por bloque con el gate local en verde, autorrevisión con subagente antes de abrir el PR, abre el PR con el reporte y actualiza `ESTADO.md` en la rama | **Integrar a `main`**, aprobar su propio PR, aplicar migraciones sin instrucción |
| **Bot «Revisor OPAI 2.0»** | Revisa el diff completo contra el brief, sus criterios de aceptación, `CLAUDE.md` y los ADR, **con el modelo contrario al que construyó** (si construyó Claude, revisa otro proveedor o modelo, y viceversa). Pide cambios en el PR o aprueba. Si aprueba y el CI está en verde (`typecheck`, `lint`, `test`, `test:db`, presupuesto), integra con rebase (borrar la rama después: *propuesto*, por confirmar con Carlos). Su única escritura en el repositorio es ese merge, más sus comentarios de revisión | Integrar en rojo; integrar un PR con migración de Neon pendiente; empujar código; abrir PRs propios; cambiar infraestructura o configuración del despliegue; pedir, mostrar o guardar claves |
| **Bot «Diseño y QA OPAI 2.0»** | Después de cada PR integrado que toque pantallas, prueba en `test.opai.cl` a 375 px (celular), 1024 px y 1280 px, claro y oscuro: flujos del brief, estados (cargando, vacío, error, sin permisos), contra el export aprobado de Claude Design y `NAVEGACION.md`. Abre un issue con capturas o le reporta los hallazgos al bot «OPAI 2.0»; los arreglos los hace Claude en un PR | Escribir código o abrir PRs; cambiar el diseño aprobado sin pasar por Carlos |
| **Carlos** | Decide el negocio, aprueba los diseños en Claude Design y aprueba lo irreversible (migraciones en Neon `main`, borrados, gasto, producción); aplica las migraciones desde su Mac | — |

Reglas:

1. **PR con migración de Neon pendiente** *(en la v3 rige la etiqueta `migracion-pendiente`, punto 5 de la v3)*: el Revisor lo deja **aprobado sin integrar** (y, *propuesto por confirmar con Carlos*, lo etiqueta `migracion-pendiente`); Carlos aplica la migración en `dev` y luego en `main` desde su Mac y avisa; recién entonces el Revisor integra (con el CI todavía en verde contra `main` actualizado). Así `main` nunca tiene código que espera una tabla que no existe.
2. **Correcciones pedidas por el Revisor** las hace Claude en la misma rama (commits nuevos, sin reescribir lo revisado) y vuelve a pedir revisión.
3. **PRs solo de documentación** siguen el mismo camino (nunca push directo a `main`).
4. **Bloqueos** (*propuesto, por confirmar con Carlos*): si Revisor y constructor no convergen en dos rondas, decide Carlos.
5. Los agentes operativos de Gard (Grokbot y los demás) y los bots del flujo siguen sin escribir en el repositorio (ADR-035). El merge del bot Revisor (un bot de Grok), bajo las condiciones de la regla 1, es la **única escritura de un bot de Grok en el repositorio**; además solo deja comentarios de revisión.

**Consecuencias.** La autorrevisión con subagente queda como control previo del constructor, no como requisito de integración. `INSTRUCCIONES-proyecto-claude.md`, `CLAUDE.md` y `CONTEXTO-agentes.md` cambian su sección de flujo; Carlos debe pegar las instrucciones nuevas en el proyecto de claude.ai. El cierre de un brief deja de ser «integrado» y pasa a «PR abierto»; `ESTADO.md` lo refleja hasta que el Revisor integra.

**Modificación de Carlos (24-oct).** Durante los primeros módulos **el merge a `main` lo hace solo Carlos**, después de revisar el PR. El bot «Revisor OPAI 2.0» revisa con el modelo contrario y **aprueba o pide cambios, pero no integra**. Cuando Carlos lo decida, el Revisor recupera la integración por rebase con CI en verde, según la regla 1. También se suma un **bot de Paridad**, que compara 1.0 y 2.0 en solo lectura y reporta brechas. El contrato vigente de roles, ramas, prohibiciones y definición de terminado está en `AGENTS.md` (raíz), y los checklists de cada rol están en `docs/2.0/checklists/`. CI agrega el escaneo de secretos (job `secretos`), que forma parte de la definición de terminado. Los checks obligatorios de la protección de `main` serán `typecheck · lint · test · test:db`, `build · presupuesto de JS` y `secretos`; la protección la configura Carlos en GitHub. Mientras rija esta modificación, las partes de la tabla, de la regla 1 y de la regla 5 que dan la integración al Revisor quedan **suspendidas**. *(v2, reemplazada por la v3 en lo que toca a quién integra; lo demás sigue vigente: bot de Paridad, `AGENTS.md`, checklists y job `secretos`.)*

**v3 · Merge automático por el bot «OPAI 2.0» (24-oct-2026).** Decisión de Carlos, 24-oct-2026 16:59 CLT, aprobada de nuevo a las 17:13; precisiones de la revisión del PR #28 aplicadas por instrucción de Carlos (17:27) y decisión de Carlos sobre excepciones (17:31). **Reemplaza** la regla de la v2 de que «solo Carlos hace merge», la integración por el Revisor de la v1 (tabla, regla 1 y regla 5) y, en la tabla de la v1, la celda «Nunca hace: … integrar» del bot «OPAI 2.0».

1. **Quién integra.** El bot «OPAI 2.0» integra a `main` un PR de `opai-2` **con squash** cuando se cumplen las tres condiciones:
   - (a) el «Revisor OPAI 2.0» escribió **APROBAR** sin condiciones citando el **SHA completo del head actual**;
   - (b) los checks obligatorios del ruleset «Proteger main» están en verde **para ese mismo SHA**: `typecheck · lint · test · test:db`, `build · presupuesto de JS` y `secretos`;
   - (c) **si el PR toca pantallas**, no hay un BLOQUEANTE abierto de «Diseño y QA OPAI 2.0» (punto 4).
2. **Verificación justo antes del squash.** El bot comprueba que el SHA aprobado sea el head del PR, que los checks obligatorios estén en verde sobre ese mismo SHA y que la rama **no esté «behind»** `main`, e integra pasando ese SHA como esperado (`sha` del merge), para que un push de último momento haga fallar el merge en vez de integrar código no revisado. **Cualquier push a la rama, incluido traer `main` con merge, invalida la aprobación** y exige una re-revisión.
3. **Ningún otro bot hace merge.** Claude, el Revisor, Diseño y QA y Paridad no integran. Sin force-push ni rebase: la rama trae `main` con un merge, y la integración a `main` es squash.
4. **QA después del merge y BLOQUEANTE verificable.** «Diseño y QA OPAI 2.0» revisa en `test.opai.cl` después de cada merge con pantallas. Un hallazgo BLOQUEANTE se registra en el PR integrado donde se encontró con la etiqueta **`qa-bloqueante`** y un comentario que empieza con «QA: BLOQUEANTE» con el detalle. La etiqueta se quita cuando la corrección está integrada y verificada. Antes de integrar un PR que toca pantallas, el bot busca en `opai-2` issues y PRs con la etiqueta `qa-bloqueante`: si hay alguno, no integra. Los PRs sin pantallas no se frenan.
5. **Veto y migración pendiente.** Antes de integrar, el bot verifica la regla siguiente, que es la misma de `AGENTS.md` y de la plantilla del PR:

   **Veto y migración pendiente (autoría humana; ADR-043 v3).**
   1. Carlos veta un PR con un comentario cuya primera línea es exactamente `VETO`, o con la etiqueta `veto`. Cada forma se levanta por su lado: la etiqueta, quitándola; el comentario, con un comentario posterior cuya primera línea es exactamente `VETO LEVANTADO`. Si hay ambos, hay que levantar los dos.
   2. Un PR con migraciones nuevas en `packages/db/prisma/migrations/` lleva la etiqueta `migracion-pendiente`, que pone quien abre el PR. Solo Carlos la quita, después de aplicar la migración en Neon `dev` y `main`.
   3. Lo que bloquea (la etiqueta `veto`, un comentario `VETO` o la etiqueta `migracion-pendiente`) cuenta siempre, venga de donde venga, incluida la app «claude». Para levantar (quitar `veto`, comentar `VETO LEVANTADO` o quitar `migracion-pendiente`) solo cuentan los eventos sin `performed_via_github_app` (excluye lo hecho por apps como «claude»; lo hecho con `gh` o un PAT de `Cryptobal` no se distingue, por eso lo prohíbe la regla 4). La cuenta `Cryptobal` la usan Carlos y los bots, así que la cuenta sola no basta. Un evento que no cumple la regla no levanta un veto ni retira una migración pendiente.
   4. Ningún bot ni agente escribe comentarios `VETO` o `VETO LEVANTADO` ni pone o quita las etiquetas `veto` y `migracion-pendiente`, y ningún agente usa `gh`, un PAT ni la API con la cuenta `Cryptobal` para esos comentarios o etiquetas. Única excepción: quien abre un PR con migración pone `migracion-pendiente`.
   5. Antes de integrar, el bot «OPAI 2.0» revisa con esta regla los comentarios del PR y el historial de sus etiquetas. No integra si hay un veto vigente, si `migracion-pendiente` está puesta, si el PR trae migraciones nuevas y la etiqueta no está sin que su última retirada sea un evento válido (incluido el caso en que nunca se puso), o si no puede verificarlo.

6. **Qué aprueba Carlos.** El brief o el encargo **antes de que se abra el PR** (no cada PR antes del merge), las decisiones de negocio y lo irreversible (migraciones en Neon `main`, borrados, gasto, producción). Un PR con migración de Neon pendiente no se integra hasta que Carlos la aplica; la señal es la etiqueta `migracion-pendiente` del punto 5, que reemplaza en la regla 1 el «aprobado sin integrar» y la etiqueta «propuesta». El bot «OPAI 2.0» le avisa a Carlos **después de cada merge**.
7. **Sin excepciones** (decisión de Carlos, 24-oct-2026 17:31 CLT: «Nada: integra todo con las tres condiciones, sin excepciones»). Todo PR se integra con las mismas tres condiciones y la verificación del punto 2, también los que cambian esta misma regla (`AGENTS.md`, este ADR, la plantilla del PR o el ruleset; **incluido el PR #28**), los que suben topes de JS (manda el check obligatorio de presupuesto y la justificación queda en el PR), los de seguridad, autenticación o RLS, las migraciones, el CI, los workflows, el ruleset, la infraestructura y el despliegue. No hace falta que Carlos integre ni dé un OK adicional. Solo se mantienen el veto de Carlos (punto 5) y la regla de que un PR con migración de Neon pendiente no se integra hasta que Carlos la aplica (punto 6).
8. **E2E fuera del gate por ahora.** El e2e de Playwright **no** es check obligatorio (decisión de Carlos, 24-oct-2026 15:55).
9. La regla 5 de la v1 queda así: el merge del bot «OPAI 2.0», bajo estas condiciones, es la **única escritura de un bot de Grok en el repositorio**; el Revisor deja comentarios de revisión y su veredicto; no pone ni quita las etiquetas `veto` ni `migracion-pendiente` (si en un PR con migración `migracion-pendiente` no está y su última retirada no fue un evento válido, pide cambios).

**Segunda modificación de Carlos (24-oct): tareas en Linear.** El estado de las tareas pasa a Linear (equipo OPAI, IDs `OPAI-n`, plan Free durante el piloto); GitHub sigue siendo la fuente de verdad del código y los archivos del repositorio, de las reglas técnicas. `ESTADO.md` queda como foto técnica (versiones, infraestructura, riesgos aceptados y decisiones). Quedan sin efecto las menciones a actualizar `ESTADO.md` al cerrar un brief o un PR (en este ADR y en ADR-012 y ADR-047): ahora el PR se vincula a su tarea de Linear. Los hallazgos de QA se registran como tareas en Linear (Triage), no como issues. Las reglas del flujo están en `AGENTS.md`, «Tareas (Linear)».

---

## ADR-044 · PWA desde el principio y empaquetado nativo posterior

**Fecha:** 23-oct-2026 · **Estado:** vigente (aprobado por Carlos el 24-oct; respuestas en `PREGUNTAS-carlos.md`) · Concreta ADR-007 y ADR-029 (puntos 9, 10 y 14).

**Contexto.** Toda la app será instalable y se publicará en App Store y Google Play **una sola app «OPAI»** que abre a cada persona su portal (ERP, Supervisor, Trabajador —portal de la persona—, Terreno o Cliente) según su membresía; lo crítico son los portales de terreno. Estado verificado en `main` (`fe362cc`): no hay manifest, service worker, íconos ni carpeta `public/`; solo `viewport-fit=cover` y `applicationName`. Existe un proyecto aparte de apps nativas de OPAI 1.0: no se mezcla con 2.0; se reutiliza su aprendizaje (cuentas de desarrollador, D-U-N-S, certificados de push, motivos de rechazo en revisión), no su código.

**Decisión.**

1. **Una app web instalable** con `app/manifest.ts` (nombre «OPAI», `short_name`, `start_url` único, `display: standalone`, `theme_color`/`background_color` desde tokens, íconos 192 y 512 normales y `maskable`, `apple-touch-icon`, pantalla de inicio con la marca), `apple-mobile-web-app-capable` y safe-area. **Un solo manifest de OPAI:** el `start_url` lleva a una ruta de entrada que abre el portal de la persona según su membresía (el último usado, o un selector si tiene varios); no hay un manifest ni una instalación por portal. Íconos y colores de marca del tenant en los portales cuando el tenant los tenga (ADR-028); OPAI por defecto.
2. **Service worker** con Serwist (está en el stack del arranque; su compatibilidad con Turbopack en Next 16 se verifica en el brief y, si no la hay, se escribe un SW mínimo propio sin dependencias): precache del shell de cada portal de terreno, estrategia *network-first* para RSC y datos, *cache-first* para estáticos con hash, página sin conexión. **Actualización controlada:** el SW nuevo queda en espera y la app muestra «Hay una versión nueva · Actualizar»; nunca se activa a mitad de una marca o una ronda; versiones con migraciones de la cola local fuerzan la actualización al terminar la sincronización.
3. **Sin conexión, donde corresponde.** Solo en terreno y solo para hechos que se capturan en el lugar: **marcación** (Asistencia), **rondas** (puntos, fotos, GPS) y **novedades** (texto, fotos). Cada hecho se guarda en una cola local en IndexedDB con su `idempotencyKey`, hora del dispositivo, GPS y evidencia; se sincroniza al recuperar la red (evento `online`, al abrir la app y, en Android, Background Sync), por las mismas capacidades que usa la UI con conexión. El servidor sella la hora de recepción; los conflictos se resuelven por ese sello (ADR-029.9). La marca diferida queda identificada como tal (`origen_marca = offline_queue`, con hora del dispositivo y sello del servidor al recibirla); no es la «contingencia» de `extraccion/dt-normativa.md`, que es la carga manual con motivo cuando el sistema no estuvo disponible. Carlos la aprobó el 24-oct: queda informada a la DT y visible para el trabajador y su supervisor. Lo demás (ERP, configuración, cotizador, finanzas) requiere conexión y lo dice con un estado claro.
4. **Push.** Canal `push` del servicio de Comunicaciones (ADR-020), silencio por defecto, medido en `core.consumos`. Web Push con VAPID en Android y escritorio; en iOS solo funciona con la app instalada en la pantalla de inicio (iOS 16.4 o superior), por eso el portal pide instalar antes de pedir permiso. En el empaquetado nativo, APNs y FCM por el mismo adaptador. Suscripciones por dispositivo en el núcleo, revocables desde Dispositivos (ADR-029.10). El permiso se pide en contexto (al activar un aviso), nunca al abrir.
5. **Cámara y GPS.** Fotos con captura nativa del navegador (`input capture` o `getUserMedia`), comprimidas en el dispositivo antes de subir por `core.documentos` (ADR-039). La verificación facial de Asistencia usa el adaptador de biometría del núcleo con prueba de vida del proveedor. GPS con la API de geolocalización: precisión y hora quedan como evidencia, nunca bloquean (ADR-023). El seguimiento en segundo plano de rondas solo existe en la app nativa (la web no lo permite).
6. **Presupuesto por ruta de terreno.** Primera carga ≤ **150 KB** de JS gzip por ruta de terreno (framework 132 + ≤ 18 KB propios; el cotizador y el ERP mantienen los topes de ADR-037), CSS crítico en línea, fuentes autoalojadas con `font-display: swap`, sin mapas ni gráficos en el JS inicial. Con el SW, la segunda carga no descarga JS. Los topes van en `apps/web/presupuesto-js.json`.
7. **Prueba en CI.** Lighthouse quitó la categoría PWA en su versión 12, así que el gate equivalente es: (a) Playwright verifica que el manifest es válido (campos, íconos que existen, `start_url` dentro del alcance), que el SW se registra y controla la página, y que el shell del portal de terreno carga con `context.setOffline(true)` y una marca o novedad queda en la cola y se sincroniza al volver la red; (b) Lighthouse CI (`@lhci/cli`) en emulación móvil sobre las rutas de terreno con rendimiento y accesibilidad ≥ 90 (ADR-029.14); (c) el presupuesto de JS de ADR-037.
8. **Empaquetado para tiendas: Capacitor** para iOS y Android (recomendado), en la fase 3, con el mismo código web y plugins nativos solo donde la web no alcanza: geolocalización en segundo plano (rondas), push (APNs/FCM), biometría del dispositivo, almacenamiento seguro y cámara. Alternativas evaluadas:

| Opción | A favor | En contra |
|---|---|---|
| **Capacitor** (recomendado) | Un proyecto para iOS y Android; plugins nativos para lo que la web no hace (GPS en segundo plano, push nativo, biometría); el código web es el mismo de la PWA; Apple acepta mejor una app con capacidades nativas reales (la guía 4.2 rechaza envoltorios sin valor propio) | Dos proyectos nativos que mantener (Xcode y Gradle); actualizaciones del contenedor pasan por revisión de tiendas |
| **TWA** (Trusted Web Activity) | Android con cero código nativo; la app es la PWA en Chrome; actualizaciones instantáneas | Solo Android; sin GPS en segundo plano ni plugins nativos; requiere Digital Asset Links |
| **PWABuilder** | Genera paquetes rápido para ambas tiendas | Sin plugins nativos; en iOS es un WebView simple con alto riesgo de rechazo por la guía 4.2 |

**Consecuencias.** Un brief de base PWA (manifest, íconos, SW con página sin conexión, actualización controlada, prueba en CI) entra antes de Comercial y no espera a la fase 3; la cola local y la sincronización nacen con el primer módulo de terreno (Rondas o Asistencia) con su escenario de prueba sin red. Las capacidades que se usan sin conexión deben aceptar `idempotencyKey` y la hora del dispositivo como dato, no como verdad.


**Decisiones de Carlos (24-oct).** (12) Empaquetado para tiendas con **Capacitor**. (13) **Una sola app «OPAI»** en App Store y Google Play para todos: personal de la empresa (ERP y Supervisor), trabajadores, dispositivos de terreno emparejados con código y clientes; al ingresar, la app abre a cada persona su portal según su membresía (con selector si tiene varios). La marca del tenant dentro de la app sigue ADR-028; apps con marca propia por tenant quedan en backlog. (14) **Se puede marcar sin señal** como marca diferida (`origen_marca = offline_queue`): queda identificada como tal en los reportes a la DT y es visible para el trabajador (en su comprobante) y para su supervisor; no es la carga manual de contingencia.

---

## ADR-045 · Velocidad de navegación medida y con gate

**Fecha:** 23-oct-2026 · **Estado:** vigente (prioridad fijada por Carlos el 23-oct; contadores y caché de sesión decididos el 24-oct) · Completa ADR-037 y ADR-029 (punto 14).

**Contexto.** Carlos nota que al cambiar de módulo la página se queda cargando. Medición del 23-oct en `test.opai.cl` (Chrome de escritorio, red fija, sesión real, tenant Gard sin datos de maestros), navegación cliente por la barra lateral, 8 cambios de módulo: **skeleton visible a los 13–21 ms** (el `Suspense` de `PaginaPortal` funciona y el prefetch parcial está activo); **contenido con datos a los 337–1.350 ms** (Cuentas 1.059 y 1.350 ms; Inicio 901 ms; Instalaciones 337; Personas 423–467; Cargos 526; Configuración 367); respuesta RSC de 4–5 KB con primer byte a 85–116 ms, es decir, el servidor tarda 0,2–1,2 s en terminar de transmitir **sin datos que leer**. Carga completa de `/`: TTFB 59 ms, `DOMContentLoaded` 1,08 s. JS por ruta: dentro de los topes de ADR-037 (CI). Funciones en `gru1` y Neon en `aws-sa-east-1` (ambos São Paulo) con conexión pooled: la región no es la causa. En teléfono con 4G el tiempo con datos será mayor y crecerá con el volumen.

**Diagnóstico (verificado en el código de `main`).**

1. **Cadena serial por navegación:** `getSession` de Better Auth (consulta a la base, sin caché de cookie) → membresías → módulos activos → en paralelo los contadores de la barra lateral (`core.resumen.contadores`) y los datos de la página. Nada de esto se cachea entre navegaciones.
2. **Cuatro idas y vueltas por consulta:** `forTenant` envuelve cada operación de Prisma en una transacción por lotes (`BEGIN`, `set_config`, consulta, `COMMIT`). Una capacidad con cinco consultas son unas veinte idas y vueltas.
3. **El shell vive dentro de la página**, no en el layout: cada navegación vuelve a resolver identidad, navegación y contadores para pintar una barra lateral que no cambió.
4. **Contadores en la barra lateral** en cada navegación (varios `count` con RLS).
5. **Errores de conexión a Neon en producción:** los logs de Vercel muestran `P2039` («Authentication timed out») y `P1017` frecuentes en las consultas de sesión de Better Auth (observado en la rama de paridad MCP, 23-oct): reconexiones lentas o fallidas que se suman a la latencia. Hay que revisar el pooling, el tamaño del pool del adaptador `pg` por instancia y el cold start del cómputo de Neon.
6. Sin instrumentación: no hay `Server-Timing` ni conteo de consultas por request; el cold start de Vercel y la suspensión del cómputo de Neon (*scale to zero*) **no se midieron** y quedan por verificar en el brief.

No se encontró: render estático roto, falta de prefetch, layouts que recarguen el documento ni región cruzada.

**Decisión.**

1. **Estándar (Carlos, 23-oct, prioridad):** la navegación entre módulos se siente **instantánea**, al nivel de las mejores apps SaaS: el shell y la barra lateral **persisten** sin parpadeo ni barra de progreso; el skeleton del contenido aparece de inmediato; las rutas del menú se **precargan** (prefetch al estar visibles y al pasar el cursor, con datos cuando el costo lo permite); volver a un módulo ya visitado muestra **datos en caché** al instante y los revalida en segundo plano; las escrituras invalidan lo que cambian. Cada cambio de rendimiento se **mide antes y después** con el mismo protocolo (navegación Cuentas → Instalaciones → Personas → Cargos y sueldos → Configuración → Inicio, en escritorio y en celular con 4G simulado) y el resultado queda en el PR.
2. **Metas (p75):** respuesta visible (skeleton con la forma del contenido, shell intacto) **< 100 ms** (tope duro 200 ms); contenido con datos **< 1 s** en 4G y **< 500 ms** en escritorio; módulo ya visitado **< 100 ms** con datos de caché; TTFB del documento < 300 ms; **≤ 8 consultas a Neon por navegación** de lista o ficha; presupuesto de JS de ADR-037 y ADR-044.
3. **Arreglos (brief de rendimiento, el primero de la lista, antes de Comercial):** `Server-Timing` y contador de consultas por request; shell en el layout de cada portal con su propio `Suspense` y la página solo con su contenido; identidad, membresías y módulos activos cacheados por sesión (caché de cookie de Better Auth de corta duración e invalidación al suspender una membresía o un tenant) y por tenant con etiquetas (`use cache` + `revalidateTag` en las escrituras que los cambian); `forTenant` con una transacción interactiva por capacidad (fija `app.tenant_id` una vez) en vez de una por consulta, sin debilitar la RLS; contadores en una sola consulta y cargados después de pintar (o retirados de la barra lateral, a decidir); verificar cold starts (Fluid compute) y la suspensión de Neon en `main`; prefetch explícito de las entradas del menú y caché del router para segmentos dinámicos ya visitados (revalidación en segundo plano, invalidación por las Server Actions que escriben).
4. **Gate en CI:** (a) Playwright contra `next start` con Postgres de CI recorre la navegación entre módulos y falla si el skeleton tarda más de 200 ms o el servidor (por `Server-Timing`) más de 500 ms, o si una navegación supera las 8 consultas; (b) Lighthouse CI móvil ≥ 90 en Inicio, una lista y una ficha; (c) presupuesto de JS existente. Además, una medición sintética programada contra `test.opai.cl` después de cada despliegue (informativa, no bloquea) que el bot de Diseño y QA revisa.

**Consecuencias.** Toda pantalla nueva declara en su brief sus consultas por navegación. Ningún arreglo de rendimiento se mezcla con PRs de documentación ni de funcionalidades.


**Decisiones de Carlos (24-oct).** (15) Se **quitan los contadores de la barra lateral**; los conteos quedan en Inicio y en las listas. (16) La sesión se valida contra la base como máximo cada **5 minutos** (caché de sesión), con invalidación inmediata al suspender una membresía o un tenant o al cambiar un rol.

---

## ADR-046 · Arquitectura de navegación por áreas

**Fecha:** 23-oct-2026 · **Estado:** vigente (aprobado por Carlos el 24-oct; respuestas en `PREGUNTAS-carlos.md`) · Completa ADR-003, ADR-007 y ADR-018. Mapa completo en `docs/2.0/NAVEGACION.md`.

**Decisión.** La barra lateral del ERP se organiza en **áreas** fijas (Comercial, Clientes, Operaciones, Personas, Finanzas, Documentos) más Inicio arriba y Configuración al pie; cada área agrupa entradas que aportan los módulos activos del tenant y que el rol puede leer, con un máximo de siete entradas por área. Lo que es parte de una entidad va como pestaña de su ficha (ADR-041), nunca en el menú. La forma principal de saltar es el buscador ⌘K (entidades, páginas y acciones) con recientes; los fijados del usuario van arriba de la barra. En el celular, barra inferior de cuatro entradas más «Más», según el área principal del rol. Los módulos declaran su entrada con `area` y `orden` en el manifest; un módulo apagado no deja rastro. Término único en el menú: «Personas» (el vocabulario de la vertical se usa en textos operativos, no en el nombre del área). Todo brief con pantallas respeta `NAVEGACION.md` y el bot de Diseño y QA lo verifica.

**Consecuencias.** `ItemNav` y el manifest ganan `area`; la barra lateral pasa a grupos plegables; el rediseño visual pasa por Claude Design (Design Prompt de navegación) antes del brief que lo implementa.


**Decisiones de Carlos (24-oct).** (17) **«Personas»** es el único término del área y la entrada (el vocabulario de la vertical queda para textos operativos). (18) Áreas aprobadas: Inicio, Comercial, Clientes, Operaciones, Personas, Finanzas y Documentos, con Configuración al pie. (19) La barra inferior del celular se adapta al área principal del usuario, con Inicio y Buscar fijos. `NAVEGACION.md` pasa a ser obligatorio para todo brief con pantallas.

---

## ADR-047 · Especificación funcional aprobada antes de diseñar o construir un módulo

**Fecha:** 23-oct-2026 · **Estado:** vigente (pedido de Carlos, 23-oct) · Completa ADR-012 y ADR-043.

**Decisión.** Antes del Design Prompt de cualquier módulo se escribe `docs/2.0/modulos/<modulo>.md` en lenguaje de negocio, con la plantilla `docs/2.0/modulos/_plantilla.md` (objetivo; entidades y relaciones; pantallas y pestañas; campos y validaciones; reglas numeradas; estados y transiciones; permisos por rol y portal; eventos y notificaciones; herramientas MCP; integraciones; mejoras sobre 1.0 y lo que no se porta; casos borde; criterios de aceptación; preguntas abiertas). Carlos la aprueba antes de cualquier diseño o código. La extracción de 1.0 (`extraccion/`) y los ADR son sus insumos; la especificación es lo que el diseño y el brief citan.

**Ciclo de cada módulo:** extracción de 1.0 (si existe en 1.0) → **especificación** → aprobación de Carlos → Design Prompt → diseño aprobado → brief → PR (Claude) → revisión (Revisor) → integración con squash por el bot «OPAI 2.0» cuando se cumplen las condiciones de ADR-043 v3 (Carlos puede vetar) → QA en pantallas (Diseño y QA) *(ciclo actualizado por ADR-043 v3, 24-oct)*. Al cerrar cada brief, el reporte termina con un **resumen ejecutivo para Carlos** (cinco líneas como máximo: qué se hizo, qué cambia para Gard, qué decide él, qué sigue) que también queda en `ESTADO.md`.

**Consecuencias.** Comercial y CPQ ya tienen extracción y ADR-040/042: su especificación se escribe a partir de ellos antes del Design Prompt. El formato del brief agrega la sección 17 «Resumen ejecutivo».
