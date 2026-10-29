import { type ClienteApp, clienteApp } from "./client";
import { forUser } from "./for-user";
import { exigirSinLockAuditoria } from "./lock-auditoria";
import { notificarConsulta } from "./metricas";
import type { TenantTx } from "./transaccion";

/**
 * Identidad con un rol propio (CAR-43, auditoría del Núcleo §I-04). `core.sessions`, `accounts`,
 * `verifications` y `two_factor` ya no se leen ni escriben como `opai_app`: cada operación de esos
 * modelos (y de `users`, que opai_app solo lee) corre en una transacción que primero asume
 * `opai_auth` con `SET LOCAL ROLE`. Es por transacción, así que no cambia la conexión del pool y
 * funciona con el pooler de Neon. `opai_app` es NOINHERIT: sin el SET ROLE no tiene esos privilegios.
 */
/** Transacción interactiva del cliente base, con los modelos de identidad (rol ya asumido). */
type TxAuth = Omit<
  ClienteApp,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

const MODELOS_AUTH: ReadonlySet<string> = new Set([
  "User",
  "Session",
  "Account",
  "Verification",
  "TwoFactor",
]);

function extender(base: ClienteApp) {
  return base.$extends({
    name: "rolAuth",
    client: {
      /**
       * Las transacciones interactivas del adaptador de Better Auth (consumir un token, contar
       * fallos de MFA) asumen el rol al empezar; dentro, `tx` es el cliente base con el rol ya fijado.
       */
      $transaction<T>(fn: (tx: TxAuth) => Promise<T>): Promise<T> {
        return base.$transaction(async (tx) => {
          await tx.$executeRaw`SET LOCAL ROLE opai_auth`;
          return fn(tx);
        });
      },
    },
    query: {
      $allModels: {
        async $allOperations({ model, args, query }) {
          if (!MODELOS_AUTH.has(model)) return query(args);
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

let cache: { base: ClienteApp; cliente: ReturnType<typeof extender> } | null = null;

/** Solo el adaptador Better Auth, dentro de packages/auth (lint). */
export function clienteAuth() {
  const base = clienteApp();
  if (cache?.base !== base) cache = { base, cliente: extender(base) };
  return cache.cliente;
}

/**
 * `core.login_intentos` (bloqueo de login, B1) sigue con `opai_app`: sus funciones y grants son de
 * ese rol. Solo dentro de packages/auth (lint), como `clienteAuth`.
 */
export function clienteBloqueoLogin() {
  return clienteApp();
}

/**
 * Corre `fn` con `opai_auth` dentro de la transacción del llamador y vuelve al rol que tenía la
 * conexión (no a `NONE`, que sería el `session_user`), también si `fn` lanza sin error SQL.
 */
async function conRolAuth<T>(tx: TenantTx, fn: () => Promise<T>): Promise<T> {
  notificarConsulta();
  const [previo] = await tx.$queryRaw<{ r: string }[]>`SELECT current_user::text AS r`;
  if (!previo) throw new Error("No se pudo leer el rol actual.");
  const restaurar = () => tx.$executeRaw`SELECT set_config('role', ${previo.r}, true)`;
  await tx.$executeRaw`SET LOCAL ROLE opai_auth`;
  let r: T;
  try {
    r = await fn();
  } catch (error) {
    // Con un error SQL la transacción ya está abortada y se revierte entera: se propaga el original.
    await restaurar().catch(() => undefined);
    throw error;
  }
  await restaurar();
  return r;
}

/**
 * Último acceso (sesión más reciente) por usuario: solo `userId` y la fecha, nunca el token. Abre su
 * propia transacción con el rol de auth (en una lectura, `ctx.db` no es una transacción).
 */
export async function ultimosAccesos(userIds: readonly string[]): Promise<Map<string, Date>> {
  if (userIds.length === 0) return new Map();
  exigirSinLockAuditoria("Leer el último acceso");
  const filas = await clienteAuth().session.groupBy({
    by: ["userId"],
    where: { userId: { in: [...userIds] } },
    _max: { updatedAt: true },
  });
  const ultimo = new Map<string, Date>();
  for (const f of filas) if (f._max.updatedAt) ultimo.set(f.userId, f._max.updatedAt);
  return ultimo;
}

/**
 * Restablece el segundo factor de un usuario (CAR-54): borra su enrolamiento y cierra todas sus
 * sesiones, para que vuelva a entrar con contraseña y enrolarse de nuevo. Corre en la transacción
 * de la capacidad que lo autorizó, junto con su auditoría.
 */
export async function restablecerSegundoFactor(tx: TenantTx, userId: string) {
  return conRolAuth(tx, async () => {
    const enrolamientos = await tx.$executeRaw`
      DELETE FROM core.two_factor WHERE user_id = ${userId}::uuid`;
    await tx.$executeRaw`
      UPDATE core.users SET two_factor_enabled = false, updated_at = now() WHERE id = ${userId}::uuid`;
    const sesiones =
      await tx.$executeRaw`DELETE FROM core.sessions WHERE user_id = ${userId}::uuid`;
    return { enrolamientos, sesiones };
  });
}

export type ResultadoBorrado = "borrado" | "inexistente" | "plataforma" | "con_referencias";

/**
 * Borra un usuario sin rol de plataforma (CAR-45) con `core.borrar_usuario` (SECURITY DEFINER):
 * opai_app no tiene DELETE sobre `core.users`. No borra si tiene membresías o keys (RESTRICT).
 */
export async function borrarUsuario(tx: TenantTx, userId: string): Promise<ResultadoBorrado> {
  notificarConsulta();
  const [fila] = await tx.$queryRaw<{ r: ResultadoBorrado }[]>`
    SELECT core.borrar_usuario(${userId}::uuid) AS r`;
  if (!fila) throw new Error("core.borrar_usuario no devolvió resultado.");
  return fila.r;
}

/** Si el usuario es miembro de alguna empresa distinta de `tenantId` (por `user_self`, sin datos). */
export async function usuarioEnOtrasEmpresas(userId: string, tenantId: string): Promise<boolean> {
  exigirSinLockAuditoria("Contar las empresas del usuario");
  const n = await forUser(userId).membership.count({ where: { tenantId: { not: tenantId } } });
  return n > 0;
}
