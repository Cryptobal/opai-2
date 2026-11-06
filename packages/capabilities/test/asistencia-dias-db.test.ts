// CAR-89 · A3 (Postgres real): día consolidado con marcas efectivas, correcciones, tipo de jornada, resumen del período
// para Nómina, «Asistencia de hoy» y aislamiento entre dos empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/asistencia/manifest";
import { PIN_SIMULADO } from "../../../modules/asistencia/capabilities";
import { trabajoRecalcularDias } from "../../../modules/asistencia/capabilities/dias";
import { createHash } from "node:crypto";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Dato = {
  marca: { id: string }; id: string; correccionId: string; dias: number; tipoJornada: string; fecha: string;
  resumen: { turnos: number; presentes: number; sinMarca: number; ausentes: number; incompletos: number; atrasos: number };
  items: { estado: string; segundosAtraso?: number; atrasoMin?: number; presentes?: number; provisorio?: boolean; correccionPendiente?: boolean; tipoJornada?: string; minutosTrabajados?: number; personaId: string }[];
};
type Res = { ok: boolean; data: Dato; error?: { code: string; message: string } };
const RUT = "11.111.111-1";
const hoyLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

describe.skipIf(!urlPropietario)("Asistencia · día consolidado y «hoy» (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const T = { a: "", b: "", inst: "", persona: "" };
  const fecha = hoyLocal();
  const inicio = new Date(Date.now() - 2 * 3_600_000);

  const ctx = (tenantId: string, portal = "erp") => {
    const id = randomUUID();
    return mod.crearContexto({ tenantId, actor: { tipo: "user", id }, usuario: { id, nombre: "Rrhh", email: "rrhh@empresa.cl", platformRole: null }, portal, portalesMembresia: [portal], rol: "owner", modulosActivos: ["asistencia"], medidor });
  };
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown) => mod.executeCapability(c, id, input) as Promise<Res>;
  const sistema = (tenantId: string) => mod.crearContexto({ tenantId, actor: { tipo: "system" }, portal: null, modulosActivos: ["asistencia"], medidor });
  const marcar = (tenant: string) => run(ctx(tenant, "terreno"), "asistencia.marcas.registrar", { personaId: T.persona, instalacionId: T.inst, metodo: "rut_pin", credencial: PIN_SIMULADO, claveDispositivo: randomUUID() });
  const recalcular = () => run(ctx(T.a), "asistencia.dias.recalcular", { personaId: T.persona, desde: fecha, hasta: fecha });
  const dia = () => e.admin.dia.findFirstOrThrow({ where: { tenantId: T.a, personaId: T.persona } });

  async function empresa(slug: string) {
    const tenant = (await e.admin.tenant.create({ data: { slug: `qa-${slug}-${randomUUID().slice(0, 6)}`, nombre: `Empresa ${slug}`, vertical: "seguridad" } })).id;
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: tenant, nombre: "Mandante SA", razonSocial: "Mandante SA", rut: "76111111-1" } })).id;
    const inst = (await e.admin.instalacion.create({ data: { tenantId: tenant, cuentaId: cuenta, nombre: "Planta Norte" } })).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
    const persona = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Pía", apellidos: "Prueba", rut: RUT, estado: "activa" } })).id;
    await e.admin.vinculoLaboral.create({ data: { tenantId: tenant, personaId: persona, cargoId: cargo, instalacionId: inst, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
    await e.admin.ajuste.create({ data: { tenantId: tenant, ambito: "tenant", sujetoId: tenant, modulo: "asistencia", clave: "marcas_habilitadas", valor: true } });
    return { tenant, inst, persona };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro(); mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const a = await empresa("a"); T.a = a.tenant; T.inst = a.inst; T.persona = a.persona;
    T.b = (await empresa("b")).tenant;
    await e.admin.turnoEsperado.create({ data: { tenantId: T.a, personaId: T.persona, fecha: new Date(`${fecha}T00:00:00Z`), inicio, fin: new Date(inicio.getTime() + 8 * 3_600_000), instalacionId: T.inst, origen: "pauta", colacionMin: 0 } });
  });
  afterAll(async () => { await e?.cerrar(); });

  it("«hoy»: antes de marcar, el turno sale sin marca; con la entrada, incompleto con su atraso al segundo", async () => {
    const antes = await run(ctx(T.a), "asistencia.dias.hoy", {});
    expect(antes.ok, JSON.stringify(antes)).toBe(true);
    expect(antes.data.items[0]).toMatchObject({ estado: "sin_marca" });
    await marcar(T.a);
    const d = await recalcular();
    expect(d.ok, JSON.stringify(d)).toBe(true);
    const fila = await dia();
    expect(fila.estado).toBe("incompleto");
    expect(fila.segundosAtraso).toBeGreaterThanOrEqual(7195);
    expect(fila.segundosAtraso).toBeLessThanOrEqual(7260);
    const hoy = await run(ctx(T.a), "asistencia.dias.hoy", {});
    expect(hoy.data.resumen).toMatchObject({ turnos: 1, incompletos: 1, atrasos: 1 });
  });

  it("con la salida el día queda presente y el recálculo es idempotente", async () => {
    await marcar(T.a);
    await recalcular();
    const uno = await dia();
    await recalcular();
    const dos = await dia();
    expect(uno.estado).toBe("presente");
    expect(dos).toMatchObject({ id: uno.id, estado: "presente", segundosAtraso: uno.segundosAtraso });
    expect(await e.admin.dia.count({ where: { tenantId: T.a, personaId: T.persona } })).toBe(1);
  });

  it("una corrección aceptada cambia el día; pendiente lo marca provisorio y sigue con el original", async () => {
    const marcaEntrada = await e.admin.marca.findFirstOrThrow({ where: { tenantId: T.a, personaId: T.persona, tipo: "entrada" } });
    const doc = (await e.admin.documento.create({ data: { tenantId: T.a, nombre: "ev.pdf", mime: "application/pdf", tamano: 5, storageKey: `qa/${randomUUID()}`, creadoPorTipo: "user" } })).id;
    const r = await run(ctx(T.a), "asistencia.correcciones.proponer", { marcaId: marcaEntrada.id, horaPropuesta: inicio.toISOString(), tipoPropuesto: "entrada", motivo: "El reloj del equipo estaba atrasado", evidenciaDocumentoId: doc });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const original = (await dia()).segundosAtraso;
    await recalcular();
    expect(await dia()).toMatchObject({ correccionPendiente: true, segundosAtraso: original });
    const prov = await run(ctx(T.a), "asistencia.dias.resumen_periodo", { desde: fecha, hasta: fecha });
    expect(prov.data.items[0]).toMatchObject({ provisorio: true, presentes: 1 });
    const token = randomUUID().replace(/-/g, "");
    await e.admin.correccionEnlace.create({ data: { tenantId: T.a, correccionId: r.data.correccionId, tokenHash: createHash("sha256").update(token).digest("hex"), venceEn: new Date(Date.now() + 86_400_000) } });
    const ok = await run(sistema(T.a), "asistencia.correcciones.responder_enlace", { token, rut: RUT, resultado: "aceptada" });
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
    await recalcular();
    expect(await dia()).toMatchObject({ correccionPendiente: false, segundosAtraso: 0 });
    const def = await run(ctx(T.a), "asistencia.dias.resumen_periodo", { desde: fecha, hasta: fecha });
    expect(def.data.items[0]).toMatchObject({ provisorio: false, segundosAtraso: 0 });
  });

  it("el tipo de jornada (teletrabajo) queda en el vínculo y en el día", async () => {
    const r = await run(ctx(T.a), "asistencia.jornadas.fijar_tipo", { personaId: T.persona, tipoJornada: "teletrabajo" });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    await recalcular();
    expect((await dia()).tipoJornada).toBe("teletrabajo");
    const mal = await run(ctx(T.a), "asistencia.jornadas.fijar_tipo", { personaId: T.persona, tipoJornada: "inventada" });
    expect(mal.ok).toBe(false);
  });

  it("un recálculo histórico usa el tipo de jornada del vínculo de esa fecha, no el de hoy", async () => {
    const cargoId = (await e.admin.cargo.findFirstOrThrow({ where: { tenantId: T.a } })).id;
    await e.admin.vinculoLaboral.create({ data: { tenantId: T.a, personaId: T.persona, cargoId, tipo: "plazo_fijo", inicio: new Date("2024-01-01"), termino: new Date("2024-12-31"), estado: "terminado", tipoJornada: "parcial" } });
    const r = await run(ctx(T.a), "asistencia.dias.recalcular", { personaId: T.persona, desde: "2024-06-03", hasta: "2024-06-03" });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const antiguo = await e.admin.dia.findFirstOrThrow({ where: { tenantId: T.a, personaId: T.persona, fecha: new Date("2024-06-03T00:00:00Z") } });
    expect(antiguo.tipoJornada).toBe("parcial");
    expect((await dia()).tipoJornada).toBe("teletrabajo");
  });

  it("una contingencia aceptada días después cuenta en la hora que se declaró", async () => {
    const ayer = new Date(Date.now() - 36 * 3_600_000);
    const fechaAyer = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(ayer);
    const doc = (await e.admin.documento.create({ data: { tenantId: T.a, nombre: "ev.pdf", mime: "application/pdf", tamano: 5, storageKey: `qa/${randomUUID()}`, creadoPorTipo: "user" } })).id;
    const reg = await run(ctx(T.a), "asistencia.contingencias.registrar", { personaId: T.persona, instalacionId: T.inst, tipo: "entrada", horaDeclarada: ayer.toISOString(), motivo: "Caída del sistema durante el turno", evidenciaDocumentoId: doc });
    expect(reg.ok, JSON.stringify(reg)).toBe(true);
    const u = await e.admin.user.create({ data: { name: "Pía", email: `pia-${randomUUID().slice(0, 8)}@prueba.cl` } });
    await e.admin.membership.create({ data: { tenantId: T.a, userId: u.id, rol: "viewer", portales: ["trabajador"], estado: "activa" } });
    await e.admin.persona.update({ where: { id: T.persona }, data: { usuarioId: u.id } });
    const trabajador = mod.crearContexto({ tenantId: T.a, actor: { tipo: "user", id: u.id }, portal: "trabajador", portalesMembresia: ["trabajador"], rol: "viewer", modulosActivos: ["asistencia"], medidor });
    const ok = (await mod.executeCapability(trabajador, "asistencia.contingencias.responder", { contingenciaId: reg.data.id, decision: "aceptada" })) as Res;
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
    const r = await run(ctx(T.a), "asistencia.dias.recalcular", { personaId: T.persona, desde: fechaAyer, hasta: fechaAyer });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const ayerFila = await e.admin.dia.findFirstOrThrow({ where: { tenantId: T.a, personaId: T.persona, fecha: new Date(`${fechaAyer}T00:00:00Z`) } });
    expect(ayerFila.entrada?.toISOString()).toBe(ayer.toISOString());
    // y hoy no se entera de esa marca
    const hoyFila = await e.admin.dia.findFirstOrThrow({ where: { tenantId: T.a, personaId: T.persona, fecha: new Date(`${fecha}T00:00:00Z`) } });
    expect(hoyFila.entrada?.getTime()).not.toBe(ayer.getTime());
  });

  it("el trabajo horario deja el día de quien no marcó como ausente cuando su turno terminó", async () => {
    const p2 = (await e.admin.persona.create({ data: { tenantId: T.a, nombres: "Sin", apellidos: "Marca", rut: "12.222.222-2", estado: "activa" } })).id;
    await e.admin.turnoEsperado.create({ data: { tenantId: T.a, personaId: p2, fecha: new Date(`${fecha}T00:00:00Z`), inicio: new Date(Date.now() - 10 * 3_600_000), fin: new Date(Date.now() - 2 * 3_600_000), instalacionId: T.inst, origen: "pauta" } });
    const r = (await trabajoRecalcularDias.ejecutar(sistema(T.a), {})) as { dias: number };
    expect(r.dias).toBeGreaterThanOrEqual(2);
    expect((await e.admin.dia.findFirstOrThrow({ where: { tenantId: T.a, personaId: p2 } })).estado).toBe("ausente");
  });

  it("dos empresas: la otra no ve días ni resúmenes", async () => {
    const l = await run(ctx(T.b), "asistencia.dias.listar", { desde: fecha, hasta: fecha });
    expect(l.data.items).toEqual([]);
    const s = await run(ctx(T.b), "asistencia.dias.resumen_periodo", { desde: fecha, hasta: fecha });
    expect(s.data.items).toEqual([]);
    const hoy = await run(ctx(T.b), "asistencia.dias.hoy", {});
    expect(hoy.data.items).toEqual([]);
  });
});
