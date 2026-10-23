import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

type Registro = {
  __opaiDbApp?: PrismaClient;
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
export function clienteApp(): PrismaClient {
  registro.__opaiDbApp ??= crearCliente("DATABASE_URL");
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
