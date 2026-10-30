// Brief 14 · Rondas PR 2 (corrección, review 5713377140 del PR #145): sin `RONDAS_ETIQUETA_SECRET`,
// o con uno vacío o muy corto, no se genera ni se verifica ninguna etiqueta QR. No hay respaldo a
// `BETTER_AUTH_SECRET` ni a un valor fijo en el código.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generarEtiquetaFirmada, verificarEtiquetaFirmada } from "../src/rondas/firma";

const SECRETO_VALIDO = "secreto-de-prueba-rondas-etiqueta-32-bytes-o-mas";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("clave de firma de etiquetas QR (R7)", () => {
  it("sin RONDAS_ETIQUETA_SECRET no genera etiqueta (falla cerrado, UNPROCESSABLE)", () => {
    vi.stubEnv("RONDAS_ETIQUETA_SECRET", undefined);
    vi.stubEnv("BETTER_AUTH_SECRET", SECRETO_VALIDO);
    expect(() => generarEtiquetaFirmada()).toThrow(/RONDAS_ETIQUETA_SECRET/);
  });

  it("con RONDAS_ETIQUETA_SECRET vacío no genera etiqueta", () => {
    vi.stubEnv("RONDAS_ETIQUETA_SECRET", "");
    expect(() => generarEtiquetaFirmada()).toThrow(/RONDAS_ETIQUETA_SECRET/);
  });

  it("con RONDAS_ETIQUETA_SECRET de menos de 32 bytes no genera etiqueta", () => {
    vi.stubEnv("RONDAS_ETIQUETA_SECRET", "corto-16-bytes!!");
    expect(() => generarEtiquetaFirmada()).toThrow(/RONDAS_ETIQUETA_SECRET/);
  });

  it("sin el secreto tampoco verifica un código ya emitido", () => {
    vi.stubEnv("RONDAS_ETIQUETA_SECRET", undefined);
    expect(() => verificarEtiquetaFirmada("R2.v1.id-opaco.firma")).toThrow(/RONDAS_ETIQUETA_SECRET/);
  });

  it("BETTER_AUTH_SECRET nunca sirve de respaldo, aunque sea válido", () => {
    vi.stubEnv("RONDAS_ETIQUETA_SECRET", undefined);
    vi.stubEnv("BETTER_AUTH_SECRET", SECRETO_VALIDO);
    expect(() => generarEtiquetaFirmada()).toThrow(/RONDAS_ETIQUETA_SECRET/);
  });

  describe("con el secreto configurado", () => {
    beforeEach(() => {
      vi.stubEnv("RONDAS_ETIQUETA_SECRET", SECRETO_VALIDO);
    });

    it("genera un código firmado v1 y lo verifica como válido", () => {
      const { codigo, idOpaco } = generarEtiquetaFirmada();
      expect(codigo).toMatch(/^R2\.v1\./);
      const v = verificarEtiquetaFirmada(codigo);
      expect(v).toEqual({ firmada: true, valida: true, idOpaco });
    });

    it("la clave derivada nunca es el secreto base en claro (separación de dominio)", () => {
      const { codigo } = generarEtiquetaFirmada();
      expect(codigo).not.toContain(SECRETO_VALIDO);
    });

    it("rotar a un secreto distinto invalida los códigos firmados con el anterior", () => {
      const { codigo } = generarEtiquetaFirmada();
      vi.stubEnv("RONDAS_ETIQUETA_SECRET", "otro-secreto-de-prueba-tambien-de-32-bytes-o-mas");
      expect(verificarEtiquetaFirmada(codigo).valida).toBe(false);
    });
  });
});
