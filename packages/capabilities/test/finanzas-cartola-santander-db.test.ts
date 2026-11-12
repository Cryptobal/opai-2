// Cartolas Santander de Office Banking contra Postgres real (CAR-327): dos formatos con fixtures sintéticos,
// error de negocio ante un archivo ilegible e idempotencia al subir cartolas repetidas o que se solapan.
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

type Res = { aplicados: number; duplicados: number; rechazados: number };

describe.skipIf(omitirSuiteDb())("Finanzas · cartola Santander de Office Banking (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let cuentaId = "";
  const usuarioId = randomUUID();

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@cartola.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const ejecutar = (input: Record<string, unknown>, dryRun = false) =>
    mod.executeCapability(ctx(), "finanzas.cartolas.importar", { cuentaId, formato: "santander", idempotencyKey: `c-${randomUUID()}`, ...input }, { dryRun });
  const importar = async (buf: Buffer, dryRun = false): Promise<Res> => {
    const r = await ejecutar({ contenidoBase64: buf.toString("base64") }, dryRun);
    if (!r.ok) throw new Error(`${r.error.code} ${r.error.message}`);
    return r.data as Res;
  };

  const octubre = [
    [15000, "Transf a proveedor ficticio", "30/10/2026", "123", "Santiago", "C"],
    [250000, "Abono cliente ficticio", "31/10/2026", "456", "Providencia", "A"],
  ];
  const solapada = [
    [250000, "Abono cliente ficticio", "31/10/2026", 1235000, "456", "Providencia", "A", 1],
    [30000, "Transf a persona ficticia", "11/11/2026", 1205000, "777", "Las Condes", "C", 2],
  ];

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `ctl-${randomUUID().slice(0, 8)}`, nombre: "Cartola Test SpA", vertical: "seguridad" } })).id;
    const r = await mod.executeCapability(ctx(), "finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "000000000" });
    if (!r.ok) throw new Error(r.error.message);
    cuentaId = (r.data as { id: string }).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("la vista previa de la cartola histórica lee los movimientos sin guardar nada", async () => {
    const r = await importar(await xlsxOfficeBanking(filasCartolaHistorica(octubre)), true);
    expect(r).toMatchObject({ aplicados: 2, duplicados: 0, rechazados: 0 });
    expect(await e.admin.movimientoBancario.count({ where: { tenantId } })).toBe(0);
  });

  it("subir dos veces la misma cartola o una que se solapa no duplica", async () => {
    const historica = await xlsxOfficeBanking(filasCartolaHistorica(octubre));
    expect(await importar(historica)).toMatchObject({ aplicados: 2, duplicados: 0 });
    expect(await importar(historica)).toMatchObject({ aplicados: 0, duplicados: 2 });
    expect(await importar(await xlsxOfficeBanking(filasConsultaMovimientos(solapada)))).toMatchObject({ aplicados: 1, duplicados: 1 });
    const montos = (await e.admin.movimientoBancario.findMany({ where: { tenantId }, orderBy: { fecha: "asc" } })).map((m) => Number(m.monto));
    expect(montos).toEqual([-15000, 250000, -30000]);
  });

  it("un archivo que no es cartola responde con un error de negocio, no interno", async () => {
    const r = await ejecutar({ contenidoBase64: Buffer.from("no es un xlsx").toString("base64") }, true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).not.toBe("INTERNAL");
      expect(r.error.message).toMatch(/cartola Santander/);
    }
  });
});
