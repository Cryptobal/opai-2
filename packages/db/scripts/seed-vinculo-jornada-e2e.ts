import { cerrarClientes, dbAdmin, enTransaccion, type TenantTx } from "../src/index";
import { exigirBaseE2E } from "./exigir-base-e2e";

const PERSONA_ID = "00000000-0000-7000-8000-000000000082";

async function main() {
  exigirBaseE2E();
  // FORCE RLS: el tenant se fija con `enTransaccion`; `tenants` no tiene RLS y da el id.
  const { id: tenantId } = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenantId, (db) => sembrar(db, tenantId));
}

async function sembrar(db: TenantTx, tenantId: string) {
  const origen = await db.instalacion.findUniqueOrThrow({
    where: { id: "00000000-0000-7000-8000-000000000081" },
  });
  const { cuentaId } = origen;
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
  // El anexo sembrado (`seed-anexo-e2e.ts`) propone este destino para la persona 082: el vínculo
  // real (083) no se toca (lo resetea `seed-nav-alcance-e2e.ts` para otras specs), pero el destino
  // queda legítimo porque perteneció a un vínculo —aquí, anterior— de la misma persona (core.anexos
  // valida contra todos los vínculos de la persona, vigentes o terminados).
  await db.vinculoLaboral.upsert({
    where: { id: "00000000-0000-7000-8000-000000000089" },
    update: { instalacionId: instalacion.id, puestoId: puesto.id, estado: "terminado" },
    create: {
      id: "00000000-0000-7000-8000-000000000089",
      tenantId,
      personaId: PERSONA_ID,
      cargoId: cargo.id,
      instalacionId: instalacion.id,
      puestoId: puesto.id,
      horasSemanales: 40,
      distribucion: "Lunes a viernes",
      tipo: "indefinido",
      inicio: new Date("2025-06-01"),
      termino: new Date("2025-12-31"),
      motivoTermino: "Vínculo previo sembrado para el anexo de cambio de instalación (e2e)",
      estado: "terminado",
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
