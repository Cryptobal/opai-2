import { describe, expect, it } from "vitest";

import { hoyChile, semanasRelativas, sistema } from "./sistema";

describe("sistema del agente (CAR-525)", () => {
  it("fija hoy y distingue esta semana de la pasada (lunes a domingo Chile)", () => {
    // Domingo 15-nov-2026 Chile: esta semana 9–15; pasada 2–8 (como reportó Carlos).
    const ahora = new Date("2026-11-15T15:00:00.000Z");
    expect(hoyChile(ahora)).toBe("2026-11-15");
    expect(semanasRelativas("2026-11-15")).toEqual({
      esta: { desde: "2026-11-09", hasta: "2026-11-15" },
      pasada: { desde: "2026-11-02", hasta: "2026-11-08" },
    });
    const txt = sistema(ahora);
    expect(txt).toContain("Hoy es 2026-11-15");
    expect(txt).toContain("Semana pasada: 2026-11-02 a 2026-11-08");
    expect(txt).toContain("Esta semana: 2026-11-09 a 2026-11-15");
    expect(txt).toMatch(/Nunca digas «esta semana» si el usuario pidió\s+la pasada/);
    expect(txt).toContain("finanzas_ventas_buscar");
    expect(txt).toContain("folio, fecha, cliente, monto y estado");
  });
});
