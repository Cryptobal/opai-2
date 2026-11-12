# Brief · Entrar a OPAI desde Claude con la cuenta propia (OAuth del MCP, CAR-247)

Rama `brief/car-247-oauth-mcp`. Trae migración (`migracion-pendiente`) y toca autenticación: además de la revisión final de la sesión, se pide la pasada del «Revisor OPAI 2.0» (riesgo alto, AGENTS.md «Roles»).

## 1 · Objetivo

Que cualquier persona de una empresa pueda agregar OPAI 2.0 como conector en Claude (web, escritorio, celular) o en Claude Code, entrar con su propia cuenta, elegir la empresa y autorizar, sin copiar una API key. El token actúa como **agente vía esa persona** (modelo decidido en CAR-247): sus permisos, su alcance, su empresa y la auditoría aparte de lo que hace en pantalla. Es el requisito para las vistas de OPAI dentro de Claude (CAR-287).

**Decisión de Carlos (11-nov-2026, 20:16):** adelantarlo a antes de v1.0 (antes estaba para después del 9-dic).

## 2 · Estado actual (verificado en `main` 3ae6f63)

- `/api/mcp` (`apps/web/app/api/mcp/[[...transport]]/route.ts` → `apps/web/lib/mcp.ts`) solo acepta `Authorization: Bearer <api key>`; sin key responde 401 con `WWW-Authenticate: Bearer realm="opai"`, sin `resource_metadata`.
- `contextoDeApiKey` (`apps/web/lib/api-key.ts`) arma el contexto de agente: tenant por el slug de la key, membresía activa, permisos del responsable, scopes, presupuesto y aprobaciones (ADR-032).
- Identidad con Better Auth 1.7.12 (`packages/auth/src/auth.ts`, plugin `twoFactor`); tablas en `prisma/schema/identidad.prisma` sin `tenant_id`.
- `apps/web/proxy.ts` deja fuera del matcher todo `/api`; `/.well-known/*` hoy cae en el matcher y redirige a `/login`.
- Ya existen la pantalla «Elegir empresa» (`app/(auth)/elegir-empresa`, diseño `export-acceso/05_Selector_de_empresa.html`) y el login con MFA.
- `@better-auth/oauth-provider` 1.7.21 pide `better-auth` ^1.7.21.

## 3 · Alcance

Entra: servidor de autorización OAuth 2.1 para el MCP (código con PKCE S256, registro dinámico de clientes, refresh con rotación, revocación), metadatos públicos (RFC 8414 y RFC 9728), elegir empresa después de entrar, pantalla de consentimiento, `/api/mcp` que acepta API key **o** token OAuth, «Apps conectadas» en Mi cuenta para ver y revocar, y pruebas de aislamiento. No entra: OIDC para iniciar sesión en otras apps, `client_credentials`, las vistas MCP Apps (CAR-287) y el conector de Grok Bot.

## 4 · Arquitectura

- **Proveedor:** plugin `oauthProvider` de `@better-auth/oauth-provider` (mantenido, con PKCE, DCR, rotación y metadatos), no uno propio. Se sube `better-auth` a 1.7.21 en el mismo PR.
- **Tokens opacos** (`disableJwtPlugin`), guardados con hash (`storeTokens: "hashed"`); el MCP los valida contra la base, así revocar corta al instante. Vida: acceso 1 h, refresh 30 días con rotación y detección de reuso.
- **Empresa:** `postLogin.page` = la pantalla de elegir empresa en modo OAuth; `consentReferenceId` = la empresa elegida (debe ser una membresía activa del usuario, si no falla). El token queda atado a esa empresa por `reference_id`; cambiar de empresa en pantalla no cambia los tokens ya emitidos.
- **Scopes:** `mcp:leer` y `mcp:escribir` (+ `offline_access`). `mcp:leer` limita a capacidades de lectura; ninguna escritura irreversible se ejecuta sin aprobación humana (ADR-032, igual que con API key). `platform` nunca se puede pedir por OAuth.
- **Contexto en el MCP:** `contextoDeTokenOAuth` busca el hash, exige vigente y no revocado, membresía activa del usuario en la empresa del token y arma el mismo actor que una API key de tipo usuario: `{ tipo: "agent", id: "oauth:<clientId>", viaUserId }`, con el nombre de la app en la auditoría.
- **Descubrimiento:** `/.well-known/oauth-protected-resource` (y la variante con `/api/mcp`) y `/.well-known/oauth-authorization-server`; el 401 del MCP agrega `resource_metadata`. Rutas fuera del matcher del proxy.
- **Registro dinámico** abierto (Claude lo exige), con límites: solo `authorization_code` + `refresh_token`, PKCE obligatorio, cliente público, `redirect_uri` https o loopback, rate limit por IP (`apps/web/lib/rate-limit.ts`, falla cerrado), clientes sin uso por 30 días se borran.

## 5 · Archivos

`packages/auth/src/{auth.ts,oauth.ts}`, `packages/db/prisma/schema/identidad.prisma` + migración, `apps/web/app/api/auth/...` (ya montado), `apps/web/app/.well-known/...`, `apps/web/proxy.ts`, `apps/web/lib/{mcp.ts,oauth-token.ts}`, `apps/web/app/(auth)/elegir-empresa` (modo OAuth), `apps/web/app/(auth)/autorizar/` (consentimiento), `apps/web/app/(erp)/mi-cuenta/apps-conectadas/`, capacidades `core.oauth.apps.list` y `core.oauth.apps.revocar` (con herramienta MCP; revocar es `soloPersonas`), pruebas.

## 6 · Modelo de datos y migraciones

Tablas del plugin en el schema `core`, con nombres en `snake_case`: `oauth_client`, `oauth_access_token`, `oauth_refresh_token`, `oauth_consent` (y las de recursos si el plugin las usa). Son de identidad como `session`: sin `tenant_id`; la empresa va en `reference_id` (uuid de `core.tenants`). Sin RLS de tenant, con `REVOKE` para `opai_app` salvo lo que use `clienteAuth()`, igual que `session` (se verifica contra `rls-nucleo*.test.ts`). Migración aditiva, `SET LOCAL lock_timeout`, la aplica el bot «OPAI 2.0» con respaldo.

## 7 · Capacidades

`core.oauth.apps.list` (las apps conectadas de la persona en la empresa actual) y `core.oauth.apps.revocar` (revoca los tokens de una app; `soloPersonas: true`, dryRun e idempotencia). Las dos con herramienta MCP según ADR-055; `revocar` queda en `paridad-excepciones.ts` como `soloPersonas`.

## 8 · Interfaz y responsive

- Elegir empresa en modo OAuth: la pantalla actual con el texto «¿Con qué empresa quieres conectar <app>?».
- Consentimiento: tarjeta del diseño de acceso con el nombre de la app, la empresa, lo que podrá hacer (leer; leer y proponer cambios) y «Permitir» / «Cancelar». Diseño más cercano: `export-acceso` (no hay diseño aprobado de esta pantalla; se reporta).
- Mi cuenta › Apps conectadas: lista con app, empresa, permisos, último uso y «Desconectar».
- 375, 1024 y 1280 px; pruebas `@preview` de las tres pantallas.

## 9 · Seguridad y tenant

Empresa del token solo desde la membresía elegida tras entrar (nunca del cliente); membresía revalidada en cada llamada; tokens con hash; PKCE S256 obligatorio; `redirect_uri` exacta; MFA del login se respeta; sin `platform`; revocar corta en el siguiente pedido; rate limit en registro, autorización y token; logs sin tokens ni códigos.

## 10 · Casos límite

Usuario sin empresas o suspendido; membresía desactivada después de autorizar (401 en el siguiente pedido); app que pide `platform`; refresh reusado (se revoca la familia); `redirect_uri` distinta; cliente borrado; Claude Code con loopback en otro puerto; muchos registros desde la misma IP.

## 11 · Plan por bloques (PR 1 de 2)

PR 1 (este): 1. `auth:` sube Better Auth, plugin y migración. 2. `web:` metadatos públicos, proxy y 401 con `resource_metadata`. 3. `web:` elegir empresa y consentimiento. 4. `web:` `/api/mcp` acepta el token OAuth. 5. `docs:` ADR, ESTADO, novedad.
PR 2: Apps conectadas (capacidades, pantalla, MCP), limpieza de clientes sin uso y prueba de punta a punta con Claude.

## 12 · Tests

Unitarias de `contextoDeTokenOAuth` (vigente, vencido, revocado, membresía inactiva, empresa ajena, scope de lectura), de `consentReferenceId` (solo membresías propias), del 401 con `resource_metadata`; `test:db` de la migración y de que `opai_app` no lea las tablas OAuth; e2e del flujo completo con un cliente de prueba (registro → autorizar con PKCE → token → `tools/list` → refresh → revocar).

## 13 · Validación

Flujo completo contra la vista previa con un cliente OAuth de prueba; después de integrar, agregar `https://test.opai.cl/api/mcp` como conector en claude.ai con un usuario de `qa-e2e` y listar herramientas.

## 14 · Criterios de aceptación

Claude agrega el conector, pide entrar, elegir empresa y permitir, y lista las herramientas; las llamadas quedan en la auditoría como agente vía la persona y con el nombre de la app; revocar corta el acceso; una empresa ajena nunca es alcanzable; las API keys siguen funcionando igual.

## 15 · Riesgos y rollback

Autenticación: subir Better Auth puede cambiar comportamientos del login (se corren todos los e2e de acceso y MFA). Rollback: revertir el PR deja las tablas OAuth sin uso (migración aditiva) y el MCP vuelve a solo API key.

## 16 · Reporte de ejecución

**PR 1 (11-nov-2026), rama `brief/car-247-oauth-mcp`.** Bloques 1 a 5 hechos, un commit por bloque.

- **Qué entró:** Better Auth 1.7.21 con `@better-auth/oauth-provider` (DCR sin autenticar con PKCE obligatorio, código + refresh con rotación, tokens opacos guardados con hash, alcances `mcp:leer`, `mcp:escribir` y `offline_access`, nunca `platform`); migración `20261124100000_core_oauth_mcp` (siete tablas de identidad en `core`, sin `tenant_id`, solo para `opai_auth`; `opai_app` sin privilegios); metadatos públicos RFC 8414 y RFC 9728 y 401 con `resource_metadata`; login, segundo factor y Google reanudan la autorización (`/autorizar/continuar`); elegir empresa en `/autorizar/empresa` guarda la empresa en la sesión (`sessions.oauth_tenant_id`), el consentimiento queda atado a ella (`reference_id`) y se limpia al consentir, para que la siguiente app vuelva a preguntar; pantalla `/autorizar`; segundo factor exigido en las pantallas y, en el proveedor, antes de emitir cada código; límite por IP en registro (20 por hora, falla cerrada), autorización y token (60 por minuto); `/api/mcp` acepta el token OAuth (`lib/oauth-mcp.ts`).
- **Cómo actúa la app:** agente vía la persona, `oauth:<client_id>`, sin key ni plataforma (`comoAppOAuth` en `@opai/capabilities`, mismo carril que el agente interno: aprobaciones por `agente_interno_id`, consumo sin `api_key_id`); empresa solo del token y membresía activa en ella (sin caer a otra); portal ERP o Supervisor (cliente y trabajador quedan fuera, 403); con solo `mcp:leer` todos los módulos quedan en lectura.
- **Desvíos del brief:** (1) `enforcePerClientResources: false`: hay un solo recurso (el MCP) y las apps se registran solas, así que no hay enlace por app; el token igual queda atado al recurso pedido y el MCP lo comprueba. (2) `allowedScopes` explícito en el recurso: Prisma no guarda listas nulas. (3) La empresa elegida se lee de la base por id de sesión, porque la lectura rápida de sesión (`core.auth_sesion_por_token`) no trae columnas nuevas. (4) La actividad y las acciones de agente ya no buscan keys con ids que no son de key (`agente-interno:` y `oauth:`).
- **Autorrevisión (subagente):** corrigió tres bloqueos antes de abrir el PR: solo lectura no cubría `core`, el segundo factor no se exigía con un consentimiento previo, y la página de empresa con query propia rompía la consulta firmada.
- **Validación:** e2e `oauth-empresas.spec.ts` (dos empresas: elige Atlas y la siguiente app vuelve a preguntar) y e2e `@preview` `oauth-mcp.spec.ts` de punta a punta en local a 375, 1024 y 1280 px (registro, login + MFA, consentimiento, canje del código, `tools/list` y `core_me` con el token, 401 con `resource_metadata` y refresh); tests de reglas, de base del token (vigente, vencido, revocado, otro recurso, sin empresa, app desactivada) y del contexto (empresa del token, sin caída a otra, suspendida, solo lectura, portales). Gate completo en el PR.
- **Pendiente (PR 2):** «Apps conectadas» en Mi cuenta (ver y desconectar), limpieza de clientes registrados sin uso, presupuesto por app conectada (hoy se mide el consumo, sin tope) y la prueba de punta a punta con Claude real en `test.opai.cl` tras aplicar la migración.

**PR 2 (11-nov-2026), rama `brief/car-247-apps-conectadas`, apilada sobre #527.**

- **Qué entró:** `core.apps_conectadas.list` (también por MCP) y `core.apps_conectadas.desconectar` (solo personas, vista previa, rastro `seguridad.oauth.desconexion`), sobre operaciones con nombre de `@opai/db` (`appsConectadas`, `desconectarApp`) con el rol `opai_auth`. Mi cuenta › Apps conectadas con «Desconectar» y confirmación. Purga diaria `purgarOAuth` en el cron programador: accesos y renovaciones vencidos o revocados hace más de un día, y apps registradas hace más de 30 días sin consentimiento ni accesos.
- **Validación:** test de base (solo lo de la persona y la empresa; desconectar no toca otra empresa ni a otra persona; rastro), test de purga, tests de capacidades (sin tokens en la salida, vista previa, agentes no desconectan) y e2e `@preview`: tras desconectar en Mi cuenta, el token de la app recibe 401.
- **No entró:** tope de gasto por app conectada (decisión de Carlos) y prueba con Claude real en `test.opai.cl` (después de integrar #527).
