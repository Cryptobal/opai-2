import type { Prisma } from "@opai/db";

/** Solo lo invoca la fixture de navegación después de verificar que la base es opai_e2e local. */
export async function sembrarAlcanceNav(tx: Prisma.TransactionClient, tenantId: string, membershipId: string) {
  const cuenta = await tx.cuenta.upsert({
    where: { id: "00000000-0000-7000-8000-000000000080" },
    update: {},
    create: {
      id: "00000000-0000-7000-8000-000000000080",
      tenantId,
      nombre: "Cuenta navegación E2E",
    },
  });
  const inst = await tx.instalacion.upsert({
    where: { id: "00000000-0000-7000-8000-000000000081" },
    update: {},
    create: {
      id: "00000000-0000-7000-8000-000000000081",
      tenantId,
      cuentaId: cuenta.id,
      nombre: "Instalación navegación E2E",
    },
  });
  const cargo = await tx.cargo.upsert({
    where: { tenantId_nombre: { tenantId, nombre: "Cargo navegación E2E" } },
    update: {},
    create: { tenantId, nombre: "Cargo navegación E2E" },
  });
  const persona = await tx.persona.upsert({
    where: { id: "00000000-0000-7000-8000-000000000082" },
    update: {},
    create: {
      id: "00000000-0000-7000-8000-000000000082",
      tenantId,
      nombres: "Persona",
      apellidos: "En alcance",
      rut: "22222222-2",
    },
  });
  await tx.vinculoLaboral.upsert({
    where: { id: "00000000-0000-7000-8000-000000000083" },
    update: { estado: "vigente", instalacionId: inst.id, puestoId: null },
    create: {
      id: "00000000-0000-7000-8000-000000000083",
      tenantId,
      personaId: persona.id,
      cargoId: cargo.id,
      instalacionId: inst.id,
      horasSemanales: 40,
      distribucion: "Lunes a viernes",
      tipo: "indefinido",
      inicio: new Date("2026-01-01"),
    },
  });
  await tx.supervisorInstalacion.upsert({
    where: { membershipId_instalacionId: { membershipId, instalacionId: inst.id } },
    update: {},
    create: { tenantId, membershipId, instalacionId: inst.id },
  });
}
