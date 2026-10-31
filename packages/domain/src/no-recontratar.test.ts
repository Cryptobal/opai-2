import { describe, expect, it } from "vitest";

import { noRecontratarHabilitada, VIGENCIA_NO_RECONTRATAR } from "./no-recontratar";

describe("noRecontratarHabilitada", () => {
  it("en producción, antes del 01-12-2026 está apagada", () => {
    expect(
      noRecontratarHabilitada({
        ahora: new Date("2026-11-30T23:59:59Z"),
        produccion: true,
        forzar: false,
      }),
    ).toBe(false);
  });

  it("en producción, desde el 01-12-2026 está encendida", () => {
    expect(
      noRecontratarHabilitada({ ahora: new Date(VIGENCIA_NO_RECONTRATAR), produccion: true, forzar: false }),
    ).toBe(true);
  });

  it("fuera de producción está encendida antes de la fecha, sin forzar", () => {
    expect(
      noRecontratarHabilitada({
        ahora: new Date("2026-01-01T00:00:00Z"),
        produccion: false,
        forzar: false,
      }),
    ).toBe(true);
  });

  it("el override explícito enciende incluso en producción antes de la fecha", () => {
    expect(
      noRecontratarHabilitada({
        ahora: new Date("2026-01-01T00:00:00Z"),
        produccion: true,
        forzar: true,
      }),
    ).toBe(true);
  });
});
