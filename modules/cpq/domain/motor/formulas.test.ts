import { describe, expect, it } from "vitest";
import { evaluarFormula, validarModelo } from "./formulas";
import { modeloPrueba } from "./fixtures";
import { N } from "./numero";

describe("fórmulas deterministas R10/R11/R25", () => {
  it("precedencia, signo, min/max/redondear/si y mitad absoluta", () => {
    const m = modeloPrueba();
    expect(evaluarFormula("si(1, max(2, 3) * (8 - 2) / 3, 0) + min(4, 1)", m).valor.entero()).toBe(7);
    expect(evaluarFormula("redondear(-5 / 2)", m).valor.entero()).toBe(-3);
    expect(evaluarFormula("redondear(5 / 2)", m).valor.entero()).toBe(3);
    expect(N(1, 3).por(N(3)).entero()).toBe(1);
  });
  it("prioriza línea > cotización > tenant > defecto y conserva el origen", () => {
    const m = modeloPrueba(); m.valores = { feriados_anuales: 10 };
    const r = evaluarFormula("feriados_anuales + tenant.feriados_anuales + cotizacion.feriados_anuales", m,
      { feriados_anuales: 14 }, { feriados_anuales: 18 });
    expect(r.valor.entero()).toBe(42);
    expect(r.variables.map((v) => v.ambito)).toEqual(["linea", "tenant", "cotizacion"]);
  });
  it("resuelve otras fórmulas y rechaza referencias rotas, ciclos y unidades", () => {
    const m = modeloPrueba(); validarModelo(m);
    expect(() => evaluarFormula("linea.rota", m)).toThrow("Referencia rota: linea.rota");
    expect(() => evaluarFormula("precio + 1", m)).toThrow("Unidades incompatibles");
    m.formulas = [{ clave: "a", expresion: "formula.b", unidad: "numero" }, { clave: "b", expresion: "formula.a", unidad: "numero" }];
    expect(() => validarModelo(m)).toThrow("Ciclo");
  });
  it.each(["1 / 0", "precio / (cantidad - cantidad)", "eval(1)", "constructor(1)", "a; process.exit()", "1.5", "si(1, 2)", "redondear(1,2)"])("rechaza %s", (f) => {
    expect(() => evaluarFormula(f, modeloPrueba())).toThrow();
  });
  it("acota profundidad, operaciones, precisión y duplicados", () => {
    expect(() => evaluarFormula("(".repeat(40) + "1" + ")".repeat(40), modeloPrueba())).toThrow();
    expect(() => N(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    const m = modeloPrueba(); m.variables = [...m.variables, ...m.variables];
    expect(() => validarModelo(m)).toThrow("duplicadas");
  });
});
