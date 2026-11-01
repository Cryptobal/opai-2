import { describe, expect, it } from "vitest";
import { calcular } from "./calcular";
import { casos, entradaCompuesta, entradaReal } from "./casos/entradas";
import combinado from "./casos/CR-COMB.json";
import { N, sumar } from "./numero";

// Valores 2.0 calculados desde las entradas; ningún ajuste compensatorio en el motor.
const esperados = [
  ["CR-A", 16_603_658, 17_033_454, 18_878_305, -1, -1, -1],
  ["CR-B", 13_810_069, 14_226_662, 16_663_733, 1, 1, 1],
  ["CR-C", 4_215_463, 4_339_703, 4_969_600, -1, -1, 0],
  ["CR-D", 52_000, 52_000, 1_021_630, 0, 0, 1],
  ["CR-E", 4_215_464, 4_215_464, 4_845_361, 0, 0, 1],
] as const;

describe("casos dorados reales anonimizados, pregunta 14", () => {
  it.each(esperados)("%s: costsBase / monthlyTotal / venta y diferencias R25 al peso", (nombre, base, total, venta, db, dt, ds) => {
    const caso = casos.find((c) => c.caso === nombre);
    if (!caso) throw new Error("fixture faltante");
    const e = entradaReal(caso), r = calcular(e.version, e.modelo, e.parametros, e.proveedor);
    expect([r.costoBase, r.totalMensual, r.ventaMensual]).toEqual([base, total, venta]);
    expect([base - Math.round(caso.referencia.costsBase), total - Math.round(caso.referencia.monthlyTotal),
      venta - caso.referencia.salePriceMonthly]).toEqual([db, dt, ds]);
    expect(r.dotacion.personasEscaladas).toBe(caso.referencia.totalGuards * 10_000);
    expect(r.noEnviable).toBe(false);
    // Cada peso de cada total se reconstruye desde su traza racional.
    for (const campo of ["costoBase", "totalMensual", "ventaMensual"] as const) {
      const t = r.traza.find((t) => t.item === "totales" && t.monto === campo);
      expect(t?.valor).toBe(r[campo]);
    }
    expect(calcular(e.version, e.modelo, e.parametros, e.proveedor)).toEqual(r);
  });
  it("CR-B separa el 2,5% financiero del catálogo; aplica dotación sobrescrita con motivo", () => {
    const caso = casos[1]; if (!caso) throw new Error("fixture");
    const e = entradaReal(caso), r = calcular(e.version, e.modelo, e.parametros, e.proveedor);
    expect(r.instrumentos.financiero).toBe(416_593);
    expect(r.categorias.find((c) => c.id === "equipamiento")?.costoMensual).toBe(4_271_759);
    expect(r.traza.some((t) => t.variables.some((v) => v.clave === "motivoPersonas"))).toBe(true);
  });
  it("CR-D: únicos separados y margen de cada línea redondeado a CLP (R25/R32)", () => {
    const caso = casos[3]; if (!caso) throw new Error("fixture");
    const e = entradaReal(caso), r = calcular(e.version, e.modelo, e.parametros, e.proveedor);
    // 350.000/0,85 + 3×81.758/0,85 + 220.000/0,85: suma de las ventas enteras de línea.
    expect(r.pagosUnicos).toBe(959_147);
    expect(r.lineas.reduce((s, l) => s + l.ventaUnica, 0)).toBe(r.pagosUnicos);
  });
  it("CR-COMB: margen por sección 10%/13%, instrumentos A una vez, dos secciones y traza", () => {
    const e = entradaCompuesta(), r = calcular(e.version, e.modelo, e.parametros, e.proveedor);
    expect(r.secciones).toHaveLength(2); expect(r.dotacion.personasEscaladas).toBe(150_000);
    expect(r.costoBase).toBe(20_819_121);
    // Se suman las bases A/0,90 + C/0,87; instrumentos comunes A una vez.
    expect(r.ventaMensual).toBe(23_836_547);
    expect((r.ventaMensual ?? 0) - combinado.referencia.salePriceMonthly).toBe(-11_359);
    expect(r.traza.filter((t) => t.monto === "baseConMargen").map((t) => t.variables.find((v) => v.clave === "m")?.valor)).toEqual([100_000, 130_000]);
    const s = r.traza.find((t) => t.item === "totales" && t.monto === "ventaMensual");
    expect(s?.variables.map((v) => v.clave)).toContain("k");
    // Los costos de secciones suman exactamente el costo base; no duplican instrumentos.
    expect(sumar(r.secciones.map((s) => N(s.costoMensual))).entero()).toBe(r.costoBase);
  });
});
