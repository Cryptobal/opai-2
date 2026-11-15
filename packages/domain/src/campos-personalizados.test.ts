import { describe, expect, it } from "vitest";

import {
  claveCampoPersonalizado,
  normalizarOpcionesCampo,
  validarValorCampo,
} from "./campos-personalizados";

describe("campos personalizados · clave", () => {
  it("deriva snake_case ASCII del nombre", () => {
    expect(claveCampoPersonalizado("N° de guardias")).toBe("n_de_guardias");
    expect(claveCampoPersonalizado("  Rubro principal ")).toBe("rubro_principal");
    expect(claveCampoPersonalizado("Año de inicio")).toBe("ano_de_inicio");
  });
  it("empieza siempre con letra", () => {
    expect(claveCampoPersonalizado("2024 meta")).toBe("campo_2024_meta");
  });
});

describe("campos personalizados · valor por tipo", () => {
  it("vacío o null borra el valor", () => {
    expect(validarValorCampo("texto", [], "  ")).toEqual({ ok: true, valor: null });
    expect(validarValorCampo("numero", [], null)).toEqual({ ok: true, valor: null });
  });
  it("texto con tope", () => {
    expect(validarValorCampo("texto", [], " Seguridad ")).toEqual({ ok: true, valor: "Seguridad" });
    expect(validarValorCampo("texto", [], "x".repeat(501)).ok).toBe(false);
    expect(validarValorCampo("texto", [], 3).ok).toBe(false);
  });
  it("número acepta coma decimal", () => {
    expect(validarValorCampo("numero", [], "12,5")).toEqual({ ok: true, valor: 12.5 });
    expect(validarValorCampo("numero", [], "abc").ok).toBe(false);
  });
  it("fecha real AAAA-MM-DD", () => {
    expect(validarValorCampo("fecha", [], "2026-11-13")).toEqual({ ok: true, valor: "2026-11-13" });
    expect(validarValorCampo("fecha", [], "2026-02-30").ok).toBe(false);
    expect(validarValorCampo("fecha", [], "13-11-2026").ok).toBe(false);
  });
  it("lista solo con sus opciones", () => {
    expect(validarValorCampo("lista", ["Minería", "Retail"], "Retail")).toEqual({ ok: true, valor: "Retail" });
    expect(validarValorCampo("lista", ["Minería"], "Banca").ok).toBe(false);
  });
  it("sí/no solo booleano", () => {
    expect(validarValorCampo("si_no", [], true)).toEqual({ ok: true, valor: true });
    expect(validarValorCampo("si_no", [], "si").ok).toBe(false);
  });
});

describe("campos personalizados · opciones", () => {
  it("quita vacías y repetidas sin distinguir mayúsculas", () => {
    expect(normalizarOpcionesCampo([" Minería", "", "minería", "Retail "])).toEqual(["Minería", "Retail"]);
  });
});
