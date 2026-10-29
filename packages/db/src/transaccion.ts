import { type ClienteApp, clienteApp } from "./client";
import { validarTenantId } from "./for-tenant";
import { comoTransaccion, exigirSinLockAuditoria } from "./lock-auditoria";

/**
 * Cliente dentro de una transacción con el tenant fijado: toda consulta pasa por la RLS.
 * Se deriva del cliente con el contador de consultas (ADR-045), así que cada operación de modelo
 * dentro de la transacción también se cuenta por request.
 */
export type TenantTx = Omit<
  ClienteApp,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use" | ModelosCredenciales
>;

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
  return clienteApp().$transaction(
    (tx) =>
      comoTransaccion(async () => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${id}, true)`;
        return fn(tx);
      }),
    {
      timeout: opciones.timeoutMs ?? 15_000,
      maxWait: opciones.maxWaitMs ?? 5_000,
      ...(opciones.aislamiento ? { isolationLevel: opciones.aislamiento } : {}),
    },
  );
}
