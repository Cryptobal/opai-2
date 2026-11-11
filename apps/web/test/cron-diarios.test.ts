import { describe, expect, it } from "vitest";

import { tocaTrabajosDiarios } from "../lib/cron";

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
