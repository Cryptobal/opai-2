// Fixture TEST local de navegación: licencias de Agente y Pauta, sin cambiar roles ni permisos.
import { cerrarClientes, dbAdmin } from "../src/index";

async function main() {
  const url = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.includes("e2e")) {
    throw new Error("La fixture de navegación solo admite una base e2e local.");
  }
  const db = dbAdmin();
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  for (const moduloId of ["agente", "pauta"]) {
    await db.tenantModule.upsert({
      where: { tenantId_moduloId: { tenantId: tenant.id, moduloId } },
      update: { estado: "activo" },
      create: { tenantId: tenant.id, moduloId, estado: "activo" },
    });
  }
  console.log("Fixture TEST de licencias de navegación lista.");
}
main().finally(cerrarClientes);
