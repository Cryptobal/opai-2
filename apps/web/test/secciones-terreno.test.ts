import { describe, expect, it } from "vitest";

import { seccionesActivas } from "../app/(terreno)/terreno/_componentes/secciones-terreno";

describe("secciones de Terreno según módulos (CAR-801)", () => {
  const casos: [string, { asistencia: boolean; rondas: boolean; acceso: boolean }, string[]][] = [
    ["ningún módulo", { asistencia: false, rondas: false, acceso: false }, ["/terreno", "/terreno/libro"]],
    ["solo asistencia", { asistencia: true, rondas: false, acceso: false }, ["/terreno", "/terreno/libro", "/terreno/marcar"]],
    ["solo rondas", { asistencia: false, rondas: true, acceso: false }, ["/terreno", "/terreno/libro", "/terreno/rondas"]],
    ["solo acceso", { asistencia: false, rondas: false, acceso: true }, ["/terreno", "/terreno/libro", "/terreno/porteria"]],
    [
      "los cuatro",
      { asistencia: true, rondas: true, acceso: true },
      ["/terreno", "/terreno/libro", "/terreno/marcar", "/terreno/rondas", "/terreno/porteria"],
    ],
  ];
  for (const [nombre, modulos, hrefs] of casos) {
    it(nombre, () => {
      expect(seccionesActivas(modulos).map((s) => s.href)).toEqual(hrefs);
    });
  }

  it("mientras carga el contexto, libro e inicio siguen disponibles", () => {
    expect(seccionesActivas(null).map((s) => s.href)).toEqual(["/terreno", "/terreno/libro"]);
  });
});