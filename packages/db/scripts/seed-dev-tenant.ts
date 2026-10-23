// Crea (idempotente) el tenant de desarrollo `gard` con el rol propietario y muestra su id.
// Uso: DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db seed:dev-tenant
import "dotenv/config";

import { cerrarClientes, dbAdmin } from "../src/index";

async function main(): Promise<void> {
  const tenant = await dbAdmin().tenant.upsert({
    where: { slug: "gard" },
    update: {},
    create: { slug: "gard", nombre: "Gard Security", vertical: "seguridad" },
  });
  console.log(`Tenant ${tenant.slug} listo. DEV_TENANT_ID=${tenant.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
