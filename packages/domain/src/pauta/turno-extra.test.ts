import { describe, expect, it } from "vitest";

import { resolverMontoSugerido, validarMontoAlAprobar } from "./turno-extra";

describe("resolverMontoSugerido", () => {
  it("prioriza la tarifa del puesto sobre la de la instalación", () => {
    expect(resolverMontoSugerido({ montoPuesto: 40_000, montoInstalacion: 35_000 })).toEqual({
      montoClp: 40_000,
      origen: "puesto",
      motivoPorDefecto: null,
    });
  });

  it("usa la de la instalación si el puesto no tiene", () => {
    expect(resolverMontoSugerido({ montoPuesto: null, montoInstalacion: 35_000 })).toEqual({
      montoClp: 35_000,
      origen: "instalacion",
      motivoPorDefecto: null,
    });
  });

  it("admite monto 0 de tarifa y, sin tarifa, deja 0 con motivo", () => {
    expect(resolverMontoSugerido({ montoPuesto: 0, montoInstalacion: 10 })).toEqual({
      montoClp: 0,
      origen: "puesto",
      motivoPorDefecto: null,
    });
    expect(resolverMontoSugerido({ montoPuesto: null, montoInstalacion: null })).toEqual({
      montoClp: 0,
      origen: "sin_tarifa",
      motivoPorDefecto: "Sin tarifa configurada",
    });
  });
});

describe("validarMontoAlAprobar", () => {
  it("sin cambio deja el monto y no pide motivo", () => {
    expect(validarMontoAlAprobar({ montoActual: 10, montoNuevo: undefined, motivo: undefined })).toEqual({
      ok: true,
      montoClp: 10,
      montoMotivo: null,
      origen: null,
    });
  });

  it("exige motivo al cambiar el monto", () => {
    expect(validarMontoAlAprobar({ montoActual: 10, montoNuevo: 20, motivo: "ab" }).ok).toBe(false);
    expect(validarMontoAlAprobar({ montoActual: 10, montoNuevo: 20, motivo: "Ajuste de tarifa" })).toEqual({
      ok: true,
      montoClp: 20,
      montoMotivo: "Ajuste de tarifa",
      origen: "manual",
    });
  });
});
