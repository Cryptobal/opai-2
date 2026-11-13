// CAR-343: el saldo conocido de una cuenta puede ser antiguo (saldo de apertura o del último movimiento que lo
// trae). El flujo lo lleva hasta el inicio de la semana en curso con la cartola, y la cuadratura mensual permite
// compararlo al peso con el banco. Datos sintéticos; dos movimientos del mismo día y monto no son duplicados.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { hoyIso, lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const mas = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);
const finDeMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

type Semana = { semana: string; ingresos: number; egresos: number; saldoInicial: number; saldoFinal: number };
type Planilla = { semanas: Semana[]; saldoBanco: { fuente: string; saldo: number | null; saldoHoy: number | null; saldoDesde: string | null } };
type Mes = { mes: string; saldoInicial: number; abonos: number; cargos: number; saldoFinal: number; movimientos: number };
type Cuadratura = { cuentas: { cuentaId: string; banco: string; ancla: { saldo: number; fecha: string } | null; meses: Mes[] }[] };

describe.skipIf(omitirSuiteDb())("flujo · saldo antiguo llevado a hoy y cuadratura mensual (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let otroTenant = "";
  let cuentaId = "";
  const usuario = randomUUID();
  const lunes = lunesHoy();
  const hoy = hoyIso();
  const ANCLA = 20_000_000;
  const fAncla = mas(lunes, -67);
  // [fecha, monto]: antes del ancla, el mismo día, después, domingo y lunes, par idéntico, domingo pasado y hoy.
  const movs: [string, number][] = [
    [mas(fAncla, -3), 1_000_000],
    [fAncla, -999],
    [mas(fAncla, 1), -2_000_000],
    [mas(lunes, -22), -300_000],
    [mas(lunes, -21), 5_000_000],
    [mas(lunes, -10), -150_000],
    [mas(lunes, -10), -150_000],
    [mas(lunes, -1), 700_000],
    [hoy, -400_000],
  ];
  const saldoAl = (corte: string) => ANCLA + movs.filter(([f]) => f > fAncla && f <= corte).reduce((t, [, m]) => t + m, 0)
    - movs.filter(([f]) => f > corte && f <= fAncla).reduce((t, [, m]) => t + m, 0);

  const ctx = (t = tenantId) =>
    mod.crearContexto({
      tenantId: t,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@cuadra.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  async function ok<T>(id: string, input: unknown, t = tenantId): Promise<T> {
    const r = await mod.executeCapability(ctx(t), id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    const sufijo = randomUUID().slice(0, 8);
    tenantId = (await e.admin.tenant.create({ data: { slug: `cuadra-${sufijo}`, nombre: "C", vertical: "seguridad" } })).id;
    otroTenant = (await e.admin.tenant.create({ data: { slug: `cuadra-b-${sufijo}`, nombre: "B", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${sufijo}@cuadra.test`, name: "u" } });
    // La planilla no muestra semanas anteriores a la base de los ajustes: se abre la ventana hacia atrás.
    cuentaId = (await e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Banco QA", numeroVisible: "0001", activa: true } })).id;
    await e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Banco sin saldo", numeroVisible: "0002", activa: true } });
    // Saldo conocido antiguo, como lo deja la apertura: fuera de la cartola (ignorado) y con saldo posterior.
    await e.admin.movimientoBancario.create({
      data: { tenantId, cuentaId, fecha: fecha(fAncla), monto: BigInt(ANCLA), saldoDespues: BigInt(ANCLA), glosa: "Saldo de apertura", claveDedupe: "apertura:saldo", estado: "ignorado", origen: "manual" },
    });
    for (const [i, [f, monto]] of movs.entries()) {
      await e.admin.movimientoBancario.create({
        data: { tenantId, cuentaId, fecha: fecha(f), monto: BigInt(monto), glosa: "Movimiento QA", claveDedupe: `qa|${f}|${monto}|${i}`, estado: "pendiente", origen: "cartola" },
      });
    }
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("el saldo antiguo se lleva al inicio de la semana en curso con la cartola posterior", async () => {
    const p = await ok<Planilla>("finanzas.planilla.obtener", { desde: mas(lunes, -28), semanas: 5 });
    const s = new Map(p.semanas.map((x) => [x.semana, x]));
    expect(s.get(lunes)?.saldoInicial).toBe(saldoAl(mas(lunes, -1)));
    expect(s.get(lunes)?.saldoInicial).toBe(23_100_000);
    // Cada semana pasada cierra con el saldo de su domingo; el par idéntico cuenta dos veces.
    for (const n of [-7, -14, -21, -28]) expect(s.get(mas(lunes, n))?.saldoFinal).toBe(saldoAl(mas(lunes, n + 6)));
    expect(s.get(mas(lunes, -14))).toMatchObject({ egresos: 300_000, saldoInicial: 22_700_000, saldoFinal: 22_400_000 });
    expect(s.get(mas(lunes, -28))).toMatchObject({ egresos: 300_000, saldoInicial: 18_000_000 });
  });

  it("un abono de esta semana, posterior al saldo conocido, suma a la semana y el saldo de hoy cuadra", async () => {
    // Revisión de CAR-343: antes los abonos de la semana se cortaban en la fecha del saldo y este se perdía.
    if (hoy === lunes) return; // el lunes no hay día de esta semana anterior a hoy
    const abono = await e.admin.movimientoBancario.create({
      data: { tenantId, cuentaId, fecha: fecha(lunes), monto: 1_234_567n, glosa: "Abono de esta semana", claveDedupe: `qa|abono|${randomUUID()}`, estado: "pendiente", origen: "cartola" },
    });
    try {
      const p = await ok<Planilla>("finanzas.planilla.obtener", { desde: lunes, semanas: 1 });
      expect(p.semanas[0]?.saldoInicial).toBe(23_100_000);
      expect(p.semanas[0]?.ingresos).toBeGreaterThanOrEqual(1_234_567);
      expect(p.saldoBanco.saldoHoy).toBe(22_700_000 + 1_234_567);
    } finally {
      await e.admin.movimientoBancario.delete({ where: { id: abono.id } });
    }
  });

  it("la planilla informa el saldo conocido, desde cuándo y el saldo calculado a hoy", async () => {
    const p = await ok<Planilla>("finanzas.planilla.obtener", {});
    expect(p.saldoBanco).toMatchObject({ fuente: "banco", saldo: ANCLA, saldoDesde: fAncla, saldoHoy: 22_700_000 });
  });

  it("la cuadratura mensual cuadra al peso en cada corte, antes y después del saldo conocido", async () => {
    const desde = mas(fAncla, -3).slice(0, 7);
    const c = await ok<Cuadratura>("finanzas.cuadratura.obtener", { desde, hasta: hoy.slice(0, 7) });
    const cuenta = c.cuentas.find((x) => x.cuentaId === cuentaId);
    expect(cuenta?.ancla).toEqual({ saldo: ANCLA, fecha: fAncla });
    const meses = cuenta?.meses ?? [];
    expect(meses[0]?.mes).toBe(desde);
    expect(meses.at(-1)?.mes).toBe(hoy.slice(0, 7));
    for (const [i, m] of meses.entries()) {
      expect(m.saldoFinal).toBe(saldoAl(finDeMes(m.mes)));
      expect(m.saldoInicial + m.abonos - m.cargos).toBe(m.saldoFinal);
      if (i > 0) expect(m.saldoInicial).toBe(meses[i - 1]?.saldoFinal);
    }
    expect(meses.reduce((t, m) => t + m.movimientos, 0)).toBe(movs.length);
    expect(meses.at(-1)?.saldoFinal).toBe(22_700_000);
  });

  it("una cuenta sin saldo conocido se informa sin meses, y otra empresa no ve nada", async () => {
    const mes = hoy.slice(0, 7);
    const c = await ok<Cuadratura>("finanzas.cuadratura.obtener", { desde: mes, hasta: mes });
    expect(c.cuentas.find((x) => x.banco === "Banco sin saldo")).toMatchObject({ ancla: null, meses: [] });
    const ajeno = await ok<Cuadratura>("finanzas.cuadratura.obtener", { desde: mes, hasta: mes }, otroTenant);
    expect(ajeno.cuentas).toEqual([]);
    const r = await mod.executeCapability(ctx(), "finanzas.cuadratura.obtener", { desde: "2026-05", hasta: "2026-01" });
    expect(r.ok).toBe(false);
  });
});
