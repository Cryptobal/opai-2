// Da a un usuario de prueba membresía en dos empresas (`gard` y `atlas`) y con dos portales (ERP y
// Supervisor), para probar el selector de portal y de empresa del riel de iPad
// (apps/web/e2e/selector-riel.spec.ts). Es un usuario aparte del de Carlos: con dos empresas el
// login pasa por «Elegir empresa» y los demás e2e esperan entrar directo. Idempotente. Solo
// desarrollo y bases locales.
// Uso (el usuario con platformRole se crea antes con la misma contraseña de pruebas):
//   SEED_OWNER_EMAIL=e2e-selector@opai.cl pnpm --filter @opai/auth seed:platform-owner
//   pnpm --filter @opai/db seed:multiempresa-dev
import "dotenv/config";

import { cerrarClientes, dbAdmin } from "../src/index";
import { sembrarCatalogo } from "./catalogo-tenant";

const CORREO = process.env["E2E_SELECTOR_EMAIL"] ?? "e2e-selector@opai.cl";

async function main(): Promise<void> {
  if (process.env["VERCEL_ENV"] === "production") throw new Error("Solo para desarrollo.");
  const url = process.env["DATABASE_URL_MIGRATE"] ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && process.env["E2E_SEED_REMOTO"] !== "1") {
    throw new Error("Base remota: confirma con E2E_SEED_REMOTO=1 si es la rama dev.");
  }
  const db = dbAdmin();
  const usuario = await db.user.findUnique({ where: { email: CORREO } });
  if (!usuario) throw new Error(`No existe el usuario ${CORREO} (seed:platform-owner).`);
  const gard = await db.tenant.findUnique({ where: { slug: "gard" } });
  if (!gard) throw new Error("Primero corre seed:dev-tenant.");
  const atlas = await db.tenant.upsert({
    where: { slug: "atlas" },
    update: {},
    create: { slug: "atlas", nombre: "Atlas Seguridad SpA", vertical: "seguridad" },
  });
  await sembrarCatalogo(db.$extends({}), atlas.id, atlas.vertical);
  for (const tenantId of [gard.id, atlas.id]) {
    await db.membership.upsert({
      where: { tenantId_userId: { tenantId, userId: usuario.id } },
      update: { portales: ["erp", "supervisor"], estado: "activa" },
      create: { tenantId, userId: usuario.id, rol: "owner", portales: ["erp", "supervisor"] },
    });
  }
  console.log(`${CORREO}: owner en gard y atlas, portales erp y supervisor.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
