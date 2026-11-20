import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  claveCodigoApp,
  esRetoValido,
  leerValorCanje,
  nuevoCodigoApp,
  verificadorCorresponde,
} from "../src/canje-app";

// CAR-516: PKCE S256 entre la app y el navegador del sistema.
const verificador = "a".repeat(43);
const reto = createHash("sha256").update(verificador).digest("base64url");

describe("canje de la app nativa", () => {
  it("el verificador correcto corresponde a su reto", () => {
    expect(verificadorCorresponde(verificador, reto)).toBe(true);
  });

  it("otro verificador no corresponde", () => {
    expect(verificadorCorresponde("b".repeat(43), reto)).toBe(false);
  });

  it("rechaza formatos que no son 43 caracteres base64url", () => {
    expect(esRetoValido(reto)).toBe(true);
    expect(esRetoValido("corto")).toBe(false);
    expect(esRetoValido(`${"a".repeat(42)}=`)).toBe(false);
    expect(verificadorCorresponde("corto", reto)).toBe(false);
  });

  it("los códigos son nuevos cada vez y válidos como base64url de 43", () => {
    const a = nuevoCodigoApp();
    expect(esRetoValido(a)).toBe(true);
    expect(a).not.toBe(nuevoCodigoApp());
    expect(claveCodigoApp(a)).toBe(`app-canje:${a}`);
  });

  it("el valor guardado se lee solo si tiene la forma esperada", () => {
    expect(leerValorCanje(JSON.stringify({ userId: "u1", reto }))).toEqual({ userId: "u1", reto });
    expect(leerValorCanje(JSON.stringify({ userId: "u1", reto: "malo" }))).toBeNull();
    expect(leerValorCanje("no es json")).toBeNull();
    expect(leerValorCanje("null")).toBeNull();
  });
});
