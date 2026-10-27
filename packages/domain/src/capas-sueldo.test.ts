import { describe, expect, it } from "vitest";

import {
  resolverCapasSueldo,
  validarEstructuraCompleta,
  type EstructuraCapa,
} from "./capas-sueldo";

const estructura = (nivel: EstructuraCapa["nivel"]): EstructuraCapa => ({
  id: nivel,
  nivel,
  sueldoBase: 500000,
  colacion: 0,
  movilizacion: 0,
  gratificacion: "ninguna",
  vigenteDesde: "2026-01-01",
  estado: "vigente",
  items: [],
});

describe("capas de sueldo sin herencia", () => {
  it("los bonos históricos sin valor no se convierten en cero y se rechazan en capas nuevas", () => {
    const e = {
      ...estructura("persona"),
      items: [{ nombre: "Turno", tipo: "bono_fijo" as const, monto: null, imponible: true }],
    };
    expect(resolverCapasSueldo("2026-07-01", { persona: [e] })).toMatchObject({
      estado: "incompleta",
      conceptosFaltantes: ["bono:Turno"],
    });
    expect(() => validarEstructuraCompleta(e)).toThrow("bono:Turno");
  });
  it("elige persona, puesto e instalación en ese orden y respeta la vigencia", () => {
    const instalacion = estructura("instalacion");
    const puesto = estructura("puesto");
    const persona = { ...estructura("persona"), vigenteDesde: "2026-06-01" };
    expect(
      resolverCapasSueldo("2026-05-01", {
        instalacion: [instalacion],
        puesto: [puesto],
        persona: [persona],
      }).capa,
    ).toBe("puesto");
    expect(
      resolverCapasSueldo("2026-07-01", {
        instalacion: [instalacion],
        puesto: [puesto],
        persona: [persona],
      }).capa,
    ).toBe("persona");
    expect(resolverCapasSueldo("2026-07-01", { instalacion: [instalacion] }).capa).toBe(
      "instalacion",
    );
    expect(resolverCapasSueldo("2025-01-01", { instalacion: [instalacion] }).estado).toBe(
      "sin_capa",
    );
  });
  it("conserva incompleta la capa que rige sin rellenar desde otra", () => {
    const persona = {
      ...estructura("persona"),
      sueldoBase: null,
      gratificacion: "monto_fijo" as const,
    };
    const r = resolverCapasSueldo("2026-07-01", {
      persona: [persona],
      instalacion: [estructura("instalacion")],
    });
    expect(r.estado).toBe("incompleta");
    expect(r.estructura?.sueldoBase).toBeNull();
    expect(r.conceptosFaltantes).toEqual(["sueldoBase", "gratificacionMonto"]);
    expect(() => validarEstructuraCompleta(persona)).toThrow("sueldoBase, gratificacionMonto");
    expect(() => validarEstructuraCompleta(estructura("puesto"))).not.toThrow();
  });
});
