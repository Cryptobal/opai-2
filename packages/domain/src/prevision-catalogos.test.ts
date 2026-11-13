import { describe, expect, it } from "vitest";

import {
  AFPS, etiquetaDe, normalizarAfp, normalizarRegimen, normalizarSalud, SISTEMAS_SALUD, valoresDe,
} from "./prevision-catalogos";
import { AFP } from "./remuneraciones/indicadores";

describe("catálogos de previsión (CAR-276)", () => {
  it("las AFP del catálogo son las mismas que lee Previred", () => {
    expect([...valoresDe(AFPS)].sort()).toEqual([...AFP].sort());
  });

  it("normaliza textos escritos a mano", () => {
    expect(normalizarAfp("AFP Habitat")).toBe("habitat");
    expect(normalizarAfp("Plan Vital")).toBe("planvital");
    expect(normalizarAfp("provida")).toBe("provida");
    expect(normalizarAfp("Otra")).toBeNull();
    expect(normalizarAfp(null)).toBeNull();
    expect(normalizarRegimen("AFP")).toBe("afp");
    expect(normalizarRegimen("INP")).toBe("ips");
    expect(normalizarRegimen("ex INP")).toBe("ips");
    expect(normalizarRegimen("Sin previsión")).toBeNull();
    expect(normalizarRegimen("Sin pensión")).toBeNull();
    expect(normalizarSalud("FONASA")).toBe("fonasa");
    expect(normalizarSalud("Isapre")).toBe("isapre");
  });

  it("muestra la etiqueta o el texto anterior tal cual", () => {
    expect(etiquetaDe(SISTEMAS_SALUD, "fonasa")).toBe("Fonasa");
    expect(etiquetaDe(SISTEMAS_SALUD, "Capredena")).toBe("Capredena");
    expect(etiquetaDe(SISTEMAS_SALUD, null)).toBeNull();
  });
});
