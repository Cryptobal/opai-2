import { describe, expect, it } from "vitest";

import { accionesNovedad, codigoNovedad, siguienteEstadoNovedad } from "./libro-novedades";

describe("ciclo de estados de una novedad (CAR-77)", () => {
  it("abierta se toma, resuelve o deriva; no se cierra sin resolver", () => {
    expect(accionesNovedad("abierta")).toEqual(["tomar", "resolver", "derivar"]);
    expect(siguienteEstadoNovedad("abierta", "tomar")).toBe("en_atencion");
    expect(siguienteEstadoNovedad("abierta", "cerrar")).toBeNull();
  });

  it("en atención se resuelve o deriva; resuelta se cierra o reabre", () => {
    expect(accionesNovedad("en_atencion")).toEqual(["resolver", "derivar"]);
    expect(siguienteEstadoNovedad("resuelta", "cerrar")).toBe("cerrada");
    expect(siguienteEstadoNovedad("resuelta", "reabrir")).toBe("abierta");
    expect(siguienteEstadoNovedad("derivada", "reabrir")).toBe("abierta");
  });

  it("cerrada es final", () => {
    expect(accionesNovedad("cerrada")).toEqual([]);
  });

  it("código visible", () => {
    expect(codigoNovedad(42)).toBe("NOV-0042");
    expect(codigoNovedad(12345)).toBe("NOV-12345");
  });
});
