// Fixture local del seguimiento #60. Nunca Neon/producción; no cambia al owner ni su contraseña.
import { hashPassword } from "better-auth/crypto";
import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { PLANTILLAS } from "../../db/scripts/roles-base-plantillas";
import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";
import { usuarioE2E } from "./usuario-e2e";

async function main() {
  exigirBaseE2E();
  const password = process.env["E2E_PASSWORD"];
  if (!password) throw new Error("Falta E2E_PASSWORD");
  const hash = await hashPassword(password);
  const tenant = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  const plantilla = PLANTILLAS.find((p) => p.nombre === "Inspector DT")!;
  await enTransaccion(tenant.id, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70167)`;
    const user = await usuarioE2E("inspector-seguimiento@opai.cl", "Inspector E2E", hash);
    const rol = await tx.rol.upsert({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: "Inspector seguimiento E2E" } },
      update: { permisos: [...plantilla.permisos] },
      create: {
        tenantId: tenant.id,
        nombre: "Inspector seguimiento E2E",
        permisos: [...plantilla.permisos],
      },
    });
    await tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: { rol: "supervisor", roleId: rol.id, portales: ["erp"] },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        rol: "supervisor",
        roleId: rol.id,
        portales: ["erp"],
      },
    });
  });
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Error de fixture");
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
