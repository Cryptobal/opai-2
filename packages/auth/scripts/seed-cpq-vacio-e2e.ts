// Tenant CPQ «vacío» para e2e CAR-162: sin valores legales publicados, mutual sin confirmar ni sueldos.
import { hashPassword } from "better-auth/crypto";
import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";

import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";
import { sembrarComercial } from "../../db/scripts/catalogo-tenant";
import { usuarioE2E } from "./usuario-e2e";

const SLUG = "cpq-vacio-e2e";
const NEGOCIO_ID = "00000000-0000-7000-8000-000000001399";

async function main() {
  exigirBaseE2E();
  const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta contraseña E2E");
  const hash = await hashPassword(password);
  const db = dbAdmin();
  const tenant = await db.tenant.upsert({
    where: { slug: SLUG },
    update: {},
    create: { slug: SLUG, nombre: "CPQ vacío E2E", vertical: "seguridad" },
  });
  for (const moduloId of ["comercial", "cpq"]) {
    await db.tenantModule.upsert({
      where: { tenantId_moduloId: { tenantId: tenant.id, moduloId } },
      update: { estado: "activo" },
      create: { tenantId: tenant.id, moduloId, estado: "activo" },
    });
  }
  await sembrarComercial(db.$extends({}), tenant.id);
  await enTransaccion(tenant.id, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(132199)`;
    const user = await usuarioE2E("cpq-vacio@example.test", "CPQ vacío E2E", hash);
    const permisos = [
      "comercial:negocios.read",
      "comercial:negocios.manage",
      "core:cuentas.read",
      "cpq:cotizaciones.read",
      "cpq:cotizaciones.manage",
      "cpq:costos.ver",
    ];
    const rol = await tx.rol.upsert({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: "CPQ vacío gestor" } },
      create: { tenantId: tenant.id, nombre: "CPQ vacío gestor", permisos },
      update: { permisos },
    });
    await tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        rol: "admin",
        roleId: rol.id,
        portales: ["erp"],
      },
      update: { roleId: rol.id, portales: ["erp"] },
    });
    const cuenta = await tx.cuenta.upsert({
      where: { id: "00000000-0000-7000-8000-000000001398" },
      create: {
        id: "00000000-0000-7000-8000-000000001398",
        tenantId: tenant.id,
        nombre: "Cuenta CPQ vacío",
      },
      update: {},
    });
    const etapa = await tx.etapa.findFirstOrThrow({ where: { tenantId: tenant.id, tipo: "abierta", activa: true } });
    await tx.negocio.upsert({
      where: { id: NEGOCIO_ID },
      update: {},
      create: {
        id: NEGOCIO_ID,
        tenantId: tenant.id,
        cuentaId: cuenta.id,
        embudoId: etapa.embudoId,
        etapaId: etapa.id,
        titulo: "Negocio CPQ vacío",
      },
    });
    await tx.remuneracionesPerfil.deleteMany({ where: { tenantId: tenant.id } });
  });
  console.log(`${SLUG} listo · cpq-vacio@example.test · negocio ${NEGOCIO_ID}`);
}

main()
  .catch(() => {
    console.error("No se pudo preparar la fixture CPQ vacío");
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
