// CAR-453 · «Borrar por fechas» con un movimiento que tuvo una conciliación deshecha (activa=false, confirmada=true):
// antes la FK Restrict abortaba todo el borrado; ahora la conciliación deshecha se va con el movimiento. Datos sintéticos.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Finanzas · borrar por fechas con conciliación deshecha (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let cuentaId = "";
  const usuarioId = randomUUID();
  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@deshecha.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  async function dato<T>(id: string, input: Record<string, unknown>, dryRun = false): Promise<T> {
    const r = await mod.executeCapability(ctx(), id, input, { dryRun });
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `dsh-${randomUUID().slice(0, 8)}`, nombre: "Deshecha SpA", vertical: "seguridad" } })).id;
    cuentaId = (await dato<{ id: string }>("finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "000000001" })).id;
    await dato("finanzas.bancos.sincronizar", {
      numeroCuenta: "000000001",
      movimientos: [{ idExterno: randomUUID(), fecha: "2026-11-05", monto: -12000, glosa: "Pago ficticio" }],
      idempotencyKey: `s-${randomUUID()}`,
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("borra el movimiento y su conciliación deshecha, y se puede restaurar", async () => {
    const mov = await e.admin.movimientoBancario.findFirstOrThrow({ where: { cuentaId } });
    await e.admin.conciliacionBanco.create({
      data: { tenantId, movimientoId: mov.id, tipoEnlace: "flujo_fila", enlaceId: randomUUID(), monto: -12000n, activa: false, confirmada: true },
    });
    const entrada = { cuentaId, desde: "2026-11-01", hasta: "2026-11-30", origen: "web4leads", motivo: "Prueba sintética" };
    const r = await dato<{ movimientos: number; descarteId: string }>("finanzas.movimientos_bancarios.borrar_rango", entrada);
    expect(r.movimientos).toBe(1);
    expect(await e.admin.movimientoBancario.count({ where: { cuentaId } })).toBe(0);
    expect(await dato("finanzas.descartes_bancarios.restaurar", { descarteId: r.descarteId })).toMatchObject({ restaurados: 1 });
  });
});
