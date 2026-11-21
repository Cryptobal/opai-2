import { describe, expect, it } from "vitest";

import { tocaTrabajosDiarios, tramoEn } from "../lib/cron";

describe("programador: cuándo se encolan los trabajos diarios", () => {
  it("no antes de las 09:00 UTC, para que sigan partiendo a la hora de siempre", () => {
    expect(tocaTrabajosDiarios(new Date("2026-11-12T00:00:00Z"))).toBe(false);
    expect(tocaTrabajosDiarios(new Date("2026-11-12T08:59:59Z"))).toBe(false);
  });

  it("desde las 09:00 UTC y en las horas siguientes, por si esa vuelta falló", () => {
    expect(tocaTrabajosDiarios(new Date("2026-11-12T09:00:00Z"))).toBe(true);
    expect(tocaTrabajosDiarios(new Date("2026-11-12T23:00:00Z"))).toBe(true);
  });
});

describe("tramoEn", () => {
  it("redondea al tramo de 5 minutos en la zona del tenant", () => {
    expect(tramoEn("America/Santiago", new Date("2026-11-12T14:07:30Z"))).toBe("2026-11-12T11:05");
    expect(tramoEn("America/Santiago", new Date("2026-11-12T14:12:00Z"))).toBe("2026-11-12T11:10");
  });
});
