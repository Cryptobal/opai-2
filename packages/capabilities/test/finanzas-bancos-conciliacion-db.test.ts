// C2–C5 · bancos: conciliación, dedupe de cartola y RLS (CAR-97, review #211).
import { randomUUID, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { claveDedupeCartola } from "@opai/domain";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { cafXmlSintetico } from "./finanzas-caf-fixture";

describe.skipIf(omitirSuiteDb())("Finanzas · bancos (db)", () => {
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

  async function emitirFactura(lineaMonto: number, glosa: string) {
    const borrador = await dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: clienteId,
      tipoDte: 33,
      lineas: [{ glosa, monto: lineaMonto }],
    });
    await dato("finanzas.ventas.emitir", { documentoId: borrador.id });
    const doc = await e.admin.documentoEmitido.findFirst({ where: { id: borrador.id } });
    if (!doc) throw new Error("documento no emitido");
    return { id: doc.id, montoTotal: doc.montoTotal };
  }

  beforeAll(async () => {
    process.env.SII_ADAPTADOR = "simulado";
    // T3: la carrera de 8 cobros necesita ≥ 8 conexiones; se fija el pool para que no dependa del defecto.
    process.env.DATABASE_POOL_MAX = "16";
    process.env.OPAI_SECRETS_KEY = randomBytes(32).toString("base64");
    process.env.OPAI_SECRETS_KEY_VERSION = "99";
    delete process.env.OPAI_SECRETS_KEY_ANTERIOR;
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
      cafXml: cafXmlSintetico({ folioDesde: 7000, folioHasta: 7020 }),
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
    if (tenantId) {
      const where = { tenantId: { in: [tenantId, tenantB].filter(Boolean) } };
      await e?.admin.secreto.deleteMany({ where }).catch(() => undefined);
      await e?.admin.claveTenant.deleteMany({ where }).catch(() => undefined);
    }
    await e?.cerrar();
  });

  it("C2 · la segunda confirmación del mismo movimiento responde CONFLICT", async () => {
    const docC2 = await emitirFactura(100_000, "Factura C2");
    const mov = await movimiento(docC2.montoTotal, `c2-${randomUUID()}`);
    const enlace = { tipo: "documento_emitido" as const, id: docC2.id, monto: docC2.montoTotal };
    await dato("finanzas.conciliaciones.confirmar", { movimientoId: mov.id, enlaces: [enlace] });
    const dup = await mod.executeCapability(ctx(), "finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [enlace],
    });
    expect(dup).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("C3 · deshacer recalcula montoCobrado desde conciliaciones activas", async () => {
    const docC3 = await emitirFactura(88_000, "Factura C3");
    const mov = await movimiento(docC3.montoTotal, `c3-${randomUUID()}`);
    await dato("finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [{ tipo: "documento_emitido", id: docC3.id, monto: docC3.montoTotal }],
    });
    let doc = await e.admin.documentoEmitido.findFirst({ where: { id: docC3.id } });
    expect(doc?.montoCobrado).toBe(docC3.montoTotal);
    await dato("finanzas.conciliaciones.deshacer", { movimientoId: mov.id, motivo: "Prueba de reversión" });
    doc = await e.admin.documentoEmitido.findFirst({ where: { id: docC3.id } });
    expect(doc?.montoCobrado).toBe(0);
    expect(doc?.estadoCobro).toBe("pendiente");
  });

  it("C4 · importa dos transferencias iguales y reimportar no duplica", async () => {
    const base = claveDedupeCartola({
      fecha: "2026-10-29",
      monto: 7777,
      glosa: "Abono doble",
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

  it("C6 · vista previa dryRun marca duplicados reales", async () => {
    const base = claveDedupeCartola({ fecha: "2026-10-30", monto: 1111, glosa: "Preview dup" });
    const csv = `fecha,monto,glosa\n30/10/2026,1111,Preview dup\n`;
    const b64 = Buffer.from(csv, "utf8").toString("base64");
    await dato("finanzas.cartolas.importar", {
      cuentaId,
      formato: "generico",
      contenidoBase64: b64,
      mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa" },
      idempotencyKey: `cartola-${randomUUID()}`,
    });
    const prev = await dato<{ filas: { estado: string }[]; duplicados: number; aplicados: number }>(
      "finanzas.cartolas.importar",
      {
        cuentaId,
        formato: "generico",
        contenidoBase64: b64,
        mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa" },
        idempotencyKey: `cartola-${randomUUID()}`,
      },
      { dryRun: true },
    );
    expect(prev.aplicados).toBe(0);
    expect(prev.duplicados).toBe(1);
    expect(prev.filas.filter((f) => f.estado === "duplicada")).toHaveLength(1);
    expect(await e.admin.movimientoBancario.count({ where: { tenantId, cuentaId, claveDedupe: base } })).toBe(1);
  });

  it("C6 · reimportar CSV sin saldo no inserta movimientos", async () => {
    const base = claveDedupeCartola({
      fecha: "2026-10-30",
      monto: 3333,
      glosa: "Sin saldo csv",
    });
    const csv = `fecha,monto,glosa,referencia\n30/10/2026,3333,Sin saldo csv,S1\n`;
    const b64 = Buffer.from(csv, "utf8").toString("base64");
    await dato("finanzas.cartolas.importar", {
      cuentaId,
      formato: "generico",
      contenidoBase64: b64,
      mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa", referencia: "referencia" },
      idempotencyKey: `cartola-${randomUUID()}`,
    });
    const r2 = await dato<{ aplicados: number; duplicados: number }>("finanzas.cartolas.importar", {
      cuentaId,
      formato: "generico",
      contenidoBase64: b64,
      mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa", referencia: "referencia" },
      idempotencyKey: `cartola-${randomUUID()}`,
    });
    expect(r2.aplicados).toBe(0);
    expect(r2.duplicados).toBe(1);
    expect(await e.admin.movimientoBancario.count({ where: { tenantId, cuentaId, claveDedupe: base } })).toBe(1);
  });

  it("C6 · tres filas iguales con dos guardadas inserta una", async () => {
    const base = claveDedupeCartola({
      fecha: "2026-10-31",
      monto: 4444,
      glosa: "Transferencia repetida",
    });
    const fila = `31/10/2026,4444,Transferencia repetida\n`;
    const tres = `fecha,monto,glosa\n${fila}${fila}${fila}`;
    await dato("finanzas.cartolas.importar", {
      cuentaId,
      formato: "generico",
      contenidoBase64: Buffer.from(`${`fecha,monto,glosa\n${fila}${fila}`}`, "utf8").toString("base64"),
      mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa" },
      idempotencyKey: `cartola-${randomUUID()}`,
    });
    const r = await dato<{ aplicados: number; duplicados: number }>("finanzas.cartolas.importar", {
      cuentaId,
      formato: "generico",
      contenidoBase64: Buffer.from(tres, "utf8").toString("base64"),
      mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa" },
      idempotencyKey: `cartola-${randomUUID()}`,
    });
    expect(r.aplicados).toBe(1);
    expect(r.duplicados).toBe(2);
    expect(
      await e.admin.movimientoBancario.count({ where: { tenantId, cuentaId, claveDedupe: { startsWith: base } } }),
    ).toBe(3);
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

  it("Paridad 1 · deshacer cobro manual deja el movimiento ignorado y fuera de sugerir y real", async () => {
    const borrador = await dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: clienteId,
      tipoDte: 33,
      lineas: [{ glosa: "Factura P1", monto: 60_000 }],
    });
    await dato("finanzas.ventas.emitir", { documentoId: borrador.id });
    const r = await dato<{ movimientoId: string }>("finanzas.cobros.manual", {
      documentoId: borrador.id,
      cuentaId,
      monto: 60_000,
    });
    await dato("finanzas.conciliaciones.deshacer", { movimientoId: r.movimientoId, motivo: "Revertir cobro manual P1" });
    const mov = await e.admin.movimientoBancario.findFirst({ where: { id: r.movimientoId } });
    expect(mov?.estado).toBe("ignorado");
    const sug = await dato<{ sugerencias: unknown[] }>("finanzas.conciliaciones.sugerir", {
      movimientoId: r.movimientoId,
    });
    expect(sug.sugerencias).toHaveLength(0);
    const derivadas = await dato<{ fuentes: { id: string; celdas: { id: string }[] }[] }>("finanzas.derivadas.listar", {
      semana: "2026-10-26",
    });
    const ids = derivadas.fuentes.find((f) => f.id === "banco")?.celdas.map((c) => c.id) ?? [];
    expect(ids).not.toContain(r.movimientoId);
  });

  it("Paridad 2 · sugerir excluye los mismos documentos que rechaza C5", async () => {
    const doc56 = (
      await e.admin.documentoEmitido.create({
        data: {
          tenantId,
          cuentaId: clienteId,
          tipoDte: 56,
          folio: 9001,
          fechaEmision: new Date("2026-10-29"),
          montoTotal: 55_555,
          montoNeto: 46_000,
          montoIva: 9555,
          montoCobrado: 0,
          estadoDte: "aceptado",
        },
      })
    ).id;
    const mov56 = await movimiento(55_555, `p2-56-${randomUUID()}`);
    const sug56 = await dato<{ sugerencias: { documentoId: string }[] }>("finanzas.conciliaciones.sugerir", {
      movimientoId: mov56.id,
    });
    expect(sug56.sugerencias.some((s) => s.documentoId === doc56)).toBe(false);

    const docOk = await emitirFactura(77_000, "Factura P2 sugerir");
    const movOk = await movimiento(docOk.montoTotal, `p2-ok-${randomUUID()}`);
    const sugOk = await dato<{ sugerencias: { documentoId: string }[] }>("finanzas.conciliaciones.sugerir", {
      movimientoId: movOk.id,
    });
    expect(sugOk.sugerencias.some((s) => s.documentoId === docOk.id)).toBe(true);
  });

  it("Paridad 3 · confirmar compra exige movimiento negativo", async () => {
    const proveedorId = (
      await dato<{ id: string }>("finanzas.proveedores.crear", {
        rut: "77.888.777-0",
        razonSocial: "Proveedor P3 SpA",
        plazoPagoDias: 30,
      })
    ).id;
    const compra = await dato<{ id: string }>("finanzas.compras.registrar", {
      proveedorId,
      tipoDte: 33,
      folio: 8001,
      fechaEmision: "2026-10-28",
      fechaRecepcion: "2026-10-29",
      montoNeto: 80_000,
      montoIva: 15_200,
    });
    const movCargo = await e.admin.movimientoBancario.create({
      data: {
        tenantId,
        cuentaId,
        fecha: new Date("2026-10-29T12:00:00.000Z"),
        monto: BigInt(-95_200),
        glosa: "Pago proveedor",
        claveDedupe: `p3-neg-${randomUUID()}`,
        estado: "pendiente",
        origen: "cartola",
      },
    });
    const ok = await mod.executeCapability(ctx(), "finanzas.conciliaciones.confirmar", {
      movimientoId: movCargo.id,
      enlaces: [{ tipo: "documento_recibido", id: compra.id, monto: 95_200 }],
    });
    expect(ok.ok).toBe(true);
    const movAbono = await movimiento(95_200, `p3-pos-${randomUUID()}`);
    const mal = await mod.executeCapability(ctx(), "finanzas.conciliaciones.confirmar", {
      movimientoId: movAbono.id,
      enlaces: [{ tipo: "documento_recibido", id: compra.id, monto: 95_200 }],
    });
    expect(mal).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("Paridad 4 · la cartola completa entra a lo real; lo no conciliado va a «Sin clasificar», no a Cobros", async () => {
    const filaCobros = (
      await e.admin.flujoFila.create({
        data: {
          tenantId,
          seccion: "ingreso",
          etiqueta: "Cobros",
          vinculo: null,
          arrastre: true,
          orden: 98,
          activa: true,
        },
      })
    ).id;
    await e.admin.flujoFila.create({
      data: {
        tenantId,
        seccion: "ingreso",
        etiqueta: "Cliente visible",
        vinculo: null,
        arrastre: true,
        orden: 99,
        activa: true,
      },
    });
    const cuentaSinNombre = (await e.admin.cuenta.create({ data: { tenantId, nombre: "", rut: "77000001-9" } })).id;
    const docSinFila = (
      await e.admin.documentoEmitido.create({
        data: {
          tenantId,
          cuentaId: cuentaSinNombre,
          tipoDte: 33,
          folio: 9002,
          fechaEmision: new Date("2026-10-29"),
          montoTotal: 33_333,
          montoNeto: 28_000,
          montoIva: 5333,
          montoCobrado: 0,
          estadoDte: "aceptado",
        },
      })
    ).id;
    const movConc = await movimiento(33_333, `p4-conc-${randomUUID()}`);
    await dato("finanzas.conciliaciones.confirmar", {
      movimientoId: movConc.id,
      enlaces: [{ tipo: "documento_emitido", id: docSinFila, monto: 33_333 }],
    });
    const movAuth = await e.admin.movimientoBancario.create({
      data: {
        tenantId,
        cuentaId,
        fecha: new Date("2026-10-29T12:00:00.000Z"),
        monto: BigInt(20_000),
        glosa: "REMUNERACION PREVIRED",
        claveDedupe: `p4-auth-${randomUUID()}`,
        estado: "por_autorizar",
        origen: "cartola",
      },
    });
    const semana = "2026-10-26";
    const derivadas = await dato<{
      fuentes: { id: string; celdas: { filaId: string; monto: number; id: string }[] }[];
    }>("finanzas.derivadas.listar", { semana });
    const banco = derivadas.fuentes.find((f) => f.id === "banco")?.celdas ?? [];
    expect(banco.some((c) => c.id === movConc.id && c.filaId === filaCobros && c.monto === 33_333)).toBe(true);
    expect(banco.some((c) => c.id === movAuth.id && c.filaId !== filaCobros)).toBe(true);
  });

  it("Paridad 5 · saldo sugerido avisa cuentas sin saldo en cartola", async () => {
    const semana = "2026-11-03";
    const cuentaSaldo = (
      await dato<{ id: string }>("finanzas.bancos.guardar", {
        banco: "Saldo P5",
        numeroVisible: "1111111111",
      })
    ).id;
    const cuentaSinSaldo = (
      await dato<{ id: string }>("finanzas.bancos.guardar", {
        banco: "Sin saldo P5",
        numeroVisible: "2222222222",
      })
    ).id;
    await e.admin.movimientoBancario.create({
      data: {
        tenantId,
        cuentaId: cuentaSaldo,
        fecha: new Date("2026-11-05T00:00:00Z"),
        monto: BigInt(1),
        glosa: "Cierre saldo P5",
        claveDedupe: `p5-saldo-${randomUUID()}`,
        saldoDespues: BigInt(1_000_000),
        estado: "pendiente",
        origen: "cartola",
      },
    });
    await e.admin.movimientoBancario.create({
      data: {
        tenantId,
        cuentaId: cuentaSinSaldo,
        fecha: new Date("2026-11-05T00:00:00Z"),
        monto: BigInt(1),
        glosa: "Mov sin saldo P5",
        claveDedupe: `p5-nosaldo-${randomUUID()}`,
        saldoDespues: null,
        estado: "pendiente",
        origen: "cartola",
      },
    });
    const sugerido = await dato<{
      saldo: number | null;
      aviso: string | null;
      cuentasSinSaldo: { cuentaId: string; banco: string }[];
    }>("finanzas.bancos.saldo_sugerido", { semana });
    expect(sugerido.saldo).toBe(1_000_000);
    expect(sugerido.cuentasSinSaldo.some((c) => c.cuentaId === cuentaSinSaldo)).toBe(true);
    expect(sugerido.aviso).toMatch(/Sin saldo en cartola/);
  });

  it("Paridad · sin fila «Cobros» el cobro va a «Sin clasificar» y la lectura no crea filas", async () => {
    await e.admin.flujoFila.deleteMany({ where: { tenantId, etiqueta: "Cobros" } });
    const cuentaSinNombre = (await e.admin.cuenta.create({ data: { tenantId, nombre: "", rut: "77000002-0" } })).id;
    const doc = (
      await e.admin.documentoEmitido.create({
        data: {
          tenantId,
          cuentaId: cuentaSinNombre,
          tipoDte: 33,
          folio: 9010,
          fechaEmision: new Date("2026-10-29"),
          montoTotal: 12_345,
          montoNeto: 10_000,
          montoIva: 2345,
          montoCobrado: 0,
          estadoDte: "aceptado",
        },
      })
    ).id;
    const mov = await movimiento(12_345, `cobros-fila-${randomUUID()}`);
    await dato("finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [{ tipo: "documento_emitido", id: doc, monto: 12_345 }],
    });
    expect(await e.admin.flujoFila.count({ where: { tenantId, etiqueta: "Cobros" } })).toBe(0);
    const derivadas = await dato<{
      fuentes: { id: string; celdas: { filaId: string; id: string }[] }[];
    }>("finanzas.derivadas.listar", { semana: "2026-10-26" });
    const celda = derivadas.fuentes.find((f) => f.id === "banco")?.celdas.find((c) => c.id === mov.id);
    expect(celda?.filaId).toBe("00000000-0000-4000-8000-000000000001");
    expect(await e.admin.flujoFila.count({ where: { tenantId, etiqueta: "Cobros" } })).toBe(0);
  });

  it("C7b · no confirma un movimiento ignorado tras deshacer cobro manual", async () => {
    const docC7 = await emitirFactura(45_000, "Factura C7b");
    const manual = await dato<{ movimientoId: string }>("finanzas.cobros.manual", {
      documentoId: docC7.id,
      cuentaId,
      monto: docC7.montoTotal,
    });
    await dato("finanzas.conciliaciones.deshacer", {
      movimientoId: manual.movimientoId,
      motivo: "Revertir para C7b",
    });
    const r = await mod.executeCapability(ctx(), "finanzas.conciliaciones.confirmar", {
      movimientoId: manual.movimientoId,
      enlaces: [{ tipo: "documento_emitido", id: docC7.id, monto: docC7.montoTotal }],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const doc = await e.admin.documentoEmitido.findFirst({ where: { id: docC7.id } });
    expect(doc?.montoCobrado).toBe(0);
    const mov = await e.admin.movimientoBancario.findFirst({ where: { id: manual.movimientoId } });
    expect(mov?.estado).toBe("ignorado");
  });

  it("N:M · el servidor rechaza un monto sobre lo pendiente y el mismo documento repetido", async () => {
    const doc = await emitirFactura(50_000, "Factura tope");
    const mov = await movimiento(doc.montoTotal + 10_000, `tope-${randomUUID()}`);
    const sobre = await mod.executeCapability(ctx(), "finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [{ tipo: "documento_emitido", id: doc.id, monto: doc.montoTotal + 10_000 }],
    });
    expect(sobre).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const repetido = await mod.executeCapability(ctx(), "finanzas.conciliaciones.confirmar", {
      movimientoId: mov.id,
      enlaces: [
        { tipo: "documento_emitido", id: doc.id, monto: doc.montoTotal },
        { tipo: "documento_emitido", id: doc.id, monto: 10_000 },
      ],
    });
    expect(repetido).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect((await e.admin.movimientoBancario.findUniqueOrThrow({ where: { id: mov.id } })).estado).toBe("pendiente");
  });

  it("N:M · cobro manual no puede superar lo pendiente y otra empresa no ve el documento", async () => {
    const doc = await emitirFactura(40_000, "Factura cobro");
    const sobre = await mod.executeCapability(ctx(), "finanzas.cobros.manual", {
      documentoId: doc.id,
      monto: doc.montoTotal + 1,
      cuentaId,
    });
    expect(sobre).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    await dato("finanzas.cobros.manual", { documentoId: doc.id, monto: doc.montoTotal - 1_000, cuentaId });
    const resto = await mod.executeCapability(ctx(), "finanzas.cobros.manual", { documentoId: doc.id, monto: 2_000, cuentaId });
    expect(resto).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const cuentaB = await e.admin.cuentaBancaria.create({
      data: { tenantId: tenantB, banco: "Chile", numeroVisible: "9990001", moneda: "CLP" },
    });
    const ajena = await mod.executeCapability(ctx(tenantB), "finanzas.cobros.manual", { documentoId: doc.id, monto: 1_000, cuentaId: cuentaB.id });
    expect(ajena).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE", message: "El documento no existe." } });
  });

  it("N:M · varios cobros simultáneos sobre el mismo documento no superan su total", async () => {
    const doc = await emitirFactura(60_000, "Factura carrera");
    const parte = Math.ceil(doc.montoTotal * 0.3);
    const rs = await Promise.all(
      Array.from({ length: 8 }, () =>
        mod.executeCapability(ctx(), "finanzas.cobros.manual", { documentoId: doc.id, monto: parte, cuentaId }),
      ),
    );
    // 60.000 neto = 71.400 con IVA; cada cobro es 21.420: caben exactamente 3 (64.260); el 4.º (85.680) no.
    expect(doc.montoTotal).toBe(71_400);
    expect(rs.filter((r) => r.ok)).toHaveLength(3);
    const conciliado = await e.admin.conciliacionBanco.aggregate({
      where: { enlaceId: doc.id, activa: true },
      _sum: { monto: true },
    });
    expect(Number(conciliado._sum.monto)).toBe(64_260);
  });

  it("T2 · dos confirmaciones simultáneas sobre el mismo documento: solo cabe una", async () => {
    const doc = await emitirFactura(50_000, "Factura carrera confirmar"); // 59.500 con IVA
    const monto = 40_000;
    const [m1, m2] = await Promise.all([movimiento(monto, `t2a-${randomUUID()}`), movimiento(monto, `t2b-${randomUUID()}`)]);
    const confirmar = (id: string) =>
      mod.executeCapability(ctx(), "finanzas.conciliaciones.confirmar", { movimientoId: id, enlaces: [{ tipo: "documento_emitido", id: doc.id, monto }] });
    const rs = await Promise.all([confirmar(m1.id), confirmar(m2.id)]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect(rs.find((r) => !r.ok)).toMatchObject({ error: { code: "UNPROCESSABLE" } });
    const conciliado = await e.admin.conciliacionBanco.aggregate({ where: { enlaceId: doc.id, activa: true }, _sum: { monto: true } });
    expect(Number(conciliado._sum.monto)).toBe(monto);
  });

  it("T2 · confirmar y cobro manual simultáneos sobre el mismo documento: solo cabe uno", async () => {
    const doc = await emitirFactura(50_000, "Factura carrera cruzada"); // 59.500 con IVA
    const monto = 40_000;
    const mov = await movimiento(monto, `t2c-${randomUUID()}`);
    const rs = await Promise.all([
      mod.executeCapability(ctx(), "finanzas.conciliaciones.confirmar", { movimientoId: mov.id, enlaces: [{ tipo: "documento_emitido", id: doc.id, monto }] }),
      mod.executeCapability(ctx(), "finanzas.cobros.manual", { documentoId: doc.id, monto, cuentaId }),
    ]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    const conciliado = await e.admin.conciliacionBanco.aggregate({ where: { enlaceId: doc.id, activa: true }, _sum: { monto: true } });
    expect(Number(conciliado._sum.monto)).toBe(monto);
    expect((await e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: doc.id } })).montoCobrado).toBe(monto);
  });
});
