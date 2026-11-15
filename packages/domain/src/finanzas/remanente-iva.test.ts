import { describe, expect, it } from "vitest";

import { ivaConRemanente, remanenteAnterior } from "./remanente-iva";

describe("remanente de crédito fiscal", () => {
  it("arrastra el crédito sobrante mes a mes y se consume con el débito", () => {
    const meses = [
      { periodo: "2026-07", debito: 100, credito: 300 }, // queda 200
      { periodo: "2026-08", debito: 150, credito: 0 }, // 200 − 150 → queda 50
      { periodo: "2026-09", debito: 0, credito: 30 }, // 50 + 30 → 80
    ];
    expect(remanenteAnterior(meses, "2026-10")).toBe(80);
    expect(remanenteAnterior(meses, "2026-08")).toBe(200);
    expect(remanenteAnterior(meses, "2026-07")).toBe(0);
  });

  it("un mes con IVA a pagar deja el remanente en cero y el orden de entrada no importa", () => {
    const meses = [
      { periodo: "2026-09", debito: 500, credito: 0 },
      { periodo: "2026-08", debito: 0, credito: 100 },
    ];
    expect(remanenteAnterior(meses, "2026-10")).toBe(0);
  });

  it("descuenta el remanente anterior del IVA del mes", () => {
    expect(ivaConRemanente(1000, 300, 200)).toEqual({ ivaAPagar: 500, remanenteSiguiente: 0 });
    expect(ivaConRemanente(100, 300, 50)).toEqual({ ivaAPagar: 0, remanenteSiguiente: 250 });
  });
});
