// Fixture exclusiva de la base local E2E (CAR-38): el supervisor del proyecto de Playwright, sin
// instalaciones a cargo, y una instalación para asignarle. Cada corrida parte del alcance vacío.
import { hashPassword } from "better-auth/crypto";
import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";
import { usuarioE2E } from "./usuario-e2e";

// Solo el proyecto que corre (E2E_PROYECTO): limpiar a los otros rompería su prueba en paralelo.
const PROYECTOS = ["telefono", "ipad", "desktop"];
const CUENTA = "00000000-0000-7000-8000-000000000090";
const INSTALACION = "00000000-0000-7000-8000-000000000091";

async function main() {
  exigirBaseE2E();
  const password = process.env["E2E_PASSWORD"];
  if (!password) throw new Error("Falta E2E_PASSWORD");
  const proyecto = process.env["E2E_PROYECTO"] ?? "";
  if (!PROYECTOS.includes(proyecto))
    throw new Error("Falta E2E_PROYECTO (telefono, ipad o desktop)");
  const hash = await hashPassword(password);
  const tenant = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  // Las tablas de tenant tienen FORCE RLS: se escribe con `enTransaccion(tenantId)`.
  await enTransaccion(tenant.id, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70138)`;
    await tx.cuenta.upsert({
      where: { id: CUENTA },
      update: {},
      create: { id: CUENTA, tenantId: tenant.id, nombre: "Cuenta asignable E2E" },
    });
    await tx.instalacion.upsert({
      where: { id: INSTALACION },
      update: { estado: "activa", archivadaEn: null },
      create: {
        id: INSTALACION,
        tenantId: tenant.id,
        cuentaId: CUENTA,
        nombre: "Instalación asignable E2E",
        // Activa: el portal Supervisor lista solo instalaciones activas (por defecto nace «prospecto»).
        estado: "activa",
      },
    });
    {
      const email = `supervisor-asignar-${proyecto}@opai.cl`;
      const user = await usuarioE2E(email, `Supervisor asignable ${proyecto}`, hash);
      const membership = await tx.membership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        update: { rol: "supervisor", roleId: null, portales: ["supervisor"], estado: "activa" },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          rol: "supervisor",
          portales: ["supervisor"],
        },
      });
      await tx.supervisorInstalacion.deleteMany({ where: { membershipId: membership.id } });
    }
  });
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
