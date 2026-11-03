// Solo fixtures ficticias en opai_e2e local. No aplica migraciones ni modifica permisos del catálogo.
import { hashPassword } from "better-auth/crypto";
import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";

import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";
import { usuarioE2E } from "./usuario-e2e";

async function main() {
  exigirBaseE2E();
  const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta contraseña E2E");
  const hash = await hashPassword(password);
  const tenant = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenant.id, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(132102)`;
    // «costos»: gestor con cpq:costos.ver, para ingresar sueldos (e2e de tenant vacío, CAR-162).
    for (const tipo of ["gestor", "lector", "sin-lectura", "costos"]) {
      const user = await usuarioE2E(`cpq-${tipo}@example.test`, `CPQ E2E ${tipo}`, hash);
      const permisos = [
        "comercial:negocios.read",
        "core:cuentas.read",
        ...(tipo !== "sin-lectura" ? ["cpq:cotizaciones.read"] : []),
        ...(tipo === "gestor" || tipo === "costos" ? ["cpq:cotizaciones.manage"] : []),
        ...(tipo === "costos" ? ["cpq:costos.ver"] : []),
      ];
      const rol = await tx.rol.upsert({
        where: { tenantId_nombre: { tenantId: tenant.id, nombre: `CPQ E2E ${tipo}` } },
        create: { tenantId: tenant.id, nombre: `CPQ E2E ${tipo}`, permisos },
        update: { permisos },
      });
      await tx.membership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          rol: "viewer",
          roleId: rol.id,
          portales: ["erp"],
        },
        update: { roleId: rol.id, portales: ["erp"] },
      });
    }
    const cuenta = await tx.cuenta.upsert({
      where: { id: "00000000-0000-7000-8000-000000001320" },
      create: {
        id: "00000000-0000-7000-8000-000000001320",
        tenantId: tenant.id,
        nombre: "Cuenta ficticia CPQ",
      },
      update: {},
    });
    const etapa = await tx.etapa.findFirstOrThrow({ where: { tipo: "abierta", activa: true } });
    for (const numero of [1, 2, 3]) {
      const id = `00000000-0000-7000-8000-00000000132${numero}`;
      await tx.negocio.upsert({
        where: { id },
        update: {},
        create: {
          id,
          tenantId: tenant.id,
          cuentaId: cuenta.id,
          embudoId: etapa.embudoId,
          etapaId: etapa.id,
          titulo: `Negocio ficticio CPQ ${numero}`,
        },
      });
    }
  });
}
main()
  .catch(() => {
    console.error("No se pudo preparar la fixture CPQ local");
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
