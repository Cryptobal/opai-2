// Brief 25 · Nómina PR 1: aislamiento entre tenants y reglas de integridad de las tablas `nomina.*`
// contra Postgres real (si hay DATABASE_URL_TEST). La RLS `tenant_isolation` debe impedir que el
// owner de un tenant vea o use períodos, novedades, préstamos o personas de otro, aun pasando el id
// directo; los CHECK, los índices parciales y el trigger de mismo tenant protegen lo demás.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("aislamiento entre tenants · Nómina (RLS)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantA = "";
  let tenantB = "";
  let personaA = "";
  let personaB = "";
  let periodoA = "";
  let periodoB = "";
  const medidor = { registrar: async () => undefined };

  const ctxOwner = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos: ["nomina"],
      medidor,
    });
  const run = (tenantId: string, id: string, input: unknown) =>
    mod.executeCapability(ctxOwner(tenantId), id, input);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesNomina]);
    const tenant = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } })).id;
    tenantA = await tenant("nomina-a");
    tenantB = await tenant("nomina-b");
    const persona = async (tenantId: string, rut: string) =>
      (await e.admin.persona.create({ data: { tenantId, nombres: "Persona", apellidos: "Prueba", rut, estado: "activa" } })).id;
    personaA = await persona(tenantA, "11.111.111-1");
    personaB = await persona(tenantB, "22.222.222-2");
    const fechas = { inicio: new Date("2026-11-01"), fin: new Date("2026-11-30"), cierrePrevisto: new Date("2026-11-30") };
    periodoA = (await e.admin.nominaPeriodo.create({ data: { tenantId: tenantA, anio: 2026, mes: 11, ...fechas } })).id;
    periodoB = (await e.admin.nominaPeriodo.create({ data: { tenantId: tenantB, anio: 2026, mes: 11, ...fechas } })).id;
    await e.admin.nominaNovedad.create({
      data: { tenantId: tenantB, periodoId: periodoB, personaId: personaB, tipo: "licencia", fechaDesde: new Date("2026-11-03"), cantidad: 3 },
    });
    await e.admin.nominaPrestamo.create({
      data: { tenantId: tenantB, personaId: personaB, montoTotal: 90_000, cuotas: 3, primeraCuotaAnio: 2026, primeraCuotaMes: 11 },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el owner de B ve sus períodos, novedades y préstamos (control)", async () => {
    const p = await run(tenantB, "nomina.periodos.listar", {});
    expect(p.ok && (p.data as { novedades: number }[])[0]?.novedades).toBe(1);
    const n = await run(tenantB, "nomina.novedades.listar", { periodoId: periodoB });
    expect(n.ok && (n.data as unknown[]).length).toBe(1);
    const pr = await run(tenantB, "nomina.prestamos.listar", {});
    expect(pr.ok && (pr.data as unknown[]).length).toBe(1);
  });

  it("el owner de A no ve nada de B por las listas ni por id directo", async () => {
    const p = await run(tenantA, "nomina.periodos.listar", {});
    expect(p.ok && (p.data as { id: string }[]).map((x) => x.id)).toEqual([periodoA]);
    expect(await run(tenantA, "nomina.novedades.listar", { periodoId: periodoB })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const pr = await run(tenantA, "nomina.prestamos.listar", { personaId: personaB });
    expect(pr.ok && (pr.data as unknown[]).length).toBe(0);
    expect(await run(tenantA, "nomina.periodos.cambiar_estado", { id: periodoB, a: "en_revision" })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("A no puede cargar una novedad ni un préstamo con una persona de B", async () => {
    const nov = await run(tenantA, "nomina.novedades.crear", {
      periodoId: periodoA, personaId: personaB, tipo: "horas_extra", fechaDesde: "2026-11-05", cantidad: 2,
    });
    expect(nov).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const pre = await run(tenantA, "nomina.prestamos.crear", {
      personaId: personaB, montoTotal: 50_000, cuotas: 2, primeraCuotaAnio: 2026, primeraCuotaMes: 12,
    });
    expect(pre).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el trigger de mismo tenant rechaza una novedad de A con persona de B aunque se salte la capacidad", async () => {
    await expect(
      e.admin.nominaNovedad.create({
        data: { tenantId: tenantA, periodoId: periodoA, personaId: personaB, tipo: "licencia", fechaDesde: new Date("2026-11-03"), cantidad: 1 },
      }),
    ).rejects.toThrow();
  });

  it("los CHECK impiden unidad equivocada y fechas invertidas", async () => {
    const base = { tenantId: tenantA, periodoId: periodoA, personaId: personaA, fechaDesde: new Date("2026-11-10") };
    await expect(e.admin.nominaNovedad.create({ data: { ...base, tipo: "licencia", montoClp: 1000 } })).rejects.toThrow();
    await expect(e.admin.nominaNovedad.create({ data: { ...base, tipo: "anticipo", cantidad: 2 } })).rejects.toThrow();
    await expect(
      e.admin.nominaNovedad.create({ data: { ...base, tipo: "licencia", cantidad: 2, fechaHasta: new Date("2026-11-01") } }),
    ).rejects.toThrow();
  });

  it("un mes tiene un solo período y un concepto un solo código por empresa (CONFLICT)", async () => {
    expect(await run(tenantA, "nomina.periodos.abrir", { anio: 2026, mes: 11 })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    const concepto = { codigo: "bono_prueba", tipo: "haber", nombre: "Bono", imponible: true, tributable: true };
    expect((await run(tenantA, "nomina.conceptos.crear", concepto)).ok).toBe(true);
    expect(await run(tenantA, "nomina.conceptos.crear", concepto)).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect((await run(tenantB, "nomina.conceptos.crear", concepto)).ok).toBe(true);
  });

  it("el anticipo quincenal es idempotente también contra el índice parcial", async () => {
    expect((await run(tenantA, "nomina.anticipos.fijar_regla", { personaId: personaA, valor: 120_000 })).ok).toBe(true);
    const a = await run(tenantA, "nomina.anticipos.generar", { periodoId: periodoA });
    const b = await run(tenantA, "nomina.anticipos.generar", { periodoId: periodoA });
    expect(a.ok && (a.data as { generadas: number }).generadas).toBe(1);
    expect(b.ok && (b.data as { generadas: number; yaExistentes: number })).toMatchObject({ generadas: 0, yaExistentes: 1 });
  });

  it("flujo de préstamo: cuota aplicada, período cerrado → cuota descontada, préstamo saldado", async () => {
    const pr = await run(tenantA, "nomina.prestamos.crear", {
      personaId: personaA, montoTotal: 30_000, cuotas: 1, primeraCuotaAnio: 2026, primeraCuotaMes: 11,
    });
    expect(pr.ok).toBe(true);
    const ap = await run(tenantA, "nomina.prestamos.aplicar_cuotas", { periodoId: periodoA });
    expect(ap.ok && (ap.data as { generadas: number }).generadas).toBe(1);
    expect((await run(tenantA, "nomina.periodos.cambiar_estado", { id: periodoA, a: "en_revision" })).ok).toBe(true);
    expect((await run(tenantA, "nomina.periodos.cambiar_estado", { id: periodoA, a: "cerrado" })).ok).toBe(true);
    const lista = await run(tenantA, "nomina.prestamos.listar", {});
    expect(lista.ok && (lista.data as { estado: string; saldo: number }[])[0]).toMatchObject({ estado: "pagado", saldo: 0 });
  });

  // Pendientes del Revisor de #183: las escrituras se serializan con bloqueos de fila y revalidan el
  // estado ya bloqueado. Una transacción externa retiene el `FOR UPDATE`, la capacidad espera, y al
  // soltarlo ve el estado nuevo.
  const retener = async (tabla: "periodos" | "prestamos", id: string, cambio: (tx: typeof e.admin) => Promise<void>) => {
    let liberar!: () => void;
    let tomado!: () => void;
    const espera = new Promise<void>((r) => (liberar = r));
    const listo = new Promise<void>((r) => (tomado = r));
    const sql = tabla === "periodos" ? "SELECT id FROM nomina.periodos WHERE id = $1::uuid FOR UPDATE" : "SELECT id FROM nomina.prestamos WHERE id = $1::uuid FOR UPDATE";
    const tx = e.admin.$transaction(
      async (t) => {
        await t.$queryRawUnsafe(sql, id);
        tomado();
        await espera;
        await cambio(t as unknown as typeof e.admin);
      },
      { timeout: 30_000 },
    );
    await listo;
    return { liberar, tx };
  };
  const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const periodoNuevo = async (mes: number, anio = 2027) =>
    (
      await e.admin.nominaPeriodo.create({
        data: {
          tenantId: tenantA, anio, mes,
          inicio: new Date(Date.UTC(anio, mes - 1, 1)), fin: new Date(Date.UTC(anio, mes, 0)),
          cierrePrevisto: new Date(Date.UTC(anio, mes, 0)),
        },
      })
    ).id;

  it("crear una novedad espera el bloqueo del período y se rechaza si entre tanto se cerró", async () => {
    const id = await periodoNuevo(1);
    const { liberar, tx } = await retener("periodos", id, async (t) => {
      await t.nominaPeriodo.update({ where: { id }, data: { estado: "cerrado" } });
    });
    let resuelta = false;
    const crear = run(tenantA, "nomina.novedades.crear", {
      periodoId: id, personaId: personaA, tipo: "horas_extra", fechaDesde: "2027-01-05", cantidad: 2,
    }).then((r) => ((resuelta = true), r));
    await pausa(700);
    expect(resuelta, "debe esperar el bloqueo del período").toBe(false);
    liberar();
    await tx;
    expect(await crear).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await e.admin.nominaNovedad.count({ where: { periodoId: id } })).toBe(0);
  });

  it("cancelar un préstamo espera su bloqueo y revalida que siga activo", async () => {
    const periodo = await periodoNuevo(2);
    const pr = await run(tenantA, "nomina.prestamos.crear", {
      personaId: personaA, montoTotal: 40_000, cuotas: 2, primeraCuotaAnio: 2027, primeraCuotaMes: 2,
    });
    const id = pr.ok ? (pr.data as { id: string }).id : "";
    expect(id).not.toBe("");
    expect((await run(tenantA, "nomina.prestamos.aplicar_cuotas", { periodoId: periodo })).ok).toBe(true);
    const { liberar, tx } = await retener("prestamos", id, async (t) => {
      await t.nominaPrestamo.update({ where: { id }, data: { estado: "cancelado" } });
    });
    let resuelta = false;
    const cancelar = run(tenantA, "nomina.prestamos.cancelar", { id, motivo: "Acuerdo con el trabajador" }).then(
      (r) => ((resuelta = true), r),
    );
    await pausa(700);
    expect(resuelta, "debe esperar el bloqueo del préstamo").toBe(false);
    liberar();
    await tx;
    expect(await cancelar).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("aplicar cuotas no convierte en novedad una cuota condonada mientras esperaba el bloqueo", async () => {
    const periodo = await periodoNuevo(3);
    const pr = await run(tenantA, "nomina.prestamos.crear", {
      personaId: personaA, montoTotal: 30_000, cuotas: 1, primeraCuotaAnio: 2027, primeraCuotaMes: 3,
    });
    const id = pr.ok ? (pr.data as { id: string }).id : "";
    const { liberar, tx } = await retener("prestamos", id, async (t) => {
      await t.nominaCuota.updateMany({ where: { prestamoId: id }, data: { estado: "condonada" } });
      await t.nominaPrestamo.update({ where: { id }, data: { estado: "cancelado" } });
    });
    let resuelta = false;
    const aplicar = run(tenantA, "nomina.prestamos.aplicar_cuotas", { periodoId: periodo }).then(
      (r) => ((resuelta = true), r),
    );
    await pausa(700);
    expect(resuelta, "debe esperar el bloqueo del préstamo").toBe(false);
    liberar();
    await tx;
    const r = await aplicar;
    expect(r.ok && (r.data as { generadas: number }).generadas).toBe(0);
    expect(await e.admin.nominaNovedad.count({ where: { periodoId: periodo } })).toBe(0);
  });
});
