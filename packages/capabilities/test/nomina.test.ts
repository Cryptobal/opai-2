// Brief 25 · Nómina PR 1: períodos, novedades, préstamos con plan de cuotas (B3), anticipo
// quincenal (B2), conceptos y calendario. Permisos por rol (el bloqueo financiero deja fuera a
// gerente, supervisor y viewer), dryRun, idempotencia y auditoría de lecturas personales. El
// aislamiento entre tenants se prueba con Postgres real en nomina-db.test.ts y packages/db.
import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  capacidadesNomina,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { TENANT_DE_PRUEBA, contextoDePrueba } from "../src/testing";
import { semillaTenant } from "./semilla";

const P1 = "0192f3a0-0000-7000-8000-00000000d201";
const P2 = "0192f3a0-0000-7000-8000-00000000d202";

const semilla = () => ({
  ...semillaTenant(),
  persona: [
    { id: P1, tenantId: TENANT_DE_PRUEBA, nombres: "Camila", apellidos: "Herrera", rut: "11.111.111-1", estado: "activa" },
    { id: P2, tenantId: TENANT_DE_PRUEBA, nombres: "Luis", apellidos: "Pérez", rut: "22.222.222-2", estado: "activa" },
  ],
});
const como = (rol: "owner" | "admin" | "gerente" | "supervisor" | "viewer" = "owner") =>
  contextoDePrueba({ rol, portal: "erp", modulosActivos: ["nomina"], semilla: semilla() });
type Ctx = ReturnType<typeof como>;

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesNomina]);
});

const run = (c: Ctx, id: string, input: unknown, opts?: { dryRun?: boolean }) =>
  executeCapability(c.ctx, id, input, opts);
const data = <T>(r: Awaited<ReturnType<typeof run>>) => {
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data as T;
};
const abrir = async (c: Ctx, mes = 11) =>
  data<{ id: string }>(await run(c, "nomina.periodos.abrir", { anio: 2026, mes }));

describe("períodos", () => {
  it("abre un mes con cierre previsto y crea sus tres obligaciones mensuales", async () => {
    const c = como();
    const p = data<{ estado: string; cierrePrevisto: string; etiqueta: string }>(
      await run(c, "nomina.periodos.abrir", { anio: 2026, mes: 2 }),
    );
    expect(p).toMatchObject({ estado: "abierto", etiqueta: "Febrero 2026", cierrePrevisto: "2026-02-28" });
    expect((c.tabla("nominaObligacion") as { tipo: string }[]).map((o) => o.tipo).sort()).toEqual([
      "f29_retencion",
      "lre",
      "previred",
    ]);
  });

  it("un mes tiene un solo período (CONFLICT) y dryRun no persiste", async () => {
    const c = como();
    expect((await run(c, "nomina.periodos.abrir", { anio: 2026, mes: 11 }, { dryRun: true })).ok).toBe(true);
    expect(c.tabla("nominaPeriodo")).toHaveLength(0);
    await abrir(c);
    expect(await run(c, "nomina.periodos.abrir", { anio: 2026, mes: 11 })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
  });

  it("avanza, no salta etapas y devolver exige motivo", async () => {
    const c = como();
    const { id } = await abrir(c);
    expect(await run(c, "nomina.periodos.cambiar_estado", { id, a: "cerrado" })).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "en_revision" }));
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "cerrado" }));
    expect(await run(c, "nomina.periodos.cambiar_estado", { id, a: "en_revision" })).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
    const r = data<{ estado: string; motivoReapertura: string }>(
      await run(c, "nomina.periodos.cambiar_estado", { id, a: "en_revision", motivo: "Falta una licencia" }),
    );
    expect(r).toMatchObject({ estado: "en_revision", motivoReapertura: "Falta una licencia" });
  });

  it("marcar pagado exige período cerrado y no se deshace", async () => {
    const c = como();
    const { id } = await abrir(c);
    expect(await run(c, "nomina.periodos.marcar_pagado", { id })).toMatchObject({ ok: false });
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "en_revision" }));
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "cerrado" }));
    expect(data<{ estado: string }>(await run(c, "nomina.periodos.marcar_pagado", { id })).estado).toBe("pagado");
    expect(await run(c, "nomina.periodos.cambiar_estado", { id, a: "en_revision", motivo: "Reabrir pagado" })).toMatchObject({
      ok: false,
    });
  });
});

describe("novedades", () => {
  const licencia = (periodoId: string) => ({
    periodoId,
    personaId: P1,
    tipo: "licencia",
    fechaDesde: "2026-11-03",
    fechaHasta: "2026-11-07",
    cantidad: 5,
  });

  it("registra por unidad según el tipo y rechaza la unidad equivocada", async () => {
    const c = como();
    const { id } = await abrir(c);
    expect(data<{ personaNombre: string }>(await run(c, "nomina.novedades.crear", licencia(id))).personaNombre).toBe(
      "Herrera, Camila",
    );
    expect(await run(c, "nomina.novedades.crear", { ...licencia(id), cantidad: undefined, montoClp: 5000 })).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
    expect(
      await run(c, "nomina.novedades.crear", { periodoId: id, personaId: P1, tipo: "descuento", fechaDesde: "2026-11-10", cantidad: 2 }),
    ).toMatchObject({ ok: false });
  });

  it("no acepta tipo préstamo manual ni fechas fuera del mes ni períodos cerrados", async () => {
    const c = como();
    const { id } = await abrir(c);
    expect(
      (await run(c, "nomina.novedades.crear", { periodoId: id, personaId: P1, tipo: "prestamo", fechaDesde: "2026-11-10", montoClp: 1000 })).ok,
    ).toBe(false);
    expect((await run(c, "nomina.novedades.crear", { ...licencia(id), fechaDesde: "2026-12-03", fechaHasta: "2026-12-07" })).ok).toBe(false);
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "en_revision" }));
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "cerrado" }));
    expect(await run(c, "nomina.novedades.crear", licencia(id))).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("la carga masiva es todo o nada e indica la fila con error", async () => {
    const c = como();
    const { id } = await abrir(c);
    const buena = { personaId: P1, tipo: "horas_extra", fechaDesde: "2026-11-04", cantidad: 3 };
    const mala = { personaId: "0192f3a0-0000-7000-8000-00000000dead", tipo: "ausencia", fechaDesde: "2026-11-05", cantidad: 1 };
    const r = await run(c, "nomina.novedades.cargar", { periodoId: id, novedades: [buena, mala] });
    expect(r).toMatchObject({ ok: false, error: { message: expect.stringContaining("Fila 2") } });
    expect(c.tabla("nominaNovedad")).toHaveLength(0);
    expect(data<{ creadas: number }>(await run(c, "nomina.novedades.cargar", { periodoId: id, novedades: [buena] })).creadas).toBe(1);
  });

  it("anula con motivo, no la lista por defecto y la lectura queda auditada por IDs", async () => {
    const c = como();
    const { id } = await abrir(c);
    const n = data<{ id: string }>(await run(c, "nomina.novedades.crear", licencia(id)));
    data(await run(c, "nomina.novedades.anular", { id: n.id, motivo: "Cargada por error" }));
    expect(data<unknown[]>(await run(c, "nomina.novedades.listar", { periodoId: id }))).toHaveLength(0);
    expect(data<unknown[]>(await run(c, "nomina.novedades.listar", { periodoId: id, incluirAnuladas: true }))).toHaveLength(1);
    const lectura = c.eventos.filter((e) => e.capability === "nomina.novedades.listar");
    expect(lectura.length).toBeGreaterThan(0);
    expect(JSON.stringify(lectura)).not.toContain("Herrera");
  });
});

describe("préstamos con plan de cuotas (B3)", () => {
  const prestamo = { personaId: P1, montoTotal: 100_000, cuotas: 2, primeraCuotaAnio: 2026, primeraCuotaMes: 11 };

  it("crea el plan en enteros que suma el total y dryRun no persiste", async () => {
    const c = como();
    expect((await run(c, "nomina.prestamos.crear", prestamo, { dryRun: true })).ok).toBe(true);
    expect(c.tabla("nominaPrestamo")).toHaveLength(0);
    const p = data<{ saldo: number; plan: { monto: number; mes: number }[] }>(await run(c, "nomina.prestamos.crear", prestamo));
    expect(p.plan.map((x) => [x.mes, x.monto])).toEqual([[11, 50_000], [12, 50_000]]);
    expect(p.saldo).toBe(100_000);
  });

  it("aplica la cuota del mes sin repetirla y al cerrar el período la deja descontada", async () => {
    const c = como();
    const { id } = await abrir(c);
    const p = data<{ id: string }>(await run(c, "nomina.prestamos.crear", { ...prestamo, cuotas: 1 }));
    expect(data<{ generadas: number }>(await run(c, "nomina.prestamos.aplicar_cuotas", { periodoId: id })).generadas).toBe(1);
    expect(data<{ generadas: number; yaExistentes: number }>(await run(c, "nomina.prestamos.aplicar_cuotas", { periodoId: id }))).toMatchObject({
      generadas: 0,
      yaExistentes: 1,
    });
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "en_revision" }));
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "cerrado" }));
    const [saldado] = data<{ estado: string; saldo: number }[]>(await run(c, "nomina.prestamos.listar", {}));
    expect(saldado).toMatchObject({ estado: "pagado", saldo: 0 });
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "en_revision", motivo: "Corregir cuota" }));
    expect(data<{ estado: string }[]>(await run(c, "nomina.prestamos.listar", {}))[0]?.estado).toBe("activo");
    expect(p.id).toBeTruthy();
  });

  it("cancelar condona las cuotas pendientes y anula la novedad abierta", async () => {
    const c = como();
    const { id } = await abrir(c);
    const p = data<{ id: string }>(await run(c, "nomina.prestamos.crear", prestamo));
    data(await run(c, "nomina.prestamos.aplicar_cuotas", { periodoId: id }));
    const r = data<{ estado: string; saldo: number }>(await run(c, "nomina.prestamos.cancelar", { id: p.id, motivo: "Acuerdo con el trabajador" }));
    expect(r).toMatchObject({ estado: "cancelado", saldo: 0 });
    expect((c.tabla("nominaNovedad") as { estado: string }[])[0]?.estado).toBe("anulada");
  });

  it("cancelar rechaza también en vista previa si una cuota ya está en un período cerrado", async () => {
    const c = como();
    const { id } = await abrir(c);
    const p = data<{ id: string }>(await run(c, "nomina.prestamos.crear", prestamo));
    data(await run(c, "nomina.prestamos.aplicar_cuotas", { periodoId: id }));
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "en_revision" }));
    data(await run(c, "nomina.periodos.cambiar_estado", { id, a: "cerrado" }));
    // Estado que dejaría una carrera: cuota pendiente con su novedad vigente en un período cerrado.
    for (const cuota of c.tabla("nominaCuota") as { estado: string }[]) cuota.estado = "pendiente";
    const entrada = { id: p.id, motivo: "Acuerdo con el trabajador" };
    for (const dryRun of [true, false])
      expect(await run(c, "nomina.prestamos.cancelar", entrada, { dryRun })).toMatchObject({
        ok: false,
        error: { code: "UNPROCESSABLE" },
      });
    expect((c.tabla("nominaPrestamo") as { estado: string }[])[0]?.estado).not.toBe("cancelado");
    expect((c.tabla("nominaNovedad") as { estado: string }[])[0]?.estado).toBe("vigente");
  });
});

describe("anticipo quincenal (B2)", () => {
  it("genera una vez por regla activa de monto fijo y no repite; omite porcentaje", async () => {
    const c = como();
    const { id } = await abrir(c);
    data(await run(c, "nomina.anticipos.fijar_regla", { personaId: P1, valor: 150_000 }));
    data(await run(c, "nomina.anticipos.fijar_regla", { personaId: P2, modo: "porcentaje_base", valor: 3000 }));
    const a = data<{ generadas: number; omitidas: { motivo: string }[] }>(await run(c, "nomina.anticipos.generar", { periodoId: id }));
    expect(a).toMatchObject({ generadas: 1, omitidas: [{ motivo: "requiere_sueldo_base" }] });
    expect(data<{ generadas: number; yaExistentes: number }>(await run(c, "nomina.anticipos.generar", { periodoId: id }))).toMatchObject({
      generadas: 0,
      yaExistentes: 1,
    });
    const n = c.tabla("nominaNovedad") as { tipo: string; origen: string; montoClp: number }[];
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ tipo: "anticipo", origen: "anticipo_quincenal", montoClp: 150_000 });
  });

  it("una sola regla por persona: fijar de nuevo la actualiza", async () => {
    const c = como();
    data(await run(c, "nomina.anticipos.fijar_regla", { personaId: P1, valor: 100_000 }));
    data(await run(c, "nomina.anticipos.fijar_regla", { personaId: P1, valor: 120_000, diaMes: 20 }));
    expect(c.tabla("nominaReglaAnticipo")).toHaveLength(1);
    expect(c.tabla("nominaReglaAnticipo")[0]).toMatchObject({ valor: 120_000, diaMes: 20 });
  });
});

describe("conceptos y calendario", () => {
  it("el código LRE queda siempre sin verificar", async () => {
    const c = como();
    const k = data<{ lreVerificado: boolean }>(
      await run(c, "nomina.conceptos.crear", { codigo: "gratificacion", tipo: "haber", nombre: "Gratificación", imponible: true, tributable: true, codigoLre: "1101" }),
    );
    expect(k.lreVerificado).toBe(false);
  });

  it("genera el calendario del año una sola vez y el plazo solo se informa verificado", async () => {
    const c = como();
    expect(data<{ creadas: number }>(await run(c, "nomina.obligaciones.generar_calendario", { anio: 2026 })).creadas).toBe(38);
    expect(data<{ creadas: number }>(await run(c, "nomina.obligaciones.generar_calendario", { anio: 2026 })).creadas).toBe(0);
    const [o] = data<{ id: string; plazo: string | null }[]>(await run(c, "nomina.obligaciones.listar", { anio: 2026 }));
    if (!o) throw new Error("sin obligaciones");
    expect(await run(c, "nomina.obligaciones.actualizar", { id: o.id, plazoVerificado: true })).toMatchObject({ ok: false });
    const suelto = data<{ plazo: string | null }>(await run(c, "nomina.obligaciones.actualizar", { id: o.id, fechaLimite: "2026-12-13" }));
    expect(suelto.plazo).toBeNull();
    expect(data<{ plazo: string | null }>(await run(c, "nomina.obligaciones.actualizar", { id: o.id, plazoVerificado: true })).plazo).toBe("2026-12-13");
  });
});

describe("permisos por rol", () => {
  it("admin opera todo; gerente, supervisor y viewer quedan fuera de Nómina", async () => {
    expect((await run(como("admin"), "nomina.periodos.listar", {})).ok).toBe(true);
    for (const rol of ["gerente", "supervisor", "viewer"] as const) {
      for (const id of ["nomina.periodos.listar", "nomina.novedades.listar", "nomina.prestamos.listar"])
        expect(await run(como(rol), id, { periodoId: P1 }), `${rol} ${id}`).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
  });

  it("un rol con solo lectura no escribe ni lee datos personales", async () => {
    const { ctx } = contextoDePrueba({ permisos: ["nomina:read"], portal: "erp", modulosActivos: ["nomina"], semilla: semilla() });
    expect((await executeCapability(ctx, "nomina.periodos.listar", {})).ok).toBe(true);
    expect(await executeCapability(ctx, "nomina.periodos.abrir", { anio: 2026, mes: 5 })).toMatchObject({ error: { code: "FORBIDDEN" } });
    expect(await executeCapability(ctx, "nomina.prestamos.listar", {})).toMatchObject({ error: { code: "FORBIDDEN" } });
  });
});
