import { describe, expect, it } from "vitest";

import { esMensajeDeNegocio, mensajeDeError } from "../lib/mensajes-error";

describe("mensajes de error (B7)", () => {
  it("no filtra el texto técnico del servidor", () => {
    expect(mensajeDeError("INVALID_INPUT", "Input inválido.")).toMatch(/datos que no son válidos/);
    expect(mensajeDeError("FORBIDDEN", 'La capacidad "x" no está disponible en el portal "erp".')).toMatch(
      /No tienes permiso/,
    );
    expect(mensajeDeError("INTERNAL", "P2028 Transaction already closed")).not.toMatch(/P2028/);
    expect(mensajeDeError("CODIGO_NUEVO", "boom")).toMatch(/error de nuestro lado/);
  });
  it("conserva las reglas de negocio claras", () => {
    expect(mensajeDeError("UNPROCESSABLE", "La factura debe estar aceptada por el SII.")).toBe(
      "La factura debe estar aceptada por el SII.",
    );
    expect(mensajeDeError("CONFLICT", 'Ya existe "abc" en la tabla')).toMatch(/cambió mientras/);
    expect(esMensajeDeNegocio("x")).toBe(false);
  });
});
