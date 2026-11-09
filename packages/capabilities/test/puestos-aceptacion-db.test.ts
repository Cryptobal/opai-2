// CAR-206 / CAR-207 · Ruta de aceptación sintética (Postgres real): asignar → trasladar dentro y fuera de
// la instalación → quitar, con dos empresas ficticias y tres roles. Solo datos inventados («qa»): ningún
// RUT, sueldo ni persona reales. Cada `it` es un paso de `docs/2.0/qa/car-206-207-aceptacion/README.md`.
// El backfill de cobertura solo se SIMULA aquí (aplicar: false); este test nunca lo aplica.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sincronizarCobertura } from "../../db/scripts/sincronizar-cobertura-nucleo";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
const antes = (n: number) => new Date(Date.parse(`${hoy}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!urlPropietario)("Puestos · ruta de aceptación CAR-206/207 (datos sintéticos)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { A: "", B: "" };
  const inst = { norte: "", sur: "", b: "" };
  const p = { n1: "", n2: "", s1: "", pb: "" };
  const per = { ana: "", beto: "", surNadie: "", pb: "" };
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string, rol: "owner" | "supervisor" | "viewer" = "owner", alcance?: string[]) =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: randomUUID() }, portal: "erp", portalesMembresia: ["erp"], rol,
      ...(alcance ? { alcance: { instalaciones: alcance } } : {}), modulosActivos: ["pauta"], medidor,
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) => mod.executeCapability(c, id, input, o);
  const lista = async (puestoId: string, c = ctx(t.A)) => {
    const r = await run(c, "pauta.titulares.listar", { puestoId });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    return (r as { data: { titularActualId: string | null; items: { titular: string | null; fijadaPor: string | null }[]; candidatos: { id: string }[]; destinos: { id: string }[] } }).data;
  };
  const puesto = (id: string) => e.admin.puesto.findUniqueOrThrow({ where: { id } });
  const vigente = (id: string) => e.admin.vinculoLaboral.findFirstOrThrow({ where: { personaId: id, estado: "vigente" } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPauta]);
    mod.limpiarConsumidores();
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
    const tenant = async (s: string) => (await e.admin.tenant.create({ data: { slug: `qa-${s}-${randomUUID().slice(0, 8)}`, nombre: `QA ${s}`, vertical: "seguridad" } })).id;
    t.A = await tenant("aceptacion-a");
    t.B = await tenant("aceptacion-b");
    const base = async (tenantId: string) => {
      const cuenta = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta ficticia" } })).id;
      const cargo = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
      const pat = (await e.admin.patronTurno.create({ data: { tenantId, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 } })).id;
      const instalacion = async (nombre: string) => (await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta, nombre } })).id;
      const puestoDe = async (instalacionId: string, nombre: string) =>
        (await e.admin.puesto.create({ data: { tenantId, instalacionId, cargoId: cargo, nombre, diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00", patronId: pat } })).id;
      const persona = async (instalacionId: string, nombres: string, rut: string) => {
        const id = (await e.admin.persona.create({ data: { tenantId, nombres, apellidos: "Ficticia", rut, estado: "activa" } })).id;
        await e.admin.vinculoLaboral.create({ data: { tenantId, personaId: id, cargoId: cargo, instalacionId, tipo: "indefinido", inicio: new Date("2026-01-01"), horasSemanales: 44, distribucion: "4x4", estado: "vigente" } });
        return id;
      };
      return { instalacion, puestoDe, persona };
    };
    const a = await base(t.A);
    inst.norte = await a.instalacion("QA Norte");
    inst.sur = await a.instalacion("QA Sur");
    p.n1 = await a.puestoDe(inst.norte, "QA Norte · Día 1");
    p.n2 = await a.puestoDe(inst.norte, "QA Norte · Día 2");
    p.s1 = await a.puestoDe(inst.sur, "QA Sur · Día 1");
    per.ana = await a.persona(inst.norte, "Ana QA", "90.000.001-1");
    per.beto = await a.persona(inst.norte, "Beto QA", "90.000.002-1");
    per.surNadie = await a.persona(inst.sur, "Sur QA", "90.000.003-1");
    const b = await base(t.B);
    inst.b = await b.instalacion("QA Otra empresa");
    p.pb = await b.puestoDe(inst.b, "QA B · Día 1");
    per.pb = await b.persona(inst.b, "Beta QA", "90.000.004-1");
  });

  afterAll(async () => { await e?.cerrar(); });

  it("A1 · el puesto nace por cubrir y solo ofrece guardias vinculados a su instalación", async () => {
    expect(await puesto(p.n1)).toMatchObject({ cobertura: "ppc", coberturaMotivo: "sin_asignar" });
    const l = await lista(p.n1);
    expect(l.titularActualId).toBeNull();
    expect(l.candidatos.map((c) => c.id).sort()).toEqual([per.ana, per.beto].sort());
    expect(l.destinos.map((d) => d.id)).toEqual(expect.arrayContaining([p.n2, p.s1]));
    expect(l.destinos.map((d) => d.id)).not.toContain(p.pb);
  });

  it("A2 · asignar: la vista previa no escribe; la real deja serie, vínculo, cobertura e historial con autor", async () => {
    const entrada = { puestoId: p.n1, titularPersonaId: per.ana, desde: antes(5), inicioCiclo: antes(5) };
    expect(await run(ctx(t.A), "pauta.titular.asignar", entrada, { dryRun: true })).toMatchObject({ ok: true });
    expect(await e.admin.seriePauta.count({ where: { puestoId: p.n1 } })).toBe(0);
    expect(await run(ctx(t.A), "pauta.titular.asignar", entrada)).toMatchObject({ ok: true });
    expect(await puesto(p.n1)).toMatchObject({ cobertura: "cubierto" });
    expect((await vigente(per.ana)).puestoId).toBe(p.n1);
    const l = await lista(p.n1);
    expect(l.titularActualId).toBe(per.ana);
    expect(l.items[0]).toMatchObject({ titular: "Ana QA Ficticia" });
  });

  it("A3 · un guardia titular de otro puesto no se asigna a un segundo puesto (el traslado es la vía)", async () => {
    const r = await run(ctx(t.A), "pauta.titular.asignar", { puestoId: p.n2, titularPersonaId: per.ana, desde: hoy, inicioCiclo: hoy });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("B1 · trasladar dentro de la instalación: el puesto de origen queda por cubrir y no hay anexo", async () => {
    const anexos = await e.admin.anexoContrato.count({ where: { tenantId: t.A } });
    const previa = await run(ctx(t.A), "pauta.titular.trasladar", { personaId: per.ana, puestoDestinoId: p.n2, desde: hoy, inicioCiclo: hoy, motivo: "Aceptación sintética" }, { dryRun: true });
    expect(previa, JSON.stringify(previa)).toMatchObject({ ok: true, data: { mismaInstalacion: true, faltaJornada: false } });
    expect(await run(ctx(t.A), "pauta.titular.trasladar", { personaId: per.ana, puestoDestinoId: p.n2, desde: hoy, inicioCiclo: hoy, motivo: "Aceptación sintética" })).toMatchObject({ ok: true });
    expect(await puesto(p.n1)).toMatchObject({ cobertura: "ppc" });
    expect(await puesto(p.n2)).toMatchObject({ cobertura: "cubierto" });
    expect((await vigente(per.ana)).puestoId).toBe(p.n2);
    await mod.despacharPendientes(ctx(t.A));
    expect(await e.admin.anexoContrato.count({ where: { tenantId: t.A } })).toBe(anexos);
  });

  it("B2 · trasladar a otra instalación: vínculo nuevo desde hoy, el anterior termina el día antes y queda borrador de anexo", async () => {
    const v0 = await vigente(per.ana);
    const r = await run(ctx(t.A), "pauta.titular.trasladar", { personaId: per.ana, puestoDestinoId: p.s1, desde: hoy, inicioCiclo: hoy, motivo: "Aceptación sintética" });
    expect(r, JSON.stringify(r)).toMatchObject({ ok: true, data: { mismaInstalacion: false, vinculoNuevo: true } });
    expect((await e.admin.vinculoLaboral.findUniqueOrThrow({ where: { id: v0.id } })).estado).toBe("terminado");
    expect(await vigente(per.ana)).toMatchObject({ instalacionId: inst.sur, puestoId: p.s1, horasSemanales: 44 });
    await mod.despacharPendientes(ctx(t.A));
    expect(await e.admin.anexoContrato.count({ where: { tenantId: t.A, personaId: per.ana } })).toBeGreaterThan(0);
  });

  it("B3 · quitar el titular deja el puesto por cubrir; los turnos esperados no siguen a quien salió", async () => {
    expect(await run(ctx(t.A), "pauta.titular.asignar", { puestoId: p.s1, titularPersonaId: null, desde: hoy })).toMatchObject({ ok: true });
    expect(await puesto(p.s1)).toMatchObject({ cobertura: "ppc", coberturaMotivo: "sin_asignar" });
    await mod.despacharPendientes(ctx(t.A));
    const vigentes = await e.admin.turnoEsperado.findMany({ where: { tenantId: t.A, personaId: per.ana, vigente: true } });
    expect(vigentes.filter((x) => x.fecha.toISOString().slice(0, 10) >= hoy)).toHaveLength(0);
  });

  it("C1 · roles: el viewer lee pero no escribe; el supervisor sin la instalación no ve el puesto", async () => {
    expect((await run(ctx(t.A, "viewer"), "pauta.titulares.listar", { puestoId: p.n1 })).ok).toBe(true);
    for (const [id, input] of [
      ["pauta.titular.asignar", { puestoId: p.n1, titularPersonaId: null, desde: hoy }],
      ["pauta.titular.trasladar", { personaId: per.beto, puestoDestinoId: p.n1, desde: hoy, inicioCiclo: hoy, motivo: "Aceptación sintética" }],
    ] as const)
      expect(await run(ctx(t.A, "viewer"), id, input)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const fuera = ctx(t.A, "supervisor", [inst.sur]);
    expect(await run(fuera, "pauta.titulares.listar", { puestoId: p.n1 })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("C2 · aislamiento: la otra empresa no ve ni toca puestos ni personas de esta", async () => {
    const b = ctx(t.B);
    expect(await run(b, "pauta.titulares.listar", { puestoId: p.n1 })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await run(b, "pauta.titular.asignar", { puestoId: p.n1, titularPersonaId: per.beto, desde: hoy, inicioCiclo: hoy })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await run(b, "pauta.titular.trasladar", { personaId: per.beto, puestoDestinoId: p.pb, desde: hoy, inicioCiclo: hoy, motivo: "Aceptación sintética" })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await run(ctx(t.A), "pauta.titular.trasladar", { personaId: per.pb, puestoDestinoId: p.n1, desde: hoy, inicioCiclo: hoy, motivo: "Aceptación sintética" })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("D1 · backfill de cobertura: tras todo el flujo no hay nada que corregir y la simulación no escribe", async () => {
    for (const tenantId of [t.A, t.B]) {
      const r = await sincronizarCobertura(e.admin, { tenantId, aplicar: false, hoy });
      expect(r.aplicado).toBe(false);
      expect(r.cambios, `cobertura incoherente en ${tenantId}`).toHaveLength(0);
    }
  });
});
