import { describe, expect, it } from "vitest";

import { hoyIso, mover, nombreDia, semanas, vistaDe } from "./calendario";

describe("calendario es-CL", () => {
  it("la semana parte el lunes: marzo 2026 empieza en domingo (6.ª columna ocupada: lunes 23 feb)", () => {
    const s = semanas(2026, 2);
    expect(s).toHaveLength(6);
    expect(s[0]?.[0]).toEqual({ iso: "2026-02-23", dia: 23, delMes: false });
    expect(s[0]?.[6]).toEqual({ iso: "2026-03-01", dia: 1, delMes: true });
  });
  it("un mes que empieza en lunes no tiene días previos", () => {
    expect(semanas(2026, 5)[0]?.[0]).toEqual({ iso: "2026-06-01", dia: 1, delMes: true });
  });
  it("mover cruza años en ambos sentidos", () => {
    expect(mover({ anio: 2026, mes: 11 }, 1)).toEqual({ anio: 2027, mes: 0 });
    expect(mover({ anio: 2026, mes: 0 }, -1)).toEqual({ anio: 2025, mes: 11 });
    expect(mover({ anio: 2026, mes: 5 }, -12)).toEqual({ anio: 2025, mes: 5 });
  });
  it("la vista sigue al valor o cae a hoy", () => {
    expect(vistaDe("1990-07-15")).toEqual({ anio: 1990, mes: 6 });
    expect(vistaDe("", new Date(2026, 9, 24))).toEqual({ anio: 2026, mes: 9 });
    expect(hoyIso(new Date(2026, 9, 4))).toBe("2026-10-04");
  });
  it("nombre accesible en español", () => {
    expect(nombreDia("2026-03-02")).toBe("lunes 2 de marzo de 2026");
  });
});

describe("vista con valores raros", () => {
  it("un mes fuera de rango cae a hoy en vez de un encabezado roto", () => {
    expect(vistaDe("2026-13-01", new Date(2026, 9, 24))).toEqual({ anio: 2026, mes: 9 });
  });
});
