import { describe, expect, it } from "vitest";

import {
  etiquetaDeVariable,
  fechaDeDocumento,
  pesosDeDocumento,
  rellenarPlantilla,
} from "./documento-plantillas-rellenar";

describe("rellenarPlantilla", () => {
  const texto = "Entre la empresa y **{persona.nombre}**, RUT {persona.rut}.\n\nSueldo {sueldo.base}.";

  it("reemplaza cada variable por su valor y conserva el énfasis", () => {
    const r = rellenarPlantilla(texto, { "persona.nombre": "Camila Herrera", "persona.rut": "12.345.678-5", "sueldo.base": "$ 620.000" });
    expect(r.faltantes).toEqual([]);
    expect(r.parrafos.map((p) => p.map((s) => s.texto).join(""))).toEqual([
      "Entre la empresa y Camila Herrera, RUT 12.345.678-5.",
      "Sueldo $ 620.000.",
    ]);
    expect(r.parrafos[0]?.find((s) => s.texto === "Camila Herrera")?.negrita).toBe(true);
  });

  it("deja a la vista la variable sin valor y la informa una sola vez", () => {
    const r = rellenarPlantilla("{persona.direccion} y otra vez {persona.direccion}; {foo.bar}", { "persona.direccion": " " });
    expect(r.faltantes).toEqual(["persona.direccion", "foo.bar"]);
    expect(r.parrafos[0]?.filter((s) => s.faltante).map((s) => s.texto)).toEqual(["{persona.direccion}", "{persona.direccion}", "{foo.bar}"]);
  });

  it("formatea fecha y pesos como en los documentos", () => {
    expect(fechaDeDocumento("2026-11-01")).toBe("01-11-2026");
    expect(pesosDeDocumento(620000)).toBe("$ 620.000");
    expect(pesosDeDocumento(1234567.8)).toBe("$ 1.234.567");
    expect(etiquetaDeVariable("persona.rut")).toBe("RUT");
    expect(etiquetaDeVariable("x.y")).toBe("x.y");
  });
});
