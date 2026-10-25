import { type ClienteApp, clienteApp } from "./client";
import { validarTenantId } from "./for-tenant";

/**
 * Cliente dentro de una transacción con el tenant fijado: toda consulta pasa por la RLS.
 * Se deriva del cliente con el contador de consultas (ADR-045), así que cada operación de modelo
 * dentro de la transacción también se cuenta por request.
 */
export type TenantTx = Omit<
  ClienteApp,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

export type OpcionesTransaccion = { timeoutMs?: number };

/**
 * Transacción interactiva con `app.tenant_id` fijado para toda su duración (ADR-002, ADR-029).
 * Úsala cuando varias escrituras deben ser atómicas: el cambio de negocio, su evento en el outbox
 * y el hecho en la bitácora. Dentro de `fn` usa solo `tx` (nunca `forTenant`, que abre otra).
 */
export function enTransaccion<T>(
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
  opciones: OpcionesTransaccion = {},
): Promise<T> {
  const id = validarTenantId(tenantId);
  return clienteApp().$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${id}, true)`;
      return fn(tx);
    },
    { timeout: opciones.timeoutMs ?? 15_000, maxWait: 5_000 },
  );
}
