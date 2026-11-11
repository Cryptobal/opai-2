// CAR-240: la API key de SimpleAPI sin guiones (20 caracteres) no se guarda. Keys ficticias.
import { describe, expect, it } from "vitest";

import { keySimpleApiSinGuiones, MENSAJE_KEY_SIMPLEAPI_SIN_GUIONES, motivoSecretoInvalido } from "./simpleapi-key-formato";

const CON_GUIONES = "AB12-CD34-EF56-GH78-IJ90";
const SIN_GUIONES = "AB12CD34EF56GH78IJ90";

describe("formato de la API key de SimpleAPI (CAR-240)", () => {
  it("detecta la key de 20 letras o números sin guiones", () => {
    expect(keySimpleApiSinGuiones(SIN_GUIONES)).toBe(true);
    expect(keySimpleApiSinGuiones(` ${SIN_GUIONES}\n`)).toBe(true);
    expect(keySimpleApiSinGuiones(`AB12CD34${String.fromCharCode(0x200b)}EF56GH78IJ90`)).toBe(true);
  });

  it("acepta la key con guiones y no juzga otras formas", () => {
    expect(keySimpleApiSinGuiones(CON_GUIONES)).toBe(false);
    expect(keySimpleApiSinGuiones("AB12CD34EF56GH78IJ9")).toBe(false);
    expect(keySimpleApiSinGuiones("AB12CD34EF56GH78IJ901")).toBe(false);
  });

  it("solo aplica a la api_key de Emisión DTE y nunca devuelve el valor", () => {
    const motivo = motivoSecretoInvalido("dte_emision", "api_key", SIN_GUIONES);
    expect(motivo).toBe(MENSAJE_KEY_SIMPLEAPI_SIN_GUIONES);
    expect(motivo).not.toContain(SIN_GUIONES);
    expect(motivo).toContain("XXXX-XXXX-XXXX-XXXX-XXXX");
    expect(motivoSecretoInvalido("dte_emision", "api_key", CON_GUIONES)).toBeNull();
    expect(motivoSecretoInvalido("dte_emision", "certificado_clave", SIN_GUIONES)).toBeNull();
    expect(motivoSecretoInvalido("resend", "api_key", SIN_GUIONES)).toBeNull();
  });
});
