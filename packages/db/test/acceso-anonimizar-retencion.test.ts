// CAR-482: las funciones definer de anonimización exigen un corte vencido y un tope acotado.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("acceso.anonimizar_*_vencidos (CAR-482)", () => {
  let e: Entorno;
  let tenantId: string;

  beforeAll(async () => {
    e = await prepararEntorno();
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `anon-${randomUUID().slice(0, 8)}`, nombre: "Anon", vertical: "seguridad" },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  async function enTenant<T>(fn: (tx: typeof e.appSinTenant) => Promise<T>): Promise<T> {
    return e.appSinTenant.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }

  const corteRegOk = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
  const corteIntOk = new Date(Date.now() - 181 * 24 * 60 * 60 * 1000);

  it("rechaza registros con p_corte demasiado reciente", async () => {
    await expect(
      enTenant((tx) =>
        tx.$queryRaw`SELECT acceso.anonimizar_registros_vencidos(${new Date()}::timestamptz, ${10}::int)`,
      ),
    ).rejects.toThrow(/90 días/);
  });

  it("rechaza registros con p_tope inválido", async () => {
    await expect(
      enTenant((tx) =>
        tx.$queryRaw`
          SELECT acceso.anonimizar_registros_vencidos(${corteRegOk}::timestamptz, NULL::int)`,
      ),
    ).rejects.toThrow(/p_tope/);
    await expect(
      enTenant((tx) =>
        tx.$queryRaw`
          SELECT acceso.anonimizar_registros_vencidos(${corteRegOk}::timestamptz, ${0}::int)`,
      ),
    ).rejects.toThrow(/p_tope/);
    await expect(
      enTenant((tx) =>
        tx.$queryRaw`
          SELECT acceso.anonimizar_registros_vencidos(${corteRegOk}::timestamptz, ${1001}::int)`,
      ),
    ).rejects.toThrow(/p_tope/);
  });

  it("acepta registros con corte y tope válidos", async () => {
    const filas = await enTenant((tx) =>
      tx.$queryRaw<{ n: bigint }[]>`
        SELECT acceso.anonimizar_registros_vencidos(${corteRegOk}::timestamptz, ${10}::int) AS n`,
    );
    expect(Number(filas[0]?.n ?? 0)).toBe(0);
  });

  it("rechaza intentos con p_corte demasiado reciente", async () => {
    await expect(
      enTenant((tx) =>
        tx.$queryRaw`SELECT acceso.anonimizar_intentos_vencidos(${new Date()}::timestamptz, ${10}::int)`,
      ),
    ).rejects.toThrow(/180 días/);
  });

  it("rechaza intentos con p_tope inválido", async () => {
    await expect(
      enTenant((tx) =>
        tx.$queryRaw`
          SELECT acceso.anonimizar_intentos_vencidos(${corteIntOk}::timestamptz, NULL::int)`,
      ),
    ).rejects.toThrow(/p_tope/);
  });

  it("acepta intentos con corte y tope válidos", async () => {
    const filas = await enTenant((tx) =>
      tx.$queryRaw<{ n: bigint }[]>`
        SELECT acceso.anonimizar_intentos_vencidos(${corteIntOk}::timestamptz, ${10}::int) AS n`,
    );
    expect(Number(filas[0]?.n ?? 0)).toBe(0);
  });
});