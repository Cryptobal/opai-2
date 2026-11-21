import { describe, expect, it } from "vitest";

import { mezclarAsistenciaLiquidacion } from "../src/nomina/asistencia-liquidacion";

describe("mezclarAsistenciaLiquidacion", () => {
  const base = { diasLicencia: 2, diasAusencia: 1, minutosExtra: 0, anticipos: 0, prestamos: 0, descuentos: 0 };

  it("sin resumen deja las novedades igual", () => {
    const r = mezclarAsistenciaLiquidacion(base, undefined);
    expect(r.novedades).toEqual(base);
    expect(r.diasPresentes).toBeUndefined();
  });

  it("toma presentes, ausentes y extra del resumen", () => {
    const r = mezclarAsistenciaLiquidacion(base, {
      personaId: "p1",
      presentes: 22,
      ausentes: 3,
      segundosAtraso: 1800,
      segundosExtra: 7200,
      provisorio: true,
    });
    expect(r.diasPresentes).toBe(22);
    expect(r.novedades.diasAusencia).toBe(3);
    expect(r.novedades.minutosExtra).toBe(120);
    expect(r.advertencias.some((a) => a.includes("provisorio"))).toBe(true);
    expect(r.advertencias.some((a) => a.includes("atraso"))).toBe(true);
  });
});