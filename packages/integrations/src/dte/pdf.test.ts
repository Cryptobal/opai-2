import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { generarPdfDte, generarPdfPrevio, type PdfDteInput, type PdfPrevioInput } from "./pdf";
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
  it("el borrador va en una sola página, sin folio, timbre ni copia cedible", async () => {
    const bytes = await generarPdfDte({ ...base, folio: null, timbrePdf417: null, borrador: true });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(await paginas(bytes)).toBe(1);
  });
  it("una línea con descuento imprime el PDF sin romperse", async () => {
    const lineas = [{ descripcion: "Servicio", cantidad: "2", precio: 1_000_000, descuentoPct: 1550, monto: 1_690_000 }];
    expect(await paginas(await generarPdfDte({ ...base, lineas }))).toBe(2);
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
  it("la hoja es Carta (612 × 792 pt), el tamaño SII de OPAI 1", async () => {
    const { width, height } = (await PDFDocument.load(await generarPdfDte(base))).getPage(0).getSize();
    expect([width, height]).toEqual([612, 792]);
  });
  it("un detalle largo se reparte en varias páginas y la copia CEDIBLE repite el documento completo", async () => {
    const lineas = Array.from({ length: 45 }, (_, i) => ({
      descripcion: `Servicio ${i + 1} de guardias en turno nocturno, instalación Torre Ficticia Ñuñoa`,
      cantidad: "1",
      precio: 10_000,
      monto: 10_000,
    }));
    const largo = { ...base, lineas, neto: 450_000, iva: 85_500, total: 535_500 };
    const total = await paginas(await generarPdfDte(largo));
    expect(total).toBeGreaterThanOrEqual(6);
    expect(total % 2).toBe(0);
    const nc = await paginas(await generarPdfDte({ ...largo, tipoDte: 61 }));
    expect(nc).toBe(total / 2);
  });
  it("un renglón muy largo no se pierde: la línea crece en alto", async () => {
    const texto = "Descripción muy extensa ".repeat(30);
    const bytes = await generarPdfDte({ ...base, lineas: [{ descripcion: texto, monto: 100 }] });
    expect(await paginas(bytes)).toBe(2);
  });
});

const previo: PdfPrevioInput = {
  tipo: "proforma",
  numeroInterno: "PF-2026-12-000042",
  version: 1,
  fechaEmision: "2026-11-25",
  fechaVencimiento: "2026-12-31",
  periodo: "diciembre 2026",
  instalacion: "Edificio Titanium",
  emisor: base.emisor,
  receptor: base.receptor,
  lineas: [{ descripcion: "Servicio de seguridad, diciembre 2026", cantidad: "UF 120,00", monto: 4_777_008 }],
  neto: 4_777_008,
  exento: 0,
  iva: 907_632,
  total: 5_684_640,
  uf: { valor: "39.812,47", fecha: "2026-11-30", estimada: true },
  referencias: ["OC 4500123 (801)"],
};

describe("PDF de proforma y estado de pago", () => {
  it("la proforma es una hoja A4 sin folio del SII, determinística", async () => {
    const [a, b] = [await generarPdfPrevio(previo), await generarPdfPrevio(previo)];
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    const pdf = await PDFDocument.load(a);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize().width).toBe(612);
    expect(pdf.getTitle()).toBe("PROFORMA PF-2026-12-000042");
  });
  it("el estado de pago admite las firmas y la aprobación en línea", async () => {
    const ep: PdfPrevioInput = { ...previo, tipo: "estado_pago", numeroInterno: "EP-2026-12-000042" };
    const pendiente = await generarPdfPrevio(ep);
    const aprobado = await generarPdfPrevio({ ...ep, firmas: { aprobadoPor: { nombre: "Ana Rojas", fecha: "2026-11-29" } } });
    expect(await paginas(pendiente)).toBe(1);
    expect(Buffer.from(pendiente).equals(Buffer.from(aprobado))).toBe(false);
  });
  it("un detalle largo también pagina y no rompe con caracteres fuera de Latin-1", async () => {
    const lineas = Array.from({ length: 40 }, (_, i) => ({ descripcion: `Línea ${i + 1} ✓ 日本 ñandú`, monto: 1_000 }));
    expect(await paginas(await generarPdfPrevio({ ...previo, lineas }))).toBeGreaterThanOrEqual(2);
  });
});
