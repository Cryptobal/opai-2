// Permisos y licencias desde la ficha (ADR-094, adenda CAR-311 d): se registran por persona en todos sus puestos,
// se listan, se anulan sin tocar a otros y respetan tenant y alcance, contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Ok<T> = { ok: true; data: T };

describe.skipIf(!urlPropietario)("Pauta · permisos y licencias por persona (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantA = "";
  let tenantB = "";
  let instA = "";
  let instA2 = "";
  let puesto1 = "";
  let puesto2 = "";
  let puestoOtro = "";
  let juan = "";
  let ana = "";
  const medidor = { registrar: async () => undefined };
  const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  const inicio = dia(1);

  const ctx = (tenantId: string, alcance: { instalaciones: readonly string[] } | null = null) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: alcance ? "supervisor" : "owner",
      ...(alcance ? { alcance } : {}),
      modulosActivos: ["pauta"],
      medidor,
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPauta]);
    const tenant = async (slug: string) =>
      (
        await e.admin.tenant.create({
          data: {
            slug: `${slug}-${randomUUID().slice(0, 8)}`,
            nombre: slug,
            vertical: "seguridad",
          },
        })
      ).id;
    tenantA = await tenant("aus-a");
    tenantB = await tenant("aus-b");
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: tenantA, nombre: "Cuenta" } }))
      .id;
    instA = (
      await e.admin.instalacion.create({
        data: { tenantId: tenantA, cuentaId: cuenta, nombre: "Planta" },
      })
    ).id;
    instA2 = (
      await e.admin.instalacion.create({
        data: { tenantId: tenantA, cuentaId: cuenta, nombre: "Bodega" },
      })
    ).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenantA, nombre: "Guardia" } }))
      .id;
    const patron = (
      await e.admin.patronTurno.create({
        data: { tenantId: tenantA, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 },
      })
    ).id;
    const puesto = async (instalacionId: string, nombre: string, hi: string, hf: string) =>
      (
        await e.admin.puesto.create({
          data: {
            tenantId: tenantA,
            instalacionId,
            cargoId: cargo,
            nombre,
            diasTrabajo: 4,
            diasDescanso: 4,
            horaInicio: hi,
            horaFin: hf,
          },
        })
      ).id;
    puesto1 = await puesto(instA, "Portería · Día", "08:00", "20:00");
    puesto2 = await puesto(instA2, "Acceso · Día", "08:00", "20:00");
    puestoOtro = await puesto(instA, "Patio · Día", "08:00", "20:00");
    const persona = async (nombres: string, rut: string, instalacionId: string) => {
      const id = (
        await e.admin.persona.create({
          data: { tenantId: tenantA, nombres, apellidos: "Prueba", rut, estado: "activa" },
        })
      ).id;
      await e.admin.vinculoLaboral.create({
        data: {
          tenantId: tenantA,
          personaId: id,
          cargoId: cargo,
          instalacionId,
          tipo: "indefinido",
          inicio: new Date("2026-01-01"),
          estado: "vigente",
        },
      });
      return id;
    };
    juan = await persona("Juan", "11.111.111-1", instA);
    ana = await persona("Ana", "12.121.212-1", instA);
    // Juan es titular de dos puestos en ciclos que no se tocan (día 1-4 y 5-8); Ana, de un tercero.
    const fijar = async (puestoId: string, titular: string, inicioCiclo: string) => {
      const r = await run(ctx(tenantA), "pauta.series.fijar", {
        puestoId,
        patronId: patron,
        inicioCiclo,
        titularPersonaId: titular,
        desde: inicio,
      });
      expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
    };
    await fijar(puesto1, juan, inicio);
    // En la Bodega Juan es titular por una serie cargada directo (en la vida real, con su contrato de esa instalación).
    await e.admin.seriePauta.create({
      data: {
        tenantId: tenantA,
        puestoId: puesto2,
        patronId: patron,
        inicioCiclo: new Date(`${dia(5)}T00:00:00Z`),
        titularPersonaId: juan,
        vigenteDesde: new Date(`${inicio}T00:00:00Z`),
      },
    });
    await fijar(puestoOtro, ana, inicio);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const licencia = { tipo: "licencia", motivo: "Licencia médica", desde: inicio, hasta: dia(8) };

  it("la vista previa reparte los turnos de la persona por puesto y no escribe", async () => {
    const r = await run(
      ctx(tenantA),
      "pauta.ausencias.registrar",
      { personaId: juan, ...licencia },
      { dryRun: true },
    );
    expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
    const d = (r as Ok<{ dias: number; puestos: { puestoId: string; dias: number }[] }>).data;
    expect(d.dias).toBe(8);
    expect(d.puestos.map((p) => p.puestoId).sort()).toEqual([puesto1, puesto2].sort());
    expect(await e.admin.excepcionPauta.count({ where: { personaId: juan } })).toBe(0);
  });

  it("registra en todos sus puestos, solo con Juan como persona, y se ve en la pauta y en la ficha", async () => {
    const r = await run(ctx(tenantA), "pauta.ausencias.registrar", {
      personaId: juan,
      ...licencia,
    });
    expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
    const filas = await e.admin.excepcionPauta.findMany({
      where: { tenantId: tenantA, estado: "activa" },
    });
    expect(filas).toHaveLength(8);
    expect(new Set(filas.map((f) => f.personaId))).toEqual(new Set([juan]));
    const lista = await run(ctx(tenantA), "pauta.ausencias.listar", { personaId: juan });
    const g = (
      lista as Ok<{
        grupos: { tipo: string; dias: number; instalaciones: string[]; estado: string }[];
      }>
    ).data.grupos;
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ tipo: "licencia", dias: 8, estado: "activa" });
    expect(g[0]!.instalaciones.sort()).toEqual(["Bodega", "Planta"]);
  });

  it("repetir las mismas fechas choca y no deja nada a medias", async () => {
    const r = await run(ctx(tenantA), "pauta.ausencias.registrar", {
      personaId: juan,
      ...licencia,
      tipo: "permiso",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(
      await e.admin.excepcionPauta.count({ where: { personaId: juan, tipo: "permiso" } }),
    ).toBe(0);
  });

  it("sin turnos en esas fechas se rechaza con un mensaje claro", async () => {
    const lejos = await run(ctx(tenantA), "pauta.ausencias.registrar", {
      personaId: ana,
      tipo: "permiso",
      motivo: "Trámite",
      desde: dia(5),
      hasta: dia(8),
    });
    expect(lejos).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("otro tenant y un supervisor sin la instalación no ven ni registran a la persona", async () => {
    const otro = await run(ctx(tenantB), "pauta.ausencias.listar", { personaId: juan });
    expect(otro).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const sup = await run(ctx(tenantA, { instalaciones: [instA2] }), "pauta.ausencias.registrar", {
      personaId: ana,
      tipo: "permiso",
      motivo: "Trámite",
      desde: inicio,
    });
    expect(sup).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("anular deja la licencia de Juan anulada y no toca la de Ana", async () => {
    const deAna = await run(ctx(tenantA), "pauta.ausencias.registrar", {
      personaId: ana,
      tipo: "vacaciones",
      motivo: "Vacaciones",
      desde: inicio,
      hasta: dia(4),
    });
    expect(deAna, JSON.stringify(deAna)).toMatchObject({ ok: true });
    const r = await run(ctx(tenantA), "pauta.ausencias.anular", {
      personaId: juan,
      tipo: "licencia",
      desde: inicio,
      hasta: dia(8),
    });
    expect(r).toMatchObject({ ok: true, data: { anuladas: 8 } });
    expect(
      await e.admin.excepcionPauta.count({ where: { personaId: juan, estado: "activa" } }),
    ).toBe(0);
    expect(
      await e.admin.excepcionPauta.count({ where: { personaId: ana, estado: "activa" } }),
    ).toBe(4);
    const otraVez = await run(ctx(tenantA), "pauta.ausencias.anular", {
      personaId: juan,
      tipo: "licencia",
      desde: inicio,
      hasta: dia(8),
    });
    expect(otraVez).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("anular un registro no toca otro del mismo tipo que se cruza en sus fechas", async () => {
    // Dos permisos de Juan que se intercalan: uno en sus turnos de la Planta (días 1-4) y otro en la Bodega (5-8).
    const a = await run(ctx(tenantA), "pauta.ausencias.registrar", {
      personaId: juan,
      tipo: "permiso",
      motivo: "Trámite A",
      desde: inicio,
      hasta: dia(4),
    });
    const b = await run(ctx(tenantA), "pauta.ausencias.registrar", {
      personaId: juan,
      tipo: "permiso",
      motivo: "Trámite B",
      desde: dia(5),
      hasta: dia(8),
    });
    expect([a.ok, b.ok]).toEqual([true, true]);
    const lista = await run(ctx(tenantA), "pauta.ausencias.listar", { personaId: juan });
    const g = (
      lista as Ok<{
        grupos: {
          motivo: string;
          estado: string;
          registradaEn: string;
          desde: string;
          hasta: string;
        }[];
      }>
    ).data.grupos;
    const primero = g.find((x) => x.motivo === "Trámite A" && x.estado === "activa")!;
    const r = await run(ctx(tenantA), "pauta.ausencias.anular", {
      personaId: juan,
      tipo: "permiso",
      desde: inicio,
      hasta: dia(8),
      registradaEn: primero.registradaEn,
    });
    expect(r).toMatchObject({ ok: true, data: { anuladas: 4 } });
    expect(
      await e.admin.excepcionPauta.count({
        where: { personaId: juan, tipo: "permiso", estado: "activa", motivo: "Trámite B" },
      }),
    ).toBe(4);
  });

  it("el registro de la persona vive en el Núcleo y enlaza sus turnos (CAR-393)", async () => {
    const r = await run(ctx(tenantA), "pauta.ausencias.registrar", {
      personaId: ana,
      tipo: "vacaciones",
      motivo: "Vacaciones de verano",
      desde: dia(17),
      hasta: dia(24),
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const id = (r as Ok<{ ausenciaId: string; dias: number }>).data.ausenciaId;
    const a = await e.admin.ausencia.findUnique({ where: { id } });
    expect(a).toMatchObject({ personaId: ana, tipo: "vacaciones", estado: "aprobada" });
    const turnos = await e.admin.excepcionPauta.count({ where: { ausenciaId: id } });
    expect(turnos).toBe((r as Ok<{ dias: number }>).data.dias);
    const lista = (await run(ctx(tenantA), "pauta.ausencias.listar", { personaId: ana })) as Ok<{
      grupos: { ausenciaId: string; dias: number; estado: string }[];
    }>;
    expect(lista.data.grupos.find((g) => g.ausenciaId === id)).toMatchObject({
      dias: turnos,
      estado: "activa",
    });
  });

  it("anular algunos días deja el registro aprobado; anular todos lo anula (CAR-393)", async () => {
    const lista = (await run(ctx(tenantA), "pauta.ausencias.listar", { personaId: ana })) as Ok<{
      grupos: { ausenciaId: string; tipo: string; desde: string; hasta: string }[];
    }>;
    const g = lista.data.grupos.find((x) => x.tipo === "vacaciones")!;
    const parcial = await run(ctx(tenantA), "pauta.ausencias.anular", {
      personaId: ana,
      tipo: "vacaciones",
      desde: g.desde,
      hasta: g.desde,
      ausenciaId: g.ausenciaId,
    });
    expect(parcial.ok, JSON.stringify(parcial)).toBe(true);
    expect((await e.admin.ausencia.findUnique({ where: { id: g.ausenciaId } }))?.estado).toBe(
      "aprobada",
    );
    const total = await run(ctx(tenantA), "pauta.ausencias.anular", {
      personaId: ana,
      tipo: "vacaciones",
      desde: g.desde,
      hasta: g.hasta,
      ausenciaId: g.ausenciaId,
    });
    expect(total.ok, JSON.stringify(total)).toBe(true);
    expect((await e.admin.ausencia.findUnique({ where: { id: g.ausenciaId } }))?.estado).toBe(
      "anulada",
    );
  });
});
