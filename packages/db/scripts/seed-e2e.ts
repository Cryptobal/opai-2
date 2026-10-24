// Pertenencia del usuario plataforma al tenant `gard` (owner, todos los portales) para los e2e de CI.
// Uso: DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db seed:e2e
// Corre después de seed:dev-tenant y seed:platform-owner. Idempotente. No toca contraseñas.
import "dotenv/config";

import { cerrarClientes, dbAdmin } from "../src/index";

async function main(): Promise<void> {
  if (process.env["VERCEL_ENV"] === "production" || process.env["NODE_ENV"] === "production") {
    throw new Error("Solo para desarrollo y CI.");
  }
  // Solo contra una base local (Postgres de servicio de CI o de desarrollo), nunca contra Neon.
  const host = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/")
    .hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`seed:e2e solo corre contra una base local (host recibido: ${host}).`);
  }
  const email = (process.env["SEED_OWNER_EMAIL"] ?? "carlos.irigoyen@opai.cl").toLowerCase();
  const db = dbAdmin();
  const tenant = await db.tenant.findUnique({ where: { slug: "gard" } });
  const user = await db.user.findUnique({ where: { email } });
  if (!tenant || !user) throw new Error("Primero corre seed:dev-tenant y seed:platform-owner.");
  const portales = ["erp", "supervisor", "trabajador", "terreno", "cliente"];
  await db.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { rol: "owner", portales, estado: "activa" },
    create: { tenantId: tenant.id, userId: user.id, rol: "owner", portales, estado: "activa" },
  });
  console.log(`${email} es owner de ${tenant.slug} con todos los portales.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
