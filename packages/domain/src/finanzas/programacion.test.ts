import { describe, expect, it } from "vitest";

import {
  type AgendaProgramacion,
  fechaDelMes,
  fechasGeneracion,
  fechaUfDe,
  periodosProgramacion,
  permitidoPorCorte,
  proximaEjecucion,
} from "./programacion";

const base: AgendaProgramacion = {
  frecuencia: "mensual",
  diaGeneracion: 5,
  diaSemana: null,
  mesDelAnio: null,
  fechaInicio: "2026-01-01",
  fechaFin: null,
};
const sinCorte = { fechaCorte: null, ultimoPeriodo10: null };

describe("programación · fechas de generación", () => {
  it("mensual: un día por mes dentro del rango", () => {
    expect(fechasGeneracion(base, "2026-01-01", "2026-03-31")).toEqual(["2026-01-05", "2026-02-05", "2026-03-05"]);
  });

  it("día 31 y -1 en febrero caen en el último día (bisiesto y no bisiesto)", () => {
    expect(fechaDelMes(2026, 2, 31)).toBe("2026-02-28");
    expect(fechaDelMes(2028, 2, 30)).toBe("2028-02-29");
    expect(fechaDelMes(2026, 2, -1)).toBe("2026-02-28");
    expect(fechaDelMes(2028, 2, -1)).toBe("2028-02-29");
    const a = { ...base, diaGeneracion: 29 };
    expect(fechasGeneracion(a, "2026-01-01", "2026-03-31")).toEqual(["2026-01-29", "2026-02-28", "2026-03-29"]);
  });

  it("respeta la fecha de inicio y la de fin vencida", () => {
    expect(fechasGeneracion({ ...base, fechaInicio: "2026-02-10" }, "2026-01-01", "2026-03-31")).toEqual(["2026-03-05"]);
    expect(fechasGeneracion({ ...base, fechaFin: "2026-01-31" }, "2026-01-01", "2026-12-31")).toEqual(["2026-01-05"]);
    expect(fechasGeneracion({ ...base, fechaFin: "2025-12-31" }, "2026-01-01", "2026-12-31")).toEqual([]);
  });

  it("anual: solo el mes del año", () => {
    const a = { ...base, frecuencia: "anual" as const, mesDelAnio: 3 };
    expect(fechasGeneracion(a, "2026-01-01", "2027-12-31")).toEqual(["2026-03-05", "2027-03-05"]);
  });

  it("semanal y quincenal desde el día de semana", () => {
    const sem = { ...base, frecuencia: "semanal" as const, diaSemana: 1, fechaInicio: "2026-11-01" };
    expect(fechasGeneracion(sem, "2026-11-01", "2026-11-20")).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    const q = { ...sem, frecuencia: "quincenal" as const };
    expect(fechasGeneracion(q, "2026-11-01", "2026-12-01")).toEqual(["2026-11-02", "2026-11-16", "2026-11-30"]);
    expect(fechasGeneracion(q, "2026-11-10", "2026-12-01")).toEqual(["2026-11-16", "2026-11-30"]);
  });
});

describe("programación · corte con 1.0", () => {
  it("no genera antes de la fecha de corte ni hasta el último período de 1.0", () => {
    expect(permitidoPorCorte("2026-10-05", { fechaCorte: "2026-11-01", ultimoPeriodo10: null })).toBe(false);
    expect(permitidoPorCorte("2026-11-05", { fechaCorte: null, ultimoPeriodo10: "2026-11" })).toBe(false);
    expect(permitidoPorCorte("2026-12-05", { fechaCorte: null, ultimoPeriodo10: "2026-11" })).toBe(true);
    expect(permitidoPorCorte("2026-11-09", { fechaCorte: null, ultimoPeriodo10: "2026-11-09" })).toBe(false);
  });

  it("los períodos omiten los ya hechos y los cubiertos por 1.0", () => {
    const r = periodosProgramacion(base, { fechaCorte: null, ultimoPeriodo10: "2026-01" }, {
      hasta: "2026-04-30",
      hechos: new Set(["2026-03"]),
      limite: 10,
    });
    expect(r).toEqual([
      { periodo: "2026-02", fecha: "2026-02-05" },
      { periodo: "2026-04", fecha: "2026-04-05" },
    ]);
  });

  it("próxima ejecución: el primer período pendiente", () => {
    expect(proximaEjecucion(base, sinCorte, new Set(["2026-01"]), "2026-01-20")).toBe("2026-02-05");
    expect(proximaEjecucion({ ...base, fechaFin: "2026-01-31" }, sinCorte, new Set(["2026-01"]), "2026-02-01")).toBeNull();
  });
});

describe("programación · fecha de la UF", () => {
  it("cada política da su fecha", () => {
    expect(fechaUfDe("RUN_DAY", null, "2026-03-05")).toBe("2026-03-05");
    expect(fechaUfDe(null, null, "2026-03-05")).toBe("2026-03-05");
    expect(fechaUfDe("LAST_DAY_PREV_MONTH", null, "2026-03-05")).toBe("2026-02-28");
    expect(fechaUfDe("FIRST_DAY_MONTH", null, "2026-03-05")).toBe("2026-03-01");
    expect(fechaUfDe("LAST_DAY_MONTH", null, "2026-02-05")).toBe("2026-02-28");
    expect(fechaUfDe("CUSTOM_DAY", 31, "2026-04-05")).toBe("2026-04-30");
    expect(fechaUfDe("LAST_DAY_PREV_MONTH", null, "2026-01-05")).toBe("2025-12-31");
  });
});
