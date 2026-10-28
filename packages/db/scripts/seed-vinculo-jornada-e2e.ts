import { cerrarClientes, dbAdmin } from "../src/index";

async function main() {
  const url = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !/^\/opai_e2e(?:_[a-zA-Z0-9_]+)?$/.test(url.pathname) ||
    process.env["NODE_ENV"] === "production"
  )
    throw new Error("Solo e2e local.");
  const db = dbAdmin();
  const origen = await db.instalacion.findUniqueOrThrow({
    where: { id: "00000000-0000-7000-8000-000000000081" },
  });
  const { tenantId, cuentaId } = origen;
  const cargo = await db.cargo.findUniqueOrThrow({
    where: { tenantId_nombre: { tenantId, nombre: "Cargo navegación E2E" } },
  });
  const instalacion = await db.instalacion.upsert({
    where: { id: "00000000-0000-7000-8000-000000000085" },
    update: {},
    create: {
      id: "00000000-0000-7000-8000-000000000085",
      tenantId,
      cuentaId,
      nombre: "Destino vínculo E2E",
    },
  });
  const puesto = await db.puesto.upsert({
    where: { id: "00000000-0000-7000-8000-000000000086" },
    update: {},
    create: {
      id: "00000000-0000-7000-8000-000000000086",
      tenantId,
      instalacionId: instalacion.id,
      cargoId: cargo.id,
      nombre: "Noche vínculo E2E",
      diasTrabajo: 4,
      diasDescanso: 4,
      horaInicio: "20:00",
      horaFin: "08:00",
    },
  });
  for (const [id, ref] of [
    [
      "00000000-0000-7000-8000-000000000087",
      { nivel: "instalacion", instalacionId: origen.id, sueldoBase: 600000 },
    ],
    [
      "00000000-0000-7000-8000-000000000088",
      { nivel: "puesto", puestoId: puesto.id, sueldoBase: 700000 },
    ],
  ] as const)
    await db.estructuraSueldo.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId,
        ...ref,
        colacion: 0,
        movilizacion: 0,
        gratificacion: "ninguna",
        vigenteDesde: new Date("2026-01-01"),
      },
    });
}
main()
  .catch(() => {
    console.error("Falló la fixture del vínculo.");
    process.exitCode = 1;
  })
  .finally(cerrarClientes);
