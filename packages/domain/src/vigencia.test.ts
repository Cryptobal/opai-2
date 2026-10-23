import { describe, expect, it } from "vitest";

import { diasHasta, estadoVigencia, HITO_VENCIDO, hitoAlcanzado } from "./vigencia";

const HITOS = [30, 14, 7, 3, 1, 0];

describe("vigencia", () => {
  it("estado según días al vencimiento", () => {
    expect(estadoVigencia(null, "2026-10-23", 30)).toBe("sin_fecha");
    expect(estadoVigencia("2027-01-01", "2026-10-23", 30)).toBe("vigente");
    expect(estadoVigencia("2026-11-14", "2026-10-23", 30)).toBe("por_vencer");
    expect(estadoVigencia("2026-09-01", "2026-10-23", 30)).toBe("vencido");
    expect(diasHasta("2026-11-14", "2026-10-23")).toBe(22);
  });
  it("avisa una vez por hito y la escalera solo baja", () => {
    expect(hitoAlcanzado("2026-11-14", "2026-10-23", HITOS, null)).toBe(30);
    expect(hitoAlcanzado("2026-11-14", "2026-10-23", HITOS, 30)).toBeNull();
    expect(hitoAlcanzado("2026-11-14", "2026-11-01", HITOS, 30)).toBe(14);
    expect(hitoAlcanzado("2026-11-14", "2026-11-14", HITOS, 1)).toBe(0);
    expect(hitoAlcanzado("2026-11-14", "2026-11-20", HITOS, 0)).toBe(HITO_VENCIDO);
    expect(hitoAlcanzado("2026-11-14", "2026-11-25", HITOS, HITO_VENCIDO)).toBeNull();
  });
  it("lejos del vencimiento no avisa", () => {
    expect(hitoAlcanzado("2027-06-01", "2026-10-23", HITOS, null)).toBeNull();
  });
});
