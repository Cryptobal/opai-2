import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

const CARGO = "0192f3a0-0000-7000-8000-0000000000ca";
beforeAll(() => registrarCapacidades(capacidades));
beforeEach(() => vi.restoreAllMocks());

function entorno(permisos: string[] = [...GESTOR, ...CON_COSTOS, "cpq:modelo.manage"]) {
  const s = { ...semilla(), cargo: [{ id: CARGO, tenantId: "", nombre: "Guardia de seguridad", activo: true, orden: 0 }] };
  return contextoDePrueba({ semilla: s, modulosActivos: ACTIVOS, permisos });
}
type Ctx = ReturnType<typeof entorno>["ctx"];
const ejecutar = async <T>(ctx: Ctx, id: string, input: unknown, dryRun = false) => {
  const r = await executeCapability(ctx, id, input, { dryRun });
  if (!r.ok) throw new Error(`${id}: ${r.error.message}`);
  return r.data as T;
};

async function conSeccion(ctx: Ctx) {
  mockMotorLegal();
  const c = await ejecutar<{ id: string; versionId: string }>(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Hoja de puesto v4" });
  const f = await ejecutar<{ secciones: { id: string }[] }>(ctx, "cpq.cotizaciones.ficha", { id: c.id });
  return { cotizacionId: c.id, versionId: c.versionId, seccionId: f.secciones[0]!.id };
}

describe("hoja de puesto completa (CPQ v4)", () => {
  it("elegir cargo trae el sueldo de referencia vigente y lo marca como tal", async () => {
    const { ctx } = entorno();
    const { seccionId } = await conSeccion(ctx);
    await ejecutar(ctx, "cpq.sueldos_referencia.fijar", { cargoId: CARGO, sueldoBaseClp: 620_000, vigenteDesde: "2026-07-01" });
    await ejecutar(ctx, "cpq.sueldos_referencia.fijar", { cargoId: CARGO, sueldoBaseClp: 700_000, vigenteDesde: "2999-01-01" });
    const l = await ejecutar<{ id: string }>(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "Guardia", cargoId: CARGO });
    const fila = await ctx.db.cpqLinea.findFirst({ where: { id: l.id } });
    expect(fila).toMatchObject({ cargoId: CARGO, sueldoBaseClp: 620_000, sueldoOrigen: "referencia_cargo" });
  });

  it("un sueldo escrito gana a la referencia y queda «manual»", async () => {
    const { ctx } = entorno();
    const { seccionId } = await conSeccion(ctx);
    await ejecutar(ctx, "cpq.sueldos_referencia.fijar", { cargoId: CARGO, sueldoBaseClp: 620_000 });
    const l = await ejecutar<{ id: string }>(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "G", cargoId: CARGO, sueldoBaseClp: 650_000 });
    expect(await ctx.db.cpqLinea.findFirst({ where: { id: l.id } })).toMatchObject({ sueldoBaseClp: 650_000, sueldoOrigen: "manual" });
  });

  it("colación y movilización suben el costo (antes iban en 0) y el dryRun no escribe", async () => {
    const { ctx } = entorno();
    const { seccionId } = await conSeccion(ctx);
    const l = await ejecutar<{ id: string; ventaMensualClp: number }>(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "G", sueldoBaseClp: 650_000 });
    const sin = (await ctx.db.cpqVersion.findFirst({}))?.ventaMensualClp ?? 0;
    const previa = await ejecutar<{ ventaMensualClp: number }>(ctx, "cpq.lineas.actualizar", { id: l.id, colacionClp: 40_000, movilizacionClp: 30_000 }, true);
    expect(previa.ventaMensualClp).toBeGreaterThan(sin);
    expect((await ctx.db.cpqLinea.findFirst({ where: { id: l.id } }))?.colacionClp ?? null).toBeNull();
    await ejecutar(ctx, "cpq.lineas.actualizar", { id: l.id, colacionClp: 40_000, movilizacionClp: 30_000 });
    expect((await ctx.db.cpqVersion.findFirst({}))?.ventaMensualClp).toBe(previa.ventaMensualClp);
  });

  it("AFP y salud por línea cambian el cálculo respecto del defecto del tenant", async () => {
    const { ctx } = entorno();
    const { seccionId } = await conSeccion(ctx);
    const l = await ejecutar<{ id: string }>(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "G", sueldoBaseClp: 900_000 });
    const base = await ejecutar<{ ventaMensualClp: number }>(ctx, "cpq.lineas.actualizar", { id: l.id, nombre: "G" }, true);
    const plazo = await ejecutar<{ ventaMensualClp: number }>(ctx, "cpq.lineas.actualizar", { id: l.id, tipoContrato: "plazo_fijo" }, true);
    expect(plazo.ventaMensualClp).toBeGreaterThan(base.ventaMensualClp);
  });

  it("líquido objetivo guarda el bruto calculado; bajo el ingreso mínimo se rechaza", async () => {
    const { ctx } = entorno();
    const { seccionId } = await conSeccion(ctx);
    const l = await ejecutar<{ id: string }>(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "G", sueldoModo: "liquido", liquidoObjetivoClp: 600_000 });
    const fila = await ctx.db.cpqLinea.findFirst({ where: { id: l.id } });
    expect(fila?.sueldoBaseClp).toBeGreaterThanOrEqual(553_553);
    expect(fila?.sueldoBaseClp).toBeLessThan(600_000);
    expect(fila?.sueldoOrigen).toBe("manual");
    await expect(ejecutar(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "X", sueldoBaseClp: 400_000 })).rejects.toThrow(/ingreso mínimo/);
  });

  it("sin cpq:costos.ver no se pueden fijar sueldo ni colación", async () => {
    const { ctx } = entorno(GESTOR);
    const { seccionId } = await conSeccion(ctx);
    await expect(ejecutar(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "G", colacionClp: 1000 })).rejects.toThrow(/costos/);
    await expect(ejecutar(ctx, "cpq.sueldos_referencia.fijar", { cargoId: CARGO, sueldoBaseClp: 600_000 })).rejects.toThrow();
  });
});

describe("parámetros financieros por versión", () => {
  it("activar la póliza y los meses se persisten y suben la venta; restablecer vuelve al defecto", async () => {
    const { ctx } = entorno();
    const { seccionId, versionId } = await conSeccion(ctx);
    await ejecutar(ctx, "cpq.lineas.crear", { seccionId, tipo: "puesto", nombre: "G", sueldoBaseClp: 650_000 });
    const antes = (await ctx.db.cpqVersion.findFirst({ where: { id: versionId } }))?.ventaMensualClp ?? 0;
    const previa = await ejecutar<{ ventaMensualClp: number }>(ctx, "cpq.versiones.parametros", { versionId, mesesContrato: 24, instrumentos: { financiero: { habilitado: true } } }, true);
    expect(previa.ventaMensualClp).toBeGreaterThan(antes);
    expect((await ctx.db.cpqVersion.findFirst({ where: { id: versionId } }))?.instrumentosJson ?? null).toBeNull();
    const r = await ejecutar<{ sobrescrito: boolean; mesesContrato: number }>(ctx, "cpq.versiones.parametros", { versionId, mesesContrato: 24, instrumentos: { financiero: { habilitado: true } } });
    expect(r).toMatchObject({ sobrescrito: true, mesesContrato: 24 });
    expect((await ctx.db.cpqVersion.findFirst({ where: { id: versionId } }))?.ventaMensualClp).toBe(previa.ventaMensualClp);
    const v = await ejecutar<{ sobrescrito: boolean; ventaMensualClp: number }>(ctx, "cpq.versiones.parametros", { versionId, restablecerInstrumentos: true });
    expect(v.sobrescrito).toBe(false);
    expect(v.ventaMensualClp).toBe(antes);
  });

  it("sin cpq:costos.ver la capacidad responde como inexistente", async () => {
    const { ctx } = entorno(GESTOR);
    const { versionId } = await conSeccion(ctx);
    await expect(ejecutar(ctx, "cpq.versiones.parametros", { versionId, mesesContrato: 12 })).rejects.toThrow();
  });
});
