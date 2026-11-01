import { describe, expect, it } from "vitest";

import { detectarDoblaje, turnosDeSerie, type PatronPauta } from "./index";

const P4X4: PatronPauta = { clase: "ciclico", diasTrabajo: 4, diasDescanso: 4, diasSemana: [] };

describe("prohibido doblar (A9)", () => {
  const dia = { patron: P4X4, inicioCiclo: "2026-10-01", horaInicio: "08:00", horaFin: "20:00" };
  const noche = { patron: P4X4, inicioCiclo: "2026-10-01", horaInicio: "20:00", horaFin: "08:00" };

  it("detecta el mismo día en dos puestos que se solapan", () => {
    const a = turnosDeSerie({ ...dia, etiqueta: "Portería · Día" }, "2026-10-01", "2026-10-31");
    const b = turnosDeSerie({ ...dia, etiqueta: "Andén · Día" }, "2026-10-01", "2026-10-31");
    expect(detectarDoblaje(a, b)).toEqual({ fecha: "2026-10-01", con: "Andén · Día" });
  });

  it("día + noche el mismo día son 24 h seguidas: también doblan (turnos que se tocan)", () => {
    const a = turnosDeSerie({ ...dia, etiqueta: "Día" }, "2026-10-01", "2026-10-31");
    const b = turnosDeSerie({ ...noche, etiqueta: "Noche" }, "2026-10-01", "2026-10-31");
    expect(detectarDoblaje(a, b)?.con).toBe("Noche");
  });

  it("ciclos en contrafase no doblan", () => {
    const a = turnosDeSerie({ ...dia, etiqueta: "A" }, "2026-10-01", "2026-12-31");
    const b = turnosDeSerie({ ...dia, inicioCiclo: "2026-10-05", etiqueta: "B" }, "2026-10-01", "2026-12-31");
    expect(detectarDoblaje(a, b)).toBeNull();
  });

  it("un turno de noche que cruza la medianoche toca al diurno del día siguiente", () => {
    const n = turnosDeSerie({ ...noche, etiqueta: "N" }, "2026-10-04", "2026-10-04");
    const d = turnosDeSerie({ ...dia, inicioCiclo: "2026-10-05", etiqueta: "D" }, "2026-10-05", "2026-10-05");
    expect(detectarDoblaje(n, d)).not.toBeNull();
  });

  it("los días de ausencia no cuentan como turno", () => {
    const a = turnosDeSerie({ ...dia, etiqueta: "A" }, "2026-10-01", "2026-10-04");
    const b = turnosDeSerie(
      { ...dia, etiqueta: "B", ausencias: new Set(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]) },
      "2026-10-01",
      "2026-10-04",
    );
    expect(detectarDoblaje(a, b)).toBeNull();
  });
});
