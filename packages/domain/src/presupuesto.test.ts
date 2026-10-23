import { describe, expect, it } from "vitest";

import { microAUsd, presupuestoAgotado, umbralCruzado, usdAMicro } from "./presupuesto";

describe("presupuesto de agentes", () => {
  const p = usdAMicro(25);
  it("cruza 80 y 100 una sola vez", () => {
    expect(umbralCruzado(usdAMicro(19), usdAMicro(20.5), p)).toBe(80);
    expect(umbralCruzado(usdAMicro(20.5), usdAMicro(21), p)).toBeNull();
    expect(umbralCruzado(usdAMicro(24), usdAMicro(26), p)).toBe(100);
    expect(umbralCruzado(usdAMicro(10), usdAMicro(30), p)).toBe(100);
  });
  it("sin presupuesto no hay umbrales ni corte", () => {
    expect(umbralCruzado(0, usdAMicro(1000), null)).toBeNull();
    expect(presupuestoAgotado(usdAMicro(1000), 0)).toBe(false);
    expect(presupuestoAgotado(p, p)).toBe(true);
  });
  it("convierte USD y micro-USD", () => {
    expect(usdAMicro(8.4)).toBe(8_400_000);
    expect(microAUsd(8_400_000)).toBe(8.4);
  });
});
