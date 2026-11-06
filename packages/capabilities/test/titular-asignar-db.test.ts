// CAR-206 · Asignar titular desde el puesto (Postgres real): serie + vínculo + cobertura en una sola
// transacción, historial de titulares, aislamiento entre empresas, turnos esperados y concurrencia.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!urlPropietario)("Pauta · asignar titular (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { A: "", B: "" };
  const p = { dia: "", sinPatron: "", otro: "", conc: "", inactivo: "", b: "" };
  const per = { ana: "", luis: "", rosa: "", mario: "", nora: "", lejos: "", b: "" };
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string, rol: "owner" | "viewer" = "owner") =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: randomUUID() }, portal: "erp", portalesMembresia: ["erp"],
      rol, modulosActivos: ["pauta"], medidor,
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) => mod.executeCapability(c, id, input, o);
  const asignar = (puestoId: string, titularPersonaId: string | null, desde: string, extra: Record<string, unknown> = {}, o = {}, tenant = t.A) =>
    run(ctx(tenant), "pauta.titular.asignar", { puestoId, titularPersonaId, desde, inicioCiclo: desde, ...extra }, o);
  const puestoDe = (vinculos: { puestoId: string | null }[]) => vinculos.map((v) => v.puestoId);
  const vinculoDe = (personaId: string) => e.admin.vinculoLaboral.findFirstOrThrow({ where: { personaId, estado: "vigente" } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPauta]);
    mod.limpiarConsumidores();
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
    const nuevo = async (s: string) => (await e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } })).id;
    t.A = await nuevo("titular-a");
    t.B = await nuevo("titular-b");
    const base = async (tenantId: string) => {
      const cuenta = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta" } })).id;
      const inst = (await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta, nombre: "Planta" } })).id;
      const cargo = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
      const pat = (await e.admin.patronTurno.create({ data: { tenantId, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 } })).id;
      return { inst, cargo, pat };
    };
    const a = await base(t.A);
    const b = await base(t.B);
    const puesto = (tenantId: string, x: { inst: string; cargo: string; pat: string }, nombre: string, extra: Record<string, unknown> = {}) =>
      e.admin.puesto.create({ data: { tenantId, instalacionId: x.inst, cargoId: x.cargo, nombre, diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00", patronId: x.pat, ...extra } }).then((r) => r.id);
    p.dia = await puesto(t.A, a, "Portería · Día");
    p.sinPatron = await puesto(t.A, a, "Sin patrón", { patronId: null });
    p.otro = await puesto(t.A, a, "Acceso · Día");
    p.conc = await puesto(t.A, a, "Concurrente");
    p.inactivo = await puesto(t.A, a, "Inactivo", { estado: "inactivo" });
    p.b = await puesto(t.B, b, "Puesto B");
    const persona = async (tenantId: string, x: { inst: string; cargo: string }, nombres: string, rut: string, inst = x.inst) => {
      const id = (await e.admin.persona.create({ data: { tenantId, nombres, apellidos: "Prueba", rut, estado: "activa" } })).id;
      await e.admin.vinculoLaboral.create({ data: { tenantId, personaId: id, cargoId: x.cargo, instalacionId: inst, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" } });
      return id;
    };
    per.ana = await persona(t.A, a, "Ana", "11.111.111-1");
    per.luis = await persona(t.A, a, "Luis", "12.121.212-1");
    per.rosa = await persona(t.A, a, "Rosa", "13.131.313-1");
    per.mario = await persona(t.A, a, "Mario", "15.151.515-1");
    per.nora = await persona(t.A, a, "Nora", "16.161.616-1");
    const otraInst = (await e.admin.instalacion.create({ data: { tenantId: t.A, cuentaId: (await e.admin.cuenta.findFirstOrThrow({ where: { tenantId: t.A } })).id, nombre: "Otra planta" } })).id;
    per.lejos = await persona(t.A, a, "Lejos", "14.141.414-1", otraInst);
    per.b = await persona(t.B, b, "Beta", "22.222.222-2");
  });

  afterAll(async () => { await e?.cerrar(); });

  it("la vista previa no escribe: muestra los primeros días y no toca vínculos ni cobertura", async () => {
    const r = await asignar(p.dia, per.ana, dia(1), {}, { dryRun: true });
    expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
    const d = (r as { data: { primerosDias: { trabaja: boolean }[]; titularAnterior: unknown; serieAnteriorHasta: string | null } }).data;
    expect(d.primerosDias).toHaveLength(14);
    expect(d.primerosDias.slice(0, 4).every((x) => x.trabaja)).toBe(true);
    expect(d.primerosDias[4]!.trabaja).toBe(false);
    expect(d.titularAnterior).toBeNull();
    expect(d.serieAnteriorHasta).toBeNull();
    expect(await e.admin.seriePauta.count({ where: { puestoId: p.dia } })).toBe(0);
    expect((await vinculoDe(per.ana)).puestoId).toBeNull();
    expect((await e.admin.puesto.findUniqueOrThrow({ where: { id: p.dia } })).cobertura).toBe("ppc");
  });

  it("asigna: serie, vínculo, cobertura, historial y turnos esperados en uno", async () => {
    const r = await asignar(p.dia, per.ana, dia(1));
    expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
    const serie = await e.admin.seriePauta.findFirstOrThrow({ where: { puestoId: p.dia, vigenteHasta: null } });
    expect(serie.titularPersonaId).toBe(per.ana);
    expect((await vinculoDe(per.ana)).puestoId).toBe(p.dia);
    expect((await e.admin.puesto.findUniqueOrThrow({ where: { id: p.dia } })).cobertura).toBe("cubierto");
    const h = await e.admin.historialPauta.findFirstOrThrow({ where: { puestoId: p.dia, accion: "serie_fijada" } });
    expect(h.detalle).toMatchObject({ serieId: serie.id, via: "titular_asignar", conTitular: "si" });
    expect(h.actorTipo).toBe("user");
    expect(JSON.stringify(h.detalle)).not.toContain("Ana");
    expect(await e.admin.evento.count({ where: { tenantId: t.A, tipo: "pauta.serie.fijada" } })).toBeGreaterThan(0);
    await mod.despacharPendientes(ctx(t.A));
    const turnos = await e.admin.turnoEsperado.findMany({ where: { tenantId: t.A, puestoId: p.dia, vigente: true } });
    expect(turnos.length).toBeGreaterThan(0);
    expect(turnos.every((x) => x.personaId === per.ana && x.fecha.toISOString().slice(0, 10) >= dia(1))).toBe(true);
  });

  it("cambia de titular: cierra la serie, suelta al anterior y deja al nuevo; el historial lo cuenta", async () => {
    const desde = dia(10);
    const prev = await asignar(p.dia, per.luis, desde, {}, { dryRun: true });
    expect(prev).toMatchObject({ ok: true, data: { serieAnteriorHasta: dia(9), titularAnterior: { id: per.ana, nombre: "Ana Prueba" } } });
    expect(await asignar(p.dia, per.luis, desde)).toMatchObject({ ok: true });
    const series = await e.admin.seriePauta.findMany({ where: { puestoId: p.dia }, orderBy: { vigenteDesde: "asc" } });
    expect(series).toHaveLength(2);
    expect(series[0]!.vigenteHasta?.toISOString().slice(0, 10)).toBe(dia(9));
    expect(series.filter((s) => s.vigenteHasta === null)).toHaveLength(1);
    expect((await vinculoDe(per.ana)).puestoId).toBeNull();
    expect((await vinculoDe(per.luis)).puestoId).toBe(p.dia);
    const lista = await run(ctx(t.A), "pauta.titulares.listar", { puestoId: p.dia });
    expect(lista, JSON.stringify(lista)).toMatchObject({ ok: true });
    const items = (lista as { data: { items: { titular: string; desde: string; hasta: string | null; fijadaEn: string | null }[]; candidatos: { id: string }[] } }).data;
    expect(items.items.map((i) => i.titular)).toEqual(["Luis Prueba", "Ana Prueba"]);
    expect(items.items[1]!.hasta).toBe(dia(9));
    expect(items.items.every((i) => i.fijadaEn)).toBe(true);
    expect(items.candidatos.map((c) => c.id)).not.toContain(per.lejos);
    await mod.despacharPendientes(ctx(t.A));
    const turnos = await e.admin.turnoEsperado.findMany({ where: { tenantId: t.A, puestoId: p.dia, vigente: true } });
    expect(turnos.filter((x) => x.fecha.toISOString().slice(0, 10) >= desde).every((x) => x.personaId === per.luis)).toBe(true);
    expect(turnos.filter((x) => x.fecha.toISOString().slice(0, 10) < desde).every((x) => x.personaId === per.ana)).toBe(true);
  });

  it("quita al titular desde una fecha: el puesto queda PPC y los turnos esperados dejan de ser de Luis", async () => {
    const desde = dia(20);
    expect(await asignar(p.dia, null, desde, { inicioCiclo: undefined })).toMatchObject({ ok: true });
    const abierta = await e.admin.seriePauta.findFirstOrThrow({ where: { puestoId: p.dia, vigenteHasta: null } });
    expect(abierta.titularPersonaId).toBeNull();
    expect((await vinculoDe(per.luis)).puestoId).toBeNull();
    expect(await e.admin.puesto.findUniqueOrThrow({ where: { id: p.dia } })).toMatchObject({ cobertura: "ppc", coberturaMotivo: "sin_asignar" });
    await mod.despacharPendientes(ctx(t.A));
    const turnos = await e.admin.turnoEsperado.findMany({ where: { tenantId: t.A, puestoId: p.dia, vigente: true } });
    expect(turnos.filter((x) => x.fecha.toISOString().slice(0, 10) >= desde)).toHaveLength(0);
    expect(turnos.some((x) => x.personaId === per.luis)).toBe(true);
    expect(await asignar(p.dia, null, dia(21), { inicioCiclo: undefined })).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("quitar el mismo día en que se asignó reemplaza esa serie y deja el puesto PPC", async () => {
    const inst = (await e.admin.puesto.findUniqueOrThrow({ where: { id: p.dia } }));
    const nuevo = (await e.admin.puesto.create({ data: { tenantId: t.A, instalacionId: inst.instalacionId, cargoId: inst.cargoId, nombre: "Mismo día", diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00", patronId: inst.patronId } })).id;
    const desde = dia(40);
    const x = (await e.admin.persona.create({ data: { tenantId: t.A, nombres: "Mismo", apellidos: "Prueba", rut: "17.171.717-1", estado: "activa" } })).id;
    await e.admin.vinculoLaboral.create({ data: { tenantId: t.A, personaId: x, cargoId: inst.cargoId, instalacionId: inst.instalacionId, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" } });
    expect(await asignar(nuevo, x, desde)).toMatchObject({ ok: true });
    expect(await asignar(nuevo, null, desde, { inicioCiclo: undefined })).toMatchObject({ ok: true });
    const series = await e.admin.seriePauta.findMany({ where: { puestoId: nuevo } });
    expect(series).toHaveLength(1);
    expect(series[0]!.titularPersonaId).toBeNull();
    expect((await vinculoDe(x)).puestoId).toBeNull();
  });

  it("reglas: sin patrón, puesto inactivo, pasado, sin vínculo en la instalación y otra empresa", async () => {
    expect(await asignar(p.sinPatron, per.rosa, dia(1))).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(JSON.stringify(await asignar(p.sinPatron, per.rosa, dia(1)))).toContain("patrón");
    expect(await asignar(p.inactivo, per.rosa, dia(1))).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await asignar(p.dia, per.rosa, dia(-3))).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await asignar(p.otro, per.lejos, dia(1))).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await asignar(p.otro, per.b, dia(1))).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await asignar(p.b, per.ana, dia(1))).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await e.admin.seriePauta.count({ where: { puestoId: p.otro } })).toBe(0);
  });

  it("doblar: el titular de otro puesto con turnos que se cruzan se rechaza con el detalle; sin cruce, pide quitarlo antes", async () => {
    expect(await asignar(p.otro, per.rosa, dia(1))).toMatchObject({ ok: true });
    const cruza = await asignar(p.dia, per.rosa, dia(2));
    expect(cruza).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(JSON.stringify(cruza)).toContain("No se puede doblar");
    const distinto = await asignar(p.dia, per.rosa, dia(25), { inicioCiclo: dia(5) });
    expect(distinto).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(JSON.stringify(distinto)).toMatch(/doblar|ya es titular/);
    expect((await vinculoDe(per.rosa)).puestoId).toBe(p.otro);
  });

  it("dos asignaciones simultáneas al mismo puesto: una sola serie abierta y un solo vínculo apuntándole", async () => {
    const [x, y] = await Promise.all([asignar(p.conc, per.mario, dia(3)), asignar(p.conc, per.nora, dia(3))]);
    expect([x.ok, y.ok], JSON.stringify([x, y])).toEqual([true, true]);
    const abiertas = await e.admin.seriePauta.findMany({ where: { puestoId: p.conc, vigenteHasta: null } });
    expect(abiertas).toHaveLength(1);
    const apuntan = await e.admin.vinculoLaboral.findMany({ where: { puestoId: p.conc, estado: "vigente" } });
    expect(apuntan.map((v) => v.personaId)).toEqual([abiertas[0]!.titularPersonaId]);
  });

  it("permisos y aislamiento: el viewer no escribe y la otra empresa no ve el historial", async () => {
    const viewer = ctx(t.A, "viewer");
    expect(await run(viewer, "pauta.titular.asignar", { puestoId: p.dia, titularPersonaId: null, desde: dia(30) })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect((await run(viewer, "pauta.titulares.listar", { puestoId: p.dia })).ok).toBe(true);
    expect(await run(ctx(t.B), "pauta.titulares.listar", { puestoId: p.dia })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await asignar(p.b, per.b, dia(1), {}, {}, t.B)).toMatchObject({ ok: true });
    expect(await e.forTenant(t.B).seriePauta.count({ where: { puestoId: p.dia } })).toBe(0);
    expect(puestoDe(await e.admin.vinculoLaboral.findMany({ where: { tenantId: t.A, personaId: per.b } }))).toEqual([]);
  });

  it("alcance: un supervisor sin la instalación no ve ni asigna (no encontrado)", async () => {
    const inst = (await e.admin.puesto.findUniqueOrThrow({ where: { id: p.dia } })).instalacionId;
    const sup = (alcance: string[]) =>
      mod.crearContexto({ tenantId: t.A, actor: { tipo: "user", id: randomUUID() }, portal: "erp", portalesMembresia: ["erp"], rol: "supervisor", alcance: { instalaciones: alcance }, modulosActivos: ["pauta"], medidor });
    const fuera = sup([randomUUID()]);
    expect(await run(fuera, "pauta.titulares.listar", { puestoId: p.dia })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await run(fuera, "pauta.titular.asignar", { puestoId: p.dia, titularPersonaId: null, desde: dia(50) })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect((await run(sup([inst]), "pauta.titulares.listar", { puestoId: p.dia })).ok).toBe(true);
  });

  it("quitar no exige patrón activo y pauta.series.fijar deja vínculo y cobertura al día", async () => {
    const base = await e.admin.puesto.findUniqueOrThrow({ where: { id: p.dia } });
    const pat = await e.admin.patronTurno.create({ data: { tenantId: t.A, nombre: "6x1 viejo", diasTrabajo: 6, diasDescanso: 1 } });
    const q = (await e.admin.puesto.create({ data: { tenantId: t.A, instalacionId: base.instalacionId, cargoId: base.cargoId, nombre: "Vía serie", diasTrabajo: 6, diasDescanso: 1, horaInicio: "08:00", horaFin: "20:00", patronId: pat.id } })).id;
    const y = (await e.admin.persona.create({ data: { tenantId: t.A, nombres: "Serie", apellidos: "Prueba", rut: "18.181.818-1", estado: "activa" } })).id;
    await e.admin.vinculoLaboral.create({ data: { tenantId: t.A, personaId: y, cargoId: base.cargoId, instalacionId: base.instalacionId, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" } });
    const f = await run(ctx(t.A), "pauta.series.fijar", { puestoId: q, patronId: pat.id, inicioCiclo: dia(60), titularPersonaId: y, desde: dia(60) });
    expect(f.ok, JSON.stringify(f)).toBe(true);
    expect((await vinculoDe(y)).puestoId).toBe(q);
    expect((await e.admin.puesto.findUniqueOrThrow({ where: { id: q } })).cobertura).toBe("cubierto");
    await e.admin.patronTurno.update({ where: { id: pat.id }, data: { activo: false } });
    expect(await asignar(q, null, dia(61), { inicioCiclo: undefined })).toMatchObject({ ok: true });
    expect((await vinculoDe(y)).puestoId).toBeNull();
  });

  it("la escritura real queda en la auditoría", async () => {
    const n = await e.admin.auditEvent.count({ where: { tenantId: t.A, capability: "pauta.titular.asignar" } });
    expect(n).toBeGreaterThan(3);
  });
});
