import { PrismaPg } from "@prisma/adapter-pg";

import { configPool } from "./config-pool";
import { PrismaClient } from "./generated/prisma/client";
import { notificarConsulta } from "./metricas";
import { crearPool } from "./pool";

/**
 * Cliente de la app con el contador de consultas por request (ADR-045): cada operación de modelo
 * avisa a `notificarConsulta` antes de ejecutarse. El hook es transparente (devuelve `query(args)`
 * sin tocar el resultado) y no cubre `$executeRaw`/`$queryRaw`, así que el `set_config` de
 * `forTenant`/`forUser`/`enTransaccion` no se cuenta.
 */
function conContador(cliente: PrismaClient) {
  return cliente.$extends({
    name: "contadorConsultas",
    query: {
      $allModels: {
        $allOperations({ args, query }) {
          notificarConsulta();
          return query(args);
        },
      },
    },
  });
}

export type ClienteApp = ReturnType<typeof conContador>;

type Registro = {
  __opaiDbApp?: ClienteApp;
  __opaiDbAdmin?: PrismaClient;
};

const registro = globalThis as unknown as Registro;

function crearCliente(variable: "DATABASE_URL" | "DATABASE_URL_MIGRATE"): PrismaClient {
  const url = process.env[variable];
  if (!url) {
    throw new Error(`Falta la variable de entorno ${variable}.`);
  }
  // En Neon, neondb_owner (dueño y prisma migrate deploy) tiene BYPASSRLS; FORCE no le afecta.
  // FORCE es defensa en profundidad para dueños sin BYPASSRLS (local/CI u otro dueño).
  // La garantía es opai_app sin BYPASSRLS con tenant_isolation. Para mantenimiento,
  // confirmar BYPASSRLS: row_security=off no salta RLS, falla si filtraría filas.
  // Un pool por instancia serverless (este cliente se guarda en globalThis); en Vercel se avisa si
  // falta -pooler. El adaptador lo cierra en `$disconnect` (`disposeExternalPool`).
  const pool = crearPool({
    ...configPool(process.env, url, variable === "DATABASE_URL"),
    ...(variable === "DATABASE_URL_MIGRATE" ? { options: "-c row_security=off" } : {}),
  });
  return new PrismaClient({ adapter: new PrismaPg(pool, { disposeExternalPool: true }) });
}

/**
 * Cliente de la aplicación: rol `opai_app`, sin BYPASSRLS, conexión pooled.
 * Es interno al paquete: el código de negocio usa `forTenant(tenantId)`, nunca este cliente,
 * porque sin `app.tenant_id` fijado toda consulta devuelve cero filas.
 */
export function clienteApp(): ClienteApp {
  registro.__opaiDbApp ??= conContador(crearCliente("DATABASE_URL"));
  return registro.__opaiDbApp;
}

/**
 * Cliente de scripts (DATABASE_URL_MIGRATE). Con FORCE el dueño ya no salta RLS:
 * requiere un rol de mantenimiento BYPASSRLS explícito para datos cross-tenant.
 * SOLO para migraciones, scripts de importación y seeds ejecutados a mano.
 * Nunca se usa desde apps/web ni desde módulos; la variable no existe en Vercel.
 */
export function dbAdmin(): PrismaClient {
  registro.__opaiDbAdmin ??= crearCliente("DATABASE_URL_MIGRATE");
  return registro.__opaiDbAdmin;
}

/** Cierra los clientes abiertos (scripts y tests). */
export async function cerrarClientes(): Promise<void> {
  await Promise.all([registro.__opaiDbApp?.$disconnect(), registro.__opaiDbAdmin?.$disconnect()]);
  delete registro.__opaiDbApp;
  delete registro.__opaiDbAdmin;
}
