import { clienteApp } from "./client";
import { exigirSinLockAuditoria } from "./lock-auditoria";
import { validarTenantId } from "./for-tenant";

/**
 * Cliente Prisma con `app.tenant_id` y `app.user_id` fijados por transacción.
 * Usar solo en tablas con RLS restrictiva por usuario (p. ej. `core.novedades_lectura`).
 */
export function forTenantUsuario(tenantId: string, usuarioId: string) {
  const tid = validarTenantId(tenantId);
  const uid = validarTenantId(usuarioId);
  const base = clienteApp();
  const cliente = base.$extends({
    name: "forTenantUsuario",
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          exigirSinLockAuditoria("Una consulta con forTenantUsuario");
          const [, , resultado] = await base.$transaction([
            base.$executeRaw`SELECT set_config('app.tenant_id', ${tid}, true)`,
            base.$executeRaw`SELECT set_config('app.user_id', ${uid}, true)`,
            query(args),
          ]);
          return resultado;
        },
      },
    },
  });
  return cliente;
}

export type TenantUsuarioDb = ReturnType<typeof forTenantUsuario>;
