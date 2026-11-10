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
  it("con 20 códigos, agregar uno más es un rechazo de negocio (no el CHECK de la base)", () => {
    const veinte = { codigos: Array.from({ length: 20 }, (_, i) => 100_000 + i), principal: 100_000 };
    expect(() => actecoDesdeDteConfig(veinte, 801001)).toThrow(/hasta 20/);
    expect(actecoDesdeDteConfig(veinte, 100_005).codigos[0]).toBe(100_005);
  });
});
