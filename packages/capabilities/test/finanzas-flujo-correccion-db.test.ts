// CAR-181 · corrección del flujo de caja: hora de Chile, cartola completa, lecturas sin escritura,
// escrituras concurrentes, importación todo o nada y aviso sincronizado.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Finanzas · corrección del flujo (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let cuentaId = "";
  const usuarioId = randomUUID();
  const medidor = { registrar: async () => undefined };

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "flujo@correccion.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor,
    });

  const ok = async <T>(id: string, input: unknown, opts?: { dryRun?: boolean }) => {
    const r = await mod.executeCapability(ctx(), id, input, opts);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };

  const movimiento = (fecha: string, monto: number, glosa: string, estado = "pendiente") =>
    e.admin.movimientoBancario.create({
      data: {
        tenantId,
        cuentaId,
        fecha: new Date(`${fecha}T15:00:00.000Z`),
        monto: BigInt(monto),
        glosa,
        claveDedupe: randomUUID(),
        estado,
        origen: "cartola",
      },
    });

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `flujo-corr-${randomUUID().slice(0, 8)}`, nombre: "Flujo Corrección SpA", vertical: "seguridad" },
      })
    ).id;
    await e.admin.user.create({
      data: { id: usuarioId, email: `u-${randomUUID().slice(0, 8)}@flujo.test`, name: "u" },
    });
    await ok("finanzas.ajustes.actualizar", { saldoInicial: 0, desde: "2026-10-05" });
    cuentaId = (
      await ok<{ id: string }>("finanzas.bancos.guardar", { banco: "Banco QA", numeroVisible: "55001122" })
    ).id;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await e?.cerrar();
  });

  it("domingo 22:00 en Chile la semana en curso sigue editable", async () => {
    vi.setSystemTime(new Date("2026-11-09T01:00:00Z")); // domingo 8 a las 22:00 en Santiago
    const fila = await ok<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Arriendo" });
    const celda = await ok<{ monto: number }>("finanzas.celdas.fijar", {
      filaId: fila.id,
      semana: "2026-11-02",
      monto: 90_000,
    });
    expect(celda.monto).toBe(90_000);
    vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
  });

  it("leer la planilla no escribe y dos lecturas en paralelo funcionan", async () => {
    const antes = await e.admin.flujoFila.count({ where: { tenantId } });
    const [a, b] = await Promise.all([
      ok("finanzas.planilla.obtener", { semanas: 6 }),
      ok("finanzas.planilla.obtener", { semanas: 6 }),
    ]);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(await e.admin.flujoFila.count({ where: { tenantId } })).toBe(antes);
  });

  it("la cartola de la semana pasada suma exactamente los movimientos, aun con filas archivadas", async () => {
    // Los ingresos no se crean por la capacidad (solo egresos planificados): la fila de ingreso se siembra directo.
    const fila = await e.admin.flujoFila.create({ data: { tenantId, seccion: "ingreso", etiqueta: "ACME SpA", arrastre: false, orden: 0, activa: true } });
    await movimiento("2026-10-14", 100_000, "Abono sin conciliar");
    await movimiento("2026-10-15", -300_000, "Pago sin conciliar");
    const conc = await movimiento("2026-10-16", 50_000, "Cobro ACME");
    await ok("finanzas.conciliaciones.confirmar", {
      movimientoId: conc.id,
      enlaces: [{ tipo: "flujo_fila", id: fila.id, monto: 50_000 }],
    });
    const abono = await movimiento("2026-10-17", 700_000, "ABONO FACTORING");
    await ok("finanzas.conciliaciones.confirmar", {
      movimientoId: abono.id,
      enlaces: [{ tipo: "flujo_fila", id: fila.id, monto: 700_000 }],
    });
    await ok("finanzas.filas.archivar", { id: fila.id, archivar: true });
    const p = await ok<{ semanas: { semana: string; ingresos: number; egresos: number }[] }>(
      "finanzas.planilla.obtener",
      { desde: "2026-10-12", semanas: 1 },
    );
    const s = p.semanas[0]!;
    expect(s.ingresos - s.egresos).toBe(100_000 - 300_000 + 50_000 + 700_000);
  });

  it("dos «fijar» a la vez sobre una celda nueva terminan bien", async () => {
    const fila = await ok<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Arriendo oficina" });
    const rs = await Promise.all([
      mod.executeCapability(ctx(), "finanzas.celdas.fijar", { filaId: fila.id, semana: "2026-11-23", monto: 10_000 }),
      mod.executeCapability(ctx(), "finanzas.celdas.fijar", { filaId: fila.id, semana: "2026-11-23", monto: 20_000 }),
    ]);
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(await e.admin.flujoCelda.count({ where: { filaId: fila.id } })).toBe(1);
  });

  it("la importación con una fila mala no aplica nada", async () => {
    const antes = await e.admin.flujoFila.count({ where: { tenantId } });
    const csv = [
      "seccion,etiqueta,semana,monto",
      "egreso,Nueva fila CSV,2026-12-07,1.000",
      "egreso,Otra,2026-02-30,500",
    ].join("\n");
    const r = await ok<{ aplicadas: number; errores: number }>("finanzas.flujo.importar", { contenido: csv, saldoInicial: 777 });
    expect(r.errores).toBe(1);
    expect(r.aplicadas).toBe(0);
    expect(await e.admin.flujoFila.count({ where: { tenantId } })).toBe(antes);
    const ajustes = await ok<{ saldoInicial: number }>("finanzas.ajustes.obtener", {});
    expect(ajustes.saldoInicial).toBe(0);
  });

  it("importar rechaza las filas de ingresos y no aplica nada (ADR-073)", async () => {
    const antes = await e.admin.flujoFila.count({ where: { tenantId } });
    const csv = ["seccion,etiqueta,semana,monto", "ingreso,Cliente CSV,2026-12-07,1.000"].join("\n");
    const r = await ok<{ aplicadas: number; errores: number; filas: { mensaje: string | null }[] }>(
      "finanzas.flujo.importar",
      { contenido: csv, saldoInicial: 888 },
    );
    expect(r.errores).toBe(1);
    expect(r.aplicadas).toBe(0);
    expect(r.filas[0]?.mensaje).toContain("Los ingresos no se ajustan a mano");
    expect(await e.admin.flujoFila.count({ where: { tenantId } })).toBe(antes);
    expect((await ok<{ saldoInicial: number }>("finanzas.ajustes.obtener", {})).saldoInicial).toBe(0);
  });

  it("bajar el saldo inicial con el aviso activo emite el aviso", async () => {
    await ok("finanzas.ajustes.actualizar", { avisoActivo: true, umbral: 0, saldoInicial: -1_000_000_000 });
    expect(await e.admin.flujoAvisoEmitido.count({ where: { tenantId } })).toBeGreaterThan(0);
  });
});
