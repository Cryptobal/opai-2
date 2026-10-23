# BRIEF DE IMPLEMENTACIÓN — 01 IDENTIDAD Y PLATAFORMA (núcleo 1a)

**Repositorio:** `Cryptobal/opai-2` · **Rama:** `main` · **Fecha:** 23-oct-2026 · **Depende de:** Brief 00, 00b y 00-infra ejecutados (ver `ESTADO.md`)

> **Cómo ejecutarlo (Carlos):** abre la app de Claude → pestaña **Code** → carpeta `~/Code/opai-2` y pega:
>
> *"Lee y ejecuta completo `docs/2.0/briefs/BRIEF-01-identidad-y-plataforma.md`. Antes lee `CLAUDE.md`, `docs/2.0/ESTADO.md` y `docs/2.0/01-decisiones.md`. Detente solo en los puntos marcados STOP."*
>
> Se detendrá dos veces: para que apruebes en el navegador la creación de las variables en Vercel y, al final, para que entres por primera vez en `https://test.opai.cl/login` con el usuario que te indicará.

---

## 1. Objetivo

Que OPAI 2.0 tenga identidad real y una plataforma mínima para operar el SaaS:

- Login para ERP y Plataforma (correo y contraseña; Google si hay credenciales).
- Usuarios que pertenecen a uno o más tenants con un rol; permisos reales en cada capacidad; portales visibles solo si el usuario tiene acceso.
- Plataforma mínima: crear tenants, activar o suspender módulos por tenant, invitar al primer administrador, ver uso, administrar API keys.
- Agentes (Grokbot, Claude) conectados por **MCP** con API keys con scopes, vía usuario responsable, con auditoría y vista previa.
- Shell real: navegación derivada de módulos activos y permisos; selector de portal y de tenant; menú de usuario.
- Telemetría de uso por tenant, módulo, portal y capacidad.

Cuando termine, Carlos entra a `test.opai.cl`, crea el tenant Gard desde Plataforma, se invita a sí mismo como Owner y conecta Grokbot al MCP de 2.0.

## 2. Estado actual del repo (verificado)

- `apps/web` sin autenticación: `apps/web/lib/contexto-http.ts` construye el contexto con `DEV_TENANT_ID` y actor `system`; en producción `/api/v1` responde 503. El shell (`apps/web/app/_components/shell.tsx`) muestra tenant y usuario de prueba y los seis portales a todo el mundo.
- `packages/capabilities`: `Contexto.autorizar` existe pero el borde pasa `() => false`; `core.ping` es la única capacidad. `executeCapability` audita escrituras reales en `core.audit_events`.
- `packages/db`: schema `core` con `Tenant` y `AuditEvent`; `forTenant(tenantId)` fija `app.tenant_id` por transacción; RLS con política `tenant_isolation` para `opai_app`. Migración inicial aplicada en Neon `main` y `dev`.
- `packages/ds`: DS 2.0 aprobado con `AppShell` (recibe `nav`, `portales`, `tenant`, `usuario`, `notificaciones`).
- `modules/registry` vacío. No hay módulos de negocio.
- Infra: `test.opai.cl` en Vercel (`opai-2`, equipo `gard-security`), Neon `opai-2` (ramas `main` y `dev`), tenant `gard` sembrado en ambas ramas (ids en `ESTADO.md`).

## 3. Alcance

### Incluido

- Autenticación con **Better Auth** (ADR-015): correo y contraseña, Google opcional, enlace mágico (para invitaciones y recuperación), sesiones con cookie, cierre de sesión.
- Modelo de identidad: `User`, `Session`, `Account`, `Verification` (Better Auth), `Membership` (usuario ↔ tenant con rol y portales), `Invitation`, `ApiKey`, `TenantModule`, `UsageEvent`; `Tenant` ampliado con estado.
- Roles por tenant y permisos con comodines (`@opai/domain`), aplicados en `executeCapability`.
- Resolución de tenant por request (cookie `opai_tenant` + membresía) y `forUser(userId)` para las consultas propias del usuario (política RLS `user_self` en `memberships`).
- Capacidades del núcleo (`core.*`) y de plataforma (`platform.*`) de la sección 7.
- Servidor MCP en `/api/mcp` con API keys; herramientas derivadas del registro; `preview_<id>` para escrituras.
- Plataforma: lista y detalle de tenants, creación, módulos, administradores, API keys, uso.
- ERP: Configuración → Empresa, Usuarios, API keys. Página de inicio con tarjetas de módulos activos.
- Shell real; páginas de los otros cuatro portales protegidas por membresía (contenido placeholder).
- Pantallas de acceso según el **diseño aprobado** en `docs/2.0/design/export-acceso/` (login, recuperar contraseña, invitación, selector de empresa). Las de Trabajador, Cliente y Terreno del mismo export se implementan en la fase 3.
- Telemetría en `core.usage_events`; vocabulario por vertical (`@opai/domain`).
- Seed del usuario plataforma de Carlos y variables de entorno en Vercel.

### Excluido (briefs siguientes)

- Maestros (cuentas, contactos, instalaciones, cargos y estructuras), documentos, configuración declarativa, notificaciones: **Brief 02**.
- Login de Trabajador (RUT y PIN, Face ID), emparejamiento de dispositivo Terreno, enlace mágico para Cliente: **fase 3 (portales)**. En este brief esos portales solo tienen la página placeholder protegida.
- 2FA, passkeys, SSO: backlog.
- Planes, precios y facturación de suscripciones: cuando exista Opai SpA.
- "Entrar como" (impersonación) desde Plataforma: backlog; en este brief un administrador de plataforma ve los datos del tenant desde Plataforma, pero no opera el ERP del tenant salvo que tenga membresía.

## 4. Arquitectura relevante

- **Better Auth** vive en un paquete nuevo `packages/auth` (`@opai/auth`): configuración del servidor (`auth.ts`), cliente para React (`client.ts`), helpers `getSession()` y `requireSession()` para Server Components y route handlers. Usa el adaptador Prisma sobre `clienteApp()` de `@opai/db` (las tablas de identidad no llevan `tenant_id` y no tienen RLS; las protege la propia librería). Base path `/api/auth`.
- **Resolución del actor** (`apps/web/lib/actor.ts`): sesión → usuario → membresías (`forUser`) → tenant actual (cookie `opai_tenant`, o la única membresía, o la primera) → `Contexto` con `autorizar` real (`tienePermiso(rol, permiso)` + plataforma). Reemplaza a `contexto-http.ts`, que se elimina.
- **API keys** (`apps/web/lib/api-key.ts` + capacidad `core.apikeys.*`): formato `opai_<slug-del-tenant>_<32 caracteres aleatorios>`; se guarda solo el hash SHA-256 y el prefijo; el slug permite resolver el tenant sin consulta cross-tenant. Scopes = lista de módulos (`core`, `crm`, …) o `*`. La key está vinculada a un usuario responsable (`userId`); el actor resultante es `{ tipo: "agent", id: <apiKeyId>, viaUserId }` y hereda los permisos de la membresía de ese usuario, acotados a los scopes.
- **MCP** (`apps/web/app/api/mcp/[[...transport]]/route.ts` con `mcp-handler`): Streamable HTTP. Autenticación por `Authorization: Bearer <key>` y, para clientes que no permiten cabeceras, `/api/mcp/k/<key>` (marcado como menos seguro en la UI de API keys). Herramientas: por cada capacidad visible para la key (módulo en scopes, módulo activo en el tenant, permiso del usuario responsable): una herramienta `<id con puntos → guiones bajos>`; si la capacidad escribe, además `preview_<id>` que ejecuta con `dryRun: true`. Input schema desde el Zod de la capacidad. Resultado como JSON del `Resultado`.
- **Permisos** (`packages/domain/src/permisos.ts`): ids `<modulo>:<accion>`; patrones con comodín por rol. Roles del tenant (ADR-016): `owner`, `admin`, `gerente`, `supervisor`, `viewer`. Rol de plataforma en `User.platformRole`: `owner` | `support` | `null`. Los permisos de plataforma son `platform:*` y solo los tiene quien tiene `platformRole`.
- **Navegación** (`apps/web/lib/navegacion.ts`): manifests registrados ∩ `tenant_modules` activos ∩ permisos del usuario → `NavItem[]` por portal, más las entradas del núcleo (Inicio, Configuración). Plataforma tiene su propia navegación fija.
- **Vocabulario** (`packages/domain/src/vocabulario.ts`): términos por vertical (`seguridad`, `aseo`, `outsourcing`, `mantenimiento`) para persona, instalación, puesto, supervisor, recorrido, novedad; `vocabulario(vertical).persona.plural` etc. Se usa en el shell y en Plataforma; los módulos lo usarán en sus pantallas.
- **Telemetría**: `executeCapability` escribe `core.usage_events` para toda ejecución (lectura y escritura), con `portal` y `modulo`; `packages/capabilities` recibe un `Telemetria` en el contexto igual que `Auditoria`. Fuera del request (`after()` de Next) para no retrasar respuestas.
- **Correo** (`packages/integrations/src/email`): interfaz `Mailer` con dos adaptadores: Resend (si `RESEND_API_KEY`) y consola (desarrollo). Usado por invitaciones y recuperación de contraseña.

## 5. Archivos

| Ruta | Función | Acción |
|---|---|---|
| `packages/db/prisma/schema/core.prisma` | Modelos de identidad, membresías, invitaciones, API keys, módulos por tenant, telemetría | Modificar |
| `packages/db/prisma/migrations/<ts>_identidad/migration.sql` | Migración aditiva + RLS + política `user_self` | Archivo nuevo propuesto |
| `packages/db/src/for-user.ts` | `forUser(userId)`: fija `app.user_id` por transacción | Archivo nuevo propuesto |
| `packages/db/src/index.ts` | Exportar `forUser`, tipos nuevos | Modificar |
| `packages/db/scripts/seed-platform-owner.ts` | Crea el usuario plataforma de Carlos | Archivo nuevo propuesto |
| `packages/db/test/rls.test.ts` | Agregar caso: `forUser(u)` ve solo las membresías de `u` | Modificar |
| `packages/auth/` (`package.json`, `src/auth.ts`, `src/client.ts`, `src/session.ts`, `src/index.ts`) | Better Auth servidor y cliente | Archivo nuevo propuesto |
| `packages/domain/src/permisos.ts` + test | Roles, patrones y `tienePermiso` | Archivo nuevo propuesto |
| `packages/domain/src/vocabulario.ts` + test | Diccionario por vertical | Archivo nuevo propuesto |
| `packages/domain/src/index.ts` | Exportar | Modificar |
| `packages/capabilities/src/types.ts` | `Contexto` con `portal`, `telemetria`, `modulosActivos`; `Actor` con `rol` | Modificar |
| `packages/capabilities/src/execute.ts` | Telemetría; autorización con permiso y módulo activo | Modificar |
| `packages/capabilities/src/contexto.ts` | `crearContexto` con autorización real y telemetría | Modificar |
| `packages/capabilities/src/core/*.ts` | Capacidades `core.*` y `platform.*` (sección 7), un archivo por entidad | Archivo nuevo propuesto |
| `packages/capabilities/src/mcp.ts` | Deriva herramientas MCP del registro | Archivo nuevo propuesto |
| `packages/capabilities/test/*.test.ts` | Tests de las capacidades nuevas con `@opai/testing` | Archivo nuevo propuesto |
| `packages/integrations/src/email/{mailer.ts,resend.ts,consola.ts,index.ts}` | Correo | Archivo nuevo propuesto |
| `packages/ds/src/components/{menu.tsx,dialog.tsx,switch.tsx}` | Menú de usuario, diálogo de confirmación, switch | Archivo nuevo propuesto |
| `packages/ds/src/shell/user-menu.tsx` | Avatar con menú (perfil, tenant, salir) | Archivo nuevo propuesto |
| `packages/ds/src/shell/top-bar.tsx`, `sidebar.tsx`, `app-shell.tsx` | Aceptar `menuUsuario` y `tenants` (selector si > 1) | Modificar |
| `apps/web/app/api/auth/[...all]/route.ts` | Handler Better Auth | Archivo nuevo propuesto |
| `apps/web/app/api/mcp/[[...transport]]/route.ts`, `apps/web/app/api/mcp/k/[key]/[[...transport]]/route.ts` | MCP | Archivo nuevo propuesto |
| `apps/web/app/api/v1/[...capability]/route.ts` | Usar `resolverActor` (sesión o API key) | Modificar |
| `apps/web/lib/actor.ts`, `apps/web/lib/api-key.ts`, `apps/web/lib/navegacion.ts`, `apps/web/lib/tenant-actual.ts` | Resolución de actor, keys, navegación, tenant | Archivo nuevo propuesto |
| `apps/web/lib/contexto-http.ts` | Reemplazado por `actor.ts` | Eliminar |
| `apps/web/middleware.ts` (o `proxy.ts` si Next 16 lo llama así) | Redirige a `/login` sin sesión; protege portales por membresía | Archivo nuevo propuesto |
| `apps/web/app/(auth)/login/page.tsx`, `recuperar/page.tsx`, `invitacion/[slug]/[token]/page.tsx` | Acceso (provisional con DS) | Archivo nuevo propuesto |
| `apps/web/app/_components/shell.tsx`, `portales.ts` | Shell real con datos de sesión | Modificar |
| `apps/web/app/(erp)/page.tsx` | Inicio: tarjetas de módulos activos | Modificar |
| `apps/web/app/(erp)/configuracion/{empresa,usuarios,api-keys}/page.tsx` + componentes | Configuración del tenant | Archivo nuevo propuesto |
| `apps/web/app/(platform)/platform/page.tsx`, `tenants/nuevo/page.tsx`, `tenants/[id]/page.tsx` + componentes | Plataforma | Modificar / Archivo nuevo propuesto |
| `apps/web/app/(trabajador|terreno|cliente|supervisor)/**/page.tsx` | Placeholder protegido | Modificar |
| `apps/web/test/*.test.ts`, `apps/web/e2e/acceso.spec.ts` | Tests | Archivo nuevo propuesto |
| `.env.example`, `CLAUDE.md`, `docs/2.0/ESTADO.md`, `docs/2.0/01-decisiones.md` | Variables, reglas, estado, ADR-015 y ADR-016 | Modificar |

Archivos de hasta 150 líneas: dividir pantallas en componentes (`_components/`) como en `/ds`.

## 6. Modelo de datos y migraciones

Todo en schema `core`, aditivo. Modelos de Better Auth con los nombres que su adaptador Prisma espera (`User`, `Session`, `Account`, `Verification`) y columnas `snake_case` vía `@map`:

```prisma
model User {
  id            String    @id @default(uuid(7)) @db.Uuid
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false) @map("email_verified")
  image         String?
  /// "owner" | "support" | null — rol en la plataforma OPAI (no en un tenant)
  platformRole  String?   @map("platform_role")
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  sessions      Session[]
  accounts      Account[]
  memberships   Membership[]
  @@map("users") @@schema("core")
}
model Session { id String @id @default(uuid(7)) @db.Uuid; expiresAt DateTime @map("expires_at") @db.Timestamptz(6); token String @unique; ipAddress String? @map("ip_address"); userAgent String? @map("user_agent"); userId String @map("user_id") @db.Uuid; user User @relation(fields: [userId], references: [id], onDelete: Cascade); createdAt/updatedAt; @@index([userId]) @@map("sessions") @@schema("core") }
model Account { id; accountId @map("account_id"); providerId @map("provider_id"); userId; accessToken?; refreshToken?; idToken?; accessTokenExpiresAt?; refreshTokenExpiresAt?; scope?; password?; createdAt/updatedAt; @@index([userId]) @@map("accounts") @@schema("core") }
model Verification { id; identifier; value; expiresAt; createdAt/updatedAt; @@index([identifier]) @@map("verifications") @@schema("core") }

model Tenant {  // ampliar
  estado   String @default("trial")   // "trial" | "activo" | "suspendido"
  memberships Membership[]; modules TenantModule[]; apiKeys ApiKey[]; invitations Invitation[]; usage UsageEvent[]
}

model Membership {
  id String @id @default(uuid(7)) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  userId   String @map("user_id") @db.Uuid
  /// "owner" | "admin" | "gerente" | "supervisor" | "viewer"
  rol      String
  /// ["erp","supervisor","trabajador","terreno","cliente"]
  portales String[]
  /// "activa" | "suspendida"
  estado   String @default("activa")
  createdAt/updatedAt
  @@unique([tenantId, userId]) @@index([userId]) @@map("memberships") @@schema("core")
}

model Invitation {
  id, tenantId, email, rol, portales String[], tokenHash @unique @map("token_hash"), invitedByUserId @map("invited_by_user_id"),
  expiresAt, acceptedAt?, createdAt
  @@index([tenantId, email]) @@map("invitations") @@schema("core")
}

model TenantModule {
  id, tenantId, moduloId @map("modulo_id"), estado String @default("activo") /* "trial" | "activo" | "suspendido" */, activadoEn @map("activado_en"), config Json?, createdAt/updatedAt
  @@unique([tenantId, moduloId]) @@map("tenant_modules") @@schema("core")
}

model ApiKey {
  id, tenantId, userId /* responsable */, nombre, prefijo /* "opai_gard_ab12" */, hash @unique, scopes String[],
  ultimoUsoEn? @map("ultimo_uso_en"), expiraEn? @map("expira_en"), revocadaEn? @map("revocada_en"), createdAt/updatedAt
  @@index([tenantId]) @@map("api_keys") @@schema("core")
}

model UsageEvent {
  id, tenantId, userId? , actorType @map("actor_type"), portal?, modulo, capability, efecto, dryRun Boolean @map("dry_run"), ok Boolean, duracionMs Int @map("duracion_ms"), createdAt
  @@index([tenantId, createdAt]) @@index([tenantId, modulo]) @@map("usage_events") @@schema("core")
}
```

Reglas de la migración (ver `CLAUDE.md`):

- `memberships`, `invitations`, `tenant_modules`, `api_keys`, `usage_events`: `ENABLE ROW LEVEL SECURITY` + política `tenant_isolation`.
- `memberships` además: política `user_self` (`FOR SELECT TO opai_app USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)`), para listar los tenants de un usuario antes de elegir tenant. Las políticas son permisivas: cualquiera de las dos da acceso.
- `users`, `sessions`, `accounts`, `verifications`: sin RLS (no tienen tenant); grants normales a `opai_app`.
- `forUser(userId)` en `packages/db/src/for-user.ts`: igual que `forTenant` pero con `set_config('app.user_id', …)`. Solo se usa para `memberships` propias; el resto siempre va por `forTenant`.
- Los ids de tenant `gard` ya existentes se conservan. La migración se crea con `pnpm db:migrate` contra `dev`, se aplica con `pnpm db:deploy` contra `dev`, se prueba, y solo al final del brief contra `main`.

## 7. Capacidades a registrar

| Capacidad | Permiso | Efecto | dryRun | Notas |
|---|---|---|---|---|
| `core.me` | `null` (requiere sesión o key) | lectura | no | usuario, tenant actual, rol, portales, permisos, módulos activos |
| `core.tenant.get` | `core:tenant.read` | lectura | no | |
| `core.tenant.update` | `core:tenant.manage` | escritura | sí | nombre, timezone; vertical solo plataforma |
| `core.users.list` | `core:users.read` | lectura | no | membresías con usuario |
| `core.users.invite` | `core:users.manage` | escritura | sí | crea `Invitation`, envía correo con enlace `/invitacion/<slug>/<token>` |
| `core.users.update` | `core:users.manage` | escritura | sí | rol, portales, estado; nunca degradar al último owner |
| `core.users.remove` | `core:users.manage` | irreversible | sí | elimina membresía; nunca al último owner |
| `core.invitations.list` / `core.invitations.revoke` | `core:users.manage` | lectura / escritura | — / sí | |
| `core.modules.list` | `core:tenant.read` | lectura | no | manifests registrados con estado en el tenant |
| `core.apikeys.list` / `core.apikeys.create` / `core.apikeys.revoke` | `core:apikeys.manage` | lectura / escritura / irreversible | — / sí / sí | `create` devuelve el secreto una sola vez |
| `core.audit.list` | `core:audit.read` | lectura | no | paginado, filtros por capability y actor |
| `core.usage.summary` | `core:tenant.read` | lectura | no | eventos por módulo y portal en un rango |
| `platform.tenants.list` / `platform.tenants.get` | `platform:tenants.read` | lectura | no | |
| `platform.tenants.create` | `platform:tenants.manage` | escritura | sí | slug, nombre, vertical, timezone; activa `core` y crea trial |
| `platform.tenants.update` / `platform.tenants.set_estado` | `platform:tenants.manage` | escritura / irreversible | sí | suspender bloquea login de sus miembros |
| `platform.modules.set` | `platform:modules.manage` | escritura | sí | activa, pone en trial o suspende un módulo del tenant; valida dependencias del manifest |
| `platform.admins.invite` | `platform:tenants.manage` | escritura | sí | invita al primer `owner` del tenant |
| `platform.usage.summary` | `platform:tenants.read` | lectura | no | uso por tenant |

Las capacidades `platform.*` corren con `tenantId` del tenant objetivo (parámetro `tenantId` en el input, validado contra `platformRole`), nunca cross-tenant en una sola consulta; `platform.tenants.list` usa la tabla `tenants` (sin RLS) con `clienteApp()` desde `packages/db` a través de un helper `listarTenants()` exportado solo para plataforma.

Autorización en `executeCapability`: `permiso === null` → requiere actor autenticado (no `system` en producción); si no, `ctx.autorizar(permiso)` que resuelve: (1) `platform:*` solo con `platformRole`; (2) para el resto, `tienePermiso(rol de la membresía, permiso)`; (3) el módulo de la capacidad debe estar activo en el tenant (`core` y `platform` siempre lo están); (4) para agentes, además el módulo debe estar en los scopes de la key. Un fallo devuelve `FORBIDDEN` y se registra en telemetría con `ok: false`.

## 8. Interfaz y responsive

Componer con los patrones del DS; sin estilos nuevos. Referencia visual: `docs/2.0/design/export-ds-2.0/`.

- **Acceso** (diseño aprobado, ver `docs/2.0/design/export-acceso/README.md` con las reglas observadas; abrir los HTML como referencia de layout y jerarquía, nunca copiar su código):
  - **Login** (`/login`): `01_Login_ERP_375.html` y `02_Login_ERP_1280.html`. Tarjeta de 400px máx. centrada en desktop; pantalla completa en teléfono. Estados: por defecto, error de credenciales (caja `danger-muted` con el texto sobre los 5 intentos), cuenta suspendida (caja `warning-muted` con el nombre de la persona administradora del tenant), cargando ("Entrando…", controles deshabilitados). "Continuar con Google" solo si hay credenciales. Pie: "Entrar como trabajador · Portal cliente" (enlaces a rutas que en este brief muestran "Disponible pronto").
  - **Recuperar contraseña** (`/recuperar` y `/recuperar/[token]`): `03_Recuperar_contrase_a_375.html`.
  - **Invitación** (`/invitacion/[slug]/[token]`): `04_Invitaci_n_375.html`, con las cuatro variantes (sin cuenta, con cuenta, expirada, usada).
  - **Selector de empresa** (`/elegir-empresa`, tras el login cuando hay más de una membresía): `05_Selector_de_empresa.html`.
  - Crear en `packages/ds` lo que estas pantallas necesiten y no exista: `AuthCard` (tarjeta de acceso con wordmark y sufijo de portal), `Alerta` (caja de estado con icono: `danger`, `warning`, `info`, `success`) y `EstadoIlustrado` (icono en círculo + título + texto, para expirada/usada). El `Keypad` del login de Trabajador queda para la fase 3.
- **Shell**: `TopBarTelefono` y `Sidebar` reciben `menuUsuario` (avatar → menú con nombre, correo, "Cambiar de empresa" si hay más de una membresía, "Cerrar sesión") y el selector de portal muestra solo `membership.portales` (si hay uno solo, no se muestra el selector; queda el monograma y el nombre del portal). Plataforma aparece en el selector solo con `platformRole`.
- **ERP · Inicio**: `DashboardScreen` sin KPIs de negocio todavía: tarjetas de los módulos activos (nombre, descripción, enlace) y un mensaje si no hay módulos activos.
- **ERP · Configuración**: `ListScreen` de usuarios (nombre, correo, rol, portales, estado; acción "Invitar usuario" abre `Sheet` con `FormScreen` compacto), `DetailScreen` de empresa (`Pares` editables en `Sheet`), `ListScreen` de API keys (nombre, prefijo, scopes, último uso; crear muestra el secreto una sola vez en un `Dialog` con botón copiar; revocar con confirmación).
- **Plataforma**: `ListScreen` de tenants (nombre, slug, vertical, estado, módulos activos, usuarios); `DetailScreen` de tenant con tabs Resumen (`Pares` + uso 30 días), Módulos (lista de manifests con `Switch` activo/trial/suspendido), Administradores (membresías owner/admin + invitar), API keys; `FormScreen` "Nuevo tenant" (slug con validación, nombre, vertical, timezone, correo del primer administrador).
- Viewports: verificar a 375 y 1024 (Playwright) y revisar a 1280. Touch targets ≥44px. Estados loading, vacío, error y sin permisos en toda pantalla.

## 9. Seguridad y tenant

- Toda ruta bajo `(erp)`, `(platform)`, `(trabajador)`, `(terreno)`, `(cliente)`, `(supervisor)` exige sesión (middleware) y, en el servidor de cada página, membresía con el portal correspondiente (o `platformRole` para Plataforma). Ocultar en la UI no basta: la verificación es en servidor y en cada capacidad.
- Tenant actual solo entre las membresías activas del usuario; un tenant `suspendido` rechaza el login de sus miembros (plataforma sigue entrando).
- Contraseñas con el hash por defecto de Better Auth (scrypt); mínimo 10 caracteres. Enlaces de invitación y recuperación: token aleatorio de 32 bytes, solo hash en base de datos, expiran a las 72 horas, un solo uso.
- API keys: solo hash; secreto mostrado una vez; `revocadaEn` y `expiraEn` respetados; `ultimoUsoEn` actualizado como máximo una vez por minuto. La variante `/api/mcp/k/<key>` no se registra en logs (el handler no loguea la URL) y la UI la marca "menos segura, solo para clientes sin cabeceras".
- Rate limit básico en `/api/auth` y `/api/mcp` (por IP y por key, en memoria por instancia; suficiente para este brief; se centraliza después).
- `BETTER_AUTH_SECRET` solo en Vercel y `.env.local`. Nunca en el repo ni en la salida de consola.
- Cabeceras de seguridad en `next.config.ts`: `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`; CSP queda para un brief posterior.

## 10. Casos límite

- Usuario con membresía en varios tenants: selector de tenant en el menú de usuario; el cambio escribe la cookie y recarga.
- Último `owner` del tenant: no se puede degradar, suspender ni eliminar (`core.users.update`/`remove` devuelven error claro).
- Invitación a un correo que ya tiene usuario: el enlace pide iniciar sesión y crea la membresía; a uno que ya es miembro: error "ya pertenece".
- Invitación expirada o usada: página con mensaje y botón "Pedir nueva invitación" (correo al administrador).
- Key con scope de un módulo que luego se suspende: las herramientas desaparecen del MCP y la API devuelve `FORBIDDEN` con mensaje "módulo inactivo".
- Clave MCP de un usuario cuya membresía fue suspendida o eliminada: `401` y la key se marca como inválida en la lista.
- `platform.tenants.create` con slug existente o reservado (`www`, `app`, `test`, `api`, `platform`): error de validación.
- Sin `RESEND_API_KEY` (desarrollo): el adaptador de consola imprime el enlace de invitación en el log del servidor para poder probarlo.
- Next 16: si el archivo de middleware se llama `proxy.ts` en esta versión, usar ese nombre (verificar en `node_modules/next/dist/docs`).

## 11. Plan de implementación

Un commit por bloque, gate verde antes de cada uno. Prefijos: `core:`, `ds:`, `infra:`, `docs:`.

### Bloque 0 · Lectura

Leer `CLAUDE.md`, `ESTADO.md`, ADR-002/003/004 y, en `node_modules`, la documentación de Better Auth (`better-auth`, adaptador Prisma, plugins `magic-link` si se usa, `organization` **no** se usa: la membresía es propia para controlar RLS), de `mcp-handler` y `@modelcontextprotocol/server` (SDK 2.x; la API puede diferir de lo conocido) y de Next 16 sobre middleware/proxy y `after()`. Registrar versiones elegidas en `ESTADO.md`.

### Bloque 1 · Dominio: permisos y vocabulario (`core:`)

`packages/domain/src/permisos.ts`: `ROLES`, `PATRONES_POR_ROL` (ADR-016), `tienePermiso(rol, permiso)`, `permisosDe(rol, modulosActivos)`. `vocabulario.ts`: diccionario por vertical. Tests: cada rol contra una tabla de permisos esperados (incluido que `gerente`, `supervisor` y `viewer` **no** tienen `finanzas:*` ni `nomina:*`, herencia del bloqueo financiero de 1.0), comodines, vocabulario completo por vertical.

### Bloque 2 · Base de datos (`core:`)

Modelos de la sección 6, `forUser`, migración con RLS y `user_self`, helper `listarTenants()`; test de RLS ampliado (`forUser` ve solo lo suyo; `forTenant(A)` no ve membresías de B). Aplicar en `dev`, correr `pnpm test:db`.

### Bloque 3 · `packages/auth` (`core:`)

Better Auth con adaptador Prisma, `emailAndPassword`, Google condicional, `magicLink` para recuperación, cookie segura, `trustedOrigins` con `BETTER_AUTH_URL`. `getSession()`/`requireSession()`. Handler `/api/auth/[...all]`. Seed `seed-platform-owner.ts` (crea el `User` con `platformRole: "owner"` y contraseña desde `SEED_OWNER_PASSWORD`; idempotente). Mailer en `packages/integrations`.

### Bloque 4 · Capacidades del núcleo y plataforma (`core:`)

Sección 7, tests con `@opai/testing` (autorización por rol, último owner, invitación, key creada una sola vez, módulos con dependencias). `Contexto` ampliado; telemetría en `executeCapability`; `crearContexto` con autorización real.

### Bloque 5 · Borde web: actor, API v1, MCP (`core:`)

`actor.ts` (sesión o API key), `api-key.ts`, `/api/v1` con actor real (eliminar `contexto-http.ts` y `DEV_TENANT_ID`), `/api/mcp` con `mcp-handler` y `packages/capabilities/src/mcp.ts`. Tests: `/api/v1/core/me` con sesión falsa y con key; key revocada → 401; MCP lista herramientas según scopes (test unitario de `mcp.ts`).

### Bloque 6 · DS: menú, diálogo, switch, selector de tenant (`ds:`)

Componentes nuevos y props del shell. Página `/ds` actualizada con ejemplos. Capturas.

### Bloque 7 · Pantallas (`core:`)

Login provisional, invitación, recuperación; shell real; ERP inicio y configuración; Plataforma; placeholders protegidos; middleware. Playwright `acceso.spec.ts`: login con el usuario sembrado (en local, contra `dev`), ver ERP, abrir Configuración → Usuarios, a 375 y 1024.

### Bloque 8 · Infraestructura (`infra:`) — **STOP** para aprobar en el navegador

Desde el Mac con las CLIs: generar `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), crear en Vercel `BETTER_AUTH_SECRET` (production y preview) y `BETTER_AUTH_URL=https://test.opai.cl` (production); `RESEND_API_KEY` y `EMAIL_FROM=OPAI <no-reply@opai.cl>` si Carlos tiene la key de Resend a mano (si no, dejar el adaptador de consola y anotarlo en `ESTADO.md`); `GOOGLE_CLIENT_ID/SECRET` solo si existen. Quitar `DEV_TENANT_ID` de Vercel. Aplicar la migración en Neon `main` (`pnpm db:deploy` con la URL propietaria de `main`). Correr el seed del usuario plataforma contra `main` con `SEED_OWNER_PASSWORD` generada al momento y **mostrada a Carlos una sola vez en la consola** (no en archivos). Deploy a producción. Verificar `https://test.opai.cl/login` responde, `/api/v1/core/me` sin sesión → 401, `/api/mcp` sin key → 401.

### Bloque 9 · Primer uso guiado — **STOP**

Pedir a Carlos que entre en `https://test.opai.cl/login` con `carlos.irigoyen@opai.cl` y la contraseña mostrada, cambie la contraseña desde el menú de usuario, cree el tenant **Gard Security** (slug `gard`, vertical `seguridad`) desde Plataforma con su propio correo como administrador, acepte la invitación, entre al ERP y cree una API key "Grokbot" con scope `*`. Si el tenant `gard` sembrado en el Brief 00 ya existe en `main`, `platform.tenants.create` debe detectarlo y ofrecer "usar existente" (adoptarlo: activar `core` y crear la invitación).

### Bloque 10 · Estado y reporte (`docs:`)

`ESTADO.md` (hecho, versiones, decisiones, pendientes), ADR-015 y ADR-016 en `01-decisiones.md`, `CLAUDE.md` (comandos nuevos, regla de `forUser`, regla de permisos), `.env.example`. `docs/2.0/CONTEXTO-agentes.md`: agregar la URL del MCP de 2.0 y cómo se conecta Grokbot (cabecera Bearer o `/api/mcp/k/<key>`), sin incluir ninguna key.

## 12. Tests obligatorios

- Dominio: `permisos.test.ts` (tabla rol × permiso, comodines, último owner no se calcula aquí), `vocabulario.test.ts`.
- Base: `rls.test.ts` ampliado (`user_self`, aislamiento de membresías e invitaciones).
- Capacidades: un archivo por entidad (`core-users.test.ts`, `core-apikeys.test.ts`, `platform-tenants.test.ts`, `platform-modules.test.ts`) con contexto falso; `mcp.test.ts` (herramientas derivadas por scopes y módulos activos; `preview_` solo para escrituras).
- Web: `actor.test.ts` (sesión, key válida, key revocada, key de usuario suspendido), `api-v1.test.ts` (`core.me` 401/200).
- Playwright: `acceso.spec.ts` a 375 y 1024.

## 13. Validación

- Gate verde local y en CI; `pnpm test:db` verde contra `dev`.
- Build de producción verde; deploy en `test.opai.cl`.
- Revisión visual de login (estados por defecto, error, suspendida, cargando; claro y oscuro), invitación (cuatro variantes), selector de empresa, ERP inicio, Configuración → Usuarios, Plataforma → Tenants y detalle a 375, 1024 y 1280 (capturas en `apps/web/e2e/__screenshots__/`), comparadas lado a lado con el export aprobado.
- Prueba manual del MCP con la key creada por Carlos: `tools/list` muestra `core_me`, `core_users_list`, `preview_core_users_invite`, etc.; `core_me` devuelve el tenant Gard y el actor `agent vía Carlos`; una escritura real queda en `core.audit_events` con `actor_type = "agent"` y `via_user_id` de Carlos.
- `grep` de hex fuera de `tokens.css` vacío; ningún archivo > 150 líneas; ningún secreto en el repo ni en la consola.

## 14. Criterios de aceptación

- [ ] Login, recuperación, invitación y selector de empresa implementados según el export aprobado, con todos sus estados, en claro y oscuro.
- [ ] Login con correo y contraseña en `test.opai.cl`; cierre de sesión; recuperación por enlace.
- [ ] Usuario sin sesión no puede ver ninguna página de portal (redirige a `/login`); usuario sin membresía en un portal recibe "sin permisos" en servidor.
- [ ] Selector de portal muestra solo los portales del usuario; Plataforma solo con `platformRole`.
- [ ] Plataforma: crear tenant, activar/suspender módulos, invitar administrador, ver uso.
- [ ] ERP: Configuración → Empresa, Usuarios (invitar, cambiar rol, suspender; último owner protegido), API keys (crear con secreto una sola vez, revocar).
- [ ] `/api/v1` y `/api/mcp` autentican por sesión o key; `FORBIDDEN` por permiso y por módulo inactivo; escrituras de agente auditadas "vía usuario".
- [ ] MCP: herramientas derivadas del registro, `preview_` para escrituras, scopes respetados.
- [ ] Telemetría en `core.usage_events` para toda capacidad ejecutada.
- [ ] Roles con bloqueo financiero (`gerente`, `supervisor`, `viewer` sin `finanzas:*` ni `nomina:*`) probado.
- [ ] Carlos entró, creó Gard, se invitó, aceptó, creó la key de Grokbot y Grokbot ejecutó `core_me` contra 2.0.
- [ ] `ESTADO.md`, ADR-015/016, `CLAUDE.md`, `.env.example` y `CONTEXTO-agentes.md` actualizados.

## 15. Riesgos y rollback

- Better Auth o `mcp-handler` con API distinta a la conocida: conservar el objetivo, adaptar y reportar; si una pieza no funciona en Next 16 + Cache Components, aislarla en un route handler con `runtime = "nodejs"` y reportar.
- Migración aditiva: rollback = revertir el commit y dejar las tablas nuevas vacías (no se borran).
- Si el seed del usuario plataforma falla contra `main`, no reintentar con otra contraseña impresa: reportar y detenerse.
- No tocar OPAI 1.0 ni sus claves. Grokbot sigue apuntando a 1.0 hasta que Carlos cambie la configuración.

## 16. Instrucción final para Claude Code

Implementa este brief en el repositorio `opai-2`, bloque por bloque y en orden. Antes de editar lee `CLAUDE.md`, `docs/2.0/ESTADO.md` y `docs/2.0/01-decisiones.md`, verifica los archivos indicados y confirma los hechos técnicos. El repositorio y la documentación instalada de cada librería son la fuente final de verdad: si contradicen un detalle, conserva el objetivo funcional, adapta y reporta la diferencia. No ejecutes acciones destructivas ni cambios en OPAI 1.0. No imprimas secretos salvo la contraseña inicial del bloque 8, una sola vez. Detente solo en los puntos marcados **STOP**. Corre el gate antes de cada commit, corrige los errores que introduzcas, revisa el diff y haz un commit por bloque; push al final de cada bloque. Al terminar informa: qué se implementó, archivos cambiados, validaciones y resultados, versiones elegidas, y riesgos o pendientes materiales.
