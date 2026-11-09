// Borrador de factura: fecha de emisión elegida, línea con descuento y vista previa PDF (CAR-228). SII SIMULADO.
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Doc = { id: string };

const dia = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!urlPropietario)("borrador de factura · fecha, descuento y vista previa PDF · base real", () => {
  let s: VentasDbSuite;
  beforeAll(async () => {
    s = await prepararVentasDb();
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  const linea = { glosa: "Servicio de guardias", cantidad: "2", precioUnitario: 1_000_000, descuentoPct: 1000, monto: 1_800_000 };

  it("guarda la fecha elegida y el descuento de la línea", async () => {
    const fecha = dia(-3);
    const b = await s.dato<Doc>("finanzas.ventas.crear_borrador", { cuentaId: s.cuentaId, tipoDte: 33, fechaEmision: fecha, lineas: [linea] });
    const doc = await s.e.admin.documentoEmitido.findFirstOrThrow({ where: { id: b.id } });
    expect(doc.fechaEmision?.toISOString().slice(0, 10)).toBe(fecha);
    expect([doc.montoNeto, doc.montoIva, doc.montoTotal]).toEqual([1_800_000, 342_000, 2_142_000]);
    const l = await s.e.admin.documentoEmitidoLinea.findFirstOrThrow({ where: { documentoId: b.id } });
    expect([l.cantidad?.toString(), l.precioUnitario, l.descuentoPct, l.monto]).toEqual(["2", 1_000_000, 1000, 1_800_000]);
  });

  it("rechaza una fecha futura y una línea cuyo monto no cuadra", async () => {
    await expect(
      s.dato("finanzas.ventas.crear_borrador", { cuentaId: s.cuentaId, tipoDte: 33, fechaEmision: dia(2), lineas: [linea] }),
    ).rejects.toThrow(/posterior a hoy/);
    await expect(
      s.dato("finanzas.ventas.crear_borrador", { cuentaId: s.cuentaId, tipoDte: 33, lineas: [{ ...linea, monto: 2_000_000 }] }),
    ).rejects.toThrow(/no cuadra/);
  });

  it("la vista previa PDF del borrador sale en una página; un documento emitido no la admite", async () => {
    const b = await s.dato<Doc>("finanzas.ventas.crear_borrador", { cuentaId: s.cuentaId, tipoDte: 33, lineas: [linea] });
    const pdf = await s.dato<{ mime: string; base64: string }>("finanzas.ventas.preview_pdf", { documentoId: b.id });
    const bytes = Buffer.from(pdf.base64, "base64");
    expect(pdf.mime).toBe("application/pdf");
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    await s.dato("finanzas.ventas.emitir", { documentoId: b.id });
    await expect(s.dato("finanzas.ventas.preview_pdf", { documentoId: b.id })).rejects.toThrow(/solo para borradores/);
  });
});
