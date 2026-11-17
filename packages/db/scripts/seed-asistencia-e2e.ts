// Fixture de Asistencia para e2e de CI (CAR-599): módulo activo, turno de hoy, kiosco emparejado y trabajador con PIN.
import "dotenv/config";

import { cerrarClientes, dbAdmin, enTransaccion, hashPin, hmacDispositivo, type TenantTx } from "../src/index";
import { ASISTENCIA_E2E } from "./asistencia-e2e-fixture";
import { exigirBaseE2E } from "./exigir-base-e2e";
import { activarModulos } from "./rondas-e2e";

const HOY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
const MES = () => `${HOY().slice(0, 7)}-01`;

async function sembrar(db: TenantTx, tenantId: string) {
  await activarModulos(db, tenantId, ["asistencia", "pauta"]);
  await db.ajuste.upsert({
    where: { tenantId_ambito_sujetoId_modulo_clave: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "asistencia", clave: "marcas_habilitadas" } },
    update: { valor: true },
    create: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "asistencia", clave: "marcas_habilitadas", valor: true },
  });
  const patron = await db.patronTurno.upsert({
    where: { id: ASISTENCIA_E2E.patron },
    update: {},
    create: { id: ASISTENCIA_E2E.patron, tenantId, nombre: "4×4 Asistencia E2E", diasTrabajo: 4, diasDescanso: 4 },
  });
  const mes = new Date(`${MES()}T00:00:00Z`);
  await db.seriePauta.upsert({
    where: { id: ASISTENCIA_E2E.serie },
    update: { titularPersonaId: ASISTENCIA_E2E.ana, vigenteDesde: mes, vigenteHasta: null },
    create: {
      id: ASISTENCIA_E2E.serie, tenantId, puestoId: ASISTENCIA_E2E.puestoDia, patronId: patron.id,
      inicioCiclo: mes, titularPersonaId: ASISTENCIA_E2E.ana, vigenteDesde: mes,
    },
  });
  const hoy = HOY();
  const inicio = new Date(`${hoy}T11:00:00.000Z`);
  const fin = new Date(`${hoy}T23:00:00.000Z`);
  const turnoId = "00000000-0000-7000-8000-0000000b00d2";
  await db.turnoEsperado.upsert({
    where: { id: turnoId },
    update: { vigente: true, inicio, fin, instalacionId: ASISTENCIA_E2E.instalacion, puestoId: ASISTENCIA_E2E.puestoDia },
    create: {
      id: turnoId, tenantId, personaId: ASISTENCIA_E2E.ana, puestoId: ASISTENCIA_E2E.puestoDia,
      fecha: new Date(`${hoy}T00:00:00Z`), inicio, fin, instalacionId: ASISTENCIA_E2E.instalacion, origen: "pauta", colacionMin: 0, vigente: true,
    },
  });
  const pinHash = await hashPin(ASISTENCIA_E2E.pin);
  await db.credencialTerreno.upsert({
    where: { personaId: ASISTENCIA_E2E.ana },
    update: { pinHash, debeCambiar: false, telefonoPersonalHabilitado: true },
    create: {
      tenantId, personaId: ASISTENCIA_E2E.ana, rut: "700000010", pinHash, debeCambiar: false, telefonoPersonalHabilitado: true,
    },
  });
  await db.dispositivo.upsert({
    where: { id: ASISTENCIA_E2E.dispositivo },
    update: { estado: "activo", tokenHash: hmacDispositivo(ASISTENCIA_E2E.tokenDispositivo), instalacionId: ASISTENCIA_E2E.instalacion },
    create: {
      id: ASISTENCIA_E2E.dispositivo, tenantId, instalacionId: ASISTENCIA_E2E.instalacion,
      identificador: "KIOSCO-ASISTENCIA-E2E", tokenHash: hmacDispositivo(ASISTENCIA_E2E.tokenDispositivo),
    },
  });
  await db.ajuste.upsert({
    where: { tenantId_ambito_sujetoId_modulo_clave: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "asistencia", clave: "telefono_personal_permitido" } },
    update: { valor: true },
    create: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "asistencia", clave: "telefono_personal_permitido", valor: true },
  });
  await db.ajuste.upsert({
    where: { tenantId_ambito_sujetoId_modulo_clave: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "asistencia", clave: "canales_por_instalacion" } },
    update: { valor: { [ASISTENCIA_E2E.instalacion]: ["kiosco", "telefono_personal"] } },
    create: {
      tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "asistencia", clave: "canales_por_instalacion",
      valor: { [ASISTENCIA_E2E.instalacion]: ["kiosco", "telefono_personal"] },
    },
  });
  const consentimiento = await db.consentimiento.findFirst({
    where: { tenantId, titularId: ASISTENCIA_E2E.ana, proposito: "telefono_personal_asistencia", estado: "otorgado" },
  });
  if (!consentimiento) {
    await db.consentimiento.create({
      data: {
        tenantId, titularTipo: "persona", titularId: ASISTENCIA_E2E.ana, proposito: "telefono_personal_asistencia",
        versionAviso: "e2e", estado: "otorgado", origen: "interno",
      },
    });
  }
}

async function main() {
  exigirBaseE2E();
  const { id: tenantId } = await dbAdmin().tenant.findUniqueOrThrow({ where: { slug: "gard" } });
  await enTransaccion(tenantId, (db) => sembrar(db, tenantId));
  await cerrarClientes();
  console.log(`Fixture de Asistencia E2E listo (${HOY()}, turno Ana, kiosco y trabajador ${ASISTENCIA_E2E.trabajadorEmail}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});