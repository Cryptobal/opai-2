import { describe, expect, it } from "vitest";

import { diasHabilesEntre, esHabil, sumarDiasHabiles } from "./habiles";
import { esFinDeSemana } from "./fechas";

// Feriados de prueba (datos fijos, independientes del seed): 18–19 sep (irrenunciables, nacionales),
// fin de año y un feriado regional en día de semana (2026-08-20, jueves).
const INDEP = new Set(["2026-09-18", "2026-09-19"]);
const FIN_ANIO = new Set(["2026-12-25", "2027-01-01"]);
const REGIONAL = new Set(["2026-08-20"]);

describe("esFinDeSemana", () => {
  it("sábado y domingo", () => {
    expect(esFinDeSemana("2026-09-19")).toBe(true); // sábado
    expect(esFinDeSemana("2026-09-20")).toBe(true); // domingo
    expect(esFinDeSemana("2026-09-18")).toBe(false); // viernes
  });
});

describe("esHabil", () => {
  it("lunes a viernes sin feriado es hábil", () => {
    expect(esHabil("2026-09-17", INDEP)).toBe(true); // jueves
  });
  it("un feriado en día de semana no es hábil", () => {
    expect(esHabil("2026-09-18", INDEP)).toBe(false); // viernes feriado
  });
  it("un fin de semana nunca es hábil, con o sin feriado", () => {
    expect(esHabil("2026-09-19", INDEP)).toBe(false); // sábado feriado
    expect(esHabil("2026-09-20", INDEP)).toBe(false); // domingo
  });
});

describe("diasHabilesEntre · 6 casos dorados (CA1)", () => {
  it("semana completa sin feriado = 5", () => {
    expect(diasHabilesEntre("2026-03-02", "2026-03-06", new Set())).toBe(5); // lun–vie
  });
  it("semana del 18 de septiembre: el viernes 18 es feriado", () => {
    // lun 14, mar 15, mié 16, jue 17, VIE 18 feriado, sáb 19, dom 20 → 4
    expect(diasHabilesEntre("2026-09-14", "2026-09-20", INDEP)).toBe(4);
  });
  it("18 y 19 de septiembre: viernes feriado + sábado = 0", () => {
    expect(diasHabilesEntre("2026-09-18", "2026-09-19", INDEP)).toBe(0);
  });
  it("feriado en fin de semana no descuenta de más (19 es sábado)", () => {
    // Sin el feriado 19 (sábado) el resultado es el mismo que con él.
    expect(diasHabilesEntre("2026-09-14", "2026-09-20", INDEP)).toBe(
      diasHabilesEntre("2026-09-14", "2026-09-20", new Set(["2026-09-18"])),
    );
  });
  it("fin de año a través del cambio de año", () => {
    // vie 25 feriado, sáb 26, dom 27, lun 28, mar 29, mié 30, jue 31, VIE 1-ene feriado → 4
    expect(diasHabilesEntre("2026-12-25", "2027-01-01", FIN_ANIO)).toBe(4);
  });
  it("feriado regional en día de semana descuenta", () => {
    // lun 17, mar 18, mié 19, JUE 20 regional, vie 21 → 4
    expect(diasHabilesEntre("2026-08-17", "2026-08-21", REGIONAL)).toBe(4);
    // Sin el regional serían 5.
    expect(diasHabilesEntre("2026-08-17", "2026-08-21", new Set())).toBe(5);
  });
  it("desde posterior a hasta = 0", () => {
    expect(diasHabilesEntre("2026-09-20", "2026-09-14", INDEP)).toBe(0);
  });
});

describe("sumarDiasHabiles", () => {
  it("salta el fin de semana y los feriados hacia adelante", () => {
    // jue 17 + 1 hábil: vie 18 feriado, sáb 19, dom 20 → lun 21
    expect(sumarDiasHabiles("2026-09-17", 1, INDEP)).toBe("2026-09-21");
  });
  it("cero días devuelve la misma fecha aunque no sea hábil", () => {
    expect(sumarDiasHabiles("2026-09-18", 0, INDEP)).toBe("2026-09-18");
  });
  it("retrocede días hábiles con número negativo", () => {
    // lun 21 − 1 hábil: dom 20, sáb 19, vie 18 feriado → jue 17
    expect(sumarDiasHabiles("2026-09-21", -1, INDEP)).toBe("2026-09-17");
  });
});
