import { describe, expect, it } from "vitest";

import {
  conversionTexto,
  ufEsEstimada,
  ufTexto,
} from "../app/(erp)/finanzas/ventas/programacion/_componentes/periodo-uf";

describe("conversión de UF en los próximos períodos", () => {
  it("formatea la UF con centavos", () => {
    expect(ufTexto(3_912_345)).toBe("$ 39.123,45");
    expect(ufTexto(3_900_005)).toBe("$ 39.000,05");
  });
  it("una fecha futura es estimada y una pasada o de hoy es publicada", () => {
    expect(ufEsEstimada("2026-12-10", "2026-11-08")).toBe(true);
    expect(ufEsEstimada("2026-11-08", "2026-11-08")).toBe(false);
  });
  it("solo muestra conversión en UF y con UF disponible", () => {
    expect(conversionTexto("CLP", 3_912_345, "2026-12-10", "2026-11-08")).toBeNull();
    expect(conversionTexto("UF", null, "2026-12-10", "2026-11-08")).toBeNull();
    expect(conversionTexto("UF", 3_912_345, "2026-12-10", "2026-11-08")).toBe(
      "UF $ 39.123,45 (estimada con la última publicada)",
    );
    expect(conversionTexto("UF", 3_912_345, "2026-11-01", "2026-11-08")).toBe(
      "UF $ 39.123,45 (publicada)",
    );
  });
});
