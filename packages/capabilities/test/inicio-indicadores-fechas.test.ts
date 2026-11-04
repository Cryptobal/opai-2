import { describe, expect, it } from "vitest";

import { clpAUfEscalada, cortesDelMes } from "../src/core/panel/indicadores/fechas";

describe("cortesDelMes", () => {
  it("compara el 1 al día N con el mismo tramo del mes anterior", () => {
    const c = cortesDelMes("2026-11-03");
    expect(c.actual).toEqual({ desde: "2026-11-01", hastaExclusivo: "2026-11-04" });
    expect(c.anterior).toEqual({ desde: "2026-10-01", hastaExclusivo: "2026-10-04" });
    expect(c.periodo).toBe("2026-11");
  });
  it("acota el día al largo del mes anterior", () => {
    expect(cortesDelMes("2026-03-31").anterior.hastaExclusivo).toBe("2026-03-01");
    expect(cortesDelMes("2026-05-31").anterior).toEqual({
      desde: "2026-04-01",
      hastaExclusivo: "2026-05-01",
    });
  });
  it("cruza el año en enero", () => {
    const c = cortesDelMes("2027-01-15");
    expect(c.anterior).toEqual({ desde: "2026-12-01", hastaExclusivo: "2026-12-16" });
  });
  it("el último día del mes cierra en el día 1 del siguiente", () => {
    expect(cortesDelMes("2026-12-31").actual.hastaExclusivo).toBe("2027-01-01");
  });
});

describe("clpAUfEscalada", () => {
  it("convierte con la UF en centavos y redondea a la mitad hacia arriba", () => {
    // 39.000.000 CLP con UF a 39.000,00 → 1.000 UF = 10.000.000 escalado.
    expect(clpAUfEscalada(39_000_000, 3_900_000n, 10_000)).toBe(10_000_000);
    expect(clpAUfEscalada(0, 3_900_000n, 10_000)).toBe(0);
  });
});
