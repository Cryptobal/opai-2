// Crea (idempotente) el tenant de desarrollo `gard` con el rol propietario y siembra su catálogo
// base (cargos, estructuras de cargo, tipos de documento), las funciones base del puesto (solo dev
// y pruebas) y los precios de plataforma.
// Uso: DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db seed:dev-tenant
import "dotenv/config";

import { cerrarClientes, dbAdmin } from "../src/index";
import { sembrarCatalogo, sembrarComercial, sembrarPrecios } from "./catalogo-tenant";
import { sembrarFuncionesBase } from "./funciones-base";

async function main(): Promise<void> {
  const db = dbAdmin();
  const tenant = await db.tenant.upsert({
    where: { slug: "gard" },
    update: {},
    create: { slug: "gard", nombre: "Gard Security", vertical: "seguridad" },
  });
  await sembrarCatalogo(db.$extends({}), tenant.id, tenant.vertical);
  await sembrarFuncionesBase(db.$extends({}), tenant.id, tenant.vertical);
  await sembrarComercial(db.$extends({}), tenant.id);
  // Activa los módulos del tenant de desarrollo (navegación, configuración y capacidades).
  for (const moduloId of ["comercial", "rondas", "portal_cliente"]) {
    await db.tenantModule.upsert({
      where: { tenantId_moduloId: { tenantId: tenant.id, moduloId } },
      update: {},
      create: { tenantId: tenant.id, moduloId, estado: "activo" },
    });
  }
  await sembrarPrecios(db);
  console.log(`Tenant ${tenant.slug} listo con catálogo base. DEV_TENANT_ID=${tenant.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
