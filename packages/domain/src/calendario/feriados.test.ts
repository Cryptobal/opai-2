import { describe, expect, it } from "vitest";

import { feriadosLegales } from "./feriados";
import { domingoDePascua } from "./pascua";
import { solsticioJunio } from "./solsticio";

const fechas = (anio: number) => feriadosLegales(anio).map((f) => `${f.fecha} ${f.nombre}`);

// Feriados nacionales legales de Chile, fecha por fecha, calculados por regla (CAR-79). Las fechas de
// 2017, 2018 y 2024 se contrastaron con los feriados realmente observados (traslados de la Ley 19.668,
// 20.215 y 20.299/20.983). 2026–2028 son los años del encargo.
describe("feriadosLegales · fecha por fecha", () => {
  it("2026 trae los 16 feriados nacionales con sus fechas", () => {
    expect(fechas(2026)).toEqual([
      "2026-01-01 Año Nuevo",
      "2026-04-03 Viernes Santo",
      "2026-04-04 Sábado Santo",
      "2026-05-01 Día Nacional del Trabajo",
      "2026-05-21 Día de las Glorias Navales",
      "2026-06-21 Día Nacional de los Pueblos Indígenas",
      "2026-06-29 San Pedro y San Pablo",
      "2026-07-16 Día de la Virgen del Carmen",
      "2026-08-15 Asunción de la Virgen",
      "2026-09-18 Independencia Nacional",
      "2026-09-19 Día de las Glorias del Ejército",
      "2026-10-12 Encuentro de Dos Mundos",
      "2026-10-31 Día de las Iglesias Evangélicas y Protestantes",
      "2026-11-01 Día de Todos los Santos",
      "2026-12-08 Inmaculada Concepción",
      "2026-12-25 Navidad",
    ]);
  });

  it("2027 no repite las fechas de 2026 (Semana Santa y traslados cambian)", () => {
    expect(fechas(2027)).toEqual([
      "2027-01-01 Año Nuevo",
      "2027-03-26 Viernes Santo",
      "2027-03-27 Sábado Santo",
      "2027-05-01 Día Nacional del Trabajo",
      "2027-05-21 Día de las Glorias Navales",
      "2027-06-21 Día Nacional de los Pueblos Indígenas",
      "2027-06-28 San Pedro y San Pablo",
      "2027-07-16 Día de la Virgen del Carmen",
      "2027-08-15 Asunción de la Virgen",
      "2027-09-18 Independencia Nacional",
      "2027-09-19 Día de las Glorias del Ejército",
      "2027-10-11 Encuentro de Dos Mundos",
      "2027-10-31 Día de las Iglesias Evangélicas y Protestantes",
      "2027-11-01 Día de Todos los Santos",
      "2027-12-08 Inmaculada Concepción",
      "2027-12-25 Navidad",
    ]);
    expect(fechas(2027)).not.toEqual(fechas(2026));
  });

  it("2028 mueve San Pedro, Dos Mundos y las Iglesias Evangélicas (31-oct martes → 27-oct)", () => {
    expect(fechas(2028)).toEqual([
      "2028-01-01 Año Nuevo",
      "2028-04-14 Viernes Santo",
      "2028-04-15 Sábado Santo",
      "2028-05-01 Día Nacional del Trabajo",
      "2028-05-21 Día de las Glorias Navales",
      "2028-06-20 Día Nacional de los Pueblos Indígenas",
      "2028-06-26 San Pedro y San Pablo",
      "2028-07-16 Día de la Virgen del Carmen",
      "2028-08-15 Asunción de la Virgen",
      "2028-09-18 Independencia Nacional",
      "2028-09-19 Día de las Glorias del Ejército",
      "2028-10-09 Encuentro de Dos Mundos",
      "2028-10-27 Día de las Iglesias Evangélicas y Protestantes",
      "2028-11-01 Día de Todos los Santos",
      "2028-12-08 Inmaculada Concepción",
      "2028-12-25 Navidad",
    ]);
  });

  it("los irrenunciables son 1-ene, 1-may, 18 y 19-sep y 25-dic (Ley 19.973)", () => {
    const irr = feriadosLegales(2026).filter((f) => f.irrenunciable).map((f) => f.fecha);
    expect(irr).toEqual(["2026-01-01", "2026-05-01", "2026-09-18", "2026-09-19", "2026-12-25"]);
  });

  it("marca [por verificar] el solsticio y el traslado de las Evangélicas cuando se mueve", () => {
    const porVerificar2028 = feriadosLegales(2028)
      .filter((f) => f.porVerificar)
      .map((f) => f.nombre);
    expect(porVerificar2028).toContain("Día Nacional de los Pueblos Indígenas");
    expect(porVerificar2028).toContain("Día de las Iglesias Evangélicas y Protestantes");
    // En 2026 el 31-oct no se mueve: las Evangélicas no quedan marcadas.
    expect(
      feriadosLegales(2026).find((f) => f.nombre.startsWith("Día de las Iglesias"))?.porVerificar,
    ).toBe(false);
  });
});

describe("Ley 20.215 · feriados adicionales de Fiestas Patrias", () => {
  it("agrega el lunes 17-sep cuando el 18 cae martes (2018)", () => {
    expect(fechas(2018)).toContain("2018-09-17 Feriado adicional Fiestas Patrias");
  });
  it("agrega el viernes 20-sep cuando el 19 cae jueves (2024)", () => {
    expect(fechas(2024)).toContain("2024-09-20 Feriado adicional Fiestas Patrias");
  });
  it("no agrega nada cuando el 18 y 19 caen en fin de semana (2026)", () => {
    expect(fechas(2026).some((f) => f.includes("Feriado adicional"))).toBe(false);
  });
});

describe("domingoDePascua · computus gregoriano", () => {
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2028, "2028-04-16"],
  ])("Pascua de %i es %s", (anio, fecha) => {
    expect(domingoDePascua(anio)).toBe(fecha);
  });
});

describe("solsticioJunio · fecha civil en Chile (UTC−4)", () => {
  it.each([
    [2026, "2026-06-21"],
    [2027, "2027-06-21"],
    [2028, "2028-06-20"],
  ])("el solsticio de %i cae el %s", (anio, fecha) => {
    expect(solsticioJunio(anio)).toBe(fecha);
  });
});
