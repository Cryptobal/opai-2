import { describe, expect, it } from "vitest";

import {
  componerEtiqueta,
  esEtiquetaFirmada,
  firmaEtiqueta,
  PREFIJO_ETIQUETA,
  verificarEtiqueta,
} from "./etiqueta";

const CLAVE = "clave-de-prueba-estable";

describe("firma de etiquetas (R7)", () => {
  it("la firma es determinista para el mismo id y clave", () => {
    expect(firmaEtiqueta("abc123", CLAVE)).toBe(firmaEtiqueta("abc123", CLAVE));
  });

  it("otra clave produce otra firma", () => {
    expect(firmaEtiqueta("abc123", CLAVE)).not.toBe(firmaEtiqueta("abc123", "otra-clave"));
  });

  it("compone un código con el formato R2.<kid>.<id>.<firma> y lo verifica", () => {
    const codigo = componerEtiqueta("id-opaco-xyz", CLAVE);
    expect(codigo.startsWith(`${PREFIJO_ETIQUETA}.v1.`)).toBe(true);
    const v = verificarEtiqueta(codigo, CLAVE);
    expect(v).toEqual({ firmada: true, valida: true, idOpaco: "id-opaco-xyz" });
  });

  it("una firma de otro kid no valida con la clave de la versión vigente", () => {
    const codigo = componerEtiqueta("id-opaco-xyz", CLAVE, "v2");
    expect(codigo.startsWith(`${PREFIJO_ETIQUETA}.v2.`)).toBe(true);
    // El kid firmado («v2») no coincide con lo que recompone la verificación con ese mismo kid, pero
    // si alguien cambia el kid a mano a uno que no es el suyo, la firma tampoco calza (va atada al kid).
    const falsificado = codigo.replace(".v2.", ".v1.");
    expect(verificarEtiqueta(falsificado, CLAVE).valida).toBe(false);
  });

  it("detecta una firma alterada (etiqueta fabricada a mano)", () => {
    const codigo = componerEtiqueta("id-opaco-xyz", CLAVE);
    const falsificado = `${codigo.slice(0, -1)}${codigo.at(-1) === "A" ? "B" : "A"}`;
    const v = verificarEtiqueta(falsificado, CLAVE);
    expect(v.firmada).toBe(true);
    expect(v.valida).toBe(false);
    expect(v.idOpaco).toBeNull();
  });

  it("no valida un código firmado con otra clave", () => {
    const codigo = componerEtiqueta("id-opaco-xyz", "clave-vieja");
    expect(verificarEtiqueta(codigo, CLAVE).valida).toBe(false);
  });

  it("trata un código físico de 1.0 como no firmado (validez por base, no por firma)", () => {
    const v = verificarEtiqueta("CHK-000123", CLAVE);
    expect(v).toEqual({ firmada: false, valida: false, idOpaco: null });
    expect(esEtiquetaFirmada("CHK-000123")).toBe(false);
  });

  it("esEtiquetaFirmada reconoce el formato de 2.0 sin la clave", () => {
    const codigo = componerEtiqueta("id", CLAVE);
    expect(esEtiquetaFirmada(codigo)).toBe(true);
  });
});
