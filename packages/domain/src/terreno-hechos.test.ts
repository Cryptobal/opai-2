import { describe, expect, it } from "vitest";

import {
  ANTIGUEDAD_MAXIMA_MS,
  calcularDesfaseMs,
  DESFASE_ALTO_MS,
  desfaseAlto,
  hechoPlausible,
  horaCorregida,
  TOLERANCIA_FUTURO_MS,
} from "./terreno-hechos";

const t = (iso: string) => new Date(iso);

describe("desfase del reloj del equipo", () => {
  it("es positivo si el equipo va atrasado y negativo si va adelantado", () => {
    const servidor = t("2026-11-06T12:00:00Z");
    expect(calcularDesfaseMs(t("2026-11-06T11:58:00Z"), servidor)).toBe(120_000);
    expect(calcularDesfaseMs(t("2026-11-06T12:03:00Z"), servidor)).toBe(-180_000);
  });

  it("corrige la hora del hecho con el desfase del envío", () => {
    // El equipo marcó a las 10:00 de su reloj y va 5 min atrasado: en hora del servidor fue 10:05.
    expect(horaCorregida(t("2026-11-06T10:00:00Z"), 300_000).toISOString()).toBe(
      "2026-11-06T10:05:00.000Z",
    );
    expect(horaCorregida(t("2026-11-06T10:00:00Z"), 0).toISOString()).toBe("2026-11-06T10:00:00.000Z");
  });

  it("marca como alto el desfase de más de 10 minutos, en cualquier sentido", () => {
    expect(desfaseAlto(DESFASE_ALTO_MS)).toBe(false);
    expect(desfaseAlto(DESFASE_ALTO_MS + 1)).toBe(true);
    expect(desfaseAlto(-DESFASE_ALTO_MS - 1)).toBe(true);
  });
});

describe("plausibilidad de un hecho", () => {
  const envio = t("2026-11-06T12:00:00Z");

  it("acepta un hecho anterior al envío", () => {
    expect(hechoPlausible(t("2026-11-06T09:00:00Z"), envio)).toEqual({ ok: true });
  });

  it("tolera un minuto de redondeo del reloj, no más", () => {
    expect(hechoPlausible(new Date(envio.getTime() + TOLERANCIA_FUTURO_MS), envio)).toEqual({ ok: true });
    expect(hechoPlausible(new Date(envio.getTime() + TOLERANCIA_FUTURO_MS + 1), envio)).toEqual({
      ok: false,
      motivo: "posterior_al_envio",
    });
  });

  it("rechaza lo de hace más de 14 días", () => {
    expect(hechoPlausible(new Date(envio.getTime() - ANTIGUEDAD_MAXIMA_MS), envio)).toEqual({ ok: true });
    expect(hechoPlausible(new Date(envio.getTime() - ANTIGUEDAD_MAXIMA_MS - 1), envio)).toEqual({
      ok: false,
      motivo: "muy_antiguo",
    });
  });
});
