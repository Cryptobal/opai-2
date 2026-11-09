// CAR-221 · A2: nota de débito (56) que anula una nota de crédito, contra Postgres local aislado con dos tenants
// ficticios, permisos owner reales y SII simulado (sin DTE real).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { cafXmlSintetico } from "./finanzas-caf-fixture";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

describe.skipIf(!urlPropietario)("Finanzas · nota de débito 56 (CAR-221 · A2)", () => {
  let s: VentasDbSuite;
  type Vista = { id: string; folio: number | null; estadoDte: string; montoTotal: number; montoPendiente?: number };

  async function facturaConNc(monto = 100_000) {
    const b = await s.dato<Vista>("finanzas.ventas.crear_borrador", { cuentaId: s.cuentaId, tipoDte: 33, lineas: [{ glosa: "Servicio", monto }] });
    const f = await s.dato<Vista>("finanzas.ventas.emitir", { documentoId: b.id });
    await s.dato("finanzas.ventas.emitir_nota_credito", { documentoReferenciaId: f.id, monto: f.montoTotal, motivo: "Anula factura", codigoReferencia: 1 });
    const nc = await s.e.admin.documentoEmitido.findFirstOrThrow({ where: { documentoReferenciaId: f.id, tipoDte: 61 } });
    return { factura: f, nc };
  }
  const estado = async (id: string) => (await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id } })).estadoDte;

  beforeAll(async () => {
    s = await prepararVentasDb();
    await s.dato("finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ tipoDte: 61, folioDesde: 9100, folioHasta: 9140 }) });
    await s.dato("finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ tipoDte: 56, folioDesde: 9200, folioHasta: 9240 }) });
  });
  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("anula la NC: folio de ND, referencia con fecha, NC anulada y la factura vuelve a estar vigente con su deuda", async () => {
    const { factura, nc } = await facturaConNc();
    expect(await estado(factura.id)).toBe("anulado_nc");
    expect((await s.dato<Vista>("finanzas.ventas.obtener", { documentoId: factura.id })).montoPendiente).toBe(0);

    await s.dato("finanzas.ventas.emitir_nota_debito", { notaCreditoId: nc.id, motivo: "La NC se emitió por error" }, { dryRun: true });
    expect(await estado(nc.id)).not.toBe("anulado_nd"); // la vista previa no escribe

    const nd = await s.dato<Vista>("finanzas.ventas.emitir_nota_debito", { notaCreditoId: nc.id, motivo: "La NC se emitió por error" });
    expect(nd).toMatchObject({ folio: 9200, estadoDte: "enviado", montoTotal: nc.montoTotal });
    const fila = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: nd.id }, include: { referencias: true } });
    expect(fila).toMatchObject({ tipoDte: 56, documentoReferenciaId: nc.id });
    expect(fila.referencias[0]).toMatchObject({ tipoDteRef: 61, folioRef: nc.folio, codigoRef: 1 });
    expect(fila.referencias[0]?.fechaRef?.toISOString().slice(0, 10)).toBe(nc.fechaEmision?.toISOString().slice(0, 10));

    expect(await estado(nc.id)).toBe("anulado_nd");
    expect(await estado(factura.id)).toBe("enviado");
    expect((await s.dato<Vista>("finanzas.ventas.obtener", { documentoId: factura.id })).montoPendiente).toBe(factura.montoTotal);
  });

  it("no se anula dos veces la misma NC y solo se anula una NC (no una factura)", async () => {
    const { factura, nc } = await facturaConNc(50_000);
    await s.dato("finanzas.ventas.emitir_nota_debito", { notaCreditoId: nc.id, motivo: "Primera anulación" });
    const otra = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir_nota_debito", { notaCreditoId: nc.id, motivo: "Segunda anulación" });
    expect(otra).toMatchObject({ ok: false });
    const sobreFactura = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir_nota_debito", { notaCreditoId: factura.id, motivo: "Mal documento" });
    expect(sobreFactura).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("tras anular la NC se puede emitir otra NC sobre la factura", async () => {
    const { factura, nc } = await facturaConNc(80_000);
    await s.dato("finanzas.ventas.emitir_nota_debito", { notaCreditoId: nc.id, motivo: "Se anula la NC" });
    await s.dato("finanzas.ventas.emitir_nota_credito", { documentoReferenciaId: factura.id, monto: 20_000, motivo: "Descuento", codigoReferencia: 3 });
    const nuevas = await s.e.admin.documentoEmitido.count({ where: { documentoReferenciaId: factura.id, tipoDte: 61, estadoDte: { not: "anulado_nd" } } });
    expect(nuevas).toBe(1);
  });

  it("aislamiento: otra empresa no puede anular esta NC", async () => {
    const { nc } = await facturaConNc(30_000);
    const ajena = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.ventas.emitir_nota_debito", { notaCreditoId: nc.id, motivo: "Intento ajeno" });
    expect(ajena).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await estado(nc.id)).not.toBe("anulado_nd");
  });
});
