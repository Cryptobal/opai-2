import type { CeldaPauta } from "@opai/domain";
import { describe, expect, it } from "vitest";

import { tramosPpc, tramosVariante } from "../src/pauta/tramos-celdas";

const celda = (fecha: string, overrides: Partial<CeldaPauta> = {}): CeldaPauta => ({
  fecha,
  estado: "cubierto",
  motivo: null,
  excepcion: false,
  feriado: null,
  titularId: "t1",
  cubiertoPorId: null,
  variante: null,
  ...overrides,
});

describe("tramos-celdas", () => {
  it("agrupa PPC consecutivos por motivo", () => {
    const celdas = [
      celda("2026-11-01", { estado: "ppc", motivo: "sin_titular" }),
      celda("2026-11-02", { estado: "ppc", motivo: "sin_titular" }),
      celda("2026-11-03", { estado: "cubierto" }),
      celda("2026-11-04", { estado: "ppc", motivo: "ausencia" }),
    ];
    expect(tramosPpc(celdas)).toEqual([
      { motivo: "sin_titular", desde: "2026-11-01", hasta: "2026-11-02", dias: 2 },
      { motivo: "ausencia", desde: "2026-11-04", hasta: "2026-11-04", dias: 1 },
    ]);
  });

  it("agrupa reemplazos de la misma persona", () => {
    const celdas = [
      celda("2026-11-01", { cubiertoPorId: "p1", variante: "reemplazo" }),
      celda("2026-11-02", { cubiertoPorId: "p1", variante: "reemplazo" }),
      celda("2026-11-03", { cubiertoPorId: "p2", variante: "reemplazo" }),
    ];
    expect(tramosVariante(celdas, "reemplazo")).toEqual([
      { personaId: "p1", desde: "2026-11-01", hasta: "2026-11-02", dias: 2 },
      { personaId: "p2", desde: "2026-11-03", hasta: "2026-11-03", dias: 1 },
    ]);
  });
});