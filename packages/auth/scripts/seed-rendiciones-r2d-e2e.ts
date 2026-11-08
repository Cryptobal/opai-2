// Viewer exclusivo de R2D. Solo DB e2e local, independiente del usuario mutable de roles-permisos.
import { hashPassword } from "better-auth/crypto";
import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { exigirBaseR2dE2E } from "./rendiciones-r2d-entorno";
import { usuarioE2E } from "./usuario-e2e";

async function main() {
  exigirBaseR2dE2E();
  const password = process.env["E2E_PASSWORD"];
  if (!password) throw new Error("Falta E2E_PASSWORD");
  const hash = await hashPassword(password);
  const tenant = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenant.id, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70205)`;
    // El caso verifica falta del permiso Rendir, no falta de instalación del módulo.
    await tx.tenantModule.upsert({
      where: { tenantId_moduloId: { tenantId: tenant.id, moduloId: "rendiciones" } },
      update: { estado: "activo" },
      create: { tenantId: tenant.id, moduloId: "rendiciones", estado: "activo" },
    });
    const user = await usuarioE2E("r2d-viewer@prueba.invalid", "Viewer R2D ficticio", hash);
    const m = await tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: { rol: "viewer", roleId: null, portales: ["erp"], estado: "activa" },
      create: { tenantId: tenant.id, userId: user.id, rol: "viewer", portales: ["erp"] },
    });
    await tx.permisoExcepcion.deleteMany({ where: { membershipId: m.id } });
  });
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Error de fixture R2D");
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
