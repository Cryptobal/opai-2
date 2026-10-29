import { sembrarAlcanceNav } from "./seed-nav-alcance-e2e";
// Fixture exclusiva de la base local E2E: usuarios con concesión y denegación explícitas.
import { hashPassword } from "better-auth/crypto";
import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";
import { usuarioE2E } from "./usuario-e2e";
// Las tablas de tenant tienen FORCE RLS: se escribe con `enTransaccion(tenantId)`, nunca con el dueño a secas.

async function main() {
  exigirBaseE2E();
  const password = process.env["E2E_PASSWORD"];
  if (!password) throw new Error("Falta E2E_PASSWORD");
  const hash = await hashPassword(password);
  const tenant = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenant.id, async (tx) => {
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
      const user = await usuarioE2E(email, "Supervisor E2E", hash);
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
      await sembrarAlcanceNav(tx, tenant.id, membership.id);
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
      const user = await usuarioE2E(email, "Navegación E2E", hash);
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
