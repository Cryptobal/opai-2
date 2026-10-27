// Revisor, PR #70: el ledger acumula gastado_micro siempre, aunque la key no tenga tope (null o 0).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { consumirPresupuesto } from "../src/presupuesto";
import { enTransaccion } from "../src/transaccion";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("presupuesto: transición de sin tope a con tope", () => {
  let e: Entorno;
  let tenantId: string;
  let apiKeyId: string;

  beforeAll(async () => {
    e = await prepararEntorno();
    const suffix = randomUUID();
    const tenant = await e.admin.tenant.create({
      data: { slug: `budget-sin-tope-${suffix}`, nombre: "Prueba", vertical: "seguridad" },
    });
    tenantId = tenant.id;
    const user = await e.admin.user.create({
      data: { name: "Prueba", email: `${suffix}@example.invalid` },
    });
    apiKeyId = (
      await e.admin.apiKey.create({
        data: {
          tenantId,
          userId: user.id,
          nombre: "Sin tope",
          prefijo: "test",
          hash: suffix,
          scopes: ["core"],
          presupuestoMensualMicro: null,
        },
      })
    ).id;
  });
  afterAll(async () => e?.cerrar());

  it.each([null, 0n])("acumula sin tope (%s) y conserva gasto al fijarlo", async (tope) => {
    await e.admin.apiKey.update({
      where: { id: apiKeyId },
      data: { presupuestoMensualMicro: tope },
    });
    await e.forTenant(tenantId).gastoAgenteMes.deleteMany({ where: { apiKeyId } });
    const libre = await enTransaccion(tenantId, (tx) =>
      consumirPresupuesto(tx, tenantId, apiKeyId, 7n),
    );
    expect(libre).toBe(true);
    const gasto = () =>
      e.forTenant(tenantId).gastoAgenteMes.findFirstOrThrow({ where: { apiKeyId } });
    expect((await gasto()).gastadoMicro).toBe(7n);
    await e.admin.apiKey.update({
      where: { id: apiKeyId },
      data: { presupuestoMensualMicro: 10n },
    });
    // El tope nuevo ya está casi agotado por lo gastado sin tope (7 de 10): 5 más lo supera y corta.
    const corta = await enTransaccion(tenantId, (tx) =>
      consumirPresupuesto(tx, tenantId, apiKeyId, 5n),
    );
    expect(corta).toBe(false);
    expect((await gasto()).gastadoMicro).toBe(7n);
    const pasa = await enTransaccion(tenantId, (tx) =>
      consumirPresupuesto(tx, tenantId, apiKeyId, 2n),
    );
    expect(pasa).toBe(true);
    expect((await gasto()).gastadoMicro).toBe(9n);
  });
});
