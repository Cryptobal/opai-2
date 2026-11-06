// CAR-193 · ADR-073: factoring (el ingreso es el depósito neto; la diferencia es informativa y no suma al saldo) y el
// doble conteo de la semana en curso (un abono sin conciliar y su factura no se cuentan dos veces).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { lunesDe } from "@opai/domain";
import { capacidades } from "../../../modules/finanzas/capacidades";
import { FILA_COBROS_ESPERADOS, FILA_SIN_CONCILIAR_INGRESO } from "../../../modules/finanzas/capacidades/filas-virtuales";
import { hoyIso, lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";
import { registrarModuloFinanzas } from "./finanzas-modulo";

import type * as ModuloCapacidades from "../src";

const mas = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);
type Celda = { filaId: string; semana: string; capa: string; monto: number; nota: string | null };
type Planilla = {
  semanas: { semana: string; ingresos: number; saldoInicial: number; saldoFinal: number }[];
  celdas: Celda[];
  avisos: { mensaje: string }[];
};

describe.skipIf(omitirSuiteDb())("flujo · semana en curso (abonos) (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const usuario = randomUUID();
  const hoy = hoyIso();
  const lunes = lunesHoy();
  let folio = 1;

  const ctx = (tid: string) =>
    mod.crearContexto({
      tenantId: tid, actor: { tipo: "user", id: usuario }, usuario: { id: usuario, nombre: "u", email: "u@cob.test", platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["finanzas"], medidor: { registrar: async () => undefined },
    });
  const planilla = async (tid: string) => {
    const r = await mod.executeCapability(ctx(tid), "finanzas.planilla.obtener", { desde: lunes, semanas: 3 });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Planilla;
  };
  const semana = (p: Planilla) => p.semanas.find((s) => s.semana === lunes)!;
  /** Una empresa con una cuenta de banco de $10.000.000 al día de hoy y un cliente con RUT. */
  async function empresa() {
    const t = (await e.admin.tenant.create({ data: { slug: `cob-${randomUUID().slice(0, 8)}`, nombre: "E", vertical: "seguridad" } })).id;
    const cliente = (await e.admin.cuenta.create({ data: { tenantId: t, nombre: "Cliente", rut: "76111111-6" } })).id;
    const banco = (await e.admin.cuentaBancaria.create({ data: { tenantId: t, banco: "Banco", numeroVisible: "1", activa: true, saldoBanco: 10_000_000n, saldoBancoEn: new Date() } })).id;
    return { t, cliente, banco };
  }
  const factura = (tenantId: string, cuentaId: string, monto: number, o: Record<string, unknown> = {}) =>
    e.admin.documentoEmitido.create({
      data: { tenantId, cuentaId, tipoDte: 33, folio: folio++, montoTotal: monto, montoExento: monto, estadoDte: "aceptado", fechaEmision: fecha(mas(hoy, -90)), fechaVencimiento: fecha(mas(hoy, -30)), ...o },
    });
  const abono = (tenantId: string, cuentaId: string, monto: number, glosa: string, o: Record<string, unknown> = {}) =>
    e.admin.movimientoBancario.create({ data: { tenantId, cuentaId, fecha: fecha(hoy), monto: BigInt(monto), glosa, claveDedupe: randomUUID(), estado: "pendiente", origen: "cartola", ...o } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    registrarModuloFinanzas();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@cob.test`, name: "u" } });
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar();
  });

  it("abono sin conciliar con el RUT del cliente y el monto de su factura: no se cuenta dos veces", async () => {
    const { t, cliente, banco } = await empresa();
    await factura(t, cliente, 1_000_000);
    await abono(t, banco, 1_000_000, "TRANSF DE 76.111.111-6 CLIENTE");
    const p = await planilla(t);
    expect(p.celdas.some((c) => c.filaId === FILA_COBROS_ESPERADOS)).toBe(false); // la factura deja de proyectarse
    expect(p.celdas.find((c) => c.filaId === FILA_SIN_CONCILIAR_INGRESO)).toMatchObject({ monto: 1_000_000, capa: "real" });
    expect(p.avisos).toEqual([]);
    expect(semana(p)).toMatchObject({ saldoInicial: 9_000_000, ingresos: 1_000_000, saldoFinal: 10_000_000 });
  });

  it("abono sin coincidencia segura: se mantiene la proyección y la planilla avisa que concilie", async () => {
    const { t, cliente, banco } = await empresa();
    await factura(t, cliente, 800_000);
    await abono(t, banco, 800_000, "DEPOSITO VARIOS");
    const p = await planilla(t);
    expect(p.celdas.find((c) => c.filaId === FILA_COBROS_ESPERADOS)).toMatchObject({ monto: 800_000, capa: "comprometido" });
    expect(p.avisos.map((a) => a.mensaje)).toEqual([expect.stringContaining("Posible cobro ya recibido")]);
  });

  it("un abono ya conciliado esta semana sigue sumando a la semana (antes faltaba y el saldo final quedaba corto)", async () => {
    const { t, cliente, banco } = await empresa();
    const doc = await factura(t, cliente, 1_000_000, { estadoCobro: "pagada", montoCobrado: 1_000_000 });
    const m = await abono(t, banco, 1_000_000, "Pago factura", { estado: "conciliado" });
    await e.admin.conciliacionBanco.create({ data: { tenantId: t, movimientoId: m.id, tipoEnlace: "documento_emitido", enlaceId: doc.id, monto: 1_000_000n, activa: true, confirmada: true } });
    const p = await planilla(t);
    expect(semana(p)).toMatchObject({ saldoInicial: 9_000_000, ingresos: 1_000_000, saldoFinal: 10_000_000 });
    expect(lunesDe(hoy)).toBe(lunes);
  });
});
