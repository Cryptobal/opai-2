import { describe, expect, it } from "vitest";

import {
  consentimientoVigente, debeSuprimirse, decidirRostro, faltantesEnrolamiento, motivoRespaldoValido,
  UMBRAL_SIMILITUD_DEFECTO, umbralSeguro, VERSION_CONSENTIMIENTO,
} from "./biometria";

describe("decidirRostro", () => {
  it("sin prueba de vida no vale aunque el rostro coincida", () => {
    expect(decidirRostro({ viva: false, coincide: true, similitud: 0.99 }, 0.95)).toEqual({ ok: false, motivo: "vida_fallida" });
  });
  it("exige el umbral", () => {
    expect(decidirRostro({ viva: true, coincide: true, similitud: 0.94 }, 0.95)).toEqual({ ok: false, motivo: "rostro_no_coincide" });
    expect(decidirRostro({ viva: true, coincide: false, similitud: 0.99 }, 0.95).ok).toBe(false);
    expect(decidirRostro({ viva: true, coincide: true, similitud: 0.96 }, 0.95)).toEqual({ ok: true, similitud: 0.96 });
  });
});

describe("umbral y consentimiento", () => {
  it("un umbral fuera de rango cae al defecto", () => {
    expect(umbralSeguro(0.1)).toBe(UMBRAL_SIMILITUD_DEFECTO);
    expect(umbralSeguro(undefined)).toBe(UMBRAL_SIMILITUD_DEFECTO);
    expect(umbralSeguro(0.9)).toBe(0.9);
  });
  const hoy = new Date("2026-11-06T12:00:00Z");
  it("solo vale el consentimiento vigente de la versión actual", () => {
    const base = { tipo: "biometria_facial" as const, aceptadoEn: hoy };
    expect(consentimientoVigente([{ ...base, version: VERSION_CONSENTIMIENTO.biometria_facial, revocadoEn: null }], "biometria_facial")).toBe(true);
    expect(consentimientoVigente([{ ...base, version: VERSION_CONSENTIMIENTO.biometria_facial, revocadoEn: hoy }], "biometria_facial")).toBe(false);
    expect(consentimientoVigente([{ ...base, version: "vieja", revocadoEn: null }], "biometria_facial")).toBe(false);
    expect(consentimientoVigente([], "telefono_personal")).toBe(false);
  });
  it("lista lo que falta para enrolar", () => {
    expect(faltantesEnrolamiento({ consentimiento: true, correoPersonal: true, vinculoVigente: true })).toEqual([]);
    expect(faltantesEnrolamiento({ consentimiento: false, correoPersonal: false, vinculoVigente: true })).toHaveLength(2);
  });
});

describe("respaldo y supresión", () => {
  it("el motivo de respaldo debe ser conocido", () => {
    expect(motivoRespaldoValido("vida_fallida")).toBe(true);
    expect(motivoRespaldoValido("porque sí")).toBe(false);
    expect(motivoRespaldoValido(undefined)).toBe(false);
  });
  it("se suprime solo si no queda ningún vínculo vigente", () => {
    expect(debeSuprimirse([{ estado: "terminado" }])).toBe(true);
    expect(debeSuprimirse([{ estado: "terminado" }, { estado: "vigente" }])).toBe(false);
    expect(debeSuprimirse([])).toBe(false);
  });
});
