import { describe, expect, it } from "vitest";

import { variablesFueraDeClase } from "./documento-plantillas-ambito";
import { variablesDeDocumento } from "./documento-plantillas";
import { claveVariableCampoCuenta, esVariableCampoCuenta } from "./documento-plantillas-campos";

describe("variables cuenta.campo en plantillas", () => {
  it("reconoce tokens de tres segmentos", () => {
    const t = "Rubro {cuenta.campo.rubro} y {cuenta.nombre}";
    expect(variablesDeDocumento(t)).toEqual(["cuenta.campo.rubro", "cuenta.nombre"]);
    expect(esVariableCampoCuenta("cuenta.campo.rubro")).toBe(true);
    expect(claveVariableCampoCuenta("rubro")).toBe("cuenta.campo.rubro");
  });

  it("acepta campos activos en contrato de servicio y rechaza los ajenos", () => {
    const texto = "{cuenta.campo.rubro} {cuenta.campo.borrado} {persona.nombre}";
    expect(variablesFueraDeClase(texto, "contrato_servicio", new Set(["rubro"]))).toEqual(
      expect.arrayContaining(["cuenta.campo.borrado", "persona.nombre"]),
    );
    expect(variablesFueraDeClase(texto, "contrato_servicio", new Set(["rubro"]))).toHaveLength(2);
  });

  it("no admite cuenta.campo en plantillas sobre persona", () => {
    expect(variablesFueraDeClase("{cuenta.campo.rubro}", "contrato_trabajo", new Set(["rubro"]))).toEqual([
      "cuenta.campo.rubro",
    ]);
  });
});