import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { publicacionesReferencia } from "../../../packages/domain/src/remuneraciones/referencia.fixture";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as valoresLegales from "../persistencia/valores-legales";
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

describe("CAR-135 pr103", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ficha con solo cpq:cotizaciones.read", async () => {
    const { ctx } = ctxGestor();
    const created = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Para lector",
    });
    if (!created.ok) throw new Error("fixture");
    const id = (created.data as { id: string }).id;
    const soloLectura = {
      ...ctx,
      autorizar: (p: string) => p === "cpq:cotizaciones.read",
    };
    const ficha = await executeCapability(soloLectura, "cpq.cotizaciones.ficha", { id });
    expect(ficha.ok).toBe(true);
  });

  it("enviar persiste calculoCongeladoJson", async () => {
    vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
    const { ctx } = ctxGestor(true);
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Enviar congelado",
    });
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
    await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    const env = await executeCapability(ctx, "cpq.cotizaciones.enviar", { id });
    expect(env.ok).toBe(true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
    expect(v?.calculoCongeladoJson).toBeTruthy();
    expect(v?.estado).toBe("enviada");
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    expect(f.ok).toBe(true);
    if (!f.ok) throw new Error("ficha");
    expect((f.data as { calculo: { ventaMensual: number | null } }).calculo.ventaMensual).toBe(
      v?.ventaMensualClp,
    );
  });

  it("correlativos.fijar dry_run no escribe", async () => {
    const { ctx } = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      permisos: [...GESTOR, "cpq:modelo.manage"],
    });
    const prev = await executeCapability(
      ctx,
      "cpq.correlativos.fijar",
      { anio: 2026, ultimo: 42 },
      { dryRun: true },
    );
    expect(prev.ok).toBe(true);
    expect(await ctx.db.cpqCorrelativo.count()).toBe(0);
    const real = await executeCapability(ctx, "cpq.correlativos.fijar", { anio: 2026, ultimo: 42 });
    expect(real.ok).toBe(true);
    const fila = await ctx.db.cpqCorrelativo.findFirst({ where: { anio: 2026 } });
    expect(fila?.ultimo).toBe(42);
  });
});

describe("cpq correlativos catalogo seed", () => {
  it("catalogo items list siembra plantilla", async () => {
    const { ctx } = ctxGestor();
    const r = await executeCapability(ctx, "cpq.catalogo_items.list", {});
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("list");
    const items = (r.data as { items: { codigo: string }[] }).items;
    expect(items.some((i) => i.codigo === "uniforme")).toBe(true);
  });
});
