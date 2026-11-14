import { describe, expect, it } from "vitest";

import { ocurrenciasProgramacion, type ProgramacionRonda } from "./programacion";

const Z = "America/Santiago";
const base: ProgramacionRonda = {
  horarios: [],
  diasSemana: [0, 1, 2, 3, 4, 5, 6],
  vigenciaDesde: null,
  vigenciaHasta: null,
};
const iso = (ds: Date[]) => ds.map((d) => d.toISOString());

describe("ocurrencias de una programación de rondas (CAR-501)", () => {
  // 14-nov-2026 es sábado; Chile está en horario de verano (UTC-3).
  const desde = new Date("2026-11-14T12:00:00Z");
  const hasta = new Date("2026-11-14T15:00:00Z");

  it("horas fijas en la zona del tenant", () => {
    const r = ocurrenciasProgramacion({ ...base, horarios: ["09:30", "13:00"] }, desde, hasta, Z);
    expect(iso(r)).toEqual(["2026-11-14T12:30:00.000Z"]);
  });

  it("intervalo cada N minutos, con el extremo incluido", () => {
    const r = ocurrenciasProgramacion(
      { ...base, horarios: [{ cadaMin: 60, desde: "09:00", hasta: "11:00" }] },
      desde,
      hasta,
      Z,
    );
    expect(iso(r)).toEqual([
      "2026-11-14T12:00:00.000Z",
      "2026-11-14T13:00:00.000Z",
      "2026-11-14T14:00:00.000Z",
    ]);
  });

  it("un intervalo nocturno sigue después de medianoche y respeta el día en que arranca", () => {
    const p = {
      ...base,
      diasSemana: [5],
      horarios: [{ cadaMin: 120, desde: "22:00", hasta: "02:00" }],
    };
    // Viernes 13 a las 22:00, sábado 14 a las 00:00 y 02:00 (hora de Chile).
    const r = ocurrenciasProgramacion(
      p,
      new Date("2026-11-14T00:00:00Z"),
      new Date("2026-11-14T06:00:00Z"),
      Z,
    );
    expect(iso(r)).toEqual([
      "2026-11-14T01:00:00.000Z",
      "2026-11-14T03:00:00.000Z",
      "2026-11-14T05:00:00.000Z",
    ]);
  });

  it("sin días, fuera de los días elegidos o fuera de la vigencia no hay rondas", () => {
    const p = { ...base, horarios: ["10:00"] };
    expect(ocurrenciasProgramacion({ ...p, diasSemana: [] }, desde, hasta, Z)).toEqual([]);
    expect(ocurrenciasProgramacion({ ...p, diasSemana: [1] }, desde, hasta, Z)).toEqual([]);
    expect(ocurrenciasProgramacion({ ...p, vigenciaHasta: "2026-11-13" }, desde, hasta, Z)).toEqual(
      [],
    );
    expect(
      ocurrenciasProgramacion({ ...p, vigenciaDesde: "2026-11-14" }, desde, hasta, Z),
    ).toHaveLength(1);
  });

  it("una hora pedida por dos horarios (turno de noche y de día) sale una sola vez", () => {
    const p = {
      ...base,
      horarios: [
        { cadaMin: 60, desde: "20:00", hasta: "08:00" },
        { cadaMin: 60, desde: "08:00", hasta: "20:00" },
      ],
    };
    const r = ocurrenciasProgramacion(
      p,
      new Date("2026-11-14T10:00:00Z"),
      new Date("2026-11-14T12:00:00Z"),
      Z,
    );
    expect(iso(r)).toEqual(["2026-11-14T10:00:00.000Z", "2026-11-14T11:00:00.000Z"]);
  });
});
