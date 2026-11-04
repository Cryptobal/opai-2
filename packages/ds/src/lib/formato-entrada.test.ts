import { describe, expect, it } from "vitest";

import { aplicarMascaraHora, formatearMiles, horaValida, soloDigitos } from "./formato-entrada";

describe("formato de entrada", () => {
  it("enmascara la hora al escribir", () => {
    expect(aplicarMascaraHora("8")).toBe("8");
    expect(aplicarMascaraHora("0830")).toBe("08:30");
    expect(aplicarMascaraHora("08:3099")).toBe("08:30");
  });
  it("valida la hora", () => {
    expect(horaValida("08:30")).toBe("08:30");
    expect(horaValida("24:00")).toBe("");
    expect(horaValida("08:60")).toBe("");
    expect(horaValida("8:3")).toBe("");
  });
  it("agrega puntos de miles", () => {
    expect(formatearMiles("800000")).toBe("800.000");
    expect(formatearMiles("1250000")).toBe("1.250.000");
    expect(formatearMiles("999")).toBe("999");
    expect(formatearMiles("")).toBe("");
    expect(formatearMiles("0012")).toBe("12");
  });
  it("devuelve solo dígitos", () => {
    expect(soloDigitos("1.250.000")).toBe("1250000");
  });
});
