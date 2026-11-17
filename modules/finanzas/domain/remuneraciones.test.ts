import { describe, expect, it } from "vitest";

import { agruparRemuneraciones, type ItemRemuneracion } from "./remuneraciones";

const item = (p: Partial<ItemRemuneracion>): ItemRemuneracion => ({
  fecha: "2026-11-30",
  concepto: "sueldos",
  monto: 1000,
  personas: 10,
  estimado: true,
  ...p,
});

const semanas = ["2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14"];

describe("agruparRemuneraciones", () => {
  it("lleva cada pago a la semana de su fecha y suma por concepto", () => {
    const r = agruparRemuneraciones(
      [
        item({ fecha: "2026-11-30", concepto: "sueldos", monto: 1000, personas: 10 }),
        item({ fecha: "2026-12-01", concepto: "sueldos", monto: 500, personas: 4 }),
        item({ fecha: "2026-12-13", concepto: "previred", monto: 300, personas: 14 }),
      ],
      { desde: "2026-11-16", semanas },
    );
    expect(r).toEqual([
      { concepto: "sueldos", semana: "2026-11-30", monto: 1500, fechas: ["2026-11-30", "2026-12-01"], personas: 10, estimado: true },
      { concepto: "previred", semana: "2026-12-07", monto: 300, fechas: ["2026-12-13"], personas: 14, estimado: true },
    ]);
  });

  it("no cuenta lo que ya debió pagarse (antes de hoy): eso lo trae la cartola", () => {
    const r = agruparRemuneraciones(
      [item({ fecha: "2026-11-15" }), item({ fecha: "2026-11-20", concepto: "anticipo", monto: 200 })],
      { desde: "2026-11-18", semanas },
    );
    expect(r.map((c) => [c.concepto, c.fechas])).toEqual([["anticipo", ["2026-11-20"]]]);
  });

  it("deja fuera montos en cero y fechas fuera de la ventana", () => {
    const r = agruparRemuneraciones(
      [item({ monto: 0 }), item({ fecha: "2027-01-31" })],
      { desde: "2026-11-16", semanas },
    );
    expect(r).toEqual([]);
  });

  it("los turnos extra van con los sueldos", () => {
    const r = agruparRemuneraciones(
      [item({ concepto: "turnos_extra", monto: 70, personas: 3 }), item({ monto: 1000, personas: 10 })],
      { desde: "2026-11-16", semanas },
    );
    expect(r).toEqual([
      { concepto: "sueldos", semana: "2026-11-30", monto: 1070, fechas: ["2026-11-30"], personas: 10, estimado: true },
    ]);
  });

  it("marca la celda como firme solo si todos sus pagos lo son", () => {
    const r = agruparRemuneraciones(
      [item({ estimado: false }), item({ fecha: "2026-12-02", estimado: true })],
      { desde: "2026-11-16", semanas },
    );
    expect(r[0]?.estimado).toBe(true);
  });
});
