// Diseño del PDF del DTE frente al de OPAI 1 (CAR-259). Lee el texto realmente dibujado en cada página. Todo ficticio.
import { decodePDFRawStream, PDFArray, PDFDocument, PDFName, PDFRawStream, PDFRef } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { generarPdfDte } from "./pdf";
import { FIXTURE_BORRADOR, FIXTURE_FACTURA, LOGO_DE_PRUEBA } from "./pdf-fixtures";
import { montoEnPalabras } from "./pdf-palabras";

async function paginas(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes)).getPageCount();
}

/** Texto dibujado en una página (las fuentes estándar van en hexadecimal WinAnsi, que para Latin-1 es el mismo código). */
async function textoDePagina(bytes: Uint8Array, pagina: number): Promise<string> {
  const pdf = await PDFDocument.load(bytes);
  const contenido = pdf.getPage(pagina).node.get(PDFName.of("Contents"));
  const refs = contenido instanceof PDFArray ? contenido.asArray() : [contenido];
  return refs
    .map((r) => (r instanceof PDFRef ? pdf.context.lookup(r) : r))
    .filter((o): o is PDFRawStream => o instanceof PDFRawStream)
    .map((o) => Buffer.from(decodePDFRawStream(o).decode()).toString("latin1"))
    .join("\n")
    .replace(/<([0-9A-Fa-f]+)>\s*Tj/g, (_m, hex: string) => `[${Buffer.from(hex, "hex").toString("latin1")}]`);
}

describe("diseño de OPAI 1 (CAR-259)", () => {
  it("el borrador lleva marca de agua BORRADOR, totales y monto en palabras, y ningún timbre ni resolución", async () => {
    const bytes = await generarPdfDte(FIXTURE_BORRADOR);
    expect(await paginas(bytes)).toBe(1);
    const t = await textoDePagina(bytes, 0);
    expect(t.match(/\[BORRADOR\]/g)?.length).toBe(2); // recuadro SII + marca de agua diagonal
    expect(t).toMatch(/0\.866\d* 0\.49\d* -0\.49\d* 0\.866\d* [\d.-]+ [\d.-]+ Tm/); // la marca va girada 30°
    for (const esperado of ["NETO $", "I.V.A. (19%) $", "TOTAL $", "1.309.000", "SON UN MILLON TRESCIENTOS NUEVE MIL PESOS"]) expect(t).toContain(`[${esperado}]`);
    for (const ausente of ["Timbre", "Verifique", "ORIGINAL", "CEDIBLE", "Res. N"]) expect(t).not.toContain(ausente);
  });
  it("el emitido lleva timbre, resolución, ORIGINAL y su copia CEDIBLE, sin marca de agua", async () => {
    const bytes = await generarPdfDte(FIXTURE_FACTURA);
    expect(await paginas(bytes)).toBe(2);
    const original = await textoDePagina(bytes, 0);
    expect(original).toContain("[ORIGINAL]");
    expect(original).toContain("[Timbre Electrónico S.I.I.]");
    expect(original).toContain("[Res. N° 0 de 15 de enero de 2026]");
    expect(original).toContain("[Verifique Documento: www.sii.cl]");
    expect(original).not.toContain("[BORRADOR]");
    const cedible = await textoDePagina(bytes, 1);
    expect(cedible).toContain("[CEDIBLE]");
    expect(cedible).toContain("[ACUSE DE RECIBO]");
  });
  it("el receptor omite CIUDAD si no la tiene y la imprime si la tiene", async () => {
    expect(await textoDePagina(await generarPdfDte(FIXTURE_BORRADOR), 0)).not.toContain("CIUDAD");
    const con = await textoDePagina(await generarPdfDte(FIXTURE_FACTURA), 0);
    expect(con).toContain("[CIUDAD:]");
    expect(con).toContain("[SANTIAGO]");
  });
  it("el detalle imprime el nombre y, debajo, la descripción y el período del documento", async () => {
    const t = await textoDePagina(await generarPdfDte(FIXTURE_FACTURA), 0);
    for (const s of ["Servicio de guardias noviembre 2026", "Período: 1 al 30 de noviembre de 2026", "Instalación Torre Ficticia, turnos de 12 horas"]) {
      expect(t).toContain(`[${s}]`);
    }
  });
  it("con logo y teléfono los imprime; sin logo sigue con la razón social y no falla", async () => {
    const con = await generarPdfDte(FIXTURE_FACTURA);
    expect(await textoDePagina(con, 0)).toContain("[EMPRESA DE PRUEBA FICTICIA SPA]");
    expect(await textoDePagina(con, 0)).toContain("[Fono: +56 2 2000 0000]");
    expect(Buffer.from(con).includes(Buffer.from("/Subtype /Image"))).toBe(true);
    const { logo: _l, ...sinLogo } = FIXTURE_FACTURA;
    const sin = await generarPdfDte(sinLogo);
    expect(Buffer.from(sin).includes(Buffer.from("/Subtype /Image"))).toBe(true); // el timbre; no el logo
    expect(sin.byteLength).toBeLessThan(con.byteLength);
    expect(await generarPdfDte({ ...FIXTURE_FACTURA, logo: { bytes: new Uint8Array([1, 2, 3]), formato: "png" } })).toBeInstanceOf(Uint8Array);
    expect(LOGO_DE_PRUEBA.byteLength).toBeGreaterThan(100);
  });
  it("un nombre de receptor muy largo se reparte en dos renglones sin salirse del recuadro", async () => {
    const razon = "SERVICIO DE IMPUESTOS INTERNOS (PRUEBA CERTIFICACIÓN SII) ".repeat(4).trim();
    const t = await textoDePagina(await generarPdfDte({ ...FIXTURE_BORRADOR, receptor: { ...FIXTURE_BORRADOR.receptor, razon } }), 0);
    expect(t).toContain("[SERVICIO DE IMPUESTOS INTERNOS (PRUEBA CERTIFICACIÓN SII)");
    expect(t).toContain("...]");
  });
  it("los totales quedan pegados al detalle, no al borde inferior de la hoja", async () => {
    const t = await textoDePagina(await generarPdfDte(FIXTURE_BORRADOR), 0);
    const y = /1 0 0 1 [\d.]+ ([\d.]+) Tm\s*\[TOTAL \$\]/.exec(t);
    expect(y).not.toBeNull();
    expect(Number(y?.[1])).toBeGreaterThan(300); // en pdf-lib la y crece hacia arriba: queda en la mitad superior de la hoja
  });
});

describe("monto en palabras", () => {
  it.each([
    [0, "CERO"],
    [1, "UNO"],
    [21, "VEINTIUNO"],
    [31, "TREINTA Y UNO"],
    [100, "CIEN"],
    [101, "CIENTO UNO"],
    [1000, "MIL"],
    [21_000, "VEINTIUN MIL"],
    [1_000_000, "UN MILLON"],
    [1_001_001, "UN MILLON MIL UNO"],
    [1_309_000, "UN MILLON TRESCIENTOS NUEVE MIL"],
    [2_500_000, "DOS MILLONES QUINIENTOS MIL"],
    [535_500, "QUINIENTOS TREINTA Y CINCO MIL QUINIENTOS"],
    [999_999, "NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE"],
  ])("%i → %s", (n, texto) => {
    expect(montoEnPalabras(n)).toBe(texto);
  });
});
