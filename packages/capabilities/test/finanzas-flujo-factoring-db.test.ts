// CAR-193 · ADR-073 regla 4 y doble conteo de la semana en curso: el depósito del factor es el ingreso (no la factura),
// la diferencia es solo informativa, y un abono sin conciliar no se cuenta dos veces con su cobro proyectado.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/finanzas/manifest";
import {
  FILA_COBROS_ESPERADOS,
  FILA_DEPOSITO_FACTORING,
  FILA_DIFERENCIA_FACTORING,
} from "../../../modules/finanzas/capacidades/filas-virtuales";
import { hoyIso, lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

type Planilla = {
  semanas: { semana: string; ingresos: number; egresos: number; saldoFinal: number }[];
  celdas: { filaId: string; semana: string; monto: number; nota: string | null }[];
  filas: { id: string; etiqueta: string }[];
  avisos: { tipo: string; mensaje: string; monto: number }[];
};

describe.skipIf(omitirSuiteDb())("flujo · factoring y doble conteo (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let clienteId = "";
  let cuentaBancoId = "";
  const usuario = randomUUID();
  const lunes = lunesHoy();
  const hoy = hoyIso();
  let folio = 500;

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@fact.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  async function ok<T>(id: string, input: unknown): Promise<T> {
    const r = await mod.executeCapability(ctx(), id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const planilla = () => ok<Planilla>("finanzas.planilla.obtener", { desde: lunes, semanas: 4 });
  const total = (p: Planilla, filaId: string) => p.celdas.filter((c) => c.filaId === filaId && c.semana === lunes).reduce((t, c) => t + c.monto, 0);
  const semanaActual = (p: Planilla) => p.semanas.find((s) => s.semana === lunes)!;
  const abono = (monto: number, glosa: string) =>
    e.admin.movimientoBancario.create({
      data: { tenantId, cuentaId: cuentaBancoId, fecha: fecha(hoy), monto: BigInt(monto), glosa, claveDedupe: randomUUID(), estado: "pendiente", origen: "cartola" },
    });
  const factura = (o: Record<string, unknown>) =>
    e.admin.documentoEmitido.create({
      data: { tenantId, cuentaId: clienteId, tipoDte: 34, folio: folio++, fechaEmision: fecha(hoy), fechaVencimiento: fecha(hoy), montoTotal: 10_000, montoExento: 10_000, estadoDte: "aceptado", ...o },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarModulos([manifest]);
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantId = (await e.admin.tenant.create({ data: { slug: `fact-${randomUUID().slice(0, 8)}`, nombre: "F", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@fact.test`, name: "u" } });
    clienteId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente QA", rut: "76123456-0" } })).id;
    cuentaBancoId = (await e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Banco QA", numeroVisible: "7001", activa: true, saldoBanco: 50_000_000n } })).id;
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cesión de 10.000 con depósito de 9.800: ingreso 9.800, saldo +9.800 y diferencia 200 informativa", async () => {
    const antes = await planilla();
    const cedida = await factura({ estadoCobro: "cedida", cesionEstado: "cedido" });
    await e.admin.cesion.create({
      data: { tenantId, documentoId: cedida.id, factorRut: "99999999-9", factorNombre: "Factor SpA", tasaBps: 200, anticipo: 9_800, merma: 200, saldoFactor: 200, estado: "enviada" },
    });
    const despues = await planilla();
    expect(total(despues, FILA_DEPOSITO_FACTORING)).toBe(9_800);
    expect(total(despues, FILA_COBROS_ESPERADOS)).toBe(total(antes, FILA_COBROS_ESPERADOS)); // la factura cedida no se proyecta
    expect(semanaActual(despues).ingresos - semanaActual(antes).ingresos).toBe(9_800);
    expect(semanaActual(despues).egresos - semanaActual(antes).egresos).toBe(0);
    expect(semanaActual(despues).saldoFinal - semanaActual(antes).saldoFinal).toBe(9_800);
    const dif = despues.celdas.find((c) => c.filaId === FILA_DIFERENCIA_FACTORING);
    expect(dif).toMatchObject({ monto: 200, semana: lunes });
    expect(dif?.nota).toContain("Diferencia factoring");
    expect(despues.filas.find((f) => f.id === FILA_DIFERENCIA_FACTORING)?.etiqueta).toBe("Diferencia factoring");
  });

  it("la cuenta de la diferencia es configurable por empresa y sigue sin sumar al saldo", async () => {
    const antes = await planilla();
    await ok("core.config.set", { modulo: "finanzas", clave: "flujo_cuenta_diferencia_factoring", valor: "Gasto financiero" });
    const despues = await planilla();
    expect(despues.filas.find((f) => f.id === FILA_DIFERENCIA_FACTORING)?.etiqueta).toBe("Gasto financiero");
    expect(despues.semanas).toEqual(antes.semanas);
  });

  it("el depósito del factor ya recibido (abono sin conciliar con el RUT del factor) no se cuenta dos veces", async () => {
    const antes = await planilla();
    await abono(9_800, "ABONO FACTOR 99.999.999-9 OPERACION");
    const despues = await planilla();
    expect(total(despues, FILA_DEPOSITO_FACTORING)).toBe(0);
    expect(semanaActual(despues).ingresos).toBe(semanaActual(antes).ingresos - 9_800);
    expect(despues.avisos).toEqual([]);
    // La diferencia sigue visible aunque el depósito ya llegó.
    expect(total(despues, FILA_DIFERENCIA_FACTORING)).toBe(200);
  });

  it("una cesión ya financiada no proyecta otro depósito (el dinero ya está en el banco): solo queda su diferencia", async () => {
    const antes = await planilla();
    const cedida = await factura({ montoTotal: 2_000_000, montoExento: 2_000_000, estadoCobro: "cedida", cesionEstado: "cedido" });
    await e.admin.cesion.create({
      data: { tenantId, documentoId: cedida.id, factorRut: "11111111-1", factorNombre: "Otro Factor", tasaBps: 150, anticipo: 1_970_000, merma: 30_000, saldoFactor: 30_000, estado: "financiada" },
    });
    const despues = await planilla();
    expect(total(despues, FILA_DEPOSITO_FACTORING)).toBe(total(antes, FILA_DEPOSITO_FACTORING)); // sin depósito proyectado nuevo
    expect(semanaActual(despues).ingresos).toBe(semanaActual(antes).ingresos);
    expect(total(despues, FILA_DIFERENCIA_FACTORING) - total(antes, FILA_DIFERENCIA_FACTORING)).toBe(30_000);
  });

  it("abono sin conciliar igual al pendiente y con el RUT del cliente: la factura no se cuenta dos veces", async () => {
    const antes = await planilla();
    const f = await factura({ montoTotal: 321_000, montoExento: 321_000 });
    const conFactura = await planilla();
    expect(total(conFactura, FILA_COBROS_ESPERADOS) - total(antes, FILA_COBROS_ESPERADOS)).toBe(321_000);
    await abono(321_000, "TRANSF 76.123.456-0 FACTURA");
    const conAbono = await planilla();
    expect(total(conAbono, FILA_COBROS_ESPERADOS)).toBe(total(antes, FILA_COBROS_ESPERADOS));
    expect(conAbono.avisos).toEqual([]);
    await e.admin.documentoEmitido.update({ where: { id: f.id }, data: { estadoCobro: "pagada", montoCobrado: 321_000 } });
  });

  it("abono con el mismo monto pero sin RUT que calce: se mantiene la proyección y la planilla avisa", async () => {
    const antes = await planilla();
    await factura({ montoTotal: 654_000, montoExento: 654_000 });
    await abono(654_000, "Transferencia recibida");
    const despues = await planilla();
    expect(total(despues, FILA_COBROS_ESPERADOS) - total(antes, FILA_COBROS_ESPERADOS)).toBe(654_000);
    expect(despues.avisos).toEqual([
      expect.objectContaining({ tipo: "posible_cobro_recibido", monto: 654_000, mensaje: "Posible cobro ya recibido: concilia el abono de $ 654.000" }),
    ]);
  });

  it("un abono con el RUT del factor no lo gasta una factura ajena del mismo monto", async () => {
    const antes = await planilla();
    const otro = await e.admin.cuenta.create({ data: { tenantId, nombre: "Otro cliente", rut: "11111111-1" } });
    const f = await e.admin.documentoEmitido.create({
      data: { tenantId, cuentaId: otro.id, tipoDte: 34, folio: folio++, fechaEmision: fecha(hoy), fechaVencimiento: fecha(hoy), montoTotal: 4_444_000, montoExento: 4_444_000, estadoDte: "aceptado" },
    });
    const cedida = await factura({ montoTotal: 4_500_000, montoExento: 4_500_000, estadoCobro: "cedida", cesionEstado: "cedido" });
    await e.admin.cesion.create({
      data: { tenantId, documentoId: cedida.id, factorRut: "99999999-9", factorNombre: "Factor SpA", tasaBps: 100, anticipo: 4_444_000, merma: 56_000, saldoFactor: 56_000, estado: "enviada" },
    });
    await abono(4_444_000, "ABONO 99.999.999-9");
    const despues = await planilla();
    // El depósito del factor se oculta por RUT; la factura ajena (mismo monto) sigue proyectada y no avisa.
    expect(total(despues, FILA_DEPOSITO_FACTORING)).toBe(total(antes, FILA_DEPOSITO_FACTORING));
    expect(total(despues, FILA_COBROS_ESPERADOS) - total(antes, FILA_COBROS_ESPERADOS)).toBe(4_444_000);
    expect(despues.avisos.some((a) => a.monto === 4_444_000)).toBe(false);
    await e.admin.documentoEmitido.update({ where: { id: f.id }, data: { estadoCobro: "pagada", montoCobrado: 4_444_000 } });
  });

  it("un abono de otro monto no oculta nada ni avisa", async () => {
    const antes = await planilla();
    await abono(12_345, "DE 76.123.456-0 OTRO PAGO");
    const despues = await planilla();
    expect(total(despues, FILA_COBROS_ESPERADOS)).toBe(total(antes, FILA_COBROS_ESPERADOS));
    expect(despues.avisos.length).toBe(antes.avisos.length);
  });
});
