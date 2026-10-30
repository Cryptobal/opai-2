import { describe, expect, it } from "vitest";

import {
  conjuntoFeriados,
  type DiaCalendarioEntrada,
  feriadosDelMes,
  resolverFeriados,
} from "./dias";
import { feriadosLegalesComoEntradas } from "./feriados";
import { diaUtc } from "./fechas";
import { diasHabilesEntre } from "./habiles";

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

describe("unión de feriados legales calculados con filas de la tabla", () => {
  it("une los calculados con una fila puntual de plataforma y una propia del tenant, sin duplicar", () => {
    const legales = feriadosLegalesComoEntradas(2026);
    const eleccion: DiaCalendarioEntrada = {
      fecha: "2026-11-29",
      nombre: "Elecciones (ley puntual)",
      irrenunciable: true,
      fuente: "nacional",
      region: null,
      esTenant: false,
    };
    const propio: DiaCalendarioEntrada = {
      fecha: "2026-03-10",
      nombre: "Aniversario de la empresa",
      irrenunciable: false,
      fuente: "tenant",
      region: null,
      esTenant: true,
    };
    const resuelto = resolverFeriados([...legales, eleccion, propio]);
    // 16 legales + 1 puntual + 1 propio = 18 fechas distintas, sin duplicados.
    expect(resuelto).toHaveLength(18);
    expect(new Set(resuelto.map((f) => f.fecha)).size).toBe(18);
    expect(resuelto.some((f) => f.fecha === "2026-11-29")).toBe(true);
    expect(resuelto.some((f) => f.fecha === "2026-03-10")).toBe(true);
  });

  it("una fila del tenant en la misma fecha que un feriado legal lo sobrescribe, sin duplicar", () => {
    const legales = feriadosLegalesComoEntradas(2026); // incluye 2026-09-18 Independencia
    const propio: DiaCalendarioEntrada = {
      fecha: "2026-09-18",
      nombre: "Día propio de la empresa",
      irrenunciable: false,
      fuente: "tenant",
      region: null,
      esTenant: true,
    };
    const resuelto = resolverFeriados([...legales, propio]);
    expect(resuelto).toHaveLength(16); // el propio reemplaza al legal en esa fecha
    expect(resuelto.find((f) => f.fecha === "2026-09-18")?.nombre).toBe("Día propio de la empresa");
  });

  it("los días hábiles usan los feriados calculados (Viernes Santo 2026 no es hábil)", () => {
    const ambito = conjuntoFeriados(resolverFeriados([...feriadosLegalesComoEntradas(2026)]));
    // Semana Santa 2026: Viernes Santo 3-abr y Sábado Santo 4-abr. Lun 30-mar … vie 3-abr → 4 hábiles.
    expect(diasHabilesEntre("2026-03-30", "2026-04-03", ambito)).toBe(4);
    // Sin los calculados, los 5 días serían hábiles.
    expect(diasHabilesEntre("2026-03-30", "2026-04-03", new Set())).toBe(5);
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
