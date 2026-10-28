// Fixture exclusiva de la base local E2E: usuarios con concesión y denegación explícitas.
import { hashPassword } from "better-auth/crypto";
import { cerrarClientes, dbAdmin } from "@opai/db";

async function main() {
  const url = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/");
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^\/opai_e2e(?:_[a-zA-Z0-9_]+)?$/.test(url.pathname) ||
    process.env["NODE_ENV"] === "production"
  )
    throw new Error("Solo opai_e2e local.");
  const password = process.env["E2E_PASSWORD"];
  if (!password) throw new Error("Falta E2E_PASSWORD");
  const hash = await hashPassword(password);
  const db = dbAdmin();
  const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70168)`;
    const persona = await tx.persona.upsert({
      where: { tenantId_rut: { tenantId: tenant.id, rut: "11111111-1" } },
      update: {},
      create: {
        id: "00000000-0000-7000-8000-000000000078",
        tenantId: tenant.id,
        rut: "11111111-1",
        nombres: "Prueba",
        apellidos: "Navegación",
      },
    });
    if (persona.id !== "00000000-0000-7000-8000-000000000078")
      throw new Error("La persona de prueba existe con otro identificador.");
    for (const conceder of [false, true]) {
      const email = `supervisor-nav-${conceder ? "concede" : "deniega"}@opai.cl`;
      const user = await tx.user.upsert({
        where: { email },
        update: {},
        create: { email, name: "Supervisor E2E", emailVerified: true },
      });
      const account = await tx.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });
      if (account) await tx.account.update({ where: { id: account.id }, data: { password: hash } });
      else
        await tx.account.create({
          data: { userId: user.id, providerId: "credential", accountId: user.id, password: hash },
        });
      const rol = await tx.rol.upsert({
        where: { tenantId_nombre: { tenantId: tenant.id, nombre: `Supervisor E2E ${conceder}` } },
        update: {
          permisos: ["core:personas.read", "core:documentos.read", "core:documentos.manage"],
        },
        create: {
          tenantId: tenant.id,
          nombre: `Supervisor E2E ${conceder}`,
          permisos: ["core:personas.read", "core:documentos.read", "core:documentos.manage"],
        },
      });
      const membership = await tx.membership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        update: { rol: "supervisor", roleId: rol.id, portales: ["supervisor"] },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          rol: "supervisor",
          roleId: rol.id,
          portales: ["supervisor"],
        },
      });
      await tx.permisoExcepcion.upsert({
        where: {
          membershipId_permiso: { membershipId: membership.id, permiso: "core:documentos.manage" },
        },
        update: { conceder },
        create: {
          tenantId: tenant.id,
          membershipId: membership.id,
          permiso: "core:documentos.manage",
          conceder,
        },
      });
    }
    for (const conceder of [false, true]) {
      const email = `nav-${conceder ? "concede" : "deniega"}@opai.cl`;
      const user = await tx.user.upsert({
        where: { email },
        update: {},
        create: { email, name: "Navegación E2E", emailVerified: true },
      });
      const account = await tx.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });
      if (account) await tx.account.update({ where: { id: account.id }, data: { password: hash } });
      else
        await tx.account.create({
          data: { userId: user.id, providerId: "credential", accountId: user.id, password: hash },
        });
      const rol = await tx.rol.upsert({
        where: { tenantId_nombre: { tenantId: tenant.id, nombre: `Navegación E2E ${conceder}` } },
        update: { permisos: conceder ? [] : ["core:personas.read"] },
        create: {
          tenantId: tenant.id,
          nombre: `Navegación E2E ${conceder}`,
          permisos: conceder ? [] : ["core:personas.read"],
        },
      });
      const membership = await tx.membership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        update: { rol: "viewer", roleId: rol.id, portales: ["erp"] },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          rol: "viewer",
          roleId: rol.id,
          portales: ["erp"],
        },
      });
      await tx.permisoExcepcion.upsert({
        where: {
          membershipId_permiso: { membershipId: membership.id, permiso: "core:personas.read" },
        },
        update: { conceder },
        create: {
          tenantId: tenant.id,
          membershipId: membership.id,
          permiso: "core:personas.read",
          conceder,
        },
      });
    }
  });
}
main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Error de fixture");
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
