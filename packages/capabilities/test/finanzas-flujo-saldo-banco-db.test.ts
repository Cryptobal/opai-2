// CAR-193 · ADR-073: el saldo parte del banco de hoy (hacia atrás con la cartola, hacia adelante con la proyección),
// lo no conciliado va a «Sin conciliar» y una conciliación tardía no cambia los totales de la semana ni su saldo.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { FILA_SIN_CONCILIAR_INGRESO } from "../../../modules/finanzas/capacidades/filas-virtuales";
import { hoyIso, lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const mas = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

type Semana = { semana: string; ingresos: number; egresos: number; saldoInicial: number; saldoFinal: number; pasada: boolean };
type Planilla = {
  semanas: Semana[];
  celdas: { id: string; filaId: string; semana: string; capa: string; monto: number }[];
  saldoBanco: { fuente: string; saldo: number | null; cuentasSinSaldo: { banco: string }[] };
};

describe.skipIf(omitirSuiteDb())("flujo · saldo desde el banco y conciliación tardía (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let filaCliente = "";
  let movTardio = "";
  let docId = "";
  const usuario = randomUUID();
  const lunes = lunesHoy();
  const semAnt = mas(lunes, -7);
  const semAnt2 = mas(lunes, -14);

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@saldo.test", platformRole: null },
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
  const planilla = () => ok<Planilla>("finanzas.planilla.obtener", { desde: semAnt2, semanas: 4 });
  const mov = (f: string, monto: number, glosa: string, cuentaId: string) =>
    e.admin.movimientoBancario.create({
      data: { tenantId, cuentaId, fecha: fecha(f), monto: BigInt(monto), glosa, claveDedupe: `${glosa}-${randomUUID()}`, estado: "pendiente", origen: "cartola" },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    tenantId = (await e.admin.tenant.create({ data: { slug: `saldo-${randomUUID().slice(0, 8)}`, nombre: "S", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@saldo.test`, name: "u" } });
    await ok("finanzas.ajustes.actualizar", { saldoInicial: 999, desde: mas(lunes, -56) });
    filaCliente = (await ok<{ id: string }>("finanzas.filas.crear", { seccion: "ingreso", etiqueta: "Cliente QA", arrastre: false })).id;
    const conSaldo = await e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Banco con saldo", numeroVisible: "0001", activa: true, saldoBanco: 10_000_000n } });
    const sinSaldo = await e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Banco sin saldo", numeroVisible: "0002", activa: true } });
    // Saldo de ayer: un movimiento de hoy es posterior y ese saldo no lo incluye (no se resta de la apertura).
    const desfasado = await e.admin.cuentaBancaria.create({
      data: { tenantId, banco: "Banco desfasado", numeroVisible: "0004", activa: true, saldoBanco: 4_000_000n, saldoBancoEn: new Date(`${mas(hoyIso(), -1)}T15:00:00Z`) },
    });
    const inactiva = await e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Banco inactivo", numeroVisible: "0003", activa: false, saldoBanco: 5_000_000n } });
    movTardio = (await mov(mas(semAnt, 2), 2_000_000, "Abono cliente", conSaldo.id)).id; // semana pasada, sin conciliar
    await mov(mas(semAnt2, 1), -500_000, "Pago varios", conSaldo.id); // dos semanas atrás
    await mov(hoyIso(), -300_000, "Cargo de hoy", conSaldo.id); // semana en curso, ya movido
    // No deben correr la apertura: cuenta sin saldo, cuenta inactiva y un movimiento con fecha futura.
    await mov(hoyIso(), -111_111, "Cargo cuenta sin saldo", sinSaldo.id);
    await mov(hoyIso(), -222_222, "Cargo cuenta inactiva", inactiva.id);
    await mov(mas(hoyIso(), 3), -777_777, "Cargo con fecha futura", conSaldo.id);
    await mov(hoyIso(), -400_000, "Cargo posterior al saldo", desfasado.id);
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente QA", rut: "77000002-7" } });
    docId = (
      await e.admin.documentoEmitido.create({
        data: { tenantId, cuentaId: cuenta.id, tipoDte: 33, folio: 9301, fechaEmision: fecha(semAnt), montoTotal: 2_000_000, montoNeto: 1_680_672, montoIva: 319_328, montoCobrado: 0, estadoDte: "aceptado" },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("el saldo parte del saldo del banco de hoy: hacia atrás con la cartola, y avisa la cuenta sin saldo", async () => {
    const p = await planilla();
    const porSemana = new Map(p.semanas.map((s) => [s.semana, s]));
    // Apertura de la semana en curso = Σ por cuenta de (saldo − lo movido esta semana hasta la fecha de ese saldo):
    // (10.000.000 + 300.000) de la cuenta al día + 4.000.000 de la desfasada, cuyo saldo es de ayer y no incluye lo de hoy.
    expect(porSemana.get(lunes)?.saldoInicial).toBe(14_300_000);
    expect(porSemana.get(semAnt)).toMatchObject({ ingresos: 2_000_000, egresos: 0, saldoFinal: 14_300_000, saldoInicial: 12_300_000, pasada: true });
    expect(porSemana.get(semAnt2)).toMatchObject({ ingresos: 0, egresos: 500_000, saldoFinal: 12_300_000, saldoInicial: 12_800_000 });
    expect(p.saldoBanco).toMatchObject({ fuente: "banco", saldo: 14_000_000 });
    expect(p.saldoBanco.cuentasSinSaldo.map((c) => c.banco)).toEqual(["Banco sin saldo"]);
    // El saldo inicial manual de los ajustes (999) ya no manda.
    expect(p.semanas.every((s) => s.saldoInicial !== 999)).toBe(true);
  });

  it("lo no conciliado de una semana pasada va a «Sin conciliar», con el total de la cartola", async () => {
    const p = await planilla();
    const celda = p.celdas.find((c) => c.id === movTardio);
    expect(celda).toMatchObject({ filaId: FILA_SIN_CONCILIAR_INGRESO, semana: semAnt, capa: "real", monto: 2_000_000 });
  });

  it("una conciliación hecha tarde no cambia los totales ni el saldo de la semana: solo mueve el monto a su fila", async () => {
    const antes = await planilla();
    await ok("finanzas.conciliaciones.confirmar", { movimientoId: movTardio, enlaces: [{ tipo: "documento_emitido", id: docId, monto: 2_000_000 }] });
    const despues = await planilla();
    // Semanas pasadas: totales, saldos iniciales y finales idénticos; la apertura de la semana en curso tampoco cambia.
    const pasadas = (p: Planilla) => p.semanas.filter((s) => s.pasada);
    const actual = (p: Planilla) => p.semanas.find((s) => !s.pasada);
    expect(pasadas(despues)).toEqual(pasadas(antes));
    expect(actual(despues)?.saldoInicial).toBe(actual(antes)?.saldoInicial);
    // Lo único que cambia hacia adelante: la factura ya cobrada deja de esperarse (su depósito ya estaba en el saldo del banco).
    expect((actual(antes)?.ingresos ?? 0) - (actual(despues)?.ingresos ?? 0)).toBe(2_000_000);
    const celda = despues.celdas.find((c) => c.id === movTardio);
    expect(celda).toMatchObject({ filaId: filaCliente, semana: semAnt, monto: 2_000_000 });
    expect(celda?.filaId).not.toBe(FILA_SIN_CONCILIAR_INGRESO);
  });
});
