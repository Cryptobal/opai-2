import { type ClienteApp, clienteApp } from "./client";
import { configTransaccion } from "./config-pool";
import { validarTenantId } from "./for-tenant";
import { comoTransaccion, exigirSinLockAuditoria } from "./lock-auditoria";

/**
 * Cliente dentro de una transacción con el tenant fijado: toda consulta pasa por la RLS.
 * Se deriva del cliente con el contador de consultas (ADR-045), así que cada operación de modelo
 * dentro de la transacción también se cuenta por request.
 */
export type TenantTx = Omit<TxDePrisma, ModelosCredenciales>;

/**
 * Tipo exacto del `tx` que Prisma entrega a `$transaction(fn)`. Derivar `TenantTx` de él (y no de
 * otro `Omit<ClienteApp, …>`) evita que el compilador compare dos tipos estructurales gigantes cada
 * vez que `tx` pasa a `fn` (CAR-161 · R2: esa sola comparación tardaba ~20 s y ~600 MB).
 */
type TxDePrisma = Parameters<Parameters<ClienteApp["$transaction"]>[0]>[0];

/**
 * Tablas de credenciales de Better Auth (CAR-43): `opai_app` no tiene privilegios sobre ellas y el
 * tipo tampoco las ofrece. Solo `clienteAuth()` (packages/auth) y operaciones con nombre de
 * `identidad.ts` llegan a ellas, con el rol `opai_auth`.
 */
export type ModelosCredenciales = "session" | "account" | "verification" | "twoFactor";

export type OpcionesTransaccion = {
  timeoutMs?: number;
  maxWaitMs?: number;
  aislamiento?: "RepeatableRead";
};

/**
 * Transacción interactiva con `app.tenant_id` fijado para toda su duración (ADR-002, ADR-029).
 * Úsala cuando varias escrituras deben ser atómicas: el cambio de negocio, su evento en el outbox
 * y el hecho en la bitácora. Dentro de `fn` usa solo `tx` (nunca `forTenant`, que abre otra).
 */
export async function enTransaccion<T>(
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
  opciones: OpcionesTransaccion = {},
): Promise<T> {
  const id = validarTenantId(tenantId);
  // Antes de pedir la conexión: dentro de una transacción con el lock de auditoría, rechaza.
  exigirSinLockAuditoria("Abrir otra transacción");
  // El defecto (`maxWait` alineado con el plazo del pool) viene de `configTransaccion`, igual que el
  // del cliente; quien llama puede acotarlo (p. ej. la verificación de auditoría). Antes el `maxWait`
  // fijo de 5 s se cortaba bajo ráfaga antes que el pool entregara la conexión (P2028, PR #134, B1).
  const defecto = configTransaccion(process.env);
  return clienteApp().$transaction(
    (tx) =>
      comoTransaccion(async () => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${id}, true)`;
        return fn(tx);
      }),
    {
      timeout: opciones.timeoutMs ?? defecto.timeout,
      maxWait: opciones.maxWaitMs ?? defecto.maxWait,
      ...(opciones.aislamiento ? { isolationLevel: opciones.aislamiento } : {}),
    },
  );
}

/** Igual que `enTransaccion`, fijando además `app.user_id` (RLS restrictiva por usuario). */
export async function enTransaccionConUsuario<T>(
  tenantId: string,
  usuarioId: string,
  fn: (tx: TenantTx) => Promise<T>,
  opciones: OpcionesTransaccion = {},
): Promise<T> {
  const tid = validarTenantId(tenantId);
  const uid = validarTenantId(usuarioId);
  exigirSinLockAuditoria("Abrir otra transacción");
  const defecto = configTransaccion(process.env);
  return clienteApp().$transaction(
    (tx) =>
      comoTransaccion(async () => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tid}, true)`;
        await tx.$executeRaw`SELECT set_config('app.user_id', ${uid}, true)`;
        return fn(tx);
      }),
    {
      timeout: opciones.timeoutMs ?? defecto.timeout,
      maxWait: opciones.maxWaitMs ?? defecto.maxWait,
      ...(opciones.aislamiento ? { isolationLevel: opciones.aislamiento } : {}),
    },
  );
}
