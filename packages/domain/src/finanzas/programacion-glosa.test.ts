import { describe, expect, it } from "vitest";

import { ufCentavosATexto, marcadoresDeGlosa, marcadoresDesconocidos, renderGlosa } from "./programacion-glosa";

const v = { periodo: "2026-11", ufCentavos: 3_812_345, ufDiaCentavos: 3_815_001, montoClp: 1_190_000 };

describe("glosas de programación con marcadores (CAR-221 · B)", () => {
  it("reemplaza periodo, UF usada, UF del día y monto", () => {
    expect(renderGlosa("Guardias {{periodo}} · UF {{uf_valor}} (hoy {{uf_al_dia}}) · {{monto}}", v)).toBe(
      "Guardias 2026-11 · UF 38.123,45 (hoy 38.150,01) · $1.190.000",
    );
  });
  it("tolera espacios en el marcador y repeticiones", () => {
    expect(renderGlosa("{{ periodo }} / {{periodo}}", v)).toBe("2026-11 / 2026-11");
  });
  it("sin UF dice «sin UF»; un marcador desconocido queda tal cual y se informa", () => {
    expect(renderGlosa("UF {{uf_valor}} {{otro}}", { ...v, ufCentavos: null })).toBe("UF sin UF {{otro}}");
    expect(marcadoresDesconocidos("{{periodo}} {{otro}} {{x_y}}")).toEqual(["otro", "x_y"]);
    expect(marcadoresDeGlosa("sin marcadores")).toEqual([]);
  });
  it("formatea la UF con miles y coma", () => {
    expect(ufCentavosATexto(100)).toBe("1,00");
    expect(ufCentavosATexto(3_812_305n)).toBe("38.123,05");
    expect(ufCentavosATexto(null)).toBe("sin UF");
  });
});
