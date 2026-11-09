import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exigirBaseR2dE2E } from "../scripts/rendiciones-r2d-entorno";

const local = "postgresql://fixture:fixture@127.0.0.1:55440/opai_e2e_r2d";
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", local);
  vi.stubEnv("DATABASE_URL_MIGRATE", local);
});
afterEach(() => vi.unstubAllEnvs());

describe("fixture R2D: destino local sin overrides", () => {
  it("acepta ambas URLs al mismo destino e2e local", () => {
    expect(exigirBaseR2dE2E).not.toThrow();
  });
  for (const variable of ["DATABASE_URL", "DATABASE_URL_MIGRATE"]) {
    for (const query of ["host=example.invalid", "port=5432", "database=otra", "options=-csearch_path=public"]) {
      it(`rechaza ${variable} con ${query.split("=")[0]} sin conectar`, () => {
        vi.stubEnv(variable, `${local}?${query}`);
        expect(exigirBaseR2dE2E).toThrow("sin parámetros");
      });
    }
    it(`rechaza ${variable} remota`, () => {
      vi.stubEnv(variable, local.replace("127.0.0.1", "example.invalid"));
      expect(exigirBaseR2dE2E).toThrow("Solo opai_e2e local");
    });
  }
  it("rechaza producción aunque el destino sea local", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(exigirBaseR2dE2E).toThrow("Solo opai_e2e local");
  });
  it("rechaza bases distintas entre app y propietario", () => {
    vi.stubEnv("DATABASE_URL_MIGRATE", local.replace("opai_e2e_r2d", "opai_e2e_otra"));
    expect(exigirBaseR2dE2E).toThrow("deben coincidir");
  });
});
