-- Qué hace y por qué (CAR-43 y el resto de CAR-45; auditoría del Núcleo §I-04 e §I-06):
-- las tablas de identidad no tienen tenant_id ni RLS, y opai_app tenía CRUD completo sobre ellas
-- (migraciones init, identidad y mfa). Un filtro olvidado en ctx.db exponía sesiones con su token,
-- hashes de contraseña o secretos TOTP de cualquier empresa. Desde aquí:
--   1. Rol propio `opai_auth` (NOLOGIN, NOBYPASSRLS) para el cliente de Better Auth (`clienteAuth()`
--      de packages/db): opai_app lo asume con `SET LOCAL ROLE opai_auth` solo dentro de la
--      transacción de cada operación de identidad. Es por transacción, así que funciona con el
--      pooler de Neon (modo transacción) y no requiere otra URL ni otra contraseña.
--   2. opai_app pierde todo privilegio sobre sessions, accounts, verifications y two_factor.
--   3. users: opai_app conserva SELECT (la tabla no tiene credenciales: viven en accounts y
--      two_factor) y solo puede UPDATE de platform_role (set_role de plataforma, con su auditoría
--      global); pierde INSERT, DELETE y TRUNCATE. Altas y cambios de perfil van por Better Auth.
--   4. tenants: opai_app pierde DELETE y TRUNCATE (nada borra una empresa).
--   5. Borrar un usuario solo por `core.borrar_usuario`, SECURITY DEFINER, que invoca la capacidad
--      auditada `platform.usuarios.borrar`. Con membresías o keys (FK RESTRICT del #113) no borra.
--      La función no valida quién la llama (opai_app tiene EXECUTE): la autorización es la de la
--      capacidad (solo personas, owner de plataforma), y solo borra cuentas sin empresa, keys,
--      negocios a cargo, excepciones fijadas ni rol de plataforma.
-- Tablas con tenant_id: ninguna nueva. Migración de datos: ninguna.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opai_auth') THEN
    CREATE ROLE opai_auth NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

-- opai_app es NOINHERIT: no hereda los privilegios de opai_auth, solo puede asumirlo con SET ROLE.
GRANT opai_auth TO opai_app;
GRANT USAGE ON SCHEMA "core" TO opai_auth;

-- Lo mínimo que usa Better Auth (adaptador Prisma y plugin twoFactor). Sin DELETE en users, y sin
-- UPDATE de platform_role: Better Auth nunca la cambia (`input: false`); solo set_role, auditado.
GRANT SELECT, INSERT ON "core"."users" TO opai_auth;
GRANT UPDATE ("name", "email", "email_verified", "image", "two_factor_enabled", "updated_at")
  ON "core"."users" TO opai_auth;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON "core"."sessions", "core"."accounts", "core"."verifications", "core"."two_factor"
  TO opai_auth;

REVOKE ALL
  ON "core"."sessions", "core"."accounts", "core"."verifications", "core"."two_factor"
  FROM opai_app;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "core"."users" FROM opai_app;
GRANT UPDATE ("platform_role", "updated_at") ON "core"."users" TO opai_app;

REVOKE DELETE, TRUNCATE ON "core"."tenants" FROM opai_app;

-- Borrado de un usuario (CAR-45): solo sin rol de plataforma. Sus sesiones, cuentas y segundo
-- factor caen por CASCADE. Si algo lo referencia con RESTRICT (membresías, keys, del #113), no borra
-- y devuelve 'con_referencias': el bloque EXCEPTION es un savepoint, así la transacción de la
-- capacidad (con su auditoría) sigue viva. Tampoco borra si aún es responsable de un negocio o autor
-- de una excepción de permiso: esas FK son SET NULL y cambiarían datos de una empresa sin su auditoría.
CREATE OR REPLACE FUNCTION "core"."borrar_usuario"(p_user_id uuid) RETURNS text
-- `row_security = off`: comercial.negocios y core.permiso_excepciones tienen FORCE RLS y la función
-- corre sin app.tenant_id. Si su dueño no tuviera BYPASSRLS, los EXISTS verían 0 filas y el DELETE
-- dispararía los SET NULL en silencio; así, en ese caso falla («query would be affected by
-- row-level security policy») y no cambia nada (Revisor, review 5699061875).
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, core SET row_security = off AS $$
DECLARE
  v_rol text;
BEGIN
  SELECT u.platform_role INTO v_rol FROM core.users u WHERE u.id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'inexistente';
  END IF;
  IF v_rol IS NOT NULL THEN
    RETURN 'plataforma';
  END IF;
  IF EXISTS (SELECT 1 FROM comercial.negocios n WHERE n.responsable_id = p_user_id)
     OR EXISTS (SELECT 1 FROM core.permiso_excepciones x WHERE x.creado_por = p_user_id) THEN
    RETURN 'con_referencias';
  END IF;
  BEGIN
    DELETE FROM core.users WHERE id = p_user_id;
  EXCEPTION WHEN foreign_key_violation THEN
    RETURN 'con_referencias';
  END;
  RETURN 'borrado';
END
$$;
REVOKE ALL ON FUNCTION "core"."borrar_usuario"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."borrar_usuario"(uuid) TO opai_app;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción):
--   DROP FUNCTION IF EXISTS "core"."borrar_usuario"(uuid);
--   GRANT DELETE, TRUNCATE ON "core"."tenants" TO opai_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON "core"."users" TO opai_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE
--     ON "core"."sessions", "core"."accounts", "core"."verifications", "core"."two_factor"
--     TO opai_app;
--   (opai_auth: también REVOKE UPDATE por columnas de users, incluido en el REVOKE ALL siguiente)
--   REVOKE ALL ON "core"."users", "core"."sessions", "core"."accounts", "core"."verifications",
--     "core"."two_factor" FROM opai_auth;
--   REVOKE USAGE ON SCHEMA "core" FROM opai_auth;
--   REVOKE opai_auth FROM opai_app;
--   DROP ROLE IF EXISTS opai_auth;
-- La reversión exige desplegar antes el código anterior (clienteAuth sin SET LOCAL ROLE): con
-- el código nuevo y sin el rol, el login falla cerrado.
