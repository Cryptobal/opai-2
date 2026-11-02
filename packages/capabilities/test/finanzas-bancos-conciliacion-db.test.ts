// C2–C5 · bancos: conciliación, dedupe de cartola y RLS (CAR-97, review #211).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { claveDedupe } from "@opai/domain";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("Finanzas · bancos (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let tenantB = "";
  let cuentaId = "";
  let clienteId = "";
  let documentoId = "";
  const usuarioId = randomUUID();
  const medidor = { registrar: async () => undefined };

  const ctx = (tid = tenantId) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@bancos.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor,
    });

  const dato = async <T>(
    id: string,
    input: Record<string, unknown>,
    opts?: { dryRun?: boolean },
    tid?: string,
  ): Promise<T> => {
    const r = await mod.executeCapability(ctx(tid), id, input, opts);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };

  async function movimiento(monto: number, clave: string) {
    return e.admin.movimientoBancario.create({
      data: {
        tenantId,
        cuentaId,
        fecha: new Date("2026-10-29T12:00:00.000Z"),
        monto: BigInt(monto),
        glosa: "Transferencia recibida",
        claveDedupe: clave,
        estado: "pendiente",
        origen: "cartola",
      },
    });
  }

  beforeAll(async () => {
    process.env.SII_ADAPTADOR = "simulado";
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `bco-${randomUUID().slice(0, 8)}`, nombre: "Bancos Test SpA", vertical: "seguridad" },
      })
    ).id;
    tenantB = (
      await e.admin.tenant.create({
        data: { slug: `bcob-${randomUUID().slice(0, 8)}`, nombre: "Otra Banca SpA", vertical: "seguridad" },
      })
    ).id;
    clienteId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente", rut: "76111222-8" } })).id;
    await dato("finanzas.dte_config.actualizar", { ambiente: "certificacion", rutEmisor: "76111222-8" });
    await dato("finanzas.folios.cargar_caf", {
      tipoDte: 33,
      folioDesde: 7000,
      folioHasta: 7020,
      cafVenceEn: "2027-12-31",
    });
    const borrador = await dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: clienteId,
      tipoDte: 33,
      lineas: [{ glosa: "Factura conciliación", monto: 100_000 }],
    });
    documentoId = borrador.id;
    await dato("finanzas.ventas.emitir", { documentoId });
    cuentaId = (
      await dato<{ id: string }>("finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "1234567890" })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("C2 · la segunda confirmación del mismo movimiento responde CONFLICT", async () => {
    const mov = await movimiento(100_000, `c2-${randomUUID()}`);
    const enlace = { tipo: "documento_emitido" as const, id: documentoId, monto: 100_000 };
    await dato("finanzas.conciliaciones.confirmar", { movimientoId: mov.id, enlaces: [enlace] });
    const dup = await mod.executeCapability(ctx(), "finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [enlace],
    });
    expect(dup).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("C3 · deshacer recalcula montoCobrado desde conciliaciones activas", async () => {
    const mov = await movimiento(100_000, `c3-${randomUUID()}`);
    await dato("finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [{ tipo: "documento_emitido", id: documentoId, monto: 100_000 }],
    });
    let doc = await e.admin.documentoEmitido.findFirst({ where: { id: documentoId } });
    expect(doc?.montoCobrado).toBe(100_000);
    await dato("finanzas.conciliaciones.deshacer", { movimientoId: mov.id, motivo: "Prueba de reversión" });
    doc = await e.admin.documentoEmitido.findFirst({ where: { id: documentoId } });
    expect(doc?.montoCobrado).toBe(0);
    expect(doc?.estadoCobro).toBe("pendiente");
  });

  it("C4 · importa dos transferencias iguales y reimportar no duplica", async () => {
    const base = claveDedupe({
      fecha: "2026-10-29",
      monto: 7777,
      glosa: "Abono doble",
      referencia: "X1",
    });
    const csv = `fecha,monto,glosa,referencia\n29/10/2026,7777,Abono doble,X1\n29/10/2026,7777,Abono doble,X1\n`;
    const b64 = Buffer.from(csv, "utf8").toString("base64");
    const key1 = `cartola-${randomUUID()}`;
    const r1 = await dato<{ aplicados: number; duplicados: number }>("finanzas.cartolas.importar", {
      cuentaId,
      formato: "generico",
      contenidoBase64: b64,
      mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa", referencia: "referencia" },
      idempotencyKey: key1,
    });
    expect(r1.aplicados).toBe(2);
    expect(r1.duplicados).toBe(0);
    const count1 = await e.admin.movimientoBancario.count({
      where: { tenantId, cuentaId, claveDedupe: { startsWith: base } },
    });
    expect(count1).toBe(2);
    const r2 = await dato<{ aplicados: number; duplicados: number }>("finanzas.cartolas.importar", {
      cuentaId,
      formato: "generico",
      contenidoBase64: b64,
      mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa", referencia: "referencia" },
      idempotencyKey: `cartola-${randomUUID()}`,
    });
    expect(r2.aplicados).toBe(0);
    expect(r2.duplicados).toBe(2);
    const count2 = await e.admin.movimientoBancario.count({
      where: { tenantId, cuentaId, claveDedupe: { startsWith: base } },
    });
    expect(count2).toBe(2);
  });

  it("C5 · no concilia un documento de otro tenant (RLS)", async () => {
    const cuentaB = (await e.admin.cuenta.create({ data: { tenantId: tenantB, nombre: "Cliente B", rut: "77999999-9" } }))
      .id;
    const docB = (
      await e.admin.documentoEmitido.create({
        data: {
          tenantId: tenantB,
          cuentaId: cuentaB,
          tipoDte: 33,
          folio: 1,
          fechaEmision: new Date("2026-11-01"),
          montoTotal: 50_000,
          montoNeto: 42_000,
          montoIva: 8000,
          estadoDte: "aceptado",
        },
      })
    ).id;
    const mov = await movimiento(50_000, `rls-${randomUUID()}`);
    const r = await mod.executeCapability(ctx(tenantId), "finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [{ tipo: "documento_emitido", id: docB, monto: 50_000 }],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const doc = await e.admin.documentoEmitido.findFirst({ where: { id: docB } });
    expect(doc?.montoCobrado).toBe(0);
  });

  it("Paridad 1 · saldo sugerido suma cuentas activas y null sin saldo en cartola CSV", async () => {
    const cuenta2 = (
      await dato<{ id: string }>("finanzas.bancos.guardar", {
        banco: "BCI",
        numeroVisible: "9876543210",
      })
    ).id;
    await e.admin.movimientoBancario.create({
      data: {
        tenantId,
        cuentaId,
        fecha: new Date("2026-10-28T00:00:00Z"),
        monto: BigInt(1),
        glosa: "Saldo A",
        claveDedupe: `saldo-a-${randomUUID()}`,
        saldoDespues: BigInt(1_000_000),
        estado: "pendiente",
        origen: "cartola",
      },
    });
    await e.admin.movimientoBancario.create({
      data: {
        tenantId,
        cuentaId: cuenta2,
        fecha: new Date("2026-10-29T00:00:00Z"),
        monto: BigInt(1),
        glosa: "Saldo B",
        claveDedupe: `saldo-b-${randomUUID()}`,
        saldoDespues: BigInt(250_000),
        estado: "pendiente",
        origen: "cartola",
      },
    });
    const sugerido = await dato<{ saldo: number | null }>("finanzas.bancos.saldo_sugerido", {
      semana: "2026-10-26",
    });
    expect(sugerido.saldo).toBe(1_250_000);

    const csv = `fecha,monto,glosa\n30/10/2026,100,Abono sin saldo\n`;
    await dato("finanzas.cartolas.importar", {
      cuentaId,
      formato: "generico",
      contenidoBase64: Buffer.from(csv, "utf8").toString("base64"),
      mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa" },
      idempotencyKey: `cartola-${randomUUID()}`,
    });
    const soloCsv = await dato<{ saldo: number | null }>("finanzas.bancos.saldo_sugerido", {
      semana: "2026-10-26",
      cuentaId,
    });
    expect(soloCsv.saldo).toBeNull();
  });

  it("Paridad 2 · cobro manual crea movimiento deshacible y suma en cobros activos", async () => {
    const r = await dato<{ movimientoId: string; montoCobrado: number }>("finanzas.cobros.manual", {
      documentoId,
      monto: 40_000,
    });
    expect(r.montoCobrado).toBe(40_000);
    let doc = await e.admin.documentoEmitido.findFirst({ where: { id: documentoId } });
    expect(doc?.estadoCobro).toBe("pagada_parcial");
    await dato("finanzas.conciliaciones.deshacer", { movimientoId: r.movimientoId, motivo: "Revertir cobro manual" });
    doc = await e.admin.documentoEmitido.findFirst({ where: { id: documentoId } });
    expect(doc?.montoCobrado).toBe(0);
  });

  it("Paridad 3 · derivadas banco filtra por semana y expone cobro en fila del cliente", async () => {
    await e.admin.flujoFila.create({
      data: {
        tenantId,
        seccion: "ingreso",
        etiqueta: "Cliente",
        vinculo: null,
        arrastre: true,
        orden: 99,
        activa: true,
      },
    });
    const mov = await movimiento(50_000, `par3-${randomUUID()}`);
    await dato("finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [{ tipo: "documento_emitido", id: documentoId, monto: 50_000 }],
    });
    const semanaMov = "2026-10-26";
    const otraSemana = "2026-11-03";
    const derivadas = await dato<{
      fuentes: { id: string; celdas: { semana: string; monto: number }[] }[];
    }>("finanzas.derivadas.listar", { semana: semanaMov });
    const banco = derivadas.fuentes.find((f) => f.id === "banco");
    expect(banco?.celdas.some((c) => c.semana === semanaMov && c.monto === 50_000)).toBe(true);
    const vacio = await dato<{ fuentes: { id: string; celdas: unknown[] }[] }>("finanzas.derivadas.listar", {
      semana: otraSemana,
    });
    expect(vacio.fuentes.find((f) => f.id === "banco")?.celdas).toHaveLength(0);
  });
});
