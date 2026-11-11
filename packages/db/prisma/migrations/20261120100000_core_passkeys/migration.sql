-- Qué hace y por qué (CAR-286, decisión de Carlos del 11-nov-2026, cambia el ADR-002 / NÚCLEO-F):
-- passkeys (WebAuthn: Face ID, huella o llave física) con el plugin passkey de Better Auth, para
-- entrar sin contraseña y como segundo factor. Todo aditivo:
--   1. core.passkeys: credenciales públicas del plugin (clave PÚBLICA, contador, transportes). Es
--      identidad como users/two_factor: sin tenant_id ni RLS. Solo la toca `opai_auth` (Better Auth y
--      las operaciones con nombre de packages/db); opai_app no la lee ni la escribe (CAR-43).
--   2. core.users.passkey_enabled: marca derivada «tiene al menos una passkey», que la sesión necesita
--      para saber si la cuenta tiene un segundo factor sin otra consulta por petición. La mantiene un
--      trigger sobre core.passkeys (alta, baja o cambio de dueño), así no depende de quién escriba.
--   3. Las funciones del hot path de la sesión (B1) devuelven además esa marca. Cambia su tipo de
--      retorno, por eso se recrean (DROP + CREATE en la misma transacción, mismas reglas: dueñas de
--      opai_auth, search_path fijo, EXECUTE solo para opai_app). La columna nueva va al final: el
--      código anterior lee por nombre y la ignora, así que la migración puede ir antes del despliegue.
-- Tablas con tenant_id: ninguna nueva. Migración de datos: ninguna (la marca nace en false y no hay
-- passkeys previas).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "core"."passkeys" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "public_key" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "credential_id" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "device_type" TEXT NOT NULL,
    "backed_up" BOOLEAN NOT NULL,
    "transports" TEXT,
    "aaguid" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "passkeys_user_id_fkey" FOREIGN KEY ("user_id")
      REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Un id de credencial WebAuthn identifica una sola credencial: único, también entre usuarios.
CREATE UNIQUE INDEX IF NOT EXISTS "passkeys_credential_id_key" ON "core"."passkeys"("credential_id");
CREATE INDEX IF NOT EXISTS "passkeys_user_id_idx" ON "core"."passkeys"("user_id");

ALTER TABLE "core"."users" ADD COLUMN IF NOT EXISTS "passkey_enabled" BOOLEAN NOT NULL DEFAULT false;

-- La marca se recalcula en cada cambio de core.passkeys. SECURITY INVOKER: corre con el rol que
-- escribe (opai_auth, o el dueño de core.borrar_usuario en una baja en cascada, cuando el usuario
-- ya no existe y el UPDATE no toca filas).
CREATE OR REPLACE FUNCTION "core"."passkeys_sincronizar_usuario"() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, core AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    UPDATE core.users u
       SET passkey_enabled = EXISTS (SELECT 1 FROM core.passkeys p WHERE p.user_id = u.id)
     WHERE u.id = OLD.user_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE core.users u
       SET passkey_enabled = EXISTS (SELECT 1 FROM core.passkeys p WHERE p.user_id = u.id)
     WHERE u.id = NEW.user_id;
  END IF;
  RETURN NULL;
END
$$;
DROP TRIGGER IF EXISTS "passkeys_sincronizar_usuario" ON "core"."passkeys";
CREATE TRIGGER "passkeys_sincronizar_usuario"
  AFTER INSERT OR DELETE OR UPDATE OF "user_id" ON "core"."passkeys"
  FOR EACH ROW EXECUTE FUNCTION "core"."passkeys_sincronizar_usuario"();
REVOKE ALL ON FUNCTION "core"."passkeys_sincronizar_usuario"() FROM PUBLIC;

-- Privilegios: lo mismo que two_factor (CAR-43). ALTER DEFAULT PRIVILEGES de la migración inicial le
-- da CRUD a opai_app sobre tablas nuevas: se retira explícitamente.
GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."passkeys" TO opai_auth;
REVOKE ALL ON "core"."passkeys" FROM opai_app;
GRANT UPDATE ("passkey_enabled") ON "core"."users" TO opai_auth;

-- Funciones del hot path de la sesión (20261030020000), con la marca nueva al final.
GRANT opai_auth TO CURRENT_USER;
GRANT CREATE ON SCHEMA "core" TO opai_auth;

DROP FUNCTION IF EXISTS "core"."auth_sesion_por_token"(text);
CREATE FUNCTION "core"."auth_sesion_por_token"(p_token text)
RETURNS TABLE (
  s_id uuid, s_expires_at timestamptz, s_token text, s_ip_address text, s_user_agent text,
  s_user_id uuid, s_mfa_verified boolean, s_created_at timestamptz, s_updated_at timestamptz,
  u_id uuid, u_name text, u_email text, u_email_verified boolean, u_image text,
  u_platform_role text, u_two_factor_enabled boolean, u_created_at timestamptz, u_updated_at timestamptz,
  u_passkey_enabled boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT s.id, s.expires_at, s.token, s.ip_address, s.user_agent, s.user_id, s.mfa_verified,
         s.created_at, s.updated_at,
         u.id, u.name, u.email, u.email_verified, u.image, u.platform_role, u.two_factor_enabled,
         u.created_at, u.updated_at, u.passkey_enabled
  FROM core.sessions s
  JOIN core.users u ON u.id = s.user_id
  WHERE s.token = p_token
$$;

DROP FUNCTION IF EXISTS "core"."auth_usuario_por_id"(uuid);
CREATE FUNCTION "core"."auth_usuario_por_id"(p_id uuid)
RETURNS TABLE (
  id uuid, name text, email text, email_verified boolean, image text, platform_role text,
  two_factor_enabled boolean, created_at timestamptz, updated_at timestamptz,
  passkey_enabled boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT u.id, u.name, u.email, u.email_verified, u.image, u.platform_role, u.two_factor_enabled,
         u.created_at, u.updated_at, u.passkey_enabled
  FROM core.users u
  WHERE u.id = p_id
$$;

ALTER FUNCTION "core"."auth_sesion_por_token"(text) OWNER TO opai_auth;
ALTER FUNCTION "core"."auth_usuario_por_id"(uuid) OWNER TO opai_auth;
REVOKE ALL ON FUNCTION "core"."auth_sesion_por_token"(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION "core"."auth_usuario_por_id"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "core"."auth_sesion_por_token"(text) TO opai_app;
GRANT EXECUTE ON FUNCTION "core"."auth_usuario_por_id"(uuid) TO opai_app;

REVOKE CREATE ON SCHEMA "core" FROM opai_auth;
REVOKE opai_auth FROM CURRENT_USER;

COMMIT;

-- Reversión (manual, con el rol propietario, en una transacción; desplegar antes el código anterior):
--   recrear las dos funciones como en 20261030020000 (sin u_passkey_enabled/passkey_enabled),
--   DROP TRIGGER "passkeys_sincronizar_usuario" ON "core"."passkeys";
--   DROP FUNCTION "core"."passkeys_sincronizar_usuario"();
--   REVOKE UPDATE ("passkey_enabled") ON "core"."users" FROM opai_auth;
--   ALTER TABLE "core"."users" DROP COLUMN "passkey_enabled";
--   DROP TABLE "core"."passkeys";  (borra las passkeys registradas: avisar antes a los usuarios)
