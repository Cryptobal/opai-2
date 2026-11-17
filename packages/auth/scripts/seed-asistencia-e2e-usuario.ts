// Usuario trabajador del circuito de Asistencia e2e (CAR-599). Identidad con dbAdmin (CAR-43).
import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { ASISTENCIA_E2E } from "../../db/scripts/asistencia-e2e-fixture";
import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";

import { usuarioE2E } from "./usuario-e2e";

async function main() {
  exigirBaseE2E();
  const password = process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta SEED_OWNER_PASSWORD (la fija el workflow de e2e).");
  const hash = await hashPassword(password);
  const { id: tenantId } = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  const user = await usuarioE2E(ASISTENCIA_E2E.trabajadorEmail, "Ana Circuito E2E", hash);
  const supervisor = await usuarioE2E(ASISTENCIA_E2E.supervisorEmail, "Supervisor Asistencia E2E", hash);
  await enTransaccion(tenantId, async (db) => {
    await db.membership.upsert({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      update: { rol: "viewer", portales: ["trabajador"], estado: "activa" },
      create: { tenantId, userId: user.id, rol: "viewer", portales: ["trabajador"], estado: "activa" },
    });
    await db.persona.update({
      where: { id: ASISTENCIA_E2E.ana },
      data: { usuarioId: user.id, emailLaboral: ASISTENCIA_E2E.trabajadorEmail },
    });
    const membSup = await db.membership.upsert({
      where: { tenantId_userId: { tenantId, userId: supervisor.id } },
      update: { rol: "supervisor", portales: ["supervisor"], estado: "activa" },
      create: { tenantId, userId: supervisor.id, rol: "supervisor", portales: ["supervisor"], estado: "activa" },
    });
    await db.supervisorInstalacion.upsert({
      where: { membershipId_instalacionId: { membershipId: membSup.id, instalacionId: ASISTENCIA_E2E.instalacion } },
      update: {},
      create: { tenantId, membershipId: membSup.id, instalacionId: ASISTENCIA_E2E.instalacion },
    });
  });
  await cerrarClientes();
  console.log(`Usuario de circuito Asistencia listo (${ASISTENCIA_E2E.trabajadorEmail}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});