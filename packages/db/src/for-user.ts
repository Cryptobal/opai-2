import { clienteApp } from "./client";
import { validarTenantId } from "./for-tenant";

/**
 * Cliente Prisma acotado a un usuario: fija `app.user_id` por transacción.
 *
 * Solo sirve para leer las membresías propias (política `user_self`) antes de elegir tenant.
 * Todo lo demás pasa por `forTenant`: las otras tablas no tienen política por usuario y,
 * sin `app.tenant_id`, devuelven cero filas.
 */
export function forUser(userId: string) {
  const id = validarTenantId(userId);
  const base = clienteApp();
  return base.$extends({
    name: "forUser",
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, resultado] = await base.$transaction([
            base.$executeRaw`SELECT set_config('app.user_id', ${id}, true)`,
            query(args),
          ]);
          return resultado;
        },
      },
    },
  });
}

export type UserDb = ReturnType<typeof forUser>;
