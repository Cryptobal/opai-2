// Regla de Carlos (4-nov-2026): pendiente de una factura = monto − notas de crédito parciales (61) − cobrado.
// La nota de débito (56) no suma deuda. Con Postgres real: topes, cobro manual, sugerencias, cobranza y aislamiento.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { cafXmlSintetico } from "./finanzas-caf-fixture";
import { registrarModuloFinanzas } from "./finanzas-modulo";

type Doc = { id: string; montoTotal: number };

describe.skipIf(omitirSuiteDb())("Finanzas · pendiente con notas de crédito parciales (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let tenantB = "";
  let clienteId = "";
  let cuentaId = "";
  const usuarioId = randomUUID();

  const ctx = (tid = tenantId) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@nc.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const dato = async <T>(id: string, input: Record<string, unknown>, tid?: string): Promise<T> => {
    const r = await mod.executeCapability(ctx(tid), id, input);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };
  const intentar = (id: string, input: Record<string, unknown>, opts?: { dryRun?: boolean }) =>
    mod.executeCapability(ctx(), id, input, opts);

  async function factura(monto: number, glosa: string): Promise<Doc> {
    const b = await dato<{ id: string }>("finanzas.ventas.crear_borrador", { cuentaId: clienteId, tipoDte: 33, lineas: [{ glosa, monto }] });
    await dato("finanzas.ventas.emitir", { documentoId: b.id });
    await dato("finanzas.ventas.enviar_sii", { documentoId: b.id });
    const d = await e.admin.documentoEmitido.findFirstOrThrow({ where: { id: b.id } });
    return { id: d.id, montoTotal: d.montoTotal };
  }
  /** Emite una NC parcial real y devuelve su monto total. */
  async function ncParcial(doc: Doc, monto: number): Promise<number> {
    await dato("finanzas.ventas.emitir_nota_credito", { documentoReferenciaId: doc.id, monto, motivo: "Descuento parcial", codigoReferencia: 3 });
    const nc = await e.admin.documentoEmitido.findFirstOrThrow({ where: { tenantId, documentoReferenciaId: doc.id, tipoDte: 61 } });
    return nc.montoTotal;
  }
  const pendienteDe = async (id: string) => (await dato<{ montoPendiente: number; montoNotasCredito: number }>("finanzas.ventas.obtener", { documentoId: id }));
  const movimiento = (monto: number) =>
    e.admin.movimientoBancario.create({
      data: { tenantId, cuentaId, fecha: new Date(), monto: BigInt(monto), glosa: "Transferencia recibida", claveDedupe: `nc-${randomUUID()}`, estado: "pendiente", origen: "cartola" },
    });

  beforeAll(async () => {
    process.env.SII_ADAPTADOR = "simulado";
    process.env.OPAI_SECRETS_KEY = randomBytes(32).toString("base64");
    process.env.OPAI_SECRETS_KEY_VERSION = "99";
    delete process.env.OPAI_SECRETS_KEY_ANTERIOR;
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    registrarModuloFinanzas(); // la cobranza lee los ajustes del módulo
    tenantId = (await e.admin.tenant.create({ data: { slug: `nc-${randomUUID().slice(0, 8)}`, nombre: "NC Test SpA", vertical: "seguridad" } })).id;
    tenantB = (await e.admin.tenant.create({ data: { slug: `ncb-${randomUUID().slice(0, 8)}`, nombre: "Otra NC SpA", vertical: "seguridad" } })).id;
    clienteId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente NC", rut: "76111222-8" } })).id;
    await dato("finanzas.dte_config.actualizar", { ambiente: "certificacion", rutEmisor: "76111222-8" });
    await dato("finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ folioDesde: 7100, folioHasta: 7140 }) });
    await dato("finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ tipoDte: 61, folioDesde: 7100, folioHasta: 7140 }) });
    cuentaId = (await dato<{ id: string }>("finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "5550001" })).id;
  });

  afterAll(async () => {
    const where = { tenantId: { in: [tenantId, tenantB].filter(Boolean) } };
    await e?.admin.secreto.deleteMany({ where }).catch(() => undefined);
    await e?.admin.claveTenant.deleteMany({ where }).catch(() => undefined);
    await e?.cerrar();
  });

  it("pendiente = monto − NC parcial, y la ficha lo informa", async () => {
    const doc = await factura(840_336, "Factura con NC");
    const nc = await ncParcial(doc, 200_000);
    expect(nc).toBeGreaterThan(0);
    expect(await pendienteDe(doc.id)).toMatchObject({ montoNotasCredito: nc, montoPendiente: doc.montoTotal - nc });
  });

  it("un abono mayor al pendiente se rechaza y uno igual salda la factura (cobro manual, también en vista previa)", async () => {
    const doc = await factura(500_000, "Cobro tras NC");
    const nc = await ncParcial(doc, 100_000);
    const pend = doc.montoTotal - nc;
    const sobre = { documentoId: doc.id, monto: pend + 1, cuentaId };
    expect(await intentar("finanzas.cobros.manual", sobre, { dryRun: true })).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await intentar("finanzas.cobros.manual", sobre)).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const exacto = await dato<{ estadoCobro: string; montoCobrado: number }>("finanzas.cobros.manual", { documentoId: doc.id, monto: pend, cuentaId });
    expect(exacto).toMatchObject({ estadoCobro: "pagada", montoCobrado: pend });
    expect((await pendienteDe(doc.id)).montoPendiente).toBe(0);
  });

  it("conciliar un abono mayor al pendiente se rechaza; igual al pendiente pasa", async () => {
    const doc = await factura(300_000, "Conciliar tras NC");
    const nc = await ncParcial(doc, 50_000);
    const pend = doc.montoTotal - nc;
    const mov = await movimiento(pend + 5_000);
    const r = await intentar("finanzas.conciliaciones.confirmar", { movimientoId: mov.id, enlaces: [{ tipo: "documento_emitido", id: doc.id, monto: pend + 5_000 }] });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const ok = await movimiento(pend);
    await dato("finanzas.conciliaciones.confirmar", { movimientoId: ok.id, enlaces: [{ tipo: "documento_emitido", id: doc.id, monto: pend }] });
    expect((await pendienteDe(doc.id)).montoPendiente).toBe(0);
  });

  it("el candidato de conciliación y la cobranza usan el pendiente con NC", async () => {
    const doc = await factura(250_000, "Candidato y aging");
    const nc = await ncParcial(doc, 60_000);
    const pend = doc.montoTotal - nc;
    await e.admin.documentoEmitido.update({ where: { id: doc.id }, data: { fechaVencimiento: new Date(Date.now() - 40 * 86_400_000) } });
    const mov = await movimiento(pend);
    const { sugerencias } = await dato<{ sugerencias: { documentoId: string; montoPendiente: number }[] }>("finanzas.conciliaciones.sugerir", { movimientoId: mov.id });
    expect(sugerencias.find((s) => s.documentoId === doc.id)).toMatchObject({ montoPendiente: pend });
    // Es la única factura vencida de la empresa: la deuda del cliente es su monto menos la NC, no el total.
    const resumen = await dato<{ totalVencido: number }>("finanzas.cobranza.resumen", {});
    expect(resumen.totalVencido).toBe(pend);
    expect(pend).toBeLessThan(doc.montoTotal);
  });

  it("una NC que solo corrige texto (CodRef 2), o sin código, no resta deuda; la que corrige montos (3) sí", async () => {
    const doc = await factura(150_000, "NC no monetaria");
    const base = { tenantId, cuentaId: clienteId, documentoReferenciaId: doc.id, tipoDte: 61, estadoDte: "aceptado", montoNeto: 40_000, montoIva: 7_600, montoTotal: 47_600 };
    await e.admin.documentoEmitido.create({ data: { ...base, codigoReferencia: 2 } });
    await e.admin.documentoEmitido.create({ data: { ...base, codigoReferencia: null } });
    expect(await pendienteDe(doc.id)).toMatchObject({ montoNotasCredito: 0, montoPendiente: doc.montoTotal });
    await e.admin.documentoEmitido.create({ data: { ...base, codigoReferencia: 3 } });
    expect(await pendienteDe(doc.id)).toMatchObject({ montoNotasCredito: 47_600, montoPendiente: doc.montoTotal - 47_600 });
  });

  it("la nota de débito, y una NC rechazada o en borrador, no cambian el pendiente", async () => {
    const doc = await factura(120_000, "Ni ND ni NC inválida");
    const base = { tenantId, cuentaId: clienteId, documentoReferenciaId: doc.id, montoNeto: 40_000, montoIva: 7_600, montoTotal: 47_600 };
    await e.admin.documentoEmitido.create({ data: { ...base, tipoDte: 56, estadoDte: "aceptado" } });
    await e.admin.documentoEmitido.create({ data: { ...base, tipoDte: 61, estadoDte: "rechazado" } });
    await e.admin.documentoEmitido.create({ data: { ...base, tipoDte: 61, estadoDte: "borrador" } });
    expect(await pendienteDe(doc.id)).toMatchObject({ montoNotasCredito: 0, montoPendiente: doc.montoTotal });
  });

  it("aislamiento: una NC de otra empresa no reduce el pendiente de esta", async () => {
    const doc = await factura(90_000, "Aislamiento NC");
    const cuentaB = await e.admin.cuenta.create({ data: { tenantId: tenantB, nombre: "Cliente B", rut: "77234567-8" } });
    await e.admin.documentoEmitido.create({
      data: { tenantId: tenantB, cuentaId: cuentaB.id, tipoDte: 61, estadoDte: "aceptado", documentoReferenciaId: doc.id, montoNeto: 50_000, montoTotal: 59_500 },
    }).then(() => "creada", () => "rechazada"); // el trigger «mismo_tenant» puede rechazar la referencia cruzada: aún mejor
    expect(await pendienteDe(doc.id)).toMatchObject({ montoNotasCredito: 0, montoPendiente: doc.montoTotal });
    const ajeno = await mod.executeCapability(ctx(tenantB), "finanzas.cobros.manual", { documentoId: doc.id, monto: 1_000, cuentaId });
    expect(ajeno).toMatchObject({ ok: false });
  });
});
