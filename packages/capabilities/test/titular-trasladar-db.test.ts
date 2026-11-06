// CAR-207 · Trasladar a un guardia (Postgres real): vínculo, series, cobertura y turnos esperados en
// una sola transacción; vista previa sin escritura; reglas, permisos y aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!urlPropietario)("Pauta · trasladar guardia (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { A: "", B: "" };
  const p = { a1: "", a2: "", a3: "", b1: "", sinPatron: "", otraInst: "", pb: "" };
  const per = { ana: "", luis: "", rosa: "", pb: "" };
  let instA = "";
  let instA2 = "";
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string, rol: "owner" | "supervisor" | "viewer" = "owner", alcance?: string[]) =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: randomUUID() }, portal: "erp", portalesMembresia: ["erp"], rol,
      ...(alcance ? { alcance: { instalaciones: alcance } } : {}), modulosActivos: ["pauta"], medidor,
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) => mod.executeCapability(c, id, input, o);
  const asignar = (puestoId: string, titularPersonaId: string, desde: string) =>
    run(ctx(t.A), "pauta.titular.asignar", { puestoId, titularPersonaId, desde, inicioCiclo: desde });
  const trasladar = (personaId: string, puestoDestinoId: string, desde: string, extra: Record<string, unknown> = {}, o = {}, c = ctx(t.A)) =>
    run(c, "pauta.titular.trasladar", { personaId, puestoDestinoId, desde, inicioCiclo: desde, motivo: "Cambio de turno operativo", ...extra }, o);
  const vigente = (personaId: string) => e.admin.vinculoLaboral.findFirstOrThrow({ where: { personaId, estado: "vigente" } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPauta]);
    mod.limpiarConsumidores();
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
    const nuevo = async (s: string) => (await e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } })).id;
    t.A = await nuevo("tras-a");
    t.B = await nuevo("tras-b");
    const base = async (tenantId: string) => {
      const cuenta = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta" } })).id;
      const inst = (await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta, nombre: "Planta" } })).id;
      const cargo = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
      const pat = (await e.admin.patronTurno.create({ data: { tenantId, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 } })).id;
      return { cuenta, inst, cargo, pat };
    };
    const a = await base(t.A);
    const b = await base(t.B);
    instA = a.inst;
    instA2 = (await e.admin.instalacion.create({ data: { tenantId: t.A, cuentaId: a.cuenta, nombre: "Bodega" } })).id;
    const puesto = (tenantId: string, inst: string, cargo: string, pat: string | null, nombre: string) =>
      e.admin.puesto.create({ data: { tenantId, instalacionId: inst, cargoId: cargo, nombre, diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00", patronId: pat } }).then((r) => r.id);
    p.a1 = await puesto(t.A, instA, a.cargo, a.pat, "Portería 1");
    p.a2 = await puesto(t.A, instA, a.cargo, a.pat, "Portería 2");
    p.a3 = await puesto(t.A, instA, a.cargo, a.pat, "Portería 3");
    p.sinPatron = await puesto(t.A, instA, a.cargo, null, "Sin patrón");
    p.otraInst = await puesto(t.A, instA2, a.cargo, a.pat, "Bodega 1");
    p.pb = await puesto(t.B, b.inst, b.cargo, b.pat, "Puesto B");
    const persona = async (tenantId: string, cargo: string, inst: string, nombres: string, rut: string) => {
      const id = (await e.admin.persona.create({ data: { tenantId, nombres, apellidos: "Prueba", rut, estado: "activa" } })).id;
      await e.admin.vinculoLaboral.create({ data: { tenantId, personaId: id, cargoId: cargo, instalacionId: inst, tipo: "indefinido", inicio: new Date("2026-01-01"), horasSemanales: 44, distribucion: "4x4", estado: "vigente" } });
      return id;
    };
    per.ana = await persona(t.A, a.cargo, instA, "Ana", "11.111.111-1");
    per.luis = await persona(t.A, a.cargo, instA, "Luis", "12.121.212-1");
    per.rosa = await persona(t.A, a.cargo, instA, "Rosa", "13.131.313-1");
    per.pb = await persona(t.B, b.cargo, b.inst, "Beta", "22.222.222-2");
    expect(await asignar(p.a3, per.ana, dia(1))).toMatchObject({ ok: true });
    expect(await asignar(p.a1, per.luis, dia(1))).toMatchObject({ ok: true });
  });

  afterAll(async () => { await e?.cerrar(); });

  it("vista previa: no escribe y no ve un doblaje falso con el puesto que se cierra", async () => {
    const r = await trasladar(per.luis, p.a2, dia(10), { inicioCiclo: dia(10) }, { dryRun: true });
    expect(r, JSON.stringify(r)).toMatchObject({ ok: true, data: { mismaInstalacion: true, vinculoNuevo: false, puestosOrigen: [{ puestoId: p.a1, serieHasta: dia(9) }] } });
    expect((r as { data: { primerosDias: unknown[] } }).data.primerosDias).toHaveLength(14);
    expect(await e.admin.seriePauta.count({ where: { puestoId: p.a2 } })).toBe(0);
    expect((await vinculoDe(per.luis)).puestoId).toBe(p.a1);
  });

  async function vinculoDe(id: string) { return vigente(id); }

  it("misma instalación: cierra la serie vieja, abre la nueva, mueve el puesto del vínculo y no genera anexo", async () => {
    const antesAnexos = await e.admin.anexoContrato.count({ where: { tenantId: t.A } });
    expect(await trasladar(per.luis, p.a2, dia(10), { inicioCiclo: dia(10) })).toMatchObject({ ok: true, data: { mismaInstalacion: true } });
    const vieja = await e.admin.seriePauta.findMany({ where: { puestoId: p.a1 }, orderBy: { vigenteDesde: "asc" } });
    expect(vieja.at(-1)).toMatchObject({ titularPersonaId: null });
    const luis = await vigente(per.luis);
    expect(luis.puestoId).toBe(p.a2);
    const nueva = await e.admin.seriePauta.findFirstOrThrow({ where: { puestoId: p.a2, vigenteHasta: null } });
    expect(nueva.titularPersonaId).toBe(per.luis);
    expect(await e.admin.puesto.findUniqueOrThrow({ where: { id: p.a2 } })).toMatchObject({ cobertura: "cubierto" });
    const h = await e.admin.historialPauta.findFirstOrThrow({ where: { puestoId: p.a2, accion: "serie_fijada" } });
    expect(h.detalle).toMatchObject({ via: "traslado" });
    await mod.despacharPendientes(ctx(t.A));
    expect(await e.admin.anexoContrato.count({ where: { tenantId: t.A } })).toBe(antesAnexos);
    const turnos = await e.admin.turnoEsperado.findMany({ where: { tenantId: t.A, personaId: per.luis, vigente: true } });
    expect(turnos.filter((x) => x.fecha.toISOString().slice(0, 10) >= dia(10)).every((x) => x.puestoId === p.a2)).toBe(true);
    expect(turnos.filter((x) => x.fecha.toISOString().slice(0, 10) < dia(10)).every((x) => x.puestoId === p.a1)).toBe(true);
  });

  it("otra instalación: termina el vínculo el día antes, crea el nuevo, cierra y abre las series, y deja un borrador de anexo", async () => {
    const v0 = await vigente(per.ana);
    const r = await trasladar(per.ana, p.otraInst, dia(12), { inicioCiclo: dia(12), motivo: "Traslado por necesidad del servicio" });
    expect(r, JSON.stringify(r)).toMatchObject({ ok: true, data: { mismaInstalacion: false, vinculoNuevo: true, vinculoTerminado: { id: v0.id, termino: dia(11) } } });
    const viejo = await e.admin.vinculoLaboral.findUniqueOrThrow({ where: { id: v0.id } });
    expect(viejo).toMatchObject({ estado: "terminado", motivoTermino: "Traslado por necesidad del servicio" });
    expect(viejo.termino?.toISOString().slice(0, 10)).toBe(dia(11));
    const nuevo = await vigente(per.ana);
    expect(nuevo).toMatchObject({ instalacionId: instA2, puestoId: p.otraInst, cargoId: v0.cargoId, horasSemanales: 44 });
    expect(nuevo.inicio.toISOString().slice(0, 10)).toBe(dia(12));
    expect((await e.admin.seriePauta.findFirstOrThrow({ where: { puestoId: p.a3, titularPersonaId: per.ana } })).vigenteHasta?.toISOString().slice(0, 10)).toBe(dia(11));
    expect((await e.admin.seriePauta.findFirstOrThrow({ where: { puestoId: p.otraInst, vigenteHasta: null } })).titularPersonaId).toBe(per.ana);
    expect(await e.admin.puesto.findUniqueOrThrow({ where: { id: p.a3 } })).toMatchObject({ cobertura: "ppc" });
    expect(await e.admin.puesto.findUniqueOrThrow({ where: { id: p.otraInst } })).toMatchObject({ cobertura: "cubierto" });
    await mod.despacharPendientes(ctx(t.A));
    expect(await e.admin.anexoContrato.count({ where: { tenantId: t.A, personaId: per.ana } })).toBeGreaterThan(0);
  });

  it("reglas: pasado, ya titular, sin patrón, puesto o persona de otra empresa y asignación futura", async () => {
    expect(await trasladar(per.rosa, p.a2, dia(-2))).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await trasladar(per.luis, p.a2, dia(20))).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await trasladar(per.rosa, p.sinPatron, dia(20))).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await trasladar(per.rosa, p.pb, dia(20))).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await trasladar(per.pb, p.a2, dia(20))).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await e.admin.seriePauta.count({ where: { titularPersonaId: per.rosa } })).toBe(0);
  });

  it("permisos: el viewer no escribe y otra instalación exige owner o admin; el supervisor sin la instalación no ve el puesto", async () => {
    expect(await trasladar(per.rosa, p.a2, dia(20), {}, {}, ctx(t.A, "viewer"))).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await trasladar(per.rosa, p.otraInst, dia(20), {}, {}, ctx(t.A, "supervisor", [instA, instA2]))).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await trasladar(per.rosa, p.a2, dia(20), {}, {}, ctx(t.A, "supervisor", [randomUUID()]))).toMatchObject({ ok: false });
  });

  it("dos traslados simultáneos de la misma persona: uno solo gana y no queda doble titularidad", async () => {
    const r = await Promise.all([trasladar(per.rosa, p.a1, dia(30)), trasladar(per.rosa, p.a2, dia(30))]);
    expect(r.filter((x) => x.ok).length).toBeGreaterThanOrEqual(1);
    const abiertas = await e.admin.seriePauta.findMany({ where: { titularPersonaId: per.rosa, vigenteHasta: null } });
    expect(abiertas.length).toBe(1);
    expect((await vigente(per.rosa)).puestoId).toBe(abiertas[0]!.puestoId);
  });
});
