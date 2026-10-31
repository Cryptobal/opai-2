import { describe, expect, it } from "vitest";

import {
  camposFaltantes,
  coordenadasValidas,
  enSilencio,
  normalizarPreferencias,
  preferenciasPorDefecto,
  primerNombre,
} from "./portal-trabajador";

describe("portal_trabajador · preferencias", () => {
  it("por defecto nada sale por canales externos (silencio, ADR-020)", () => {
    const p = preferenciasPorDefecto();
    expect(Object.values(p).every((c) => !c.push && !c.correo)).toBe(true);
  });

  it("completa lo faltante y descarta lo desconocido", () => {
    const p = normalizarPreferencias({ pauta: { push: true }, inexistente: { push: true } });
    expect(p.pauta).toEqual({ push: true, correo: false });
    expect(p.documentos).toEqual({ push: false, correo: false });
    expect("inexistente" in p).toBe(false);
  });

  it("solo true cuenta como activo (un texto no activa un canal)", () => {
    expect(normalizarPreferencias({ empresa: { push: "true", correo: 1 } }).empresa).toEqual({
      push: false,
      correo: false,
    });
  });

  it("tolera valores que no son objeto", () => {
    expect(normalizarPreferencias(null)).toEqual(preferenciasPorDefecto());
    expect(normalizarPreferencias([1])).toEqual(preferenciasPorDefecto());
  });
});

describe("portal_trabajador · horario de silencio", () => {
  it("ventana dentro del mismo día: [desde, hasta)", () => {
    expect(enSilencio("13:00", "13:00", "15:00")).toBe(true);
    expect(enSilencio("14:59", "13:00", "15:00")).toBe(true);
    expect(enSilencio("15:00", "13:00", "15:00")).toBe(false);
  });

  it("ventana que cruza la medianoche", () => {
    expect(enSilencio("23:30", "22:00", "07:00")).toBe(true);
    expect(enSilencio("06:59", "22:00", "07:00")).toBe(true);
    expect(enSilencio("07:00", "22:00", "07:00")).toBe(false);
    expect(enSilencio("12:00", "22:00", "07:00")).toBe(false);
  });

  it("sin ventana, ventana vacía u horas inválidas: nunca hay silencio", () => {
    expect(enSilencio("23:00", null, null)).toBe(false);
    expect(enSilencio("10:00", "08:00", "08:00")).toBe(false);
    expect(enSilencio("25:00", "22:00", "07:00")).toBe(false);
    expect(enSilencio("10:00", "ab", "07:00")).toBe(false);
  });
});

describe("portal_trabajador · mis datos", () => {
  it("lista lo que falta completar, en orden estable", () => {
    expect(camposFaltantes({ telefono: null, emailPersonal: " ", direccionFormateada: null })).toEqual([
      "telefono",
      "emailPersonal",
      "direccion",
    ]);
    expect(
      camposFaltantes({ telefono: "+56912345678", emailPersonal: "a@b.cl", direccionFormateada: "Calle 1" }),
    ).toEqual([]);
  });

  it("valida coordenadas", () => {
    expect(coordenadasValidas(-33.45, -70.66)).toBe(true);
    expect(coordenadasValidas(91, 0)).toBe(false);
    expect(coordenadasValidas(0, -181)).toBe(false);
    expect(coordenadasValidas(Number.NaN, 0)).toBe(false);
  });

  it("primer nombre", () => {
    expect(primerNombre("  María José ")).toBe("María");
    expect(primerNombre("")).toBe("");
  });
});
