// CAR-273: el mes que consulta el trabajo diario del RCV, en hora de Chile.
import { describe, expect, it } from "vitest";

import { mesChile, mesDelTrabajo } from "../src/finanzas/compras-rcv";

describe("mes del RCV en hora de Chile", () => {
  it("usa la fecha de Chile, no la UTC", () => {
    // 1-dic 02:00 UTC es todavía 30-nov en Santiago (UTC-3).
    expect(mesChile(new Date("2026-12-01T02:00:00Z"))).toEqual({ anio: 2026, mes: 11, dia: 30 });
  });
  it("los 3 primeros días consulta el mes anterior (también en enero) y después el actual", () => {
    expect(mesDelTrabajo(new Date("2026-11-03T15:00:00Z"))).toEqual({ anio: 2026, mes: 10 });
    expect(mesDelTrabajo(new Date("2026-11-04T15:00:00Z"))).toEqual({ anio: 2026, mes: 11 });
    expect(mesDelTrabajo(new Date("2027-01-02T15:00:00Z"))).toEqual({ anio: 2026, mes: 12 });
  });
});

describe("frecuencia del trabajo de compras del SII (CAR-273)", () => {
  it("diaria siempre, manual nunca, semanal solo los lunes en Chile", async () => {
    const { tocaHoy } = await import("../src/finanzas/compras-rcv");
    const lunes = new Date("2026-11-09T15:00:00Z");
    const martes = new Date("2026-11-10T15:00:00Z");
    expect(tocaHoy("diaria", martes)).toBe(true);
    expect(tocaHoy("manual", lunes)).toBe(false);
    expect(tocaHoy("semanal", lunes)).toBe(true);
    expect(tocaHoy("semanal", martes)).toBe(false);
  });
});
