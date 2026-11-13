import { describe, expect, it } from "vitest";

import { acotarFechaAHoy } from "./web4leads";

// CAR-341: el banco en línea a veces informa el día hábil siguiente; un movimiento nunca queda en el futuro.
describe("fecha de un movimiento del banco en línea", () => {
  it("una fecha futura se acota a hoy y una pasada no cambia", () => {
    expect(acotarFechaAHoy("2026-11-13", "2026-11-12")).toBe("2026-11-12");
    expect(acotarFechaAHoy("2026-11-11", "2026-11-12")).toBe("2026-11-11");
    expect(acotarFechaAHoy("2026-11-12", "2026-11-12")).toBe("2026-11-12");
  });
});
