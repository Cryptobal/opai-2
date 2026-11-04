import type { ClienteApp } from "./client";

/**
 * Lecturas de la sesión de Better Auth fuera de transacción (B1 · causa raíz). Antes cada lectura de
 * auth corría como [BEGIN; SET LOCAL ROLE opai_auth; SELECT …; COMMIT] (CAR-43): si la función de
 * Vercel se congelaba con esa transacción abierta, la conexión quedaba «idle in transaction» y
 * saturaba el pool (P2028). El hot path (sesión por token en cada petición, y usuario por id) pasa
 * ahora por funciones SECURITY DEFINER (`core.auth_sesion_por_token`, `core.auth_usuario_por_id`,
 * dueñas de opai_auth) invocadas como UNA sola sentencia autocommit: no abren transacción, así que
 * no pueden quedar «idle in transaction». El resto de operaciones de auth (escrituras, lecturas por
 * otros campos, groupBy) siguen por la transacción corta, acotada por el idle_in_transaction del rol
 * (30 s; no se baja a 5 s en este PR porque hay escrituras que esperan a R2 dentro de la transacción,
 * decisión del Revisor, review 5707965033).
 */

type FilaSesion = {
  s_id: string;
  s_expires_at: Date;
  s_token: string;
  s_ip_address: string | null;
  s_user_agent: string | null;
  s_user_id: string;
  s_mfa_verified: boolean;
  s_created_at: Date;
  s_updated_at: Date;
  u_id: string;
  u_name: string;
  u_email: string;
  u_email_verified: boolean;
  u_image: string | null;
  u_platform_role: string | null;
  u_two_factor_enabled: boolean;
  u_created_at: Date;
  u_updated_at: Date;
};

type FilaUsuario = {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  image: string | null;
  platform_role: string | null;
  two_factor_enabled: boolean;
  created_at: Date;
  updated_at: Date;
};

/** Valor de una igualdad simple (`{campo: v}` o `{campo: {equals: v}}`) y nada más; si no, null. */
export function soloIgualdad(where: unknown, campo: string): string | null {
  if (!where || typeof where !== "object") return null;
  const w = where as Record<string, unknown>;
  const claves = Object.keys(w);
  if (claves.length !== 1 || claves[0] !== campo) return null;
  const v = w[campo];
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const ks = Object.keys(o);
    if (ks.length === 1 && ks[0] === "equals" && typeof o["equals"] === "string")
      return o["equals"];
  }
  return null;
}

function usuario(f: FilaSesion) {
  return {
    id: f.u_id,
    name: f.u_name,
    email: f.u_email,
    emailVerified: f.u_email_verified,
    image: f.u_image,
    platformRole: f.u_platform_role,
    twoFactorEnabled: f.u_two_factor_enabled,
    createdAt: f.u_created_at,
    updatedAt: f.u_updated_at,
  };
}

/**
 * Sesión por token (con el usuario unido cuando la consulta lo pide), como sentencia autocommit.
 * No avisa al contador de consultas: se invoca desde el hook de modelos de `clienteAuth()`, que ya
 * contó esta operación (`Session.findFirst`); avisar aquí la contaría dos veces (CAR-50).
 */
export async function leerSesionPorToken(base: ClienteApp, token: string, incluirUser: boolean) {
  const filas = await base.$queryRaw<FilaSesion[]>`
    SELECT * FROM core.auth_sesion_por_token(${token})`;
  const f = filas[0];
  if (!f) return null;
  const sesion = {
    id: f.s_id,
    expiresAt: f.s_expires_at,
    token: f.s_token,
    ipAddress: f.s_ip_address,
    userAgent: f.s_user_agent,
    userId: f.s_user_id,
    mfaVerified: f.s_mfa_verified,
    createdAt: f.s_created_at,
    updatedAt: f.s_updated_at,
  };
  return incluirUser ? { ...sesion, user: usuario(f) } : sesion;
}

/** Un uuid canónico (8-4-4-4-12 hex); evita que un id no-uuid reviente el cast `::uuid` de la función. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Usuario por id, como sentencia autocommit. `users` no tiene credenciales (CAR-43) y es identidad
 * global (sin tenant_id ni RLS): no se filtra por membresía porque el id viene de la sesión ya
 * validada y al leerla no hay tenant activo (igual que `globales.usuarioPorId`). Un id que no sea uuid
 * no corresponde a ningún usuario: devuelve null sin consultar, en vez de fallar con el cast `::uuid`.
 * No avisa al contador de consultas: ya lo hizo el hook de modelos (`User.findFirst`), ver arriba.
 */
export async function leerUsuarioPorId(base: ClienteApp, id: string) {
  if (!UUID_RE.test(id)) return null;
  const filas = await base.$queryRaw<FilaUsuario[]>`
    SELECT * FROM core.auth_usuario_por_id(${id}::uuid)`;
  const f = filas[0];
  if (!f) return null;
  return {
    id: f.id,
    name: f.name,
    email: f.email,
    emailVerified: f.email_verified,
    image: f.image,
    platformRole: f.platform_role,
    twoFactorEnabled: f.two_factor_enabled,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  };
}

/**
 * Si la operación es una lectura del hot path (sesión por token o usuario por id) la resuelve por
 * función y devuelve `{ manejada: true, valor }`; si no, `{ manejada: false }` y el llamador usa la
 * vía transaccional. Solo `findFirst` con una igualdad simple: cualquier otra forma (findMany, count,
 * groupBy, where compuesto, por email) cae a la vía transaccional, acotada por idle=30s del rol.
 */
export async function lecturaAuthPorFuncion(
  base: ClienteApp,
  model: string,
  operation: string,
  args: unknown,
): Promise<{ manejada: true; valor: unknown } | { manejada: false }> {
  if (operation !== "findFirst" || !args || typeof args !== "object") return { manejada: false };
  const where = (args as { where?: unknown }).where;
  const select = (args as { select?: { user?: unknown } }).select;
  if (model === "Session") {
    const token = soloIgualdad(where, "token");
    if (token !== null) {
      return {
        manejada: true,
        valor: await leerSesionPorToken(base, token, Boolean(select?.user)),
      };
    }
  } else if (model === "User") {
    const id = soloIgualdad(where, "id");
    if (id !== null) return { manejada: true, valor: await leerUsuarioPorId(base, id) };
  }
  return { manejada: false };
}
