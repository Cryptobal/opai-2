// PDF descargable de factura y nota de crédito con datos ficticios (CAR-221). Circuito con SII SIMULADO:
// esto prueba la representación impresa, no una aceptación externa del SII.
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { cafXmlSintetico } from "./finanzas-caf-fixture";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Doc = { id: string; folio: number };

describe.skipIf(!urlPropietario)("PDF de factura y nota de crédito · base real", () => {
  let s: VentasDbSuite;
  beforeAll(async () => {
    s = await prepararVentasDb();
    await s.dato("finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ tipoDte: 61, folioDesde: 9300, folioHasta: 9320 }) });
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  async function paginasDe(documentoId: string) {
    const pdf = await s.dato<{ mime: string; base64: string }>("finanzas.ventas.pdf", { documentoId });
    expect(pdf.mime).toBe("application/pdf");
    const bytes = Buffer.from(pdf.base64, "base64");
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    return (await PDFDocument.load(bytes)).getPageCount();
  }

  it("la factura sale con su copia CEDIBLE y la nota de crédito en una página", async () => {
    const b = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Servicio de guardias noviembre", monto: 400_000 }],
    });
    const factura = await s.dato<Doc>("finanzas.ventas.emitir", { documentoId: b.id });
    expect(await paginasDe(factura.id)).toBe(2);

    const nc = await s.dato<Doc>("finanzas.ventas.emitir_nota_credito", {
      documentoReferenciaId: factura.id,
      monto: 119_000,
      motivo: "Corrige montos",
      codigoReferencia: 3,
    });
    expect(await paginasDe(nc.id)).toBe(1);
  });
});
