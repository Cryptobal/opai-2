// CAR-283 · Importador de facturas y notas emitidas: crea el historial sin SII ni folios, no duplica,
// conserva lo cobrado en el origen como base del saldo, deja fuera la cobranza y se revierte.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";
import { ORIGEN_HISTORICO } from "../src/finanzas/cobros-origen";

import { entornoImportar, type Salida } from "./importar-entorno";

const CUENTAS = "nombre,rut\nDelta,77.777.777-7\n";
// Encabezados del detalle del Registro de Ventas del SII, más las columnas propias de cobro.
const VENTAS = [
  "Tipo Doc,Folio,Rut cliente,Fecha Docto,Monto Exento,Monto Neto,Monto IVA,Monto total,Monto ya cobrado,Folio referencia,Tipo referencia,Codigo referencia",
  "33,9001,77.777.777-7,01-10-2026,0,100000,19000,119000,119000,,,",
  "33,9002,77.777.777-7,05-10-2026,0,200000,38000,238000,38000,,,",
  "61,9101,77.777.777-7,06-10-2026,0,10000,1900,11900,,9002,33,corrige montos",
  "33,9003,11.111.111-1,07-10-2026,0,1000,190,1190,,,,",
  "33,9002,77.777.777-7,05-10-2026,0,200000,38000,238000,,,,",
  "33,9004,77.777.777-7,08-10-2026,0,50000,9500,59500,,,,",
].join("\n");

describe.skipIf(!urlPropietario)("core · importador de documentos de venta (CAR-283)", () => {
  let x: Awaited<ReturnType<typeof entornoImportar>>;
  beforeAll(async () => {
    x = await entornoImportar();
  });
  afterAll(async () => {
    await x?.e.cerrar();
  });
  const modulos = ["comercial", "finanzas"];
  const ventas = async (dryRun = false) => {
    const r = await x.run<Salida>(x.t1, "core.importar.ejecutar", { importador: "documentos_venta", archivo: x.csv(VENTAS) }, { dryRun, modulos });
    if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
    return r.data;
  };

  it("sin el módulo Finanzas activo no se puede importar", async () => {
    const r = await x.run(x.t1, "core.importar.ejecutar", { importador: "documentos_venta", archivo: x.csv(VENTAS) }, { dryRun: true });
    expect(r.ok).toBe(false);
  });

  it("simula, importa sin SII ni folios y reimportar no duplica", async () => {
    await x.importar(x.t1, "cuentas", { archivo: x.csv(CUENTAS) });
    const sim = await ventas(true);
    expect(sim.conteos).toMatchObject({ crear: 4, error: 2 });
    expect(sim.filas.find((f) => f.fila === 7)?.mensajes.join(" ")).toMatch(/se asume cobrada/);
    expect(sim.filas.find((f) => f.fila === 5)?.mensajes.join(" ")).toMatch(/cuenta|RUT/i);
    expect(sim.filas.find((f) => f.fila === 6)?.mensajes.join(" ")).toMatch(/fila 3/);

    const r = await ventas();
    expect(r.conteos).toMatchObject({ crear: 4 });
    const docs = await x.e.admin.documentoEmitido.findMany({ where: { tenantId: x.t1 }, orderBy: { folio: "asc" } });
    expect(docs.map((d) => [d.tipoDte, d.folio, d.estadoDte, d.estadoCobro])).toEqual([
      [33, 9001, "aceptado", "pagada"],
      [33, 9002, "aceptado", "pagada_parcial"],
      [33, 9004, "aceptado", "pagada"],
      [61, 9101, "aceptado", "pendiente"],
    ]);
    expect(docs.every((d) => d.trackIdSii === null && d.xmlStorageKey === null)).toBe(true);
    const nc = docs.find((d) => d.folio === 9101);
    expect(nc?.documentoReferenciaId).toBe(docs.find((d) => d.folio === 9002)?.id);
    expect(nc?.codigoReferencia).toBe(3);
    expect(await x.e.admin.dteEnvio.count({ where: { tenantId: x.t1 } })).toBe(0);

    const otra = await ventas();
    expect(otra.conteos).toMatchObject({ crear: 0, sin_cambio: 4 });
    expect(await x.e.admin.documentoEmitido.count({ where: { tenantId: x.t1 } })).toBe(4);
    expect(await x.e.admin.documentoEmitido.count({ where: { tenantId: x.t2 } })).toBe(0);
  });

  it("lo cobrado en el origen cuenta para el saldo y la cobranza no avisa por lo importado", async () => {
    const f2 = await x.e.admin.documentoEmitido.findFirstOrThrow({ where: { tenantId: x.t1, folio: 9002 } });
    // Misma consulta que `cobradoAperturaDe` (cobros.ts): lo cobrado en el origen queda como base del saldo.
    const fila = await x.e.admin.importacionFila.findFirst({ where: { id20: f2.id, accion: "creado", OR: ORIGEN_HISTORICO } });
    expect(fila?.previos).toEqual({ cobradoApertura: 38_000 });
    expect(f2.montoCobrado).toBe(38_000);
    // Misma consulta que usa la cobranza (`idsDeApertura`): cuenta la fila que creó el documento.
    expect(await x.e.admin.importacionFila.count({ where: { id20: f2.id, accion: "creado", OR: ORIGEN_HISTORICO } })).toBe(1);
  });

  it("una factura emitida en OPAI que vuelve en una planilla no sale de la cobranza", async () => {
    const cuenta = await x.e.admin.cuenta.findFirstOrThrow({ where: { tenantId: x.t1, nombre: "Delta" } });
    const nativa = await x.e.admin.documentoEmitido.create({
      data: { tenantId: x.t1, cuentaId: cuenta.id, tipoDte: 33, folio: 9005, fechaEmision: new Date("2026-10-09"), montoNeto: 100, montoIva: 19, montoTotal: 119, estadoDte: "aceptado" },
    });
    const csv = "Tipo Doc,Folio,Rut cliente,Fecha Docto,Monto Neto,Monto IVA,Monto total\n33,9005,77.777.777-7,09-10-2026,100,19,119\n33,9006,77.777.777-7,10-10-2026,100,19,119\n";
    const r = await x.run<Salida>(x.t1, "core.importar.ejecutar", { importador: "documentos_venta", archivo: x.csv(csv) }, { modulos });
    expect(r.ok && r.data.conteos).toMatchObject({ crear: 1, sin_cambio: 1 });
    expect(await x.e.admin.importacionFila.count({ where: { id20: nativa.id, OR: ORIGEN_HISTORICO } })).toBe(1);
    expect(await x.e.admin.importacionFila.count({ where: { id20: nativa.id, accion: "creado", OR: ORIGEN_HISTORICO } })).toBe(0);
  });

  it("revertir el lote borra los documentos creados", async () => {
    const lote = await x.e.admin.importacion.findFirstOrThrow({
      where: { tenantId: x.t1, conteos: { path: ["importador"], equals: "documentos_venta" } },
      orderBy: { iniciadaEn: "asc" },
    });
    const r = await x.run<{ revertido: boolean }>(x.t1, "core.importar.revertir", { importacionId: lote.id }, { modulos });
    expect(r.ok && r.data.revertido).toBe(true);
    const folios = (await x.e.admin.documentoEmitido.findMany({ where: { tenantId: x.t1 }, select: { folio: true } })).map((d) => d.folio);
    // Quedan solo la factura emitida en OPAI y la del otro lote.
    expect(folios.sort()).toEqual([9005, 9006]);
  });
});
