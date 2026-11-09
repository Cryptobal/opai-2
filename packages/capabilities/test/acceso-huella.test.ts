// CAR-78 E4b: la clave de huellas falla cerrado, separa por versión y permite rotar sin perder coincidencias.
import { afterEach, describe, expect, it, vi } from "vitest";

import { huellasCandidatas, huellaVigente } from "../src/acceso/huella";

const T1 = "01a1b67d-a990-7385-89f6-6eda2de40ef2";
const T2 = "01a1b67d-a990-7385-89f6-6eda2de40ef3";
const e = { tenantId: T1, tipo: "run" as const, clave: "12345678-5" };
const K1 = "k1-solo-para-pruebas-no-es-un-secreto-real-0123456789";
const K2 = "k2-solo-para-pruebas-no-es-un-secreto-real-9876543210";

afterEach(() => vi.unstubAllEnvs());

describe("clave de huellas de acceso", () => {
  it("sin clave o con clave corta falla cerrado", () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", "");
    expect(() => huellaVigente(e)).toThrow(/ACCESO_HUELLA_SECRET/);
    vi.stubEnv("ACCESO_HUELLA_SECRET", "corta");
    expect(() => huellaVigente(e)).toThrow(/32 bytes/);
  });
  it("una versión inválida falla cerrado", () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", K1);
    vi.stubEnv("ACCESO_HUELLA_KID", "V 1!");
    expect(() => huellaVigente(e)).toThrow(/versión/);
  });
  it("misma clave y versión: estable; otra empresa o tipo: distinta", () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", K1);
    const a = huellaVigente(e);
    expect(a).toEqual({ kid: "v1", huella: huellaVigente({ ...e }).huella });
    expect(huellaVigente({ ...e, tenantId: T2 }).huella).not.toBe(a.huella);
    expect(huellaVigente({ ...e, tipo: "otro" }).huella).not.toBe(a.huella);
  });
  it("la versión deriva otra clave aunque el secreto base sea el mismo", () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", K1);
    const v1 = huellaVigente(e).huella;
    vi.stubEnv("ACCESO_HUELLA_KID", "v2");
    expect(huellaVigente(e).huella).not.toBe(v1);
  });
  it("durante una rotación las candidatas incluyen la vigente y la anterior", () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", K1);
    const antes = huellaVigente(e);
    vi.stubEnv("ACCESO_HUELLA_SECRET", K2);
    vi.stubEnv("ACCESO_HUELLA_KID", "v2");
    vi.stubEnv("ACCESO_HUELLA_SECRET_ANTERIOR", K1);
    vi.stubEnv("ACCESO_HUELLA_KID_ANTERIOR", "v1");
    const c = huellasCandidatas(e);
    expect(c.map((x) => x.kid)).toEqual(["v2", "v1"]);
    expect(c[1]).toEqual(antes);
  });
  it("una anterior que repite la versión vigente, o es corta, falla cerrado", () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", K2);
    vi.stubEnv("ACCESO_HUELLA_SECRET_ANTERIOR", K1);
    vi.stubEnv("ACCESO_HUELLA_KID_ANTERIOR", "v1");
    expect(() => huellasCandidatas(e)).toThrow(/repite/);
    vi.stubEnv("ACCESO_HUELLA_KID", "v2");
    vi.stubEnv("ACCESO_HUELLA_SECRET_ANTERIOR", "corta");
    expect(() => huellasCandidatas(e)).toThrow(/ANTERIOR/);
  });
});
