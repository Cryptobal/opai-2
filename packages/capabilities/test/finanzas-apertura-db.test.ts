// BRIEF-30 · F6: apertura desde 1.0 contra Postgres real (corrida, idempotencia, reversión, aislamiento).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const doc = (folio: number, extra: object = {}) => ({
  tipoDte: 33, folio, rutReceptor: "76.543.210-3", fechaEmision: "2026-09-01", fechaVencimiento: "2026-10-01",
  montoNeto: 1000, montoExento: 0, montoIva: 190, montoTotal: 1190, montoCobrado: 0, glosa: null, ...extra,
});

describe.skipIf(!urlPropietario)("finanzas.apertura · carga desde 1.0", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tA = "";
  let tB = "";
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["finanzas"], medidor });
  const entrada = {
    saldos: [{ banco: "Santander", numeroVisible: "001", moneda: "CLP", saldo: 5000 }],
    documentos: [doc(10), doc(11, { montoCobrado: 190 }), doc(12, { tipoDte: 61, montoCobrado: 0 }), doc(13, { rutReceptor: "11.111.111-1" })],
    folios: [{ tipoDte: 33, ultimoFolio: 12 }],
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
    const t = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } })).id;
    tA = await t("ap-a");
    tB = await t("ap-b");
    for (const tenantId of [tA, tB]) {
      await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente", rut: "76543210-3" } });
      await e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Santander", numeroVisible: "001" } });
      await e.admin.dteFolio.create({ data: { tenantId, tipoDte: 33, folioDesde: 1, folioHasta: 100, folioActual: 5 } });
    }
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  const importar = (t: string, dryRun: boolean) =>
    mod.executeCapability(ctx(t), "finanzas.apertura.importar", { fechaCorte: "2026-10-31", entrada, aceptarRechazos: true }, { dryRun });

  it("la vista previa no escribe", async () => {
    const r = await importar(tA, true);
    expect(r).toMatchObject({ data: { importacionId: null, creados: { documentos: 3, saldos: 1, folios: 1 } } });
    expect(await e.admin.documentoEmitido.count({ where: { tenantId: tA } })).toBe(0);
  });

  it("con filas rechazadas no aplica nada si no se aceptan", async () => {
    const r = await mod.executeCapability(ctx(tA), "finanzas.apertura.importar", { fechaCorte: "2026-10-31", entrada });
    expect(r).toMatchObject({ ok: true, data: { importacionId: null, creados: { documentos: 0 } } });
    expect(await e.admin.documentoEmitido.count({ where: { tenantId: tA } })).toBe(0);
  });

  it("aplica, rechaza lo sin cuenta y deja las sumas conciliadas", async () => {
    const r = await importar(tA, false);
    expect(r.ok).toBe(true);
    const d = (r as { data: { creados: object; rechazos: { clave: string }[]; origen: { porCobrar: number } } }).data;
    expect(d.creados).toEqual({ saldos: 1, documentos: 3, folios: 1 });
    expect(d.rechazos.map((x) => x.clave)).toEqual(["33-13"]);
    expect(d.origen.porCobrar).toBe(1190 + 1000 + 1190);
    const f = await e.admin.dteFolio.findFirst({ where: { tenantId: tA, tipoDte: 33 } });
    expect(f?.folioActual).toBe(13);
    const pagada = await e.admin.documentoEmitido.findFirst({ where: { tenantId: tA, folio: 11 } });
    expect(pagada?.estadoCobro).toBe("pagada_parcial");
  });

  it("repetir no duplica ni retrocede el folio", async () => {
    const r = await importar(tA, false);
    expect(r).toMatchObject({ data: { creados: { saldos: 0, documentos: 0, folios: 0 } } });
    expect(await e.admin.documentoEmitido.count({ where: { tenantId: tA } })).toBe(3);
    expect((await e.admin.dteFolio.findFirst({ where: { tenantId: tA } }))?.folioActual).toBe(13);
  });

  it("un cobro posterior suma sobre lo ya cobrado en 1.0", async () => {
    const d = await e.admin.documentoEmitido.findFirst({ where: { tenantId: tA, folio: 11 } });
    const { sincronizarCobroDocumento } = mod;
    const r = await e.admin.$transaction((tx) => sincronizarCobroDocumento(tx as never, d?.id ?? ""));
    expect(r.montoCobrado).toBe(190);
  });

  it("el folio no pasa del tope de su CAF", async () => {
    const r = await mod.executeCapability(
      ctx(tB), "finanzas.apertura.importar",
      { fechaCorte: "2026-10-31", entrada: { saldos: [], documentos: [], folios: [{ tipoDte: 33, ultimoFolio: 150 }] } },
    );
    expect(r).toMatchObject({ ok: true });
    expect((await e.admin.dteFolio.findFirst({ where: { tenantId: tB, tipoDte: 33 } }))?.folioActual).toBe(101);
  });

  it("revertir NO baja el folio (lo que 1.0 emitió sigue usado)", async () => {
    const tC = (await e.admin.tenant.create({ data: { slug: `ap-c-${randomUUID().slice(0, 8)}`, nombre: "ap-c", vertical: "seguridad" } })).id;
    await e.admin.dteFolio.create({ data: { tenantId: tC, tipoDte: 33, folioDesde: 1, folioHasta: 100, folioActual: 5 } });
    const ap = await mod.executeCapability(ctx(tC), "finanzas.apertura.importar", { fechaCorte: "2026-10-31", entrada: { saldos: [], documentos: [], folios: [{ tipoDte: 33, ultimoFolio: 12 }] } });
    const id = (ap as { data: { importacionId: string } }).data.importacionId;
    expect((await e.admin.dteFolio.findFirst({ where: { tenantId: tC } }))?.folioActual).toBe(13);
    const r = await mod.executeCapability(ctx(tC), "finanzas.apertura.revertir", { importacionId: id });
    expect(r).toMatchObject({ ok: true, data: { revertida: true } });
    expect((await e.admin.dteFolio.findFirst({ where: { tenantId: tC } }))?.folioActual).toBe(13);
  });

  it("protege también un CAF pausado: al reactivarlo no reusa folios de 1.0 (CAR-240)", async () => {
    const tD = (await e.admin.tenant.create({ data: { slug: `ap-d-${randomUUID().slice(0, 8)}`, nombre: "ap-d", vertical: "seguridad" } })).id;
    const pausado = await e.admin.dteFolio.create({ data: { tenantId: tD, tipoDte: 33, folioDesde: 1, folioHasta: 100, folioActual: 1, activo: false } });
    const r = await mod.executeCapability(ctx(tD), "finanzas.apertura.importar", { fechaCorte: "2026-10-31", entrada: { saldos: [], documentos: [], folios: [{ tipoDte: 33, ultimoFolio: 80 }] } });
    expect(r).toMatchObject({ ok: true, data: { creados: { folios: 1 } } });
    expect((await e.admin.dteFolio.findUnique({ where: { id: pausado.id } }))?.folioActual).toBe(81);
  });

  it("la otra empresa no ve ni recibe nada", async () => {
    expect(await e.admin.documentoEmitido.count({ where: { tenantId: tB } })).toBe(0);
    const corrida = await e.admin.importacion.findFirst({ where: { tenantId: tA, versionContrato: "finanzas-apertura@1", estado: "completada" } });
    const r = await mod.executeCapability(ctx(tB), "finanzas.apertura.revertir", { importacionId: corrida?.id ?? randomUUID() });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("tras un cobro posterior la reversión se niega", async () => {
    const corrida = await e.admin.importacion.findFirst({ where: { tenantId: tA, versionContrato: "finanzas-apertura@1", estado: "completada" } });
    const r = await mod.executeCapability(ctx(tA), "finanzas.apertura.revertir", { importacionId: corrida?.id ?? randomUUID() });
    expect(r).toMatchObject({ ok: true, data: { revertida: false, bloqueos: [{ motivo: "modificado_despues" }] } });
    expect(await e.admin.documentoEmitido.count({ where: { tenantId: tA } })).toBe(3);
  });

  it("revierte una carga intacta: borra documentos y saldos", async () => {
    const entradaB = { saldos: [{ banco: "Santander", numeroVisible: "001", moneda: "CLP", saldo: 700 }], documentos: [doc(20)], folios: [{ tipoDte: 33, ultimoFolio: 50 }] };
    const ap = await mod.executeCapability(ctx(tB), "finanzas.apertura.importar", { fechaCorte: "2026-10-31", entrada: entradaB });
    const id = (ap as { data: { importacionId: string } }).data.importacionId;
    expect((await e.admin.dteFolio.findFirst({ where: { tenantId: tB } }))?.folioActual).toBe(101);
    // Un destinatario guardado sobre el documento importado no debe impedir la reversión (FK RESTRICT).
    const docB = await e.admin.documentoEmitido.findFirst({ where: { tenantId: tB } });
    await e.admin.documentoEmitidoDestinatario.create({
      data: { tenantId: tB, documentoId: docB?.id ?? "", orden: 0, tipo: "PARA", email: "destino@prueba.cl", origen: "manual" },
    });
    const r = await mod.executeCapability(ctx(tB), "finanzas.apertura.revertir", { importacionId: id });
    expect(r).toMatchObject({ ok: true, data: { revertida: true } });
    expect(await e.admin.documentoEmitidoDestinatario.count({ where: { tenantId: tB } })).toBe(0);
    expect(await e.admin.documentoEmitido.count({ where: { tenantId: tB } })).toBe(0);
    expect(await e.admin.movimientoBancario.count({ where: { tenantId: tB } })).toBe(0);
  });
});
