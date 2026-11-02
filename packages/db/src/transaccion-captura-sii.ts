import { clienteCronSii, type ClienteApp } from "./client";
import { configTransaccion } from "./config-pool";
import { validarTenantId } from "./for-tenant";
import { comoTransaccion, exigirSinLockAuditoria } from "./lock-auditoria";
import type { OpcionesTransaccion, TenantTx } from "./transaccion";

/**
 * Transacción de la captura diaria UF/UTM: conexión como `opai_cron_sii` (DATABASE_URL_CRON_SII),
 * único rol con EXECUTE sobre `remuneraciones_publicar_sii`.
 */
export async function enTransaccionCapturaSii<T>(
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
  opciones: OpcionesTransaccion = {},
): Promise<T> {
  const id = validarTenantId(tenantId);
  exigirSinLockAuditoria("Abrir otra transacción");
  const defecto = configTransaccion(process.env);
  const cliente: ClienteApp = clienteCronSii();
  return cliente.$transaction(
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
