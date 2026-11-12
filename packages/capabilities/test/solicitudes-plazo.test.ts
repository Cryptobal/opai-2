import { describe, expect, it } from "vitest";

import { esHabil, sumarHorasHabiles } from "../src/comercial/horario-habil";
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

describe("horario hábil (lun–vie 8:00–18:00, Santiago)", () => {
  // Noviembre en Chile: UTC-3.
  const vence = (iso: string, horas: number) => sumarHorasHabiles(new Date(iso), horas).toISOString().replace(".000Z", "Z");
  it("dentro del día corre normal", () => {
    expect(vence("2026-11-10T12:00:00Z", 4)).toBe("2026-11-10T16:00:00Z"); // mar 9:00 → 13:00
  });
  it("cruza el cierre y sigue al día siguiente a las 8:00", () => {
    expect(vence("2026-11-10T20:00:00Z", 4)).toBe("2026-11-11T14:00:00Z"); // mar 17:00 → mié 11:00 (1 h + 3 h)
  });
  it("el viernes tarde vence el lunes", () => {
    expect(vence("2026-11-13T20:00:00Z", 4)).toBe("2026-11-16T14:00:00Z"); // vie 17:00 → lun 11:00
  });
  it("lo que llega en fin de semana o de noche cuenta desde la apertura", () => {
    expect(vence("2026-11-14T15:00:00Z", 2)).toBe("2026-11-16T13:00:00Z"); // sáb → lun 8:00 + 2 h = 10:00
    expect(vence("2026-11-11T02:00:00Z", 1)).toBe("2026-11-11T12:00:00Z"); // mar 23:00 → mié 8:00 + 1 h = 9:00
  });
  it("esHabil reconoce los bordes", () => {
    expect(esHabil(new Date("2026-11-10T11:00:00Z"))).toBe(true); // 8:00
    expect(esHabil(new Date("2026-11-10T21:00:00Z"))).toBe(false); // 18:00
    expect(esHabil(new Date("2026-11-14T15:00:00Z"))).toBe(false); // sábado
  });
});
