import { describe, expect, it } from "vitest";

import {
  diasDelMes,
  expandirMes,
  rangoDias,
  resumirCobertura,
  serieVigente,
  trabajaEn,
  type PatronPauta,
  type SeriePauta,
} from "./index";
import { sumarDias } from "../calendario/fechas";

const P4X4: PatronPauta = { clase: "ciclico", diasTrabajo: 4, diasDescanso: 4, diasSemana: [] };
const P5X2: PatronPauta = { clase: "semanal", diasTrabajo: 5, diasDescanso: 2, diasSemana: [1, 2, 3, 4, 5] };
const P14X14: PatronPauta = { clase: "ciclico", diasTrabajo: 14, diasDescanso: 14, diasSemana: [] };

const serie = (patron: PatronPauta, extra: Partial<SeriePauta> = {}): SeriePauta => ({
  id: "s1",
  puestoId: "p1",
  patron,
  inicioCiclo: "2026-10-01",
  titularId: "juan",
  desde: "2026-01-01",
  hasta: null,
  ...extra,
});

describe("fechas", () => {
  it("arma el mes y el rango inclusivo", () => {
    expect(diasDelMes(2026, 2)).toHaveLength(28);
    expect(diasDelMes(2028, 2)).toHaveLength(29);
    expect(rangoDias("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(rangoDias("2026-10-05", "2026-10-01")).toEqual([]);
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("trabajaEn", () => {
  it("4x4 trabaja 4 y descansa 4 desde el inicio de ciclo", () => {
    const dias = rangoDias("2026-10-01", "2026-10-09").map((f) => trabajaEn(P4X4, "2026-10-01", f));
    expect(dias).toEqual([true, true, true, true, false, false, false, false, true]);
  });
  it("la fase vale también antes del inicio de ciclo", () => {
    expect(trabajaEn(P4X4, "2026-10-01", "2026-09-30")).toBe(false);
    expect(trabajaEn(P4X4, "2026-10-01", "2026-09-26")).toBe(true);
  });
  it("14x14 cruza meses sin perder la fase", () => {
    expect(trabajaEn(P14X14, "2026-10-20", "2026-11-02")).toBe(true);
    expect(trabajaEn(P14X14, "2026-10-20", "2026-11-03")).toBe(false);
    expect(trabajaEn(P14X14, "2026-10-20", "2026-12-15")).toBe(true);
  });
  it("5x2 es lunes a viernes", () => {
    expect(trabajaEn(P5X2, "2026-10-01", "2026-10-30")).toBe(true); // viernes
    expect(trabajaEn(P5X2, "2026-10-01", "2026-10-31")).toBe(false); // sábado
    expect(trabajaEn(P5X2, "2026-10-01", "2026-11-01")).toBe(false); // domingo
  });
});

describe("serieVigente", () => {
  const a = serie(P4X4, { id: "a", hasta: "2026-10-14" });
  const b = serie(P5X2, { id: "b", desde: "2026-10-15" });
  it("elige por fecha y respeta el cierre", () => {
    expect(serieVigente([a, b], "2026-10-14")?.id).toBe("a");
    expect(serieVigente([a, b], "2026-10-15")?.id).toBe("b");
    expect(serieVigente([a], "2026-10-15")).toBeNull();
  });
});

describe("expandirMes", () => {
  const feriados = new Map([["2026-10-12", "Encuentro de Dos Mundos"]]);
  const base = { anio: 2026, mes: 10, series: [serie(P4X4)], excepciones: [], feriados };

  it("pinta el patrón y marca el feriado sin cambiarlo", () => {
    const c = expandirMes(base);
    expect(c).toHaveLength(31);
    expect(c[0]).toMatchObject({ fecha: "2026-10-01", estado: "cubierto", titularId: "juan" });
    expect(c[4]).toMatchObject({ estado: "libre" });
    expect(c[11]).toMatchObject({ fecha: "2026-10-12", feriado: "Encuentro de Dos Mundos" });
  });

  it("una excepción en día de trabajo es PPC con su motivo y se distingue de la serie", () => {
    const c = expandirMes({
      ...base,
      excepciones: [{ puestoId: "p1", fecha: "2026-10-02", tipo: "licencia", motivo: "Licencia médica", personaId: "juan" }],
    });
    expect(c[1]).toMatchObject({ estado: "ppc", motivo: "licencia", excepcion: true });
    expect(c[0]).toMatchObject({ estado: "cubierto", excepcion: false });
  });

  it("una excepción en día libre no cambia la grilla", () => {
    const c = expandirMes({
      ...base,
      excepciones: [{ puestoId: "p1", fecha: "2026-10-06", tipo: "vacaciones", motivo: "x", personaId: null }],
    });
    expect(c[5]).toMatchObject({ estado: "libre", excepcion: false });
  });

  it("sin titular el turno es PPC «sin_titular»", () => {
    const c = expandirMes({ ...base, series: [serie(P4X4, { titularId: null })] });
    expect(c[0]).toMatchObject({ estado: "ppc", motivo: "sin_titular", titularId: null });
  });

  it("sin serie vigente no hay cobertura que medir", () => {
    const c = expandirMes({ ...base, series: [serie(P4X4, { desde: "2026-10-10" })] });
    expect(c[0]!.estado).toBe("sin_serie");
    expect(c[9]!.estado).not.toBe("sin_serie");
  });

  it("un cambio de serie a mitad de mes no toca los días anteriores", () => {
    const antes = serie(P4X4, { id: "a", hasta: "2026-10-14" });
    const despues = serie(P5X2, { id: "b", desde: "2026-10-15", titularId: "ana" });
    const c = expandirMes({ ...base, series: [antes, despues] });
    expect(c[0]).toMatchObject({ estado: "cubierto", titularId: "juan" });
    expect(c[14]).toMatchObject({ fecha: "2026-10-15", estado: "cubierto", titularId: "ana" });
    expect(c[16]).toMatchObject({ fecha: "2026-10-17", estado: "libre" });
  });
});

describe("resumirCobertura", () => {
  it("cuenta cubiertos y PPC por motivo y calcula el porcentaje", () => {
    const celdas = expandirMes({
      anio: 2026,
      mes: 10,
      series: [serie(P4X4)],
      excepciones: [
        { puestoId: "p1", fecha: "2026-10-01", tipo: "ausencia", motivo: "x", personaId: "juan" },
        { puestoId: "p1", fecha: "2026-10-02", tipo: "licencia", motivo: "x", personaId: "juan" },
      ],
      feriados: new Map(),
    });
    const r = resumirCobertura(celdas);
    expect(r.programados).toBe(r.cubiertos + r.ppc);
    expect(r.ppc).toBe(2);
    expect(r.ppcPorMotivo).toEqual({ ausencia: 1, licencia: 1 });
    expect(r.cobertura).toBe(Math.round(((r.programados - 2) / r.programados) * 1000) / 10);
  });
  it("sin turnos la cobertura es null, no 100 %", () => {
    expect(resumirCobertura([]).cobertura).toBeNull();
  });
});
