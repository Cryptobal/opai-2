import { describe, expect, it } from "vitest";

import {
  conjuntoFeriados,
  type DiaCalendarioEntrada,
  feriadosDelMes,
  resolverFeriados,
} from "./dias";
import { diaUtc } from "./fechas";

const nacional = (fecha: string, nombre: string, irr = false): DiaCalendarioEntrada => ({
  fecha,
  nombre,
  irrenunciable: irr,
  fuente: "nacional",
  region: null,
  esTenant: false,
});

describe("resolverFeriados · precedencia", () => {
  it("el feriado del tenant sobrescribe al nacional en la misma fecha (CA2)", () => {
    const resuelto = resolverFeriados([
      nacional("2026-09-18", "Independencia", true),
      {
        fecha: "2026-09-18",
        nombre: "Aniversario de la empresa",
        irrenunciable: false,
        fuente: "tenant",
        region: null,
        esTenant: true,
      },
    ]);
    expect(resuelto).toHaveLength(1);
    expect(resuelto[0]?.nombre).toBe("Aniversario de la empresa");
    expect(resuelto[0]?.fuente).toBe("tenant");
  });

  it("lo regional gana a lo nacional en la misma fecha", () => {
    const resuelto = resolverFeriados([
      nacional("2026-10-12", "Encuentro de Dos Mundos"),
      {
        fecha: "2026-10-12",
        nombre: "Feriado regional",
        irrenunciable: false,
        fuente: "regional",
        region: "CL-AP",
        esTenant: false,
      },
    ]);
    expect(resuelto[0]?.fuente).toBe("regional");
  });

  it("fechas distintas conviven y quedan ordenadas", () => {
    const resuelto = resolverFeriados([
      nacional("2026-12-25", "Navidad", true),
      nacional("2026-05-01", "Día del Trabajo", true),
    ]);
    expect(resuelto.map((f) => f.fecha)).toEqual(["2026-05-01", "2026-12-25"]);
  });
});

describe("feriadosDelMes", () => {
  const todos = resolverFeriados([
    nacional("2026-09-18", "Independencia", true),
    nacional("2026-09-19", "Glorias del Ejército", true),
    nacional("2026-10-12", "Encuentro de Dos Mundos"),
  ]);
  it("filtra por año y mes", () => {
    expect(feriadosDelMes(todos, 2026, 9).map((f) => f.fecha)).toEqual([
      "2026-09-18",
      "2026-09-19",
    ]);
    expect(feriadosDelMes(todos, 2026, 10)).toHaveLength(1);
    expect(feriadosDelMes(todos, 2027, 9)).toHaveLength(0);
  });
});

describe("conjuntoFeriados", () => {
  it("devuelve el set de fechas", () => {
    const s = conjuntoFeriados(resolverFeriados([nacional("2026-09-18", "Independencia", true)]));
    expect(s.has("2026-09-18")).toBe(true);
  });
});

describe("diaUtc valida fechas inexistentes", () => {
  it("rechaza 2026-02-30", () => {
    expect(() => diaUtc("2026-02-30")).toThrow();
  });
  it("rechaza formato malo", () => {
    expect(() => diaUtc("2026-2-3")).toThrow();
  });
});
