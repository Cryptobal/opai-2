-- Qué hace y por qué (B1 · causa raíz, seguimiento de #134/#135/#138). La review del #138
-- (5707288897) aprobó el 5.º ajuste pero avisó que NO ataca el fondo: cada lectura de auth de Better
-- Auth corre como una transacción corta [BEGIN; SET LOCAL ROLE opai_auth; SELECT …; COMMIT] (CAR-43,
-- identidad.ts). Si la función de Vercel se congela o se corta con esa transacción abierta, la
-- conexión queda «idle in transaction» reteniendo un slot del pool hasta que Postgres la mata; las
-- siguientes peticiones caen en P2028. Medido en local (scripts/diagnostico-b1-sesiones.ts): sin tope
-- esas conexiones no se cierran; con idle=5s se cortan (25P03) a ~5 s y sueltan el slot.
-- Dos cambios, sin tocar RLS ni permisos de tablas de negocio:
--   1. Baja el idle_in_transaction_session_timeout del rol opai_app de 30 s (CAR-35,
--      20261028220000) a 5 s: acota a ~5 s cualquier transacción abandonada (el fondo de B1). Es
--      MENOR que el timeout de las transacciones de Prisma (15 s) a propósito: una transacción sana
--      es ligada a la base y nunca está ociosa tanto (ADR-029 emite eventos como INSERT dentro de la
--      misma transacción, no hace E/S externa); lo que corta son las abandonadas/congeladas, que es
--      justo el fondo de B1. No se tocan lock_timeout (5 s) ni statement_timeout (20 s).
--   2. Funciones SECURITY DEFINER para leer la sesión por token y el usuario por id como UNA sola
--      sentencia autocommit (sin abrir transacción), dueñas de opai_auth (NOBYPASSRLS, con SELECT solo
--      sobre las tablas de identidad), search_path fijo (pg_catalog, core) y EXECUTE solo para opai_app
--      (REVOKE de PUBLIC). Devuelven solo las columnas que la sesión necesita, filtradas por el
--      token/id recibido; `users` no tiene credenciales (viven en accounts/two_factor). No abren hoyos
--      de RLS: su cuerpo solo lee core.sessions y core.users (sin tenant_id ni RLS) y el search_path
--      fijo impide secuestrar `sessions`/`users` con un objeto homónimo del llamador.
-- Tablas con tenant_id: ninguna nueva. Migración de datos: ninguna.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER ROLE opai_app SET idle_in_transaction_session_timeout = '5s';

-- opai_auth debe poder ser asumido por quien corre la migración y tener CREATE en core para ser
-- dueño de las funciones (en Neon el rol de migración no es superusuario). Ambos son transitorios y
-- se revierten al final: opai_auth no conserva CREATE y el rol de migración no queda como miembro.
GRANT opai_auth TO CURRENT_USER;
GRANT CREATE ON SCHEMA "core" TO opai_auth;

CREATE OR REPLACE FUNCTION "core"."auth_sesion_por_token"(p_token text)
RETURNS TABLE (
  s_id uuid, s_expires_at timestamptz, s_token text, s_ip_address text, s_user_agent text,
  s_user_id uuid, s_mfa_verified boolean, s_created_at timestamptz, s_updated_at timestamptz,
  u_id uuid, u_name text, u_email text, u_email_verified boolean, u_image text,
  u_platform_role text, u_two_factor_enabled boolean, u_created_at timestamptz, u_updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT s.id, s.expires_at, s.token, s.ip_address, s.user_agent, s.user_id, s.mfa_verified,
         s.created_at, s.updated_at,
         u.id, u.name, u.email, u.email_verified, u.image, u.platform_role, u.two_factor_enabled,
         u.created_at, u.updated_at
  FROM core.sessions s
  JOIN core.users u ON u.id = s.user_id
  WHERE s.token = p_token
$$;

CREATE OR REPLACE FUNCTION "core"."auth_usuario_por_id"(p_id uuid)
RETURNS TABLE (
  id uuid, name text, email text, email_verified boolean, image text, platform_role text,
  two_factor_enabled boolean, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT u.id, u.name, u.email, u.email_verified, u.image, u.platform_role, u.two_factor_enabled,
         u.created_at, u.updated_at
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

-- Reversión (manual, con el rol propietario, en una transacción). Exige desplegar antes el código
-- anterior (clienteAuth leyendo dentro de la transacción con SET LOCAL ROLE): con el código nuevo y
-- sin las funciones, getSession falla cerrado.
--   ALTER ROLE opai_app SET idle_in_transaction_session_timeout = '30s';
--   DROP FUNCTION IF EXISTS "core"."auth_sesion_por_token"(text);
--   DROP FUNCTION IF EXISTS "core"."auth_usuario_por_id"(uuid);
