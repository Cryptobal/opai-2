import { describe, expect, it } from "vitest";

import { ambitoDeClase, variablesFueraDeClase } from "./documento-plantillas-ambito";

describe("ámbito de las plantillas", () => {
  it("asigna cada clase a su ámbito", () => {
    expect(ambitoDeClase("contrato_trabajo")).toBe("persona");
    expect(ambitoDeClase("carta_trabajador")).toBe("persona");
    expect(ambitoDeClase("contrato_servicio")).toBe("cuenta");
    expect(ambitoDeClase("acta")).toBe("instalacion");
  });

  it("marca variables que no valen para la clase", () => {
    expect(variablesFueraDeClase("Cliente {cuenta.razon_social}, RUT {cuenta.rut}", "contrato_servicio")).toEqual([]);
    expect(variablesFueraDeClase("{persona.nombre}", "contrato_servicio")).toEqual(["persona.nombre"]);
    expect(variablesFueraDeClase("{cuenta.rut} {inventada.x}", "acta")).toEqual(["inventada.x"]);
    expect(variablesFueraDeClase("{cuenta.rut}", "contrato_trabajo")).toEqual(["cuenta.rut"]);
  });
});
