import { describe, expect, it } from "vitest";

import { consultaDteAgotada, proximaConsultaDteSii } from "./dte-consulta-sii";

describe("sondeo SII DTE (CAR-140)", () => {
  const t0 = new Date("2026-11-01T12:00:00.000Z");

  it("programa cada 15 min durante las primeras 2 h", () => {
    expect(proximaConsultaDteSii(t0, 0)?.toISOString()).toBe("2026-11-01T12:15:00.000Z");
    expect(proximaConsultaDteSii(t0, 7)?.toISOString()).toBe("2026-11-01T14:00:00.000Z");
  });

  it("pasa a intervalo diario después de 2 h hasta 7 días", () => {
    expect(proximaConsultaDteSii(t0, 8)?.toISOString()).toBe("2026-11-02T14:00:00.000Z");
    expect(proximaConsultaDteSii(t0, 9)?.toISOString()).toBe("2026-11-03T14:00:00.000Z");
  });

  it("agota sin marcar rechazado cuando ya no hay próxima consulta", () => {
    let intentos = 0;
    while (proximaConsultaDteSii(t0, intentos)) intentos += 1;
    expect(consultaDteAgotada(t0, intentos)).toBe(true);
    expect(proximaConsultaDteSii(t0, intentos)).toBeNull();
  });
});
