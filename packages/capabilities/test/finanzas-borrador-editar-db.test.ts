// CAR-248 · Editar y descartar borradores de factura y de nota de débito (Postgres local, tenants ficticios, SII
// simulado). Un documento emitido nunca se modifica ni se borra.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { cafXmlSintetico } from "./finanzas-caf-fixture";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Vista = { id: string; folio: number | null; estadoDte: string; montoNeto: number; montoIva: number; montoTotal: number; glosa: string | null; lineas: { glosa: string; monto: number }[] };

describe.skipIf(!urlPropietario)("Finanzas · editar y descartar borradores (CAR-248)", () => {
  let s: VentasDbSuite;
  const borrador = (monto = 1_000, extra: Record<string, unknown> = {}) =>
    s.dato<Vista>("finanzas.ventas.crear_borrador", { cuentaId: s.cuentaId, tipoDte: 33, lineas: [{ glosa: "Servicio", monto }], ...extra });
  const falla = async (id: string, input: Record<string, unknown>) => {
    const r = await s.mod.executeCapability(s.ctx(), id, input);
    return r.ok ? null : r.error;
  };
  const filas = (id: string) => s.e.admin.documentoEmitido.count({ where: { id } });

  beforeAll(async () => {
    s = await prepararVentasDb();
    await s.dato("finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ tipoDte: 56, folioDesde: 9400, folioHasta: 9420 }) });
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("actualiza las líneas de una factura: recalcula montos y reemplaza el detalle", async () => {
    const b = await borrador();
    const r = await s.dato<Vista>("finanzas.ventas.actualizar_borrador", {
      documentoId: b.id,
      lineas: [{ glosa: "Guardias", monto: 2_000 }, { glosa: "Extra", monto: 3_000 }],
      glosa: "  Mes de noviembre ",
      fechaEmision: "2026-11-01",
    });
    expect([r.montoNeto, r.montoIva, r.montoTotal]).toEqual([5_000, 950, 5_950]);
    expect(r.lineas.map((l) => l.glosa)).toEqual(["Guardias", "Extra"]);
    expect(r.glosa).toBe("Mes de noviembre");
    expect(await s.e.admin.documentoEmitidoLinea.count({ where: { documentoId: b.id } })).toBe(2);
    const doc = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: b.id } });
    expect([doc.estadoDte, doc.folio, doc.fechaEmision?.toISOString().slice(0, 10)]).toEqual(["borrador", null, "2026-11-01"]);
  });

  it("la vista previa muestra cómo quedaría y no escribe", async () => {
    const b = await borrador();
    const r = await s.dato<Vista>("finanzas.ventas.actualizar_borrador", { documentoId: b.id, lineas: [{ glosa: "Otro", monto: 9_000 }] }, { dryRun: true });
    expect(r.montoNeto).toBe(9_000);
    const doc = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: b.id } });
    expect(doc.montoNeto).toBe(1_000);
  });

  it("exige algún cambio, valida fecha futura y montos de línea", async () => {
    const b = await borrador();
    expect((await falla("finanzas.ventas.actualizar_borrador", { documentoId: b.id }))?.code).toBe("INVALID_INPUT");
    expect((await falla("finanzas.ventas.actualizar_borrador", { documentoId: b.id, fechaEmision: "2999-01-01" }))?.code).toBe("UNPROCESSABLE");
    expect((await falla("finanzas.ventas.actualizar_borrador", { documentoId: b.id, lineas: [{ glosa: "X", monto: 5, cantidad: "2", precioUnitario: 10 }] }))?.code).toBe("UNPROCESSABLE");
  });

  it("nunca modifica ni borra un documento emitido", async () => {
    const e = await s.dato<Vista>("finanzas.ventas.emitir", { documentoId: (await borrador()).id });
    expect(e.folio).not.toBeNull();
    for (const id of ["finanzas.ventas.actualizar_borrador", "finanzas.ventas.descartar_borrador"]) {
      const err = await falla(id, { documentoId: e.id, ...(id.includes("actualizar") ? { glosa: "x" } : {}) });
      expect(err?.code).toBe("UNPROCESSABLE");
    }
    expect(await filas(e.id)).toBe(1);
  });

  it("una nota de débito: cambia líneas y motivo, y recalcula montos y referencia", async () => {
    const f = await s.dato<Vista>("finanzas.ventas.emitir", { documentoId: (await borrador(100_000)).id });
    const nd = await s.dato<Vista>("finanzas.ventas.crear_borrador_nota_debito", { facturaId: f.id, motivo: "Intereses", lineas: [{ glosa: "Cargo", monto: 1_000 }] });
    const r = await s.dato<Vista>("finanzas.ventas.actualizar_borrador", { documentoId: nd.id, lineas: [{ glosa: "Cargo", monto: 2_000 }], motivo: "Intereses de octubre" });
    expect([r.montoNeto, r.montoTotal]).toEqual([2_000, 2_380]);
    const ref = await s.e.admin.documentoEmitidoReferencia.findMany({ where: { documentoId: nd.id } });
    expect(ref.map((x) => [x.tipoDteRef, x.folioRef, x.codigoRef, x.razonRef])).toEqual([[33, f.folio, 3, "Intereses de octubre"]]);
    expect((await falla("finanzas.ventas.actualizar_borrador", { documentoId: nd.id, referencias: [] }))?.code).toBe("UNPROCESSABLE");
    expect((await falla("finanzas.ventas.actualizar_borrador", { documentoId: nd.id, glosa: "x" }))?.code).toBe("UNPROCESSABLE");
  });

  it("descarta un borrador: la vista previa no borra, el descarte sí, con su detalle", async () => {
    const b = await borrador(1_000, { referencias: [{ tipoDteRef: 801, folioRef: 7, fechaRef: "2026-10-01" }] });
    await s.dato("finanzas.ventas.descartar_borrador", { documentoId: b.id }, { dryRun: true });
    expect(await filas(b.id)).toBe(1);
    const r = await s.dato<{ descartado: boolean }>("finanzas.ventas.descartar_borrador", { documentoId: b.id });
    expect(r.descartado).toBe(true);
    expect(await filas(b.id)).toBe(0);
    expect(await s.e.admin.documentoEmitidoLinea.count({ where: { documentoId: b.id } })).toBe(0);
    expect((await falla("finanzas.ventas.descartar_borrador", { documentoId: b.id }))?.code).toBe("NOT_FOUND");
  });

  it("no toca un borrador de otra empresa ni uno que maneja el cierre mensual", async () => {
    expect((await falla("finanzas.ventas.descartar_borrador", { documentoId: s.documentoB }))?.code).toBe("NOT_FOUND");
    expect(await filas(s.documentoB)).toBe(1);
    const b = await borrador();
    await s.e.admin.ventasCierreSeguimiento.create({ data: { tenantId: s.tenantId, documentoId: b.id } });
    expect((await falla("finanzas.ventas.descartar_borrador", { documentoId: b.id }))?.code).toBe("UNPROCESSABLE");
    expect((await falla("finanzas.ventas.actualizar_borrador", { documentoId: b.id, glosa: "x" }))?.code).toBe("UNPROCESSABLE");
  });
});
