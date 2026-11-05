// CAR-193 · ADR-073: un solo criterio de semana para los ingresos futuros (fecha esperada de cobro), pendiente neto de
// NC parciales, ND y cedidas fuera, fecha editable por factura con vista previa y aislada por empresa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { FILA_COBROS_ESPERADOS } from "../../../modules/finanzas/capacidades/filas-virtuales";
import { hoyIso, lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const mas = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

type Item = { documentoEmitidoId: string | null; semanaCobro: string; monto: number; fechaEsperada: string | null; origenFecha: string | null };
type Planilla = { semanas: { semana: string; ingresos: number }[]; celdas: { filaId: string; semana: string; monto: number }[] };

describe.skipIf(omitirSuiteDb())("flujo · fecha esperada de cobro (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  let clienteA = "";
  let clientePromedio = "";
  const usuario = randomUUID();
  const lunes = lunesHoy();
  const hoy = hoyIso();

  const ctx = (tid: string) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@cobro.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const run = (tid: string, id: string, input: unknown, opts?: { dryRun?: boolean }) => mod.executeCapability(ctx(tid), id, input, opts);
  async function ok<T>(tid: string, id: string, input: unknown): Promise<T> {
    const r = await run(tid, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const proyeccion = async (tid = tenantA) => (await ok<{ items: Item[] }>(tid, "finanzas.ventas.proyeccion_flujo", { semanas: 20 })).items;
  let folio = 100;
  const factura = (tenantId: string, cuentaId: string, o: Record<string, unknown>) =>
    e.admin.documentoEmitido.create({
      // Exento: el total es el monto del documento (el CHECK pide neto + exento + IVA + otros = total).
      data: { tenantId, cuentaId, tipoDte: 33, folio: folio++, montoTotal: 100_000, montoExento: o.montoTotal ?? 100_000, estadoDte: "aceptado", ...o },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantA = (await e.admin.tenant.create({ data: { slug: `cobro-a-${randomUUID().slice(0, 8)}`, nombre: "A", vertical: "seguridad" } })).id;
    tenantB = (await e.admin.tenant.create({ data: { slug: `cobro-b-${randomUUID().slice(0, 8)}`, nombre: "B", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@cobro.test`, name: "u" } });
    clienteA = (await e.admin.cuenta.create({ data: { tenantId: tenantA, nombre: "Cliente A", rut: "76111111-1" } })).id;
    clientePromedio = (await e.admin.cuenta.create({ data: { tenantId: tenantA, nombre: "Cliente que paga a 20 días", rut: "76222222-2" } })).id;
    await ok(tenantA, "finanzas.ajustes.actualizar", { saldoInicial: 0, desde: mas(lunes, -28) });
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar();
  });

  it("lo vencido va a la semana en curso y lo futuro a la semana de su vencimiento", async () => {
    const vencida = await factura(tenantA, clienteA, { fechaEmision: fecha(mas(hoy, -90)), fechaVencimiento: fecha(mas(hoy, -30)) });
    const futura = await factura(tenantA, clienteA, { fechaEmision: fecha(hoy), fechaVencimiento: fecha(mas(lunes, 21)) });
    const items = await proyeccion();
    expect(items.find((i) => i.documentoEmitidoId === vencida.id)).toMatchObject({ semanaCobro: lunes, origenFecha: "vencimiento" });
    expect(items.find((i) => i.documentoEmitidoId === futura.id)).toMatchObject({ semanaCobro: mas(lunes, 21), monto: 100_000 });
  });

  it("pendiente = monto − NC parcial − cobrado; la ND no es deuda ni ingreso y la cedida no cuenta", async () => {
    const f = await factura(tenantA, clienteA, { fechaEmision: fecha(hoy), fechaVencimiento: fecha(mas(lunes, 28)), montoCobrado: 20_000, estadoCobro: "pagada_parcial" });
    await factura(tenantA, clienteA, {
      tipoDte: 61, montoTotal: 30_000, estadoDte: "aceptado", fechaEmision: fecha(hoy), fechaVencimiento: fecha(mas(lunes, 28)),
      documentoReferenciaId: f.id, codigoReferencia: 3,
    });
    const nd = await factura(tenantA, clienteA, { tipoDte: 56, montoTotal: 77_000, fechaEmision: fecha(hoy), fechaVencimiento: fecha(mas(lunes, 28)), documentoReferenciaId: f.id });
    const cedida = await factura(tenantA, clienteA, { fechaEmision: fecha(hoy), fechaVencimiento: fecha(mas(lunes, 28)), cesionEstado: "cedido", estadoCobro: "cedida" });
    const items = await proyeccion();
    expect(items.find((i) => i.documentoEmitidoId === f.id)?.monto).toBe(50_000);
    expect(items.some((i) => i.documentoEmitidoId === nd.id || i.documentoEmitidoId === cedida.id)).toBe(false);
    expect(items.some((i) => i.monto < 0)).toBe(false); // la NC no es una celda negativa
  });

  it("con 3 facturas pagadas el cliente usa su promedio real de pago; con menos, el vencimiento", async () => {
    const cuenta = await e.admin.cuentaBancaria.create({ data: { tenantId: tenantA, banco: "Banco", numeroVisible: "9001", activa: true } });
    for (const dias of [18, 20, 22]) {
      const emision = mas(hoy, -90 + dias);
      const pagada = await factura(tenantA, clientePromedio, { fechaEmision: fecha(emision), fechaVencimiento: fecha(mas(emision, 60)), montoCobrado: 100_000, estadoCobro: "pagada" });
      const mov = await e.admin.movimientoBancario.create({
        data: { tenantId: tenantA, cuentaId: cuenta.id, fecha: fecha(mas(emision, dias)), monto: 100_000n, glosa: "Pago", claveDedupe: randomUUID(), estado: "conciliado", origen: "cartola" },
      });
      await e.admin.conciliacionBanco.create({
        data: { tenantId: tenantA, movimientoId: mov.id, tipoEnlace: "documento_emitido", enlaceId: pagada.id, monto: 100_000n, activa: true, confirmada: true },
      });
    }
    const emision = mas(lunes, 7);
    const nueva = await factura(tenantA, clientePromedio, { fechaEmision: fecha(emision), fechaVencimiento: fecha(mas(emision, 60)) });
    const item = (await proyeccion()).find((i) => i.documentoEmitidoId === nueva.id);
    expect(item).toMatchObject({ origenFecha: "promedio", fechaEsperada: mas(emision, 20) });
  });

  it("se fija a mano con vista previa, aparece en la planilla y se revierte a la automática; otra empresa no puede tocarla", async () => {
    const f = await factura(tenantA, clienteA, { fechaEmision: fecha(hoy), fechaVencimiento: fecha(mas(lunes, 35)) });
    const objetivo = mas(lunes, 14);
    const vista = await run(tenantA, "finanzas.cobros.fijar_fecha_esperada", { documentoId: f.id, fecha: objetivo }, { dryRun: true });
    expect(vista.ok && vista.data).toMatchObject({ fecha: objetivo, semana: objetivo, automatica: false });
    expect(await e.admin.flujoCobroEsperado.count({ where: { documentoId: f.id } })).toBe(0); // la vista previa no escribe

    await ok(tenantA, "finanzas.cobros.fijar_fecha_esperada", { documentoId: f.id, fecha: objetivo });
    expect((await proyeccion()).find((i) => i.documentoEmitidoId === f.id)).toMatchObject({ origenFecha: "manual", semanaCobro: objetivo });
    const pl = await ok<Planilla>(tenantA, "finanzas.planilla.obtener", { desde: lunes, semanas: 6 });
    const enSemana = pl.celdas.filter((c) => c.filaId === FILA_COBROS_ESPERADOS && c.semana === objetivo);
    expect(enSemana.reduce((t, c) => t + c.monto, 0)).toBeGreaterThanOrEqual(100_000);
    expect(pl.semanas.find((s) => s.semana === objetivo)?.ingresos).toBeGreaterThanOrEqual(100_000);

    const otra = await run(tenantB, "finanzas.cobros.fijar_fecha_esperada", { documentoId: f.id, fecha: objetivo });
    expect(otra.ok).toBe(false);

    await ok(tenantA, "finanzas.cobros.fijar_fecha_esperada", { documentoId: f.id });
    expect((await proyeccion()).find((i) => i.documentoEmitidoId === f.id)).toMatchObject({ origenFecha: "vencimiento", semanaCobro: mas(lunes, 35) });
  });

  it("no hay doble conteo: una programación con borrador del período cuenta una sola vez", async () => {
    const items = await proyeccion();
    const ids = items.filter((i) => i.documentoEmitidoId).map((i) => i.documentoEmitidoId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
