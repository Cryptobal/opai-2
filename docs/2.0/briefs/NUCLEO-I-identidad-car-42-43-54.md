# NUCLEO-I · Identidad: registro de seguridad, tablas acotadas y recuperación de MFA (CAR-42, CAR-43, CAR-54)

Encargo de Carlos (29-oct-2026), auditoría del Núcleo §I-03, §I-04 y §I-15 (`docs/2.0/auditoria-nucleo.md`).
Reutiliza `core.auditoria_global` y `core.auditoria_global_append` que el #109 (CAR-36/CAR-41) dejó
listos para el ámbito `seguridad`, sin escritor. Rama `core/identidad-car-42-43-54`, desde
`origin/main` (`b7e10ca4`, luego fast-forward a `e0d01a7f` con el merge de main).

## CAR-42 · Registro de seguridad global

- Nuevo escritor: `packages/db/src/seguridad.ts` (`registrarSeguridad`, tipo `HechoSeguridad`), que
  llama a `agregarAAuditoriaGlobal("seguridad", …, tx)`. Nunca se exporta el `append` crudo (mismo
  criterio que `plataforma-aprobaciones.ts`).
- IP en HMAC: `packages/db/src/rate-limit.ts` exporta `hashIp(ip)`, mismo mecanismo y sal
  (`RATE_LIMIT_SALT`/`BETTER_AUTH_SECRET`) que el rate limit (Ley 21.719: nunca la IP en claro).
- Enganches en `@opai/auth` (todos best-effort: un fallo al auditar no rompe el acceso ni la acción,
  igual que `bloqueo-login.ts`):
  - `packages/auth/src/auth-hooks.ts` (hooks `before`/`after` de Better Auth en `/sign-in/email` y
    `/change-password`, extraídos de `auth.ts` para no superar 150 líneas): `seguridad.login`,
    `seguridad.login_bloqueado`, `seguridad.login_fallo` (sin `actorId`: nunca se busca el correo,
    evita un oráculo de qué cuentas existen), `seguridad.password_cambio`.
  - `onPasswordReset` en `auth.ts`: `seguridad.password_restablecer`.
  - `packages/auth/src/mfa-sesion.ts` (plugin `marcaMfaSesion`, ya enganchado en Better Auth, no en
    la Server Action, para cubrir también el POST directo): `seguridad.mfa_verificado` (un solo
    hook cubre login con desafío, confirmación de enrolamiento y login social pendiente — Better
    Auth los enruta al mismo endpoint; el payload distingue `contexto: "login" | "sesion"`),
    `seguridad.mfa_desactivar`, `seguridad.mfa_codigos_regenerar` (CAR-54).
- **Decisión (Claude, 29-oct-2026):** no se audita cada intento fallido de código MFA (ya limita el
  `accountLockout` del plugin y `mfa-bloqueo-con-sesion.ts`) ni la sola *solicitud* de recuperación
  de contraseña (no cambia nada; auditar el *éxito* del restablecimiento basta). Si Carlos quiere más
  cobertura, es un bloque aparte.
- Tests reales (Postgres, `prepararEntorno()`): `packages/auth/test/seguridad-db.test.ts` (login
  éxito/fallo, cambio de contraseña, desactivar MFA, regenerar códigos) con Better Auth real.
  **Lección de la propia prueba:** `core.auditoria_global` es append-only; un primer borrador del
  `afterAll` borraba sus propias filas por `actorId` y dejaba un hueco de `seq` que rompía la
  verificación de cadena de OTRO test (`plataforma-aislamiento-db.test.ts`, que escanea toda la
  tabla). Corregido para no borrar nunca filas de esa tabla (memoria del agente:
  `auditoria-global-append-only-no-borrar-en-tests.md`).

## CAR-43 · Tablas de identidad acotadas

- Migración `packages/db/prisma/migrations/20261029000000_identidad_rol_auth/migration.sql`
  (idempotente, `SET LOCAL lock_timeout`, reversión comentada):
  - Rol nuevo `opai_auth` (NOLOGIN), miembro de quien lo necesite vía `GRANT opai_auth TO opai_app`.
  - `REVOKE ALL` a `opai_app` sobre `sessions`, `accounts`, `verifications`, `two_factor`; CRUD
    completo pasa a `opai_auth`.
  - `users`: `opai_auth` gana SELECT/INSERT/UPDATE (sin DELETE, nadie lo usa); `opai_app` pierde
    DELETE y el SELECT de tabla completa pasa a columnas explícitas (hoy, todas las existentes —
    defensa a futuro: una columna sensible que se agregue después no queda expuesta sin un GRANT).
  - `tenants`: `opai_app` pierde DELETE (nadie lo usa; confirmado por grep, 0 llamadas).
  - **Decisión (Claude, 29-oct-2026):** el issue sugería un rol NOLOGIN al que el propietario hace
    `SET ROLE`, o seguir con el rol propietario — se implementó la primera opción, pero aplicada
    sobre `opai_app` (no sobre un rol humano): como `opai_app` ya tiene `NOINHERIT`, su membresía en
    `opai_auth` no se hereda sola, así que cada operación debe pedirla a propósito
    (`SET LOCAL ROLE opai_auth`, dura solo esa transacción). **No hace falta ninguna credencial
    nueva**: la misma `DATABASE_URL`/usuario de Vercel sigue sirviendo; si más adelante Carlos
    prefiere un rol de login separado (aísla una fuga de la conexión de `opai_app`), falta esa
    credencial — anotado, no bloquea.
- `packages/db/src/globales.ts`: `clienteAuth()` ahora es `clienteApp().$extends(...)`: cada
  operación sobre `User`/`Session`/`Account`/`Verification`/`TwoFactor` corre dentro de
  `base.$transaction([SET LOCAL ROLE opai_auth, query(args)])` (mismo patrón que `forTenant`/
  `forUser` fijan `app.tenant_id` por transacción). Los demás modelos (p. ej. `LoginIntento`, que
  `bloqueo-login.ts` usa con el MISMO `clienteAuth()` dentro de su propia transacción con advisory
  lock) pasan de largo sin envolver — envolverlos abriría una transacción nueva ajena a la del
  llamador y rompería esa transacción (se encontró así: `test:db` de `@opai/auth` fallaba con
  `permission denied for table login_intentos` hasta filtrar por modelo).
- Operaciones con nombre nuevas (ocultan los delegados de `sessions`/`two_factor` detrás de
  `forTenant`, que ya no tiene acceso a esas tablas):
  - `ultimoAccesoDeUsuarios(userIds)` (antes `ctx.db.session.findMany` completo, con el token;
    ahora `select: { userId, updatedAt }` vía `opai_auth`).
  - `restablecerMfaDeUsuario(userId, tx?)` (CAR-54): apaga el segundo factor; con `tx` corre
    atómico dentro de la transacción de la capacidad que lo pide (`SET LOCAL ROLE` + `RESET ROLE`
    antes de devolver el control, porque el resto del handler sigue necesitando `opai_app`).
  - Ambas quedan detrás de un servicio nuevo del `Contexto`, `ctx.identidad` (`Identidad` en
    `servicios-tipos.ts`, con su versión en memoria para los tests de capacidades): **no se llaman
    directo desde una capacidad**, porque en el contexto falso de los tests (`contextoDePrueba`) no
    hay Postgres real. `ctx.identidad.auditarSeguridad(hecho, tx)` es el mismo patrón para que
    `core.users.mfa_restablecer`/`platform.users.mfa_restablecer` dejen su hecho de seguridad sin
    tocar Postgres en los tests de capacidades.
- Test contra Postgres real: `packages/db/test/identidad-permisos-db.test.ts` (opai_app sin acceso a
  las cuatro tablas; sin DELETE en users/tenants; `clienteAuth()`/`ultimoAccesoDeUsuarios`/
  `restablecerMfaDeUsuario` sí funcionan).

## CAR-54 · Recuperación de MFA

- **Regenerar códigos de respaldo (self-service, Mi cuenta):** `packages/auth/src/mfa.ts`
  (`regenerarCodigosRespaldo`, envuelve `auth.api.generateBackupCodes`) → Server Action
  `accionRegenerarCodigos` → `apps/web/app/(erp)/mi-cuenta/regenerar-codigos.tsx` (Dialog con
  reautenticación por contraseña, muestra los códigos nuevos una vez con `CodigosRespaldo` del DS).
- **Restablecimiento por un tercero (irreversible, `soloPersonas`):**
  - `core.users.mfa_restablecer` (owner de la empresa, nunca sobre uno mismo, nunca admin —
    denylist en `packages/domain/src/permisos.ts`, mismo criterio que aceptar el DPA). Botón
    "Restablecer MFA" en la ficha de usuario (`editar-usuario.tsx`, extraído a
    `restablecer-mfa.tsx` por el límite de 150 líneas), visible solo si el objetivo tiene MFA activo.
  - `platform.users.mfa_restablecer` (Plataforma, por correo, mismo criterio sin oráculo que
    `platform.users.set_role`). **Decisión (Claude, 29-oct-2026):** esta capacidad es `platform.*`,
    así que el motor de ejecución (ADR-052) también la audita automáticamente en el ámbito
    `plataforma` (como toda escritura de plataforma); se deja así a propósito — el hecho explícito
    en `seguridad` conviven con el automático en `plataforma`, porque la acción toca tanto la cuenta
    de una persona como la actividad de Plataforma sobre una empresa ajena. Sin pantalla de
    Plataforma todavía (como `platform.users.set_role`, que tampoco la tiene): entra a
    `paridad-sin-pantalla.ts` con el mismo criterio (gate de CAR-52, I-13).
  - Ambas avisan por correo (`core.usuario.mfa_restablecida`, nuevo en
    `packages/domain/src/comunicaciones/usuarios.ts`): la vía de empresa usa `enviarCorreo`
    (plantilla versionada por tenant); la de Plataforma envía directo (sin tenant, como la
    recuperación de contraseña).
  - Nuevo permiso `core:users.mfa_reset` (`PERMISOS_CORE.usersMfaReset`) y
    `platform:users.manage` (`PERMISOS_PLATAFORMA.usersManage`).
- `Miembro`/`miembroSchema` suma `mfaActiva` (de `user.twoFactorEnabled`, ya en la columna que
  `opai_app` puede leer) para que la ficha decida si ofrece el botón.
- Tests de capacidades: `packages/capabilities/test/users-mfa.test.ts`,
  `plataforma-mfa.test.ts` (dry run, permisos por rol, autoobjetivo rechazado, sin MFA activo
  rechazado, agente rechazado incluso en dry run por `soloPersonas`, auditoría doble en el camino de
  Plataforma). e2e: `mfa.spec.ts`, `invitacion-mi-cuenta.spec.ts` (Mi cuenta),
  `configuracion-acceso.spec.ts` (usuarios) en verde — no hay un e2e nuevo dedicado al botón de
  restablecer (CA parcial, ver PR-BODY.md).

## Riesgo detectado y no causado por este PR

Existe una rama remota `fix/car-42-43-54-identidad` trabajando en los mismos CAR. Se detectó porque
su migración (`…_identidad_rol_auth` con otro timestamp) quedó aplicada en el Postgres local
compartido de este box junto con la mía, con un REVOKE más agresivo sobre `users` del que yo hice.
No se tocó esa rama ni su código; se documenta para que el bot o Carlos decidan cuál integra.
