import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";
import { notificarConsulta } from "./metricas";

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
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
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
 * Cliente con el rol propietario (DATABASE_URL_MIGRATE). Salta la RLS.
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
