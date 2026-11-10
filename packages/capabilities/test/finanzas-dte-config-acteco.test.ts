// CAR-243 · `finanzas.dte_config.actualizar` sigue aceptando `acteco`, pero lo traduce a la lista de la empresa.
import { describe, expect, it } from "vitest";

import { actecoDesdeDteConfig } from "../src/finanzas/dte-config-acteco";

const dos = { codigos: [801001, 829900], principal: 801001 };

describe("ACTECO desde la configuración DTE", () => {
  it("sin acteco, o con el mismo principal, no cambia nada", () => {
    expect(actecoDesdeDteConfig(dos, undefined)).toEqual({ ...dos, cambia: false });
    expect(actecoDesdeDteConfig(dos, 801001)).toEqual({ ...dos, cambia: false });
  });
  it("un número pasa a principal y conserva los demás códigos", () => {
    expect(actecoDesdeDteConfig(dos, 829900)).toEqual({ codigos: [829900, 801001], principal: 829900, cambia: true });
    expect(actecoDesdeDteConfig(dos, 123456)).toEqual({
      codigos: [123456, 801001, 829900],
      principal: 123456,
      cambia: true,
    });
    expect(actecoDesdeDteConfig({ codigos: [], principal: null }, 801001)).toEqual({
      codigos: [801001],
      principal: 801001,
      cambia: true,
    });
  });
  it("null quita el único código; con varios pide elegir en Configuración › Empresa", () => {
    expect(actecoDesdeDteConfig({ codigos: [801001], principal: 801001 }, null)).toEqual({
      codigos: [],
      principal: null,
      cambia: true,
    });
    expect(() => actecoDesdeDteConfig(dos, null)).toThrow(/Configuración › Empresa/);
  });
});
