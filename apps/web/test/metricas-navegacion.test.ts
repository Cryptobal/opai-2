// Instrumentación de rendimiento (ADR-045): el valor `Server-Timing` y la medición de fases.
// No necesita base ni render: `cache()` sin contexto de request cae al objeto descartable.
import { describe, expect, it } from "vitest";

import {
  medirFase,
  metricasActuales,
  type MetricasNavegacion,
  serverTiming,
  totalDesdeInicio,
} from "@/lib/metricas-navegacion";

describe("Server-Timing de navegación", () => {
  it("arma el valor con fases, consultas y total", () => {
    const m: MetricasNavegacion = { consultas: 6, fases: { sesion: 12.3, identidad: 4, datos: 180 } };
    expect(serverTiming(m, 210.44)).toBe(
      "sesion;dur=12.3, identidad;dur=4, datos;dur=180, consultas;dur=6, total;dur=210.4",
    );
  });

  it("omite las fases ausentes pero lleva consultas y el total medido (incluido 0)", () => {
    expect(serverTiming({ consultas: 0, fases: {} }, 0)).toBe("consultas;dur=0, total;dur=0");
  });

  it("sin marca del proxy el total es null y el marcador no emite `total`", () => {
    // `x-opai-t0` ausente o inválida: época no finita o ≤ 0.
    expect(totalDesdeInicio(Number.NaN)).toBeNull();
    expect(totalDesdeInicio(0)).toBeNull();
    expect(totalDesdeInicio(-1)).toBeNull();
    // Con el total en null, el valor Server-Timing no incluye `total;dur`: el gate lo lee como
    // instrumentación desconectada (`totalMs: null`) y falla, en vez de dar por bueno un 0.
    expect(serverTiming({ consultas: 6, fases: { sesion: 1, identidad: 1, datos: 1 } }, null)).toBe(
      "sesion;dur=1, identidad;dur=1, datos;dur=1, consultas;dur=6",
    );
  });

  it("con marca del proxy el total es un número ≥ 0", () => {
    const total = totalDesdeInicio(Date.now() - 50);
    expect(total).not.toBeNull();
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it("fuera de un render, las métricas son un objeto descartable y no lanza", () => {
    const m = metricasActuales();
    expect(m).toEqual({ consultas: 0, fases: {} });
  });

  it("medirFase devuelve el resultado de la promesa sin alterarlo", async () => {
    await expect(medirFase("datos", async () => 42)).resolves.toBe(42);
  });

  it("medirFase propaga el error de la función medida", async () => {
    await expect(medirFase("datos", async () => Promise.reject(new Error("falló")))).rejects.toThrow(
      "falló",
    );
  });
});
