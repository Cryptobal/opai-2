import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => registrarCapacidades(capacidades));
beforeEach(() => vi.restoreAllMocks());

function entorno(permisos: string[] = [...GESTOR, ...CON_COSTOS, "cpq:modelo.manage"]) {
  return contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos });
}
type Ctx = ReturnType<typeof entorno>["ctx"];
const ok = async <T>(ctx: Ctx, id: string, input: unknown, dryRun = false) => {
  const r = await executeCapability(ctx, id, input, { dryRun });
  if (!r.ok) throw new Error(`${id}: ${r.error.message}`);
  return r.data as T;
};
const predefinidos = [
  { categoria: "uniformes", montoClp: 15_000, alcance: "por_puesto" as const },
  { categoria: "examenes", montoClp: 40_000, alcance: "global" as const },
];

describe("costos predefinidos (CAR-213)", () => {
  it("guarda la lista, rechaza duplicados y categorías inválidas, y el dryRun no escribe", async () => {
    const { ctx } = entorno();
    await ok(ctx, "cpq.costos_predefinidos.guardar", { items: predefinidos }, true);
    expect(await ctx.db.cpqCostoPredefinido.findMany({})).toHaveLength(0);
    await ok(ctx, "cpq.costos_predefinidos.guardar", { items: predefinidos });
    const lista = await ok<{ items: { categoria: string }[] }>(ctx, "cpq.costos_predefinidos.list", {});
    expect(lista.items.map((i) => i.categoria)).toEqual(["uniformes", "examenes"]);
    const dup = await executeCapability(ctx, "cpq.costos_predefinidos.guardar", { items: [predefinidos[0], predefinidos[0]] }, { dryRun: false });
    expect(dup.ok).toBe(false);
    const mala = await executeCapability(ctx, "cpq.costos_predefinidos.guardar", { items: [{ categoria: "feriados", montoClp: 1, alcance: "global" }] }, { dryRun: false });
    expect(mala.ok).toBe(false);
  });

  it("al crear la cotización carga el global y al agregar un puesto carga el suyo; no pisa lo editado", async () => {
    mockMotorLegal();
    const { ctx } = entorno();
    await ok(ctx, "cpq.costos_predefinidos.guardar", { items: predefinidos });
    const c = await ok<{ id: string; versionId: string }>(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Predefinidos" });
    expect((await ctx.db.cpqCostoCategoria.findMany({})).map((x) => [x.categoria, x.lineaId, x.montoClp])).toEqual([["examenes", null, 40_000]]);
    const f = await ok<{ secciones: { id: string }[] }>(ctx, "cpq.cotizaciones.ficha", { id: c.id });
    const p = await ok<{ id: string }>(ctx, "cpq.lineas.crear", { seccionId: f.secciones[0]!.id, tipo: "puesto", nombre: "Guardia", sueldoBaseClp: 650_000 });
    const filas = await ctx.db.cpqCostoCategoria.findMany({});
    expect(filas.map((x) => [x.categoria, x.lineaId === p.id ? "puesto" : x.lineaId])).toEqual([["examenes", null], ["uniformes", "puesto"]]);
    await ctx.db.cpqCostoCategoria.updateMany({ where: { categoria: "uniformes" }, data: { montoClp: 99_000 } });
    const r = await ok<{ cargados: number }>(ctx, "cpq.costos_categoria.cargar_predefinidos", { versionId: c.versionId });
    expect(r.cargados).toBe(0);
    expect((await ctx.db.cpqCostoCategoria.findMany({ where: { categoria: "uniformes" } }))[0]?.montoClp).toBe(99_000);
  });

  it("sin predefinidos no cambia nada y sin cpq:modelo.manage no se configura", async () => {
    mockMotorLegal();
    const { ctx } = entorno();
    const c = await ok<{ id: string; versionId: string }>(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Sin" });
    expect(await ctx.db.cpqCostoCategoria.findMany({})).toHaveLength(0);
    expect((await ok<{ cargados: number }>(ctx, "cpq.costos_categoria.cargar_predefinidos", { versionId: c.versionId })).cargados).toBe(0);
    const { ctx: gestor } = entorno([...GESTOR, ...CON_COSTOS]);
    expect((await executeCapability(gestor, "cpq.costos_predefinidos.guardar", { items: predefinidos }, { dryRun: false })).ok).toBe(false);
  });
});
