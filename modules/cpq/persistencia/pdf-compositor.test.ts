import { describe, expect, it } from "vitest";

import { componerPdf } from "./pdf-compositor";

const texto = (b: Uint8Array) => new TextDecoder().decode(b);

describe("componerPdf", () => {
  it("con varias páginas, todas referencian las mismas dos fuentes", () => {
    const pdf = texto(componerPdf([{ lineas: [{ texto: "Uno" }] }, { lineas: [{ texto: "Dos" }] }], "Helvetica"));
    // 1 catálogo, 2 páginas, 2 objetos por página (3..6) y fuentes en 7 y 8.
    const paginas = pdf.match(/\/Type \/Page \/Parent.*?\/F1 (\d+) 0 R \/F2 (\d+) 0 R/g) ?? [];
    expect(paginas).toHaveLength(2);
    for (const p of paginas) expect(p).toContain("/F1 7 0 R /F2 8 0 R");
    expect(pdf).toContain("7 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    expect(pdf).toContain("8 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  });

  it("la tabla xref queda en orden de número de objeto", () => {
    const pdf = texto(componerPdf([{ lineas: [{ texto: "Hola" }] }], "Helvetica"));
    const numeros = [...pdf.matchAll(/^(\d+) 0 obj/gm)].map((m) => Number(m[1]));
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    // 6 objetos (catálogo, páginas, contenido, página y dos fuentes) + la entrada 0.
    expect(pdf).toMatch(/xref\n0 7\n/);
  });
});
