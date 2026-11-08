// CAR-221 · A1: referencias del DTE (catálogo SII, folio y fecha) contra Postgres local aislado, dos tenants ficticios,
// permisos reales (owner de cada empresa) y adaptador SII simulado.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { cafXmlSintetico } from "./finanzas-caf-fixture";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

describe.skipIf(!urlPropietario)("Finanzas · referencias del DTE (CAR-221 · A1)", () => {
  let s: VentasDbSuite;
  const borrador = (referencias: unknown[]) =>
    s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Servicio de guardias", monto: 100_000 }],
      referencias,
    });

  beforeAll(async () => {
    s = await prepararVentasDb();
    await s.dato("finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ tipoDte: 61, folioDesde: 8100, folioHasta: 8120 }) });
  });
  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("guarda folio y fecha de una orden de compra 801 y de una HES 802", async () => {
    const b = await borrador([
      { tipoDteRef: 801, folioRef: 4500, fechaRef: "2026-10-15" },
      { tipoDteRef: 802, folioRef: 88, fechaRef: "2026-10-20", razonRef: "HES octubre" },
    ]);
    const filas = await s.e.admin.documentoEmitidoReferencia.findMany({ where: { documentoId: b.id }, orderBy: { tipoDteRef: "asc" } });
    expect(filas.map((f) => [f.tipoDteRef, f.folioRef, f.fechaRef?.toISOString().slice(0, 10)])).toEqual([
      [801, 4500, "2026-10-15"],
      [802, 88, "2026-10-20"],
    ]);
  });

  it("rechaza un código fuera del catálogo y una fecha futura", async () => {
    const f = async (r: unknown) => s.mod.executeCapability(s.ctx(), "finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId, tipoDte: 33, lineas: [{ glosa: "x", monto: 1000 }], referencias: [r],
    });
    expect(await f({ tipoDteRef: 999, folioRef: 1, fechaRef: "2026-10-01" })).toMatchObject({ ok: false });
    expect(await f({ tipoDteRef: 801, folioRef: 1, fechaRef: "2999-01-01" })).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await f({ tipoDteRef: 801, folioRef: 1 })).toMatchObject({ ok: false });
  });

  it("la nota de crédito guarda la fecha de emisión de la factura que referencia", async () => {
    const b = await borrador([{ tipoDteRef: 801, folioRef: 1, fechaRef: "2026-10-01" }]);
    await s.dato("finanzas.ventas.emitir", { documentoId: b.id });
    const factura = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: b.id } });
    await s.dato("finanzas.ventas.emitir_nota_credito", { documentoReferenciaId: b.id, monto: 100_000, motivo: "Anula factura", codigoReferencia: 1 });
    const nc = await s.e.admin.documentoEmitido.findFirstOrThrow({ where: { documentoReferenciaId: b.id, tipoDte: 61 } });
    const ref = await s.e.admin.documentoEmitidoReferencia.findFirstOrThrow({ where: { documentoId: nc.id } });
    expect(ref.fechaRef?.toISOString().slice(0, 10)).toBe(factura.fechaEmision?.toISOString().slice(0, 10));
    expect(ref.folioRef).toBe(factura.folio);
  });

  it("aislamiento: la otra empresa no ve estas referencias", async () => {
    const ajenas = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.ventas.obtener", { documentoId: s.documentoB });
    expect(ajenas.ok).toBe(true);
    const cruzada = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId, tipoDte: 33, lineas: [{ glosa: "x", monto: 1000 }],
    });
    expect(cruzada.ok).toBe(false);
  });
});
