import { describe, expect, it } from "vitest";

import { mesAnterior, mesSiguiente } from "./calendario-mes";

describe("calendario-mes", () => {
  it("avanza y retrocede enero y diciembre", () => {
    expect(mesSiguiente("2026-12")).toBe("2027-01");
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesSiguiente("2026-06")).toBe("2026-07");
  });
});