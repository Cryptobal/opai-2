// CAR-201 · P1: turnos esperados materializados (Postgres real): aislamiento entre dos empresas,
// regeneración idempotente, reemplazo de un día, jornada pactada y vista previa sin escrituras.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

const RANGO = { desde: "2026-12-01", hasta: "2026-12-31" };
const DIAS_HABILES = 23;

describe.skipIf(!urlPropietario)("Turnos esperados · núcleo (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const medidor = { registrar: async () => undefined };
  const t = { A: "", B: "", C: "" };
  const inst = { A: "", B: "", C: "" };
  const puesto = { A: "", B: "" };
  const persona = { ana: "", beto: "", otra: "", sinHorario: "", ilegible: "" };

  const ctx = (tenantId: string, modulosActivos: readonly string[]) =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: randomUUID() }, portal: "erp", portalesMembresia: ["erp"],
      rol: "owner", modulosActivos, medidor,
    });
  const ejecutar = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o);
  const listar = async (tenantId: string, instalacionId: string, extra = {}) => {
    const r = await ejecutar(ctx(tenantId, []), "core.turnos_esperados.listar", { instalacionId, ...RANGO, ...extra });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    return r.ok ? (r.data as { items: { personaId: string; fecha: string; inicio: string; fin: string; vigente: boolean; origen: string; version: number; feriado: boolean }[] }).items : [];
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    const nuevo = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } })).id;
    t.A = await nuevo("turnos-a");
    t.B = await nuevo("turnos-b");
    t.C = await nuevo("turnos-c");
    const base = async (tenantId: string) => {
      const cuenta = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta" } })).id;
      const i = (await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta, nombre: "Planta" } })).id;
      const cargo = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
      return { i, cargo };
    };
    const personaDe = async (tenantId: string, cargoId: string, instalacionId: string, nombres: string, rut: string, distribucion?: string, puestoId?: string) => {
      const id = (await e.admin.persona.create({ data: { tenantId, nombres, apellidos: "Prueba", rut, estado: "activa" } })).id;
      await e.admin.vinculoLaboral.create({
        data: { tenantId, personaId: id, cargoId, instalacionId, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: distribucion ?? "5x2", ...(puestoId ? { puestoId } : {}) },
      });
      return id;
    };
    for (const k of ["A", "B"] as const) {
      const b = await base(t[k]);
      inst[k] = b.i;
      const patron = await e.admin.patronTurno.create({ data: { tenantId: t[k], nombre: "5x2", clase: "semanal", diasTrabajo: 5, diasDescanso: 2, diasSemana: [1, 2, 3, 4, 5] } });
      puesto[k] = (await e.admin.puesto.create({ data: { tenantId: t[k], instalacionId: b.i, cargoId: b.cargo, nombre: "Portería", diasTrabajo: 5, diasDescanso: 2, horaInicio: "08:00", horaFin: "17:00", patronId: patron.id } })).id;
      const titular = await personaDe(t[k], b.cargo, b.i, `Titular ${k}`, k === "A" ? "11.111.111-1" : "22.222.222-2");
      if (k === "A") persona.ana = titular;
      await e.admin.seriePauta.create({ data: { tenantId: t[k], puestoId: puesto[k], patronId: patron.id, inicioCiclo: new Date("2026-12-01"), titularPersonaId: titular, vigenteDesde: new Date("2026-12-01") } });
    }
    const bA = await e.admin.cargo.findFirstOrThrow({ where: { tenantId: t.A } });
    persona.beto = await personaDe(t.A, bA.id, inst.A, "Beto", "12.121.212-1");
    // Empresa C: sin Pauta, solo jornada pactada.
    const c = await base(t.C);
    inst.C = c.i;
    persona.otra = await personaDe(t.C, c.cargo, c.i, "Otra", "13.131.313-1", "5x2 09:00-18:00");
    persona.sinHorario = await personaDe(t.C, c.cargo, c.i, "Sin horario", "14.141.414-1", "5x2");
    persona.ilegible = await personaDe(t.C, c.cargo, c.i, "Ilegible", "15.151.515-1", "turnos rotativos");
  });

  afterAll(async () => { await e?.cerrar(); });

  it("la vista previa no escribe nada", async () => {
    const r = await ejecutar(ctx(t.A, ["pauta"]), "core.turnos_esperados.regenerar", RANGO, { dryRun: true });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(r.ok && (r.data as { creados: number }).creados).toBe(DIAS_HABILES);
    expect(await e.admin.turnoEsperado.count({ where: { tenantId: t.A } })).toBe(0);
  });

  it("deriva el mes de la Pauta, [inicio, fin) y sin mezclar empresas", async () => {
    for (const k of ["A", "B"] as const) {
      const r = await ejecutar(ctx(t[k], ["pauta"]), "core.turnos_esperados.regenerar", RANGO);
      expect(r.ok, JSON.stringify(r)).toBe(true);
    }
    const a = await listar(t.A, inst.A);
    expect(a).toHaveLength(DIAS_HABILES);
    expect(a.every((x) => x.origen === "pauta" && x.personaId === persona.ana)).toBe(true);
    expect(new Date(a[0]!.fin).getTime() - new Date(a[0]!.inicio).getTime()).toBe(9 * 3_600_000);
    // La empresa B no ve la instalación de A ni sus turnos.
    expect(await listar(t.B, inst.A)).toHaveLength(0);
    expect(await listar(t.B, inst.B)).toHaveLength(DIAS_HABILES);
    expect(await e.admin.turnoEsperado.count({ where: { tenantId: t.A, instalacionId: inst.B } })).toBe(0);
  });

  it("regenerar de nuevo es idempotente: no cambia nada", async () => {
    const antes = await e.admin.turnoEsperado.findMany({ where: { tenantId: t.A }, orderBy: { inicio: "asc" } });
    const r = await ejecutar(ctx(t.A, ["pauta"]), "core.turnos_esperados.regenerar", RANGO);
    expect(r.ok && r.data).toMatchObject({ creados: 0, reemplazados: 0, anulados: 0, sinCambio: DIAS_HABILES });
    const despues = await e.admin.turnoEsperado.findMany({ where: { tenantId: t.A }, orderBy: { inicio: "asc" } });
    expect(despues.map((x) => [x.id, x.version, x.vigente])).toEqual(antes.map((x) => [x.id, x.version, x.vigente]));
  });

  it("un reemplazo de un día mueve el turno y deja la versión anterior no vigente", async () => {
    await e.admin.excepcionPauta.create({ data: { tenantId: t.A, puestoId: puesto.A, fecha: new Date("2026-12-09"), tipo: "reemplazo", motivo: "x", personaId: persona.beto } });
    const consumidor = mod.consumidoresDelNucleo.find((c) => c.id === "core.turnos_esperados.pauta")!;
    await consumidor.handler(ctx(t.A, []), {
      id: randomUUID(), tipo: "pauta.excepcion.creada", entidadTipo: "puesto", entidadId: puesto.A,
      payload: { puestoId: puesto.A, tipo: "reemplazo", desde: "2026-12-09", hasta: "2026-12-09" },
      actorTipo: "user", actorId: null, viaUserId: null, createdAt: new Date(),
    });
    const dia = (await listar(t.A, inst.A)).filter((x) => x.fecha === "2026-12-09");
    expect(dia.map((x) => x.personaId)).toEqual([persona.beto]);
    const historial = await e.admin.turnoEsperado.findMany({ where: { tenantId: t.A, fecha: new Date("2026-12-09") } });
    expect(historial.filter((x) => !x.vigente).map((x) => x.personaId)).toEqual([persona.ana]);
    expect(await listar(t.A, inst.A)).toHaveLength(DIAS_HABILES);
  });

  it("una ausencia deja el día sin turno vigente", async () => {
    await e.admin.excepcionPauta.create({ data: { tenantId: t.A, puestoId: puesto.A, fecha: new Date("2026-12-10"), tipo: "licencia", motivo: "x" } });
    await ejecutar(ctx(t.A, ["pauta"]), "core.turnos_esperados.regenerar", { puestoId: puesto.A, ...RANGO });
    expect((await listar(t.A, inst.A)).some((x) => x.fecha === "2026-12-10")).toBe(false);
  });

  it("sin Pauta genera desde la jornada pactada y avisa lo que no puede inventar", async () => {
    const r = await ejecutar(ctx(t.C, []), "core.turnos_esperados.regenerar", RANGO);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(r.ok && r.data).toMatchObject({ modo: "jornada_pactada", creados: DIAS_HABILES, avisos: 2 });
    const filas = await listar(t.C, inst.C);
    expect(filas.every((x) => x.origen === "jornada_pactada" && x.personaId === persona.otra)).toBe(true);
    const otra = await ejecutar(ctx(t.C, []), "core.turnos_esperados.regenerar", RANGO);
    expect(otra.ok && otra.data).toMatchObject({ creados: 0, sinCambio: DIAS_HABILES });
  });

  it("el trabajo diario mantiene el horizonte y es idempotente", async () => {
    const trabajo = mod.trabajosDelNucleo.find((x) => x.tipo === "core.turnos_esperados.extender")!;
    const a = (await trabajo.ejecutar(ctx(t.C, []), { dia: "2026-12-15" })) as { modo: string; sinCambio: number };
    const b = (await trabajo.ejecutar(ctx(t.C, []), { dia: "2026-12-15" })) as { modo: string; creados: number };
    expect(a.modo).toBe("jornada_pactada");
    expect(b.creados).toBe(0);
  });

  it("no hay dos turnos vigentes de la misma persona que arranquen igual", async () => {
    const f = await e.admin.turnoEsperado.findFirstOrThrow({ where: { tenantId: t.A, vigente: true } });
    await expect(
      e.admin.turnoEsperado.create({
        data: { tenantId: t.A, personaId: f.personaId, fecha: f.fecha, inicio: f.inicio, fin: f.fin, instalacionId: f.instalacionId, origen: "manual" },
      }),
    ).rejects.toThrow();
  });
});
