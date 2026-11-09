import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => registrarCapacidades(capacidades));
beforeEach(() => vi.restoreAllMocks());

const PATRON = "0192f3a0-0000-7000-8000-0000000000b1";
const MODELO = ["cpq:modelo.manage"];
function entorno(permisos: string[] = [...GESTOR, ...CON_COSTOS, ...MODELO]) {
  const base = semilla();
  return contextoDePrueba({
    semilla: {
      ...base,
      patronTurno: [
        { id: PATRON, tenantId: TENANT_DE_PRUEBA, nombre: "4x4", clase: "ciclico", diasTrabajo: 4, diasDescanso: 4, diasSemana: [], deFabrica: true, activo: true, orden: 0 },
      ],
    },
    modulosActivos: ACTIVOS,
    permisos,
  });
}
type Ctx = ReturnType<typeof entorno>["ctx"];
const ok = async <T>(ctx: Ctx, id: string, input: unknown, dryRun = false) => {
  const r = await executeCapability(ctx, id, input, { dryRun });
  if (!r.ok) throw new Error(`${id}: ${r.error.message}`);
  return r.data as T;
};
const tramo = (nombre: string, ini: string, fin: string, posiciones: number) => ({
  nombre, patronId: PATRON, horaInicio: ini, horaFin: fin, diasSemana: [1, 2, 3, 4, 5, 6, 7], posiciones,
});
const crear24x7 = (ctx: Ctx) =>
  ok<{ id: string; totalPuestos: number }>(ctx, "cpq.esquemas_cobertura.guardar", {
    nombre: "24/7", tramos: [tramo("Día", "08:00", "20:00", 2), tramo("Noche", "20:00", "08:00", 2)],
  });

describe("esquemas de cobertura (CAR-212)", () => {
  it("guarda y lista el esquema 24/7 con su ciclo y el total de puestos; el dryRun no escribe", async () => {
    const { ctx } = entorno();
    const previa = await ok<{ totalPuestos: number }>(ctx, "cpq.esquemas_cobertura.guardar", { nombre: "24/7", tramos: [tramo("Día", "08:00", "20:00", 2)] }, true);
    expect(previa.totalPuestos).toBe(2);
    expect(await ctx.db.cpqEsquemaCobertura.findMany({})).toHaveLength(0);
    const e = await crear24x7(ctx);
    expect(e.totalPuestos).toBe(4);
    const lista = await ok<{ items: { nombre: string; totalPuestos: number; tramos: { patronNombre: string }[] }[] }>(ctx, "cpq.esquemas_cobertura.list", {});
    expect(lista.items).toMatchObject([{ nombre: "24/7", totalPuestos: 4 }]);
    expect(lista.items[0]?.tramos.map((t) => t.patronNombre)).toEqual(["4x4", "4x4"]);
  });

  it("rechaza nombre repetido, ciclo inexistente y exige el permiso de modelo", async () => {
    const { ctx } = entorno();
    await crear24x7(ctx);
    const dup = await executeCapability(ctx, "cpq.esquemas_cobertura.guardar", { nombre: "24/7", tramos: [tramo("Día", "08:00", "20:00", 1)] }, { dryRun: false });
    expect(dup.ok).toBe(false);
    const sin = await executeCapability(ctx, "cpq.esquemas_cobertura.guardar", { nombre: "Otro", tramos: [{ ...tramo("Día", "08:00", "20:00", 1), patronId: "0192f3a0-0000-7000-8000-0000000000ff" }] }, { dryRun: false });
    expect(sin.ok).toBe(false);
    const { ctx: lector } = entorno([...GESTOR]);
    expect((await executeCapability(lector, "cpq.esquemas_cobertura.guardar", { nombre: "X", tramos: [tramo("Día", "08:00", "20:00", 1)] }, { dryRun: false })).ok).toBe(false);
  });

  it("agregar_esquema crea de una vez turno y contra turno con el sueldo pedido; dryRun no escribe", async () => {
    mockMotorLegal();
    const { ctx } = entorno();
    const e = await crear24x7(ctx);
    const c = await ok<{ id: string }>(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Cobertura" });
    const f = await ok<{ secciones: { id: string }[] }>(ctx, "cpq.cotizaciones.ficha", { id: c.id });
    const seccionId = f.secciones[0]!.id;
    const previa = await ok<{ ventaMensualClp: number | null }>(ctx, "cpq.lineas.agregar_esquema", { seccionId, esquemaId: e.id, sueldoBaseClp: 650_000 }, true);
    expect(previa.ventaMensualClp).toBeGreaterThan(0);
    expect(await ctx.db.cpqLinea.findMany({})).toHaveLength(0);
    const r = await ok<{ ids: string[] }>(ctx, "cpq.lineas.agregar_esquema", { seccionId, esquemaId: e.id, sueldoBaseClp: 650_000 });
    expect(r.ids).toHaveLength(2);
    const lineas = await ctx.db.cpqLinea.findMany({ orderBy: { orden: "asc" } });
    expect(lineas.map((l) => [l.nombre, l.posiciones, l.patron, l.horaInicio, l.horaFin, l.sueldoBaseClp])).toEqual([
      ["24/7 · Día", 2, "4x4", "08:00", "20:00", 650_000],
      ["24/7 · Noche", 2, "4x4", "20:00", "08:00", 650_000],
    ]);
    expect(lineas[0]?.diasSemana).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("un esquema archivado no se aplica a cotizaciones", async () => {
    mockMotorLegal();
    const { ctx } = entorno();
    const e = await crear24x7(ctx);
    const c = await ok<{ id: string }>(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Cobertura" });
    const seccionId = (await ok<{ secciones: { id: string }[] }>(ctx, "cpq.cotizaciones.ficha", { id: c.id })).secciones[0]!.id;
    await ok(ctx, "cpq.esquemas_cobertura.guardar", { id: e.id, nombre: "24/7", activo: false, tramos: [tramo("Día", "08:00", "20:00", 2)] });
    const r = await executeCapability(ctx, "cpq.lineas.agregar_esquema", { seccionId, esquemaId: e.id }, { dryRun: false });
    expect(r.ok).toBe(false);
  });
});
