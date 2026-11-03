import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ACTIVOS, CON_COSTOS, CONTACTO_1, GESTOR, NEGOCIO_1, semilla } from "../capabilities/fixtures";
import { prepararEnvio } from "../capabilities/preparar-envio.test-helper";
import { capacidades } from "../capabilities/index";
import { avisosCalculo } from "./avisos-calculo";
import { huellaLinea, juegoDesactualizado } from "./juego-vigente";
import { mockMotorLegal } from "./mock-motor-legal";
import * as proveedor from "./proveedor";

beforeAll(() => registrarCapacidades(capacidades));
beforeEach(() => vi.restoreAllMocks());

type Calc = { ventaMensual: number | null; noEnviable: boolean; advertencias: string[]; avisos?: { codigo: string; lineaId?: string }[] };

async function cotizacionConPuesto(sueldoBaseClp?: number) {
  mockMotorLegal();
  vi.spyOn(proveedor, "mutualParaCalculo").mockResolvedValue({ tasa: 0, confirmada: false });
  const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [...GESTOR, ...CON_COSTOS, "cpq:aprobar"] });
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Mutual" });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
  if (!f.ok) throw new Error("ficha");
  const sec = (f.data as { secciones: { id: string }[] }).secciones[0]!;
  await executeCapability(ctx, "cpq.lineas.crear", {
    seccionId: sec.id,
    tipo: "puesto",
    nombre: "Guardia día",
    ...(sueldoBaseClp ? { sueldoBaseClp } : {}),
  });
  return { ctx, id };
}

describe("mutual adicional sin confirmar (CAR-162)", () => {
  it("calcula con 0 %, avisa con código y sigue enviable para el motor", async () => {
    const { ctx, id } = await cotizacionConPuesto(650_000);
    const r = await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    if (!r.ok) throw new Error("calc");
    const calc = r.data as Calc;
    expect(calc.ventaMensual).not.toBeNull();
    expect(calc.noEnviable).toBe(false);
    expect(calc.avisos?.map((a) => a.codigo)).toEqual(["mutual_sin_confirmar"]);
    expect(calc.advertencias).toContain("Mutual adicional sin confirmar: se calcula con 0 %.");
    const linea = await ctx.db.cpqLinea.findFirst({ where: { tipo: "puesto" } });
    expect(linea?.huellaJuegoValores).toMatch(/:mutual-supuesta$/);
  });

  it("la ficha no permite enviar y pide confirmar la mutual", async () => {
    const { ctx, id } = await cotizacionConPuesto(650_000);
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f.ok) throw new Error("ficha");
    const meta = (f.data as { meta: { puedeEnviar: boolean; requiereConfirmarMutual: boolean } }).meta;
    expect(meta.puedeEnviar).toBe(false);
    expect(meta.requiereConfirmarMutual).toBe(true);
  });

  it("enviar por executeCapability (pantalla, API y MCP) se bloquea con mutual_sin_confirmar", async () => {
    const { ctx, id } = await cotizacionConPuesto(650_000);
    await prepararEnvio(ctx, id);
    const env = await executeCapability(ctx, "cpq.cotizaciones.enviar", { id, contactoId: CONTACTO_1 });
    expect(env.ok).toBe(false);
    if (env.ok) return;
    expect(env.error).toMatchObject({ code: "UNPROCESSABLE", detalles: { codigo: "mutual_sin_confirmar" } });
  });

  it("al confirmar la mutual (incluso en 0 %) la cotización queda desactualizada", async () => {
    const { ctx, id } = await cotizacionConPuesto(650_000);
    await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    vi.spyOn(proveedor, "mutualParaCalculo").mockResolvedValue({ tasa: 0, confirmada: true });
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f.ok) throw new Error("ficha");
    const meta = (f.data as { meta: { avisoRecalculo: unknown; requiereConfirmarMutual: boolean } }).meta;
    expect(meta.avisoRecalculo).not.toBeNull();
    expect(meta.requiereConfirmarMutual).toBe(false);
  });

  it("sin sueldo avisa sueldo_faltante con la línea y sin montos", async () => {
    const { ctx, id } = await cotizacionConPuesto();
    const r = await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
    if (!r.ok) throw new Error("calc");
    const calc = r.data as Calc;
    const linea = await ctx.db.cpqLinea.findFirst({ where: { tipo: "puesto" } });
    expect(calc.avisos).toContainEqual(expect.objectContaining({ codigo: "sueldo_faltante", lineaId: linea?.id }));
    expect(JSON.stringify(calc.avisos?.map((a) => ({ ...a, lineaId: undefined })))).not.toMatch(/\d{4,}/);
  });
});

describe("avisos y huella (puros)", () => {
  const linea = { id: "l1", tipo: "puesto", nombre: "Guardia", habilitada: true, sueldoBaseClp: 600_000 };

  it("juego legal ausente avisa el indicador que falta", () => {
    const a = avisosCalculo([linea], { juego: null, pendiente: "costo pendiente: falta afp", faltante: "afp" }, { tasa: 2_700, confirmada: true });
    expect(a).toEqual([expect.objectContaining({ codigo: "juego_legal_faltante", indicador: "afp" })]);
  });

  it("sin puestos no avisa la mutual", () => {
    expect(avisosCalculo([], { juego: null }, { tasa: 0, confirmada: false })).toEqual([]);
  });

  it("la huella distingue 0 % supuesto de confirmado", () => {
    expect(huellaLinea("abc", false)).not.toBe(huellaLinea("abc", true));
    const lineas = [{ tipo: "puesto", sueldoBaseClp: 1, huellaJuegoValores: huellaLinea("abc", false) }];
    expect(juegoDesactualizado("abc", lineas, false)).toBe(false);
    expect(juegoDesactualizado("abc", lineas, true)).toBe(true);
  });
});
