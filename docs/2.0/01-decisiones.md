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
