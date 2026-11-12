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
  it("incrusta el logo PNG y sigue si el logo está dañado", async () => {
    const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64"));
    const base = { titulo: "Carta", marca, parrafos: [[{ texto: "Hola", negrita: false, cursiva: false }]] };
    const con = await generarPdfLaboral({ ...base, logo: { bytes: png, formato: "png" } });
    const sin = await generarPdfLaboral(base);
    expect(con.bytes.byteLength).toBeGreaterThan(sin.bytes.byteLength);
    const roto = await generarPdfLaboral({ ...base, logo: { bytes: new Uint8Array([1, 2, 3]), formato: "png" } });
    expect(Buffer.from(roto.bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
