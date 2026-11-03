import { describe, expect, it } from "vitest";

import { numeroCorrelativoCpq, planCorrelativosCpq } from "../../scripts/importar-opai1/correlativos-cpq";

describe("correlativos CPQ desde export 1.0", () => {
  it("ignora sufijos en el código (R54)", () => {
    expect(numeroCorrelativoCpq("CPQ-2026-159-defe")).toBeNull();
    expect(numeroCorrelativoCpq("CPQ-2026-159")).toEqual({ anio: 2026, numero: 159 });
  });

  it("propone fijar el máximo por año si supera el actual", () => {
    const plan = planCorrelativosCpq(
      [
        { id: "q1", code: "CPQ-2026-010", createdAt: "2026-01-01T12:00:00.000Z" },
        { id: "q2", code: "CPQ-2026-042", createdAt: "2026-02-01T12:00:00.000Z" },
      ],
      new Map([[2026, 30]]),
      true,
    );
    expect(plan).toEqual([
      {
        anio: 2026,
        ultimoEnExport: 42,
        cotizacionesConsideradas: 2,
        fijariaUltimo: 42,
        omitido: false,
        motivo: null,
      },
    ]);
  });
});
