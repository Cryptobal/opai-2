// CAR-349: gastos recurrentes derivados al leer. Datos sintéticos; Postgres real con un rol sin BYPASSRLS.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const mas = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);
type Celda = { id: string; filaId: string; semana: string; capa: string; monto: number; nota: string | null };
type Planilla = { celdas: Celda[]; semanas: { semana: string; egresos: number }[] };

describe.skipIf(omitirSuiteDb())("flujo · gastos recurrentes (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let otro = "";
  let fila = "";
  let cuenta = "";
  const usuario = randomUUID();
  const lunes = lunesHoy();

  const ctx = (t = tenantId) =>
    mod.crearContexto({
      tenantId: t, actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@rec.test", platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["finanzas"], medidor: { registrar: async () => undefined },
    });
  const run = (id: string, input: unknown, opts?: { dryRun?: boolean }, t = tenantId) => mod.executeCapability(ctx(t), id, input, opts);
  async function ok<T>(id: string, input: unknown, t = tenantId): Promise<T> {
    const r = await run(id, input, undefined, t);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const planilla = () => ok<Planilla>("finanzas.planilla.obtener", { desde: lunes, semanas: 6 });
  const cargo = async (dia: string, monto: number) => {
    const m = await e.admin.movimientoBancario.create({
      data: { tenantId, cuentaId: cuenta, fecha: fecha(dia), monto: BigInt(-monto), glosa: "Pago QA", claveDedupe: `qa|${randomUUID()}`, estado: "conciliado", origen: "cartola" },
    });
    await e.admin.conciliacionBanco.create({ data: { tenantId, movimientoId: m.id, tipoEnlace: "flujo_fila", enlaceId: fila, monto: BigInt(-monto), activa: true, confirmada: true } });
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    const s = randomUUID().slice(0, 8);
    tenantId = (await e.admin.tenant.create({ data: { slug: `rec-${s}`, nombre: "R", vertical: "seguridad" } })).id;
    otro = (await e.admin.tenant.create({ data: { slug: `rec-b-${s}`, nombre: "B", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${s}@rec.test`, name: "u" } });
    fila = (await ok<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Arriendo oficina" })).id;
    cuenta = (await e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Banco QA", numeroVisible: "0001", activa: true, saldoBanco: 50_000_000n } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("valida: solo egresos activos, día solo en mensual, fin posterior al inicio; la vista previa no escribe", async () => {
    const base = { filaId: fila, concepto: "Arriendo", monto: 1_500_000, frecuencia: "mensual", diaDelMes: 1, inicio: mas(lunes, -40) };
    expect((await run("finanzas.recurrentes.crear", { ...base, frecuencia: "semanal" })).ok).toBe(false);
    expect((await run("finanzas.recurrentes.crear", { ...base, fin: mas(lunes, -60) })).ok).toBe(false);
    expect((await run("finanzas.recurrentes.crear", base, { dryRun: true })).ok).toBe(true);
    expect(await ok<unknown[]>("finanzas.recurrentes.listar", {})).toEqual([]);
  });

  it("proyecta una cuota semanal por semana desde la semana en curso, sin escribir celdas", async () => {
    await ok("finanzas.recurrentes.crear", { filaId: fila, concepto: "Guardia extra", monto: 100_000, frecuencia: "semanal", inicio: mas(lunes, 2) });
    const p = await planilla();
    const cuotas = p.celdas.filter((c) => c.filaId === fila && c.nota?.startsWith("Guardia extra"));
    expect(cuotas.map((c) => c.semana)).toEqual([0, 7, 14, 21, 28, 35].map((d) => mas(lunes, d)));
    expect(cuotas.every((c) => c.capa === "comprometido" && c.monto === 100_000)).toBe(true);
    expect(await e.admin.flujoCelda.count({ where: { tenantId } })).toBe(0);
  });

  it("una cuota pagada antes del lunes no se proyecta; una vencida e impaga va a la semana en curso", async () => {
    const r = await ok<{ id: string }>("finanzas.recurrentes.crear", { filaId: fila, concepto: "Contador", monto: 150_000, frecuencia: "semanal", inicio: mas(lunes, -14), fin: mas(lunes, -7) });
    await cargo(mas(lunes, -13), 150_000); // paga la cuota de hace 14 días
    const contador = (await planilla()).celdas.filter((c) => c.nota?.startsWith("Contador"));
    expect(contador).toHaveLength(1); // la de hace 7 días, impaga
    expect(contador[0]).toMatchObject({ semana: lunes, monto: 150_000 });
    await ok("finanzas.recurrentes.actualizar", { id: r.id, activa: false });
    expect((await planilla()).celdas.some((c) => c.nota?.startsWith("Contador"))).toBe(false);
  });

  it("dos cargos iguales pagan dos cuotas distintas; otra empresa no ve los recurrentes", async () => {
    await ok("finanzas.recurrentes.crear", { filaId: fila, concepto: "Aseo", monto: 80_000, frecuencia: "semanal", inicio: mas(lunes, -21), fin: mas(lunes, -14) });
    await cargo(mas(lunes, -18), 80_000);
    await cargo(mas(lunes, -18), 80_000);
    expect((await planilla()).celdas.some((c) => c.nota?.startsWith("Aseo"))).toBe(false);
    expect(await ok<unknown[]>("finanzas.recurrentes.listar", {}, otro)).toEqual([]);
    const ajena = await run("finanzas.recurrentes.crear", { filaId: fila, concepto: "X", monto: 1, frecuencia: "semanal", inicio: lunes }, undefined, otro);
    expect(ajena.ok).toBe(false);
  });
});
