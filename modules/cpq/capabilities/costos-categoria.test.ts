import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => registrarCapacidades(capacidades));
beforeEach(() => vi.restoreAllMocks());

function entorno(permisos: string[] = [...GESTOR, ...CON_COSTOS]) {
  return contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos });
}
type Ctx = ReturnType<typeof entorno>["ctx"];
const correr = (ctx: Ctx, id: string, input: unknown, dryRun = false) =>
  executeCapability(ctx, id, input, { dryRun });
const ok = async <T>(ctx: Ctx, id: string, input: unknown, dryRun = false) => {
  const r = await correr(ctx, id, input, dryRun);
  if (!r.ok) throw new Error(`${id}: ${r.error.message}`);
  return r.data as T;
};

async function conPuesto(ctx: Ctx, costos = true) {
  mockMotorLegal();
  const c = await ok<{ id: string; versionId: string }>(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Costos por categoría" });
  const f = await ok<{ secciones: { id: string }[] }>(ctx, "cpq.cotizaciones.ficha", { id: c.id });
  const p = await ok<{ id: string }>(ctx, "cpq.lineas.crear", { seccionId: f.secciones[0]!.id, tipo: "puesto", nombre: "Guardia", ...(costos ? { sueldoBaseClp: 650_000 } : {}) });
  return { cotizacionId: c.id, versionId: c.versionId, puestoId: p.id };
}
const venta = async (ctx: Ctx) => (await ctx.db.cpqVersion.findFirst({}))?.ventaMensualClp ?? 0;

describe("costos manuales por categoría (CAR-162)", () => {
  it("sin costos manuales la venta no cambia; guardar uno global la sube y el dryRun no escribe", async () => {
    const { ctx } = entorno();
    const { versionId } = await conPuesto(ctx);
    const antes = await venta(ctx);
    const items = [{ categoria: "uniformes", montoClp: 120_000, lineaId: null }];
    const previa = await ok<{ ventaMensualClp: number; costoMensualClp: number }>(ctx, "cpq.costos_categoria.guardar", { versionId, items }, true);
    expect(previa.ventaMensualClp).toBeGreaterThan(antes);
    expect(await ctx.db.cpqCostoCategoria.findMany({})).toHaveLength(0);
    expect(await venta(ctx)).toBe(antes);
    const real = await ok<{ ventaMensualClp: number }>(ctx, "cpq.costos_categoria.guardar", { versionId, items });
    expect(real.ventaMensualClp).toBe(previa.ventaMensualClp);
    expect(await venta(ctx)).toBe(previa.ventaMensualClp);
    const lista = await ok<{ items: unknown[]; categorias: { id: string }[] }>(ctx, "cpq.costos_categoria.list", { versionId });
    expect(lista.items).toHaveLength(1);
    expect(lista.categorias.map((c) => c.id)).not.toContain("feriados");
  });

  it("quitar todos los costos devuelve la venta original", async () => {
    const { ctx } = entorno();
    const { versionId, puestoId } = await conPuesto(ctx);
    const antes = await venta(ctx);
    await ok(ctx, "cpq.costos_categoria.guardar", { versionId, items: [{ categoria: "vehiculos", montoClp: 90_000, lineaId: puestoId }] });
    expect(await venta(ctx)).toBeGreaterThan(antes);
    await ok(ctx, "cpq.costos_categoria.guardar", { versionId, items: [] });
    expect(await venta(ctx)).toBe(antes);
  });

  it("rechaza feriados, duplicados, puestos ajenos y montos inválidos", async () => {
    const { ctx } = entorno();
    const { versionId } = await conPuesto(ctx);
    const falla = async (items: unknown[]) => (await correr(ctx, "cpq.costos_categoria.guardar", { versionId, items })).ok;
    expect(await falla([{ categoria: "feriados", montoClp: 1, lineaId: null }])).toBe(false);
    expect(await falla([{ categoria: "uniformes", montoClp: 1, lineaId: null }, { categoria: "uniformes", montoClp: 2, lineaId: null }])).toBe(false);
    expect(await falla([{ categoria: "uniformes", montoClp: 1, lineaId: "0192f3a0-0000-7000-8000-0000000000ee" }])).toBe(false);
    expect(await falla([{ categoria: "uniformes", montoClp: -5, lineaId: null }])).toBe(false);
    expect(await falla([{ categoria: "uniformes", montoClp: 1.5, lineaId: null }])).toBe(false);
  });

  it("exige el permiso de costos para leer y para guardar", async () => {
    const { ctx } = entorno([...GESTOR]);
    const { versionId } = await conPuesto(ctx, false);
    expect((await correr(ctx, "cpq.costos_categoria.list", { versionId })).ok).toBe(false);
    expect((await correr(ctx, "cpq.costos_categoria.guardar", { versionId, items: [] })).ok).toBe(false);
  });

  it("una versión nueva copia los costos y el costo de puesto sigue al puesto copiado", async () => {
    const { ctx } = entorno();
    const { cotizacionId, versionId, puestoId } = await conPuesto(ctx);
    await ok(ctx, "cpq.costos_categoria.guardar", { versionId, items: [
      { categoria: "examenes", montoClp: 30_000, lineaId: puestoId },
      { categoria: "uniformes", montoClp: 50_000, lineaId: null },
    ] });
    await ctx.db.cpqVersion.update({ where: { id: versionId }, data: { estado: "enviada" } });
    const nueva = await ok<{ versionId: string }>(ctx, "cpq.versiones.crear", { cotizacionId });
    const copiados = await ctx.db.cpqCostoCategoria.findMany({ where: { versionId: nueva.versionId } });
    expect(copiados).toHaveLength(2);
    const delPuesto = copiados.find((c) => c.categoria === "examenes");
    expect(delPuesto?.lineaId).not.toBeNull();
    expect(delPuesto?.lineaId).not.toBe(puestoId);
  });
});
