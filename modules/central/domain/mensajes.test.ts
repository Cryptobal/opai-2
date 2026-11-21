import { describe, expect, it } from "vitest";

import { acuseObligatorioPorDefecto, acuseTarde, estadoTrasMensaje, textoValido, vigenciaValida } from "./mensajes";

describe("mensajes a la central y avisos (R16, R17)", () => {
  it("el texto es obligatorio salvo en una urgencia, y tiene tope", () => {
    expect(textoValido("urgencia", "")).toBe(true);
    expect(textoValido("consulta", "  ")).toBe(false);
    expect(textoValido("novedad", "Portón abierto")).toBe(true);
    expect(textoValido("novedad", "x".repeat(1001))).toBe(false);
  });

  it("la respuesta de la central deja el hilo respondido y la del guardia lo devuelve a enviado", () => {
    expect(estadoTrasMensaje("enviado", "central")).toBe("respondido");
    expect(estadoTrasMensaje("respondido", "persona")).toBe("enviado");
    expect(estadoTrasMensaje("cerrado", "persona")).toBeNull();
    expect(estadoTrasMensaje("cerrado", "central")).toBeNull();
  });

  it("solo la consigna pide acuse por defecto", () => {
    expect(acuseObligatorioPorDefecto("consigna")).toBe(true);
    expect(acuseObligatorioPorDefecto("instruccion")).toBe(false);
  });

  it("vigencia y acuse tarde", () => {
    const a = new Date("2026-11-14T10:00:00Z");
    const b = new Date("2026-11-14T11:00:00Z");
    expect(vigenciaValida(a, b)).toBe(true);
    expect(vigenciaValida(b, a)).toBe(false);
    expect(vigenciaValida(null, a)).toBe(true);
    expect(acuseTarde(a, b)).toBe(true);
    expect(acuseTarde(b, a)).toBe(false);
    expect(acuseTarde(null, b)).toBe(false);
  });
});
