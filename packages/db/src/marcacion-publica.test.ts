import { describe, expect, it } from "vitest";

import {
  LARGO_CODIGO_MARCACION_PUBLICA,
  normalizarCodigoMarcacionPublica,
  nuevoCodigoMarcacionPublica,
} from "./marcacion-publica";

describe("marcación pública · código", () => {
  it("genera códigos de 128 bits (22 caracteres base64url)", () => {
    const c = nuevoCodigoMarcacionPublica();
    expect(c).toHaveLength(LARGO_CODIGO_MARCACION_PUBLICA);
    expect(normalizarCodigoMarcacionPublica(c)).toBe(c);
  });

  it("rechaza códigos cortos o con formato inválido", () => {
    expect(normalizarCodigoMarcacionPublica("ABCD")).toBeNull();
    expect(normalizarCodigoMarcacionPublica("ZZZZZZZZ")).toBeNull();
    expect(normalizarCodigoMarcacionPublica("")).toBeNull();
    const largo = "a".repeat(LARGO_CODIGO_MARCACION_PUBLICA);
    expect(normalizarCodigoMarcacionPublica(`${largo}!`)).toBeNull();
  });

  it("códigos inexistentes con formato válido se normalizan (la resolución falla en base)", () => {
    const fantasma = "______________________";
    expect(fantasma).toHaveLength(LARGO_CODIGO_MARCACION_PUBLICA);
    expect(normalizarCodigoMarcacionPublica(fantasma)).toBe(fantasma);
  });
});