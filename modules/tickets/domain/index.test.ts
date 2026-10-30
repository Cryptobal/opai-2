import { describe, expect, it } from "vitest";

import { esEstadoTerminal, puedeAprobarse, puedeTransicionar } from "./index";

describe("transiciones de estado (ADR-025)", () => {
  it("permite el camino feliz abierto → en_curso → resuelto → cerrado", () => {
    expect(puedeTransicionar("abierto", "en_curso")).toBe(true);
    expect(puedeTransicionar("en_curso", "resuelto")).toBe(true);
    expect(puedeTransicionar("resuelto", "cerrado")).toBe(true);
  });

  it("permite rechazar desde abierto o en_curso, nunca desde un estado terminal", () => {
    expect(puedeTransicionar("abierto", "rechazado")).toBe(true);
    expect(puedeTransicionar("en_curso", "rechazado")).toBe(true);
    expect(puedeTransicionar("cerrado", "rechazado")).toBe(false);
    expect(puedeTransicionar("rechazado", "abierto")).toBe(false);
  });

  it("no permite saltar directo de abierto a cerrado", () => {
    expect(puedeTransicionar("abierto", "cerrado")).toBe(false);
  });

  it("permite reabrir un resuelto a en_curso antes de cerrarlo", () => {
    expect(puedeTransicionar("resuelto", "en_curso")).toBe(true);
  });

  it("cerrado y rechazado son terminales", () => {
    expect(esEstadoTerminal("cerrado")).toBe(true);
    expect(esEstadoTerminal("rechazado")).toBe(true);
    expect(esEstadoTerminal("resuelto")).toBe(false);
  });

  it("una solicitud solo se aprueba o rechaza mientras está abierta o en curso", () => {
    expect(puedeAprobarse("abierto")).toBe(true);
    expect(puedeAprobarse("en_curso")).toBe(true);
    expect(puedeAprobarse("resuelto")).toBe(false);
    expect(puedeAprobarse("cerrado")).toBe(false);
  });
});
