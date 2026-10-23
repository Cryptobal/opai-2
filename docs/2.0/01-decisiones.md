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
