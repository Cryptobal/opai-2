import { describe, expect, it } from "vitest";

import { agendarPasos, indicadorSeguimiento, instanteLocal, planBasePorVertical } from "./seguimiento";

// CAR-160: cadencia del piso de 1.0 (3, 7, 14 y 15 días hábiles a las 9:00) e indicador del tablero.
const ZONA = "America/Santiago";
const { config } = planBasePorVertical("seguridad");

describe("cadencia 3/7/14/15 con el feriado del 1-nov-2026 (CAR-160)", () => {
  // El brief habla del «viernes 31-oct-2026», pero ese día es sábado: se prueban el viernes 30 y el
  // sábado 31. En los dos el día del envío no cuenta y el feriado (domingo 1-nov) no corre nada.
  const feriados = new Set(["2026-10-31", "2026-11-01"]);
  it("envío el viernes 30-oct: pasos el 4, 10, 19 y 20 de noviembre a las 9:00", () => {
    const r = agendarPasos(config, instanteLocal("2026-10-30", "16:00", ZONA), feriados, ZONA);
    expect(r.map((p) => p.fecha)).toEqual(["2026-11-04", "2026-11-10", "2026-11-19", "2026-11-20"]);
    expect(r.map((p) => p.programadoEn.toISOString())).toEqual([
      "2026-11-04T12:00:00.000Z",
      "2026-11-10T12:00:00.000Z",
      "2026-11-19T12:00:00.000Z",
      "2026-11-20T12:00:00.000Z",
    ]);
  });
  it("envío el sábado 31-oct (feriado): mismas fechas, el primer hábil que cuenta es el lunes 2", () => {
    const r = agendarPasos(config, instanteLocal("2026-10-31", "10:00", ZONA), feriados, ZONA);
    expect(r.map((p) => p.fecha)).toEqual(["2026-11-04", "2026-11-10", "2026-11-19", "2026-11-20"]);
  });
  it("un feriado propio del tenant dentro del plazo corre los pasos siguientes", () => {
    const r = agendarPasos(config, instanteLocal("2026-10-30", "16:00", ZONA), new Set([...feriados, "2026-11-03"]), ZONA);
    expect(r.map((p) => p.fecha)).toEqual(["2026-11-05", "2026-11-11", "2026-11-20", "2026-11-23"]);
  });
});

describe("indicador de la tarjeta del tablero (spec §4)", () => {
  const pasos = (estados: string[], fechas: string[]) =>
    estados.map((estado, i) => ({
      orden: i + 1,
      estado: estado as "programado",
      programadoEn: instanteLocal(fechas[i]!, "09:00", ZONA),
    }));
  const fechas = ["2026-11-04", "2026-11-10", "2026-11-19", "2026-11-20"];
  const ahora = instanteLocal("2026-11-10", "08:00", ZONA);
  it("«Seguimiento 2 de 4 · hoy» cuando el próximo paso es de hoy", () => {
    expect(indicadorSeguimiento("activo", pasos(["hecho", "programado", "programado", "programado"], fechas), ahora, ZONA)).toEqual({ texto: "Seguimiento 2 de 4 · hoy", tono: "warning" });
  });
  it("sin «hoy» cuando el próximo paso es otro día", () => {
    expect(indicadorSeguimiento("activo", pasos(["hecho", "hecho", "programado", "programado"], fechas), ahora, ZONA)?.texto).toBe("Seguimiento 3 de 4");
  });
  it("«Vencido» si un paso pendiente es de un día anterior", () => {
    expect(indicadorSeguimiento("activo", pasos(["por_hacer", "programado", "programado", "programado"], fechas), ahora, ZONA)).toEqual({ texto: "Vencido", tono: "danger" });
  });
  it("«Pausado», «Con fallos» y nada si terminó o no quedan pasos", () => {
    const p = pasos(["hecho", "programado", "programado", "programado"], fechas);
    expect(indicadorSeguimiento("pausado", p, ahora, ZONA)?.texto).toBe("Pausado");
    expect(indicadorSeguimiento("activo", pasos(["hecho", "fallido", "programado", "programado"], fechas), ahora, ZONA)?.texto).toBe("Con fallos");
    expect(indicadorSeguimiento("terminado", p, ahora, ZONA)).toBeNull();
    expect(indicadorSeguimiento("activo", pasos(["hecho", "hecho", "omitido", "hecho"], fechas), ahora, ZONA)).toBeNull();
  });
});
