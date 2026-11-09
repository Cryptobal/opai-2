// Siembra los casos de `asistencia-qa-casos.ts` en una empresa de QA (slug `qa-…`) por las capacidades reales:
// consentimiento, enrolamiento simulado y marcas por `asistencia.marcas.registrar`; luego recalcula los días.
import { randomBytes, randomUUID } from "node:crypto";

import { hashPin } from "@opai/db";
import type { dbAdmin } from "@opai/db";
import { digitoVerificador } from "@opai/domain";

import { crearContexto, executeCapability } from "../src";
import { CASOS_QA, type CasoQa, enSantiago } from "./asistencia-qa-casos";

type Admin = ReturnType<typeof dbAdmin>;
export const PIN_QA = "482915";
const medidor = { registrar: async () => undefined };
const MODULOS = ["asistencia", "pauta"];

export type Sembrado = { caso: CasoQa; personaId: string; puestoId: string; fecha: string };

const rutQa = (n: number) => {
  const cuerpo = String(77000000 + n);
  return { guion: `${cuerpo}-${digitoVerificador(cuerpo)}`, sinGuion: `${cuerpo}${digitoVerificador(cuerpo)}` };
};

async function ajuste(a: Admin, tenantId: string, clave: string, valor: unknown) {
  await a.ajuste.deleteMany({ where: { tenantId, modulo: "asistencia", clave } });
  await a.ajuste.create({ data: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "asistencia", clave, valor: valor as never } });
}

export async function sembrarCasos(a: Admin, tenantId: string): Promise<{ instalacionId: string; casos: Sembrado[] }> {
  const sistema = () => crearContexto({ tenantId, actor: { tipo: "system" }, portal: null, modulosActivos: MODULOS, medidor });
  const ejecutar = (id: string, input: unknown) => executeCapability(sistema(), id, input);
  // El recálculo de días es una acción de RR. HH.: se ejecuta como un usuario ficticio con rol owner.
  const rrhh = () => crearContexto({ tenantId, actor: { tipo: "user", id: randomUUID() }, usuario: { id: randomUUID(), nombre: "Seed QA", email: "seed-qa@opai.test", platformRole: null }, portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: MODULOS, medidor });
  const cuenta = await a.cuenta.create({ data: { tenantId, nombre: "Mandante QA", razonSocial: "Mandante QA SA", rut: "76000000-0" } });
  const inst = await a.instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre: "Planta QA (ficticia)", lat: -33.4, lng: -70.6 } });
  const cargo = await a.cargo.create({ data: { tenantId, nombre: "Guardia QA" } });
  const patron = await a.patronTurno.create({ data: { tenantId, nombre: "7x0 QA", diasTrabajo: 7, diasDescanso: 0 } });
  const equipo = await a.dispositivo.create({ data: { tenantId, instalacionId: inst.id, identificador: "QA-KIOSCO-1", tokenHash: randomBytes(16).toString("hex"), estado: "activo" } });
  await ajuste(a, tenantId, "marcas_habilitadas", true);
  await ajuste(a, tenantId, "rostro_habilitado", true);
  const pinHash = await hashPin(PIN_QA);
  const casos: Sembrado[] = [];
  const ahora = new Date();
  for (const [i, caso] of CASOS_QA.entries()) {
    const rut = rutQa(i + 1);
    const persona = await a.persona.create({ data: { tenantId, nombres: `QA Caso ${caso.id.slice(3)}`, apellidos: "Sintético", rut: rut.guion, estado: "activa" } });
    await a.vinculoLaboral.create({ data: { tenantId, personaId: persona.id, cargoId: cargo.id, instalacionId: inst.id, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
    await a.credencialTerreno.create({ data: { tenantId, personaId: persona.id, rut: rut.sinGuion, pinHash, debeCambiar: false } });
    const inicio = new Date(ahora.getTime() + caso.inicioMin * 60_000);
    const fin = new Date(inicio.getTime() + caso.duracionMin * 60_000);
    const [ini, term] = [enSantiago(inicio), enSantiago(fin)];
    const puesto = await a.puesto.create({ data: { tenantId, instalacionId: inst.id, cargoId: cargo.id, nombre: `${caso.id} · ${caso.titulo}`.slice(0, 80), diasTrabajo: 7, diasDescanso: 0, horaInicio: ini.hora, horaFin: term.hora } });
    const mes = new Date(`${ini.fecha.slice(0, 7)}-01T00:00:00Z`);
    await a.seriePauta.create({ data: { tenantId, puestoId: puesto.id, patronId: patron.id, inicioCiclo: mes, titularPersonaId: persona.id, vigenteDesde: mes } });
    await a.turnoEsperado.create({ data: { tenantId, personaId: persona.id, puestoId: puesto.id, fecha: new Date(`${ini.fecha}T00:00:00Z`), inicio, fin, instalacionId: inst.id, origen: "pauta", colacionMin: 0 } });
    const token = `rostro:qa-${caso.id.slice(3)}`;
    if (caso.metodo === "rostro") {
      const quien = { personaId: persona.id, dispositivoId: equipo.id, credencial: PIN_QA };
      for (const [cap, extra] of [["asistencia.rostro.consentir", { proposito: "biometria_asistencia" }], ["asistencia.rostro.enrolar", { muestra: token }]] as const) {
        const r = await ejecutar(cap, { ...quien, ...extra });
        if (!r.ok) throw new Error(`${caso.id} ${cap}: ${r.error.code}`);
      }
    }
    for (const _tipo of caso.marcas) {
      const clave = randomUUID();
      for (let k = 0; k < caso.intentos; k++) {
        const r = await ejecutar("asistencia.marcas.registrar", { personaId: persona.id, instalacionId: inst.id, dispositivoId: equipo.id, canal: "kiosco", claveDispositivo: clave, ...(caso.metodo === "rostro" ? { metodo: "rostro", muestra: token } : { metodo: "rut_pin", credencial: PIN_QA }) });
        if (!r.ok) throw new Error(`${caso.id} marca: ${r.error.code} ${r.error.message}`);
      }
    }
    const rec = await executeCapability(rrhh(), "asistencia.dias.recalcular", { personaId: persona.id, desde: ini.fecha, hasta: ini.fecha });
    if (!rec.ok) throw new Error(`${caso.id} recalcular: ${rec.error.code}`);
    casos.push({ caso, personaId: persona.id, puestoId: puesto.id, fecha: ini.fecha });
  }
  return { instalacionId: inst.id, casos };
}
