import { describe, expect, it } from "vitest";

import { expandirMes } from "./pauta/expandir";
import type { ExcepcionPauta, PatronPauta, SeriePauta } from "./pauta/tipos";
import { derivarTurnosDePauta, horasDeTurnoEsperado, mismoTurno } from "./turnos-esperados";
import { derivarTurnosDeJornada, leerDistribucion } from "./turnos-jornada-pactada";
import { horasEntre, intervaloEsperado } from "./turnos-instantes";
import { horasSemanalesSugeridas, PATRONES_FABRICA } from "./turnos";

const ZONA = "America/Santiago";
const P4x4: PatronPauta = { clase: "ciclico", diasTrabajo: 4, diasDescanso: 4, diasSemana: [] };
const P5x2: PatronPauta = { clase: "semanal", diasTrabajo: 5, diasDescanso: 2, diasSemana: [1, 2, 3, 4, 5] };
const P12x12: PatronPauta = { clase: "ciclico", diasTrabajo: 1, diasDescanso: 1, diasSemana: [] };

const serie = (patron: PatronPauta, over: Partial<SeriePauta> = {}): SeriePauta => ({
  id: "s1", puestoId: "pu", patron, inicioCiclo: "2026-10-01", titularId: "ana",
  desde: "2026-10-01", hasta: null, ...over,
});

function turnos(opts: {
  anio?: number; mes?: number; series: SeriePauta[]; excepciones?: ExcepcionPauta[];
  feriados?: [string, string][]; horario?: [string, string]; colacionMin?: number;
}) {
  const celdas = expandirMes({
    anio: opts.anio ?? 2026, mes: opts.mes ?? 10, series: opts.series,
    excepciones: opts.excepciones ?? [], feriados: new Map(opts.feriados ?? []),
  });
  const [horaInicio, horaFin] = opts.horario ?? ["08:00", "20:00"];
  return derivarTurnosDePauta({
    celdas, zona: ZONA,
    puesto: { id: "pu", instalacionId: "in", horaInicio, horaFin, colacionMin: opts.colacionMin ?? 0 },
  });
}

describe("intervalos [inicio, fin) en la zona del tenant", () => {
  it("un turno de día dura lo nominal", () => {
    const { inicio, fin } = intervaloEsperado("2026-10-01", "08:00", "20:00", ZONA);
    expect(horasEntre(inicio, fin)).toBe(12);
  });
  it("cruza la medianoche: el fin cae al día siguiente", () => {
    const { inicio, fin } = intervaloEsperado("2026-10-01", "20:00", "08:00", ZONA);
    expect(horasEntre(inicio, fin)).toBe(12);
    expect(fin.getTime()).toBeGreaterThan(inicio.getTime());
  });
  it("nocturno el día que se adelanta la hora (sáb 5-sep-2026 → dom 6-sep): 7 h reales", () => {
    const { inicio, fin } = intervaloEsperado("2026-09-05", "22:00", "06:00", ZONA);
    expect(horasEntre(inicio, fin)).toBe(7);
  });
  it("nocturno el día que se atrasa la hora (sáb 4-abr-2026 → dom 5-abr): 9 h reales", () => {
    const { inicio, fin } = intervaloEsperado("2026-04-04", "22:00", "06:00", ZONA);
    expect(horasEntre(inicio, fin)).toBe(9);
  });
  it("la colación dentro de la jornada se descuenta de las horas", () => {
    const [t] = turnos({ series: [serie(P5x2)], horario: ["08:00", "17:00"], colacionMin: 60 });
    expect(horasDeTurnoEsperado(t!)).toBe(8);
  });
});

describe("patrones", () => {
  it("4×4: 4 días de trabajo, 4 de descanso", () => {
    const fechas = turnos({ series: [serie(P4x4)] }).map((t) => t.fecha);
    expect(fechas.slice(0, 5)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-09"]);
  });
  it("5×2: lunes a viernes", () => {
    const fechas = turnos({ series: [serie(P5x2)], horario: ["09:00", "18:00"] }).map((t) => t.fecha);
    expect(fechas).toHaveLength(22);
    expect(fechas).not.toContain("2026-10-03");
  });
  it("12×12 de noche: un turno por día alterno, cada uno de 12 h", () => {
    const t = turnos({ series: [serie(P12x12)], horario: ["20:00", "08:00"] });
    expect(t).toHaveLength(16);
    expect(t.every((x) => horasEntre(x.inicio, x.fin) === 12)).toBe(true);
  });
  it("la colación y la jornada semanal usan el mismo cálculo del dominio", () => {
    const p = PATRONES_FABRICA.find((x) => x.nombre === "4×4")!;
    expect(horasSemanalesSugeridas({ patron: p, tramos: [{ horaInicio: "08:00", horaFin: "20:00" }], colacionMin: 60, colacionFuera: false })).toBe(38.5);
  });
});

describe("excepciones, feriados y vigencias", () => {
  const exc = (tipo: ExcepcionPauta["tipo"], fecha: string, personaId: string | null = null): ExcepcionPauta =>
    ({ puestoId: "pu", fecha, tipo, motivo: "x", personaId });

  it("un reemplazo de un día mueve el turno al reemplazante", () => {
    const t = turnos({ series: [serie(P5x2)], excepciones: [exc("reemplazo", "2026-10-06", "beto")] });
    expect(t.find((x) => x.fecha === "2026-10-06")?.personaId).toBe("beto");
    expect(t.filter((x) => x.personaId === "ana").some((x) => x.fecha === "2026-10-06")).toBe(false);
  });
  it("ausencia, licencia, vacaciones y permiso dejan el día sin turno", () => {
    for (const tipo of ["ausencia", "licencia", "vacaciones", "permiso"] as const) {
      const t = turnos({ series: [serie(P5x2)], excepciones: [exc(tipo, "2026-10-06")] });
      expect(t.some((x) => x.fecha === "2026-10-06")).toBe(false);
    }
  });
  it("un refuerzo se suma al turno del titular si este trabaja", () => {
    const celdas = expandirMes({
      anio: 2026, mes: 10, series: [serie(P5x2)], excepciones: [exc("refuerzo", "2026-10-06", "caro")], feriados: new Map(),
    });
    const t = derivarTurnosDePauta({
      celdas, zona: ZONA, puesto: { id: "pu", instalacionId: "in", horaInicio: "08:00", horaFin: "17:00", colacionMin: 0 },
      titularTrabaja: () => true,
    }).filter((x) => x.fecha === "2026-10-06");
    expect(t.map((x) => x.personaId).sort()).toEqual(["ana", "caro"]);
  });
  it("el feriado se marca pero no quita el turno", () => {
    const t = turnos({ series: [serie(P5x2)], feriados: [["2026-10-12", "Encuentro de Dos Mundos"]] });
    expect(t.find((x) => x.fecha === "2026-10-12")?.feriado).toBe(true);
    expect(t.find((x) => x.fecha === "2026-10-13")?.feriado).toBe(false);
  });
  it("una serie que termina a mitad de mes no genera turnos después", () => {
    const t = turnos({ series: [serie(P5x2, { hasta: "2026-10-15" })] });
    expect(t.at(-1)?.fecha).toBe("2026-10-15");
  });
  it("PPC sin titular no genera turno", () => {
    expect(turnos({ series: [serie(P5x2, { titularId: null })] })).toHaveLength(0);
  });
  it("regenerar dos veces da lo mismo (comparación por contenido)", () => {
    const a = turnos({ series: [serie(P4x4)] });
    const b = turnos({ series: [serie(P4x4)] });
    expect(a.every((x, i) => mismoTurno(x, b[i]!))).toBe(true);
  });
});

describe("jornada pactada", () => {
  const base = {
    personaId: "ana", instalacionId: "in", puestoId: null, inicioVinculo: "2026-10-01",
    terminoVinculo: null, horarioPuesto: null, colacionMin: 0,
  };
  it("lee «5x2», «4×4 08:00-20:00» y rechaza texto libre", () => {
    expect(leerDistribucion("5x2")?.patron.clase).toBe("semanal");
    expect(leerDistribucion("4×4 8:00-20:00")).toMatchObject({ horaInicio: "08:00", horaFin: "20:00" });
    expect(leerDistribucion("turnos rotativos")).toBeNull();
  });
  it("genera los turnos del mes con el horario del texto", () => {
    const r = derivarTurnosDeJornada([{ ...base, distribucion: "5x2 09:00-18:00" }], "2026-10-01", "2026-10-31", ZONA);
    expect(r.turnos).toHaveLength(22);
    expect(r.turnos[0]?.origen).toBe("jornada_pactada");
    expect(r.avisos).toEqual([]);
  });
  it("sin datos suficientes no inventa: avisa", () => {
    const r = derivarTurnosDeJornada(
      [{ ...base, distribucion: "5x2" }, { ...base, personaId: "beto", distribucion: "a convenir" }],
      "2026-10-01", "2026-10-31", ZONA,
    );
    expect(r.turnos).toHaveLength(0);
    expect(r.avisos).toEqual([
      { personaId: "ana", motivo: "sin_horario" },
      { personaId: "beto", motivo: "distribucion_ilegible" },
    ]);
  });
  it("usa el horario del puesto cuando el texto no lo trae y respeta el término del vínculo", () => {
    const r = derivarTurnosDeJornada(
      [{ ...base, distribucion: "5x2", horarioPuesto: { horaInicio: "08:00", horaFin: "17:00" }, terminoVinculo: "2026-10-09" }],
      "2026-10-01", "2026-10-31", ZONA,
    );
    expect(r.turnos.at(-1)?.fecha).toBe("2026-10-09");
  });
});
