import { describe, expect, it } from "vitest";

import {
  erroresDeScorecard,
  erroresParaPublicar,
  puntajeDe,
  versionVigente,
  vigenciaDelCambio,
} from "./index";

const item = (indicador: string, peso: number, meta = 10) => ({ indicador, peso, meta });

describe("validación del scorecard", () => {
  it("un borrador admite pesos que no suman 100, pero no repetidos ni metas o pesos inválidos", () => {
    expect(erroresDeScorecard([item("a.x", 30), item("b.y", 30)])).toEqual([]);
    expect(erroresDeScorecard([item("a.x", 30), item("a.x", 30)])[0]).toMatch(/repetido/);
    expect(erroresDeScorecard([item("a.x", 30, 0)])[0]).toMatch(/meta/);
    expect(erroresDeScorecard([item("a.x", 0)])[0]).toMatch(/peso/);
    expect(erroresDeScorecard([item("a.x", 2.5)])[0]).toMatch(/peso/);
  });
  it("para publicar los pesos suman exactamente 100 y hay al menos un indicador", () => {
    expect(erroresParaPublicar([item("a.x", 60), item("b.y", 40)])).toEqual([]);
    expect(erroresParaPublicar([item("a.x", 60), item("b.y", 30)])[0]).toMatch(/suman 90 %/);
    expect(erroresParaPublicar([])[0]).toMatch(/al menos un indicador/);
  });
});

describe("vigencia y versiones", () => {
  it("la primera versión rige desde el mes en curso; un cambio, desde el mes siguiente", () => {
    expect(vigenciaDelCambio([], "2026-11", "2026-12")).toBe("2026-11");
    expect(vigenciaDelCambio(["2026-09"], "2026-11", "2026-12")).toBe("2026-12");
    expect(vigenciaDelCambio(["2026-11"], "2026-11", "2026-12")).toBe("2026-12");
    // Solo hay una versión futura todavía sin regir: el mes en curso sigue libre.
    expect(vigenciaDelCambio(["2026-12"], "2026-11", "2026-12")).toBe("2026-11");
  });
  it("cambiar una meta no altera un mes ya medido", () => {
    const versiones = [
      { vigenteDesde: "2026-09", estado: "publicado", meta: 10 },
      { vigenteDesde: "2026-12", estado: "publicado", meta: 20 },
      { vigenteDesde: "2027-01", estado: "borrador", meta: 30 },
    ];
    expect(versionVigente(versiones, "2026-08")).toBeNull();
    expect(versionVigente(versiones, "2026-11")?.meta).toBe(10);
    expect(versionVigente(versiones, "2026-12")?.meta).toBe(20);
    expect(versionVigente(versiones, "2027-03")?.meta).toBe(20);
    expect(versionVigente(versiones, "no-es-mes")).toBeNull();
  });
});

describe("puntaje", () => {
  it("100 es cumplir todas las metas; sobrecumplir llega hasta 120", () => {
    expect(puntajeDe([{ peso: 60, logro: 1 }, { peso: 40, logro: 1 }])).toEqual({
      puntaje: 100,
      cobertura: 100,
    });
    expect(puntajeDe([{ peso: 60, logro: 1.2 }, { peso: 40, logro: 1.2 }]).puntaje).toBe(120);
    expect(puntajeDe([{ peso: 60, logro: 0.5 }, { peso: 40, logro: 1 }]).puntaje).toBe(70);
  });
  it("un indicador sin hechos no cuenta como cero: queda fuera y baja la cobertura", () => {
    expect(puntajeDe([{ peso: 60, logro: 0.8 }, { peso: 40, logro: null }])).toEqual({
      puntaje: 80,
      cobertura: 60,
    });
    expect(puntajeDe([{ peso: 100, logro: null }])).toEqual({ puntaje: null, cobertura: 0 });
  });
});
