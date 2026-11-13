// Historial de importaciones y saldos de Bancos contra Postgres real (CAR-341, seguimiento): autor y saldos de cada
// cartola, saldo de hoy de la cuenta desde el cierre de la cartola, fecha futura de Web4Leads acotada a hoy y calce
// de la cartola con Web4Leads con un día de diferencia. Datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { filasCartolaHistorica, xlsxOfficeBanking } from "../../domain/src/finanzas/bancos/cartola-office-banking.fixture";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Cuenta = { id: string; saldoHoy: number | null; saldoDesde: string | null };

describe.skipIf(omitirSuiteDb())("Finanzas · historial de importaciones y saldos (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const usuarioId = randomUUID();
  const octubre = [
    [15000, "Transf a proveedor ficticio", "30/10/2026", "123", "Santiago", "C"],
    [250000, "Abono cliente ficticio", "31/10/2026", "456", "Providencia", "A"],
  ];

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin Ficticio", email: "admin@historial.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const dato = async <T>(id: string, input: Record<string, unknown>, dryRun = false): Promise<T> => {
    const r = await mod.executeCapability(ctx(), id, input, { dryRun });
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };
  const nuevaCuenta = async (numero: string) =>
    (await dato<{ id: string }>("finanzas.bancos.guardar", { banco: "Santander", numeroVisible: numero })).id;
  const importar = async (cuentaId: string) =>
    dato<{ aplicados: number; duplicados: number }>("finanzas.cartolas.importar", {
      cuentaId,
      formato: "santander",
      nombreArchivo: "cartola-ficticia.xlsx",
      contenidoBase64: (await xlsxOfficeBanking(filasCartolaHistorica(octubre))).toString("base64"),
      idempotencyKey: `h-${randomUUID()}`,
    });
  const sincronizar = (numero: string, movs: { fecha: string; monto: number; glosa: string }[]) =>
    dato<{ nuevos: number }>("finanzas.bancos.sincronizar", {
      numeroCuenta: numero,
      movimientos: movs.map((m) => ({ ...m, idExterno: randomUUID() })),
      idempotencyKey: `s-${randomUUID()}`,
    });
  const cuenta = async (id: string) =>
    (await dato<{ items: Cuenta[] }>("finanzas.bancos.listar", {})).items.find((c) => c.id === id);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `hst-${randomUUID().slice(0, 8)}`, nombre: "Historial SpA", vertical: "seguridad" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada importación guarda su autor y sus saldos, y la cuenta muestra el saldo de hoy desde el cierre", async () => {
    const id = await nuevaCuenta("111222333");
    expect(await importar(id)).toMatchObject({ aplicados: 2 });
    const [c] = (await dato<{ items: Record<string, unknown>[] }>("finanzas.cartolas.listar", { cuentaId: id })).items;
    expect(c).toMatchObject({ saldoInicial: 1000000, saldoFinal: 1235000, creadaPor: "Admin Ficticio", viaAgente: false });
    expect(await cuenta(id)).toMatchObject({ saldoHoy: 1235000, saldoDesde: "2026-10-31" });
  });

  it("una fecha futura del banco en línea se guarda con la fecha de hoy y suma al saldo de hoy", async () => {
    const id = await nuevaCuenta("777888999");
    await importar(id);
    expect(await sincronizar("777888999", [{ fecha: "2099-01-01", monto: 5000, glosa: "Abono futuro ficticio" }])).toMatchObject({ nuevos: 1 });
    const mov = await e.admin.movimientoBancario.findFirstOrThrow({ where: { cuentaId: id, origen: "web4leads" } });
    expect(mov.fecha.toISOString().slice(0, 10) < "2099-01-01").toBe(true);
    expect((await cuenta(id))?.saldoHoy).toBe(1240000);
  });

  it("la cartola reconoce como el mismo movimiento uno de Web4Leads con un día de diferencia", async () => {
    const id = await nuevaCuenta("444555666");
    await sincronizar("444555666", [{ fecha: "2026-11-01", monto: 250000, glosa: "Abono cliente ficticio" }]);
    expect(await importar(id)).toMatchObject({ aplicados: 1, duplicados: 1 });
    expect(await e.admin.movimientoBancario.count({ where: { cuentaId: id } })).toBe(2);
  });
});
