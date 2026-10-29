// Fixture local del e2e de roles y permisos (CAR-37). Nunca Neon/producción; no toca al owner.
// Deja a «roles-e2e@opai.cl» como viewer del ERP, sin rol personalizado ni excepciones, para que
// el e2e le asigne un rol y una excepción desde la pantalla en cada corrida.
import { hashPassword } from "better-auth/crypto";
import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";
import { usuarioE2E } from "./usuario-e2e";

const EMAIL = "roles-e2e@opai.cl";

async function main() {
  exigirBaseE2E();
  const password = process.env["E2E_PASSWORD"];
  if (!password) throw new Error("Falta E2E_PASSWORD");
  const hash = await hashPassword(password);
  const tenant = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenant.id, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70137)`;
    const user = await usuarioE2E(EMAIL, "Roles E2E", hash);
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
    console.error(error instanceof Error ? error.message : "Error de fixture");
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
