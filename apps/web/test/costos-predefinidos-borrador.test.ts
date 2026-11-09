import { describe, expect, it } from "vitest";

import { efectoPredefinidos, entradaPredefinidos, type FilaPredefinido, validarPredefinidos } from "@/lib/costos-predefinidos-borrador";

const f = (o: Partial<FilaPredefinido> = {}): FilaPredefinido => ({ clave: "a", categoria: "uniformes", monto: "12000", alcance: "por_puesto", activo: true, ...o });

describe("costos predefinidos en pantalla", () => {
  it("acepta una lista válida y arma la entrada en orden", () => {
    const filas = [f(), f({ clave: "b", categoria: "examenes", alcance: "global", monto: "85000" })];
    expect(validarPredefinidos(filas).ok).toBe(true);
    expect(entradaPredefinidos(filas)).toEqual([
      { categoria: "uniformes", montoClp: 12000, alcance: "por_puesto", activo: true },
      { categoria: "examenes", montoClp: 85000, alcance: "global", activo: true },
    ]);
  });
  it("marca la categoría repetida con el mismo alcance, pero no con otro", () => {
    expect(validarPredefinidos([f(), f({ clave: "b" })]).filas[0]?.categoria).toMatch(/ya está/);
    expect(validarPredefinidos([f(), f({ clave: "b", alcance: "global" })]).ok).toBe(true);
  });
  it("rechaza montos negativos o vacíos", () => {
    expect(validarPredefinidos([f({ monto: "-5000" })]).ok).toBe(false);
    expect(validarPredefinidos([f({ monto: "" })]).ok).toBe(false);
  });
  it("cuenta solo los costos activos en el efecto", () => {
    expect(efectoPredefinidos([f(), f({ clave: "b", categoria: "x", activo: false })])).toBe("Se cargará 1 costo en cotizaciones nuevas.");
    expect(efectoPredefinidos([f(), f({ clave: "b", categoria: "x" })])).toBe("Se cargarán 2 costos en cotizaciones nuevas.");
    expect(efectoPredefinidos([])).toMatch(/ningún/);
  });
});
