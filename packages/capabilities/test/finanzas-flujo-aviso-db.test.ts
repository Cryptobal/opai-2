// CAR-136 · C5: avisos idempotentes en Postgres (createMany skipDuplicates; sin P2002 en tx).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { lunesDe, sumarSemanas } from "../../../modules/finanzas/domain";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("flujo de caja: aviso idempotente en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const usuario = randomUUID();
  const medidor = { registrar: async () => undefined };
  const hoy = lunesDe(new Date().toISOString().slice(0, 10));
  const desde = sumarSemanas(hoy, -2);
  const semana = sumarSemanas(hoy, 2);

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@flujo.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor,
    });

  type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
  const run = <T>(id: string, input: unknown, o: Record<string, unknown> = {}) =>
    mod.executeCapability(ctx(), id, input, o) as Promise<Res<T>>;
  async function ok<T>(id: string, input: unknown, o: Record<string, unknown> = {}) {
    const r = await run<T>(id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }

  const avisosSemana = () =>
    e.admin.flujoAvisoEmitido.count({
      where: { tenantId, semana: new Date(`${semana}T00:00:00Z`) },
    });

  let filaIng = "";
  let filaEgr = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    const sufijo = randomUUID().slice(0, 8);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `flujo-aviso-${sufijo}`, nombre: "aviso", vertical: "seguridad" },
      })
    ).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${sufijo}@flujo.test`, name: "u" } });
    await ok("finanzas.ajustes.actualizar", {
      saldoInicial: 100,
      desde,
      avisoActivo: true,
      umbral: 50_000,
    });
    filaIng = (
      await ok<{ id: string }>("finanzas.filas.crear", {
        seccion: "ingreso",
        etiqueta: "Ingreso test",
        arrastre: true,
      })
    ).id;
    filaEgr = (
      await ok<{ id: string }>("finanzas.filas.crear", {
        seccion: "egreso",
        etiqueta: "Egreso test",
        arrastre: false,
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("fijar: dos escrituras en la misma semana no abortan y dejan un aviso", async () => {
    await ok("finanzas.celdas.fijar", { filaId: filaEgr, semana, monto: 80_000 });
    await ok("finanzas.celdas.fijar", { filaId: filaEgr, semana, monto: 85_000 });
    expect(await avisosSemana()).toBe(1);
  });

  it("cumplir: fijar y cumplir y otro fijar en la semana no abortan y dejan un aviso", async () => {
    const sem = sumarSemanas(semana, 1);
    // Los ingresos no se ajustan a mano (ADR-073): se usa una segunda fila de egresos.
    const filaEgr2 = (
      await ok<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Egreso test 2", arrastre: false })
    ).id;
    await ok("finanzas.celdas.fijar", { filaId: filaEgr2, semana: sem, monto: 500 });
    const celda = await e.admin.flujoCelda.findFirstOrThrow({
      where: { tenantId, filaId: filaEgr2, semana: new Date(`${sem}T00:00:00Z`) },
    });
    await ok("finanzas.celdas.cumplir", { id: celda.id });
    await ok("finanzas.celdas.fijar", { filaId: filaEgr, semana: sem, monto: 90_000 });
    expect(
      await e.admin.flujoAvisoEmitido.count({
        where: { tenantId, semana: new Date(`${sem}T00:00:00Z`) },
      }),
    ).toBe(1);
  });

  it("mover: reprogramar y volver a fijar la semana no aborta y deja un aviso", async () => {
    const sem = sumarSemanas(semana, 2);
    await ok("finanzas.celdas.fijar", { filaId: filaEgr, semana: sem, monto: 80_000 });
    await ok("finanzas.celdas.mover", { filaId: filaEgr, semanas: [sem], por: 1 });
    await ok("finanzas.celdas.fijar", { filaId: filaEgr, semana: sem, monto: 82_000 });
    expect(
      await e.admin.flujoAvisoEmitido.count({
        where: { tenantId, semana: new Date(`${sem}T00:00:00Z`) },
      }),
    ).toBe(1);
  });

  it("importar: dos filas en la misma semana no abortan y dejan un aviso", async () => {
    const sem = sumarSemanas(semana, 3);
    const csv = (m1: number, m2: number) =>
      ["seccion,etiqueta,semana,monto", `egreso,Egreso test,${sem},${m1}`, `egreso,Egreso test,${sem},${m2}`].join(
        "\n",
      );
    const r = await ok<{ aplicadas: number }>("finanzas.flujo.importar", {
      formato: "csv",
      contenido: csv(70_000, 75_000),
    });
    expect(r.aplicadas).toBe(2);
    expect(
      await e.admin.flujoAvisoEmitido.count({
        where: { tenantId, semana: new Date(`${sem}T00:00:00Z`) },
      }),
    ).toBe(1);
  });
});
