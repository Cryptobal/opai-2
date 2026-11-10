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
  it("muestra las reglas que abren con comillas angulares o son largas (CAR-199)", () => {
    const campo = "«Válida hasta» no puede ser anterior a hoy.";
    expect(mensajeDeError("UNPROCESSABLE", campo)).toBe(campo);
    const largo = `Este anexo no se puede aprobar todavía: ${"la plantilla tiene texto de ejemplo. ".repeat(5)}`.trim();
    expect(largo.length).toBeGreaterThan(220);
    expect(mensajeDeError("UNPROCESSABLE", largo)).toBe(largo);
    // Lo técnico sigue sin salir aunque abra con «.
    expect(mensajeDeError("UNPROCESSABLE", "«Cuenta» falló en prisma al leer el tenant.")).toMatch(
      /No se puede hacer en este momento/,
    );
  });
  it("muestra el motivo de un fallo de SimpleAPI al emitir, no el INTERNAL genérico (CAR-242)", () => {
    // Mismo texto que exige packages/capabilities/test/finanzas-emitir-simpleapi-fallo-db.test.ts.
    const m =
      "SimpleAPI no pudo generar ni firmar el DTE: respondió HTTP 400 (Rut receptor no valido). El borrador sigue sin emitir y el folio no se usó.";
    expect(mensajeDeError("UNPROCESSABLE", m)).toBe(m);
    const sinXml =
      "SimpleAPI no pudo generar ni firmar el DTE: la respuesta no es un XML de DTE. El borrador sigue sin emitir y el folio no se usó.";
    expect(mensajeDeError("UNPROCESSABLE", sinXml)).toBe(sinXml);
  });
});
