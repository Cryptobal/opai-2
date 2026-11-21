// CAR-748 · Central F0: la vigilancia de Rondas con muchas programaciones no debe penalizar el cron de 5 min.
import { describe, expect, it, vi } from "vitest";

import type { Contexto } from "../src/types";
import { noRealizadas } from "../src/rondas/vigilancia-consultas";

const ZONA = "America/Santiago";

describe("rendimiento vigilancia cada 5 min (CAR-748)", () => {
  it("500 programaciones activas sin horarios responde en menos de 2 s", async () => {
    const programaciones = Array.from({ length: 500 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      instalacionId: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      plantillaId: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      horarios: [],
      diasSemana: [0, 1, 2, 3, 4, 5, 6],
      vigenciaDesde: null,
      vigenciaHasta: null,
      toleranciaMin: 5,
      responsables: null,
    }));
    const ctx = {
      db: {
        programacion: { findMany: vi.fn().mockResolvedValue(programaciones) },
        ejecucionRonda: { findMany: vi.fn().mockResolvedValue([]) },
      },
    } as unknown as Contexto;
    const desde = new Date("2026-06-01T12:00:00.000Z");
    const hasta = new Date(desde.getTime() + 5 * 60_000);
    const inicio = performance.now();
    const senales = await noRealizadas(ctx, desde, hasta, ZONA);
    expect(senales).toEqual([]);
    expect(performance.now() - inicio).toBeLessThan(2_000);
  });
});