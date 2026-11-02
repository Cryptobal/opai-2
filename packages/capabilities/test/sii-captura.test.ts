import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  primerDiaMes,
  ufCentavosDelDia,
  ufTextoACentavos,
  utmClpDelMes,
} from "../src/core/remuneraciones/sii-parse";
import {
  fuenteEsSii,
  valorEnRango,
  variacionPermitida,
} from "../src/core/remuneraciones/sii-validacion";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const uf2026 = readFileSync(join(dir, "sii-uf-2026-snippet.html"), "utf8");
const utm2026 = readFileSync(join(dir, "sii-utm-2026-snippet.html"), "utf8");

describe("parseo SII UF/UTM", () => {
  it("convierte texto chileno UF a centavos y rechaza cero", () => {
    expect(ufTextoACentavos("41.258,26")).toBe(4125826);
    expect(ufTextoACentavos("0,00")).toBeNull();
  });

  it("lee UF del 2-nov-2026", () => {
    expect(ufCentavosDelDia(uf2026, "2026-11-02")).toBe(4125826);
  });

  it("no retrocede días si el día pedido está vacío", () => {
    expect(ufCentavosDelDia(uf2026, "2026-11-04")).toBeNull();
  });

  it("lee UTM de noviembre 2026", () => {
    expect(utmClpDelMes(utm2026, 11)).toBe(72440);
    expect(utmClpDelMes(utm2026, 10)).toBe(72151);
    expect(utmClpDelMes(utm2026.replace("72.440", "0"), 11)).toBeNull();
  });

  it("vigencia mensual UTM desde el primer día del mes", () => {
    expect(primerDiaMes("2026-11-02")).toBe("2026-11-01");
  });
});

describe("validación SII", () => {
  it("acepta solo fuentes sii.cl", () => {
    expect(fuenteEsSii("https://www.sii.cl/valores_y_fechas/uf/uf2026.htm")).toBe(true);
    expect(fuenteEsSii("https://bcentral.cl/uf")).toBe(false);
  });

  it("valida rangos y variación", () => {
    expect(valorEnRango("uf", 4125826)).toBe(true);
    expect(valorEnRango("uf", 0)).toBe(false);
    expect(variacionPermitida("uf", 4125826, 4123701)).toBe(true);
    expect(variacionPermitida("uf", 5000000, 4123701)).toBe(false);
  });
});
