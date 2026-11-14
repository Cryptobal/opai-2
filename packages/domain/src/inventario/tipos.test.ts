import { describe, expect, it } from "vitest";

import { camposConClave, claveCampo, errorDeTipo, nombreNormalizado, tiposSugeridos } from ".";

describe("inventario · tipos (CAR-235)", () => {
  it("R1: compara nombres sin mayúsculas, tildes ni espacios de más", () => {
    expect(nombreNormalizado("  Teléfono   Móvil ")).toBe("telefono movil");
    expect(nombreNormalizado("TELEFONO MOVIL")).toBe(nombreNormalizado("teléfono móvil"));
  });

  it("R4: la clave del campo sale de la etiqueta y empieza con letra", () => {
    expect(claveCampo("Número de serie")).toBe("numero_de_serie");
    expect(claveCampo("2° IMEI")).toBe("c_2_imei");
  });

  it("conserva la clave de un campo existente aunque cambie la etiqueta", () => {
    const [c] = camposConClave([{ clave: "imei", etiqueta: " IMEI principal ", tipo: "texto", obligatorio: true }]);
    expect(c).toEqual({ clave: "imei", etiqueta: "IMEI principal", tipo: "texto", obligatorio: true });
  });

  it("R3: la ropa necesita tallas, sin repetir y sin campos propios", () => {
    expect(errorDeTipo({ categoria: "ropa", campos: [], tallas: [] })).toMatch(/al menos una talla/);
    expect(errorDeTipo({ categoria: "ropa", campos: [], tallas: ["M", "m"] })).toMatch(/repetidas/);
    const campo = { clave: "x", etiqueta: "X", tipo: "texto" as const, obligatorio: false };
    expect(errorDeTipo({ categoria: "ropa", campos: [campo], tallas: ["M"] })).toMatch(/solo para tipos de activo/);
    expect(errorDeTipo({ categoria: "ropa", campos: [], tallas: ["S", "M"] })).toBeNull();
  });

  it("R3 y R4: el activo no lleva tallas ni campos repetidos", () => {
    expect(errorDeTipo({ categoria: "activo", campos: [], tallas: ["M"] })).toMatch(/solo para tipos de ropa/);
    const c = { clave: "imei", etiqueta: "IMEI", tipo: "texto" as const, obligatorio: true };
    expect(errorDeTipo({ categoria: "activo", campos: [c, c], tallas: [] })).toMatch(/mismo nombre/);
    expect(errorDeTipo({ categoria: "activo", campos: [c], tallas: [] })).toBeNull();
  });

  it("R6: los sugeridos son válidos y sus nombres no se repiten", () => {
    for (const vertical of ["seguridad", "aseo", "mantenimiento", "outsourcing"]) {
      const lista = tiposSugeridos(vertical);
      expect(lista.length).toBeGreaterThan(3);
      expect(new Set(lista.map((t) => nombreNormalizado(t.nombre))).size).toBe(lista.length);
      for (const t of lista) expect(errorDeTipo(t)).toBeNull();
    }
  });

  it("la ropa sugerida usa la clave de la prenda del uniforme (CAR-408)", () => {
    const camisa = tiposSugeridos("seguridad").find((t) => t.nombre === "Camisa");
    expect(camisa?.prendaClave).toBe("camisa");
    expect(tiposSugeridos("seguridad").find((t) => t.nombre === "Pantalón")?.prendaClave).toBe("pantalon");
  });
});
