import { clienteApp } from "./client";
import type { TenantTx } from "./transaccion";

/** Identidad mínima para resolver al actor; nunca devuelve credenciales ni estado MFA. */
export function usuarioPorId(id: string) {
  return clienteApp().user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, platformRole: true },
  });
}

/** Resolución pública: no expone el perfil legal/comercial del tenant. */
export function tenantPorSlug(slug: string) {
  return clienteApp().tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, nombre: true, estado: true },
  });
}

/** Tenants activos o en trial: los crons iteran sobre ellos con `forTenant`. */
export function tenantsOperables() {
  return clienteApp().tenant.findMany({
    where: { estado: { in: ["activo", "trial"] } },
    select: { id: true, slug: true, timezone: true },
  });
}

/** Modelos cuyo CRUD solo tiene `opai_auth` (migración `20261029000000_identidad_rol_auth`). */
const MODELOS_OPAI_AUTH = new Set(["User", "Session", "Account", "Verification", "TwoFactor"]);

/**
 * Cliente con el rol `opai_auth` (CAR-43) para los modelos de identidad de Better Auth: cada
 * operación sobre esos modelos corre en su propia transacción que primero hace `SET LOCAL ROLE`
 * (mismo patrón que `forTenant`/`forUser` fijan `app.tenant_id` por transacción) — dura solo esa
 * transacción, así una conexión reciclada por el pool vuelve sola a `opai_app`. Los demás modelos
 * (p. ej. `LoginIntento`, que `packages/auth/src/bloqueo-login.ts` usa con ESTE mismo cliente,
 * dentro de su propia transacción con advisory lock) pasan de largo, sin envolver: no son de
 * `opai_auth`, y envolverlos abriría una transacción nueva ajena a la del llamador. No fija
 * `app.tenant_id`: estas tablas son globales, sin RLS (la protege Better Auth, no un tenant).
 */
function clienteConRolAuth() {
  const base = clienteApp();
  return base.$extends({
    name: "clienteAuth",
    query: {
      $allModels: {
        async $allOperations({ model, args, query }) {
          if (!model || !MODELOS_OPAI_AUTH.has(model)) return query(args);
          const [, resultado] = await base.$transaction([
            base.$executeRaw`SET LOCAL ROLE opai_auth`,
            query(args),
          ]);
          return resultado;
        },
      },
    },
  });
}

/** Solo el adaptador Better Auth, dentro de packages/auth (lint). */
export function clienteAuth() {
  return clienteConRolAuth();
}

/**
 * Último acceso (el `updatedAt` de la sesión más reciente) por usuario, para la lista de miembros
 * (CAR-43): `core.sessions` no tiene `tenant_id` ni RLS, por eso es una operación con nombre, con el
 * rol `opai_auth` y columnas mínimas — nunca el token de sesión.
 */
export async function ultimoAccesoDeUsuarios(
  userIds: readonly string[],
): Promise<Map<string, Date>> {
  if (userIds.length === 0) return new Map();
  const filas = await clienteConRolAuth().session.findMany({
    where: { userId: { in: [...userIds] } },
    select: { userId: true, updatedAt: true },
  });
  const ultimo = new Map<string, Date>();
  for (const f of filas) {
    const previo = ultimo.get(f.userId);
    if (!previo || f.updatedAt > previo) ultimo.set(f.userId, f.updatedAt);
  }
  return ultimo;
}

/**
 * Apaga el segundo factor de un usuario sin su contraseña (CAR-54): lo usa un owner de su empresa o
 * Plataforma para un usuario que perdió el teléfono y los códigos de respaldo (I-15). Mismo efecto
 * que Better Auth al desactivarlo (borra `two_factor`, `two_factor_enabled = false`) más invalidar
 * `mfaVerified` de sus sesiones vivas. Con `tx` (la transacción de la capacidad que lo pide, con su
 * propia auditoría) corre atómico con ella: cambia a `opai_auth` con `SET LOCAL ROLE` y vuelve a
 * `opai_app` con `RESET ROLE` antes de devolver el control (el resto del handler y su auditoría en
 * `core.audit_events`/`core.auditoria_global` siguen necesitando los permisos de `opai_app`). Sin
 * `tx` abre su propia transacción. Devuelve `false` si el usuario no tenía el segundo factor activo.
 */
export async function restablecerMfaDeUsuario(userId: string, tx?: TenantTx): Promise<boolean> {
  const ejecutar = async (t: TenantTx): Promise<boolean> => {
    await t.$executeRaw`SET LOCAL ROLE opai_auth`;
    const borrado = await t.twoFactor.deleteMany({ where: { userId } });
    if (borrado.count === 0) {
      await t.$executeRaw`RESET ROLE`;
      return false;
    }
    await t.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
    await t.session.updateMany({ where: { userId }, data: { mfaVerified: false } });
    await t.$executeRaw`RESET ROLE`;
    return true;
  };
  if (tx) return ejecutar(tx);
  return clienteApp().$transaction((t) => ejecutar(t));
}
