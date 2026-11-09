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

**Nota de implementación NÚCLEO-G2 (encargo t457u y adenda de apilado).**
`20261028170000_force_rls` fuerza RLS en todas las tablas existentes con
`tenant_isolation`, incluidos módulos. Las tablas futuras con `tenant_id` deben
tener ENABLE + FORCE + esa política; `test:db` exige una base real. Se retira
`globales()` público: identidad y tenant por funciones con selección fija;
Plataforma recibe operaciones con nombre, no delegados Prisma. Los scripts
cross-tenant requieren un rol de mantenimiento BYPASSRLS explícito (o el
superusuario local de pruebas), nunca `opai_app`; ser dueño sin BYPASSRLS no basta. No se
concede BYPASSRLS ni se modifica Neon. Los tres triggers de referencias/patrones
leen con los permisos del invocador y el tenant de su transacción, sin depender
del bypass del dueño. Son adaptaciones técnicas de OpenCode / openai/gpt-6.1-sol
para este encargo, no decisiones nuevas de Carlos. Runbook y criterios en
`briefs/NUCLEO-G2-force-rls.md`.

**Precisión de la revisión 5672596436.** En Neon, neondb_owner, dueño real de las tablas y rol de prisma migrate deploy,
tiene BYPASSRLS (proyectos creados desde ago-2023), por lo que FORCE no le afecta.
FORCE queda como defensa en profundidad para dueños sin BYPASSRLS, por ejemplo
local/CI o un dueño distinto. La garantía real es que la aplicación corre como
opai_app, sin BYPASSRLS, con tenant_isolation.

Resultado de la consulta de roles (solo lectura, OPAI 2.0, 27-oct-2026 15:53 CLT,
mismo resultado en ambas ramas de Neon; current_user de la conexión
= neondb_owner), proporcionado en el encargo; no se consultó Neon en esta revisión:

```sql
SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname IN ('neondb_owner','opai_app') OR rolname = current_user;
```

```text
neondb_owner | rolbypassrls = true  | rolsuper = false
opai_app     | rolbypassrls = false | rolsuper = false
```

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

**Fecha:** 22-oct-2026 · **Estado:** reemplazado en sus niveles y su resolución por la actualización de ADR-036 (25-oct-2026: capas instalación, puesto y RUT, sin combinarse)

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

**Nota (NÚCLEO-F · segundo factor, 26-oct-2026).** Se agrega el plugin `twoFactor` de Better Auth: TOTP con códigos de respaldo (la verificación por correo/OTP queda pendiente de diseño, ver más abajo). El secreto y los códigos de respaldo los cifra el plugin con `BETTER_AUTH_SECRET` (`symmetricEncrypt`): no hay secreto nuevo. Nuevas columnas/tablas de identidad en `core` (`users.two_factor_enabled`, `two_factor`), sin `tenant_id` ni RLS como el resto de identidad, y que solo toca `@opai/auth` (no se leen desde capacidades de negocio). El bloqueo del paso de verificar el código es por cuenta (`accountLockout`: 5 intentos, pausa de 15 min), alineado con el bloqueo de login de B1 y con su mismo aviso genérico; no reemplaza ni rompe los hooks de B1 (el conteo de contraseña y el de código van por separado). **Política (Decisión de Carlos, 26-oct-2026, chat con OPAI 2.0):** el segundo factor es obligatorio para las cuentas de plataforma (siempre) y para el `owner` y el `admin` de cada tenant; los demás roles lo activan de forma opcional o por el ajuste de tenant `core.seguridad_mfa_obligatorio_admins`. Si es obligatorio y la cuenta no lo tiene, tras la contraseña va a enrolarse antes de entrar (gate server-side en `PaginaPortal`). Las API keys y el MCP no cambian. SSO queda como P2, fuera de este PR.

**Nota (revisión del PR #65, 26-oct-2026). MFA obligatorio no desactivable para plataforma/owner/admin; decidido por el operador OPAI 2.0 con delegación de Carlos (t500u), 26-oct-2026.** El ajuste `core.seguridad_mfa_obligatorio_admins` ya no puede rebajar la exigencia de plataforma, `owner` ni `admin`: `mfaEsObligatoria` (`@opai/domain`) la fija siempre en `true` para esos tres casos, sin leer el ajuste; el ajuste solo **agrega** exigencia a los demás roles del tenant (renombrado en pantalla a «Exigir segundo factor también a los demás roles», por defecto `false`). Además, la sesión y no solo la cuenta debe acreditar el segundo factor: el login social (Google) nace con `sessions.mfa_verified = false` (migración `20261028070000_mfa_sesion`, columna de identidad sin `tenant_id` ni RLS, como el resto de `sessions`) y el plugin `opai-mfa-sesion` la marca solo tras un `verify-totp`/`verify-backup-code` exitoso de esa misma sesión; el gate de `PaginaPortal`, `resolverActor` (API con cookie) y `ejecutarComoUsuario` (Server Actions) usan ese único punto (`verificarMfaDe`/`estadoMfaDe` de `apps/web/lib/mfa.ts`), y `core.apikeys.create` rechaza si `ctx.mfa` falta o está pendiente, para que un owner/admin/plataforma sin segundo factor no pueda crear una API key y seguir sin él para siempre.

**Nota (NÚCLEO-B, 26-oct-2026; Decisión de Carlos, 26-oct-2026 20:47 CLT, chat con OPAI 2.0 (t457u): «lo que debamos hacer en el núcleo lo hagamos altiro»).** El rate limit de las rutas y acciones públicas se centralizó en Postgres (realiza en parte ADR-029 §15 «Seguridad operativa»): `core.rate_limit_consumir` (`SECURITY DEFINER`, upsert atómico) cuenta por ventana con la misma cuenta para todas las instancias de Vercel; antes era un Map en memoria por instancia, así que el tope no era real. La clave se guarda hasheada (SHA-256, sin la API key ni la IP en claro). Si la base falla, falla abierto con el límite en memoria como respaldo. El bloqueo de login real sigue persistido por cuenta (B1). La API key del MCP va siempre en `Authorization: Bearer`; la forma con la key en la URL (`/api/mcp/k/<key>`) quedó deprecada (410 Gone salvo `MCP_KEY_EN_URL_HASTA` futura), porque dejaba la key en historiales y logs. Sin secretos nuevos (no Upstash/Redis/KV). Topes iniciales fijados por Claude, a confirmar por Carlos.

---

## ADR-016 · Roles por tenant y bloqueo financiero

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Decisión.** Cinco roles por tenant: `owner` (todo, incluido borrar el tenant y gestionar owners), `admin` (todo salvo lo anterior), `gerente` (lectura y escritura en todos los módulos operativos y comerciales; sin `finanzas:*`, `nomina:*` ni gestión de usuarios y API keys), `supervisor` (operaciones, rondas, asistencia y personas en lectura; sin comercial ni finanzas), `viewer` (solo lectura, sin finanzas ni nómina). Permisos con formato `<modulo>:<accion>` y comodines por rol en `@opai/domain`. Rol de plataforma aparte (`users.platform_role`: `owner` | `support`), que otorga `platform:*` y no implica permisos dentro de ningún tenant. El acceso a portales es explícito por membresía (`memberships.portales`).

**Consecuencias.** Hereda el principio de 1.0 (`applyFinancialRoleLock`): los datos financieros solo los ven owner y admin. Los permisos por usuario (excepciones) quedan para cuando un tenant los pida.

**Nota de implementación NÚCLEO-D1 (encargo t457u).** Los ejecutores web comprueban
acceso al portal antes de buscar la capacidad, sin revelar si existe. Los roles de
membresía, incluidos los personalizados por su base, no conceden Plataforma ni el
portal del principal cuenta (Cliente). La preferencia `memberships.portal_inicio`
no autoriza nada: solo elige entre los portales todavía permitidos tras login o
cambio de empresa, salvo `next` explícito seguro. Matriz, adaptación a #68 y pruebas
en `briefs/ENCARGO-nucleo-d1.md`; criterios técnicos del constructor, sin nuevas
decisiones atribuidas a Carlos.

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

**Nota (CAR-73, 29-oct-2026, 15:17 CLT, decisión de Carlos).** El Brief 09 (Documentos) suma una **dependencia nueva**: la plantilla o cláusula reutilizable con los términos de tratamiento de datos de los visitantes, asociada a la cuenta, al cliente y al negocio, para incorporarla a los contratos de servicio de prestación con el cliente (cada tenant tiene varios contratos tipo, distintos según su operación). Viene de `modulos/control-acceso.md` §14 P1 y §16: el tenant sigue siendo el responsable de esos datos y OPAI su encargado (Brief 07d §4.1); el matiz del cliente como responsable de sus propios visitantes se resuelve con esa cláusula, no con una excepción al modelo del 07d.

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

**Nota del 26-oct-2026.** Los roles personalizados salen del backlog: van en el Brief 07c «Acceso y permisos», con permisos finos al menos tan completos como en 1.0 (Decisión de Carlos del 24-oct-2026, confirmada el 26-oct-2026 9:20 CLT). El alcance del supervisor por instalación y de los portales (brecha B3) también va en el Brief 07c, movido desde el Brief 12 (Decisión de Carlos, 26-oct-2026 9:36 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)), y es condición para cerrar el Núcleo.

**Precisión del 26-oct-2026 11:57 CLT (Carlos, t310u, chat del bot OPAI 2.0).** Al decidir las opciones del Brief 07c §16 («ok a todo» a las recomendaciones), Carlos acotó la brecha B3 en el Brief 07c **solo al alcance del supervisor** (la brecha Alta y el criterio de cierre del Núcleo). El alcance de los portales Cliente y Trabajador se construye con sus portales en la fase 3 y queda **pendiente para sus briefs**, reusando el mismo mecanismo (el vínculo trabajador ↔ persona ya existe: `Persona.usuarioId`, `core.personas.vincular_usuario`). Es decir, 07c entrega el mecanismo de alcance y lo aplica al supervisor, pero **no cierra B3 entero**. Esto precisa la frase de las 9:36 CLT («el alcance del supervisor por instalación y de los portales … también va en el Brief 07c»): de los portales queda solo el mecanismo preparado.

---

## ADR-023 · Cumplimiento DT desde el diseño (Res. Ex. N°38/2024)

**Fecha:** 23-oct-2026 · **Estado:** vigente · Ver `docs/2.0/extraccion/dt-normativa.md`.

**Decisión.** El módulo Asistencia se construye para certificarse ante la Dirección del Trabajo, no se adapta después. Principios obligatorios desde su primer brief: la marca es un hecho inmutable con hora de servidor, snapshot de empleador/establecimiento/mandante/resolución, método, dispositivo y GPS como evidencia (nunca bloqueante); hash de integridad y **bitácora encadenada append-only** protegida con triggers en Postgres y verificada a diario; correcciones como hechos nuevos con 48 horas de oposición del trabajador y vencimiento automático; comprobante al trabajador por cada marca; contingencia manual trazable; incidentes técnicos registrados; acceso de inspector temporal, de solo lectura y auditado; los seis reportes oficiales con las siglas del Art. 28 g generados desde los hechos; respaldos periódicos con manifiesto y hash y retención mínima de 5 años; límites de jornada (Ley 21.561, DS 48/2024) como configuración con vigencia y alertas tempranas; verificación del reloj del servidor contra hora oficial. Todo cálculo de jornada vive en `packages/domain` con tests que fijan los artículos. Las primitivas que otros módulos comparten (bitácora encadenada, comprobantes, oposición) se implementan en el núcleo para que Rondas y Documentos las reutilicen.

**Consecuencias.** Asistencia es el módulo con más reglas no negociables; su brief parte de la extracción y cada regla se traza a un test. La certificación de Gard se hace sobre 2.0.

---

## ADR-024 · Rondas con GPS como módulo vendible independiente

**Fecha:** 23-oct-2026 · **Estado:** vigente · Ver `docs/2.0/extraccion/rondas-y-tickets.md`.

**Decisión.** Rondas depende solo del núcleo (instalaciones, personas, dispositivos, documentos, geolocalización, comunicaciones) y se vende solo. Conserva de 1.0: puntos de control con QR/NFC/GPS y geocerca por punto, plantillas y programación, estados y cierres automáticos, tracking con precisión y batería, trust score con pesos configurables, detección de anomalías, offline-first con cola idempotente, informes con recorrido y heatmap, vista del cliente. Integra el libro de novedades y los incidentes de terreno. El Portal Terreno y el Portal Trabajador ejecutan rondas con la misma lógica (`packages/domain`).

**Nota del 29-oct-2026 (CAR-70, Central de monitoreo).** Decisión de Carlos, 29-oct-2026, transmitida en la sesión de Claude de CAR-70 (PR #122), ajuste al encargo de Central: el **libro de novedades de 1.0 pasa a 2.0 en la app Terreno** (no en Rondas como pantalla propia) y **recibe las novedades que deja una ronda**; el módulo Central lo **muestra** (no lo duplica) en la pestaña «Central» de la ficha de la instalación, junto a su propia bitácora. Detalle en `modulos/central.md` §2 y §3.

**Decisiones de Carlos (29-oct-2026, CAR-72, pedido de las 08:18 CLT).** Precisan este ADR al responder las 21 preguntas de `modulos/rondas.md` §14 (detalle completo en ese archivo, sección «Decisiones de Carlos (29-oct-2026)»): **se retira NFC** — modifica el párrafo de arriba: ya no se conservan «QR/NFC/GPS», quedan solo `QR`, `GPS` y `QR + GPS`, y las etiquetas NFC de 1.0 no se migran; el **QR es siempre físico**, sin QR dinámico; el radio de geocerca por defecto queda **bajo 20 m**, el mínimo que no dé falsos «fuera», calibrado con las marcas reales de 1.0; la **foto sigue opcional por punto** y, además, cada punto admite reportar una novedad o un incidente hacia el libro electrónico de novedades; el **trust score nunca bloquea**; y las etiquetas QR físicas de 1.0 **se reutilizan y se mejoran** durante la migración, en vez de exigir reimpresión inmediata.

**Aprobación de Carlos (29-oct-2026, 14:58 CLT, mismo pedido CAR-72).** Carlos aprueba `modulos/rondas.md` completo (pasa de «borrador» a «aprobado», ADR-047): queda disponible para copiar el Design Prompt en Claude Design. Confirma además que la publicación en Play Store (decisión 5 de arriba: app web dentro de la app Terreno) **queda como opción del Brief 14** (Rondas), disponible desde ese brief y sin esperar al empaquetado nativo del Brief 17.

---

## ADR-025 · Tickets transversal y simple; sin chat

**Fecha:** 23-oct-2026 · **Estado:** vigente · Ver `docs/2.0/extraccion/rondas-y-tickets.md`.

**Decisión.** Tickets es un módulo transversal: tipos con responsable por defecto y SLA opcional, estados `abierto → en_curso → resuelto → cerrado` (+ `rechazado`), un responsable obligatorio desde la creación, resolución devuelta al solicitante en su portal y por correo, vínculo a cualquier entidad, adjuntos vía documentos. Las solicitudes de trabajadores son tipos de ticket con aprobación de un paso dirigidos al supervisor. Nada crea tickets sin dueño; los hallazgos de supervisión no crean tickets. El chat interno no se construye.

**Nota del 29-oct-2026 (CAR-70, Central de monitoreo).** Decisión de Carlos, 29-oct-2026, transmitida en la sesión de Claude de CAR-70 (PR #122): aprobó las 15 preguntas de `modulos/central.md` §14 tal como venían recomendadas (pregunta 9). El chat interno sigue sin construirse. Los hilos de «Mensaje a la central» **no son chat**: los abre siempre el terreno con un tipo (novedad, consulta, urgencia) o la central desde una alerta; quedan ligados a la instalación y al turno; el guardia escribe libre solo dentro de un hilo abierto; no hay hilos entre guardias ni sin tipo, y el hilo se cierra al resolverse. Los «Avisos de la central» van en un solo sentido, con acuse de recibo. Una alerta de la central no es un ticket: solo puede derivar a uno con responsable. Reglas R16 y R17 de `modulos/central.md`.

---

## ADR-026 · Flujo de caja como pieza central de Finanzas

**Fecha:** 23-oct-2026 · **Estado:** vigente

**Decisión.** Finanzas 2.0 se diseña alrededor del flujo de caja: una planilla (patrón `PlanillaScreen`) por semana y mes con filas de ingresos y egresos derivadas de hechos (DTE emitidos y recibidos, nómina, rendiciones, movimientos bancarios conciliados, compromisos) y proyecciones editables, **derivadas al leer** (como el v3 de 1.0) y nunca copiadas; cada celda sabe de qué hechos proviene; saldo acumulado y escenarios; conciliación bancaria y facturación alimentan la misma planilla. La extracción del flujo de caja v3 de 1.0 se hace antes del brief de Finanzas y es insumo obligatorio.

---

## ADR-027 · Integraciones y secretos por tenant

**Fecha:** 23-oct-2026 · **Estado:** vigente · Ver `docs/2.0/extraccion/integraciones-y-configuracion-por-tenant.md`.

**Decisión.** El núcleo tiene un **catálogo de integraciones** (proveedor DTE, banco, factoring, correo, WhatsApp, mapas y geocodificación, biometría, IA, Slack, webhooks propios) con estado por tenant, prueba de conexión y registro de uso. Cada módulo declara en su manifest las integraciones que requiere; el núcleo provee el adaptador configurado. Las credenciales del tenant se guardan en un **almacén de secretos cifrado** (AES-256-GCM con clave de plataforma rotable, envelope encryption), se muestran una sola vez y nunca salen por API ni MCP. Hay dos modalidades por integración: **de plataforma** (OPAI pone la credencial y la cobra en el plan: mapas, biometría, correo, IA) y **propia del tenant** (DTE, banco, factoring, Slack, dominio de correo, Maps con cuota propia). La geolocalización (autocompletado de direcciones, geocodificación, mapas, distancias) es un servicio del núcleo con proveedor Google Maps por defecto y key de plataforma restringida por dominio; el tenant puede aportar la suya.

**Nota (CAR-73, 29-oct-2026, 15:17 CLT, decisión de Carlos).** La verificación de identidad de firmantes **externos** en N2 (`modulos/firma.md` R13; quien firma sin estar enrolado: representante del cliente, proveedor, postulante) es **de plataforma**: el proveedor de cédula, selfie y prueba de vida lo contrata **OPAI**, nunca el tenant, y su costo se cobra al tenant como consumo dentro del módulo Documentos (ADR-031). Es una excepción puntual al patrón general de esta decisión (que deja biometría como «de plataforma» pero el resto de verificaciones de identidad como elegibles por el tenant); aquí no hay modalidad «propia del tenant» para esta verificación.

**Nota del 29-oct-2026 (CAR-70, Central de monitoreo).** Decisión de Carlos, 29-oct-2026, transmitida en la sesión de Claude de CAR-70 (PR #122), ajuste a la pregunta 8 (telefonía) de `modulos/central.md` §14: WhatsApp/telefonía para la Central sigue el mismo patrón de plataforma-o-propia de este ADR, con Twilio como proveedor. Por defecto los avisos salen con la cuenta de Twilio **de plataforma** de OPAI y sus plantillas de WhatsApp ya aprobadas; como opción, cada tenant conecta **su propia cuenta de Twilio** en el catálogo de integraciones. Un tenant con número de WhatsApp propio necesita la aprobación de Meta **por número y por plantilla** antes de poder enviarlas; mientras no la tenga, sigue con el Twilio y las plantillas de OPAI. Detalle en `modulos/central.md` §10.

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

**Fecha:** 23-oct-2026 · **Estado:** vigente, modificado por ADR-048 (25-oct-2026: Nómina ya no depende de Asistencia; los módulos operativos solo dependen del núcleo) y por la nota del 25-oct-2026 al final (orden de trabajo: Núcleo primero, luego Puestos → Comercial → CPQ); y por ADR-049, propuesto en PR #38 (26-oct-2026: el «chat» del backlog, entendido como asistente IA, sale del backlog y pasa a un brief propio después de CPQ) · Reemplaza el orden de ADR-009 a partir de la fase 3.

| Fase | Contenido | Corte de Gard |
|---|---|---|
| 1 (en curso) | Núcleo: identidad y plataforma (hecho); maestros, documentos (servicio), configuración, comunicaciones, outbox y jobs (Brief 02) | — |
| 2 | Comercial, CPQ (motor + modelo), módulo Documentos (explorador, editor, plantillas, firma simple); importación de maestros e historial comercial | Ventas en 2.0 |
| 3 | Operaciones (puestos, pautas, turnos extra, supervisión), **Rondas**, **Tickets**, portales Trabajador, Terreno, Cliente y Supervisor, libro de novedades, dispositivos | Operación y terreno en 2.0 |
| 4 | **Asistencia** con cumplimiento DT completo, reportes DT, fiscalización; inicio de certificación | Marcación en 2.0 |
| 5 | Finanzas con flujo de caja al centro, banca y conciliación, DTE y factoring, rendiciones, contabilidad e informes; migración del historial financiero | 1.0 a solo lectura |
| 6 | Nómina (sobre asistencia y estructuras), Licitaciones (sobre CPQ), firma electrónica avanzada | Gard 100 % en 2.0 |
| Backlog | Inventario, cámaras, ATS, gamificación, psicolaboral, chat, Slack, sitio de marketing 2.0, roles personalizados *(26-oct: pasan al Brief 07c)* | — |

**Modificación del 25-oct-2026.** Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0), 19:09–22:10 CLT: primero se cierra el Núcleo y las fases van en orden. Cambia el **orden de trabajo**, no los cortes de Gard. Primero se cierra el Núcleo: Brief 05 (navegación por áreas) → Brief 04 (PWA) → Brief 07b (capas de sueldo, que pasa a la fase 1 y va antes del brief de Puestos). Después se abre **Puestos y guardias (Operaciones I, Brief 11, adelantado desde la fase 3)** (Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0), 12:42 CLT). Después va **Comercial (CRM) y luego CPQ por vertical**, en reglas, diseño y construcción (Decisión de Carlos, 25-oct-2026 23:29 (t267u–t268u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0)), porque la cotización cuelga del negocio y al ganarlo se ofrecen los puestos y RRHH los confirma (ADR-040, ADR-048 y su respuesta 3 de las 23:10). Además, como requisito, los negocios de Comercial (Briefs 06 y 07) van antes del cotizador (Brief 10), porque CPQ depende de Comercial (ADR-040, ADR-048). El resto sigue el orden de fases de esta tabla. Nómina en la fase 6: Carlos, 25-oct-2026 ~21:20, chat con OPAI 2.0, según el registro del bot OPAI 2.0: no tiene clientes que comprarían solo payroll. Como el ROADMAP solo permitía adelantar Nómina si un cliente la compraba sola, Nómina queda en la fase 6. Además, desde las 23:10 Nómina exige Puestos (respuesta 1 de ADR-048), lo que también impide venderla sola. Detalle por módulo y etapa en `PLAN-desarrollo.md`; fases y semanas en `ROADMAP.md`.

---

## ADR-031 · Consumos medidos y pagados por tenant; IA configurable y BYOK

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-027.

**Decisión.** Todo recurso con costo variable (tokens de IA por proveedor y modelo, geocodificación y mapas, verificaciones biométricas, mensajes de WhatsApp y SMS, correos, firmas, almacenamiento, llamadas de API y MCP, documentos generados) pasa por un **medidor del núcleo** (`core.consumos`: tenant, recurso, unidad, cantidad, costo unitario y total, módulo, capacidad, actor, referencia) en la misma transacción o en el outbox. Ningún módulo llama a un proveedor directamente: usa el adaptador del catálogo de integraciones, que mide. Por integración, el tenant elige **de plataforma** (credencial de OPAI, cuota incluida en el plan, exceso facturado a precio de lista) o **BYOK** (credencial propia, cifrada en el almacén de secretos; OPAI no cobra ese consumo). Configuración de IA por tenant: proveedor y modelo por clase de tarea (`economica`, `estandar`, `potente`), key propia o de plataforma, presupuesto mensual con avisos al 80 % y corte al 100 % (configurable), política de datos (sin entrenamiento, campos excluidos), y registro de cada llamada (prompt y salida resumidos, tokens, costo) para trazabilidad. Estado de cuenta mensual por tenant; el cobro efectivo queda para cuando exista Opai SpA, pero la medición nace con el Brief 02 (sustituye y amplía `core.usage_events`).

**Consecuencias.** El costo variable viaja con el tenant. Plataforma ve consumo y margen por tenant y por recurso. Las cuotas del plan (ADR-029, punto 12) se miden con el mismo medidor.

**Nota del 26-oct-2026 (NÚCLEO-E1, PR 1 del agente interno; preparando ADR-049).** El adaptador de IA del núcleo deja de ser un solo turno de texto: expone un contrato neutral de conversación con **herramientas** (tool-calling), **streaming** de eventos y **salida estructurada** por JSON Schema, y una **cadena de respaldo** entre los proveedores que el tenant tenga conectados (reintenta ante 5xx, 429 o fallo de red; nunca ante un 4xx de contenido). Sigue **sin SDKs** (solo `fetch`): Anthropic (`messages`), OpenAI/`chat completions`, Google (`generateContent`) y un proveedor «compatible con OpenAI» con base URL configurable (`ia_compatible`, que cubre Vercel AI Gateway, OpenRouter y otros) más el alias `ia_xai` (Grok) con su base URL pública por defecto. `completar()` se conserva sobre `conversar()` para geolocalización e «Integraciones · Probar». Cada llamada se mide igual que antes (tokens de entrada y salida por clase de tarea); el proveedor y el modelo se anotan en `referencia_tipo = "ia"` y `referencia_id = "<proveedor>:<modelo>"`, sin guardar el prompt completo ni ninguna key (ADR-049 punto 6). La elección del modelo dentro del agente y los ajustes de configuración asociados llegan en PRs posteriores del agente interno.

**Endurecimiento del 26-oct-2026 (revisión 5660937436 del PR 1; encargo de Carlos a OPAI 2.0).** Tres correcciones de seguridad e integridad sobre la nota anterior, sin cambiar el contrato: (a) **SSRF del `baseUrl` de `ia_compatible`**: la base URL que configura el tenant exige `https`, rechaza destinos internos (IP privada, loopback, link-local, metadata y localhost) —también tras resolver el DNS, contra rebinding— y las peticiones usan `redirect: "error"` para que la key no viaje a un destino redirigido; los endpoints de primera parte (Anthropic, OpenAI, Google, xAI por defecto) siguen siendo constantes `https` de confianza. (b) **Integridad del streaming**: un stream cortado (sin evento final) o un evento de error del proveedor lanza `ErrorIa` en vez de darse por completo, y el lector SSE se libera al terminar o cancelarse. (c) **Medición del streaming**: el consumo se mide en `finally` con el uso ya conocido, también si el stream se corta o se cancela. No se cambia la política de respaldo hacia la key de plataforma (OPAI) cuando el tenant tiene key propia: queda igual, pendiente de que Carlos decida si requiere opt-in.

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

**Nota del 26-oct-2026 (ADR-049, propuesto en PR #38).** Decisión de Carlos, 26-oct-2026 10:08 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0): «ok» a la recomendación del bot de las 10:07: OPAI sí tendrá un **agente interno** propio, en el celular y en el escritorio, que convive con los agentes externos. No contradice el fondo de este ADR: es un cliente más de las mismas capacidades y del MCP, sin lógica ni herramientas propias, actúa como «agente vía usuario» con los permisos del usuario conectado y pide confirmación antes de escribir y su consumo se mide como cualquier otro (ADR-031). Lo demás sigue igual: sin copilotos por módulo, sin clientes de correo, calendarios ni bases de conocimiento.

---

## ADR-033 · Acceso agéntico para clientes y trabajadores desde sus portales

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-032 y ADR-022.

**Decisión.** Las API keys y el MCP no son solo para el tenant: cada portal puede emitir keys para su propio principal. Tres tipos de principal detrás de una key: **usuario del tenant** (hecho en el Brief 01), **cuenta cliente** (emitida por un contacto autorizado desde el Portal Cliente; alcance = su cuenta y sus instalaciones) y **persona trabajadora** (emitida desde el Portal Trabajador; alcance = ella misma; fase posterior). Cada capacidad declara en qué portales está disponible (`portales: ["erp", "cliente", …]`); el MCP de una key de cliente solo expone las capacidades del portal cliente, con el alcance aplicado en la consulta (ADR-022). Lectura amplia de lo que el portal ya muestra (instalaciones, dotación, cobertura, rondas, visitas de supervisión con resumen y firma, novedades, documentos compartidos, cotizaciones, facturas y estados de pago); escrituras limitadas y con vista previa (aprobar o rechazar cotización, crear ticket o solicitud, comentar, firmar lo que le corresponda); nunca datos de otras cuentas ni datos personales de trabajadores más allá de lo que el portal muestra (ADR del Portal Cliente de oct-2026: RUT visible, evaluación psicolaboral no). El tenant decide por cuenta si habilita el acceso agéntico y con qué límites; las llamadas se miden (ADR-031) contra el tenant, que puede trasladarlas al cliente en su contrato. Cada portal tiene una página "Conectar tu IA" con la key, snippets para Claude, ChatGPT, Grokbot y Codex, y el manual de agente de ese portal (`docs/2.0/agentes/`). Toda acción queda auditada "agente vía contacto del cliente" o "vía trabajador".

**Consecuencias.** El modelo de `api_keys` gana `principal_tipo` y `principal_id` (Brief 02 lo deja preparado; Brief 03 lo activa para clientes con los portales). Las capacidades llevan `portales`. Un cliente puede operar con su propia IA sobre los datos de su proveedor: diferenciador comercial y barrera de salida.

**Precisión de sesiones humanas (encargo portal-sesión, review 5661270514 del Revisor en #59).**
En sesiones con tenant, la capa de capacidades valida el portal pedido tanto contra
los portales de la membresía activa del usuario en ese tenant, cargada por el servidor,
como contra `portalesDe(c)`. No une membresías de otros tenants ni consulta por llamada.
Sin portal se rechaza por defecto: `null` o vacío **no** equivale a `erp`; las rutas ERP
lo derivan en servidor. La API genérica con sesión sin portal no acepta uno del cliente.
Plataforma, procesos del sistema y API keys conservan sus reglas.

**`/api/v1` con sesión: origen en escrituras (CAR-38, 28-oct-2026).** La API genérica con sesión
mantiene la lista explícita de CAR-37 (`apps/web/lib/api-v1-sesion.ts`): solo esas capacidades
corren en el portal ERP fijado en servidor; el resto sigue con portal `null` y se rechaza. Además,
como la cookie viaja sola, toda escritura con sesión (cualquier capacidad, también de plataforma o
sin tenant) exige `Origin` igual al propio origen, para que una página ajena no escriba a nombre del
usuario. Las lecturas siguen el criterio de la lista. Las API keys no cambian. Ampliar la lista (por
ejemplo, a `core.supervisores.*`) queda para un PR aparte que decide Carlos.

**Excepción explícita (adenda del encargo; autonomía de fase 1 dada por Carlos en t500u).**
Solo `core.invitations.accept` queda fuera de la comprobación de portales de membresía,
porque crea esa membresía; su handler sigue exigiendo usuario autenticado, token y correo
correcto. No es una excepción genérica para capacidades internas. La fuente disponible
es la adenda, que referencia «23:42 DECISIÓN portal-sesión».

**Catálogo del portal Supervisor (decisión del operador, 27-oct 00:55, autoridad
delegada por Carlos; resuelve el bloqueo anterior).** Se declaran `portales: ["erp",
"supervisor"]`, exactamente, en las capacidades que el código de
`apps/web/app/(supervisor)` ya llama hoy en `main`: siete de lectura
(`core.documentos.matriz`, `core.instalaciones.list`, `core.instalaciones.get`,
`core.contactos.list`, `core.personas.get`, `core.documentos.list`,
`core.documento_tipos.list`) y cuatro de escritura que esas pantallas construyeron
para el supervisor —no una reutilización genérica— según el propio código:
`core.documentos.pedir_renovacion` (componente `boton-pedir.tsx`, exclusivo de
`supervisor/_componentes`) y el flujo de subida que `hoja-subir.tsx`/`subir.ts`
documentan como "Supervisor en terreno" (`core.documentos.iniciar_subida`,
`core.documentos.confirmar_subida`, `core.documentos.update`). Ninguna capacidad
que esas pantallas no llamen se declaró, y ninguna de las cuatro escrituras gana
permiso o alcance nuevo: `documentos.manage` y el alcance B3 siguen exigidos sin
cambios; antes del fail-closed de esta misma decisión ya eran ejecutables desde
la sesión del supervisor con ese permiso. Detalle y lista completa de archivos
revisados en `briefs/ENCARGO-portal-sesion.md`.

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

**Fecha:** 23-oct-2026 · **Estado:** vigente (capas de sueldo actualizadas por Carlos el 25-oct-2026 y reglas del puesto definidas por Carlos el 25-oct-2026 (mockup pendiente de aprobación), al final; la jornada pactada pasa al vínculo laboral por ADR-048) · Completa ADR-005. Brief 02.

**Contexto.** En 1.0 el puesto operativo (instalación + cargo + rol de turno + horario + dotación) vive en Operaciones y el patrón de turno es una entidad de CPQ; la relación laboral está repartida entre `OpsGuardia` (estado de ciclo de vida, contrato) y `OpsPersona`. CPQ cotiza puestos, Operaciones los cubre, Asistencia marca contra ellos y Nómina liquida con su estructura.

**Decisión.** El **puesto de servicio** (`core.puestos`: instalación, cargo, nombre, patrón `dias_trabajo × dias_descanso`, horario `[inicio, fin)` con cruce de medianoche, jornada, dotación, vigencia) y el **vínculo laboral** (`core.vinculos_laborales`: persona, cargo, tipo de contrato, inicio, término, motivo; uno vigente por persona) son del núcleo porque los necesitan dos o más módulos vendibles. El patrón de turno va en el puesto, no en una entidad aparte. Previsión, cuentas bancarias, anticipos y tallas son facetas de Nómina u Operaciones; PIN, Face ID y jornada, de Asistencia y Portales. Las estructuras de sueldo se versionan por vigencia sin solapes en el mismo nivel y referencia; la resolución persona → puesto → cargo vive en `packages/domain`; el nivel persona exige motivo y queda auditado.

**Consecuencias.** CPQ y Operaciones referencian `core.puestos` en vez de crear los suyos. Una persona puede existir sin vínculo vigente (inactiva). Las asignaciones persona ↔ puesto llegan con Operaciones (fase 3).

**Actualización de Carlos (25-oct-2026): capas de sueldo.** Reemplaza los tres niveles de ADR-005 (cargo → puesto → persona) y la resolución con herencia por concepto que implementó el Brief 02.

1. **Tres capas de sueldo:** (a) **instalación**, la capa por defecto; (b) **puesto**, cuando el puesto tiene su propio sueldo; (c) **sueldo por RUT** (persona), la excepción, con motivo obligatorio y auditoría.
2. **Una sola capa por asignación.** Las capas no se combinan: rige la más específica que exista (RUT, después puesto, después instalación) y su estructura se aplica completa. No hay herencia de conceptos entre capas.
3. **El cargo deja de ser una capa de sueldo.** Sigue siendo catálogo (nombre, descripción, sensibilidad del sueldo) y atributo del puesto y del vínculo laboral, pero no define montos.
4. **«Grupo de sueldo» fuera de la v1.** Pasa al backlog; se reconsidera solo si un cliente lo pide.
5. **Anexo de contrato.** Un cambio de rol, de capa, de monto o de instalación de una persona genera el borrador del anexo de contrato del núcleo (ADR-048, punto 5), que aprueba RRHH; en particular, todo cambio de la capa vigente o del monto.
6. Las estructuras siguen versionadas por vigencia, sin solapes en la misma capa y referencia; la resolución vive en `packages/domain` y devuelve la capa que rigió, para que la liquidación y el costeo la guarden.

**Jornada pactada (ADR-048, 25-oct).** La jornada pactada deja de ser faceta de Asistencia y Portales y pasa a ser dato del vínculo laboral en el núcleo (`core.vinculos_laborales`), porque es parte del contrato y Asistencia la necesita para marcar sin Operaciones. PIN y Face ID siguen siendo de Asistencia.

**Consecuencias de la actualización.** El código del Brief 02 (`packages/domain/src/estructuras.ts`, `core.estructuras_sueldo.nivel` con `cargo | puesto | persona` y conceptos `NULL` que heredan) no cumple esta regla. Se corrige en un brief propio, con migración aditiva: nueva capa `instalacion`, resolución sin herencia y retiro del nivel `cargo` (sin borrar datos; las filas `cargo` existentes se convierten o se archivan con la decisión de Carlos sobre los datos de `dev`). Este PR no toca código. CPQ (ADR-042, punto 4) costea con la capa puesto o instalación cuando existe (ampliaciones y renovaciones); cómo se cotiza el sueldo de una instalación nueva queda como pregunta abierta en ADR-048 (con recomendación).

**Actualización (25-oct-2026, CLT): reglas del puesto — reglas definidas por Carlos el 25-oct-2026 (Page «Puestos y guardias OPAI 2.0: propuesta»); mockup pendiente de aprobación.** Precisa el modelo del puesto de la decisión original (que hablaba de «dotación» y de una jornada `dia | noche | rotativa`), sin borrarla; el modelo de datos se fija en el brief de Puestos (Operaciones I, Brief 11). Especificación en `modulos/operaciones.md`.

1. **1 puesto = 1 posición cubierta.** En los patrones corridos, el titular y el relevo cubren el puesto uno a la vez. Tres 5x2 son tres puestos. La dotación deja de ser un número dentro del puesto.
2. **Catálogo de patrones por tenant**, con 4x4, 7x7, 14x14, 5x2, 2x5 y 3x4 de fábrica.
3. **Rol (días), horario (tramos, de día y de noche) y horas semanales van por separado.**
4. **La colación va en el puesto.**
5. **Las funciones del puesto son por tenant y vertical.**
6. **Todo lo no cubierto es PPC (puesto por cubrir) con motivo:** sin asignar, licencia, permiso, falta o finiquito.
7. **Al trasladar a una persona,** el puesto de origen queda en PPC «Sin asignar».
8. **El anexo de contrato lo aprueba RRHH** (el rol que aprueba es configurable); **un agente no lo aprueba** (ADR-048, punto 7, ya lo dejaba sujeto a aprobación humana).
9. **El supervisor es un puesto más.**
10. Los puestos no se crean solos al ganar un negocio: al ganarlo se **ofrecen** por línea de guardias y RRHH los confirma (Decisión de Carlos, 25-oct-2026 23:08–23:10 (t263u–t265u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0); nota del punto 3 en ADR-040 y ADR-048, respuesta 3).

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


**Nota del 29-oct-2026 (CAR-70, Central de monitoreo).** Decisión de Carlos, 29-oct-2026, transmitida en la sesión de Claude de CAR-70 (PR #122): aprobó las 15 preguntas de `modulos/central.md` §14 tal como venían recomendadas (pregunta 15). Se agrega el ámbito **Instalación** al centro de Configuración, con resolución defecto → plataforma → tenant → instalación → usuario, para los ajustes que un módulo declare con `ambito: "instalacion"` (los umbrales de la central primero; Rondas después). Lo construye el núcleo antes del Brief 15b, por capacidad (`core.config.get/set`) con alcance de filas (ADR-022) y sin migraciones fuera de un PR.
---

## ADR-039 · Documentos con subida directa, verificación y bitácora

**Fecha:** 23-oct-2026 · **Estado:** vigente · Completa ADR-019 y ADR-023. Brief 02.

**Decisión.** Los archivos suben directo del navegador o del agente a R2 con una URL firmada PUT de 10 minutos (firmada con `aws4fetch`, sin SDK de AWS). El documento nace `pendiente` y pasa a `disponible` con `core.documentos.confirmar_subida`, que verifica existencia, tamaño, tipo MIME permitido por su tipo y SHA-256, y registra el hecho en la bitácora encadenada. La descarga usa URLs firmadas GET de 5 minutos. Las versiones se encadenan con `reemplaza_a_id`; los duplicados por hash se permiten y se informan. Subidas no confirmadas en 24 horas se eliminan por trabajo programado.

**Consecuencias.** Ningún archivo pasa por las funciones de Vercel. Todo documento tiene huella verificable; los comprobantes públicos (`/verificar/<token>`) prueban su integridad sin exponer datos personales.

---

## ADR-040 · Modelo comercial: cuenta, negocio, instalaciones, contactos con rol, etiquetas y actividad

**Fecha:** 23-oct-2026 · **Estado:** vigente (decisiones de Carlos del 23-oct al final; punto 3 modificado el 25-oct-2026, nota al final: los puestos no se crean solos; al ganar el negocio se ofrecen y RRHH los confirma) · Completa ADR-009, ADR-010 y ADR-036. Modifica el modelo de contactos del Brief 02 (punto 5). Insumo: `extraccion/comercial-y-cpq.md` (problemas P1–P18 y modelo, §5).

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
8. **Actividad unificada en el núcleo.** `core.actividades` (nota, llamada, correo, WhatsApp, reunión con acuerdos, visita, tarea con vencimiento, prioridad, responsables y estado) con vínculos polimórficos `core.actividad_vinculos` (una actividad puede ir al negocio, la cuenta y el contacto a la vez) y `core.actividad_responsables`. Va en el núcleo porque Operaciones y Personas también registran notas y tareas. La pestaña Actividad (ADR-041) une interacciones, tareas y cambios de `core.audit_events` (los cambios de etapa ya quedan ahí por la capacidad que mueve el negocio) en el Timeline existente. Reemplaza `CrmHistoryLog`, `CrmNote`, `CrmTask*`, `CrmDealMeeting` y `CrmDealContactLog`. La cadencia de seguimiento de 1.0 queda en backlog como automatización sobre eventos. *(Nota del 26-oct-2026: ya no es backlog; va en el módulo Comercial, configurable por paso (persona, OPAI automático o agente de IA); Decisión de Carlos del 24-oct-2026, confirmada el 26-oct-2026 9:20 CLT; `modulos/comercial.md` R29.)*
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

**Nota del 25-oct-2026 sobre el punto 3 — reglas definidas por Carlos el 25-oct-2026 (Page «Puestos y guardias OPAI 2.0: propuesta»); mockup pendiente de aprobación.** *(Texto de la tarde del 25-oct, superado por la actualización de las 23:08–23:10 que sigue.)* El consumidor (c) de `comercial.negocio.ganado` queda **sin efecto**: los puestos **no se crean al ganar**. Se crean desde la instalación o con un **botón opcional, con vista previa, en la cotización aceptada**, solo para las líneas de tipo puesto; el botón crea **un puesto por posición**, en PPC, y no duplica los ya creados. Los consumidores (a) y (b) no cambian. Reglas del puesto en ADR-036, actualización del 25-oct. **Actualización (Decisión de Carlos, 25-oct-2026 23:08–23:10 (t263u–t265u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0)):** el disparador para ofrecer los puestos es **ganar el negocio**, no la cotización. Al ganarlo, cada línea de guardias de la cotización se ofrece para crear su puesto (un puesto por posición, en PPC) con el sueldo bruto cotizado, y **RRHH lo confirma**; nada se crea sin esa confirmación. Si la línea no tiene sueldo, el puesto se crea y toma el sueldo de la instalación, que RRHH completa. Una cotización sin guardias (por ejemplo, de cámaras) no crea puestos ni sueldos. Los puestos también se pueden crear desde la instalación. Detalle en `modulos/cpq.md` (ADR-048, respuesta 3).

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

**Fecha:** 23-oct-2026 · **Estado:** vigente (aprobado por Carlos el 23 y 24-oct; respuestas en `PREGUNTAS-carlos.md`; el sueldo del punto 4 sale de las capas de ADR-036 actualizado el 25-oct, no de los niveles de ADR-005) · Concreta y **modifica** ADR-021: los ámbitos de variable pasan a `tenant`, `cuenta` (antes "cliente"), `instalacion`, `cotizacion` y `linea` (antes "puesto": la línea de puesto); y el modelo se edita en la pantalla "Modelo de costeo" del módulo CPQ, no en Configuración → CPQ (punto 8). Requisito de Carlos: no copiar el CPQ de 1.0; mucho mejor visualmente; ítems y variables de costo definidos por cada tenant y vertical; se mantiene el cálculo del margen financiero.

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

> Nota del 24-oct-2026 (decisión de Carlos, 20:52 CLT): el equipo de Linear que se usa es el que ya existe, **CAR** («Carlos Irigoyen»); no hay equipo «OPAI». Los IDs pasan a `CAR-n`, obligatorios en la descripción del PR (`Fixes CAR-n`) y recomendados en el nombre de la rama. Donde este párrafo dice «equipo OPAI, IDs `OPAI-n`», léase CAR y `CAR-n`.

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

**Enmienda (Brief 04, 26-oct-2026; decisión de OPAI 2.0 bajo la delegación de Carlos del 26-oct-2026 16:54/16:59 CLT, t365u y t366u, a decidir todo el Núcleo).** Al ejecutar la base PWA se precisan los puntos 6 y 7, sin cambiar el objetivo:

- **6 (presupuesto de terreno).** El tope de ≤ 150 KB se aplica cuando los portales de terreno tengan **pantallas reales**. Hoy son placeholders y su primera carga es el **shell compartido** del ERP (paleta ⌘K, menús, selector de portal), ~159 KB gzip, que no es alcance de la base PWA sino de los arreglos de rendimiento del shell (Brief 03, PR 2). Entretanto el tope por ruta de terreno (`/terreno`, `/trabajador`, `/supervisor`) queda en **162 KB** en `presupuesto-js.json` —más estricto que el 165 por defecto— para rastrear y evitar regresiones; baja a 150 KB cuando lleguen esos arreglos y el primer módulo de terreno su contenido real.
- **7 (prueba en CI).** El equivalente obligatorio es **(a)** Playwright (manifest válido, SW que registra y controla la página, shell de terreno sin red con `context.setOffline(true)`) más **(c)** el presupuesto de JS; se ejecuta hoy. **(b) Lighthouse CI queda como informe, no como gate**, hasta que el primer módulo de terreno tenga pantallas reales (decisión D3 (b) del Brief 04, resuelta por Carlos el 26-oct-2026 13:45 CLT, t332u). El informe se genera contra el build local con `next start` y se guarda en `docs/2.0/informes/`; pasa a gate (≥ 90 rendimiento y accesibilidad en emulación móvil sobre rutas de terreno, ADR-029.14) con Rondas o Asistencia. La categoría PWA de Lighthouse ya no existe (la quitó la versión 12), así que la instalabilidad la cubre Playwright (a).

**Enmienda (CAR-73, 29-oct-2026, 15:17 CLT, decisión de Carlos).** El punto 3 se amplía: el modo sin conexión suma el **control de acceso físico** (`modulos/control-acceso.md` R20–R23, §14 P13), no solo marcación, rondas y novedades. El dispositivo de portería emparejado registra entradas y salidas sin red con la lista bloqueada aplicada sin red y revalidación al sincronizar; detalle completo en esas reglas, que esta enmienda no repite.

**Decisiones de Carlos (24-oct).** (12) Empaquetado para tiendas con **Capacitor**. (13) **Una sola app «OPAI»** en App Store y Google Play para todos: personal de la empresa (ERP y Supervisor), trabajadores, dispositivos de terreno emparejados con código y clientes; al ingresar, la app abre a cada persona su portal según su membresía (con selector si tiene varios). La marca del tenant dentro de la app sigue ADR-028; apps con marca propia por tenant quedan en backlog. (14) **Se puede marcar sin señal** como marca diferida (`origen_marca = offline_queue`): queda identificada como tal en los reportes a la DT y es visible para el trabajador (en su comprobante) y para su supervisor; no es la carga manual de contingencia.


**Nota del 29-oct-2026 sobre el punto 3 (CAR-70, Central de monitoreo).** Decisión de Carlos, 29-oct-2026, transmitida en la sesión de Claude de CAR-70 (PR #122): aprobó las 15 preguntas de `modulos/central.md` §14 tal como venían recomendadas (pregunta 9). La cola local sin conexión del punto 3 se amplía a los **mensajes a la central** (novedad, consulta y urgencia, con texto y fotos) y a los **acuses de recibo** de los avisos de la central: mismas reglas (IndexedDB, `idempotencyKey`, hora del dispositivo y sello de servidor al sincronizar, estado «pendiente de envío» visible). Una urgencia encolada muestra además «Llamar a la central» con el número del tenant. Detalle en `modulos/central.md` (R16, R17 y casos borde).

**Decisiones de Carlos (29-oct-2026, CAR-72).** Para Rondas (`modulos/rondas.md`, decisión 5 de la sección «Decisiones de Carlos (29-oct-2026)»): la app web vive **dentro de la app Terreno** (la misma app «OPAI» de este ADR, punto 1) y la publicación en Play Store (empaquetado de este ADR, punto 8) queda como **opción** para ese módulo, no obligatoria desde el día uno ni reservada a un hito posterior. No cambia el resto de este ADR; el momento exacto en que se ejecuta ese empaquetado para Rondas se resuelve al planificar el brief.

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

1. **Estándar (Carlos, 23-oct, prioridad):** la navegación entre módulos se siente **instantánea**, al nivel de las mejores apps SaaS: el shell y la barra lateral **persisten** sin parpadeo ni barra de progreso; el skeleton del contenido aparece a más tardar a los 200 ms (decisión de Carlos del 24-oct-2026, 17:57; antes decía «de inmediato»: si la página nueva llega antes, no se muestra esqueleto y se conserva la anterior); las rutas del menú se **precargan** (prefetch al estar visibles y al pasar el cursor, con datos cuando el costo lo permite); volver a un módulo ya visitado muestra **datos en caché** al instante y los revalida en segundo plano; las escrituras invalidan lo que cambian. Cada cambio de rendimiento se **mide antes y después** con el mismo protocolo (navegación Cuentas → Instalaciones → Personas → Cargos y sueldos → Configuración → Inicio, en escritorio y en celular con 4G simulado) y el resultado queda en el PR.
2. **Metas (p75):** respuesta visible (shell intacto; el esqueleto con la forma del contenido aparece **a más tardar a los 200 ms**, decisión de Carlos del 24-oct-2026 17:57, y solo si la página nueva aún no llegó); contenido con datos **< 1 s** en 4G y **< 500 ms** en escritorio; módulo ya visitado **< 100 ms** con datos de caché; TTFB del documento < 300 ms; **≤ 8 consultas a Neon por navegación** de lista o ficha; presupuesto de JS de ADR-037 y ADR-044.
3. **Arreglos (brief de rendimiento, el primero de la lista, antes de Comercial):** `Server-Timing` y contador de consultas por request; shell en el layout de cada portal con su propio `Suspense` y la página solo con su contenido; identidad, membresías y módulos activos cacheados por sesión (caché de cookie de Better Auth de corta duración e invalidación al suspender una membresía o un tenant) y por tenant con etiquetas (`use cache` + `revalidateTag` en las escrituras que los cambian); `forTenant` con una transacción interactiva por capacidad (fija `app.tenant_id` una vez) en vez de una por consulta, sin debilitar la RLS; contadores en una sola consulta y cargados después de pintar (o retirados de la barra lateral, a decidir); verificar cold starts (Fluid compute) y la suspensión de Neon en `main`; prefetch explícito de las entradas del menú y caché del router para segmentos dinámicos ya visitados (revalidación en segundo plano, invalidación por las Server Actions que escriben).
4. **Gate en CI:** (a) Playwright contra `next start` con Postgres de CI recorre la navegación entre módulos y falla si el skeleton tarda más de 200 ms o el servidor (por `Server-Timing`) más de 500 ms, o si una navegación supera las 8 consultas; (b) Lighthouse CI móvil ≥ 90 en Inicio, una lista y una ficha; (c) presupuesto de JS existente. Además, una medición sintética programada contra `test.opai.cl` después de cada despliegue (informativa, no bloquea) que el bot de Diseño y QA revisa.

**Nota de implementación (Brief 03, PR 2):** el cliente `pg` limita el pool por instancia y configura tiempos de espera y keepalive mediante variables de entorno; en Vercel avisa si el host de `DATABASE_URL` no contiene `-pooler.`. Estos valores son configurables y requieren medición con concurrencia en Neon; en el entorno de cierre solo se dispuso de conexiones locales, por lo que no se midió Neon ni se demuestra la resolución de P2039/P1017.

**Consecuencias.** Toda pantalla nueva declara en su brief sus consultas por navegación. Ningún arreglo de rendimiento se mezcla con PRs de documentación ni de funcionalidades.


**Decisiones de Carlos (24-oct).** (15) Se **quitan los contadores de la barra lateral**; los conteos quedan en Inicio y en las listas. (16) La sesión se valida contra la base como máximo cada **5 minutos** (caché de sesión), con invalidación inmediata al suspender una membresía o un tenant o al cambiar un rol. (17) La caché del navegador (Router Cache, `staleTimes`) es de **30 s** (24-oct, 17:39; antes 5 min en el PR #29); puede subirse cuando la época de sesión entre pestañas y la edad de la caché estén dadas por buenas. Es una sola constante: `apps/web/lib/cache-navegador.ts`.

---

## ADR-046 · Arquitectura de navegación por áreas

**Fecha:** 23-oct-2026 · **Estado:** vigente (aprobado por Carlos el 24-oct; respuestas en `PREGUNTAS-carlos.md`) · Completa ADR-003, ADR-007 y ADR-018. Mapa completo en `docs/2.0/NAVEGACION.md`.

**Decisión.** La barra lateral del ERP se organiza en **áreas** fijas (Comercial, Clientes, Operaciones, Personas, Finanzas, Documentos) más Inicio arriba y Configuración al pie; cada área agrupa entradas que aportan los módulos activos del tenant y que el rol puede leer, con un máximo de siete entradas por área. Lo que es parte de una entidad va como pestaña de su ficha (ADR-041), nunca en el menú. La forma principal de saltar es el buscador ⌘K (entidades, páginas y acciones) con recientes; los fijados del usuario van arriba de la barra. En el celular, barra inferior de cuatro entradas más «Más», según el área principal del rol. Los módulos declaran su entrada con `area` y `orden` en el manifest; un módulo apagado no deja rastro. Término único en el menú: «Personas» (el vocabulario de la vertical se usa en textos operativos, no en el nombre del área). Todo brief con pantallas respeta `NAVEGACION.md` y el bot de Diseño y QA lo verifica.

**Consecuencias.** `ItemNav` y el manifest ganan `area`; la barra lateral pasa a grupos plegables; el rediseño visual pasa por Claude Design (Design Prompt de navegación) antes del brief que lo implementa.


**Decisiones de Carlos (24-oct).** (17) **«Personas»** es el único término del área y la entrada (el vocabulario de la vertical queda para textos operativos). (18) Áreas aprobadas: Inicio, Comercial, Clientes, Operaciones, Personas, Finanzas y Documentos, con Configuración al pie. (19) La barra inferior del celular se adapta al área principal del usuario, con Inicio y Buscar fijos. `NAVEGACION.md` pasa a ser obligatorio para todo brief con pantallas.

---

## Adenda ADR-046 · Menú «Más» del teléfono: variante A, un solo buscador y barra superior sin solape (CAR-182)

**Fecha:** 4-nov-2026 (20:29) · **Estado:** vigente · **Decisión:** Carlos (chat, 4-nov-2026: «para el Más de celular tomar la recomendada») · **Implementa:** Claude (constructor, Sesión 1). Diseño en `design/export-inicio-mas/`.

**Decisión.** (1) El menú «Más» usa la **variante A** del diseño: lista compacta con filas de 48 px, áreas plegables (encabezado de 48 px con ícono, nombre, conteo y chevron), solo el área activa abierta por defecto y lo que el usuario abre se recuerda por usuario y empresa en el navegador (preferencia de interfaz, como los recientes; no es dato de negocio ni lleva herramienta MCP). (2) «Fijados y recientes» va una sola vez, en una fila de hasta cuatro accesos rápidos bajo la búsqueda; las entradas fijadas que también están en las áreas llevan un pin. (3) **Un solo buscador en el teléfono:** el campo de «Más» se escribe en su lugar y el ícono de buscar de la barra superior abre la misma hoja en modo búsqueda, con el texto «Buscar o ir a…» y los mismos resultados (`core.buscar`, sin capacidades nuevas). Escritorio e iPad no cambian. (4) Barra superior a 375 px: el selector de portal trunca el nombre de la empresa y «ERP» pasa al interior del selector. (5) Cada entrada del menú tiene su propio ícono (sin repetidos dentro de «Más»).

**No cambia.** El mapa de áreas, la barra inferior, la barra lateral de escritorio y el riel de iPad, los permisos y las capacidades. **Inicio** no se implementa con esta decisión (lo pidió Carlos el 5-nov-2026 y se implementó en CAR-182 sobre las láminas 01 a 07; sin capacidades nuevas).

**Adenda (5-nov-2026, decisión de Carlos, CAR-199): las áreas abiertas de «Más» se guardan en el navegador.** Las áreas que la persona abre en el menú «Más» se guardan **en el navegador**, con la clave `opai_mas_areas_<época>` (por usuario y empresa), igual que los recientes. Es una preferencia de interfaz, no un dato de negocio: **no lleva herramienta MCP** (ADR-055) y **no pasa a preferencia de servidor**. Queda confirmado; si algún día se quiere que siga a la persona entre dispositivos, es una decisión nueva.

## ADR-047 · Especificación funcional aprobada antes de diseñar o construir un módulo

**Fecha:** 23-oct-2026 · **Estado:** vigente (pedido de Carlos, 23-oct) · Completa ADR-012 y ADR-043.

**Decisión.** Antes del Design Prompt de cualquier módulo se escribe `docs/2.0/modulos/<modulo>.md` en lenguaje de negocio, con la plantilla `docs/2.0/modulos/_plantilla.md` (objetivo; entidades y relaciones; pantallas y pestañas; campos y validaciones; reglas numeradas; estados y transiciones; permisos por rol y portal; eventos y notificaciones; herramientas MCP; integraciones; mejoras sobre 1.0 y lo que no se porta; casos borde; criterios de aceptación; preguntas abiertas). Carlos la aprueba antes de cualquier diseño o código. La extracción de 1.0 (`extraccion/`) y los ADR son sus insumos; la especificación es lo que el diseño y el brief citan.

**Ciclo de cada módulo:** extracción de 1.0 (si existe en 1.0) → **especificación** → aprobación de Carlos → Design Prompt → diseño aprobado → brief → PR (Claude) → revisión (Revisor) → integración con squash por el bot «OPAI 2.0» cuando se cumplen las condiciones de ADR-043 v3 (Carlos puede vetar) → QA en pantallas (Diseño y QA) *(ciclo actualizado por ADR-043 v3, 24-oct)*. Al cerrar cada brief, el reporte termina con un **resumen ejecutivo para Carlos** (cinco líneas como máximo: qué se hizo, qué cambia para Gard, qué decide él, qué sigue) que también queda en `ESTADO.md`.

**Consecuencias.** Comercial y CPQ ya tienen extracción y ADR-040/042: su especificación se escribe a partir de ellos antes del Design Prompt. El formato del brief agrega la sección 17 «Resumen ejecutivo».

---

## ADR-048 · Módulos vendibles por separado: dependencias duras y fuentes opcionales

**Fecha:** 25-oct-2026 · **Estado:** vigente (decisión de Carlos, 25-oct-2026; preguntas respondidas por Carlos el 25-oct-2026 23:10, nota al final: Nómina exige Puestos) · Completa ADR-003 y ADR-036; **modifica** ADR-030. Modifica el orden de dependencias de `ROADMAP.md` (Nómina ya no depende de la fase 4).

**Contexto.** ADR-003 exige que un módulo apagado no rompa a otro, pero el plan encadenaba módulos operativos: Nómina «sobre asistencia», la pauta con «asistencia de hoy» y Asistencia contra puestos de Operaciones. Así, un cliente que solo quiere Nómina o solo Asistencia tendría que comprar la cadena entera.

**Decisión.**

1. **Regla.** Cada módulo vendible depende **solo del núcleo**. Los demás módulos son **fuentes opcionales**: si el tenant los tiene activos, el módulo los usa; si no, ofrece **entrada manual o importación**. Nunca hay una dependencia dura entre módulos operativos. Las únicas dependencias duras son las ya decididas: **CPQ → Comercial** (ADR-040: no hay cotización sin negocio) y **Licitaciones → CPQ** (ADR-030 y documento de arranque: Licitaciones se construye sobre el motor CPQ).
2. **Cómo se usa una fuente.** El manifest declara `dependencias` (solo núcleo, más las dos dependencias duras del punto 1) y, aparte, sus **fuentes opcionales**. Un módulo no importa código de su fuente: lee lo que la fuente publica a través de un contrato del núcleo (tipo en `packages/domain`, entregado por capacidad o evento). Con la fuente apagada, la pantalla y las capacidades siguen funcionando con la entrada manual o la importación, sin errores ni pestañas vacías.
3. **Contrato de la fuente para el tiempo trabajado: «resumen del periodo por persona».** Tipo puro en `packages/domain`, por persona y periodo: días trabajados, horas ordinarias, horas extra, ausencias por tipo (según un catálogo de tipos de ausencia que se fija en la especificación de Nómina) y **origen** (`manual`, `importacion`, `pauta` o `asistencia`). Horas en minutos enteros; fechas de calendario en la zona del tenant. Lo producen la entrada manual, la importación Excel, Operaciones (desde la pauta) y Asistencia (desde las marcas); lo consume Nómina y puede consumirlo cualquier módulo futuro.
4. **Tabla por módulo.** Las filas de Nómina, Operaciones y Asistencia y el anexo de contrato son decisión de Carlos; las demás filas y lo marcado como *(propuesta)* se confirman en la especificación de cada módulo (ADR-047).

| Módulo | Necesita del núcleo | Fuentes opcionales | Qué pasa cuando falta cada fuente |
|---|---|---|---|
| **Nómina / Payroll** | Personas, vínculo laboral, cargos, estructuras de sueldo (capas de ADR-036), anexos de contrato, documentos | Operaciones (pauta), Asistencia (marcas) | Sin ninguna: días, horas y ausencias del periodo por **entrada manual o importación Excel** del resumen del periodo. Sin Asistencia: el resumen sale de la pauta. Sin Operaciones: sale de las marcas. **La liquidación es la misma en los tres casos** y guarda el origen de los días. |
| **Operaciones** (puestos, asignaciones y pauta) | Instalaciones, puestos, personas, vínculo laboral | Asistencia | Sin Asistencia: la pauta diaria muestra **«confirmar cobertura»**, un registro operativo que **no es la marca legal** para la DT. La pestaña **«Asistencia de hoy»** aparece solo con Asistencia activa. |
| **Asistencia** | Personas, vínculo laboral (jornada pactada), instalaciones, documentos | Operaciones (puestos, asignaciones y pauta) | Sin Operaciones: se marca contra la **jornada pactada del vínculo laboral**, sin necesidad de un puesto. *(Propuesta: con Operaciones, se marca contra el turno de la pauta, y los reportes DT salen en ambos casos.)* |
| **CPQ** | Cuentas, instalaciones, cargos, puestos, estructuras de sueldo | — (depende de **Comercial**, ADR-040) | No se vende sin Comercial. |
| **Licitaciones** | Cuentas, instalaciones, documentos | — (depende de **CPQ**, ADR-030) | No se vende sin CPQ (y, por lo tanto, sin Comercial). |
| **Comercial** | Cuentas, contactos, instalaciones, etiquetas, actividad | CPQ | Sin CPQ: el negocio lleva valor mensual manual y no tiene pestaña de cotizaciones. |
| **Rondas** (ADR-024) | Instalaciones, personas, documentos | Operaciones | Sin Operaciones: la ronda se asigna a la instalación y a personas, no a un turno de la pauta. |
| **Tickets** (ADR-025) | Cuentas, instalaciones, personas | Todos | Funciona solo; los vínculos a entidades de otros módulos aparecen cuando esos módulos están activos. |
| **Finanzas** | Cuentas, instalaciones, documentos | Comercial y CPQ (facturación desde lo vendido), Nómina (remuneraciones al flujo de caja) | Sin ellos: facturación y egresos por entrada manual o importación. |

5. **Anexo de contrato en el núcleo.** Vive junto a `core.vinculos_laborales` y `core.documentos`, para que funcione aunque el tenant no tenga Nómina. Un cambio de rol, de capa de sueldo, de monto o de instalación (ADR-036, actualización del 25-oct) **genera solo el borrador** del anexo, con la marca del perfil del tenant (ADR-028): hasta el Brief 09 se usa una plantilla base del sistema, y desde el editor de plantillas del Brief 09 el tenant la puede reemplazar por la suya; **RRHH lo aprueba** y el documento queda en `core.documentos` con su bitácora (ADR-039).
6. **Pauta por series y excepciones.** La pauta guarda solo las **series** (el patrón con su fecha de inicio de ciclo) y las **excepciones** (ausencias, reemplazos, PPC, turnos extra), y **calcula el resto**. Nunca guarda una fila por trabajador por día. Al repintar (cambiar una serie o su inicio de ciclo) **no se modifican los días pasados ni los días que ya tienen marca**. Esta regla pasa a `extraccion/operaciones.md` y a `modulos/operaciones.md` cuando se escriban (hoy no existen; ver `ROADMAP.md`, fase 3).
7. **Capacidades, paridad, auditoría y aislamiento.** Todo lo que este ADR agrega se expone como capacidad (`defineCapability`), igual que el resto de OPAI (ADR-004, ADR-034):
   - **Resumen del periodo:** la entrada manual y la importación son capacidades de escritura con `dry_run` (la importación devuelve una vista previa de filas válidas y errores antes de escribir) e `idempotencyKey`; su lectura también es una capacidad.
   - **Anexo de contrato:** generar el borrador, aprobarlo y rechazarlo son capacidades con `dry_run` e `idempotencyKey`; la aprobación es una acción humana de RRHH y, para agentes, pide aprobación (`APPROVAL_REQUIRED`).
   - **Paridad:** las tres (resumen, importación y anexo) están disponibles con los mismos permisos en la UI, en la API v1 y en el MCP, y toda escritura real queda en `core.audit_events`.
   - **Aislamiento:** las tablas nuevas o ampliadas del núcleo (anexos de contrato, resumen del periodo si se persiste, y los campos nuevos de `core.vinculos_laborales`: instalación, puesto y jornada pactada) llevan `tenant_id` con RLS y la política `tenant_isolation` (ADR-002), en migraciones aditivas.

**Consecuencias.**

- Nómina I deja de depender de la fase 4: liquida sobre el resumen del periodo y **se puede adelantar** si hay un cliente que la quiera comprar sola (`ROADMAP.md`).
- `core.vinculos_laborales` necesita la instalación (y el puesto, opcional) para resolver la capa de sueldo sin Operaciones; se define en el brief que implemente las capas (pregunta abierta 1).
- La **jornada pactada** pasa a ser dato del vínculo laboral en el núcleo (es parte del contrato y la necesita Asistencia sin Operaciones). Modifica la asignación de ADR-036, que la dejaba como faceta de Asistencia y Portales; PIN y Face ID siguen siendo de Asistencia.
- El manifest (`defineModule`) gana la declaración de fuentes opcionales; se implementa en el primer brief que tenga una (Operaciones o Nómina).
- Cada especificación de módulo (ADR-047) incluye la sección «Sin la fuente X» con lo que muestra y lo que pide cuando falta cada fuente.
- Este ADR no agrega código ni migraciones.

**Preguntas abiertas para Carlos** (con recomendación; no bloquean este ADR):

1. **Capa de sueldo sin Operaciones.** Recomendación: el vínculo laboral guarda la instalación (obligatoria) y el puesto (opcional); con Operaciones activa, el puesto de la asignación vigente manda.
2. **Dos fuentes activas a la vez** (pauta y asistencia). Recomendación: un ajuste de Nómina por tenant (ADR-038) elige la fuente del resumen, con asistencia por defecto cuando está activa; las diferencias entre pauta y marcas se muestran antes de cerrar el periodo.
3. **CPQ con instalación nueva.** Recomendación: el sueldo se define en la línea cotizada y, al ganar el negocio, se ofrece crearlo como capa de instalación o de puesto.
4. **Repintar la pauta el día de hoy.** Recomendación: hoy se trata como pasado si ya tiene una marca o una cobertura confirmada en la serie; si no, el cambio rige desde hoy.

**Respuestas de Carlos (nota del 25-oct-2026; Decisión de Carlos, 25-oct-2026 23:08–23:10 (t263u–t265u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0)).** Las cuatro preguntas quedan **respondidas**; el texto de arriba (preguntas y recomendaciones) se conserva como historia. El Brief 07b ya no está bloqueado por este ADR.

1. **Capa de sueldo sin Operaciones → Nómina exige Puestos.** Payroll (Nómina) **exige el módulo Puestos (Operaciones I)**: el sueldo sale de la capa de instalación o de puesto (ADR-036). **Modifica el punto 1 y la tabla del punto 4:** Nómina ya no se vende solo con el núcleo; depende del núcleo y de Puestos. Las dependencias duras pasan a ser tres: CPQ depende de Comercial, Licitaciones depende de CPQ y **Nómina depende de Puestos (Operaciones I)**.
2. **Fuente de los días trabajados.** Los días trabajados salen de **Asistencia**, por Face ID o por la marca manual en la asistencia diaria. **La pauta solo define los turnos de cada guardia y no alimenta la nómina.** **Modifica la fila de Nómina de la tabla del punto 4 y el punto 3:** la pauta deja de ser origen del resumen del periodo para Nómina. Sin Asistencia, sigue lo ya definido en este ADR: entrada manual o importación Excel del resumen del periodo; el detalle de ese caso queda como pregunta abierta para la especificación de Nómina.
3. **CPQ con instalación nueva.** El disparador es **ganar el negocio**, no la cotización. Al ganarlo, cada línea de guardias de la cotización se **ofrece** para crear su puesto con el **sueldo bruto cotizado**, y **RRHH lo confirma**. Si la línea no tiene sueldo, el puesto se crea y toma el sueldo de la instalación, que RRHH completa. Una cotización sin guardias (por ejemplo, de cámaras) no crea puestos ni sueldos. Detalle en `modulos/cpq.md` y en la nota del punto 3 de ADR-040.
4. **Repintar la pauta el día de hoy.** Si el día en curso ya tiene una marca de asistencia o una cobertura confirmada, se trata como pasado y no se cambia; si no tiene ninguna, el cambio rige desde hoy.

**Nota del 25-oct-2026 sobre el punto 6 (CAR-10).** La regla de la pauta por series y excepciones ya está en `extraccion/operaciones.md` (§3, esqueleto, solo la regla general) y en `modulos/operaciones.md` (R11, borrador), donde además está el trato del día de hoy que respondió Carlos (respuesta 4 de arriba).

**Nota del 29-oct-2026 (CAR-80, catálogo del Núcleo 17:36–17:39 CLT; C8 y C9).** Dos precisiones de dependencias:

- **C8 · Acceso → Terreno con dispositivos del Núcleo.** El Control de acceso físico y el portal Terreno no dependen uno del otro: el **emparejamiento y la gestión de dispositivos fijos** (quiosco) vive en el **Núcleo** (`core.dispositivos`), y tanto Acceso como Terreno, Asistencia y Rondas usan ese servicio común. El shell del portal Terreno lo construye **CAR-78**; los dispositivos entran antes del PR de Rondas que los necesita (`ROADMAP.md`).
- **C9 · Nómina exige solo `core.puestos`.** La dependencia dura de Nómina es la **tabla de puestos del Núcleo (`core.puestos`)** para resolver la capa de sueldo (ADR-036), **no el módulo Operaciones completo** (pauta, asignaciones ni asistencia). Precisa la respuesta 1 del 25-oct («Nómina exige Puestos»): basta el puesto del núcleo; la pauta y la asistencia siguen siendo fuentes opcionales.

---

## ADR-049 · Agente interno de OPAI

**Fecha:** 26-oct-2026 · **Estado:** Aceptado (CAR-80, 29-oct-2026; propuesto en PR #38). Fuentes: Decisión de Carlos, 26-oct-2026 10:08 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0): «ok» a la recomendación del bot de las 10:07; «El agente interno debe pedir confirmación y debe tener niveles de confirmación, que apruebe todo o que confirme, como lo hacen los agentes de IA. […] cada tenant pone sus key para poder usar el modelo de lenguaje que ellos quieran. Entonces, en el agente ellos pueden cambiar el modelo de lenguaje según los que tengan conectado. […] se vende como un módulo aparte, por supuesto. Sí o sí es un módulo aparte del agente interno.» — Carlos, 26-oct-2026 10:51 CLT, chat con el Revisor OPAI 2.0 (t117u; dictado por voz); «Ok, después del CPQ» — Carlos, 26-oct-2026 10:53 CLT, chat con el Revisor OPAI 2.0 (t120u); «o el consumo por IA lo cobro yo como opai? no sera mejor asi? / sin tope y a mano» — Carlos, 26-oct-2026 11:12 CLT, chat con el Revisor OPAI 2.0 (t122u); «ok, así» — Carlos, 26-oct-2026 11:17 CLT, chat con el Revisor OPAI 2.0, aprobando la propuesta de cobros del bot OPAI 2.0. · Modifica ADR-032 (nota del 26-oct-2026) y ADR-030 (el asistente IA sale del backlog) · Completa ADR-004, ADR-031, ADR-033 y ADR-048.

**Contexto.** ADR-032 dejaba fuera los chats y copilotos propios, y el «chat o asistente IA» de 1.0 quedó en el backlog (ADR-030; brecha N8 de `paridad/nucleo.md`). A las 10:07 Carlos pidió incorporar un agente dentro de OPAI, en el celular y en el escritorio, que conviva con los agentes externos conectados por MCP; el bot recomendó cómo hacerlo y Carlos respondió «ok» a las 10:08. A las 10:51 y 10:53 precisó la confirmación, las keys de IA, la venta y el orden.

**Decisión.** Lo aceptado con el «ok» de las 10:08: (a) un ADR que deja al agente interno como cliente del MCP, con los permisos del usuario, auditoría y el costo de IA medido por tenant para poder venderlo como módulo; (b) reservar la entrada en ⌘K y en el celular, dentro del Brief 05; (c) un brief propio. Lo precisado a las 10:51, 10:53, 11:12 y 11:17 va en los puntos 4, 6, 7, 8 y 9.

1. **Agente propio** en el celular (PWA, ADR-044) y en el escritorio, que convive con los agentes externos.
2. **Cliente del mismo registro.** Es un cliente más del registro de capacidades (ADR-004) y del MCP. No tiene lógica de negocio ni herramientas propias: cada capacidad nueva queda disponible para él sin trabajo adicional.
3. **Identidad del usuario («agente vía usuario»).** Actúa con la identidad y los permisos del usuario conectado y ve solo lo que ese usuario puede ver, con el mismo alcance de filas (ADR-022).
4. **Confirmación obligatoria, con niveles que elige el usuario (10:51).** El agente siempre pide confirmación antes de escribir, mostrando la vista previa (`dryRun`; en MCP, `preview_…`). El usuario elige el nivel: **«aprobar todo»** (aprueba el plan completo de una vez) o **«confirmar paso a paso»** (confirma cada escritura). Sin confirmación no escribe. En cualquiera de los dos niveles, lo irreversible sigue con vista previa, auditoría y la aprobación humana de ADR-032 punto 3 (`APPROVAL_REQUIRED`), y cada escritura lleva clave de idempotencia. Reemplaza el criterio «según riesgo».
5. **Auditoría.** Toda acción queda en la auditoría como «agente interno vía <usuario>».
6. **Key de IA propia por tenant y elección del modelo (10:51).** Cada tenant conecta su propia key de modelo de lenguaje y, dentro del agente, el usuario elige el modelo entre los que su tenant tenga conectados. OPAI mide el uso por tenant (tokens y llamadas en `core.consumos`, ADR-031). El cobro sigue el punto 9. Las keys del tenant:
   - se guardan cifradas en el almacén de secretos del núcleo, aisladas por `tenant_id` con RLS (ADR-002, ADR-027), con una prueba `test:db` entre dos tenants;
   - nunca quedan en texto plano, logs, auditoría, respuestas de la API ni en el cliente; una vez guardadas solo se reemplazan o revocan, no se leen;
   - solo las usa el adaptador de IA del núcleo en el servidor, así que nada específico del proveedor entra en los módulos (ADR-031, ADR-032). Los módulos siguen pidiendo IA por clase de tarea; la elección de modelo es del usuario dentro del agente.
   - **Respaldo solo entre keys propias; nunca a OPAI (21:58).** Si el tenant tiene key propia y su proveedor falla, el respaldo entre proveedores solo prueba otras keys del **mismo tenant**; **nunca** cae a la key de OPAI (plataforma). Si todas sus keys fallan (5xx, 429 o red), la solicitud falla con un error tipado (`ErrorRespaldoIa`) y se avisa al tenant: la integración queda en estado «error» (visible en Configuración → Integraciones) y se emite `core.integracion.error`, que entrega Comunicaciones (ADR-020), además de un registro de auditoría durable. Un 4xx de contenido se propaga tal cual (no es caída de la key). Sin key propia, se usa el modelo de OPAI como hasta ahora (punto 9). **«Decisión de Carlos, 26-oct-2026 21:58 CLT, respuesta t214s684»** a «Si el tenant tiene key propia y su proveedor falla, ¿se puede pasar a la key de OPAI?»: «Nunca, que falle y avise al tenant».
7. **Módulo vendible aparte (10:51; ADR-048).** El agente es un módulo propio, que se vende aparte. Depende del Núcleo y del MCP; los demás módulos son fuentes opcionales: opera únicamente las capacidades de los módulos activos en el tenant y permitidas al usuario.
8. **REEMPLAZADO** por la enmienda al punto 8 (26-oct-2026 21:07, t461s2118). **Cuándo (10:53).** Se construye en un brief propio **después de CPQ**. Orden: Puestos → Comercial → CPQ → agente interno. Antes solo se reserva su punto de entrada: la acción «Preguntar a OPAI» en ⌘K y un lugar dentro de «Buscar» en el celular (integrada en `main` (PR #37, `7e526eb`)).

**Enmienda al punto 8 · adelanto al Núcleo (NÚCLEO-E2).** Origen: Carlos,
26-oct-2026 20:47 CLT, chat con OPAI 2.0 (t457u): «ponlo entonces en el plan de
desarrollo para que todo se haga y lo que debamos hacer en el nucleo lo hagamos
altiro. Me preocupa que, quede como, cien por ciento agéntico, que el MSP y el,
el agente interno de cada tenant funcione». decisión de Carlos por widget t461s2118 del 26-oct-2026 21:07 CLT, opción elegida: Sí, el agente interno de cada tenant va antes de CPQ. Esta enmienda reemplaza únicamente el orden del punto 8;
la orquestación del servidor se adelanta al cierre del Núcleo. La UI queda para
un PR posterior con export aprobado de Claude Design, siempre con el Design
System de OPAI 2.0; no se autoriza construir pantallas sin ese export.

**Mecanismo de identidad y confirmación (NÚCLEO-E2, adaptación técnica de OpenCode).**
El servidor delega la sesión como actor `agent`, id `agente-interno:<usuario>`,
`via_user` igual al usuario y `apiKeyId` nulo, conservando sus permisos efectivos,
portal y alcance. No crea una key sintética ni hereda acceso de plataforma.
Los planes se firman con la clave de autenticación ya existente en el servidor,
ligados a tenant, usuario, portal y acceso, con vigencia técnica de una hora.
La reserva de idempotencia del núcleo serializa aceptar/rechazar y los pasos;
el ledger atómico de C también admite el presupuesto conjunto del agente interno
por tenant. No hay memoria ni tablas conversacionales nuevas: el caché temporal
de idempotencia conserva el resultado durante 24 horas y se purga con el trabajo
existente. El historial nuevo devuelve solo metadatos de acciones propias.

**Lo que aplica de ADR ya vigentes.**

- **Conversaciones y memoria aisladas por tenant (ADR-002):** si el brief guarda conversaciones, mensajes, historial o memoria del agente, cada tabla lleva `tenant_id` con RLS y la política `tenant_isolation`, y una prueba `test:db` demuestra el aislamiento entre dos tenants, incluido el mismo usuario en dos empresas. Si no se guardan, el brief lo dice.
- **Texto de terceros (REGLAS-codigo, «Agéntico»):** lo que el agente lea de terceros vuelve en campos externos y nunca habilita escrituras irreversibles. Sin keys compartidas entre agentes (ADR-034; rige para las keys de OPAI, no para las keys de IA del tenant del punto 6).

9. **Cobro (11:17; «ok, así» — Carlos, 26-oct-2026 11:17 CLT, chat con el Revisor OPAI 2.0, aprobando la propuesta de cobros del bot OPAI 2.0).**
   - El agente interno es un módulo con **licencia mensual propia** (ADR-048).
   - **Con la key del tenant:** se cobra solo la licencia. El consumo igual se mide en `core.consumos`, para auditoría y reportes, pero no se cobra.
   - **Con el modelo de OPAI:** se cobra la licencia más el consumo a costo con margen, a mes vencido. El margen no está decidido.
   - **Sin tope de consumo por defecto** («sin tope y a mano» — Carlos, 26-oct-2026 11:12 CLT, chat con el Revisor OPAI 2.0, t122u). El tenant puede fijar un presupuesto opcional, con aviso al 80 %, sobre el presupuesto de ADR-031 (0 o nulo = sin límite), controlado en el servidor.
   - **Los demás consumos variables** (WhatsApp, SMS, biometría, firmas, mapas) se cobran a costo más margen sobre lo medido.
   - **Las licencias por módulo y todos los montos** (incluido el margen) viven en **ADR-058** (planes y precios por capas): el agente interno es un módulo con licencia por empresa. Los montos no se fijan hasta que exista Opai SpA.

**Consecuencias.** El agente interno no crea un segundo camino a los datos: si una acción no existe como capacidad, tampoco existe para él. Sigue sin haber copilotos por módulo ni chats entre personas (Tickets sigue sin chat, ADR-025). El número del brief y el mecanismo de la identidad delegada se fijan al planificarlo.

---

## ADR-050 · Paridad del repo con el DS V2 de Claude Design: shell y bordes de controles

**Fecha:** 26-oct-2026 · **Estado:** vigente · **Reemplaza** la D7 del Brief 05 (`briefs/BRIEF-05-navegacion.md` §4.2 y `NAVEGACION.md` §10) y lo que decía CAR-12 sobre la búsqueda en la barra superior del teléfono · **Completa** ADR-014.

**Contexto.** El informe de Diseño y QA del 26-oct-2026 17:53 comparó el repo (`packages/ds` y `apps/web`) con el design system aprobado «OPAI 2.0 Design System V2» (Claude Design 44e4d7b9). Los tokens coinciden, pero el shell se había apartado del diseño (la búsqueda del teléfono pasó a la barra inferior por la D7) y los bordes de los controles (`border-strong`, `#d4d4d8` sobre blanco, 1,5:1) no cumplen el contraste de 3:1 de WCAG 1.4.11.

**Decisión** (Carlos, 26-oct-2026 17:57, en sus palabras: «El shell sigue el diseño de Claude; que el repo se ajuste» y «Sí, oscurecer los bordes para cumplir accesibilidad»):

1. **Shell como en el export** (`docs/2.0/design/export-ds-2.0/pantallas/ShellPhone.html`, `ShellTablet.html` y `ShellDesktop.html`): en el teléfono «Buscar» vuelve a la barra superior de 52 px (portal, Buscar, campana y avatar) y sale de la barra inferior; en el riel no va el wordmark «OPAI» sobre el selector y la búsqueda se ve como en el export; en escritorio el usuario va al pie de la barra lateral y el selector de portal es la tarjeta del export.
2. **Borde de controles:** token `--ds-border-control` (`#8a8a93` en claro, `#6b6b74` en oscuro, ≥ 3:1 sobre `surface` y `bg`) en Input, Select, Combobox, Textarea, Checkbox, Radio y la pista apagada del Switch. `border` y `border-strong` quedan para separadores y tarjetas.

**Alcance y límites.** ADR-050 invierte, solo para el shell y los bordes de controles, la regla «en los choques entre el export y el código manda el código» de `PLAN-desarrollo.md`. No toca la D9 (barra lateral de escritorio desde 1024 px), que Carlos ya aprobó (`briefs/BRIEF-05-navegacion.md` D9, línea 84; Carlos, 26-oct-2026 11:03 CLT): el repo mantiene hoy el riel hasta 1279 px, como en el DS V2 de Claude Design, y ShellTablet queda como referencia del riel; implementar la D9 (bajar el corte a 1024 px) es un encargo de código aparte, no una decisión pendiente. Fuente de la cita: chat Diseño y QA OPAI 2.0, tarjeta t58s257, 26-oct-2026 17:57 CLT. El informe de Diseño y QA (17:53) no está en el repo. En el export de `pantallas/`, `#2A2A2F` pasó a `--ds-border` (`#26262A`) y `#1F1F23` a `--ds-fill` (`#202024`): diferencias de un tono, aceptadas para no tener grises fuera de tokens.

**Consecuencias.** La D7 deja de regir: el teléfono no tiene «Buscar» en la barra inferior, que vuelve a tener hasta cuatro ítems de navegación más «Más». Un test de `packages/ds` verifica el contraste de los tokens en claro y oscuro.

---

## ADR-052 · Auditoría atómica y encadenada por tenant

**Fecha:** 28-oct-2026 · **Estado:** vigente · Completa ADR-004 y ADR-023 (misma técnica de cadena de hashes que la bitácora de Asistencia, aplicada aquí a `core.audit_events`).

**Contexto.** Carlos pidió esta auditoría el 26-oct-2026 20:47 CLT (chat con OPAI 2.0, tarjeta t457u): «ponlo entonces en el plan de desarrollo para que todo se haga y lo que debamos hacer en el núcleo lo hagamos altiro». El núcleo tenía dos huecos: (1) `executeCapability` escribía la fila de `audit_events` DESPUÉS del handler y fuera de su transacción (si el insert fallaba o el proceso se caía entre los dos, la escritura quedaba sin rastro); (2) la migración inicial daba UPDATE/DELETE a `opai_app` sobre `audit_events`, así que la auditoría era mutable para la app pese a describirse como append-only (el PR #56, antes de este encargo, ya revocó ese permiso).

**Decisión.**

1. **Atómica.** Para toda capacidad con efecto distinto de lectura y tenant actual, `executeCapability` abre una única transacción: el handler corre dentro (su `ctx.db`/`ctx.transaccion` apuntan a esa misma transacción, así que un `ctx.transaccion` interno la reusa en vez de abrir otra) y el insert de `audit_events` va antes del commit. Un fallo del insert revierte la escritura; un fallo del handler nunca llega a auditar. Se audita también cuando el output no valida (antes esa escritura quedaba sin rastro). Para `platform.*` sin tenant actual (`tenantObjetivo` resuelve el tenant objetivo), no existe una transacción común posible porque el handler escribe con `ctx.plataforma.paraTenant` fuera de `ctx.transaccion`: se audita aparte, en una transacción propia del tenant objetivo (`ctx.plataforma.transaccionPara`), atómica respecto del insert de auditoría pero no respecto del handler (brecha conocida, documentada, no resuelta por este ADR). *Nota CAR-36/40/41 (28-oct-2026): lo `platform.*` se audita además (y, sin objetivo, solo) en la auditoría global `core.auditoria_global`; `transaccionPara` se reemplaza por `auditarEnObjetivo` (global antes que empresa) y `paraTenant` por `empresa(id)`.*
2. **Encadenada.** `core.audit_events` suma `seq` (entero por tenant), `hashAnterior`, `hash` y `hashCanon`, con el mismo algoritmo de `@opai/domain` que ya usaba `core.bitacora` (ADR-023): `hash = sha256(hashAnterior + "\n" + hashCanon)`. `hashCanon` congela la forma canónica del evento (tenant, seq, actor, capability, entidad, `createdAt` y un **digest** SHA-256 del payload, no el payload crudo) para que una futura anonimización del payload (Ley 21.719) no invalide hashes ya emitidos: la verificación nunca vuelve a leer el payload en vivo, solo compara `hashAnterior`/`hashCanon`/`hash` almacenados. La concurrencia del mismo tenant se serializa con `pg_advisory_xact_lock` (mismo patrón que `bloqueo-login.ts` e `incidentes-comun.ts`), dentro de la transacción de la escritura: sin TOCTOU entre escrituras simultáneas. Las filas previas a esta migración se completan con un backfill determinista (orden `created_at, id`, por tenant) en la misma migración.
3. **Inmutable.** La migración repite (idempotente) el `REVOKE UPDATE, DELETE` sobre `audit_events` para `opai_app` que ya aplicó el PR #56; el dueño de la base conserva el acceso (scripts, migraciones y la prueba de alteración de `verificarAuditoria`).
4. **Verificable.** `core.auditoria.verificar` (lectura), `platform.auditoria.estado` (plataforma, solo lectura) y un trabajo diario que recorre la cadena por lotes y emite `core.auditoria.rota` si se rompe, igual que el patrón ya existente de `core.bitacora.verificar`/`core.bitacora.rota`. El estado de la última verificación se guarda en `core.auditoria_cabezas` (una fila por tenant), como `core.bitacora_cabezas` para la bitácora de hechos regulados.

**Consecuencias.** `Auditoria.registrar` ahora recibe la transacción (`tx`), igual que `Eventos`/`Trabajos`/`BitacoraServicio`: todo código que lo llamaba fuera de una transacción (el flujo de aprobación pendiente de agentes, el aviso de respaldo de IA agotado) se ajustó para auditar dentro de una transacción propia, sin cambiar su semántica. `seq`/`ultimoSeq` son `Int`, no `BigInt` como pedía el encargo original: un `BigInt` de Prisma no es serializable con `JSON.stringify` sin un reemplazador, y varias pruebas y vistas de actividad ya hacían `JSON.stringify` sobre filas de `audit_events` completas; `Int` basta de sobra (2,1 mil millones de escrituras por tenant) y es el mismo tipo que ya usa `core.bitacora.seq`. `REGLAS-codigo.md` incorpora la regla «toda escritura se audita en su transacción».

**Corrección del 27-oct-2026 (encargo PR #71, QA A/B/C y review 5662759713).**
Reemplaza la promesa de anonimización transparente y la verificación del punto 2:
se recalcula el canon desde el contenido actual, incluido el digest del payload.
Los cambios de contenido se detectan; una anonimización futura necesita un protocolo
explícito. Se conserva el canon SQL histórico y el JSON nuevo, verificando ambos
contra sus columnas. La verificación toma el lock de append y conserva el máximo
previamente verificado para detectar truncados. Plataforma con `tenantObjetivo`
audita siempre en ese destino, aun con empresa seleccionada (la brecha de atomicidad
con su handler sigue declarada). Los diagnósticos de IA usan una transacción
explícitamente independiente, no la reutilizada por la solicitud. La expansión
nullable y el NOT NULL se aplican antes y después del despliegue, respectivamente.
Detalles técnicos del constructor OpenCode / openai/gpt-6.1-sol y orden exacto en
`briefs/FIX-auditoria-atomica-pr71.md`; no se atribuyen nuevas decisiones a Carlos.
**Corrección de la segunda ronda de QA del PR #71 (encargo N1/N2/N3).** Reemplaza
el lock durante el escaneo y la capacidad de lectura del punto 4: solo el job
verifica, con snapshot acotado, canon SQL por lotes, checkpoint incremental y CAS
por revisión bajo lock breve. La huella del prefijo conserva detección de contenido
antiguo alterado (escaneo SQL O(N), sin bloquear append); timeout propio. El job se
pausa entre expansión y contracción. Backfill por lotes con COMMIT, índice separado
CONCURRENTLY y CHECK NOT VALID → VALIDATE → SET NOT NULL → DROP CHECK. Son detalles
de implementación del constructor OpenCode / openai/gpt-6.1-sol dentro del encargo,
documentados con pruebas y reversión en el mismo brief y ESTADO; no decisiones de
negocio nuevas. Se conservan los timestamps existentes. Al incorporar main del
PR #70, el identificador de auditoría pasa a ADR-052: ADR-051 ya identifica la
identidad de servicio en main.

---
## ADR-051 · Identidad de servicio para agentes y presupuesto atómico (núcleo P0)

**Fecha:** 27-oct-2026 · **Estado:** vigente · Completa ADR-032 §3, ADR-033 y ADR-034 §1 («Sin keys compartidas… scope `*` es transitorio»).

**Contexto.** Carlos, 26-oct-2026 20:47 CLT, chat con OPAI 2.0 (t457u): «ponlo entonces en el plan de desarrollo para que todo se haga y lo que debamos hacer en el núcleo lo hagamos altiro. Me preocupa que, quede como, cien por ciento agéntico». Hasta este ADR, el principal de una key solo era usuario, cuenta o persona, y la key heredaba TODOS los permisos y el alcance de su responsable; Grokbot operaba con una key de scope `*`, responsable con rol owner en Gard y presupuesto nulo: la IA de desarrollo y la IA del producto compartían identidad y tenant real, y el presupuesto mensual no se chequeaba y consumía en la misma transacción.

**Decisión.**

1. **Permisos finos por key = subconjunto de los efectivos del responsable.** Campo `permisos` en `api_keys` (lista de ids del catálogo; `null` = hereda los del responsable, para compatibilidad) y `hereda_permisos`. La autorización cruza los permisos de la key con los efectivos del responsable (`permisoDeKey`, intersección); nadie crea una key con permisos que no tiene (`normalizarPermisosRol` sobre el acceso efectivo del creador). El scope `*` sigue permitido, con una advertencia visible: amplio y transitorio.
2. **Principal `servicio`:** agente del tenant sin dueño humano (integraciones, agentes alojados, bots de desarrollo). Su responsable es una persona solo para gobierno (aprobaciones y avisos); sus permisos salen exclusivamente de la key, nunca hereda rol ni alcance (alcance completo del tenant, nunca el del responsable). Exige presupuesto mensual mayor que cero y una lista de permisos explícita; un creador con alcance restringido no puede crear un servicio (no amplía su propio alcance). Auditoría «agente `<nombre>` (servicio)». `soloPersonas` sigue prohibido para cualquier key.
3. **Presupuesto mensual atómico por key:** `core.gasto_agente_mes`, con `pg_advisory_xact_lock` por tenant/key; el chequeo y el consumo van en la misma transacción (`UPDATE` con guarda `gastado + costo <= tope`), así que llamadas concurrentes nunca superan el tope. Aviso al 80 % y corte al 100 %, sin duplicados; si el tope cambia a mitad de período, los avisos de ese período se reinician (si no, un tope nuevo nunca volvería a avisar bajo la marca del tope anterior). El costo ya incurrido con un proveedor (IA, mapas, correo, almacenamiento) se registra siempre, aunque supere el tope en esa llamada: no puede rechazarse sin perder trazabilidad del gasto real; la ejecución en curso termina y la SIGUIENTE recibe `BUDGET_EXCEEDED` en el prepago de `capacidad.ejecucion` (antes del handler, el único punto donde negarse no pierde un gasto ya hecho).
4. **Tenant `gard-staging`:** decisión de Carlos, 26-oct-2026 21:07, t461s2118: sí, se crea, con una key por bot y permisos mínimos. Script idempotente `pnpm --filter @opai/db seed:staging`, que no corre en este PR; el bot OPAI 2.0 lo aplica en Neon cuando el PR esté aprobado. La key owner `*` de Gard se revoca cuando las keys nuevas estén funcionando, y la revocación la hace el bot OPAI 2.0 en operación, no este PR.
5. **Cambios de rol base y promoción a owner, solo por una persona** (agregado del Revisor, review 5661003883 del #60; mandatos de Carlos t365u y t366u de cerrar el Núcleo): el mismo `FORBIDDEN` que ya protegía `roleId` ahora cubre también `rol` cuando la llamada viene de un agente o de una API key.

**Consecuencias.** Migración aditiva `20261028030000_identidad_servicio` (RLS en `gasto_agente_mes`, sin `BYPASSRLS`). `CONTEXTO-agentes.md` documenta que la IA de desarrollo opera en `gard-staging` con su propia key de servicio y que la key `*` owner de Gard debe revocarse cuando corresponda (decisión de Carlos). Pendiente, fuera de este ADR: la reserva previa (antes de llamar al proveedor) para recursos de costo variable no determinista por adelantado sigue sin existir; hoy la atomicidad protege el chequeo-y-consumo del ledger, no una reserva anticipada del costo exacto de una respuesta de IA.

## ADR-053 · Tope por concepto de sueldo

**Fecha:** 27-oct-2026 · **Estado:** vigente.

**Decisión.** Los montos de sueldo admiten hasta 100.000.000 CLP por concepto. Fuente: «Ok con el tope» — Carlos, 27-oct-2026 20:46 CLT, chat con el Revisor OPAI 2.0 (t311u), transmitida por el Revisor.

## ADR-054 · Flujo operativo del 28-oct-2026

**Fecha:** 28-oct-2026 · **Estado:** vigente · **Reemplaza a ADR-043 v3 en lo que choque** (y, con él, a la «Segunda modificación de Carlos (24-oct)» en lo que toca a `ESTADO.md`). Lo que no choca de ADR-043 v3 sigue vigente: squash, sin force-push ni rebase; Carlos conserva el veto; el Revisor usa el modelo contrario al que construyó. **Quién integra:** ADR-060 (3-nov-2026).

**Contexto.** Flujo acordado con Carlos el 28-oct-2026 y reglas de revisión e integración t618u (27-oct-2026 17:30), más los mandatos t500u (26-oct) y t682u (28-oct), bajo los cuales el bot ya aplicaba migraciones con respaldo (por ejemplo, el #91). El detalle, las reglas permanentes, las decisiones por confirmar, los pendientes y las preguntas abiertas están en [`OPERACION-agentes.md`](OPERACION-agentes.md); este ADR no los copia.

**Decisión.**

1. **El repo es la fuente única** del flujo de trabajo (`docs/2.0/`); manda `OPERACION-agentes.md` ante un choque.
2. **Claude escribe los briefs**, construye e integra cuando cumple las condiciones (ADR-060). **Carlos** aprueba una vez por módulo una hoja de alcance de una página (1.0 es el piso, no el techo). El **bot «OPAI 2.0»** opera la cola: avisa al Revisor y a QA, aplica migraciones, puede integrar y toma capturas.
3. **Cada PR actualiza `ESTADO.md`** (qué entró, qué quedó pendiente, qué se decidió). Linear queda como referencia.
4. **Migraciones:** las aplica el bot «OPAI 2.0» en Neon con respaldo previo, primero `dev` y después `main`, con `lock_timeout` corto y verificación posterior; luego quita `migracion-pendiente`. Integración (squash): Claude o el bot (ADR-060).
5. **Revisor:** una sola pasada; solo bloquea por seguridad, migraciones o datos; lo demás va a un PR de pendientes. Tras un push, revisa solo el delta.
6. **Integración:** con los cuatro checks obligatorios en verde sobre el head, sin conflictos con `main` (traer `main` con merge solo si hay conflicto; ADR-061), sin veto de Carlos y, si el PR trae migración, ya aplicada con respaldo en `dev` y `main`; Revisor obligatorio solo si trae migración o toca RLS, permisos o datos de tenants, con «Revisor OPAI 2.0: sin bloqueos» sobre el head (ADR-060).
7. **QA en vivo** después de integrar, sin frenar; los hallazgos de seguridad o datos abren un arreglo inmediato.

**Consecuencias.** Se ajustan `AGENTS.md`, `CONTEXTO-agentes.md`, `INSTRUCCIONES-proyecto-claude.md` (Carlos debe pegarlas de nuevo en el proyecto de claude.ai) y la cabecera de `ESTADO.md`. Quedan por alinear la plantilla del PR, `checklists/revision.md`, `checklists/qa.md`, `ROADMAP.md`, `PLAN-desarrollo.md` y `00-documento-de-arranque.md`; mientras tanto, manda este ADR. El cuarto check obligatorio (`rendimiento`, ADR-045) está por confirmar en el ruleset (`OPERACION-agentes.md` E.4).

## ADR-055 · El MCP expone todas las acciones de pantalla, incluida Plataforma

**Fecha:** 28-oct-2026 · **Estado:** vigente · **Origen:** regla de Carlos del 28-oct-2026 («el MCP debe exponer TODAS las acciones que se pueden hacer en pantalla, incluida Plataforma; si no, no es agent-first»), tarea CAR-32. Amplía ADR-004 y ADR-034 §4; modifica la regla H15 del Revisor («una API key nunca obtiene permisos de plataforma»).

**Decisión.**

1. **Ninguna funcionalidad nueva se integra sin su herramienta MCP.** Toda capacidad, incluida `platform.*`, produce herramienta MCP (y `preview_` si escribe), salvo las `interna` o `soloPersonas` de `paridad-excepciones.ts`, cada una con motivo. Toda acción de servidor y ruta de `apps/web` está declarada en `paridad-entradas.ts` (pasarela a capacidades, identidad o infraestructura) con motivo.
2. **Key de plataforma.** Una API key ve y ejecuta `platform.*` solo si: tiene el scope explícito `platform` (el `*` nunca lo cubre), es de tipo `usuario`, hereda los permisos de su responsable y ese responsable tiene **hoy** `platformRole` (se cruza en cada llamada: si lo pierde, la key también). Solo un usuario de plataforma, con MFA, puede crearla. El agente interno (ADR-049) y las keys de servicio nunca obtienen plataforma. `support` solo ve lecturas.
3. **Mismo camino que la pantalla.** La herramienta llama a la misma capacidad (`executeCapability`): mismos permisos, `ctx.plataforma.paraTenant` con RLS del tenant objetivo, idempotencia, aprobación humana de lo irreversible y auditoría en el tenant objetivo (o en el de la key, si la capacidad no tiene objetivo). *Nota CAR-36/40 (28-oct-2026): `paraTenant` pasa a operaciones con nombre (`empresa(id)`), la auditoría y la cola de aprobaciones de plataforma salen de la empresa de la key (`core.auditoria_global`, `core.aprobaciones_plataforma`), lo `platform.*` no reserva idempotencia en la empresa y las keys `platform` vencen en ≤ 7 días.*
4. **Rol de plataforma.** Nuevas capacidades `platform.users.list` y `platform.users.set_role` (permiso `platform:roles.manage`, solo owner de plataforma). `set_role` es irreversible (un agente queda en aprobación humana), no cambia el propio rol, conserva al menos un owner y audita en la misma transacción que la escritura. Su pantalla espera diseño; hoy está en API y MCP.
5. **Gobierno de la key de plataforma.** La autonomía «directo» sobre una capacidad `platform.*` solo la da quien tiene ese permiso de plataforma (un owner o admin del tenant no). `platform.admins.invite` y `platform.tenants.create` (que también invita un owner al adoptar una empresa existente) pasan a irreversibles: invitar un owner abre los datos de la empresa, así que un agente queda en aprobación humana. Quitar el rol a un owner toma antes el bloqueo de fila de todos los owners, así dos bajas cruzadas se serializan y la segunda falla en vez de dejar cero owners.
6. **Gate.** `packages/capabilities/test/paridad-inventario.test.ts` falla si una pantalla invoca una capacidad sin herramienta, si aparece una entrada de servidor sin declarar o si `docs/2.0/paridad/mcp-inventario.md` no coincide con lo generado.

**Consecuencias.** Sin migraciones (`opai_app` ya tiene `UPDATE` en `core.users`). La instantánea `herramientas-mcp.txt` (key `*`) no cambia; la nueva `herramientas-mcp-plataforma.txt` lista las `platform_*`.


## ADR-056 · Motor de sueldos del Núcleo, con valores por empresa

**Fecha:** 29-oct-2026 · **Estado:** vigente. **Origen:** decisiones de Carlos del 29-oct-2026 a las 18 preguntas de [`modulos/motor-sueldos.md`](modulos/motor-sueldos.md) §16 (CAR-71). Con ellas Carlos aprueba esa especificación. Modifica ADR-042, punto 4: los parámetros legales del costo empleador salen del motor, no del CPQ. Modifica la fase 6 de `ROADMAP.md`: el costo empresa deja de ser parte de Nómina. Completa ADR-036 y ADR-048.

**Decisión.**

1. **Servicio del Núcleo** (Brief 07e). Va después de Puestos (Brief 11) y antes del Motor CPQ (Brief 08), en paralelo con Comercial. Es un solo cálculo, puro y determinista: parte de la capa de sueldo y llega al costo empresa por persona, puesto, día y hora. Lo usan CPQ, Nómina, Finanzas y los agentes.
2. **Valores por empresa, versionados por vigencia.** OPAI lee las fuentes oficiales todos los días y publica los valores (captura compartida, sin `tenant_id`). Cada empresa tiene sus propios valores vigentes, con `tenant_id` y RLS. Por defecto «siguen la fuente».
3. **Una sola persona confirma, sin segunda firma.** Puede hacerlo el owner, un administrador o alguien en quien deleguen (`core:remuneraciones.manage`). Lo que no se lee por máquina (IMM, tasas por ley) y lo que llega anómalo se publica como propuesto o retenido, y esa persona lo confirma.
4. **Todos los valores en una sola página** (Configuración → Remuneraciones): UF, UTM, IMM, tasas, topes y variables propias. Un valor cambiado a mano pasa a ser propio de la empresa, con vigencia, motivo y auditoría, hasta que alguien vuelve a seguir la fuente.
5. **Agentes según la autonomía de su key.** Un agente o el MCP puede cambiar, confirmar o rechazar cualquier valor, con vista previa y auditoría. Por defecto todo pasa por la cola de aprobaciones del Núcleo. El cambio retroactivo siempre pide aprobación humana. Plataforma solo vigila las fuentes.
6. **Reglas de cálculo:**
   - Las provisiones de vacaciones y de indemnización por años de servicio se calculan como lo hacen finanzas y contabilidad, sin colación, movilización ni aportes en la base. Para el costo, el CPQ suma el promedio mensual de los días de feriado del año.
   - Las horas extra usan la fórmula legal con la jornada pactada.
   - El CPQ costea con la colación y la movilización de la capa cuando la cotización las incluye.
   - Una capa puede atar su sueldo base al IMM.
7. **Cotizaciones.** Las abiertas avisan y se recalculan con un clic. Las emitidas quedan congeladas con su juego de valores.
8. **Nómina** conserva la liquidación real, el impuesto, el libro, Previred y los finiquitos. Además lleva un contador acumulado de vacaciones y de indemnización por trabajador.

**Consecuencias.** Antes del brief se verifican en las fuentes oficiales el SIS y la reforma, el IMM, los topes y las tasas. Carlos habilita los dominios en la red del entorno. Este ADR no agrega código ni migraciones.

---

## ADR-057 · Complemento «Cumplimiento DT» de Nómina (LRE, Mi DT, finiquito)

**Fecha:** 29-oct-2026 · **Estado:** vigente · **Origen:** decisión de Carlos del 29-oct-2026 a las 15:23 CLT sobre la pregunta P10 de [`modulos/firma.md`](modulos/firma.md) §15, que había quedado «en investigación» en la decisión de las 15:17 CLT (§17 del mismo documento, CAR-73). Investigación completa en [`referencias/dt-integracion.md`](referencias/dt-integracion.md) (solo fuentes públicas, nada escrito en ningún sistema ni contacto con la DT).

**Contexto.** La investigación encontró que la Dirección del Trabajo **no publica una API abierta y documentada para empleadores ni para software de remuneraciones**: su propia FAQ del LRE (última modificación 31-05-2023) dice que la carga es por archivo CSV/TXT o por formulario en Mi DT, y que la API es una «próxima evolución» (fuente: FAQ del LRE, https://www.dt.gob.cl/portal/1628/w3-article-120083.html). El resto de los trámites (contratos y anexos, finiquito, cartas de término) se hacen en el portal Mi DT, siempre con una persona natural autenticada con su ClaveÚnica (el representante laboral electrónico del tenant; además el trabajador, en el finiquito). Ningún proveedor chileno revisado (Nubox, Rex+, Talana) publica cómo automatiza el envío a Mi DT.

**Decisión.** Se crea el complemento vendible **«Cumplimiento DT»** del módulo **Nómina**, cobrado **por trabajador con un mínimo mensual** por tenant (C5, catálogo del 29-oct-2026; los montos van al ADR-058 de planes y precios). En la v1 el complemento:

1. Genera y valida el archivo del **Libro de Remuneraciones Electrónico (LRE)** en el formato oficial (CSV/TXT separado por «;», nombre `rutempleador_aaaamm`).
2. Prepara los datos para registrar **contratos, anexos, altas y bajas** en Mi DT.
3. Prepara la **propuesta de finiquito** y la **carta de aviso de término** (art. 162 del Código del Trabajo), con seguimiento de plazos.
4. Deja el **envío y la firma en manos del representante laboral del tenant**, con su ClaveÚnica en Mi DT. **OPAI nunca guarda ni usa la ClaveÚnica de una persona ni opera el portal con un robot.**
5. Si la DT abre una API o firma un convenio, el envío directo entra como un **nivel superior** del complemento.
6. La **asistencia certificada** (Resolución Exenta N°38 de 2024, ADR-023) se evalúa aparte, con su costo y su plazo; no forma parte de este complemento.

**Consecuencias.** Resuelve P10 de `modulos/firma.md` §15: la especificación de Firma queda **aprobada sin preguntas abiertas**; el complemento vive en Nómina, no en Firma (§11 de `firma.md`). `ROADMAP.md` (fase 6) anota el complemento como parte del alcance de Nómina y dependencia de su brief (Briefs 25/26). Sin código ni migraciones en esta decisión.

---

## ADR-058 · Planes y precios por capas, sin montos

**Fecha:** 29-oct-2026 · **Estado:** vigente · **Origen:** CAR-76, catálogo del Núcleo revisado con Carlos el 29-oct-2026 (17:36–17:39 CLT). · Completa ADR-003 (módulos de primera clase y entitlements) y ADR-048 (módulos vendibles por separado); recoge el cobro del agente interno (ADR-049 §9) y del complemento Cumplimiento DT (ADR-057).

**Contexto.** Varios ADR aplazaban «los montos y el margen» a «un ADR futuro de planes y precios, cuando exista Opai SpA» (ADR-049 §9, ADR-031, ADR-057). Falta la **estructura** de cobro —qué se cobra y por qué unidad— para que cada brief sepa a qué capa pertenece lo que construye, aunque los montos sigan sin fijarse.

**Decisión.** Se fija la estructura de planes y precios, **sin montos ni margen** (los números se deciden «cuando exista Opai SpA»):

1. **Capa por módulo.** Cada módulo vendible declara a qué **capa** pertenece: base, de personas, de terreno, comercial/administrativa o complemento. La capa determina la unidad de cobro del punto 2.
2. **Unidad de cobro.**
   - **Por trabajador activo** en los módulos de **personas** (Nómina y sus complementos, Asistencia).
   - **Por instalación activa** en los módulos de **terreno** (Operaciones, Rondas, Control de acceso).
   - **Licencia por empresa** en los módulos **comerciales y administrativos** (Comercial, CPQ, Licitaciones, Finanzas, Tickets, agente interno).
3. **Plan base.** Incluye, con sus cuotas: identidad y accesos, permisos, maestros, **motor de sueldos** (ADR-056), documentos y **firma N1/N2** (ADR-019), configuración, comunicaciones (ADR-020), **MCP/API** y **Tickets** (ADR-025). Es el piso sobre el que se activan los módulos de pago.
4. **Portales incluidos.** Los portales (ERP, Supervisor, Trabajador, Terreno, Cliente) van **incluidos**; no se cobran aparte. Cada portal muestra solo lo que los módulos contratados habilitan (`NAVEGACION.md` §4).
5. **Cumplimiento DT.** Se cobra **por trabajador con un mínimo mensual** (C5, ADR-057).
6. **Firma.** El uso de firma se cobra **por uso, a costo más margen** (sobre lo medido en `core.consumos`, ADR-031); los niveles N1/N2 van en el plan base, el uso de firma avanzada se tarifa aparte.
7. **Sin montos ni margen.** Este ADR **no fija ningún monto ni margen**. Reemplaza, como destino de los números, las remisiones a «un ADR futuro de precios» de ADR-031, ADR-049 §9 y ADR-057.

**Consecuencias.** ADR-049 §9 y ADR-057 apuntan a este ADR para la estructura de cobro. Cada especificación de módulo (ADR-047) declara su capa y su unidad. Sin código ni migraciones; los montos entran cuando Opai SpA exista y se registrarán como una enmienda a este ADR.


---

## ADR-059 · Feriados legales de Chile calculados por regla

**Fecha:** 30-oct-2026 · **Estado:** vigente · **Origen:** decisión de Carlos del 30-oct-2026 a las 00:51 CLT (chat con el operador) tras el hallazgo de QA (ALTO, datos) sobre el calendario del Núcleo del #139 (CAR-79): cada año traía solo 10 feriados nacionales de fecha fija y 2027 repetía 2026. Refs CAR-79/CAR-76/CAR-80.

**Contexto.** El #139 sembró los feriados nacionales de fecha fija de 2026–2027 como filas de plataforma (`tenant_id` nulo) de `core.dias_calendario` y dejó **fuera del seed los de fecha movible** (Semana Santa, San Pedro y San Pablo, Pueblos Indígenas, Encuentro de Dos Mundos, Iglesias Evangélicas) «hasta confirmar su fecha observada». Resultado: faltaban feriados y el seed no escalaba a años nuevos. Este calendario alimenta el cálculo de días hábiles (pauta, comercial, asistencia, nómina), así que había que corregirlo antes de que algo lo usara.

**Decisión (Carlos, 30-oct-2026, 00:51 CLT).**

1. Los **feriados legales de Chile se calculan por regla** en el código (`packages/domain/src/calendario/feriados.ts`, `feriadosLegales(anio)`), para **cualquier año**, sin tabla por año.
2. La tabla `core.dias_calendario` queda **solo** para feriados por **ley puntual** (p. ej. elecciones o leyes especiales, como filas de plataforma) y para los **días propios de cada empresa** (filas del tenant).
3. **Revisión anual en noviembre del año siguiente** contra la fuente oficial, a cargo del operador, **fuera del código** (no hay API externa en la v1).

**Reglas implementadas (cada feriado lleva su ley en el código).**

- **Fijos:** Año Nuevo (1-ene), Día del Trabajo (1-may), Glorias Navales (21-may), Virgen del Carmen (16-jul, Ley 20.148), Asunción (15-ago), Independencia (18-sep), Glorias del Ejército (19-sep), Todos los Santos (1-nov), Inmaculada Concepción (8-dic), Navidad (25-dic).
- **Semana Santa:** Viernes Santo (Pascua − 2) y Sábado Santo (Pascua − 1), con la Pascua por el **computus gregoriano** (Meeus).
- **Pueblos Indígenas (Ley 21.357):** el día del **solsticio de invierno** del hemisferio sur, calculado con el método de **Meeus** y pasado a hora de Chile continental (UTC−4). **[Por verificar]** cada año contra el decreto oficial.
- **Trasladables (Ley 19.668):** San Pedro y San Pablo (29-jun) y Encuentro de Dos Mundos (12-oct): si caen martes, miércoles o jueves se corren al lunes de esa semana; si caen viernes, al lunes de la semana siguiente; el fin de semana y el lunes no se mueven.
- **Iglesias Evangélicas (Leyes 20.299 y 20.983):** 31-oct, salvo que caiga martes (→ viernes de la semana anterior, 27-oct) o miércoles (→ viernes de esa semana, 2-nov). **[Por verificar]** el año en que se traslada.
- **Adicionales de Fiestas Patrias (Ley 20.215):** lunes 17-sep si el 18 cae martes; viernes 20-sep si el 19 cae jueves.
- **Irrenunciables (Ley 19.973):** 1-ene, 1-may, 18 y 19-sep y 25-dic.

**Lectura y días hábiles.** `core.calendario.listar` y el cálculo de días hábiles usan la **unión** de los feriados calculados con las filas de la tabla, resueltos por precedencia (tenant por instalación > tenant global > regional > nacional/legal). Los calculados se muestran como **«Legal (automático)»** y **no se editan ni archivan**; un feriado del tenant sobrescribe al legal solo en ese tenant. Cualquier año válido (2000–2100) muestra sus feriados legales aunque no haya ninguna fila en la tabla.

**Corrección de datos.** La migración `20261030130000_core_feriados_calculados` **borra de forma idempotente** las 20 filas de plataforma de fecha fija 2026–2027 que sembró `20261030000000_core_calendario` (ahora salen del cálculo). Como la tabla nace con `FORCE ROW LEVEL SECURITY` y opai_app no puede borrar filas de plataforma, el **dueño de la tabla** quita `FORCE` dentro de la transacción, borra, verifica con `GET DIAGNOSTICS` y vuelve a poner `FORCE`; no toca filas de tenants ni la migración ya aplicada.

**CASCADE de `instalacion_id`.** La FK `dias_calendario_instalacion_id_fkey` es `ON DELETE CASCADE` (migración `20261030000000`): al borrar una instalación del tenant se borran también sus feriados propios acotados a esa instalación, que no tienen sentido sin ella. Los feriados globales del tenant (`instalacion_id` nulo) y los de plataforma no se ven afectados. El trigger `mismo_tenant` garantiza que la instalación de una fila del tenant es del mismo tenant.

**Consecuencias.** Reemplaza el «[dato a confirmar]» del #139 sobre la fuente de feriados movibles por este cálculo con revisión anual. Sin impacto en otros ADR. Las fechas marcadas **[por verificar]** se listan en el PR y en `ESTADO.md` para el primer contraste oficial.

---

## ADR-060 · Claude integra a `main`; el bot «OPAI 2.0» aplica migraciones y da apoyo

**Fecha:** 3-nov-2026 · **Estado:** vigente · **Autor:** Carlos (decisión 19:29 CLT) · **Modifica** ADR-043 v3, ADR-054 y ADR-035 en lo que toca a **quién integra**; el resto de esos ADR sigue vigente.

**Contexto.** Desde ADR-043 v3 y ADR-054 solo el bot «OPAI 2.0» hacía squash a `main` cuando se cumplían las condiciones; Claude construía y abría el PR pero no integraba. Carlos quiere cerrar el ciclo en el mismo chat de construcción, con todo el contexto registrado en el repo, pantallas siempre basadas en Claude Design, y el bot como operador de migraciones Neon y apoyo operativo.

**Decisión.**

1. **Claude** (proyecto «OPAI 2.0» en claude.ai y Claude Code) **integra a `main` con squash** cuando se cumplen las condiciones de integración de `AGENTS.md` («Integración a `main`»); el bot «OPAI 2.0» puede hacerlo también — **quien llegue primero**.
2. El **bot «OPAI 2.0»** sigue aplicando las migraciones en Neon **con respaldo** (primero `dev`, luego `main`), quitando `migracion-pendiente` tras el aviso en el PR, operando la cola (Revisor, QA en vivo, capturas) y **también puede integrar con squash** bajo las mismas condiciones.
3. **Condiciones de merge:** los cuatro checks obligatorios del ruleset «Proteger main» en verde sobre el head; sin conflictos con `main` (traer `main` con merge solo si hay conflicto; ADR-061); sin `VETO` ni etiqueta `veto` de Carlos; si trae migración, comentario del bot de migración aplicada y etiqueta `migracion-pendiente` quitada. **Revisor:** obligatorio solo si el PR trae migración o toca RLS, permisos o aislamiento por tenant; su OK para integrar es el comentario «Revisor OPAI 2.0: sin bloqueos» sobre el head; si no toca eso, no hace falta esperarlo.
4. **Apoyo al bot:** comentario en el PR que empiece con `@opai-2.0:` o correo a **carlos.irigoyen@mail.grokbot.com** (asunto `OPAI 2.0: <tema>`, con número de PR).
5. **Registro:** decisiones, briefs, diseños aprobados y `ESTADO.md` siguen obligatorios en el repo; lo acordado en chat que cambie reglas o alcance se escribe en el repo antes de seguir.

**Consecuencias.** Se actualizan `AGENTS.md`, `OPERACION-agentes.md`, `INSTRUCCIONES-proyecto-claude.md`, `CLAUDE.md`, `checklists/revision.md` y la cabecera de la plantilla del PR. Carlos debe pegar de nuevo las instrucciones en el proyecto de claude.ai. Las reglas del ruleset sobre rama al día con `main` quedan reemplazadas por ADR-061 (4-nov-2026).

---

## ADR-061 · «Proteger main» sin exigir rama al día con `main`

**Fecha:** 4-nov-2026 · **Estado:** vigente · **Autor:** Carlos · **Modifica** ADR-043 v3, ADR-054 y ADR-060 en lo que toca a **actualización de la rama** antes del squash.

**Contexto.** Hasta el 3-nov-2026 la integración exigía traer `main` con merge y comprobar que la rama no estuviera «behind» justo antes del squash. Eso frenaba PRs listos cuando `main` avanzaba por otros merges.

**Decisión.**

1. El ruleset «Proteger main» **ya no exige** que la rama esté al día con `main`. Basta con que **no tenga conflictos** con `main` y que los **cuatro checks obligatorios** estén en verde sobre el head: `typecheck · lint · test · test:db`, `build · presupuesto de JS`, `secretos` y `migración pendiente`.
2. **Traer `main` con merge** solo hace falta si GitHub reporta conflicto (o para resolverlo en local). Sin rebase ni force-push.
3. **Justo antes del squash** quien integra **no** comprueba «behind»; comprueba checks en verde sobre el head y, cuando corresponde Revisor, «Revisor OPAI 2.0: sin bloqueos» sobre ese head.

**Consecuencias.** Se alinean `AGENTS.md`, `OPERACION-agentes.md`, `01-decisiones.md` (ADR-054 §6), `checklists/revision.md`, `INSTRUCCIONES-proyecto-claude.md` y la plantilla del PR.

---

## Adenda ADR-019 · Explorador central de Documentos (CAR-182 · PR 4)

**Fecha:** 4-nov-2026 · **Estado:** vigente · **Autor:** Claude (constructor), puntos 2, 4 y 5 confirmados por Carlos el 4-nov-2026 (chat, «ok» a la recomendación) · **Complementa** ADR-019, ADR-022 y NÚCLEO-H.

1. El explorador (`/documentos`, diseño v4 · 01 aprobado el 30-oct-2026) lee con `core.documentos.explorar`, una lectura nueva: `list` queda para las fichas. Alcance del supervisor y exclusión de documentos sensibles van en la consulta; la lectura se audita con los ids de la página (y de las personas cuyo nombre se muestra).
2. **La fila «Documento restringido» del diseño no se implementa.** Mostrarla revelaría que existe un documento que el actor no puede ver. Ni filas ni contadores de lo excluido. *Confirmado por Carlos (4-nov-2026).* Si más adelante hace falta pedir acceso, será un botón «Solicitar acceso» que no revele nada.
3. El nombre de la entidad propietaria solo se devuelve si el actor puede leer ese tipo de entidad; sin permiso viaja solo su tipo y su id.
4. La búsqueda cubre nombre de archivo, título y etiquetas; no el RUT ni el contenido del archivo. *Confirmado por Carlos (4-nov-2026).* El RUT se encuentra por la ficha de la persona (datos personales, Ley 21.719); la búsqueda dentro del texto de los archivos queda como proyecto aparte, solo si Gard lo pide.
5. Subir desde el explorador es a nivel empresa; subir a una persona, cuenta o instalación se hace desde su ficha hasta que exista el selector «Vincular a». *Confirmado por Carlos (4-nov-2026), en dos pasos:* ahora, empresa; en un PR siguiente, el selector «Vincular a», que solo ofrece entidades dentro del alcance de quien sube (el servidor lo valida igual), con lo que los supervisores podrán subir a sus instalaciones; ese PR pasa por el Revisor porque toca permisos y alcance.

**Segundo paso del punto 5 (CAR-182 · «Vincular a»).** *Decisiones de Carlos, 5-nov-2026:* (a) el selector «Vincular a» del explorador ofrece la empresa (por defecto), una cuenta, una instalación o una persona, con los tipos de documento de la capa elegida; (b) los candidatos salen de las capacidades de listar existentes, con alcance y permiso en la consulta, y la persona se muestra solo por nombre (sin RUT); (c) el servidor sigue decidiendo (`verificarEntidad`, `tipoParaEntidad`): la UI no repite esa lógica; (d) **no se amplían permisos**: `core:documentos.manage` sigue siendo de owner, admin y gerente, y el caso «el supervisor sube a sus instalaciones desde el explorador» queda como decisión de permisos aparte (permiso nuevo acotado, pasa por el Revisor). Hoy el supervisor sube desde la ficha de su instalación o persona.

---

## Adenda ADR-019 y ADR-022 · El supervisor sube documentos a sus instalaciones (CAR-182)

**Fecha:** 4-nov-2026 (17:10) · **Estado:** vigente · **Autor de la decisión:** Carlos (chat, 4-nov-2026) · **Implementa:** Claude (constructor), [brief](briefs/BRIEF-CAR-182-supervisor-sube-documentos.md) · **Cierra** el punto pendiente de la adenda del explorador de Documentos (punto 5 y «Segundo paso»: «decisión de permisos aparte») · **Complementa** ADR-016, ADR-019 y ADR-022.

1. **Decisión de Carlos.** Los supervisores pueden subir documentos, **solo vinculados a instalaciones que tienen a su cargo**.
2. **Permiso nuevo y estrecho:** `core:documentos.subir_alcance`, concedido al rol supervisor en `PATRONES_POR_ROL` (owner, admin y gerente lo cubren por comodín; viewer no). **No se amplía `core:documentos.manage`**, que sigue siendo de owner, admin y gerente. Se eligió este nombre porque el alcance (qué filas) es una dimensión aparte del permiso (qué acción) en ADR-022, y el sufijo `_alcance` dice que solo vale dentro del alcance del actor.
3. **Mecanismo.** Las capacidades `core.documentos.iniciar_subida` y `core.documentos.confirmar_subida` aceptan el permiso nuevo como alternativa a `documentos.manage` (`Capacidad.permisosAlternos`: la autorización y la visibilidad en el MCP aceptan uno u otro; el handler acota). Quien tiene `manage` conserva todo igual. Quien solo tiene el permiso nuevo: (a) sube únicamente a una instalación dentro de `ctx.alcance.instalaciones`, comprobado en el servidor; (b) nunca a la empresa, una cuenta, una persona o un puesto, ni versiona un documento; (c) el documento queda con visibilidad en portales vacía (la más restrictiva), aunque el tipo traiga portales por defecto, y no puede cambiarla después (`core.documentos.update` exige `manage`); (d) confirma solo lo que subió él. Cualquier otro intento recibe el rechazo que ya daba el sistema (`FORBIDDEN` sin detalles, o `NOT_FOUND` idéntico para instalación fuera de alcance e inexistente).
4. **Interfaz.** En `/documentos`, «Subir» aparece con el permiso nuevo y alcance por filas; «Vincular a» ofrece solo «Instalación» (candidatos de `core.instalaciones.list`, ya acotados); la hoja no muestra «Visible en portal». La UI solo ofrece; la capacidad decide.
5. **Sin migración ni capacidad nueva**: los roles base son código y la herramienta MCP es la misma. Pasa por el Revisor (toca permisos y alcance).

## ADR-062 · Cobranza de ventas: vencimiento derivado y recordatorios en días hábiles

**Fecha:** 4-nov-2026 · **Estado:** propuesto (reglas por confirmar por Carlos) · **Origen:** CAR-166 (F4), auditoría de Finanzas §2.1, construido por Claude.

**Contexto.** 1.0 materializa «vencida» con un cron que cambia `paymentStatus`, pierde de vista la factura con abono vencida y solo recuerda la confirmación de la proforma (+3, +7 y +12 días hábiles sin feriados), no el cobro de la factura. 2.0 no tenía cobranza.

**Decisión.**

1. **Vencida se deriva**, sin columna ni cron: documento 33/34 en estado `enviado` o `aceptado`, no cedido, con saldo y `fecha_vencimiento` (o emisión + plazo de cobro por defecto) anterior a hoy en la zona del tenant. El día del vencimiento no está vencido. Un abono parcial no saca la factura de la cobranza.
2. **Tramos** 1-30, 31-60 y 61+ días vencidos, más «por vencer». El diseño dice «0-30 / 31-60 / 60+», que se solapa en 60.
3. **Secuencia de recordatorios** configurable por empresa: hasta 3 pasos en días hábiles después del vencimiento (por defecto 3, 7 y 12), con los feriados del calendario del núcleo. Sale un paso por factura y por ejecución. Se detiene al pagar, al pausar la factura o al agotar los pasos.
4. **Silencio por defecto (ADR-020):** el envío automático viene apagado; el envío manual existe siempre, es irreversible y pide aprobación a los agentes.
5. **Historial de gestiones** (`finanzas.cobranza_gestiones`) con índice único parcial por documento y paso para que la secuencia no se repita.
6. **WhatsApp:** solo enlace manual por ahora; el envío automático requiere aprobación por lote y queda para una etapa posterior.

**Por confirmar (Carlos):** pasos contados desde el vencimiento (en 1.0, desde el envío de la proforma), tramos sin solape y WhatsApp solo manual.

**Fuera de alcance:** seguimiento de proforma y estado de pago (F5), cesión y factoring.

---

## ADR-063 · Claude avanza sin esperar: integra y aplica migraciones

**Fecha:** 4-nov-2026 (10:39 CLT) · **Estado:** vigente · **Autor:** Carlos · **Modifica** ADR-054 y ADR-060 en lo que toca a quién aplica migraciones y a qué se espera.

**Decisión.**

1. **Claude no espera al bot «OPAI 2.0» ni a nadie para avanzar.** Con los cuatro checks obligatorios en verde sobre el head y sin conflicto, integra con squash. Si hay conflicto, trae `main` con merge, nunca rebase.
2. **Claude aplica las migraciones** de sus PR: antes saca el respaldo de `main` en Neon (proyecto `steep-wildflower-90764475`), migra primero `dev` y luego `main`, quita `migracion-pendiente`, deja un comentario en el PR con lo aplicado y el respaldo, e integra. El bot puede seguir haciéndolo si llega primero.
3. **Claude verifica por sí mismo** en Neon, GitHub y `test.opai.cl` que algo quedó aplicado; no se lo pregunta a Carlos.
4. **Revisor:** solo se espera si el PR toca migraciones, permisos, RLS o datos de tenants. Lo demás se integra sin él.
5. **Claude solo se detiene** ante lo que debe hacer Carlos: claves, 2FA, aprobaciones en 1Password o cambios en 1.0. Nunca maneja ni imprime secretos; si no tiene acceso a Neon en la sesión, lo reporta como bloqueo de acceso.
6. Al terminar una tarea, sigue con la próxima de `ESTADO.md` sin preguntar.

**Sin cambios:** Claude no escribe `VETO`; el veto de Carlos se respeta; `migracion-pendiente` la sigue poniendo quien abre el PR con migración.

**Consecuencias.** `AGENTS.md` (roles y «Prohibido») queda alineado con esta decisión.

## ADR-066 · Agente interno: conversaciones sin pisarse, retención por empresa y contexto revalidado

**Fecha:** 5-nov-2026 · **Decide:** Claude (constructor, PR 5c de CAR-120), dentro de la spec del agente (R9, R19, R20); sin cambio de alcance de negocio.

1. **Concurrencia.** `core.agente_conversaciones.version` y escritura condicional (`updateMany ... WHERE version`) con hasta 4 reintentos; si se agotan, `CONFLICT`. Se eligió esto sobre `SELECT ... FOR UPDATE` porque las reglas prohíben SQL crudo fuera de `enTransaccion`.
2. **Idempotencia.** `turnoId` marca los dos mensajes del turno; el cliente lo usa también como `idempotencyKey`. Un turno ya guardado no se repite.
3. **Retención.** Ajuste `agente.retencionConversacionesDias` (7 a 365, defecto 90) fijado solo por una persona con `agente:configurar`. Se aplica al listar, al abrir, al guardar y en el trabajo diario `agente.conversaciones.vencidas`, que corre por empresa con su RLS (nunca `dbAdmin`).
4. **Contexto de ficha.** El navegador no es fuente de verdad: antes de guardar o usar `contexto`, el servidor lee la ficha (`core.cuentas.get`, `core.instalaciones.get`, `comercial.negocios.get` o `core.personas.get`) con la identidad delegada de la persona; si no la ve, responde «no existe».
5. **Fuera de este PR:** adjuntos (dependen de `core.documentos`, ADR-019).

---

## ADR-064 · Apertura de Finanzas desde 1.0: sin migración, corrida reversible y entrada por capacidad

**Fecha:** 4-nov-2026 · **Estado:** vigente · **Autor:** Claude, con las respuestas de Carlos del 4-nov (sin fecha de corte, todas las facturas, export con key READ).

**Decisión.** La apertura (saldos de banco, facturas con su saldo y último folio usado por tipo) se carga con `finanzas.apertura.importar` (solo personas, `dryRun`) y se deshace con `finanzas.apertura.revertir`. Cada carga es una corrida de `core.importaciones` (`versionContrato = finanzas-apertura@1`) con una fila por saldo, documento y folio. Nunca pisa: un documento con el mismo tipo y folio queda «sin cambio», un RUT sin cuenta en 2.0 o una cuenta bancaria inexistente se rechaza con motivo, y el folio solo avanza. Compara sumas de control 1.0 vs 2.0 (saldos, documentos, monto total, por cobrar). No hay migración: los saldos usan origen `manual` con `claveDedupe` `apertura:<corrida>`.

**Pendiente de 1.0.** El exportador `opai1-export/v1` aún no trae `documentos` ni `saldos_bancarios`; hasta que Opai Producto los agregue, la entrada se entrega a la capacidad directamente.

## ADR-065 · Movimientos bancarios por Web4Leads, no por Fintoc directo
**Fecha:** 4-nov-2026 · **Decide:** Carlos (instrucción en el chat) · **Registra:** Claude

**Decisión.** OPAI 2.0 recibe los movimientos del banco en línea por el webhook firmado de Web4Leads (que administra Carlos y ya usa Fintoc), en `/api/t/<slug>/banco/web4leads`, con la misma carga y firma HMAC-SHA256 que usa 1.0. No se construye un adaptador Fintoc propio ni se guardan credenciales del banco.

**Por qué.** Web4Leads ya está operativo y probado con las cuentas de Gard; evita custodiar llaves bancarias y retrasar Finanzas.

**Reglas.** El secreto de firma es por empresa, se ingresa en Configuración › Integraciones › «Banco (Web4Leads)» y se guarda cifrado (ADR-027). La deduplicación reutiliza la huella de la cartola para que ambas vías convivan. Las cuentas no reconocidas se ignoran con 200 (pendiente avisar al administrador).

**Consecuencias.** Si más adelante se ofrece conexión bancaria como producto de plataforma, se reevalúa un adaptador Fintoc propio.

## ADR-067 · Cierre de mes: seguimiento por borrador y emisión en lote todo o nada

**Fecha:** 5-nov-2026 · **Estado:** vigente · **Autor:** Claude (CAR-167 · F5), sobre el diseño aprobado «Programación y cierre».

**Decisión.** La etapa de un borrador del cierre se **deriva** (`etapaCierre`) de su estado de documento y de una fila de seguimiento (`finanzas.ventas_cierre_seguimientos`); no hay un campo de etapa que pueda desincronizarse. La emisión en lote (`finanzas.cierre.emitir_lote`) es irreversible, exige aprobación humana a los agentes y corre en **una sola transacción**: si una emisión falla, no se emite ninguna, porque un parcial dejaría folios consumidos sin documento. Los elementos no listos o ya emitidos se omiten con motivo, y repetir el lote no duplica nada.

**Fuera de este corte.** El enlace público donde el cliente aprueba u observa la proforma y el envío automático de la proforma quedan como pendiente: hoy una persona registra la respuesta del cliente.

## ADR-070 · Frente único: las sesiones de Claude integran, el bot vigila y migra

**Fecha:** 4-nov-2026 · **Estado:** vigente · **Autor:** Carlos (instrucción directa en el chat del 4-nov-2026), registrada por Claude (Sesión 4).

**Decisión.** Las sesiones de Claude planifican, construyen e integran sus propios PRs. El bot «OPAI 2.0» no integra ni escribe encargos o briefs: solo vigila GitHub y Linear (avisa a los revisores y a QA, responde `@opai-2.0:`, toma capturas) y aplica las migraciones de Neon, con respaldo previo y en `dev` antes que `main`, cuando el Revisor deja «Revisor OPAI 2.0: sin bloqueos» sobre el head del PR.

**Qué corrige.** La parte de ADR-060 que permitía integrar también al bot y la parte de ADR-063 que permitía a Claude aplicar migraciones. Se actualizan `OPERACION-agentes.md` (A.2, A.5, A.6, B.6) y `CONTEXTO-agentes.md`. `AGENTS.md` (encabezado, «Tareas (Linear)» regla 4, «Prohibido», tabla de roles y «Integración a `main`») se alineó el 4-nov-2026 (CAR-162, Sesión 4): integra la sesión de Claude que construyó el PR, el bot solo vigila y aplica migraciones.

## ADR-068 · El pendiente de una factura descuenta sus notas de crédito parciales

**Fecha:** 4-nov-2026 · **Estado:** vigente · **Autor:** Carlos (regla de negocio, dada directamente en el chat del 4-nov-2026), implementada por Claude (CAR-170). Cierra el N1 de #289.

**Decisión.** El pendiente de una factura emitida es `monto − notas de crédito parciales (tipo 61) − cobrado`, nunca negativo. Ejemplo: factura de $1.000.000 con NC parcial de $200.000, pendiente $800.000. Solo restan las NC emitidas (`enviado` o `aceptado`) y monetarias (CodRef 1 anula, 3 corrige montos, como `montoNcAcumuladoMonetario`; la CodRef 2 «corrige texto» y las legadas sin código no restan); un borrador, una NC rechazada o anulada no restan. La **nota de débito (56) no suma deuda**.

**Dónde rige.** Una sola fórmula en el dominio (`saldoPendiente`) y un lector en el servidor (`notasCreditoPorDocumento`, `pendienteFacturaEmitida`): tope de conciliación (`topes-conciliacion.ts`, que ahora toma el candado y recién después lee el documento), pago manual (también en la vista previa), candidatos de conciliación, cobranza y aging por cliente, «Hoy en Finanzas», y la ficha y búsqueda de ventas (`montoNotasCredito`, `montoPendiente`). `sincronizarCobroDocumento` salda la factura con `monto − NC`.

**No cambia.** El flujo de caja ya trata cada NC como su propia celda negativa; restarla además de la factura la contaría dos veces.

**Fuera de este corte.** Las facturas de compra (documentos recibidos) mantienen `total − conciliado`: las NC recibidas no se descuentan todavía.

## ADR-069 · Rendiciones: módulo propio, un nivel de aprobación y el solicitante nunca decide lo suyo

**Fecha:** 4-nov-2026 · **Estado:** vigente · **Autor:** Carlos (decisiones del 4-nov-2026), implementadas por Claude (CAR-175, R1).

**Decisión.** Rendiciones es un módulo vendible con su schema `rendiciones` y sin dependencia de Finanzas (ADR-048). (1) Rinden solo usuarios del ERP con permiso `rendiciones:rendir`; guardias y supervisores sin usuario, en un bloque posterior. (2) Hay **un solo nivel de aprobación con aprobador asignado**; el solicitante nunca aprueba, rechaza, devuelve ni paga lo suyo (regla en el dominio, en las capacidades y en un CHECK de la base). (3) «Pagada» se marca al confirmar el lote de pago (R3). (4) El kilometraje es **configurable por empresa** (por consumo, por tarifa por km o monto fijo por tramo) como configuración versionada evaluada en `packages/domain` (ADR-021); llega en R2. (5) «Devuelta» (se corrige y se reenvía) es distinto de «Rechazada» (definitiva). Aprobar y rechazar son irreversibles para los agentes (aprobación humana).

**Consecuencias.** R1 entrega el modelo y las 9 capacidades por MCP sin pantallas; el código REN-n es correlativo por empresa con bloqueo; la boleta repetida (proveedor + folio + monto) solo avisa.

**Adenda del 5-nov-2026 (Sesión 2, pendientes del Revisor de #303).** (1) El aviso de boleta duplicada solo mira las rendiciones que el actor puede ver: las propias, las que le asignaron para aprobar y, con `rendiciones:ver_todas`, las de toda la empresa. Por eso el aprobador ve los duplicados de lo que aprueba, y es intencional (necesita ese dato para decidir). (2) Quien no puede ver todas las rendiciones solo adjunta respaldos que él mismo subió; con `ver_todas` puede usar los de la empresa.

**Adenda del 5-nov-2026 (CAR-200, R2c, decisión de Carlos en el chat).** En el kilometraje por monto fijo por tramo, «ida y vuelta» **duplica** el monto del tramo, igual que en consumo y tarifa por km; el peaje se suma una sola vez. Reemplaza la nota de R2a que lo dejaba sin duplicar.


## ADR-071 · Cobro por módulo en Plataforma, para todos los módulos

**Fecha:** 4-nov-2026 · **Estado:** vigente · **Autor:** Carlos (comentario «DECISIÓN CARLOS» en #313, 20:24 CLT, y encargo a la Sesión 6 del mismo día), registrada por Claude (Sesión 6, CAR-187). · Completa ADR-003 y ADR-058.

**Decisión.** El cobro por módulo **no** se construye dentro de cada módulo: vive en **Plataforma** y sirve para todos (Comercial, CPQ, Rendiciones y, a futuro, las partes de Finanzas que se vendan por separado). Por empresa y por módulo se guarda el **precio mensual (UF o CLP)**, el **inicio del cobro**, el **fin de la prueba** y un **descuento opcional**. Cada mes se genera un **cargo listo para facturar**, **sin emitir facturas reales ni usar SimpleAPI**. Plataforma muestra de un vistazo qué módulos se facturan y cuáles no, por empresa y en total. El **catálogo de módulos** declara nombre comercial, dependencias y si se vende solo, preparado para separar Finanzas en partes (bancos, conciliación, ventas, compras, cobranza, factoring, flujo de caja) sin rehacerlo.

**Relación con ADR-058.** ADR-058 fija la estructura (capas y unidades) sin montos. Este ADR permite **montos por empresa** (condiciones comerciales pactadas), no una lista de precios global. La unidad de B es un monto mensual fijo; el cobro por trabajador o por instalación de ADR-058 queda para después, con el modelo preparado. Las preguntas abiertas están en `modulos/plataforma-hoja-alcance.md` §6.

**Consecuencias.** Rendiciones no tiene cobro propio y solo usa el estado del módulo (prueba, activo o suspendido). Hoja de alcance de Plataforma: `docs/2.0/modulos/plataforma-hoja-alcance.md`.

**Adenda del 4-nov-2026 (Carlos, «DECISIÓN CARLOS» en CAR-188 a las 20:29 y en #314 a las 20:37 y 20:45 CLT).**

1. **Forma de cobro por módulo.** Cada empresa paga un **plan base mensual fijo en UF** y cada módulo contratado tiene su propio precio en UF con su unidad. El motor soporta **precio fijo mensual** o **precio por unidad × cantidad del mes**, con **mínimo mensual opcional** y **después el descuento**; la **cantidad del mes queda guardada en el cargo** para auditarla. Referencia de unidades: Finanzas, fijo mensual (sin tramos, 26-oct); Rendiciones, por usuario activo habilitado para rendir (los aprobadores no se cobran); Asistencia, Nómina y Cumplimiento DT, por trabajador o guardia activo, con mínimo; Operaciones/puestos, por instalación activa; Comercial (CRM) y CPQ, por usuario con licencia; firma, por uso. Los montos los fija Carlos en Plataforma.
2. **Primer mes proporcional** a los días desde el inicio del cobro; los siguientes, completos. **UF del cargo:** la del último día del mes que se cobra.
3. **Pruebas.** No hay registro abierto ni autoservicio. Plataforma abre la prueba a una empresa ya validada (con RUT), por módulo y con fecha de término. Siete días antes del vencimiento llega un aviso a Plataforma. Al vencer, si Plataforma marcó **«pasa a cobro»**, empieza a cobrarse; si no, el módulo queda en **solo lectura** (ve sus datos, no crea nada nuevo, nada se borra).
4. **Plan base** (reemplaza el punto 3 de ADR-058): empresa, usuarios, roles y permisos, ajustes, auditoría, notificaciones, documentos, tickets y portal. El motor de sueldos va dentro de Nómina y la firma se cobra por uso. Se refleja en el catálogo de módulos (bloque C).

5. **Catálogo de módulos (CAR-204, 5-nov-2026).** Hay un catálogo en `@opai/domain` con una entrada por cobrable: plan base, módulos y las siete partes de Finanzas (ADR-072), cada una con lo que incluye, forma y unidad sugeridas y dependencias. **Incluidos en el plan base, sin precio aparte:** Tickets, Portal Trabajador y Portal Cliente (decisión de Carlos del 4-nov 20:45); el Agente interno queda cobrable hasta que Carlos decida (se cambia en `MODULOS_INCLUIDOS_EN_BASE`). El motor de sueldos va dentro de Remuneraciones (Nómina) y la firma se cobra por uso: no están en el catálogo. El precio de lista por cobrable es configuración versionada de plataforma (`core.ajustes_plataforma`, módulo `catalogo`, auditada con antes y después; ADR-021), solo rellena la hoja «Cobro» y no cambia condiciones ni cargos existentes. Las partes se cobran con `modulo_id` `finanzas.bancos`, `.flujo`, `.ventas`, `.cobranza`, `.factoring`, `.compras` y `.contabilidad`; fijar precio o abrir prueba valida las dependencias, y no se mezcla Finanzas entero con partes. Ver BRIEF-36.

6. **Prueba gratis por empresa (CAR-222, 6-nov-2026).** Cada empresa activa **una sola vez**, desde su ERP, la prueba gratis de un módulo o de una parte de Finanzas; dura **10 días** (el primero cuenta) y **se desactiva sola**: el módulo queda en solo lectura, sin borrar nada. Plataforma puede extenderla o reactivarla. No es un cobro: no tiene precio ni genera cargos (`core.pruebas_gratis`, único por empresa y módulo). Una parte de Finanzas se prueba aunque Finanzas no esté contratado; hasta que la Sesión 5 filtre por partes, eso abre todo el módulo durante la prueba (riesgo aceptado, acotado a 10 días). Ver BRIEF-40.

---

## ADR-072 · Finanzas es un módulo con siete partes contratables por separado

**Fecha:** 4-nov-2026 · **Estado:** vigente (confirmado por Carlos en #318, 4-nov-2026 21:22 CLT) · **Autor:** Carlos (encargo a la Sesión 5 del 4-nov-2026: «Finanzas sigue siendo un solo módulo, pero con sus partes definidas, para poder vender una sola»), redactada por Claude (Sesión 5, CAR-189). · Completa ADR-071 (cobro por módulo en Plataforma; viene en el PR #314 de la Sesión 6, CAR-187).

**Decisión.** Finanzas sigue siendo **un solo módulo** (`finanzas`, mismo prefijo de capacidades, mismo esquema de base). Se divide en siete **partes**: Bancos (incluye conciliación), Flujo de caja, Ventas y facturación, Cobranza, Factoring, Compras, y Contabilidad e informes. Dependencias: Flujo de caja necesita Bancos; Cobranza y Factoring necesitan Ventas; Contabilidad necesita Ventas o Compras. Rendiciones sigue siendo un módulo aparte (ADR-069).

**Cómo.** Cada capacidad, entrada de menú y permiso de Finanzas declara su `parte`. Las partes contratadas se guardan junto al módulo de la empresa y se filtran en la autorización de capacidades, el menú, `core.me` y la lista de herramientas MCP. Lo que cruza partes (conciliar una factura, proyectar ventas en el flujo, la cobranza que mira el banco, «Hoy en Finanzas») solo aparece si ambas partes están contratadas; si no, se degrada sin error. No se renombran ids ni cambia la instantánea del MCP para una empresa con todo contratado. Sin partes declaradas, la empresa tiene todas (Gard no cambia).

**Por qué así.** Partir Finanzas en módulos propios obligaría a renombrar las 77 capacidades y choca con el acoplamiento que dejó diferido F8b. Los permisos por submódulo que ya existen (`finanzas:bancos.ver`, `finanzas:compras.manage`) sirven por rol, no para vender.

**Reparto.** El precio, el cobro y el catálogo comercial de cada parte los hace Plataforma (ADR-071, CAR-188); la Sesión 5 hace la declaración de partes en Finanzas y el filtro.

**Confirmación de Carlos (4-nov-2026, #318).** Las siete partes, con Conciliación dentro de Bancos; Rendiciones sigue como módulo aparte. El catálogo de Plataforma (ADR-071) usa esta lista.

---

## ADR-073 · Flujo de caja: mandan la cartola y la proyección

**Fecha:** 4-nov-2026 · **Estado:** vigente, con las respuestas de Carlos del 4-nov-2026 21:22 CLT en #318 · **Autor:** Carlos (reglas dadas en el encargo a la Sesión 5 del 4-nov-2026), registrada por Claude (Sesión 5, CAR-189). · Ajusta ADR-026 y la cláusula «No cambia» de ADR-068.

**Reglas de Carlos.**

1. No se cierran ni se sellan semanas. Siempre mandan la cartola y las proyecciones. No hay ajuste manual de ingresos.
2. Semanas pasadas: todos los movimientos de la cartola, por fecha del banco, estén conciliados o no; lo no conciliado va a una fila «Sin conciliar». El saldo parte del banco de hoy.
3. Proyecciones: un solo criterio de semana, la fecha esperada de cobro: el promedio real de pago del cliente cuando tiene 3 o más facturas pagadas; si no, el vencimiento (emisión + plazo del cliente); editable a mano por factura (unifica `semanaComprometidoDte` de `packages/domain/src/finanzas/derivadas-dte.ts`, que hoy usa la emisión, con `proyeccion-flujo-cap.ts`, que usa el vencimiento). Las facturas vencidas pasan a la semana actual.
4. Facturas cedidas: el depósito del factor es el ingreso (el factor deposita de una vez el monto menos su descuento; no hay remanente ni ingreso posterior) y la diferencia va a una cuenta contable configurable por empresa en Configuración, por defecto «Diferencia factoring» (o «Gasto financiero»). Como no es un movimiento del banco, en el flujo esa fila es **informativa y no suma al saldo** (adenda del 5-nov-2026, «Finanzas · Proyecto», al diseñar el flujo v4: sumarla descontaría dos veces el descuento y rompería «semana pasada = cartola»).
5. IVA y PPM: el IVA del mes M (débito − crédito) se paga en M+1 junto con el PPM (tasa configurada por empresa). Carlos marca o desmarca en el flujo, mes a mes, la postergación del IVA de ese mes a M+2; el PPM se paga siempre en M+1 aunque el IVA se postergue.
6. Un solo umbral de saldo bajo, $15.000.000, que avisa solo por la campana.
7. Pendiente de una factura = monto − notas de crédito parciales (61) − cobrado. La nota de débito (56) no es deuda. Las facturas vencidas importadas de 1.0 no entran en los recordatorios de cobranza.
8. Cada factura programada o recurrente alimenta la proyección con su fecha esperada de cobro, sin contarse dos veces con su borrador o su factura (CAR-184).
9. Una conciliación tardía no cambia los totales de semanas pasadas; lo prueba un test.

**Cómo se lee.** Los ingresos se derivan siempre (cartola en el pasado; facturas, programaciones y recurrentes en el futuro); los egresos se siguen planificando a mano (sueldos, proveedores, impuestos movidos). La NC parcial deja de ser una celda negativa propia: se descuenta del pendiente de su factura (reemplaza la cláusula «No cambia» de ADR-068). Se retiran del flujo los restos del sellado (tabla `FlujoCierre`, tolerancia, permiso de cierre y eventos de sellado) con migración aditiva cuando corresponda, sin borrar datos.

**Respuestas de Carlos (4-nov-2026, #318).** Quedaron incorporadas en las reglas 3, 4 y 5: promedio real de pago con 3 o más facturas pagadas, factoring sin remanente con la diferencia a una cuenta configurable, e IVA en M+1 con postergación opcional por mes.

---

**Adenda del 5-nov-2026 (Carlos, al revisar el prototipo del flujo v4; registrada por «Finanzas · Proyecto»).**
- **Ingresos por cliente e instalación.** «Cobros de clientes» se abre por cuenta (cliente). Si una cuenta tiene dos o más instalaciones, debajo aparece una línea por instalación, desplegable: cerrada se ve el total de la cuenta y abierta su apertura. Una cuenta con una sola instalación es una línea.
- **Centros de costo = instalaciones activas.** Solo las instalaciones en estado «activa» (más el centro general «Administración / Oficina central»); las prospecto e inactivas no se ofrecen. Precisa la decisión del 30-oct-2026 (CAR-198).
- **Cómo un cargo del banco llega a su fila de egresos** (propuesta de «Finanzas · Proyecto», mostrada en el prototipo): (1) por una regla de conciliación (ADR-074), que concilia sola solo si el monto y la referencia calzan exacto; (2) al conciliarlo con una factura de proveedor, toma la fila por defecto del proveedor; (3) eligiendo la fila a mano al conciliar, con la opción de crear la regla en el mismo paso. Mientras no se concilia, queda en «Sin conciliar (cargos)» de su semana, y conciliarlo después solo lo cambia de fila.

**Adenda del 5-nov-2026 (Carlos, vía comentario en #328; implementada en CAR-193, PR C).**
- **Umbral: $10.000.000 configurable por empresa.** Reemplaza los $15.000.000 de la regla 6. Se compara contra la suma de las cuentas activas y avisa solo por la campana. El defecto de la columna y del código pasa a $10.000.000; una migración de datos lleva a ese valor los ajustes que están en $15.000.000 y que nadie ha editado (sin ninguna escritura de ajustes por capacidad en la auditoría de la empresa: el defecto anterior o la migración del PR A) y no toca los que una persona o un agente fijó, aunque sea en $15.000.000. El bot toma el respaldo de Neon antes de aplicarla.
- **Doble conteo en la semana en curso.** Un abono del banco sin conciliar ya está en el saldo de hoy. En la semana en curso, la proyección no suma una factura (ni el depósito esperado de una cesión) cuando un abono sin conciliar coincide con su monto pendiente y con el RUT de quien paga (cliente o factor) en la glosa. Con el mismo monto pero sin RUT que calce se mantiene la proyección y la planilla avisa «Posible cobro ya recibido: concilia el abono de $ X». Cada abono se usa una sola vez.
- **Factoring.** El ingreso de una factura cedida es el depósito neto del factor (monto menos su descuento), por la fecha del banco si ya está en la cartola y, si no, en la semana de la cesión (o la actual si ya pasó); la factura cedida sale de «Cobros esperados». La diferencia (monto − depósito) va a la cuenta configurable y es solo informativa.

## ADR-074 · Reglas de conciliación bancaria: se evalúan al importar la cartola

**Fecha:** 4-nov-2026 · **Estado:** vigente · **Autor:** Carlos (respuesta 5 del comentario «DECISIÓN CARLOS» en #318, 21:22 CLT), registrada por Claude (Sesión 5, CAR-189). · Cierra la pregunta abierta desde CAR-169 (#287).

**Decisión.** Las reglas de conciliación se mantienen y se hacen funcionar. Bancos tiene una pestaña para crearlas, editarlas, activarlas y desactivarlas. Se evalúan al importar la cartola (archivo o Web4Leads): concilian solas solo cuando el monto y la referencia calzan exacto; en cualquier otro caso dejan una sugerencia que una persona confirma. Toda creación o cambio de regla es una capacidad con vista previa y MCP; la conciliación automática queda en la auditoría con la regla que la produjo.

---

## ADR-075 · El XML firmado de un DTE se maneja en ISO-8859-1, como bytes que no se transcodifican

**Fecha:** 4-nov-2026 · **Estado:** vigente · **Autor:** Claude («Finanzas · Proyecto», Sesión 5), por encargo de Carlos del 4-nov 21:30 («define el encoding del XML»). · CAR-196.

**Decisión.** El XML de un DTE (y el AEC de una cesión) se trata en **ISO-8859-1**, que es la codificación que exige el esquema del SII y sobre la que se calcula la firma. Desde que SimpleAPI lo devuelve firmado, el XML se maneja como **bytes opacos**: se guarda tal cual en el almacenamiento, el SHA-256 se calcula sobre esos bytes, y se envía igual al SII, a Octava y al cliente. Nunca se pasa por un `string` de JavaScript con UTF-8 ni se reescribe la declaración `encoding`. Solo para mostrar o leer campos se decodifica como ISO-8859-1. Si una API exige el XML como texto (por ejemplo, `STRINGXML` de Octava), se decodifica en ISO-8859-1 en ese borde y se verifica con un caso de prueba que la cesión acepta el documento.

**Por qué.** Hoy el código lo lee y lo vuelve a codificar en UTF-8 (`ventas-xml.ts`, `octava.ts`). Con una razón social o una glosa con ñ o tildes, eso cambia los bytes firmados, invalida la firma y el SII o el RPETC lo rechazan.

**Prueba obligatoria.** Una emisión y una cesión en certificación con «Compañía Ñuñoa» en la razón social y tildes en la glosa: el hash del XML guardado coincide con el que devolvió SimpleAPI y la cesión lo acepta.

**Adenda del 6-nov-2026 (decisión de Carlos, CAR-196).** La emisión real con SimpleAPI se hace **primero en certificación y después en producción**; la producción queda fuera de CAR-196 y detrás del candado de CAR-191 (solo `app.opai.cl`, solo con su habilitación expresa). Se usa SimpleAPI por REST con API key, que Carlos carga en Integraciones. Implementación (BRIEF-40): el XML firmado se guarda, hashea y lee como bytes ISO-8859-1 (`Almacenamiento.leerBytes`, `xml-iso.ts`) con prueba con ñ y tildes, y **la llamada a SimpleAPI va fuera de la transacción de base** (gancho `Capacidad.preparar` con el folio previsto; la transacción reclama el mismo folio o pide reintentar, sin quemar folios).

---

## ADR-076 · Los diseños de Finanzas se hacen como prototipo interactivo en la misma sesión

**Fecha:** 5-nov-2026 · **Estado:** vigente · **Autor:** Carlos (chat con «Finanzas · Proyecto», 5-nov-2026 08:12 CLT: «me gustaría que los diseños los hicieras tú acá interactivos para yo verlo en la misma sesión para no cambiar a Claude Design»), registrada por Claude. · Ajusta, para Finanzas, el paso de diseño de ADR-047.

**Decisión.** Para Finanzas, el paso «Design Prompt → Claude Design → diseño aprobado» se reemplaza por un **prototipo interactivo** que arma la sesión «Finanzas · Proyecto» en la misma conversación, sobre el Design System de OPAI 2.0 V2 (mismos tokens y clases que `packages/ds`). Carlos lo revisa ahí y lo aprueba. Al aprobarlo, su export se guarda en `docs/2.0/diseño/export-<pantalla>/` con un README, igual que los de Claude Design, y desde ese momento es el «diseño aprobado» que construye «Finanzas · Code». Se puede diseñar en paralelo a la construcción: un diseño no toca código.

**Primer caso.** Flujo de caja v4 (CAR-193): planilla de escritorio con traza por celda, celular y ajustes; reemplaza `export-flujo-caja-v3` en lo que cambia por ADR-073 (sin cierre semanal ni metas; filas «Sin conciliar», IVA con postergación, PPM, depósito del factor y «Diferencia factoring» informativa; fecha esperada de cobro editable por factura; umbral único de $15M).

---

## ADR-077 · Flujo operativo Grok Bot: coordinación, revisión final y señales (5-nov-2026)

**Fecha:** 5-nov-2026 · **Estado:** vigente · **Autor:** Carlos (autorización explícita en chat para registrar el flujo en el repo vía PR solo de documentación) · **Modifica** ADR-054, ADR-070 y la rutina del Revisor en `AGENTS.md` **en lo operativo** (la alineación literal de `AGENTS.md` puede ir en un PR aparte).

**Decisión (resumen).** OPAI 2.0 / Grok Bot **coordina** el avance completo; **Claude Code** construye, prueba, deja **revisión final** en el PR (SHA del head + «sin bloqueos» o bloqueos concretos en seguridad, RLS/tenant, permisos, migraciones e integridad de datos) e **integra** con squash. El **Revisor Grok Bot no se lanza** salvo petición expresa de Carlos o riesgo grave sin resolver. **Diseño/QA** solo bajo demanda. **Migraciones:** las aplica **solo OPAI 2.0** después de revisión final sin bloqueos y CI verde; las sesiones no las aplican. **Señales 24 h** en comentarios de PR (`DECISIÓN CARLOS:`, `BLOQUEO OPAI:`, `MIGRACIÓN LISTA:`), una por situación. Sesiones siguen otros frentes sin esperar al bot; nunca integran con bloqueos ni tocan 1.0. Bot revisa avance **09:00, 12:00, 15:00, 18:00 y 20:00** America/Santiago. **Claude Proyectos:** al terminar encargo iniciado por OPAI 2.0, correo desde Gmail de Carlos solo a `carlos.irigoyen+claude@mail.grokbot.com` con asunto `OPAI 2.0 | [sesión] | [LISTO/BLOQUEO/DECISIÓN]`; si no hay Gmail, la misma señal en el PR. **Linear:** issues nuevos de Carlos se clasifican y derivan a sesión sin confirmación extra para construir. **Diseño:** Claude Design entrega en chat/PR; QA visual de la sesión; Diseño/QA bajo demanda.

**Detalle normativo.** `docs/2.0/OPERACION-agentes.md` sección **A2**; contexto resumido en `CONTEXTO-agentes.md`.

**Adenda del 5-nov-2026 (Carlos, tras el PR de documentación).** **Revisión visual:** todo cambio visual, por menor que sea, se presenta primero a Carlos con enlace usable, qué cambió y puntos concretos de usabilidad; Claude Code no hace ese chequeo por él salvo petición expresa para ese cambio; Diseño/QA no sustituye el primer vistazo. En PR no desplegado: comentario **`REVISIÓN VISUAL CARLOS:`** con preview verificado, rutas y qué revisar; Carlos aprueba, pide cambios o delega a Claude; no se frenan frentes independientes. Detalle en **A2.10**.

---

---

## ADR-078 · Turno esperado en el núcleo y cálculo único de horas

**Fecha:** 5-nov-2026 · **Estado:** vigente · **Origen:** encargo de Carlos del 5-nov-2026 a «Asistencia · Núcleo legal · Code» (CAR-201; la asistencia legal se construye vendible por separado, ADR-048). (El número 077 lo tomó antes el ADR del flujo operativo de Grok Bot.)

**Contexto.** La celda de la Pauta se calcula al leer; no existe «el turno de la persona X el día Y». Asistencia necesitaba ese dato para marcar, calcular atraso y sobretiempo y alertar, y no debía recalcularlo ni depender de que la empresa tenga Pauta. Había además tres cálculos de horas (`turnos.ts`, `alertas-horas.ts`, `reemplazos.ts`) y el tope semanal fijo en 42 h.

**Decisión.**

1. **Tabla `core.turnos_esperados`** (núcleo, RLS `tenant_isolation`): persona, día operativo, `[inicio, fin)` en `timestamptz`, instalación, puesto (nulo si el origen es la jornada pactada), `origen` (`pauta` | `jornada_pactada` | `manual`), referencia (serie o excepción), colación, feriado, `version` y `vigente`. Va en el núcleo para que los módulos solo dependan del núcleo y Asistencia se venda sola. Un cambio nunca pisa: anula la fila anterior (`vigente = false`) y escribe una versión nueva, de modo que se puede saber qué turno regía al momento de marcar. Índice único parcial: una persona no tiene dos turnos vigentes que arranquen en el mismo instante.
2. **Escritura desde la Pauta: consumidor idempotente del outbox, no la misma transacción.** `core.turnos_esperados.pauta` escucha `pauta.serie.fijada`, `pauta.excepcion.creada` y `pauta.excepcion.anulada` y regenera solo los días afectados con la misma expansión que muestra la Pauta (`expandirMes`). Se eligió así porque regenerar relee serie, excepciones y feriados y vuelve al mismo resultado cuantas veces se reintente; la escritura de la Pauta no se alarga ni falla por esto; no se tocan las seis capacidades de Pauta; y el trabajo diario corrige cualquier desfase. El reemplazo mueve el turno al reemplazante; ausencia, licencia, vacaciones y permiso lo dejan no vigente; un refuerzo se suma al turno del titular si este trabaja.
3. **Horizonte y jornada pactada.** El trabajo diario `core.turnos_esperados.extender` mantiene el mes en curso y el siguiente. Con Pauta activa vuelve a derivar los puestos con serie; sin ella genera desde el vínculo laboral y la jornada DT (texto `5x2`, `4x4 08:00-20:00`, con el horario del puesto como respaldo). **Sin datos suficientes no inventa**: devuelve un aviso por persona.
4. **Un solo cálculo de horas.** Duración e intervalos salen de `packages/domain/src/turnos.ts`; la conversión hora civil → instante respeta el cambio de hora (un nocturno dura 7 o 9 h el día del cambio). `alertas-horas.ts` y `reemplazos.ts` ya no tienen su propio `horasTurno`.
5. **Topes con vigencia (ADR-056).** El tope semanal sale del indicador «jornada» del motor de sueldos, con la tabla de la Ley 21.561 como base cuando el motor no trae valores: 45 h, 44 h desde el 26-abr-2024, 42 h desde el 26-abr-2026, 40 h desde el 26-abr-2028. El tope mensual (180 h) y el descanso mínimo (12 h) son ajustes del manifest de Pauta (`limite_mensual_horas`, `descanso_minimo_horas`).
6. **Zona horaria del tenant** (`core.tenants.timezone`) en lugar de la fija de `pauta/comun.ts`.
7. **Puesto.** `cpq.puestos.confirmar` copia además función, tramo de noche y horas semanales (calculadas con `turnos.ts`); es el único cambio en `modules/cpq`. El listado de instalaciones cuenta puestos y deja de sumar la dotación deprecada.

**Frontera Núcleo / CPQ / Operaciones.**
- El catálogo de patrones, funciones, cargos y jornada legal es **uno solo, del núcleo**.
- **CPQ guarda la intención de servicio y los supuestos de costo.**
- **Operaciones es dueño de la programación** (series, excepciones y los turnos esperados que de ellas salen).
- El único paso entre ambos es `cpq.puestos.confirmar`.
- Queda para «Comercial · Code» (PR propio): `patron_id` en las líneas de CPQ y el sueldo cotizado como borrador de capa.

**Consecuencias.** Asistencia (CAR-89) lee `core.turnos_esperados.listar` y no recalcula. Nómina toma los días trabajados de Asistencia (ADR-048), no de aquí. Un cambio en las horas o el horario del puesto se refleja en el siguiente evento de Pauta o en el trabajo diario. Capacidades: `core.turnos_esperados.listar` (lectura, alcance ADR-022, auditada) y `core.turnos_esperados.regenerar` (`dryRun` e `idempotencyKey`).

---

## ADR-079 · Asistencia legal: identidad de terreno, canal híbrido y dispositivos

**Fecha:** 5-nov-2026 · **Estado:** vigente (D-03 y D-04 pendientes) · **Autor:** Carlos (decisiones del chat «Operaciones · Auditoría», 5-nov-2026 12:37 CLT), registradas por «Operaciones · Base · Code» en CAR-78. · Completa ADR-023, ADR-033 y ADR-044; cierra D1, D2 y D4 del export de Terreno.

**Decisiones de Carlos (5-nov-2026, 12:37 CLT).**

- **D-01 · Canal híbrido.** El kiosco emparejado en la instalación es el canal principal de marcación. El teléfono personal del trabajador se habilita **por persona** y exige consentimiento escrito y costo a cargo del empleador. El supervisor usa Terreno en modo supervisor y su teléfono; no hay una app Supervisor aparte.
- **D-02 · Identificación.** La principal es el rostro con prueba de vida. La secundaria es **RUT + PIN de 6 dígitos**, siempre disponible y sin biometría (Res. Ex. 38, art. 57).
- **D-12 · Paralelismo.** Dos sesiones de Operaciones trabajan en paralelo: «Operaciones · Base · Code» (identidad de terreno, dispositivos, portal Terreno, cola sin conexión y adaptador de biometría) y «Asistencia · Núcleo legal · Code» (marcas, turnos esperados y reportes DT). El proveedor real de rostro lo construye después «Asistencia · Face ID · Code».
- Fuera de alcance por decisión de Carlos: alertas de cobertura con oleadas por WhatsApp.

**Decisión de arquitectura.**

1. **Del núcleo, no de un módulo:** la identidad de terreno (RUT + PIN), los dispositivos emparejados a una instalación, la cola sin conexión y el adaptador de biometría. Asistencia, Rondas, Libro de novedades y Control de acceso los consumen; ninguno crea los suyos.
2. **Un solo service worker**, el del núcleo (`apps/web/public/sw.js`). Los módulos no registran otro: declaran qué capacidades aceptan cola.
3. **Biometría por empresa y 1:1.** Cada empresa tiene su colección; la verificación es siempre contra la referencia de una persona (1:1), nunca una búsqueda 1:N sobre la colección. La referencia del proveedor se guarda cifrada.
4. **PIN (B1).** El PIN de 6 dígitos solo existe como hash scrypt (el formato de las contraseñas de Better Auth). RR. HH. lo asigna o lo restablece (con vista previa; el temporal se muestra una vez) y la persona debe cambiarlo en su primer ingreso. Rechaza los PIN más adivinables (repetidos, secuencias, últimos dígitos del RUT). Bloqueo por credencial tras 5 intentos durante 15 minutos (ajustes `terreno_pin_intentos_maximos` y `terreno_pin_bloqueo_minutos`, por empresa), más rate limit con fallo cerrado por RUT y por origen. La respuesta es la misma exista o no el RUT. **El PIN solo abre Trabajador y Terreno:** no entra quien tenga, en cualquier empresa, membresías con otros portales (ERP, Supervisor), ni quien tenga segundo factor activo o rol de plataforma; ellos usan su correo. Con un PIN temporal de RR. HH. no se abre sesión hasta que la persona elige el suyo. La sesión es una sesión normal de Better Auth del usuario vinculado a la persona. Ingreso, intento fallido y bloqueo quedan en la cadena `seguridad` de la auditoría global (`seguridad.pin.*`, sin IP en claro). **Aviso de bloqueo (decisión de Carlos del 5-nov-2026, ~21:44 CLT):** se mantiene el bloqueo de 15 minutos, pero al bloquearse se avisa una sola vez por bloqueo a la persona (campana y correo, con «si no fuiste tú, avisa a RR. HH.») y a RR. HH. de la empresa (owner, admin y gerente; campana con enlace a la ficha para restablecer el PIN), y queda el evento `seguridad.pin.bloqueo`; mientras dura la pausa no se cuenta ni se avisa de nuevo.
5. **Teléfono personal (T-04, preparación).** `core.credenciales_terreno.telefono_personal_habilitado` existe, apagada por defecto. El flujo de consentimiento y de costo va con Face ID.

**Pendientes de decisión de Carlos (no se asumen).**

- **D-03** · Prueba de vida obligatoria desde la primera versión con rostro.
- **D-04** · Guardar solo la plantilla del rostro, sin foto de referencia.

Se deciden antes de la sesión Face ID. El contrato del adaptador de biometría (B4) soporta ambos casos sin cambiar.

## ADR-080 · CPQ: se aceptan los dos límites de concurrencia de CAR-192 y no se construye el contador de revisión

**Fecha:** 5-nov-2026 · **Estado:** vigente · **Autor:** Carlos, registrado por «Comercial · Code»

**Decisión.** Se aceptan dos límites de concurrencia del recálculo de cotizaciones en borrador (#336, #337, #344): las huellas de línea se escriben fuera de la transacción del `updateMany` de la versión, y editar líneas no sube `revision`, de modo que una edición durante el cálculo puede dejar en un borrador un cálculo de las líneas anteriores. Ambos se corrigen al recalcular o al enviar (el envío valida la huella). **No se construye** un contador de revisión por líneas. Sin cambio de producto, migración ni tests.

## ADR-082 · Face ID sobre el B4 del núcleo: un solo contrato, consentimiento por Cumplimiento y la marca es la misma (7-nov-2026)

**Contexto.** CAR-89 (D-02, D-03, D-05). Carlos ordenó (7-nov-2026 10:26 CLT) adaptar Face ID sobre el B4 de `main` (#367, ADR-079): reutilizar su contrato, sin uno paralelo, con el consentimiento por Cumplimiento. Criterio obligatorio: marcar significa que la persona **asistió a trabajar**, y eso debe verse igual en la Pauta diaria y mensual.

**Decisión.**
1. **Un solo contrato** `Biometria` (`@opai/integrations`), dueño: esta sesión. Se extiende sin romper B4: `coleccion` opcional (una por empresa, `opai-<tenant>`, D-05) e `iniciarVida?()`. El proveedor real es `biometriaRekognition` (HTTP firmado, sin SDK); la muestra es `vida:<sesión>` de Face Liveness. El simulado sigue siendo el de pruebas y CI.
2. **Proveedor por empresa**, no por entorno: la integración «biometria» y sus secretos (`access_key_id`, `secret_access_key`, `region`) salen del almacén cifrado. El simulado solo existe en pruebas/desarrollo o en una empresa `qa-…`; un proveedor real en una empresa que no es de prueba exige el ajuste de **plataforma** `biometria_empresas_reales` (apagado hasta que Carlos confirme la evaluación de impacto y el DPA, Ley 21.719). Sin eso, falla cerrado.
3. **Umbral** de similitud: ajuste de plataforma `biometria_umbral_similitud` (90 por defecto, 70–99,9), no de la empresa (T-03).
4. **Verificación 1:1 sobre Rekognition:** no ofrece 1:1 contra una plantilla guardada; se consulta la colección de la empresa y solo se acepta el `FaceId` esperado de la persona; los demás resultados se descartan sin devolverse.
5. **Consentimiento por Cumplimiento** (`biometria_asistencia`, B4) y, para T-04, `telefono_personal_asistencia`; la propia persona consiente y revoca (en el kiosco con su PIN). Revocar borra el rostro (consumidor del núcleo, y de inmediato desde la acción).
6. **Una sola marca:** rostro y RUT + PIN llegan a `asistencia.marcas.registrar` (cadena auditable, idempotente por clave del dispositivo). Rostro: `evaluarRostro` del núcleo con prueba de vida; si cae a PIN, `motivo_respaldo`. El kiosco actúa como sistema con su dispositivo resuelto en el servidor (`ejecutarAsistenciaEquipo`, lista blanca).
7. **Pauta:** `pauta.mes.leer` y `pauta.resumen.leer` agregan `presencia` a cada celda desde `asistencia.dias` (turno esperado → persona que cubre → día consolidado). La Pauta no calcula presencia.
8. **Sin marcas sin conexión por ahora:** el rostro y el PIN se verifican en el servidor; no se encola `asistencia.marcas.registrar` en la cola sin conexión (queda para un brief propio, con su propio modelo de verificación diferida).

**Pendiente (requiere intervención).** Widget de AWS Face Liveness en el navegador (credenciales temporales y dependencia nueva), configuración de la integración «biometria» por el bot con `@opai-2.0:` y prueba contra el entorno de AWS; la evaluación de impacto y el DPA; el diseño aprobado de las pantallas (D-11).

## ADR-081 · Orden de trabajo de Operaciones: Personas → Instalaciones › Puestos → Pauta

**Fecha:** 6-nov-2026 · **Estado:** vigente · **Autor:** Carlos (6-nov-2026, 08:17 CLT), registrado por «Operaciones · Puestos · Code» en CAR-206 · Adenda a ADR-048 (series de la Pauta) y al Brief 11 (Puestos).

**Decisión.** El orden en que se arma la operación es:

1. **Personas:** el guardia tiene un **vínculo laboral vigente con la instalación**.
2. **Instalaciones › Puestos:** se **crean los puestos** y se define su **ciclo (patrón), turno y horario**. **Los guardias se asignan aquí**, desde la ficha del puesto (`pauta.titular.asignar`).
3. **Pauta:** se **ve** el resultado y se **pinta**. El titular ya está elegido; la Pauta sugiere solo a los guardias vinculados a la instalación (el mismo criterio con que se valida la asignación).

**Consecuencias.**

- Asignar o quitar al titular de un puesto es una sola operación: fija la serie de la Pauta, deja el puesto en el vínculo del guardia, suelta al titular anterior, pasa el puesto a «cubierto» o PPC, deja la bitácora con quién lo hizo y emite `pauta.serie.fijada`, todo en la misma transacción. `pauta.series.fijar` sigue disponible para fijar o corregir el ciclo desde la Pauta.
- Un guardia no puede quedar como titular de dos puestos a la vez por esta vía (un vínculo tiene un solo puesto): el traslado entre puestos va por su propio flujo (CAR-207), que reutiliza `fijarSerieInterna`.
- No se crea tabla ni migración: el historial de titulares se arma con `pauta.series` y la bitácora de la Pauta.

**Adenda (6-nov-2026, 13:05 CLT, Carlos vía OPAI 2.0; registrada en CAR-207).**

1. Un guardia que ya es titular de otro puesto **se rechaza** al asignarlo: el traslado (`pauta.titular.trasladar`) es la vía.
2. **Anexos:** solo se genera borrador de anexo si cambian el sueldo o las condiciones. Un simple cambio de puesto del vínculo **no** genera anexo; el cambio de instalación sí (y el traslado a otra instalación lo emite).
3. **Backfill** único de la cobertura de los puestos con serie anterior a CAR-206, con vista previa, dentro del PR de CAR-207.
4. Orden de los encargos de la sesión: CAR-207, luego CAR-96; los menores de UI de CAR-206 van a un PR de pendientes.

## ADR-083 · Turnos extra y estado único de persona (CAR-96)

**Fecha:** 6-nov-2026 · **Estado:** vigente · **Autor:** Carlos (chat, 6-nov-2026; transferido en las pasadas de OPAI 2.0 de 13:07, 15:04 y 18:06 CLT), registrado por «Operaciones · Auditoría». Número 083 porque ADR-081 está en `main` y #360 propone otro ADR-081/082.

**Decisión.**

1. **Externos:** el guardia externo se crea en la empresa **sin contrato**, con nombre, RUT, correo y datos bancarios (cifrados, ADR-027). Al vincularse queda como guardia inactivo, que puede contratarse o no.
2. **Quién aprueba los turnos extra:** owner, admin, gerente y el rol Operaciones (permiso `pauta:aprobar_extra`). Nadie aprueba lo que él mismo registró.
3. **Supervisor:** registra el monto sugerido y **no** lo edita; quien aprueba lo edita con motivo y auditoría.
4. **Brief aprobado** (#365): pasa a Claude Design antes de cualquier código.
5. **Un solo estado por persona** (Carlos, 15:22 Santiago): Postulante → Rechazado | Externo | Activo; Externo → Activo; Activo → Inactivo; Inactivo → Activo | Externo. Cualquier otra transición se rechaza. Solo «Activo» tiene vínculo laboral.

**Consecuencias.** El PR de código de CAR-96 trae `pauta.turnos_extra`, el permiso nuevo y la migración de `core.personas.estado` (de `activa`/`inactiva` a los cinco estados), y empieza solo con el diseño aprobado (`design/DESIGN-PROMPT-turnos-extra.md`).

**Adenda (8-nov-2026) · Decisiones de Operaciones II del 29-oct-2026, hasta ahora solo en Linear.** Registradas por «Operaciones · Auditoría» con su texto de Linear; ante choque manda lo más reciente de Carlos.

- **Turnos extra (CAR-96; A5–A10, C13–C15):**
  - todo reemplazo es turno extra: lo registra el supervisor;
  - monto fijo por instalación, con excepción por puesto, editable en cada turno con motivo y auditoría;
  - se pueden sumar horas extra en la pauta diaria;
  - se paga a propios y a externos con boleta, marcando el tipo en cada turno;
  - sin tope, pero nunca doblar (regla configurable);
  - el cliente ve la cobertura, no el costo.
  - **Quién aprueba:** el 29-oct decía «Operaciones o RR. HH.»; lo reemplaza el punto 2 de este ADR (owner, admin, gerente y el rol Operaciones).
- **Supervisión y visitas (CAR-83; B6–B8):**
  - el supervisor abre en «Hoy», con alertas de puestos sin cubrir, rondas atrasadas y faltas;
  - la visita lleva check-in GPS, lista de revisión, fotos y firma del guardia;
  - asigna el reemplazo desde el celular y el turno extra queda por aprobar (compatible con el punto 3 de este ADR).
- **Turnos pedidos (CAR-100; A11, A12, C16, C17):**
  - solo se cobra al cliente lo que pide fuera de su pauta; los reemplazos por faltas los asume la empresa;
  - un guardia adicional por un día entra como solicitud que crea un puesto temporal con cobro;
  - la tarifa sale de la línea «guardia adicional» de la cotización vigente en CPQ, y Finanzas factura desde ese registro.
  - **Conciliación:** el pago al guardia vive en el turno extra; el cobro al cliente vive en el puesto temporal de la solicitud. La línea de CPQ queda por definir en el brief de CAR-100, porque hoy `adicional` es un ítem de catálogo y no una tarifa diaria.
- **Pago por lote (CAR-101; A8, C13–C14):**
  - Finanzas arma y concilia el lote semanal o quincenal de los turnos extra aprobados;
  - Nómina lo informa en el LRE si corresponde;
  - incluye propios y externos con boleta.
- **Condición previa (indicación transmitida el 7-nov-2026 en la pasada de Operaciones):**
  - turnos extra, aprobación y lote requieren una **revisión legal y contable escrita** antes de construir;
  - sin pagos reales;
  - el código de CAR-96 espera el diseño aprobado **y** esa revisión.

## ADR-084 · «Comercial · Proyecto» construye el PR 6 de CAR-138 por orden expresa de Carlos (9-nov-2026)

**Fecha:** 9-nov-2026 19:17 UTC · **Estado:** vigente solo para este PR · **Autor:** Carlos (chat), registrado por la sesión «Comercial · Proyecto».

**Contexto.** Desde el 4-nov-2026 «Comercial · Proyecto» responde, revisa y entrega prompts, y no construye ni integra. El 9-nov-2026 llegó el encargo del PR 6 de CAR-138 (capítulo por instalación, solo servidor y PDF con índice numerado) con las restricciones de superficie del brief.

**Decisión.** Carlos ordenó que esta sesión lo construya («Constrúyelo en esta sesión… Un solo PR»). Excepción acotada a ese PR: **no integra, no hace squash, no aplica migraciones, no cierra CAR-138**, no toca #400, #424 ni #409, no construye el editor en pantalla ni el PR 7, y no prepara Design Prompts. La migración la aplica el coordinador con respaldo; el PR lleva `migracion-pendiente`. Fuera de ese PR, el rol de «Comercial · Proyecto» no cambia.

