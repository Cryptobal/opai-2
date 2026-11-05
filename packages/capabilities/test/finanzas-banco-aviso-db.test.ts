// CAR-193 · el aviso de saldo bajo del banco compara la suma de las cuentas activas (decisión de Carlos), una vez al día.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sincronizarAvisoSaldoBajo } from "../../../modules/finanzas/capacidades/bancos/aviso-banco";
import { lunesDe } from "../../../modules/finanzas/domain";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("aviso de saldo bajo del banco · suma de cuentas (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let cuentaA = "";
  let cuentaB = "";
  const usuario = randomUUID();

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@banco.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const sincronizar = (cuentaId: string, saldo: number | null = null) => {
    const c = ctx();
    return c.transaccion((tx) => sincronizarAvisoSaldoBajo(c, tx, cuentaId, saldo));
  };
  const avisos = () => e.admin.bancoAvisoEmitido.findMany({ where: { tenantId } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `banco-aviso-${randomUUID().slice(0, 8)}`, nombre: "aviso banco", vertical: "seguridad" },
      })
    ).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@banco.test`, name: "u" } });
    await e.admin.flujoAjustes.create({
      data: {
        tenantId,
        desde: new Date(`${lunesDe(new Date().toISOString().slice(0, 10))}T00:00:00Z`),
        umbral: 15_000_000n,
        avisoActivo: true,
      },
    });
    const cuenta = (numeroVisible: string, saldoBanco: bigint) =>
      e.admin.cuentaBancaria.create({ data: { tenantId, banco: "Banco QA", numeroVisible, activa: true, saldoBanco } });
    cuentaA = (await cuenta("0001", 10_000_000n)).id;
    cuentaB = (await cuenta("0002", 20_000_000n)).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("una cuenta bajo el umbral no avisa si la suma de las cuentas lo supera", async () => {
    await sincronizar(cuentaA); // A sola: 10 millones (< 15); suma: 30 millones
    expect(await avisos()).toHaveLength(0);
  });

  it("avisa cuando la suma queda bajo el umbral, con el total, y una sola vez por día", async () => {
    await e.admin.cuentaBancaria.update({ where: { id: cuentaB }, data: { saldoBanco: 1_000_000n } });
    await sincronizar(cuentaA);
    await sincronizar(cuentaB, 1_000_000); // otra cuenta el mismo día: no repite
    const filas = await avisos();
    expect(filas).toHaveLength(1);
    expect(Number(filas[0]?.saldo)).toBe(11_000_000);
    const eventos = await e.admin.evento.count({ where: { tenantId, tipo: "finanzas.banco.saldo_bajo_avisado" } });
    expect(eventos).toBe(1);
  });

  it("la cuenta recién sincronizada aporta su saldo nuevo a la suma", async () => {
    await e.admin.bancoAvisoEmitido.deleteMany({ where: { tenantId } });
    await sincronizar(cuentaB, 30_000_000); // 10 + 30 = 40 millones: no avisa
    expect(await avisos()).toHaveLength(0);
  });
});
