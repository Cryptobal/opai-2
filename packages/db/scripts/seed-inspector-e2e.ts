// Fixture local del seguimiento #60. Nunca Neon/producción; no cambia al owner ni su contraseña.
import { cerrarClientes, dbAdmin } from "../src/index";
import { PLANTILLAS } from "./roles-base-plantillas";

async function main() {
  const url = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/opai_e2e" ||
    process.env["NODE_ENV"] === "production"
  )
    throw new Error("Solo opai_e2e local.");
  const db = dbAdmin();
  const owner = await db.user.findUniqueOrThrow({
    where: { email: process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl" },
  });
  const cuenta = await db.account.findFirstOrThrow({
    where: { userId: owner.id, providerId: "credential" },
  });
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  const plantilla = PLANTILLAS.find((p) => p.nombre === "Inspector DT")!;
  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: "inspector-seguimiento@opai.cl" },
      update: {},
      create: {
        email: "inspector-seguimiento@opai.cl",
        name: "Inspector E2E",
        emailVerified: true,
      },
    });
    const actual = await tx.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (actual)
      await tx.account.update({ where: { id: actual.id }, data: { password: cuenta.password } });
    else
      await tx.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: cuenta.password,
        },
      });
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
