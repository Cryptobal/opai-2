import { clienteApp } from "./client";
import { exigirSinLockAuditoria } from "./lock-auditoria";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lanza si el id no es un UUID. Evita que un valor arbitrario llegue a `set_config`. */
export function validarTenantId(tenantId: string): string {
  if (!UUID.test(tenantId)) {
    throw new Error("Id inválido: se esperaba un UUID.");
  }
  return tenantId;
}

/**
 * Cliente Prisma acotado a un tenant (ADR-002).
 *
 * Cada operación de modelo corre dentro de una transacción que primero fija
 * `app.tenant_id` con `set_config(..., true)` (alcance local a la transacción).
 * Las políticas de Row-Level Security de Postgres filtran y validan por ese valor,
 * así que la segregación no depende de recordar un `where`.
 *
 * Las consultas crudas (`$queryRaw`, `$executeRaw`) del cliente devuelto NO fijan el tenant.
 * El código de negocio no las usa; si un script las necesita, usa `dbAdmin()`.
 */
export function forTenant(tenantId: string) {
  const id = validarTenantId(tenantId);
  const base = clienteApp();
  return base.$extends({
    name: "forTenant",
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          exigirSinLockAuditoria("Una consulta con forTenant");
          const [, resultado] = await base.$transaction([
            base.$executeRaw`SELECT set_config('app.tenant_id', ${id}, true)`,
            query(args),
          ]);
          return resultado;
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof forTenant>;
