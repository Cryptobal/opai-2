import { describe, expect, it } from "vitest";

import { generarPdfLaboral } from "../src/core/documentos/pdf-laboral";

describe("PDF de documento laboral", () => {
  const marca = { nombre: "Empresa Ficticia SpA", pieLegal: "RUT 76.000.000-0", colorPrimario: "#1d4ed8" };
  it("arma un PDF válido con tildes y negritas", async () => {
    const { bytes, paginas } = await generarPdfLaboral({
      titulo: "Contrato de trabajo",
      marca,
      parrafos: [[{ texto: "Comparece ", negrita: false, cursiva: false }, { texto: "José Muñoz → 100%", negrita: true, cursiva: true }]],
    });
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
    expect(paginas).toBe(1);
  });
  it("salta de página cuando el texto no cabe y tolera marca sin color", async () => {
    const largo = Array.from({ length: 120 }, (_, i) => [{ texto: `Cláusula ${i} ${"texto ".repeat(40)}`, negrita: false, cursiva: false }]);
    const { paginas } = await generarPdfLaboral({ titulo: "Largo", marca: { nombre: "X" }, parrafos: largo });
    expect(paginas).toBeGreaterThan(2);
  });
});
