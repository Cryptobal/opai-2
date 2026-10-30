-- Qué hace y por qué (B1 · causa raíz, seguimiento de #134/#135/#138). La review del #138
-- (5707288897) aprobó el 5.º ajuste pero avisó que NO ataca el fondo: cada lectura de auth de Better
-- Auth corría como una transacción corta [BEGIN; SET LOCAL ROLE opai_auth; SELECT …; COMMIT] (CAR-43,
-- identidad.ts). Si la función de Vercel se congela o se corta con esa transacción abierta, la
-- conexión queda «idle in transaction» reteniendo un slot del pool hasta que Postgres la mata; las
-- siguientes peticiones caen en P2028. El fondo se ataca sacando el hot path de la transacción
-- (cambio 1, abajo): esas lecturas pasan a ser UNA sentencia autocommit, así que ya no pueden quedar
-- «idle in transaction» y los P2028 se resuelven sin bajar ningún tope.
-- Un solo cambio de esquema, sin tocar RLS ni permisos de tablas de negocio:
--   1. Funciones SECURITY DEFINER para leer la sesión por token y el usuario por id como UNA sola
--      sentencia autocommit (sin abrir transacción), dueñas de opai_auth (NOBYPASSRLS, con SELECT solo
--      sobre las tablas de identidad), search_path fijo (pg_catalog, core) y EXECUTE solo para opai_app
--      (REVOKE de PUBLIC). Devuelven solo las columnas que la sesión necesita, filtradas por el
--      token/id recibido; `users` no tiene credenciales (viven en accounts/two_factor). No abren hoyos
--      de RLS: su cuerpo solo lee core.sessions y core.users (sin tenant_id ni RLS) y el search_path
--      fijo impide secuestrar `sessions`/`users` con un objeto homónimo del llamador.
--      `auth_usuario_por_id` NO filtra por membresía a propósito: `core.users` es identidad global (sin
--      tenant_id ni RLS, como ya la lee opai_app en globales.usuarioPorId), el id viene de la sesión ya
--      validada por el servidor (nunca de entrada del usuario) y al resolver la sesión no hay tenant
--      activo contra el cual filtrar; un filtro por membresía rompería el acceso de plataforma/owner.
--   El idle_in_transaction_session_timeout del rol opai_app se MANTIENE en 30 s (el que dejó CAR-35,
--   20261028220000); este ALTER ROLE lo reafirma de forma idempotente. NO se baja a 5 s en este PR
--   (decisión del Revisor, review 5707965033): hay escrituras que esperan a R2 DENTRO de la
--   transacción (packages/capabilities/src/core/anexos/aprobar.ts:50 y, igual,
--   cumplimiento/solicitudes-exportar.ts:36, documentos/confirmar.ts:38, integraciones-probar.ts:44).
--   Con idle=5s, si R2 tarda >5 s Postgres cortaría la transacción ya con el archivo (datos
--   personales) subido a R2 pero sin su fila ni su auditoría. Bajar el tope queda para un PR posterior,
--   cuando esas esperas externas salgan de la transacción. No se tocan lock_timeout (5 s) ni
--   statement_timeout (20 s).
-- Tablas con tenant_id: ninguna nueva. Migración de datos: ninguna.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER ROLE opai_app SET idle_in_transaction_session_timeout = '30s';

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
-- sin las funciones, getSession falla cerrado. El idle queda en 30 s (no lo tocó esta migración).
--   DROP FUNCTION IF EXISTS "core"."auth_sesion_por_token"(text);
--   DROP FUNCTION IF EXISTS "core"."auth_usuario_por_id"(uuid);
