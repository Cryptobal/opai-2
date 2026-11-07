import { cerrarClientes, dbAdmin, enTransaccion, type TenantTx } from "../src/index";
import { exigirBaseE2E } from "./exigir-base-e2e";

// Fixture de Pauta (CAR-81) para el e2e: una instalación ficticia con dos puestos (día y noche) y dos
// personas con vínculo vigente. Idempotente: deja los puestos sin serie ni excepciones para que el
// flujo arranque limpio (el historial es append-only y se conserva).
export const PAUTA_E2E = {
  instalacion: "00000000-0000-7000-8000-0000000b0001",
  puestoDia: "00000000-0000-7000-8000-0000000b0002",
  puestoNoche: "00000000-0000-7000-8000-0000000b0003",
  ana: "00000000-0000-7000-8000-0000000b0004",
  luis: "00000000-0000-7000-8000-0000000b0005",
  /** CAR-206: instalación y guardia para el e2e de «Asignar titular» (los puestos los crea el propio e2e). */
  instalacionTitular: "00000000-0000-7000-8000-0000000b0020",
  titular: "00000000-0000-7000-8000-0000000b0021",
} as const;

async function main() {
  exigirBaseE2E();
  const { id: tenantId } = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenantId, (db) => sembrar(db, tenantId));
  await cerrarClientes();
  console.log("Fixture de Pauta listo.");
}

async function sembrar(db: TenantTx, tenantId: string) {
  // El módulo Pauta se activa en la empresa de pruebas (navegación y capacidades).
  await db.tenantModule.upsert({
    where: { tenantId_moduloId: { tenantId, moduloId: "pauta" } },
    update: { estado: "activo" },
    create: { tenantId, moduloId: "pauta", estado: "activo" },
  });
  const cuenta = await db.cuenta.upsert({
    where: { id: "00000000-0000-7000-8000-0000000b0010" },
    update: {},
    create: { id: "00000000-0000-7000-8000-0000000b0010", tenantId, nombre: "Atlas Seguridad SpA (Pauta E2E)" },
  });
  const cargo = await db.cargo.upsert({
    where: { tenantId_nombre: { tenantId, nombre: "Guardia Pauta E2E" } },
    update: {},
    create: { tenantId, nombre: "Guardia Pauta E2E" },
  });
  await db.instalacion.upsert({
    where: { id: PAUTA_E2E.instalacion },
    update: {},
    create: { id: PAUTA_E2E.instalacion, tenantId, cuentaId: cuenta.id, nombre: "Planta Pauta E2E" },
  });
  const puesto = (id: string, nombre: string, horaInicio: string, horaFin: string) =>
    db.puesto.upsert({
      where: { id },
      update: {},
      create: {
        id, tenantId, instalacionId: PAUTA_E2E.instalacion, cargoId: cargo.id, nombre,
        diasTrabajo: 4, diasDescanso: 4, horaInicio, horaFin,
      },
    });
  await puesto(PAUTA_E2E.puestoDia, "Portería Día", "08:00", "20:00");
  await puesto(PAUTA_E2E.puestoNoche, "Portería Noche", "20:00", "08:00");
  const persona = async (id: string, nombres: string, apellidos: string, rut: string) => {
    await db.persona.upsert({
      where: { id },
      update: {},
      create: { id, tenantId, nombres, apellidos, rut, estado: "activa" },
    });
    await db.vinculoLaboral.upsert({
      where: { id: id.replace("0000000b00", "0000000b01") },
      update: { estado: "vigente", termino: null },
      create: {
        id: id.replace("0000000b00", "0000000b01"), tenantId, personaId: id, cargoId: cargo.id,
        instalacionId: PAUTA_E2E.instalacion, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente",
      },
    });
  };
  await persona(PAUTA_E2E.ana, "Ana", "Pauta E2E", "70.000.001-0");
  await persona(PAUTA_E2E.luis, "Luis", "Pauta E2E", "70.000.002-9");
  // CAR-206: segunda instalación con un guardia vinculado y un patrón 4×4 activo, sin puestos sembrados.
  await db.instalacion.upsert({
    where: { id: PAUTA_E2E.instalacionTitular },
    update: {},
    create: { id: PAUTA_E2E.instalacionTitular, tenantId, cuentaId: cuenta.id, nombre: "Planta Titular E2E" },
  });
  const guardia = PAUTA_E2E.titular;
  await db.persona.upsert({
    where: { id: guardia },
    update: {},
    create: { id: guardia, tenantId, nombres: "Titular", apellidos: "E2E", rut: "70.000.003-7", estado: "activa" },
  });
  const vinculoTitular = guardia.replace("0000000b00", "0000000b01");
  await db.vinculoLaboral.upsert({
    where: { id: vinculoTitular },
    update: { estado: "vigente", termino: null, puestoId: null },
    create: {
      id: vinculoTitular, tenantId, personaId: guardia, cargoId: cargo.id,
      instalacionId: PAUTA_E2E.instalacionTitular, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente",
    },
  });
  const puestos = { in: [PAUTA_E2E.puestoDia, PAUTA_E2E.puestoNoche] };
  await db.excepcionPauta.deleteMany({ where: { puestoId: puestos } });
  await db.seriePauta.deleteMany({ where: { puestoId: puestos } });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
