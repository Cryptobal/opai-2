import { describe, expect, it } from "vitest";

import {
  ayudaProcedenciaSaldo,
  puedeVistaPreviaCierre,
  saldoInicialDesdeSugerido,
} from "../app/(erp)/finanzas/flujo/_componentes/cierre-ui";

describe("cierre semanal · saldo sugerido (V211-01)", () => {
  it("solo precarga el saldo cuando la API lo trae; null no borra con cadena vacía", () => {
    expect(saldoInicialDesdeSugerido(1_250_000)).toBe("1250000");
    expect(saldoInicialDesdeSugerido(null)).toBeUndefined();
    expect(saldoInicialDesdeSugerido(undefined)).toBeUndefined();
  });

  it("Vista previa exige semana y monto banco parseable", () => {
    expect(puedeVistaPreviaCierre({ semana: "2026-11-02", banco: "1.250.000", pendiente: false })).toBe(
      true,
    );
    expect(puedeVistaPreviaCierre({ semana: "", banco: "100", pendiente: false })).toBe(false);
    expect(puedeVistaPreviaCierre({ semana: "2026-11-02", banco: "", pendiente: true })).toBe(false);
    expect(puedeVistaPreviaCierre({ semana: "2026-11-02", banco: "abc", pendiente: false })).toBe(
      false,
    );
  });

  it("ayuda de procedencia nombra cuenta y cartola (V211-03)", () => {
    expect(ayudaProcedenciaSaldo(null)).toBe("");
    expect(ayudaProcedenciaSaldo({ saldo: null, fechaCorte: null, aviso: null, cuentaIds: [], origenes: [] })).toBe(
      "Sin cuentas bancarias configuradas; escribe el saldo del banco.",
    );
    expect(
      ayudaProcedenciaSaldo({
        saldo: 1,
        fechaCorte: null,
        aviso: null,
        cuentaIds: ["a"],
        origenes: [],
      }),
    ).toBe("Sin cartola importada para esta semana; escribe el saldo del banco.");
    expect(
      ayudaProcedenciaSaldo({
        saldo: 1,
        fechaCorte: "2026-11-08",
        aviso: null,
        cuentaIds: ["a"],
        origenes: [{ banco: "Santander", numeroVisible: "1234567890", cartolaFecha: "2026-11-07" }],
      }),
    ).toContain("Sugerido desde Santander ·7890, cartola del 07-11-2026");
  });
});
