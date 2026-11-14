import { describe, expect, it } from "vitest";

import { rentabilidadPorInstalacion, totalesRentabilidad } from "../src/finanzas/rentabilidad-calculo";

describe("rentabilidad por instalación (CAR-174)", () => {
  it("resta notas de crédito, suma costos y ordena por margen, con fila sin instalación", () => {
    const filas = rentabilidadPorInstalacion(
      [
        { instalacionId: "a", tipoDte: 33, montoNeto: 1_000_000, montoExento: 0 },
        { instalacionId: "a", tipoDte: 61, montoNeto: 200_000, montoExento: 0 },
        { instalacionId: "b", tipoDte: 34, montoNeto: 0, montoExento: 500_000 },
        { instalacionId: null, tipoDte: 33, montoNeto: 100_000, montoExento: 0 },
      ],
      [
        { instalacionId: "a", estado: "ok", costoClp: 900_000 },
        { instalacionId: "b", estado: "ok", costoClp: 300_000 },
        { instalacionId: "b", estado: "sin_costo" },
        { instalacionId: "c", estado: "oculto" },
      ],
    );
    expect(filas.map((f) => [f.instalacionId, f.ventasNetasClp, f.costoEstimadoClp, f.margenClp])).toEqual([
      ["a", 800_000, 900_000, -100_000],
      ["c", 0, 0, 0],
      [null, 100_000, 0, 100_000],
      ["b", 500_000, 300_000, 200_000],
    ]);
    expect(filas.find((f) => f.instalacionId === "a")?.margenPct).toBe(-125_000);
    expect(filas.find((f) => f.instalacionId === "c")).toMatchObject({ margenPct: null, puestos: 1, puestosOcultos: 1 });
    expect(filas.find((f) => f.instalacionId === "b")).toMatchObject({ puestos: 2, puestosSinCosto: 1, margenPct: 400_000 });
  });

  it("totaliza la empresa", () => {
    const t = totalesRentabilidad(
      rentabilidadPorInstalacion([{ instalacionId: "a", tipoDte: 33, montoNeto: 400, montoExento: 0 }], [{ instalacionId: "a", estado: "ok", costoClp: 100 }]),
    );
    expect(t).toEqual({ ventasNetasClp: 400, costoEstimadoClp: 100, margenClp: 300, margenPct: 750_000, puestosSinCosto: 0, puestosOcultos: 0 });
    expect(totalesRentabilidad([]).margenPct).toBeNull();
  });
});
