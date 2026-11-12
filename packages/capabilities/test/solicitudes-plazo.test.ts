import { describe, expect, it } from "vitest";

import { plazoPrimeraRespuesta, resumenPrimeraRespuesta } from "../src/comercial/solicitudes-plazo";

const creada = new Date("2026-11-10T12:00:00Z");
const sol = (estado: string, primeraRespuestaEn: Date | null = null) => ({ estado, createdAt: creada, primeraRespuestaEn });
const h = (n: number) => new Date(creada.getTime() + n * 3_600_000);

describe("plazoPrimeraRespuesta", () => {
  it("apagado con 0 horas", () => {
    expect(plazoPrimeraRespuesta(sol("nueva"), 0, h(100))).toEqual({ estado: "sin_plazo", venceEn: null });
  });
  it("pendiente: dentro y fuera del plazo, con el límite incluido", () => {
    expect(plazoPrimeraRespuesta(sol("nueva"), 4, h(4)).estado).toBe("dentro");
    expect(plazoPrimeraRespuesta(sol("nueva"), 4, h(5)).estado).toBe("fuera");
  });
  it("atendida: a tiempo o tarde según cuándo se atendió, no según hoy", () => {
    expect(plazoPrimeraRespuesta(sol("en_revision", h(3)), 4, h(500)).estado).toBe("a_tiempo");
    expect(plazoPrimeraRespuesta(sol("descartada", h(6)), 4, h(500)).estado).toBe("tarde");
  });
  it("atendida antes de existir el registro queda sin dato", () => {
    expect(plazoPrimeraRespuesta(sol("convertida"), 4, h(500)).estado).toBe("sin_dato");
  });
});

describe("resumenPrimeraRespuesta", () => {
  it("null si está apagado", () => {
    expect(resumenPrimeraRespuesta([sol("nueva")], 0, h(1))).toBeNull();
  });
  it("cuenta cumplimiento y pendientes; ignora las sin dato", () => {
    const r = resumenPrimeraRespuesta(
      [sol("en_revision", h(1)), sol("en_revision", h(9)), sol("nueva"), sol("convertida")],
      4,
      h(10),
    );
    expect(r).toEqual({
      objetivoHoras: 4,
      atendidas: 2,
      aTiempo: 1,
      tarde: 1,
      pendientesDentro: 0,
      pendientesFuera: 1,
      cumplimientoPct: 50,
    });
  });
  it("sin atendidas el cumplimiento es null", () => {
    expect(resumenPrimeraRespuesta([sol("nueva")], 4, h(1))?.cumplimientoPct).toBeNull();
  });
});
