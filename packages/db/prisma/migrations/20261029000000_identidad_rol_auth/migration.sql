-- CAR-43 (auditoría del Núcleo I-04): `opai_app` tenía SELECT/INSERT/UPDATE/DELETE completos sobre
-- `core.sessions` (token de sesión), `core.accounts` (hash de contraseña, tokens OAuth),
-- `core.verifications` (tokens de recuperación/verificación hasheados) y `core.two_factor` (secreto
-- TOTP y códigos de respaldo), sin RLS (no tienen tenant_id: la identidad es global, ADR-015). Un
-- filtro olvidado en cualquier capacidad podía leer o escribir esas filas de cualquier usuario; la
-- RLS no lo detiene porque estas tablas no tienen política. `core.tenants` y `core.users` tenían
-- además DELETE, que ninguna capacidad usa (confirmado por grep: 0 `.user.delete`/`.tenant.delete`
-- en packages/capabilities; el borrado de un usuario de una empresa es `core.users.remove`, que
-- borra la membresía, nunca la fila de `users`).
--
-- Arreglo (decisión de Claude, implementador, 29-oct-2026; ver docs/2.0/briefs/NUCLEO-I-identidad.md
-- y ESTADO.md): un rol propio para Better Auth (`opai_auth`, NOLOGIN) dueño del CRUD de
-- `sessions`/`accounts`/`verifications`/`two_factor` y del alta/edición de `users`. `opai_app` queda
-- sin ningún acceso a esas cuatro tablas; `clienteAuth()` (paquete `@opai/auth`, packages/db/src/
-- globales.ts) cambia a `opai_auth` con `SET LOCAL ROLE` dentro de la transacción de cada operación
-- (mismo patrón que `forTenant`/`forUser` fijan `app.tenant_id`: el cambio de rol dura solo esa
-- transacción y una conexión reciclada por el pool vuelve sola a `opai_app`). Esto NO exige una
-- credencial nueva: `opai_app` solo necesita ser miembro de `opai_auth` (`GRANT ... TO`) para poder
-- `SET ROLE` sobre la MISMA conexión (`DATABASE_URL` actual); no hace falta otra URL ni otro usuario
-- de Postgres. Si más adelante Carlos prefiere un rol de login separado con su propia contraseña
-- (más aislamiento: una fuga de la conexión de `opai_app` no alcanzaría `opai_auth` sin pasar por el
-- código), falta esa credencial en Vercel — anotado en el PR, no bloquea este cambio.
--
-- `core.users` sigue con SELECT/INSERT/UPDATE para `opai_app` (muchas capacidades lo necesitan:
-- `platform.users.set_role`, aceptar invitación, etc.) pero column-level (nunca `SELECT *`), para
-- que una columna sensible que se agregue después no quede expuesta por accidente; hoy ninguna
-- columna de `users` es secreta, así que esto no cambia ningún comportamiento. `opai_auth` también
-- necesita acceso a `users` (Better Auth crea/actualiza filas de usuario: alta por Google, cambia
-- `email_verified`/`two_factor_enabled`), sin DELETE (tampoco lo usa).
--
-- `core.tenants` pierde DELETE para `opai_app` (nadie lo usa); se conservan SELECT/INSERT/UPDATE
-- (no tiene columnas secretas, por eso no se acota a nivel de columna).
--
-- Reintentos: `GRANT rol TO rol` y los `GRANT`/`REVOKE` son idempotentes (repetirlos no falla ni
-- duplica). `CREATE ROLE` no admite `IF NOT EXISTS`: se verifica contra `pg_roles` primero.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opai_auth') THEN
    CREATE ROLE opai_auth NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA core TO opai_auth;
GRANT opai_auth TO opai_app;

-- Solo opai_auth (vía clienteAuth(), SET LOCAL ROLE por transacción) toca estas cuatro tablas.
REVOKE ALL ON "core"."sessions", "core"."accounts", "core"."verifications", "core"."two_factor"
  FROM opai_app;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON "core"."sessions", "core"."accounts", "core"."verifications", "core"."two_factor"
  TO opai_auth;

-- users: opai_auth necesita el mismo acceso de alta/edición que antes tenía opai_app (sin DELETE).
GRANT SELECT, INSERT, UPDATE ON "core"."users" TO opai_auth;

-- users para opai_app: columnas mínimas (hoy, todas las existentes; una columna nueva sensible no
-- queda expuesta sin un GRANT explícito) y sin DELETE (ninguna capacidad borra una fila de users).
REVOKE SELECT, DELETE ON "core"."users" FROM opai_app;
GRANT SELECT (id, name, email, email_verified, image, platform_role, two_factor_enabled,
  created_at, updated_at) ON "core"."users" TO opai_app;

-- tenants: sin DELETE (ninguna capacidad lo usa); sin columnas secretas, no se acota a nivel columna.
REVOKE DELETE ON "core"."tenants" FROM opai_app;

COMMIT;

-- Reversión (manual, solo referencia; no la aplica Prisma). Con el rol propietario:
--   BEGIN;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."tenants" TO opai_app;
--   REVOKE SELECT (id, name, email, email_verified, image, platform_role, two_factor_enabled,
--     created_at, updated_at) ON "core"."users" FROM opai_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."users" TO opai_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE
--     ON "core"."sessions", "core"."accounts", "core"."verifications", "core"."two_factor"
--     TO opai_app;
--   REVOKE opai_auth FROM opai_app;
--   DELETE FROM _prisma_migrations WHERE migration_name = '20261029000000_identidad_rol_auth';
--   COMMIT;
-- (El rol opai_auth no se borra: DROP ROLE exige revocar antes todos sus GRANTs sobre objetos.)
