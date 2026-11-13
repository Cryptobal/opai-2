import { describe, expect, it } from "vitest";

import { claveDedupeCartola, planificarDedupeCartola } from "./dedupe";
import { acotarFechaAHoy } from "./web4leads";

const base = (fecha: string, monto: number, glosa: string) => claveDedupeCartola({ fecha, monto, glosa });
const fila = (indice: number, fecha: string, monto: number, glosa: string) => ({ indice, base: base(fecha, monto, glosa), saldoDespues: null });

// CAR-341: Web4Leads informa a veces el día hábil siguiente; la cartola, el de la operación. Datos ficticios.
describe("cartola contra Web4Leads con un día de diferencia", () => {
  it("un movimiento de Web4Leads del día siguiente es el mismo de la cartola", () => {
    const plan = planificarDedupeCartola(
      [fila(0, "2026-11-12", -35000, "Transf a persona ficticia"), fila(1, "2026-11-12", 1000, "Abono ficticio")],
      [{ claveDedupe: base("2026-11-13", -35000, "Transf a persona ficticia"), origen: "web4leads" }],
    );
    expect(plan.map((p) => p.estado)).toEqual(["duplicada", "leida"]);
  });

  it("solo con Web4Leads: dos movimientos de otra cartola con un día de diferencia no se confunden", () => {
    const plan = planificarDedupeCartola(
      [fila(0, "2026-11-12", -35000, "Transf a persona ficticia")],
      [{ claveDedupe: base("2026-11-13", -35000, "Transf a persona ficticia"), origen: "cartola" }],
    );
    expect(plan[0]?.estado).toBe("leida");
  });

  it("cada movimiento de Web4Leads calza una sola vez y el calce exacto va primero", () => {
    const plan = planificarDedupeCartola(
      [
        fila(0, "2026-11-13", -35000, "Transf a persona ficticia"),
        fila(1, "2026-11-12", -35000, "Transf a persona ficticia"),
        fila(2, "2026-11-12", -35000, "Transf a persona ficticia"),
      ],
      [{ claveDedupe: base("2026-11-13", -35000, "Transf a persona ficticia"), origen: "web4leads" }],
    );
    expect(plan.map((p) => p.estado)).toEqual(["duplicada", "leida", "leida"]);
  });

  it("dos días de diferencia no es el mismo movimiento", () => {
    const plan = planificarDedupeCartola(
      [fila(0, "2026-11-11", -35000, "Transf a persona ficticia")],
      [{ claveDedupe: base("2026-11-13", -35000, "Transf a persona ficticia"), origen: "web4leads" }],
    );
    expect(plan[0]?.estado).toBe("leida");
  });

  it("una fecha futura del banco en línea se acota a hoy", () => {
    expect(acotarFechaAHoy("2026-11-13", "2026-11-12")).toBe("2026-11-12");
    expect(acotarFechaAHoy("2026-11-11", "2026-11-12")).toBe("2026-11-11");
  });
});
