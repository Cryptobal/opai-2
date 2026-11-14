// CAR-341 · Cartolas y sincronización sin duplicados (como la conciliación de Xero o QuickBooks): un movimiento que
// llegó por el banco en línea y la cartola trae con otra fecha es el mismo; una cartola subida dos veces no agrega
// nada; una provisoria seguida de la histórica solo agrega lo que faltaba; y los movimientos de la sincronización se
// pueden borrar por fechas. Datos sintéticos.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import {
  filasCartolaHistorica,
  filasConsultaMovimientos,
  xlsxOfficeBanking,
} from "../../domain/src/finanzas/bancos/cartola-office-banking.fixture";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res = { aplicados: number; duplicados: number; fechasAjustadas: number; filas: { estado: string; motivo: string | null }[] };

describe.skipIf(omitirSuiteDb())("Finanzas · cartola y sincronización sin duplicados (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let cuentaId = "";
  const usuarioId = randomUUID();
  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@dedupe.test", platformRole: null },
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
  const importar = async (filas: Parameters<typeof xlsxOfficeBanking>[0], dryRun = false) =>
    dato<Res>(
      "finanzas.cartolas.importar",
      { cuentaId, formato: "santander", contenidoBase64: (await xlsxOfficeBanking(filas)).toString("base64"), idempotencyKey: `c-${randomUUID()}` },
      dryRun,
    );
  const sincronizar = (movs: { fecha: string; monto: number; glosa: string; idExterno?: string }[]) =>
    dato<{ nuevos: number; duplicados: number }>("finanzas.bancos.sincronizar", {
      numeroCuenta: "000000000",
      movimientos: movs.map((m) => ({ idExterno: randomUUID(), ...m })),
      idempotencyKey: `s-${randomUUID()}`,
    });
  const movimientos = () =>
    e.admin.movimientoBancario.findMany({ where: { cuentaId }, select: { fecha: true, monto: true, origen: true, idExterno: true }, orderBy: { fecha: "asc" } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `ddp-${randomUUID().slice(0, 8)}`, nombre: "Dedupe SpA", vertical: "seguridad" } })).id;
    cuentaId = (await dato<{ id: string }>("finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "000000000" })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  // Provisoria de noviembre: la transferencia que el banco en línea dejó el 12-11 la cartola la trae el 13-11.
  const noviembre = filasConsultaMovimientos([
    [50000, "TRANSF A PROVEEDOR FICTICIO 0761234", "13/11/2026", 950000, "", "Santiago", "C", "1"],
    [80000, "ABONO CLIENTE FICTICIO", "10/11/2026", 1030000, "", "Santiago", "A", "2"],
    [7000, "COMISION FICTICIA", "11/11/2026", 1023000, "", "Santiago", "C", "3"],
  ]);

  it("lo que llegó por la sincronización con otra fecha no se duplica y queda con la fecha de la cartola", async () => {
    await sincronizar([
      { fecha: "2026-11-12", monto: -50000, glosa: "Transf a Proveedor Ficticio" },
      { fecha: "2026-11-10", monto: 80000, glosa: "Abono cliente ficticio" },
    ]);
    const previa = await importar(noviembre, true);
    expect(previa).toMatchObject({ aplicados: 1, duplicados: 2, fechasAjustadas: 1 });
    expect(previa.filas.find((f) => f.motivo?.includes("12-11-2026"))?.estado).toBe("duplicada");
    await importar(noviembre);
    const movs = await movimientos();
    expect(movs).toHaveLength(3);
    expect(movs.find((m) => m.monto === -50000n)?.fecha.toISOString().slice(0, 10)).toBe("2026-11-13");
  });

  it("la misma cartola subida dos veces no agrega nada", async () => {
    expect(await importar(noviembre, true)).toMatchObject({ aplicados: 0, duplicados: 3, fechasAjustadas: 0 });
  });

  it("una entrega del banco en línea de algo que ya entró por cartola no se duplica y queda vinculada", async () => {
    const r = await sincronizar([{ fecha: "2026-11-12", monto: -7000, glosa: "Comision ficticia", idExterno: "ext-comision" }]);
    expect(r).toMatchObject({ nuevos: 0, duplicados: 1 });
    expect((await movimientos()).find((m) => m.monto === -7000n)?.idExterno).toBe("ext-comision");
    expect(await movimientos()).toHaveLength(3);
  });

  it("una provisoria seguida de la histórica del mismo mes solo agrega lo que faltaba", async () => {
    await importar(filasConsultaMovimientos([[15000, "Transf a proveedor ficticio", "29/10/2026", 985000, "", "Santiago", "C", "9"]]));
    const historica = filasCartolaHistorica([
      [15000, "TRANSF A PROVEEDOR FICTICIO", "30/10/2026", "123", "Santiago", "C"],
      [250000, "Abono cliente ficticio", "31/10/2026", "456", "Providencia", "A"],
    ]);
    expect(await importar(historica, true)).toMatchObject({ aplicados: 1, duplicados: 1, fechasAjustadas: 1 });
  });

  it("los movimientos de la sincronización se borran por fechas con vista previa y sin tocar las cartolas", async () => {
    const entrada = { cuentaId, desde: "2026-11-01", hasta: "2026-11-30", origen: "web4leads", motivo: "Prueba sintética" };
    expect(await dato("finanzas.movimientos_bancarios.borrar_rango", entrada, true)).toMatchObject({ movimientos: 2, borrados: false });
    expect(await movimientos()).toHaveLength(4);
    expect(await dato("finanzas.movimientos_bancarios.borrar_rango", entrada)).toMatchObject({ movimientos: 2, borrados: true });
    const quedan = await movimientos();
    expect(quedan.every((m) => m.origen === "cartola")).toBe(true);
    expect(quedan).toHaveLength(2);
  });

  // CAR-412: el borrado por fechas queda como descarte y se restaura tal cual, sin duplicar lo que ya volvió.
  it("el descarte se lista, se restaura con vista previa y no se restaura dos veces", async () => {
    const { items } = await dato<{ items: { id: string; movimientos: number; restauradoEn: string | null }[] }>(
      "finanzas.descartes_bancarios.list",
      { cuentaId },
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ movimientos: 2, restauradoEn: null });
    const id = items[0]?.id ?? "";
    expect(await dato("finanzas.descartes_bancarios.restaurar", { descarteId: id }, true)).toMatchObject({ restaurados: 2, yaPresentes: 0, restaurado: false });
    expect(await movimientos()).toHaveLength(2);
    expect(await dato("finanzas.descartes_bancarios.restaurar", { descarteId: id })).toMatchObject({ restaurados: 2, restaurado: true });
    const vuelta = await movimientos();
    expect(vuelta).toHaveLength(4);
    expect(vuelta.filter((m) => m.origen === "web4leads").map((m) => m.idExterno).every(Boolean)).toBe(true);
    const r = await mod.executeCapability(ctx(), "finanzas.descartes_bancarios.restaurar", { descarteId: id }, { dryRun: false });
    expect(r.ok).toBe(false);
  });
});
