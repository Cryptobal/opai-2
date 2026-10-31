// CAR-91, Brief 20: flujo de caja contra Postgres real. Dos empresas: la A opera y la B comprueba el
// aislamiento por RLS; además dry_run sin escritura, reprogramación y sello de una semana.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { lunesDe, sumarSemanas } from "../../../modules/finanzas/domain";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("flujo de caja: dos empresas en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { a: "", b: "" };
  const usuario = randomUUID();
  const medidor = { registrar: async () => undefined };
  const hoy = lunesDe(new Date().toISOString().slice(0, 10));
  const desde = sumarSemanas(hoy, -2);
  const futura = sumarSemanas(hoy, 2);

  const ctx = (tenantId: string, rol: "owner" | "supervisor" = "owner") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@flujo.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: ["finanzas"],
      medidor,
    });
  type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
  const run = <T>(tenantId: string, id: string, input: unknown, o: Record<string, unknown> = {}) =>
    mod.executeCapability(ctx(tenantId), id, input, o) as Promise<Res<T>>;
  async function ok<T>(tenantId: string, id: string, input: unknown, o: Record<string, unknown> = {}) {
    const r = await run<T>(tenantId, id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    const sufijo = randomUUID().slice(0, 8);
    for (const k of ["a", "b"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `flujo-${k}-${sufijo}`, nombre: k, vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${sufijo}@flujo.test`, name: "u" } });
    await ok(t.a, "finanzas.ajustes.actualizar", { saldoInicial: 1000, umbral: 300, desde });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  let fila = "";

  it("crea una fila y fija una cifra; la planilla deriva el saldo", async () => {
    fila = (await ok<{ id: string }>(t.a, "finanzas.filas.crear", { seccion: "ingreso", etiqueta: "Cliente 1", arrastre: true })).id;
    await ok(t.a, "finanzas.celdas.fijar", { filaId: fila, semana: futura, monto: 500 });
    const p = await ok<{ semanas: { semana: string; saldoFinal: number }[] }>(t.a, "finanzas.planilla.obtener", { desde, semanas: 6 });
    expect(p.semanas.find((s) => s.semana === futura)?.saldoFinal).toBe(1500);
  });

  it("dry_run no escribe nada", async () => {
    const antes = await e.admin.flujoCelda.count({ where: { tenantId: t.a } });
    await ok(t.a, "finanzas.celdas.fijar", { filaId: fila, semana: hoy, monto: 5 }, { dryRun: true });
    expect(await e.admin.flujoCelda.count({ where: { tenantId: t.a } })).toBe(antes);
  });

  it("mover reprograma la cifra plan y deja el saldo en la nueva semana", async () => {
    await ok(t.a, "finanzas.celdas.mover", { filaId: fila, semanas: [futura], por: 1 });
    const celdas = await e.admin.flujoCelda.findMany({ where: { tenantId: t.a, filaId: fila } });
    expect(celdas.map((c) => c.semana.toISOString().slice(0, 10))).toEqual([sumarSemanas(futura, 1)]);
  });

  it("sella la primera semana y bloquea cambios en ella", async () => {
    await ok(t.a, "finanzas.cierres.sellar", { semana: desde, saldoBanco: 1000 });
    const r = await run(t.a, "finanzas.celdas.fijar", { filaId: fila, semana: desde, monto: 1 });
    expect(r.ok).toBe(false);
  });

  it("la empresa B no ve ni toca nada de A (RLS)", async () => {
    expect(await ok<unknown[]>(t.b, "finanzas.filas.listar", {})).toEqual([]);
    expect(await ok<unknown[]>(t.b, "finanzas.cierres.listar", {})).toEqual([]);
    const sobre = await run(t.b, "finanzas.celdas.fijar", { filaId: fila, semana: futura, monto: 9 });
    expect(sobre).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const mover = await run(t.b, "finanzas.celdas.mover", { filaId: fila, semanas: [futura], por: 1 });
    expect(mover.ok).toBe(false);
    expect(await e.admin.flujoCelda.count({ where: { tenantId: t.b } })).toBe(0);
  });

  it("un rol sin permisos financieros no entra", async () => {
    const r = await mod.executeCapability(ctx(t.a, "supervisor"), "finanzas.planilla.obtener", {});
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
