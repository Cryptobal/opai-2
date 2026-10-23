# ESTADO — OPAI 2.0

**Última actualización:** 23-oct-2026 · **Actualizado por:** Claude (arquitectura) · **Fase en curso:** 1 — Núcleo (Brief 01 cerrado; siguiente: Brief 02)

Este archivo es la fuente de verdad del avance. Cada brief lo actualiza al terminar. Si algo no está aquí, no está hecho.

## Hecho

- Decisión de construir OPAI 2.0 desde cero (ver `01-decisiones.md`, ADR-001 a ADR-016).
- Documento de arranque, registro de decisiones, contexto para agentes e instrucciones del proyecto Claude en `docs/2.0/`.
- Design Prompt de fundamentos del DS 2.0 en `docs/2.0/design/DESIGN-PROMPT-ds-2.0-fundamentos.md`.
- **Diseño de acceso aprobado** (23-oct): export en `docs/2.0/design/export-acceso/` (login con estados, recuperar contraseña, invitación, selector de empresa, login Trabajador con teclado numérico, login Cliente, emparejar Terreno; claro y oscuro). El Brief 01 implementa las cuatro primeras; las de Trabajador, Cliente y Terreno se implementan en la fase 3.
- **Brief 00 (Fundación) ejecutado, bloques 1 a 8 y 10** (commits `22a630d` → `d08a676`):
  - Monorepo pnpm + Turborepo, TypeScript estricto, ESLint 10 con reglas del proyecto (150 líneas, Prisma solo en `packages/db`, dominio puro), Prettier, Vitest 5.
  - `packages/db`: Prisma 7 (`prisma-client` + `@prisma/adapter-pg`), esquemas en `prisma/schema/` (`core.prisma` con `Tenant` y `AuditEvent`), migración inicial con rol `opai_app` (NOBYPASSRLS), grants, RLS y política `tenant_isolation`; `forTenant(tenantId)` fija `app.tenant_id` por transacción; `dbAdmin()` solo para scripts; scripts de contraseña del rol y seed del tenant `gard`. **Test de aislamiento en verde contra Postgres 16 real** (dos tenants, cero fuga, cero filas sin tenant, escritura cruzada rechazada).
  - `packages/domain`: dinero CLP en enteros, redondeo contable, IVA, UF escalada, formato chileno; 8 tests.
  - `packages/capabilities`: `defineCapability`, registro, `executeCapability` (valida input y output, autoriza, ejecuta, audita escrituras reales con actor y clave de idempotencia, `dryRun`), handler HTTP para `/api/v1`, `defineModule`/`registrarModulos`; 15 tests.
  - `packages/ds` (DS 2.0 provisional, ADR-013): `tokens.css` neutro marcado PROVISIONAL, componentes base propios, `AppShell` (bottom nav 375 / riel 1024 / barra lateral 1280, selector de portal, safe-area), cinco patrones con `state` y cuatro estados.
  - `apps/web`: Next.js 16 (Turbopack, Cache Components), route groups por portal con una página cada uno, `GET /api/health`, `/api/v1/[...capability]` (503 en producción hasta el Brief 01), página `/ds` solo fuera de producción. Build de producción verificado; capturas de `/ds` a 375 y 1024 en `apps/web/e2e/__screenshots__/`.
  - `modules/registry` (`@opai/modules`) y `pnpm scaffold:module <id> --nombre` (verificado con un módulo de prueba, luego eliminado).
  - `CLAUDE.md`, `README.md`, `.env.example`, CI (`typecheck`, `lint`, `test`, `test:db` con Postgres 16 como servicio).
  - Gate completo en verde: `pnpm typecheck && pnpm lint && pnpm test` (27 tests) y `pnpm test:db` (4 tests).
- **Brief 00b ejecutado: DS 2.0 definitivo** (ADR-014). Diseño aprobado por Carlos en Claude Design; export guardado en `docs/2.0/design/export-ds-2.0/` (40 pantallas). `tokens.css` reemplazado por los valores aprobados (Inter + JetBrains Mono autoalojadas, índigo, neutros, modo oscuro verdadero), `styles.css` con estilos tipográficos; componentes, shell (barra superior con selector de portal, barra inferior, riel, barra lateral con tenant y usuario) y patrones ajustados al diseño; nuevos `Chip`, `ChipAgregar`, `Avatar`, `Monograma`, `PortalSwitcher`. Revisado visualmente a 375, 1024 y 1280 en claro y oscuro; build y gate en verde; capturas actualizadas.

- **Brief 00-infra ejecutado:** Neon `opai-2` (ramas `main` y `dev`, migración aplicada, `opai_app` con contraseña, tenant `gard` en ambas), `pnpm test:db` en verde contra `dev` (4 tests), Vercel `opai-2` en `gard-security` conectado al repo, **`https://test.opai.cl` en línea** (CNAME en Cloudflare, DNS only; certificado Let's Encrypt emitido por Vercel): `/api/health` → `ok: true` en `gru1`, `/` muestra el shell, `/ds` → 404.

- **Brief 01 (identidad y plataforma) ejecutado completo, bloques 1 a 10** (commits `a998436` → este):
  - `@opai/domain`: roles `owner/admin/gerente/supervisor/viewer` con patrones permitir/denegar y bloqueo financiero (gerente, supervisor y viewer sin `finanzas:*` ni `nomina:*`), permisos de plataforma solo por `platformRole` (`owner` todo, `support` lectura), `permisosDe`, `puedeAsignarRol`; vocabulario por vertical. 105 tests.
  - `packages/db`: modelos de Better Auth (`users`, `sessions`, `accounts`, `verifications`, sin RLS) y `memberships` (RLS `tenant_isolation` + `user_self` de solo lectura), `invitations`, `tenant_modules`, `api_keys`, `usage_events` (RLS), `tenants.estado`. Migración `20261023044757_identidad` aplicada en `dev` y `main`. `forUser`, `globales()`, `clienteAuth()`. Tests de RLS ampliados (8 en verde contra `dev`).
  - `@opai/auth`: Better Auth 1.7 (correo y contraseña sin registro público, Google opcional, recuperación por enlace de 30 minutos con token hasheado, cookies `opai.*`, rate limit de 5 intentos de login cada 15 minutos, bloqueo de ingreso para miembros de tenants o membresías suspendidas con motivo visible solo tras validar la contraseña). Seed idempotente del usuario plataforma. `@opai/integrations/email`: Resend por HTTP y consola.
  - `@opai/capabilities`: contexto con usuario, rol, portal, módulos activos, scopes, plataforma y servicios; `executeCapability` verifica tenant, módulo activo, scopes y permiso, audita en el tenant objetivo y mide toda ejecución en `usage_events`. 27 capacidades `core.*` y `platform.*` (sección 7 del brief más `core.invitations.peek/accept/request_new`, internas). Derivación MCP (`herramientasMcp`, `preview_<id>` para escrituras). Contexto de prueba con base en memoria en `@opai/capabilities/testing`. 47 tests.
  - `apps/web`: `proxy.ts` (Next 16) redirige a `/login` sin sesión; `resolverActor` (sesión o API key), `/api/v1` real, MCP en `/api/mcp` y `/api/mcp/k/<key>` (mcp-handler 2 + SDK MCP 2), cabeceras de seguridad. Shell real (navegación por permisos y módulos, portales de la membresía, menú de usuario con cambio de empresa y de contraseña), ERP (inicio, Usuarios, API keys, Empresa), Plataforma (empresas, nueva con "usar existente", detalle con módulos, administradores, API keys y uso), portales placeholder protegidos. Acceso según `export-acceso`: login con estados, `/recuperar` y `/recuperar/[token]`, invitación (4 variantes), `/elegir-empresa`; Trabajador y Cliente muestran "Disponible pronto". DS: `Menu`, `Dialog`, `Switch`, `UserMenu`, `AuthCard`, `Alerta`, `EstadoIlustrado`, `InputPassword`, `Separador`, `estilosBoton`.
  - Verificado en local contra `dev`: flujo completo (login, adoptar Gard desde Plataforma, aceptar invitación, ERP, crear API key) y MCP (`tools/list`, `core_me` como agente vía Carlos, `preview_core_users_invite` sin escribir, escritura real auditada con `actor_type = agent` y `via_user_id`). Gate en verde (164 tests), `test:db` en verde, Playwright 51 en verde (capturas en `apps/web/e2e/__screenshots__/` y `__screenshots__/acceso/`), build de producción en verde.
  - Producción (`test.opai.cl`): variables creadas, migración y seed en `main`, deploy `dpl_8psk5aH21ZR7PpqA4xwZigMqpEx2`. Verificado: `/login` 200, portales redirigen a `/login`, `/ds` y `/ds/acceso` 404, `/api/v1/core/me` sin sesión 401, `/api/mcp` sin key 401, login real de Carlos 200 y `platform.tenants.list` con el tenant `gard` existente.

  - Primer uso (bloque 9, 23-oct): Carlos entró como usuario plataforma, invitó desde Plataforma a `carlos.irigoyen@gard.cl` como owner de Gard Security (tenant `gard` existente), aceptó la invitación creando esa cuenta, creó la API key "Grokbot" (scope `*`) y conectó Grokbot al MCP. Verificado en `main`: `core_me` responde "agente vía carlos.irigoyen@gard.cl", rol owner; `preview_core_tenant_update` (dryRun) y `core_tenant_update` real, auditado con `actor_type = agent`, key Grokbot y `via_user_id` de `carlos.irigoyen@gard.cl`.
  - Correcciones tras el primer uso: la invitación abierta con otra sesión vuelve al formulario de cuenta nueva (antes enviaba al login); Plataforma confirma "Invitación enviada".
  - Criterios de aceptación del brief: cumplidos. Pendientes externos en En curso (rotar la key de Grokbot, Google, CI).
  - Modelo de cuentas adoptado: `carlos.irigoyen@opai.cl` = operador de la plataforma (Plataforma, sin membresía); `carlos.irigoyen@gard.cl` = owner de Gard (ERP). Las acciones de Grokbot en Gard quedan a nombre de la cuenta de Gard.

## En curso

- Resuelto el 23-oct: key "Grokbot" rotada. La anterior (`opai_gard_heLe…`) quedó revocada a las 14:08 UTC y `/api/mcp` la rechaza con 401; hay una sola key activa.
- **Carlos (cuando quiera):** correr `docs/2.0/design/DESIGN-PROMPT-acceso.md` en Claude Design, dentro del sistema de diseño **OPAI DS 2.0**. Pendientes del sistema: logo definitivo de OPAI; revisar el contraste de `--ds-border-strong` (1,5:1) en el portal Trabajador a pleno sol.
- Resuelto el 23-oct: URI de redirección de Google configurada (el flujo OAuth de `test.opai.cl` llega a Google sin error), CI de GitHub Actions de vuelta en verde (typecheck, lint, test y test:db), contraseña inicial de `carlos.irigoyen@opai.cl` cambiada, Gard Security en estado `activo`.

## Pendiente (siguiente)

- **Decisiones del 23-oct (ADR-017 a ADR-022)** que condicionan el Brief 02 y siguientes: primitivas Radix/shadcn en el DS y pulido obligatorio; centro de Configuración por ámbitos (una sola entrada; Empresa, Usuarios y API keys migran ahí); Documentos como servicio del núcleo (`core.documentos`) con vínculos polimórficos, y módulo Documentos (explorador, editor, plantillas, firma) después de Comercial; Comunicaciones con plantillas por evento y tenant; CPQ como motor + modelo de costeo declarativo por tenant; permisos y alcance de datos como dimensiones separadas. Regla de ESLint que prohíbe elementos interactivos crudos fuera del DS (error en módulos, aviso en la app hasta el Brief 02).
- Brief 02 debe incluir: primitivas Radix en el DS (reemplazar `Menu`, `Dialog`, `Switch` provisionales y el `<select>` del selector de portal; agregar Select, Combobox/⌘K, Popover, Tooltip, Checkbox, Toast, `FilaSeleccionable`), el centro de Configuración, `core.documentos` (R2, vínculos, descarga segura, ficha de documentos en cuentas/instalaciones/personas) y las primeras plantillas de correo.

- Evaluar Radix/shadcn para Combobox con búsqueda, Dialog y Menú cuando el primer módulo los necesite (Comercial).
- Diseñar en Claude Design `Menu`, `Dialog`, `Switch` y `UserMenu` (implementados provisionalmente en el Brief 01 sin diseño propio) y el detalle de tenant en Plataforma.
- Brief 02 — Maestros y servicios del núcleo (cuentas, contactos, instalaciones, cargos y estructuras de sueldo en tres niveles, documentos y archivos en R2, configuración declarativa, notificaciones). El núcleo mínimo se partió en 01 (identidad y plataforma) y 02 (maestros) para mantener briefs ejecutables en una sesión.
- Extracción de 1.0 para Comercial y CPQ → `docs/2.0/extraccion/`.
- Modelo de planes y facturación de suscripciones: cuando exista Opai SpA (en creación).

## Versiones instaladas

Node 22 · pnpm 10.28 · Next.js 16.4.2 · React 19.3.0 · Tailwind 4.3.3 · Prisma 7.10.1 (estable; 8 está en RC) · TypeScript 5.9.3 (7.0 existe pero se mantiene 5.x por compatibilidad del ecosistema) · ESLint 10.13 + typescript-eslint 8.72 · Vitest 5.0.5 · Playwright 1.64 · Turborepo 2.11 · Zod 4.6 · lucide-react 1.61 · Better Auth 1.7.12 (+ `@better-auth/prisma-adapter` 1.7.12) · mcp-handler 2.3.0 · `@modelcontextprotocol/server` 2.3.1 (SDK MCP v2; protocolo 2026-07-28 con respaldo 2025).

## Infraestructura

- Repositorio: `Cryptobal/opai-2`, rama `main`. CI en GitHub Actions.
- Vercel: proyecto `opai-2` (`prj_JcMPHnnA5lVK6P7SIkBx2Gbv5E6r`) en el equipo `gard-security`, conectado a `Cryptobal/opai-2`, Root Directory `apps/web`, Node 22.x, framework Next.js. Enlazado desde la raíz del repo (`.vercel/` ignorado). Región de funciones: `gru1` (`apps/web/vercel.json`). Variables: `DATABASE_URL` (rol `opai_app`, pooled, rama `main`), `BETTER_AUTH_SECRET`, `RESEND_API_KEY` y `EMAIL_FROM` (`OPAI <no-reply@opai.cl>`, dominio verificado en Resend) en production y preview; `BETTER_AUTH_URL=https://test.opai.cl`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` solo en production. `DEV_TENANT_ID` eliminada. `DATABASE_URL_MIGRATE` no está en Vercel. Las URLs `*.vercel.app` tienen la protección de despliegue por defecto de Vercel.
- Neon: proyecto `opai-2` (`steep-wildflower-90764475`), región `aws-sa-east-1` (São Paulo), Postgres 18, organización personal de Carlos. Ramas `main` (producción de `test.opai.cl`) y `dev` (desarrollo local y `test:db`). Base `neondb`, propietario `neondb_owner`; rol de aplicación `opai_app` (sin `BYPASSRLS` ni superusuario, verificado) con la misma contraseña en ambas ramas, guardada solo en `.env.local` de Carlos.
- Dominio: `test.opai.cl` (construcción) en línea sobre `opai-2`, CNAME `test` → `e61b12f5039e609e.vercel-dns-016.com` en Cloudflare · `app.opai.cl` (producción, futuro). `opai.cl` está en Cloudflare; el registro es DNS only.
- Usuario plataforma `carlos.irigoyen@opai.cl` (`platformRole = owner`) en `main` y en `dev` (contraseñas distintas; la de `dev` está en `SEED_OWNER_PASSWORD` del `.env.local`).
- Tenant de desarrollo `gard`: `main` → `01a166f3-ce42-72d8-a664-77755f23606c` · `dev` → `01a166f3-f15c-742c-b197-47ea67524e33`.

## Decisiones tomadas durante la ejecución

- `/ds` en vez de `/_ds`: en App Router las carpetas con `_` son privadas y no generan ruta. Sigue siendo solo fuera de producción (404 en producción, verificado).
- RLS con `ENABLE` y no `FORCE`: el rol propietario (migraciones, importaciones, seeds) debe poder escribir en todos los tenants; la aplicación solo se conecta como `opai_app`, que no puede saltarse la RLS. El test de aislamiento lo prueba. La política usa `NULLIF(current_setting('app.tenant_id', true), '')::uuid` para que una sesión sin tenant devuelva cero filas en vez de error.
- Componentes base propios (Button, Input, Select, Badge, Card, Tabs, Sheet, Table, Skeleton) en vez de la CLI de shadcn: el diseño aún no existe y la CLI escribe en la app, no en el paquete. shadcn/Radix se evalúa en el Brief 00b con el diseño aprobado.
- Registro de módulos como paquete `modules/registry` (`@opai/modules`) en vez de `modules/index.ts`: Next necesita un paquete resoluble. Los módulos se compilan sin listarlos en `transpilePackages` (verificado con build).
- `prisma generate` en `postinstall` de `@opai/db` para que el build de Vercel tenga el cliente; `prisma.config.ts` usa un placeholder cuando falta `DATABASE_URL_MIGRATE` para que `generate` no falle.
- Con `cacheComponents` activo no se usa `export const dynamic`; los route handlers ya son dinámicos por defecto.
- Infra: `db:deploy` ahora es `pnpm --filter @opai/db run deploy` (sin `run` chocaba con el comando nativo `pnpm deploy`) y `test:db` es `vitest run --root packages/db` (con `--config` desde la raíz no encontraba archivos de test).
- Infra: Vercel se enlaza desde la raíz del repo con Root Directory `apps/web` (no desde `apps/web`) para que el build tenga el workspace pnpm completo.
- Infra: el test de aislamiento ya no toca la contraseña de `opai_app`: crea un rol efímero miembro de `opai_app` (hereda grants y políticas, sin BYPASSRLS) y lo elimina al terminar. Correr `test:db` contra `dev` no requiere volver a ejecutar `role:password`.
- Infra: `vercel env add … preview` exige pasar el valor por argumento para aplicarlo a todas las ramas; para no exponer el secreto, las variables de preview se crearon por la API (`vercel api … --input -`, cuerpo por stdin).
- Formato: Prettier en código; `docs/` excluido para no reescribir los documentos.
- Título de página en iPad y desktop en la barra superior del shell (como en el diseño); el patrón lo muestra solo en teléfono. La acción principal queda en el patrón (una fila bajo la barra en iPad/desktop) para no acoplar shell y patrón.

- Brief 01: el esquema Prisma se dividió en `core.prisma`, `identidad.prisma` y `tenancy.prisma` (todo en el schema `core`); el seed del usuario plataforma vive en `packages/auth/scripts` (necesita el hash de Better Auth y `@opai/auth` ya depende de `@opai/db`).
- Brief 01: recuperación con el flujo de restablecer contraseña de Better Auth (no enlace mágico); el enlace vence en 30 minutos según el diseño aprobado (las invitaciones, 72 horas). La regla "distinta a las 3 anteriores" del diseño no se implementa: no hay historial de contraseñas.
- Brief 01: el contexto sin tenant (plataforma sin empresa elegida) usa un id nulo con `conTenant: false`; solo corren capacidades `sinTenant` (`core.me`, `core.ping`, `platform.*`). Auditoría y telemetría de plataforma van al tenant objetivo (`tenantObjetivo`).
- Brief 01: una API key con scope `*` no expone `platform.*`; hace falta el scope `platform` explícito. Supervisor: `ops:*`, `rondas:*`, `asistencia:*` completos y `personas` solo lectura.
- Brief 01: la pertenencia y la selección de empresa usan la cookie `opai_tenant`; tras el login, `/elegir-empresa` aparece si hay más de una membresía utilizable.
- Brief 01: el aviso de cuenta suspendida nombra "a <persona> (administración de <empresa>)" en vez de "administradora", para no suponer género.
- Brief 01: `/ds/acceso` (solo desarrollo) renderiza cada variante de acceso con datos ficticios para capturas; el tema oscuro se prueba con `prefers-color-scheme`.
- Brief 01: `core.apikeys.create` recibe `expiraEn` como fecha ISO (las herramientas MCP requieren inputs expresables en JSON Schema; hay test).

## Riesgos y pendientes materiales

- `neonctl` 2.21 no tiene `regions list`; la región se eligió creando directamente en `aws-sa-east-1`.
- Pendientes de diseño para módulos: patrón de vista dividida (lista + detalle en iPad, como `DetailTablet.html`), paleta de comandos ⌘K, menú de usuario, Combobox con búsqueda. Se diseñan con el módulo que los necesite.
- Rate limit de `/api/auth` y `/api/mcp` en memoria por instancia: suficiente para el Brief 01; centralizar (base o Redis) antes de tráfico real.
- `Menu`, `Dialog`, `Switch` y `UserMenu` no tienen diseño en Claude Design todavía (provisionales sobre tokens del DS).
