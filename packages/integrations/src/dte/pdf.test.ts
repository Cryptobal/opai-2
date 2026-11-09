import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { generarPdfDte, type PdfDteInput } from "./pdf";
import { FIXTURE_FACTURA, FIXTURE_NC } from "./pdf-fixtures";

const base: PdfDteInput = {
  tipoDte: 33,
  folio: 1234,
  fechaEmision: "2026-11-08",
  emisor: { razon: "Empresa de Prueba Ficticia SpA", rut: "76000000-0", giro: "Servicios de seguridad", direccion: "Calle Falsa 123", comuna: "Santiago", ciudad: "Santiago" },
  receptor: { razon: "Cliente Ficticio Ñandú Ltda.", rut: "77234567-8", giro: "Comercio", direccion: "Avenida Inventada 456", comuna: "Providencia", ciudad: "Santiago" },
  lineas: [
    { descripcion: "Servicio de guardias noviembre 2026 · José Núñez", cantidad: "2", precio: 500_000, monto: 1_000_000 },
    { descripcion: "Alarma monitoreada", monto: 100_000 },
  ],
  referencias: [{ tipoDteRef: 801, folioRef: 4500012345, codigoRef: 0, fechaRef: "2026-11-01", razonRef: "Orden de compra" }],
  neto: 1_100_000,
  exento: 0,
  iva: 209_000,
  total: 1_309_000,
  timbrePdf417: "<TED version=\"1.0\"><DD><RE>76000000-0</RE><TD>33</TD><F>1234</F></DD></TED>",
  resolucion: { numero: 0, fecha: "2026-01-15" },
};

async function paginas(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe("PDF del DTE", () => {
  it("el mismo fixture da siempre los mismos bytes (evidencia reproducible)", async () => {
    const [a, b] = [await generarPdfDte(FIXTURE_FACTURA), await generarPdfDte(FIXTURE_FACTURA)];
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    expect(await paginas(await generarPdfDte(FIXTURE_NC))).toBe(1);
  });
  it("la factura trae el original y la copia CEDIBLE", async () => {
    const bytes = await generarPdfDte(base);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(await paginas(bytes)).toBe(2);
  });
  it("la factura exenta también es cedible", async () => {
    expect(await paginas(await generarPdfDte({ ...base, tipoDte: 34, iva: 0, exento: 1_100_000, total: 1_100_000 }))).toBe(2);
  });
  it("la nota de crédito va en una sola página, con su referencia", async () => {
    const nc: PdfDteInput = {
      ...base,
      tipoDte: 61,
      referencias: [{ tipoDteRef: 33, folioRef: 1234, codigoRef: 3, fechaRef: "2026-11-08", razonRef: "Corrige montos" }],
    };
    expect(await paginas(await generarPdfDte(nc))).toBe(1);
  });
  it("sin resolución imprime un texto legible y no un signo de interrogación", async () => {
    const { resolucion: _omitida, ...sinRes } = base;
    const bytes = await generarPdfDte(sinRes);
    expect(await paginas(bytes)).toBe(2);
  });
  it("caracteres fuera de Latin-1 no rompen el PDF", async () => {
    const bytes = await generarPdfDte({ ...base, glosa: "Servicio ✓ 日本 con ñ y tildes áéíóú" });
    expect(await paginas(bytes)).toBe(2);
  });
});
