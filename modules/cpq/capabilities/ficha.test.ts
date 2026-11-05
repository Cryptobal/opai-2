import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { publicacionesReferencia } from "../../../packages/domain/src/remuneraciones/referencia.fixture";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import * as proveedor from "../persistencia/proveedor";
import * as valoresLegales from "../persistencia/valores-legales";
import { AVISO_FALTA_UF } from "../persistencia/recalcular";
import { AVISO_SIN_CALCULO } from "../persistencia/calculo-congelado";
import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

function ctxGestor(conCostos = false) {
  return contextoDePrueba({
    semilla: semilla(),
    modulosActivos: ACTIVOS,
    permisos: conCostos ? [...GESTOR, ...CON_COSTOS] : GESTOR,
  });
}

describe("cpq ficha y líneas (CAR-134)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("dry_run de línea no escribe; borrador sí; enviada no", async () => {
    const { ctx } = ctxGestor(true);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Ficha prueba",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const ficha = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    expect(ficha.ok).toBe(true);
    if (!ficha.ok) throw new Error("ficha");
    const sec = (ficha.data as { secciones: { id: string }[] }).secciones[0];
    expect(sec).toBeTruthy();
    const prev = await executeCapability(
      ctx,
      "cpq.lineas.crear",
      { seccionId: sec!.id, tipo: "puesto", nombre: "Guardia", sueldoBaseClp: 700_000 },
      { dryRun: true },
    );
    expect(prev.ok).toBe(true);
    expect(await ctx.db.cpqLinea.count()).toBe(0);
    mockMotorLegal();
    const real = await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec!.id,
      tipo: "puesto",
      nombre: "Guardia",
      sueldoBaseClp: 700_000,
    });
    expect(real.ok).toBe(true);
    await ctx.db.cpqVersion.updateMany({ where: { cotizacionId: id }, data: { estado: "enviada" } });
    const bloqueo = await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec!.id,
      tipo: "puesto",
      nombre: "Otra",
    });
    expect(bloqueo).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("sin cpq:costos.ver el cálculo no trae costos ni margen", async () => {
    const { ctx } = ctxGestor();
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Permisos",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const sin = {
      ...ctx,
      autorizar: (p: string) => p === "cpq:cotizaciones.read" || p === "cpq:cotizaciones.manage",
    };
    const r = await executeCapability(sin, "cpq.cotizaciones.calcular", { id });
    const txt = JSON.stringify(r);
    expect(txt).not.toMatch(/costoMensual|margenEfectivo|semaforo|traza/);
    expect(txt).toContain("ventaMensual");
  });

  it("sin valores legales publicados queda no enviable (costo pendiente)", async () => {
    const { ctx } = ctxGestor(true);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Legal" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    expect(f.ok).toBe(true);
    if (!f.ok) throw new Error("ficha");
    const sec = (f.data as { secciones: { id: string }[] }).secciones[0];
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec!.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    const calc = await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    expect(calc.ok).toBe(true);
    if (!calc.ok) throw new Error("calc");
    expect((calc.data as { noEnviable?: boolean }).noEnviable).toBe(true);
    expect((calc.data as { ventaMensual: number | null }).ventaMensual).toBeNull();
  });

  it("con costos y valores legales trae margen", async () => {
    mockMotorLegal();
    const { ctx } = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      permisos: [...GESTOR, ...CON_COSTOS],
    });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Costos" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f.ok) throw new Error("ficha");
    const sec = (f.data as { secciones: { id: string }[] }).secciones[0];
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec!.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    const calc = await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    expect(calc.ok).toBe(true);
    if (!calc.ok) throw new Error("calc");
    expect(JSON.stringify(calc)).toContain("margenEfectivoPct");
    expect((calc.data as { noEnviable?: boolean }).noEnviable).not.toBe(true);
  });

  it("ficha no persiste venta en borrador (use calcular)", async () => {
    mockMotorLegal();
    const { ctx } = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      permisos: [...GESTOR, ...CON_COSTOS],
    });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Dry ficha" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    expect(f0.ok).toBe(true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
    expect(v?.ventaMensualClp).toBeNull();
    await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    const v2 = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
    expect(v2?.ventaMensualClp).not.toBeNull();
  });
});

describe("cpq lineas costos (CAR-134 C5)", () => {
  it("rechaza sueldo o precio sin cpq:costos.ver", async () => {
    const { ctx } = ctxGestor();
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Linea" });
    if (!c.ok) throw new Error("fixture");
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id: (c.data as { id: string }).id });
    if (!f.ok) throw new Error("ficha");
    const sec = (f.data as { secciones: { id: string }[] }).secciones[0]!;
    const sinCostos = { ...ctx, autorizar: (p: string) => GESTOR.includes(p) };
    const bloqueo = await executeCapability(sinCostos, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "X",
      sueldoBaseClp: 500_000,
    });
    expect(bloqueo).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

describe("paridad CPQ (CAR-134)", () => {
  it("R-CPQ-010: versión enviada muestra venta congelada sin recalcular", async () => {
    mockMotorLegal();
    const { ctx } = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      permisos: [...GESTOR, ...CON_COSTOS],
    });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Congelada" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    const congelada = 3_333_333;
    const json = JSON.stringify({ ventaMensual: congelada, pagosUnicos: 0, dotacion: { posiciones: 1, personasEscaladas: 0 }, uf: null, fecha: "2026-12-01", estado: "borrador", advertencias: [], noEnviable: false });
    await ctx.db.cpqVersion.updateMany({
      where: { cotizacionId: id },
      data: { estado: "enviada", ventaMensualClp: congelada, calculoCongeladoJson: json },
    });
    await ctx.db.cpqLinea.updateMany({ data: { sueldoBaseClp: 9_999_999 } });
    vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue([]);
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    expect(f.ok).toBe(true);
    if (!f.ok) throw new Error("ficha");
    expect((f.data as { calculo: { ventaMensual: number | null } }).calculo.ventaMensual).toBe(congelada);
  });

  it("versión enviada sin JSON congelado no inventa margen verde", async () => {
    const { ctx } = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      permisos: [...GESTOR, ...CON_COSTOS],
    });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Sin JSON" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    await ctx.db.cpqVersion.updateMany({
      where: { cotizacionId: id },
      data: { estado: "enviada", ventaMensualClp: 1_000_000, calculoCongeladoJson: null },
    });
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    expect(f.ok).toBe(true);
    if (!f.ok) throw new Error("ficha");
    const calc = (f.data as { calculo: { semaforo?: string; margenEfectivoPct?: number; advertencias?: string[] } })
      .calculo;
    expect(calc.advertencias).toContain(AVISO_SIN_CALCULO);
    expect(calc.semaforo).not.toBe("verde");
    expect(calc.margenEfectivoPct).not.toBe(0);
  });

  it("R-CPQ-028: sin UF del período avisa explícito y no inventa valor", async () => {
    vi.spyOn(proveedor, "juegoParaFecha").mockImplementation(async (_ctx, fecha) => ({
      juego: {
        fecha,
        huella: "test-sin-uf",
        valores: publicacionesReferencia().filter((v) => v.indicador !== "uf"),
        advertencias: [],
      },
    }));
    const { ctx } = ctxGestor(true);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Sin UF" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f0.ok) throw new Error("ficha");
    const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Turno",
      sueldoBaseClp: 650_000,
    });
    const calc = await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    expect(calc.ok).toBe(true);
    if (!calc.ok) throw new Error("calc");
    const data = calc.data as { advertencias?: string[]; uf?: unknown; noEnviable?: boolean };
    expect(data.advertencias).toContain(AVISO_FALTA_UF);
    expect(data.uf).toBeNull();
    expect(data.noEnviable).toBe(true);
  });
});

describe("márgenes sin configurar en la ficha (CAR-192)", () => {
  async function parametros(configurar?: Record<string, number>) {
    mockMotorLegal();
    const { ctx } = ctxGestor(true);
    for (const [clave, valor] of Object.entries(configurar ?? {}))
      await ctx.db.ajuste.create({
        data: { tenantId: ctx.tenantId, modulo: "cpq", clave, ambito: "tenant", sujetoId: ctx.tenantId, valor },
      });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Márgenes" });
    if (!c.ok) throw new Error("fixture");
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id: (c.data as { id: string }).id });
    if (!f.ok) throw new Error("ficha");
    return (f.data as { parametros: { margenMinimoPct: number | null; margenAlertaPct: number | null } }).parametros;
  }

  it("mínimo y alerta son null (no 0) si la empresa no los configuró", async () => {
    const p = await parametros();
    expect(p.margenMinimoPct).toBeNull();
    expect(p.margenAlertaPct).toBeNull();
  });

  it("devuelven lo configurado, escalado, y puede ser solo uno", async () => {
    const p = await parametros({ margen_minimo_pct: 12 });
    expect(p.margenMinimoPct).toBe(120_000);
    expect(p.margenAlertaPct).toBeNull();
  });
});
